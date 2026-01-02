/**
 * Configuration types for wp-news-scheduler
 */

export interface WordPressConfig {
  siteUrl: string;
  categorySlug: string;
  categoryName: string;
}

export interface ScheduleSlots {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface ScheduleConfig {
  timezone: string;
  slots: ScheduleSlots;
  latenessThresholdMinutes: number;
}

export interface FeedSource {
  name: string;
  url: string;
  priority: number;
  allowMixedTone?: boolean;
  upliftThresholdBoost?: number;
}

export interface PositiveBoost {
  word: string;
  boost: number;
}

export interface FilterConfig {
  minUpliftScore: number;
  maxPerSource: number;
  hardExcludes: string[];
  positiveBoosts: PositiveBoost[];
}

export interface ImagesConfig {
  providers: string[];
}

export interface ContentConfig {
  excerptMaxChars: number;
  includeSourceLink: boolean;
  includeInternalLink: boolean;
  internalLinkUrl: string;
}

export interface SecretsConfig {
  wpUsernameFile: string;
  wpAppPasswordFile: string;
  unsplashAccessKeyFile?: string;
  pexelsApiKeyFile?: string;
  discordWebhookFile?: string;
}

export interface Config {
  wordpress: WordPressConfig;
  schedule: ScheduleConfig;
  feeds: FeedSource[];
  filter: FilterConfig;
  images: ImagesConfig;
  content: ContentConfig;
  secrets: SecretsConfig;
}

export interface Secrets {
  wpUsername: string;
  wpAppPassword: string;
  unsplashAccessKey?: string;
  pexelsApiKey?: string;
  discordWebhookUrl?: string;
}
