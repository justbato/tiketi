import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from 'hono/request-id';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authRoutes } from './routes/auth.js';
import { eventRoutes } from './routes/events.js';
import { orderRoutes } from './routes/orders.js';
import { modelRoutes } from './routes/models.js';
import { staffRoutes } from './routes/staff.js';
import { adminRoutes } from './routes/admin.js';
import { webhookRoutes } from './routes/webhooks.js';
import { verifyRoutes } from './routes/verify.js';

// =============================================
// ENVIRONMENT VALIDATION
// =============================================

let envValidated = false;

function validateEnv() {
  if (envValidated) return;
  envValidated = true;

  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate JWT_SECRET length
  if ((process.env.JWT_SECRET || '').length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters');
  }
}

// =============================================
// SUPABASE CLIENT
// =============================================

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key-placeholder';
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// =============================================
// APP CONTEXT TYPE
// =============================================

export type AppEnv = {
  Variables: {
    supabase: SupabaseClient;
    user: JwtPayload | null;
    requestId: string;
    rateLimitHits: number;
  };
  Bindings: {};
};

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  event_id?: string;
  iat?: number;
  exp?: number;
  iss?: string;
}

// =============================================
// HONO APP
// =============================================

const app = new Hono<AppEnv>();

// ── Global Middleware ──

// Validate environment on first request
app.use('*', async (c, next) => {
  validateEnv();
  return await next();
});

// Request ID for tracing
app.use('*', requestId());

// Security headers with camera permission allowed
app.use('*', secureHeaders({
  permissionsPolicy: {
    camera: ['self'],
  },
}));

// Logger with request ID
app.use('*', async (c, next) => {
  const start = Date.now();
  const reqId = c.get('requestId' as never) || 'unknown';
  
  await next();
  
  const ms = Date.now() - start;
  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;
  
  console.log(`[${reqId}] ${method} ${path} → ${status} (${ms}ms)`);
});

// CORS
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173';
const allowedOrigins = rawOrigins.split(',').map((o: string) => o.trim()).filter(Boolean);

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return '*';
    if (allowedOrigins.includes(origin)) return origin;
    // Allow any Cloudflare Workers or Pages frontend domains
    if (origin.endsWith('.workers.dev') || origin.endsWith('.pages.dev')) return origin;
    // Allow any TiKeTi / doublemanmedia domains
    if (origin.includes('tiketi') || origin.includes('doublemanmedia')) return origin;
    // Allow any localhost / 127.0.0.1 port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
    // Safe fallback: reflect requesting origin
    return origin;
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Accept'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  maxAge: 86400,
}));

// ── Rate Limiting (in-memory, per-IP) ──

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

app.use('*', async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const now = Date.now();
  
  let entry = rateLimitStore.get(ip);
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60000 }; // 1 minute window
  }
  
  entry.count++;
  rateLimitStore.set(ip, entry);
  
  // Set rate limit headers
  c.header('X-RateLimit-Limit', '100');
  c.header('X-RateLimit-Remaining', String(Math.max(0, 100 - entry.count)));
  c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
  
  if (entry.count > 100) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  
  // Cleanup old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [key, val] of rateLimitStore.entries()) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  }
  
  return await next();
});

// ── Request body size limit middleware ──

app.use('*', async (c, next) => {
  const contentLength = c.req.header('content-length');
  if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
    return c.json({ error: 'Request body too large' }, 413);
  }
  return await next();
});

// ── Inject Supabase into context ──

app.use('*', async (c, next) => {
  c.set('supabase' as never, supabase as never);
  return await next();
});

// =============================================
// HEALTH CHECKS
// =============================================

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =============================================
// SOCIAL CRAWLER & EVENT PREVIEW HTML
// =============================================

function escapeHtml(str: string): string {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function renderEventHtml(eventId: string, siteUrl: string): Promise<{ html: string; status: number }> {
  // Query event from Supabase
  const { data: event, error } = await supabase
    .from('events')
    .select('id, name, description, venue, poster_url, banner_url, status, approval_status')
    .eq('id', eventId)
    .single();

  // If not found, draft, or not approved, do not leak any event details
  if (error || !event || event.status === 'draft' || event.approval_status !== 'approved') {
    const notFoundHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Event Not Found | TiKeTi</title>
    <meta name="robots" content="noindex, nofollow" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
    return { html: notFoundHtml, status: 404 };
  }

  const escapedTitle = escapeHtml(event.name);
  const rawDesc = event.description || `Get tickets for ${event.name} on TiKeTi!`;
  const escapedDesc = escapeHtml(rawDesc.slice(0, 200));
  const canonicalUrl = `${siteUrl}/event/${encodeURIComponent(event.id)}`;
  
  let imageUrl = event.poster_url || event.banner_url || '';
  if (!imageUrl || imageUrl.trim() === '') {
    imageUrl = `${siteUrl}/default-cover.png`;
  } else if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    const clean = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    imageUrl = `${siteUrl}${clean}`;
  } else {
    imageUrl = imageUrl.replace(/^http:\/\//i, 'https://');
  }

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5" />
    <meta name="theme-color" content="#2563EB" />
    <title>${escapedTitle} | TiKeTi</title>
    <meta name="description" content="${escapedDesc}" />
    <link rel="canonical" href="${canonicalUrl}" />

    <!-- Open Graph / Facebook / WhatsApp -->
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="TiKeTi" />
    <meta property="og:title" content="${escapedTitle}" />
    <meta property="og:description" content="${escapedDesc}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:image:secure_url" content="${imageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${canonicalUrl}" />

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapedTitle}" />
    <meta name="twitter:description" content="${escapedDesc}" />
    <meta name="twitter:image" content="${imageUrl}" />

    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Unlock&family=Slackey&family=Archivo:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
      html, body { margin: 0; padding: 0; width: 100%; min-height: 100%; }
      body { font-family: 'Archivo', sans-serif; background: #F0F2F5; color: #0F172A; }
      body.dark-mode { background: #12151B; color: #FFFFFF; }
      body.light-mode { background: #F0F2F5; color: #0F172A; }
      #root { width: 100%; min-height: 100vh; min-height: 100dvh; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;

  return { html, status: 200 };
}

app.get('/event/:id', async (c) => {
  const { id } = c.req.param();
  const siteUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/+$/, '');
  const { html, status } = await renderEventHtml(id, siteUrl);
  return c.html(html, status as any);
});

app.get('/e/:id', async (c) => {
  const { id } = c.req.param();
  const siteUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/+$/, '');
  const { html, status } = await renderEventHtml(id, siteUrl);
  return c.html(html, status as any);
});

// =============================================
// ROUTES
// =============================================

app.route('/api/auth', authRoutes);
app.route('/api/events', eventRoutes);
app.route('/api/orders', orderRoutes);
app.route('/api/models', modelRoutes);
app.route('/api/staff', staffRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/webhooks', webhookRoutes);
app.route('/api/verify', verifyRoutes);

// =============================================
// 404 HANDLER
// =============================================

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// =============================================
// ERROR HANDLER
// =============================================

app.onError((err, c) => {
  const reqId = c.get('requestId' as never) || 'unknown';
  console.error(`[${reqId}] Unhandled error:`, err);
  
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Internal server error' }, 500);
  }
  
  return c.json({ 
    error: 'Internal server error',
    message: err.message,
    requestId: reqId
  }, 500);
});

export default app;
