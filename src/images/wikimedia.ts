/**
 * Wikimedia Commons image search
 * Primary source - truly free CC0/CC-BY images
 */

import type { ImageResult, ImageProvider } from './types.js';

const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

interface WikiSearchResult {
  query?: {
    search?: Array<{
      title: string;
    }>;
  };
}

interface WikiImageInfo {
  query?: {
    pages?: Record<string, {
      imageinfo?: Array<{
        url: string;
        descriptionurl: string;
        extmetadata?: {
          LicenseShortName?: { value: string };
          Artist?: { value: string };
        };
      }>;
    }>;
  };
}

export class WikimediaProvider implements ImageProvider {
  name = 'wikimedia';

  async search(query: string): Promise<ImageResult | null> {
    try {
      // Search for images
      const searchParams = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: `${query} filetype:jpg OR filetype:png`,
        srnamespace: '6', // File namespace
        srlimit: '10',
        format: 'json',
        origin: '*',
      });

      const searchRes = await fetch(`${WIKIMEDIA_API}?${searchParams}`);
      if (!searchRes.ok) return null;

      const searchData = await searchRes.json() as WikiSearchResult;
      const results = searchData.query?.search;
      if (!results || results.length === 0) return null;

      // Get image info for first result
      const imageTitle = results[0].title;
      const infoParams = new URLSearchParams({
        action: 'query',
        titles: imageTitle,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        format: 'json',
        origin: '*',
      });

      const infoRes = await fetch(`${WIKIMEDIA_API}?${infoParams}`);
      if (!infoRes.ok) return null;

      const infoData = await infoRes.json() as WikiImageInfo;
      const pages = infoData.query?.pages;
      if (!pages) return null;

      const page = Object.values(pages)[0];
      const imageinfo = page?.imageinfo?.[0];
      if (!imageinfo) return null;

      const meta = imageinfo.extmetadata || {};
      const license = meta.LicenseShortName?.value || 'CC';
      const artist = meta.Artist?.value?.replace(/<[^>]*>/g, '') || 'Wikimedia Commons';

      return {
        url: imageinfo.url,
        width: 800,
        height: 600,
        attribution: `${artist} via Wikimedia Commons`,
        license,
        source: 'wikimedia',
      };
    } catch (error) {
      console.error('Wikimedia search error:', error);
      return null;
    }
  }
}
