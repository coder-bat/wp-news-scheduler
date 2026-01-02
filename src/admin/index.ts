/**
 * Admin UI server
 * Local-only dashboard for monitoring
 */

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createApiRouter } from './api.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.ADMIN_PORT || 8080;

export function startAdminServer(): void {
  const app = express();

  // JSON parsing
  app.use(express.json());

  // API routes
  app.use('/api', createApiRouter());

  // Static files
  app.use(express.static(join(__dirname, 'public')));

  // SPA fallback
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  });

  // Start server (localhost only)
  app.listen(Number(PORT), '127.0.0.1', () => {
    console.log(`Admin UI running at http://localhost:${PORT}`);
    console.log('Access via SSH tunnel: ssh -L 8080:localhost:8080 your-server');
  });
}

// Start if run directly
startAdminServer();
