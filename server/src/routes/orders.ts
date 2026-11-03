import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { supabase } from '../index.js';
import { generateOrderRef } from '../utils/codes.js';
import { generateTicketCode } from '../utils/tickets.js';
import {
  initializeTransaction,
  calculateSplit,
  verifyTransaction
} from '../services/paystack.js';

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

// Create order & initialize Paystack transaction (public route)
orderRoutes.post('/', async (c) => {
  let body: z.infer<typeof createOrderSchema>;

  try {
    body = createOrderSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Validate event exists, is active, and is approved
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, name, status, approval_status, sales_end_date, paystack_subaccount_code, fee_percent_override, organizer_id')
    .eq('id', body.event_id)
    .single();

  if (eventErr || !event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  if (event.approval_status !== 'approved') {
    return c.json({
      error: 'This event is currently pending administrator approval and is not accepting ticket sales.'
    }, 400);
  }

  if (event.status !== 'active') {
    return c.json({ error: 'Event is not available for sales' }, 400);
  }

  // Check sales end date
  const now = new Date();
  const salesEnd = new Date(event.sales_end_date);
  if (now > salesEnd) {
    return c.json({ error: 'Sales have ended for this event' }, 400);
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

  // Calculate totals and validate ticket availability
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

    const { data: sold } = await supabase
      .from('order_lines')
      .select('quantity, order:orders!inner(status)')
      .eq('ticket_type_id', item.ticket_type_id)
      .in('orders.status', ['paid', 'pending']);

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

  // Fetch platform fee % (or event override)
  let feePercent = 5.0; // default 5%
  if (event.fee_percent_override != null && !isNaN(Number(event.fee_percent_override))) {
    feePercent = Number(event.fee_percent_override);
  } else {
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('fee_percent')
      .limit(1)
      .single();
    if (settings?.fee_percent != null) {
      feePercent = Number(settings.fee_percent);
    }
  }

  const split = calculateSplit(subtotal, feePercent);
  const orderRef = generateOrderRef();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins window

  // Create order
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .insert({
      reference: orderRef,
      event_id: body.event_id,
      model_id: body.model_id || null,
      buyer_name: body.buyer_name,
      buyer_email: body.buyer_email,
      buyer_phone: body.buyer_phone,
      subtotal,
      gross: split.gross_naira,
      fee_percent_used: feePercent,
      platform_fee: split.platform_fee_naira,
      organizer_share: split.organizer_share_naira,
      fees: split.platform_fee_naira,
      total: subtotal,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (orderErr || !order) {
    console.error('Failed to create order:', orderErr);
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

  // Initialize Paystack payment
  try {
    const paystackSubaccount = event.paystack_subaccount_code || '';

    const payment = await initializeTransaction({
      email: body.buyer_email,
      amount_kobo: split.gross_kobo,
      reference: orderRef,
      subaccount_code: paystackSubaccount,
      transaction_charge_kobo: split.platform_fee_kobo,
      fee_bearer: 'subaccount',
      callback_url: `${(process.env.FRONTEND_URL || 'https://tiketi.ng').split(',')[0].trim()}/payment/callback`,
      metadata: {
        order_id: order.id,
        order_ref: orderRef,
        event_id: body.event_id,
        event_name: event.name,
        buyer_name: body.buyer_name,
        buyer_phone: body.buyer_phone,
      }
    });

    await supabase
      .from('orders')
      .update({
        payment_reference: payment.reference,
        paystack_reference: payment.reference,
      })
      .eq('id', order.id);

    return c.json({
      order: {
        id: order.id,
        reference: orderRef,
        total: subtotal,
        gross: split.gross_naira,
        platform_fee: split.platform_fee_naira,
        organizer_share: split.organizer_share_naira,
        expires_at: expiresAt.toISOString()
      },
      payment: {
        authorization_url: payment.authorization_url,
        access_code: payment.access_code,
        reference: payment.reference,
        amount: subtotal,
      }
    }, 201);
  } catch (err: any) {
    console.error('Paystack initialization error:', err.message);
    await supabase
      .from('orders')
      .update({ status: 'payment_failed' })
      .eq('id', order.id);

    return c.json({ error: 'Payment initialization failed. Please try again.' }, 500);
  }
});

// Verify transaction via Paystack (for inline popup callback or fallback check)
orderRoutes.post('/:reference/verify-payment', async (c) => {
  const { reference } = c.req.param();

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, event:events(id, organizer_id)')
    .eq('reference', reference)
    .single();

  if (error || !order) {
    return c.json({ error: 'Order not found' }, 404);
  }

  if (order.status === 'paid') {
    return c.json({ status: 'paid', message: 'Order already paid' });
  }

  try {
    const verification = await verifyTransaction(order.paystack_reference || reference);

    if (verification.status === 'success') {
      const paidAt = new Date().toISOString();

      // Mark order paid
      await supabase
        .from('orders')
        .update({
          status: 'paid',
          paid_at: paidAt
        })
        .eq('id', order.id);

      // Lock organizer bank details & record first_paid_at
      if (order.event?.organizer_id) {
        await supabase
          .from('event_organizers')
          .update({
            bank_locked: true,
            first_paid_at: paidAt
          })
          .eq('id', order.event.organizer_id);
      }

      // Generate tickets if not already generated
      const { data: existingTickets } = await supabase
        .from('tickets')
        .select('id')
        .eq('order_id', order.id);

      if (!existingTickets || existingTickets.length === 0) {
        const { data: orderLines } = await supabase
          .from('order_lines')
          .select('*, ticket_type:ticket_types(name, admits)')
          .eq('order_id', order.id);

        for (const line of orderLines || []) {
          const ticketType = (line as any).ticket_type;
          const admits = ticketType?.admits || 1;

          for (let i = 0; i < line.quantity; i++) {
            const code = generateTicketCode();
            await supabase
              .from('tickets')
              .insert({
                order_id: order.id,
                ticket_type_id: line.ticket_type_id,
                code,
                admits,
                buyer_name: order.buyer_name,
                buyer_email: order.buyer_email
              });
          }
        }
      }

      return c.json({ status: 'paid', message: 'Payment confirmed and tickets generated' });
    } else {
      return c.json({ status: verification.status, message: 'Payment not completed yet' });
    }
  } catch (err: any) {
    console.error('Paystack verify error:', err.message);
    return c.json({ error: 'Verification failed' }, 500);
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
// SECURE TICKET LOOKUP
// =============================================

const ticketLookupSchema = z.object({
  buyer_email: z.string().email().max(254).transform(v => v.trim().toLowerCase()),
});

const TICKET_NOT_FOUND = { error: 'Order not found' } as const;

orderRoutes.post('/:reference/tickets', async (c) => {
  const { reference } = c.req.param();

  let body: { buyer_email: string };
  try {
    body = ticketLookupSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'buyer_email is required' }, 400);
  }

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

  if (error || !order) {
    return c.json(TICKET_NOT_FOUND, 404);
  }

  const lockedUntil = order.access_locked_until ? new Date(order.access_locked_until) : null;
  const isLocked = lockedUntil !== null && lockedUntil > new Date();
  if (isLocked) {
    return c.json(TICKET_NOT_FOUND, 404);
  }

  const storedEmail = (order.buyer_email || '').trim().toLowerCase();
  if (body.buyer_email !== storedEmail) {
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

  if (order.status !== 'paid') {
    return c.json(TICKET_NOT_FOUND, 404);
  }

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

  if (user.role === 'owner' || user.role === 'organizer' || user.role === 'planner') {
    const { data: event } = await supabase
      .from('events')
      .select('organizer_id, planner_id, owner_id')
      .eq('id', order.event_id)
      .single();

    const isAuthorized =
      event?.organizer_id === user.id ||
      event?.planner_id === user.id ||
      (event as any)?.owner_id === user.id;

    if (!isAuthorized) {
      return c.json({ error: 'Access denied' }, 403);
    }
  } else if (order.buyer_email !== user.email) {
    return c.json({ error: 'Access denied' }, 403);
  }

  return c.json({ order });
});

// List orders for event organizer
orderRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const event_id = c.req.query('event_id');

  if (user.role !== 'owner' && user.role !== 'organizer' && user.role !== 'planner') {
    return c.json({ error: 'Access denied' }, 403);
  }

  let query = supabase
    .from('orders')
    .select(`
      *,
      event:events!inner(id, name, organizer_id, planner_id)
    `);

  if (event_id) {
    query = query.eq('event_id', event_id);
  }

  const { data: orders, error } = await query.order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }

  return c.json({ orders });
});