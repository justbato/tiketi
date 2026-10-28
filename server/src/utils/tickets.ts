import crypto from 'crypto';

// =============================================
// TICKET & QR UTILITIES
// =============================================

const HMAC_SECRET = process.env.QR_HMAC_SECRET || process.env.JWT_SECRET || '';
if (!HMAC_SECRET) {
  console.warn('⚠️  QR_HMAC_SECRET not set, using JWT_SECRET as fallback');
}

const CROCKFORD_BASE32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generate a secure random ticket code
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
 * Verify ticket code format
 */
export function verifyTicketCode(code: string): boolean {
  const normalized = code.replace(/[\s-]/g, '').toUpperCase();
  if (normalized.length !== 8) return false;
  
  for (const char of normalized) {
    if (!CROCKFORD_BASE32.includes(char)) return false;
  }
  
  return true;
}

/**
 * Generate HMAC-signed QR payload
 * Includes ticket_id, code, event_id, and a signature to prevent forgery
 */
export function generateQRPayload(ticketId: string, code: string, eventId: string): string {
  const data = `${ticketId}:${code}:${eventId}`;
  const signature = crypto
    .createHmac('sha256', HMAC_SECRET)
    .update(data)
    .digest('hex');
  
  return JSON.stringify({
    ticket_id: ticketId,
    code,
    event_id: eventId,
    signature
  });
}

/**
 * Verify QR code signature using timing-safe comparison
 * Prevents timing attacks that could leak signature information
 */
export function verifyQRSignature(payload: string): boolean {
  try {
    const data = JSON.parse(payload);
    const { ticket_id, code, event_id, signature } = data;
    
    if (!ticket_id || !code || !event_id || !signature) {
      return false;
    }
    
    const expectedData = `${ticket_id}:${code}:${event_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(expectedData)
      .digest('hex');
    
    // Timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (err) {
    return false;
  }
}

/**
 * Format ticket code for display
 */
export function formatTicketCode(code: string): string {
  return code.slice(0, 4) + ' ' + code.slice(4);
}
