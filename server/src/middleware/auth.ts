import { Context, Next, MiddlewareHandler } from 'hono';
import { signToken, verifyToken, extractBearerToken } from '../utils/jwt.js';
import type { AppEnv, JwtPayload } from '../index.js';
import type { SupabaseClient } from '@supabase/supabase-js';

// =============================================
// AUTH MIDDLEWARE
// =============================================

/**
 * Require authentication - attaches user to context
 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);
  
  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  try {
    const user = await verifyToken(token);
    c.set('user', user);
    return await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: string[]): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    const user = c.get('user') as JwtPayload | undefined;
    
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    if (!roles.includes(user.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    
    return await next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const user = c.get('user') as JwtPayload | undefined;
  
  if (!user) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  
  if (user.role !== 'admin') {
    return c.json({ error: 'Admin access required' }, 403);
  }
  
  return await next();
};

/**
 * Optional auth - attaches user if token is valid, continues otherwise
 */
export const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = extractBearerToken(authHeader);
  
  if (token) {
    try {
      const user = await verifyToken(token);
      c.set('user', user);
    } catch {
      // Token invalid but auth is optional
    }
  }
  
  return await next();
};

/**
 * Strict rate limit for sensitive endpoints (login, verify)
 */
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export const loginRateLimit: MiddlewareHandler<AppEnv> = async (c, next) => {
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  const now = Date.now();
  
  let entry = loginAttempts.get(ip);
  
  if (entry && now < entry.lockedUntil) {
    const retryAfter = Math.ceil((entry.lockedUntil - now) / 1000);
    c.header('Retry-After', String(retryAfter));
    return c.json({ 
      error: 'Too many login attempts. Please try again later.',
      retry_after: retryAfter
    }, 429);
  }
  
  if (!entry || now >= (entry.lockedUntil || 0)) {
    entry = { count: 0, lockedUntil: 0 };
  }
  
  entry.count++;
  
  // Lock for 15 minutes after 5 failed attempts
  if (entry.count > 5) {
    entry.lockedUntil = now + 15 * 60 * 1000;
    loginAttempts.set(ip, entry);
    return c.json({ 
      error: 'Too many login attempts. Account locked for 15 minutes.' 
    }, 429);
  }
  
  loginAttempts.set(ip, entry);
  
  // Store reference so route can reset on success
  c.set('rateLimitHits' as never, entry.count as never);
  
  return await next();
};

/**
 * Reset login rate limit on successful auth
 */
export function resetLoginRateLimit(ip: string) {
  loginAttempts.delete(ip);
}

/**
 * Verify event ownership helper
 */
export async function verifyEventOwnership(
  supabase: SupabaseClient,
  eventId: string,
  userId: string,
  userRole: string
): Promise<{ authorized: boolean; event?: any }> {
  const { data: event, error } = await supabase
    .from('events')
    .select('id, planner_id, owner_id')
    .eq('id', eventId)
    .single();
  
  if (error || !event) {
    return { authorized: false };
  }
  
  // Admin can access any event
  if (userRole === 'admin') {
    return { authorized: true, event };
  }
  
  // Check ownership
  const isOwner = event.planner_id === userId || event.owner_id === userId;
  
  if ((userRole === 'owner' || userRole === 'planner') && !isOwner) {
    return { authorized: false };
  }
  
  return { authorized: true, event };
}

// Re-export signToken for use in routes
export { signToken };
