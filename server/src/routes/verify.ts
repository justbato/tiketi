import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../index.js';
import { verifyTicketCode, verifyQRSignature } from '../utils/tickets.js';

// =============================================
// SCHEMAS
// =============================================

const verifySchema = z.object({
  code: z.string().optional(),
  qr_payload: z.string().optional(),
  event_id: z.string().uuid(),
  method: z.enum(['code', 'qr'])
}).refine(data => data.code || data.qr_payload, {
  message: 'Either code or qr_payload is required'
});

const undoSchema = z.object({
  reason: z.string().min(1).max(500)
});

// =============================================
// RATE LIMITING FOR VERIFICATION
// =============================================

const verifyAttempts = new Map<string, { count: number; resetAt: number }>();

function checkVerifyRateLimit(ip: string): boolean {
  const now = Date.now();
  let entry = verifyAttempts.get(ip);
  
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60000 };
  }
  
  entry.count++;
  verifyAttempts.set(ip, entry);
  
  // Cleanup old entries
  if (verifyAttempts.size > 5000) {
    for (const [key, val] of verifyAttempts.entries()) {
      if (now > val.resetAt) verifyAttempts.delete(key);
    }
  }
  
  return entry.count <= 10; // Max 10 verifications per minute per IP
}

// =============================================
// ROUTES
// =============================================

export const verifyRoutes = new Hono<AppEnv>();

// Verify ticket
verifyRoutes.post('/', async (c) => {
  // Rate limit check
  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
  if (!checkVerifyRateLimit(ip)) {
    return c.json({ error: 'Too many verification attempts' }, 429);
  }

  let body: z.infer<typeof verifySchema>;
  
  try {
    body = verifySchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Auth check - must be staff or owner
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Import verifyToken dynamically to avoid circular deps
  const { verifyToken } = await import('../utils/jwt.js');
  let user: JwtPayload;
  
  try {
    user = await verifyToken(authHeader.split(' ')[1]);
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  // Verify event access
  const { data: event } = await supabase
    .from('events')
    .select('owner_id, planner_id')
    .eq('id', body.event_id)
    .single();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  // Check if user is owner/planner or assigned staff
  let hasAccess = false;

  if ((user.role === 'owner' || user.role === 'planner') && 
      (event.owner_id === user.id || event.planner_id === user.id)) {
    hasAccess = true;
  } else if (user.role === 'gate') {
    // Check staff account status
    const { data: staffUser } = await supabase
      .from('gate_staff')
      .select('status, event_id')
      .eq('id', user.id)
      .single();

    if (!staffUser || staffUser.status !== 'active') {
      return c.json({
        error: `Gate staff account is ${staffUser?.status || 'inactive'}. Verification access has been revoked or suspended.`
      }, 403);
    }

    // Verify staff is assigned to this event
    if (staffUser.event_id === body.event_id) {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return c.json({ error: 'Access denied' }, 403);
  }

  let ticketCode: string;
  let isValidQR = false;

  // Verify QR or code
  if (body.qr_payload) {
    // Verify QR signature
    const verified = verifyQRSignature(body.qr_payload);
    if (!verified) {
      return c.json({ status: 'invalid', message: 'Invalid QR code signature' });
    }

    // Extract code from payload
    try {
      const payload = JSON.parse(body.qr_payload);
      ticketCode = payload.code;
      isValidQR = true;
    } catch {
      return c.json({ status: 'invalid', message: 'Invalid QR payload format' });
    }
  } else if (body.code) {
    // Normalize code
    ticketCode = body.code.replace(/[\s-]/g, '').toUpperCase();

    // Verify code format
    if (!verifyTicketCode(ticketCode)) {
      return c.json({ status: 'invalid', message: 'Invalid ticket code format' });
    }
  } else {
    return c.json({ error: 'No code or QR provided' }, 400);
  }

  // Find ticket
  const { data: ticket } = await supabase
    .from('tickets')
    .select(`
      *,
      order:orders(event_id, buyer_name, buyer_email),
      ticket_type:ticket_types(name, price)
    `)
    .eq('code', ticketCode)
    .single();

  if (!ticket) {
    return c.json({ status: 'not_found', message: 'Ticket not found' });
  }

  // Verify event matches
  if ((ticket as any).order.event_id !== body.event_id) {
    return c.json({ status: 'invalid', message: 'Ticket not valid for this event' });
  }

  // Check if already used
  if (ticket.used_at) {
    return c.json({
      status: 'already_used',
      message: 'Ticket already used',
      used_at: ticket.used_at,
      used_by: ticket.used_by
    });
  }

  // Mark as used (atomic operation)
  const { data: updated, error } = await supabase
    .from('tickets')
    .update({
      used_at: new Date().toISOString(),
      used_by: user.id,
      verification_method: body.method
    })
    .eq('id', ticket.id)
    .is('used_at', null) // Atomic check - prevents double-scan
    .select()
    .single();

  if (error || !updated) {
    // Race condition - ticket was just used
    const { data: freshTicket } = await supabase
      .from('tickets')
      .select('used_at, used_by')
      .eq('id', ticket.id)
      .single();

    return c.json({
      status: 'already_used',
      message: 'Ticket already used',
      used_at: freshTicket?.used_at,
      used_by: freshTicket?.used_by
    });
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'ticket.verify',
    entity_type: 'ticket',
    entity_id: ticket.id,
    details: `Ticket verified via ${body.method}: ${ticketCode}`
  });

  return c.json({
    status: 'valid',
    message: 'Ticket verified successfully',
    ticket: {
      code: ticket.code,
      type: (ticket as any).ticket_type.name,
      admits: ticket.admits || 1,
      buyer_name: (ticket as any).order.buyer_name,
      used_at: updated.used_at
    }
  });
});

// Get check-in stats for event
verifyRoutes.get('/stats/:eventId', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { eventId } = c.req.param();

  // Verify access
  const { data: event } = await supabase
    .from('events')
    .select('owner_id, planner_id, capacity')
    .eq('id', eventId)
    .single();

  if (!event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  let hasAccess = false;
  if ((user.role === 'owner' || user.role === 'planner') && 
      (event.owner_id === user.id || event.planner_id === user.id)) {
    hasAccess = true;
  } else if (user.role === 'gate') {
    const { data: staffUser } = await supabase
      .from('gate_staff')
      .select('event_id, status')
      .eq('id', user.id)
      .single();

    if (staffUser && staffUser.event_id === eventId && staffUser.status === 'active') {
      hasAccess = true;
    }
  }

  if (!hasAccess) {
    return c.json({ error: 'Access denied' }, 403);
  }

  // Get total tickets for the event via orders
  const { data: orders } = await supabase
    .from('orders')
    .select('id')
    .eq('event_id', eventId)
    .eq('status', 'paid');

  const orderIds = orders?.map(o => o.id) || [];
  
  let tickets: any[] = [];
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('tickets')
      .select('id, used_at, admits')
      .in('order_id', orderIds);
    tickets = data || [];
  }

  const totalTickets = tickets.length;
  const checkedIn = tickets.filter(t => t.used_at).length;
  const totalAdmits = tickets.reduce((sum, t) => sum + (t.admits || 1), 0);
  const checkedInAdmits = tickets.filter(t => t.used_at).reduce((sum, t) => sum + (t.admits || 1), 0);

  return c.json({
    total_tickets: totalTickets,
    checked_in: checkedIn,
    total_admits: totalAdmits,
    checked_in_admits: checkedInAdmits,
    capacity: event.capacity,
    percentage: totalTickets > 0 ? Math.round((checkedIn / totalTickets) * 100) : 0
  });
});

// Undo check-in (owner only)
verifyRoutes.post('/undo/:ticketId', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { ticketId } = c.req.param();

  let body: z.infer<typeof undoSchema>;
  
  try {
    body = undoSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  if (user.role !== 'owner' && user.role !== 'planner') {
    return c.json({ error: 'Only owners can undo check-ins' }, 403);
  }

  // Get ticket and verify ownership
  const { data: ticket } = await supabase
    .from('tickets')
    .select('order:orders(event:events(owner_id, planner_id))')
    .eq('id', ticketId)
    .single();

  if (!ticket) {
    return c.json({ error: 'Ticket not found' }, 404);
  }

  const eventOwner = (ticket as any).order?.events?.owner_id;
  const eventPlanner = (ticket as any).order?.events?.planner_id;
  
  if (eventOwner !== user.id && eventPlanner !== user.id) {
    return c.json({ error: 'Access denied' }, 403);
  }

  // Undo check-in
  const { error } = await supabase
    .from('tickets')
    .update({
      used_at: null,
      used_by: null,
      verification_method: null
    })
    .eq('id', ticketId);

  if (error) {
    return c.json({ error: 'Failed to undo check-in' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'ticket.undo_verify',
    entity_type: 'ticket',
    entity_id: ticketId,
    details: `Check-in undone. Reason: ${body.reason}`
  });

  return c.json({ success: true });
});
