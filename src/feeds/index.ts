/**
 * Feed ingestion - fetch and parse all configured feeds
 */

import type { FeedSource } from '../config/types.js';
import { fetchFeed } from './fetcher.js';
import { parseFeed } from './parser.js';
import type { FeedItem } from './types.js';

export type { FeedItem, ParsedFeed } from './types.js';

export interface ScoredFeedItem extends FeedItem {
  priority: number;
  upliftThresholdBoost: number;
}

/**
 * Fetch and parse a single feed source
 */
async function fetchSource(source: FeedSource): Promise<ScoredFeedItem[]> {
  try {
    console.log(`[feeds] Fetching ${source.name}...`);
    const xml = await fetchFeed(source.url);
    const parsed = parseFeed(xml, source.name, source.url);
    
    console.log(`[feeds] Parsed ${parsed.items.length} items from ${source.name}`);
    
    return parsed.items.map(item => ({
      ...item,
      priority: source.priority,
      upliftThresholdBoost: source.upliftThresholdBoost || 0,
    }));
  } catch (error) {
    console.error(`[feeds] Failed to fetch ${source.name}: ${error}`);
    return [];
  }
}

/**
 * Fetch all configured feeds
 */
export async function fetchAllFeeds(feeds: FeedSource[]): Promise<ScoredFeedItem[]> {
  console.log(`[feeds] Fetching ${feeds.length} feed sources...`);

  // Fetch feeds in parallel with some concurrency limit
  const results: ScoredFeedItem[][] = [];
  const batchSize = 5;
  
  for (let i = 0; i < feeds.length; i += batchSize) {
    const batch = feeds.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fetchSource));
    results.push(...batchResults);
  }

  const allItems = results.flat();
  console.log(`[feeds] Total items fetched: ${allItems.length}`);

  return allItems;
}
