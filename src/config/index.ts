/**
 * Configuration loader
 * Loads config from YAML and secrets from files
 */

import { readFileSync, existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Config, Secrets } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Project root (two levels up from src/config/)
const PROJECT_ROOT = resolve(__dirname, '..', '..');

/**
 * Load configuration from YAML file
 */
export function loadConfig(configPath?: string): Config {
  const paths = [
    configPath,
    resolve(PROJECT_ROOT, 'config', 'config.local.yaml'),
    resolve(PROJECT_ROOT, 'config', 'config.yaml'),
  ].filter(Boolean) as string[];

  for (const path of paths) {
    if (existsSync(path)) {
      const content = readFileSync(path, 'utf-8');
      const config = parseYaml(content) as Config;
      console.log(`[config] Loaded config from ${path}`);
      return config;
    }
  }

  throw new Error(`No config file found. Tried: ${paths.join(', ')}`);
}

/**
 * Read a secret from file
 * Checks multiple locations for Docker and local dev
 */
function readSecretFile(name: string): string | undefined {
  const paths = [
    `/run/secrets/${name}`,      // Docker Swarm secrets
    `/secrets/${name}`,           // Docker Compose mount
    resolve(PROJECT_ROOT, 'secrets', name),  // Local dev
  ];

  for (const path of paths) {
    if (existsSync(path)) {
      const value = readFileSync(path, 'utf-8').trim();
      console.log(`[secrets] Loaded ${name} from ${path}`);
      return value;
    }
  }

  return undefined;
}

/**
 * Load secrets from files
 */
export function loadSecrets(): Secrets {
  const wpUsername = readSecretFile('wp_username');
  const wpAppPassword = readSecretFile('wp_app_password');

  if (!wpUsername || !wpAppPassword) {
    throw new Error(
      'Missing required secrets. Ensure wp_username and wp_app_password files exist in /run/secrets/ or ./secrets/'
    );
  }

  return {
    wpUsername,
    wpAppPassword,
    unsplashAccessKey: readSecretFile('unsplash_access_key'),
    pexelsApiKey: readSecretFile('pexels_api_key'),
    discordWebhookUrl: readSecretFile('discord_webhook_url'),
  };
}

/**
 * Get project root path
 */
export function getProjectRoot(): string {
  return PROJECT_ROOT;
}
