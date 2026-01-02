/**
 * WordPress REST API client
 * Handles authentication, posts, media, and categories
 */

import type { Config, Secrets } from '../config/types.js';
import type { ImageResult } from '../images/index.js';

export interface WpCategory {
  id: number;
  name: string;
  slug: string;
}

export interface WpMedia {
  id: number;
  source_url: string;
}

export interface WpPost {
  id: number;
  link: string;
  title: { rendered: string };
  status: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  status: 'publish' | 'draft';
  categories: number[];
  featured_media?: number;
}

export class WordPressClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: Config, secrets: Secrets) {
    this.baseUrl = `${config.wordpress.siteUrl}/wp-json/wp/v2`;
    
    // Application Passwords use Basic Auth
    const credentials = Buffer.from(
      `${secrets.wpUsername}:${secrets.wpAppPassword}`
    ).toString('base64');
    this.authHeader = `Basic ${credentials}`;
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`WordPress API error: ${res.status} - ${errorText}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Get or create category by slug
   */
  async ensureCategory(slug: string, name: string): Promise<number> {
    // Try to find existing category
    const existing = await this.request<WpCategory[]>(
      `/categories?slug=${encodeURIComponent(slug)}`
    );

    if (existing.length > 0) {
      return existing[0].id;
    }

    // Create new category
    const created = await this.request<WpCategory>('/categories', {
      method: 'POST',
      body: JSON.stringify({ slug, name }),
    });

    return created.id;
  }

  /**
   * Upload image from URL to media library
   */
  async uploadImageFromUrl(
    imageUrl: string,
    filename: string,
    altText: string
  ): Promise<WpMedia | null> {
    try {
      // Fetch the image
      const imageRes = await fetch(imageUrl);
      if (!imageRes.ok) {
        console.warn(`Failed to fetch image: ${imageUrl}`);
        return null;
      }

      const imageBlob = await imageRes.blob();
      const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
      const extension = contentType.includes('png') ? 'png' : 'jpg';
      const finalFilename = `${filename}.${extension}`;

      // Upload to WordPress
      const formData = new FormData();
      formData.append('file', imageBlob, finalFilename);
      formData.append('alt_text', altText);

      const uploadRes = await fetch(`${this.baseUrl}/media`, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
        },
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorText = await uploadRes.text();
        console.warn(`Failed to upload image: ${errorText}`);
        return null;
      }

      return uploadRes.json() as Promise<WpMedia>;
    } catch (error) {
      console.warn('Image upload error:', error);
      return null;
    }
  }

  /**
   * Create a new post
   */
  async createPost(data: CreatePostData): Promise<WpPost> {
    return this.request<WpPost>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Check if a post with similar slug already exists
   */
  async postExists(slug: string): Promise<boolean> {
    const posts = await this.request<WpPost[]>(
      `/posts?slug=${encodeURIComponent(slug)}&status=any`
    );
    return posts.length > 0;
  }

  /**
   * Full publish flow: upload image + create post
   */
  async publishPost(
    data: Omit<CreatePostData, 'featured_media' | 'categories'>,
    categoryId: number,
    image?: ImageResult
  ): Promise<WpPost> {
    let featuredMediaId: number | undefined;

    // Upload featured image if available
    if (image) {
      const media = await this.uploadImageFromUrl(
        image.url,
        data.slug,
        data.title
      );
      if (media) {
        featuredMediaId = media.id;
      }
    }

    // Create the post
    return this.createPost({
      ...data,
      status: 'publish',
      categories: [categoryId],
      featured_media: featuredMediaId,
    });
  }
}
