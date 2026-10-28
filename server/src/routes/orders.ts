import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../index.js';
import { generateOrderRef } from '../utils/codes.js';
import { createMonnifyPayment, calculateFees } from '../services/monnify.js';

// =============================================
// SCHEMAS
// =============================================

const createOrderSchema = z.object({
  event_id: z.string().uuid(),
  model_id: z.string().uuid().nullable().optional(),
  buyer_name: z.string().min(2).max(200),
  buyer_email: z.string().email().max(254),
  buyer_phone: z.string().min(10).max(20),
  items: z.array(z.object({
    ticket_type_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(20)
  })).min(1).max(50)
});

// =============================================
// ROUTES
// =============================================

export const orderRoutes = new Hono<AppEnv>();

// Create order (public route)
orderRoutes.post('/', async (c) => {
  let body: z.infer<typeof createOrderSchema>;
  
  try {
    body = createOrderSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Validate event exists and is active
  const { data: event } = await supabase
    .from('events')
    .select('id, status, sales_end_date')
    .eq('id', body.event_id)
    .single();

  if (!event || event.status !== 'active') {
    return c.json({ error: 'Event not available for sales' }, 400);
  }

  // Check sales end date
  const now = new Date();
  const salesEnd = new Date(event.sales_end_date);
  if (now > salesEnd) {
    return c.json({ error: 'Sales have ended' }, 400);
  }

  // Validate model referral if provided
  if (body.model_id) {
    const { data: model } = await supabase
      .from('models')
      .select('id, status, event_id')
      .eq('id', body.model_id)
      .single();

    if (!model || model.status !== 'active' || model.event_id !== body.event_id) {
      return c.json({
        error: 'This model link is inactive, suspended, or terminated. No purchase can be made with it.'
      }, 400);
    }
  }

  // Calculate totals and validate stock
  let subtotal = 0;
  const orderLines = [];

  for (const item of body.items) {
    const { data: ticketType } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('id', item.ticket_type_id)
      .eq('event_id', body.event_id)
      .single();

    if (!ticketType) {
      return c.json({ error: `Invalid ticket type: ${item.ticket_type_id}` }, 400);
    }

    // Check availability
    const { data: sold } = await supabase
      .from('order_lines')
      .select('quantity')
      .eq('ticket_type_id', item.ticket_type_id);

    const totalSold = sold?.reduce((sum, ol) => sum + ol.quantity, 0) || 0;
    const available = ticketType.quantity - totalSold;

    if (item.quantity > available) {
      return c.json({ 
        error: `Only ${available} ${ticketType.name} tickets available` 
      }, 400);
    }

    const lineTotal = ticketType.price * item.quantity;
    subtotal += lineTotal;

    orderLines.push({
      ticket_type_id: item.ticket_type_id,
      quantity: item.quantity,
      price: ticketType.price,
      total: lineTotal
    });
  }

  // Calculate fees
  const fees = calculateFees(subtotal);
  const total = subtotal + fees.totalFees;

  // Create order
  const orderRef = generateOrderRef();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      reference: orderRef,
      event_id: body.event_id,
      model_id: body.model_id || null,
      buyer_name: body.buyer_name,
      buyer_email: body.buyer_email,
      buyer_phone: body.buyer_phone,
      subtotal,
      fees: fees.totalFees,
      total,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to create order' }, 500);
  }

  // Create order lines
  for (const line of orderLines) {
    await supabase
      .from('order_lines')
      .insert({
        order_id: order.id,
        ticket_type_id: line.ticket_type_id,
        quantity: line.quantity,
        price: line.price,
        total: line.total
      });
  }

  // Create Monnify payment
  try {
    const payment = await createMonnifyPayment({
      amount: total,
      reference: orderRef,
      customerName: body.buyer_name,
      customerEmail: body.buyer_email
    });

    await supabase
      .from('orders')
      .update({ 
        payment_reference: payment.paymentReference,
        monnify_response: payment
      })
      .eq('id', order.id);

    return c.json({
      order: {
        id: order.id,
        reference: orderRef,
        total,
        expires_at: expiresAt.toISOString()
      },
      payment: {
        account_number: payment.accountNumber,
        bank_name: payment.bankName,
        account_name: payment.accountName,
        amount: total
      }
    }, 201);
  } catch (err) {
    // If Monnify fails, still create order but mark as failed
    await supabase
      .from('orders')
      .update({ status: 'payment_failed' })
      .eq('id', order.id);

    return c.json({ error: 'Payment initialization failed' }, 500);
  }
});

// Get order status (public)
orderRoutes.get('/:reference/status', async (c) => {
  const { reference } = c.req.param();

  const { data: order, error } = await supabase
    .from('orders')
    .select('status, total, expires_at')
    .eq('reference', reference)
    .single();

  if (error || !order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  return c.json({
    reference,
    status: order.status,
    total: order.total,
    expires_at: order.expires_at
  });
});

// =============================================
// SECURE TICKET LOOKUP (Section 3)
// Email is posted in the body — never exposed in the URL.
// Identical 404 for: unknown ref, wrong email, unpaid order.
// After 5 wrong email attempts the order locks for 15 minutes.
// =============================================

const ticketLookupSchema = z.object({
  buyer_email: z.string().email().max(254).transform(v => v.trim().toLowerCase()),
});

/** Always returns the same generic 404 to prevent information leakage. */
const TICKET_NOT_FOUND = { error: 'Order not found' } as const;

orderRoutes.post('/:reference/tickets', async (c) => {
  const { reference } = c.req.param();

  let body: { buyer_email: string };
  try {
    body = ticketLookupSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'buyer_email is required' }, 400);
  }

  // 1. Fetch order (all lockout columns included)
  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      id, reference, status, buyer_email,
      access_attempts, access_locked_until,
      event:events(id, name, venue, event_date, poster_url, banner_url),
      order_lines(*, ticket_type:ticket_types(name, admits, ticket_image_url))
    `)
    .eq('reference', reference)
    .single();

  // Unknown reference — same 404, no timing difference leakage is worth fixing here
  if (error || !order) {
    return c.json(TICKET_NOT_FOUND, 404);
  }

  // 2. Enforce lockout
  const lockedUntil = order.access_locked_until ? new Date(order.access_locked_until) : null;
  const isLocked = lockedUntil !== null && lockedUntil > new Date();
  if (isLocked) {
    return c.json(TICKET_NOT_FOUND, 404);
  }

  // 3. Email check (case-insensitive; already lowercased by schema transform)
  const storedEmail = (order.buyer_email || '').trim().toLowerCase();
  if (body.buyer_email !== storedEmail) {
    // Increment attempt counter; lock if threshold reached
    const newAttempts = (order.access_attempts || 0) + 1;
    const MAX_ATTEMPTS = 5;
    const LOCK_MINUTES = 15;
    const updatePayload: Record<string, unknown> = { access_attempts: newAttempts };
    if (newAttempts >= MAX_ATTEMPTS) {
      updatePayload.access_locked_until = new Date(
        Date.now() + LOCK_MINUTES * 60 * 1000
      ).toISOString();
    }
    await supabase.from('orders').update(updatePayload).eq('id', order.id);
    return c.json(TICKET_NOT_FOUND, 404);
  }

  // 4. Only paid orders may return tickets
  if (order.status !== 'paid') {
    return c.json(TICKET_NOT_FOUND, 404);
  }

  // 5. Success — reset lockout counter and return tickets
  await supabase
    .from('orders')
    .update({ access_attempts: 0, access_locked_until: null })
    .eq('id', order.id);

  const { data: tickets } = await supabase
    .from('tickets')
    .select('*, ticket_type:ticket_types(name, admits, ticket_image_url)')
    .eq('order_id', order.id);

  return c.json({
    order,
    tickets: tickets || []
  });
});

// Get order details (authenticated)
orderRoutes.get('/:reference', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { reference } = c.req.param();

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      event:events(name),
      order_lines(*, ticket_type:ticket_types(name))
    `)
    .eq('reference', reference)
    .single();

  if (error || !order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  // Check access
  if (user.role === 'owner') {
    const { data: event } = await supabase
      .from('events')
      .select('owner_id')
      .eq('id', order.event_id)
      .single();

    if (event?.owner_id !== user.id) {
      return c.json({ error: 'Access denied' }, 403);
    }
  } else if (order.buyer_email !== user.email) {
    return c.json({ error: 'Access denied' }, 403);
  }

  return c.json({ order });
});

// List orders for event owner
orderRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const event_id = c.req.query('event_id');

  if (user.role !== 'owner') {
    return c.json({ error: 'Access denied' }, 403);
  }

  let query = supabase
    .from('orders')
    .select(`
      *,
      event:events!inner(owner_id)
    `)
    .eq('events.owner_id', user.id);

  if (event_id) {
    query = query.eq('event_id', event_id);
  }

  const { data: orders, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }

  return c.json({ orders });
});
