import { Context, MiddlewareHandler } from 'hono';
import { ZodSchema, ZodError } from 'zod';
import type { AppEnv } from '../index.js';

// =============================================
// INPUT VALIDATION MIDDLEWARE
// =============================================

/**
 * Validate request body against a Zod schema
 * Returns 400 with structured error details on failure
 */
export const validateBody = <T>(schema: ZodSchema<T>): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    try {
      const body = await c.req.json();
      const validated = schema.parse(body);
      c.set('validatedBody' as never, validated as never);
      return await next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map(e => ({
          path: e.path.join('.'),
          message: e.message,
          code: e.code
        }));
        
        return c.json({
          error: 'Validation failed',
          details: errors
        }, 400);
      }
      
      return c.json({ error: 'Invalid request body' }, 400);
    }
  };
};

/**
 * Validate query parameters against a Zod schema
 */
export const validateQuery = <T>(schema: ZodSchema<T>): MiddlewareHandler<AppEnv> => {
  return async (c, next) => {
    try {
      const query = c.req.query();
      const validated = schema.parse(query);
      c.set('validatedQuery' as never, validated as never);
      return await next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        
        return c.json({
          error: 'Invalid query parameters',
          details: errors
        }, 400);
      }
      
      return c.json({ error: 'Invalid query parameters' }, 400);
    }
  };
};

/**
 * Sanitize string inputs - remove potential XSS and injection vectors
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>'"&]/g, '') // Remove HTML/SQL injection chars
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validate email format (basic)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Get validated body from context
 */
export function getValidatedBody<T>(c: Context): T {
  return c.get('validatedBody' as never) as T;
}
