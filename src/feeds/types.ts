/**
 * Feed item types
 */

export interface FeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date | null;
  sourceName: string;
  sourceUrl: string;
  imageUrl?: string;
  categories?: string[];
}

export interface ParsedFeed {
  title: string;
  link: string;
  items: FeedItem[];
}
