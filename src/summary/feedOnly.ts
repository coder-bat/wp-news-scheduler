/**
 * Feed-only summary generator
 * Creates WordPress post content from RSS item data without AI
 */

import sanitizeHtml from 'sanitize-html';
import type { ContentConfig } from '../config/types.js';
import type { FilteredItem } from '../filter/index.js';

export interface GeneratedContent {
  title: string;
  excerpt: string;
  body: string;
  slug: string;
}

/**
 * Clean HTML and truncate to max length
 */
function cleanAndTruncate(html: string, maxLength: number): string {
  // Strip all HTML
  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) return text;

  // Truncate at word boundary
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }
  return truncated + '...';
}

/**
 * Generate a clean slug from title and date
 */
function generateSlug(title: string, slot: string): string {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Clean title for slug
  const cleanTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

  return `happy-news-${today}-${slot}-${cleanTitle}`;
}

/**
 * Get a short lead sentence from the description
 */
function getLeadSentence(description: string): string {
  const clean = sanitizeHtml(description, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, ' ')
    .trim();

  // Find first sentence
  const match = clean.match(/^[^.!?]+[.!?]/);
  if (match && match[0].length >= 30) {
    return match[0].trim();
  }

  // Fallback to first 200 chars
  return cleanAndTruncate(clean, 200);
}

/**
 * Generate post content from a feed item
 */
export function generateContent(
  item: FilteredItem,
  slot: string,
  config: ContentConfig,
  imageAttribution?: string
): GeneratedContent {
  const title = sanitizeHtml(item.title, { allowedTags: [], allowedAttributes: {} }).trim();
  const excerpt = cleanAndTruncate(item.description, config.excerptMaxChars);
  const lead = getLeadSentence(item.description);
  const slug = generateSlug(title, slot);

  // Build body HTML
  const bodyParts: string[] = [];

  // Lead paragraph
  bodyParts.push(`<p>${lead}</p>`);

  // Why this is good news section
  bodyParts.push('<h2>Why This Matters</h2>');
  bodyParts.push(`<p>This story from <strong>${item.sourceName}</strong> highlights positive progress and hopeful developments from around the world.</p>`);

  // Source link
  if (config.includeSourceLink) {
    bodyParts.push('<h2>Read More</h2>');
    bodyParts.push(`<p>📖 <a href="${item.link}" target="_blank" rel="noopener noreferrer">Read the full story at ${item.sourceName}</a></p>`);
  }

  // Image attribution
  if (imageAttribution) {
    bodyParts.push(`<p class="image-credit"><em>Image: ${imageAttribution}</em></p>`);
  }

  // Internal link
  if (config.includeInternalLink) {
    bodyParts.push(`<hr />`);
    bodyParts.push(`<p>🌟 <a href="${config.internalLinkUrl}">Discover more Happy News</a></p>`);
  }

  const body = bodyParts.join('\n\n');

  return {
    title,
    excerpt,
    body,
    slug,
  };
}
