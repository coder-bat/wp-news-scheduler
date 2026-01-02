/**
 * RSS/Atom feed parser
 */

import { XMLParser } from 'fast-xml-parser';
import { createHash } from 'crypto';
import type { ParsedFeed } from './types.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});

/**
 * Generate a stable ID from URL
 */
function generateId(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16);
}

/**
 * Extract text content, handling various RSS/Atom formats
 */
function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('#text' in obj) return String(obj['#text']);
    if ('__cdata' in obj) return String(obj['__cdata']);
  }
  return '';
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Extract image URL from content or enclosures
 */
function extractImageUrl(item: Record<string, unknown>): string | undefined {
  // Check enclosure
  const enclosure = item['enclosure'] as Record<string, unknown> | undefined;
  if (enclosure) {
    const type = enclosure['@_type'] as string | undefined;
    const url = enclosure['@_url'] as string | undefined;
    if (url && type?.startsWith('image/')) {
      return url;
    }
  }

  // Check media:content
  const mediaContent = item['media:content'] as Record<string, unknown> | undefined;
  if (mediaContent) {
    const url = mediaContent['@_url'] as string | undefined;
    if (url) return url;
  }

  // Check media:thumbnail
  const mediaThumbnail = item['media:thumbnail'] as Record<string, unknown> | undefined;
  if (mediaThumbnail) {
    const url = mediaThumbnail['@_url'] as string | undefined;
    if (url) return url;
  }

  return undefined;
}

/**
 * Parse RSS feed
 */
function parseRss(data: Record<string, unknown>, sourceName: string, sourceUrl: string): ParsedFeed {
  const channel = (data['rss'] as Record<string, unknown>)?.['channel'] as Record<string, unknown>;
  if (!channel) {
    throw new Error('Invalid RSS feed: missing channel');
  }

  const rawItems = channel['item'];
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];

  return {
    title: extractText(channel['title']),
    link: extractText(channel['link']),
    items: items.map((item: Record<string, unknown>) => {
      const link = extractText(item['link']);
      return {
        id: generateId(link),
        title: extractText(item['title']),
        description: extractText(item['description'] || item['content:encoded']),
        link,
        pubDate: parseDate(extractText(item['pubDate'])),
        sourceName,
        sourceUrl,
        imageUrl: extractImageUrl(item),
        categories: extractCategories(item),
      };
    }),
  };
}

/**
 * Parse Atom feed
 */
function parseAtom(data: Record<string, unknown>, sourceName: string, sourceUrl: string): ParsedFeed {
  const feed = data['feed'] as Record<string, unknown>;
  if (!feed) {
    throw new Error('Invalid Atom feed: missing feed element');
  }

  const rawEntries = feed['entry'];
  const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];

  return {
    title: extractText(feed['title']),
    link: extractAtomLink(feed['link']),
    items: entries.map((entry: Record<string, unknown>) => {
      const link = extractAtomLink(entry['link']);
      return {
        id: generateId(link),
        title: extractText(entry['title']),
        description: extractText(entry['summary'] || entry['content']),
        link,
        pubDate: parseDate(extractText(entry['published'] || entry['updated'])),
        sourceName,
        sourceUrl,
        imageUrl: extractImageUrl(entry),
        categories: extractAtomCategories(entry),
      };
    }),
  };
}

/**
 * Extract link from Atom link element(s)
 */
function extractAtomLink(link: unknown): string {
  if (typeof link === 'string') return link;
  if (Array.isArray(link)) {
    // Prefer alternate link
    const alternate = link.find((l: Record<string, unknown>) => 
      l['@_rel'] === 'alternate' || !l['@_rel']
    ) as Record<string, unknown> | undefined;
    if (alternate) return String(alternate['@_href'] || '');
    return String((link[0] as Record<string, unknown>)?.['@_href'] || '');
  }
  if (link && typeof link === 'object') {
    return String((link as Record<string, unknown>)['@_href'] || '');
  }
  return '';
}

/**
 * Extract categories from RSS item
 */
function extractCategories(item: Record<string, unknown>): string[] {
  const category = item['category'];
  if (!category) return [];
  if (Array.isArray(category)) {
    return category.map(c => extractText(c)).filter(Boolean);
  }
  const text = extractText(category);
  return text ? [text] : [];
}

/**
 * Extract categories from Atom entry
 */
function extractAtomCategories(entry: Record<string, unknown>): string[] {
  const category = entry['category'];
  if (!category) return [];
  if (Array.isArray(category)) {
    return category.map((c: Record<string, unknown>) => 
      String(c['@_term'] || c['@_label'] || '')
    ).filter(Boolean);
  }
  if (typeof category === 'object') {
    const c = category as Record<string, unknown>;
    const term = String(c['@_term'] || c['@_label'] || '');
    return term ? [term] : [];
  }
  return [];
}

/**
 * Parse feed content (auto-detect RSS vs Atom)
 */
export function parseFeed(xml: string, sourceName: string, sourceUrl: string): ParsedFeed {
  const data = parser.parse(xml) as Record<string, unknown>;

  if ('rss' in data) {
    return parseRss(data, sourceName, sourceUrl);
  }

  if ('feed' in data) {
    return parseAtom(data, sourceName, sourceUrl);
  }

  throw new Error('Unknown feed format: neither RSS nor Atom');
}
