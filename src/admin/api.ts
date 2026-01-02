/**
 * Admin API routes
 */

import { Router } from 'express';
import { loadConfig } from '../config/index.js';
import {
  loadState,
  getRecentPublished,
  getRecentAuditLog,
} from '../state/index.js';
import { getCurrentDateString } from '../utils/index.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const CONFIG_PATH = process.env.CONFIG_PATH || resolve(PROJECT_ROOT, 'config', 'config.yaml');
const STATE_PATH = process.env.STATE_PATH || resolve(PROJECT_ROOT, 'data', 'state.json');

export function createApiRouter(): Router {
  const router = Router();

  // Get dashboard stats
  router.get('/stats', async (_req, res) => {
    try {
      const config = await loadConfig(CONFIG_PATH);
      const state = await loadState(STATE_PATH);

      // Calculate stats
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const todayPublished = state.published.filter(
        p => new Date(p.publishedAt) >= todayStart
      );

      const weekStart = new Date(todayStart);
      weekStart.setDate(weekStart.getDate() - 7);
      
      const weekPublished = state.published.filter(
        p => new Date(p.publishedAt) >= weekStart
      );

      res.json({
        currentTime: getCurrentDateString(config.schedule.timezone),
        timezone: config.schedule.timezone,
        schedule: config.schedule.slots,
        stats: {
          totalPublished: state.published.length,
          publishedToday: todayPublished.length,
          publishedThisWeek: weekPublished.length,
          feedsConfigured: config.feeds.length,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

  // Get recent posts
  router.get('/posts', async (_req, res) => {
    try {
      const state = await loadState(STATE_PATH);
      const posts = getRecentPublished(state, 50);
      res.json({ posts });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

  // Get audit log
  router.get('/audit', async (_req, res) => {
    try {
      const state = await loadState(STATE_PATH);
      const entries = getRecentAuditLog(state, 100);
      res.json({ entries });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

  // Get feed status
  router.get('/feeds', async (_req, res) => {
    try {
      const config = await loadConfig(CONFIG_PATH);
      
      const feeds = config.feeds.map(feed => ({
        name: feed.name,
        url: feed.url,
        priority: feed.priority,
        allowMixedTone: feed.allowMixedTone,
      }));

      res.json({ feeds });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: message });
    }
  });

  // Health check
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  return router;
}
