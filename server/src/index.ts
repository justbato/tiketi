import 'dotenv/config';
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

function validateEnv() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  // Validate JWT_SECRET length
  if ((process.env.JWT_SECRET || '').length < 32) {
    console.error('❌ JWT_SECRET must be at least 32 characters');
    process.exit(1);
  }
}

validateEnv();

// =============================================
// SUPABASE CLIENT
// =============================================

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock-supabase.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-service-role-key';
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

// Request ID for tracing
app.use('*', requestId());

// Security headers (replaces Helmet)
app.use('*', secureHeaders());

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
const allowedOrigins = rawOrigins.split(',').map((o: string) => o.trim());

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return null;
    if (allowedOrigins.includes(origin)) return origin;
    if (process.env.NODE_ENV !== 'production') return origin;
    return null;
  },
  credentials: true,
  allowHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  maxAge: 86400,
}));

// ── Rate Limiting (in-memory, per-IP) ──

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

app.use('*', async (c, next) => {
  const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
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
  
  // Don't leak internal errors in production
  if (process.env.NODE_ENV === 'production') {
    return c.json({ error: 'Internal server error' }, 500);
  }
  
  return c.json({ 
    error: 'Internal server error',
    message: err.message,
    requestId: reqId
  }, 500);
});

// =============================================
// START SERVER
// =============================================

const port = parseInt(process.env.PORT || '3001');
const host = process.env.HOST || '0.0.0.0';

console.log(`🚀 TiKeTi Server (Hono) starting on ${host}:${port}`);

export default {
  port,
  fetch: app.fetch,
};

// For direct Node.js execution
if (process.env.NODE_ENV !== 'test') {
  const { serve } = await import('@hono/node-server');
  serve({
    fetch: app.fetch,
    port,
    hostname: host,
  });
  console.log(`🚀 TiKeTi Server running on ${host}:${port}`);
}
