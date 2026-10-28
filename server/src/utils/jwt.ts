import * as jose from 'jose';
import type { JwtPayload } from '../index.js';

// =============================================
// JWT UTILITIES (using jose - more secure than jsonwebtoken)
// =============================================

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'default-secret-change-me-in-production-32chars!');
const ISSUER = 'tiketi';
const AUDIENCE = 'tiketi-api';
const MAX_TOKEN_AGE = '24h'; // 24 hours

/**
 * Sign a JWT token with secure defaults
 */
export async function signToken(payload: Omit<JwtPayload, 'iat' | 'exp' | 'iss'>): Promise<string> {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime('24h')
    .setJti(crypto.randomUUID()) // Unique token ID for revocation tracking
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token with full validation
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
      maxTokenAge: MAX_TOKEN_AGE,
    });

    // Validate required fields
    if (!payload.id || !payload.email || !payload.role) {
      throw new Error('Invalid token payload');
    }

    return payload as unknown as JwtPayload;
  } catch (err) {
    if (err instanceof jose.errors.JWTExpired) {
      throw new Error('Token expired');
    }
    if (err instanceof jose.errors.JWTInvalid) {
      throw new Error('Invalid token');
    }
    throw new Error('Token verification failed');
  }
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;
  
  // Basic token format validation
  const token = parts[1];
  if (token.split('.').length !== 3) return null;
  
  return token;
}
