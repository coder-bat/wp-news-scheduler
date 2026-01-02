/**
 * Pexels image search
 * Final fallback - free to use with attribution
 */

import type { ImageResult, ImageProvider } from './types.js';

const PEXELS_API = 'https://api.pexels.com/v1';

interface PexelsSearchResult {
  photos?: Array<{
    src: {
      large: string;
    };
    width: number;
    height: number;
    photographer: string;
    photographer_url: string;
  }>;
}

export class PexelsProvider implements ImageProvider {
  name = 'pexels';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async search(query: string): Promise<ImageResult | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams({
        query,
        per_page: '1',
        orientation: 'landscape',
      });

      const res = await fetch(`${PEXELS_API}/search?${params}`, {
        headers: {
          Authorization: this.apiKey,
        },
      });

      if (!res.ok) return null;

      const data = await res.json() as PexelsSearchResult;
      const photo = data.photos?.[0];
      if (!photo) return null;

      return {
        url: photo.src.large,
        width: photo.width,
        height: photo.height,
        attribution: `Photo by ${photo.photographer} on Pexels`,
        license: 'Pexels License',
        source: 'pexels',
      };
    } catch (error) {
      console.error('Pexels search error:', error);
      return null;
    }
  }
}
