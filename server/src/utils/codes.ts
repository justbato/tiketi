import crypto from 'crypto';

// =============================================
// CODE GENERATION UTILITIES
// =============================================

// Crockford Base32 alphabet (no ambiguous chars like 0/O, 1/I/L)
const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generate a secure random ticket code (8 chars, Crockford Base32)
 * Uses crypto.randomBytes for cryptographic randomness
 */
export function generateTicketCode(): string {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CROCKFORD_BASE32[bytes[i] % 32];
  }
  return code;
}

/**
 * Generate a unique order reference
 * Format: TKT-{timestamp36}-{random hex}
 */
export function generateOrderRef(): string {
  return 'TKT-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

/**
 * Generate a referral code for models
 * Format: TKT-{4 chars Crockford Base32}
 */
export function generateReferralCode(): string {
  const bytes = crypto.randomBytes(4);
  let code = 'TKT-';
  for (let i = 0; i < 4; i++) {
    code += CROCKFORD_BASE32[bytes[i] % 32];
  }
  return code;
}

/**
 * Verify ticket code format
 * Must be exactly 8 chars from Crockford Base32 alphabet
 */
export function verifyTicketCode(code: string): boolean {
  // Remove spaces and hyphens
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  
  // Check length
  if (normalized.length !== 8) return false;
  
  // Check all chars are in Crockford Base32
  for (const char of normalized) {
    if (!CROCKFORD_BASE32.includes(char)) return false;
  }
  
  return true;
}

/**
 * Format ticket code for display (XXXX XXXX)
 */
export function formatTicketCode(code: string): string {
  return code.slice(0, 4) + ' ' + code.slice(4);
}
