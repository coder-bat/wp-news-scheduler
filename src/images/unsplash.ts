/**
 * Unsplash image search
 * Fallback source - free to use with attribution
 */

import type { ImageResult, ImageProvider } from './types.js';

const UNSPLASH_API = 'https://api.unsplash.com';

interface UnsplashSearchResult {
  results?: Array<{
    urls: {
      regular: string;
    };
    width: number;
    height: number;
    user: {
      name: string;
      links: {
        html: string;
      };
    };
  }>;
}

export class UnsplashProvider implements ImageProvider {
  name = 'unsplash';
  private accessKey: string;

  constructor(accessKey: string) {
    this.accessKey = accessKey;
  }

  async search(query: string): Promise<ImageResult | null> {
    if (!this.accessKey) return null;

    try {
      const params = new URLSearchParams({
        query,
        per_page: '1',
        orientation: 'landscape',
      });

      const res = await fetch(`${UNSPLASH_API}/search/photos?${params}`, {
        headers: {
          Authorization: `Client-ID ${this.accessKey}`,
        },
      });

      if (!res.ok) return null;

      const data = await res.json() as UnsplashSearchResult;
      const result = data.results?.[0];
      if (!result) return null;

      return {
        url: result.urls.regular,
        width: result.width,
        height: result.height,
        attribution: `Photo by ${result.user.name} on Unsplash`,
        license: 'Unsplash License',
        source: 'unsplash',
      };
    } catch (error) {
      console.error('Unsplash search error:', error);
      return null;
    }
  }
}
