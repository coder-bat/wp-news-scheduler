/**
 * Image pipeline
 * Searches providers in order until an image is found
 */

import type { ImageResult, ImageProvider } from './types.js';
import type { Secrets } from '../config/types.js';
import { WikimediaProvider } from './wikimedia.js';
import { UnsplashProvider } from './unsplash.js';
import { PexelsProvider } from './pexels.js';

export type { ImageResult, ImageProvider } from './types.js';

/**
 * Create image provider chain
 */
export function createImageProviders(secrets: Secrets): ImageProvider[] {
  const providers: ImageProvider[] = [];

  // Wikimedia is always first (no API key needed)
  providers.push(new WikimediaProvider());

  // Add Unsplash if configured
  if (secrets.unsplashAccessKey) {
    providers.push(new UnsplashProvider(secrets.unsplashAccessKey));
  }

  // Add Pexels if configured
  if (secrets.pexelsApiKey) {
    providers.push(new PexelsProvider(secrets.pexelsApiKey));
  }

  return providers;
}

/**
 * Extract keywords from title for image search
 */
function extractKeywords(title: string): string {
  // Remove common stop words
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'for', 'and', 'but',
    'or', 'yet', 'so', 'in', 'on', 'at', 'to', 'from', 'by', 'with', 'about',
    'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up',
    'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few',
    'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only', 'own',
    'same', 'than', 'too', 'very', 'just', 'also', 'now', 'new', 'first',
  ]);

  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Take first 3-4 keywords
  return words.slice(0, 4).join(' ');
}

/**
 * Search for an image matching the article
 */
export async function findImage(
  title: string,
  providers: ImageProvider[]
): Promise<ImageResult | null> {
  const keywords = extractKeywords(title);
  
  if (!keywords) {
    // Fallback to generic happy terms
    return searchProviders('happy success celebration', providers);
  }

  // Try with extracted keywords
  const result = await searchProviders(keywords, providers);
  if (result) return result;

  // Fallback to generic positive image
  return searchProviders('hope sunshine nature', providers);
}

/**
 * Search all providers in order
 */
async function searchProviders(
  query: string,
  providers: ImageProvider[]
): Promise<ImageResult | null> {
  for (const provider of providers) {
    try {
      const result = await provider.search(query);
      if (result) {
        console.log(`  ✓ Found image from ${provider.name}: ${query}`);
        return result;
      }
    } catch (error) {
      console.warn(`  ⚠ ${provider.name} error:`, error);
    }
  }
  return null;
}
