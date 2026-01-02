/**
 * Image source types
 */

export interface ImageResult {
  url: string;
  width: number;
  height: number;
  attribution: string;
  license: string;
  source: 'wikimedia' | 'unsplash' | 'pexels';
}

export interface ImageProvider {
  name: string;
  search(query: string): Promise<ImageResult | null>;
}
