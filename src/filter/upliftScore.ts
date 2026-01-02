/**
 * Uplift scoring and filtering
 * Determines if a feed item is "uplifting" enough to publish
 */

import sanitizeHtml from 'sanitize-html';
import type { FilterConfig } from '../config/types.js';
import type { ScoredFeedItem } from '../feeds/index.js';

export interface FilteredItem extends ScoredFeedItem {
  upliftScore: number;
  passesFilter: boolean;
  filterReason?: string;
}

/**
 * Strip HTML and normalize text for analysis
 */
function normalizeText(html: string): string {
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Check if text contains any hard exclude keywords
 */
function containsHardExclude(text: string, excludes: string[]): string | null {
  for (const exclude of excludes) {
    if (text.includes(exclude.toLowerCase())) {
      return exclude;
    }
  }
  return null;
}

/**
 * Calculate positive boost score
 */
function calculateBoostScore(text: string, boosts: { word: string; boost: number }[]): number {
  let score = 0;
  for (const { word, boost } of boosts) {
    if (text.includes(word.toLowerCase())) {
      score += boost;
    }
  }
  return score;
}

/**
 * Score a single feed item for "uplift"
 */
export function scoreItem(item: ScoredFeedItem, config: FilterConfig): FilteredItem {
  const titleText = normalizeText(item.title);
  const descText = normalizeText(item.description);
  const combinedText = `${titleText} ${descText}`;

  // Check hard excludes first
  const excludeMatch = containsHardExclude(combinedText, config.hardExcludes);
  if (excludeMatch) {
    return {
      ...item,
      upliftScore: 0,
      passesFilter: false,
      filterReason: `Hard exclude: "${excludeMatch}"`,
    };
  }

  // Base score from source priority (0-10 -> 0-30)
  let score = item.priority * 3;

  // Add positive boosts
  score += calculateBoostScore(combinedText, config.positiveBoosts);

  // Apply threshold boost for mixed-tone sources
  const effectiveThreshold = config.minUpliftScore + item.upliftThresholdBoost;

  // Check if passes
  const passesFilter = score >= effectiveThreshold;

  return {
    ...item,
    upliftScore: score,
    passesFilter,
    filterReason: passesFilter
      ? undefined
      : `Score ${score} below threshold ${effectiveThreshold}`,
  };
}

/**
 * Filter and score all items
 */
export function filterItems(
  items: ScoredFeedItem[],
  config: FilterConfig
): FilteredItem[] {
  return items.map(item => scoreItem(item, config));
}

/**
 * Get top passing items, respecting per-source limits
 */
export function selectBestItems(
  items: FilteredItem[],
  count: number,
  maxPerSource: number
): FilteredItem[] {
  // Filter to only passing items
  const passing = items.filter(item => item.passesFilter);

  // Sort by score (descending), then by date (newest first)
  passing.sort((a, b) => {
    if (b.upliftScore !== a.upliftScore) {
      return b.upliftScore - a.upliftScore;
    }
    const dateA = a.pubDate?.getTime() || 0;
    const dateB = b.pubDate?.getTime() || 0;
    return dateB - dateA;
  });

  // Select top items respecting per-source limit
  const selected: FilteredItem[] = [];
  const sourceCount: Record<string, number> = {};

  for (const item of passing) {
    if (selected.length >= count) break;

    const currentCount = sourceCount[item.sourceName] || 0;
    if (currentCount >= maxPerSource) continue;

    selected.push(item);
    sourceCount[item.sourceName] = currentCount + 1;
  }

  return selected;
}
