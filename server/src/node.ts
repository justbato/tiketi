import 'dotenv/config';
import { serve } from '@hono/node-server';
import app from './index.js';

const port = parseInt(process.env.PORT || '3001', 10);
const host = process.env.HOST || '0.0.0.0';

console.log(`🚀 TiKeTi Server (Node.js) starting on ${host}:${port}`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});

console.log(`🚀 TiKeTi Server running on http://${host}:${port}`);
