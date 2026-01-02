/**
 * Main publisher entrypoint
 * Orchestrates the full publish flow
 */

import { loadConfig, loadSecrets } from '../config/index.js';
import { fetchAllFeeds, ScoredFeedItem } from '../feeds/index.js';
import { filterItems, selectBestItems, FilteredItem } from '../filter/index.js';
import { generateContent } from '../summary/index.js';
import { createImageProviders, findImage } from '../images/index.js';
import { WordPressClient } from '../wp/index.js';
import {
  loadState,
  saveState,
  addPublished,
  addAuditLog,
  isPublished,
} from '../state/index.js';
import {
  determineSlot,
  getSlotDisplayName,
  getCurrentDateString,
} from '../utils/index.js';
import { notifyNewPost } from '../discord/index.js';
import type { Slot } from '../utils/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const CONFIG_PATH = process.env.CONFIG_PATH || resolve(PROJECT_ROOT, 'config', 'config.yaml');
const STATE_PATH = process.env.STATE_PATH || resolve(PROJECT_ROOT, 'data', 'state.json');

/**
 * Main publish function
 */
async function publish(slot?: Slot): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Happy News Publisher');
  console.log('═══════════════════════════════════════════════════════════');

  // Load configuration
  console.log('\n📋 Loading configuration...');
  const config = await loadConfig(CONFIG_PATH);
  const secrets = await loadSecrets();

  console.log(`   Timezone: ${config.schedule.timezone}`);
  console.log(`   Current time: ${getCurrentDateString(config.schedule.timezone)}`);

  // Determine slot (or use provided one)
  if (!slot) {
    const detectedSlot = determineSlot({
      timezone: config.schedule.timezone,
      slots: config.schedule.slots,
      latenessThresholdMinutes: config.schedule.latenessThresholdMinutes,
    });
    if (!detectedSlot) {
      console.log('\n⏰ Not within any scheduled slot window. Exiting.');
      return;
    }
    slot = detectedSlot;
  }

  console.log(`\n🕐 Running ${getSlotDisplayName(slot)} slot`);

  // Load state
  console.log('\n📁 Loading state...');
  const state = await loadState(STATE_PATH);
  console.log(`   ${state.publishedUrls.size} URLs in dedup cache`);

  // Fetch feeds
  console.log('\n📡 Fetching feeds...');
  const items = await fetchAllFeeds(config.feeds);
  console.log(`   Fetched ${items.length} items from ${config.feeds.length} feeds`);

  // Filter for already published
  const unpublished = items.filter((item: ScoredFeedItem) => !isPublished(state, item.link));
  console.log(`   ${unpublished.length} items after deduplication`);

  // Score and filter
  console.log('\n✨ Filtering for uplift...');
  const filtered = filterItems(unpublished, config.filter);
  const passing = filtered.filter((item: FilteredItem) => item.passesFilter);
  console.log(`   ${passing.length} items pass uplift filter`);

  // Select best items (get more candidates in case some already exist)
  const candidates = selectBestItems(filtered, 10, config.filter.maxPerSource);

  if (candidates.length === 0) {
    console.log('\n❌ No suitable articles found for this slot.');
    addAuditLog(state, {
      slot,
      action: 'skip',
      reason: 'No suitable articles found',
    });
    await saveState(state, STATE_PATH);
    return;
  }

  // Initialize WordPress client
  const wp = new WordPressClient(config, secrets);
  const imageProviders = createImageProviders(secrets);

  // Ensure category exists
  const categoryId = await wp.ensureCategory(
    config.wordpress.categorySlug,
    config.wordpress.categoryName
  );

  // Try candidates until one succeeds
  for (const item of candidates) {
    console.log(`\n📰 Trying article:`);
    console.log(`   Title: ${item.title}`);
    console.log(`   Source: ${item.sourceName}`);
    console.log(`   Score: ${item.upliftScore}`);

    // Generate content
    console.log('\n✍️  Generating content...');
    const content = generateContent(
      item,
      slot,
      config.content,
      undefined // Will add attribution after image search
    );
    console.log(`   Slug: ${content.slug}`);

    // Check if slug already exists
    if (await wp.postExists(content.slug)) {
      console.log('   ⚠ Post with this slug already exists, trying next...');
      continue;
    }

    // Find image
    console.log('\n🖼️  Finding image...');
    const image = await findImage(item.title, imageProviders);
    
    if (image) {
      console.log(`   Found: ${image.source} (${image.license})`);
      // Regenerate content with attribution
      const contentWithAttribution = generateContent(
        item,
        slot,
        config.content,
        image.attribution
      );
      Object.assign(content, contentWithAttribution);
    } else {
      console.log('   No suitable image found, posting without featured image');
    }

    // Publish to WordPress
    console.log('\n🚀 Publishing to WordPress...');

    try {
      const post = await wp.publishPost(
        {
          title: content.title,
          content: content.body,
          excerpt: content.excerpt,
          slug: content.slug,
          status: 'publish',
        },
        categoryId,
        image || undefined
      );

      console.log(`\n✅ Published successfully!`);
      console.log(`   Post ID: ${post.id}`);
      console.log(`   URL: ${post.link}`);

      // Update state
      addPublished(state, {
        url: item.link,
        title: item.title,
        wpPostId: post.id,
        wpPostUrl: post.link,
        slot,
      });

      addAuditLog(state, {
        slot,
        action: 'publish',
        itemTitle: item.title,
        itemUrl: item.link,
        wpPostId: post.id,
        wpPostUrl: post.link,
      });

      // Send Discord notification
      if (secrets.discordWebhookUrl) {
        console.log('\n📢 Sending Discord notification...');
        const sent = await notifyNewPost(secrets.discordWebhookUrl, {
          title: content.title,
          excerpt: content.excerpt,
          url: post.link,
          source: item.sourceName,
          slot,
          imageUrl: image?.url,
        });
        if (sent) {
          console.log('   ✓ Discord notification sent');
        } else {
          console.log('   ⚠ Discord notification failed');
        }
      }

      // Save state and exit on success
      await saveState(state, STATE_PATH);
      console.log('\n💾 State saved.');
      console.log('\n═══════════════════════════════════════════════════════════\n');
      return;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`\n❌ Publish failed: ${errorMessage}`);
      console.log('   Trying next article...');
      
      addAuditLog(state, {
        slot,
        action: 'error',
        itemTitle: item.title,
        itemUrl: item.link,
        error: errorMessage,
      });
    }
  }

  // All candidates failed
  console.log('\n❌ All candidate articles failed to publish.');
  addAuditLog(state, {
    slot,
    action: 'skip',
    reason: 'All candidates failed',
  });

  // Save state
  await saveState(state, STATE_PATH);
  console.log('\n💾 State saved.');
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

// CLI handling
const args = process.argv.slice(2);
const forceSlot = args.find(arg => ['morning', 'afternoon', 'evening'].includes(arg)) as Slot | undefined;

publish(forceSlot).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
