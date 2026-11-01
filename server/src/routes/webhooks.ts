import { Hono } from 'hono';
import crypto from 'crypto';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAdmin } from '../middleware/auth.js';
import { supabase } from '../index.js';
import { generateTicketCode } from '../utils/tickets.js';
import { verifyWebhookSignature } from '../services/paystack.js';

// =============================================
// ROUTES
// =============================================

export const webhookRoutes = new Hono<AppEnv>();

// ── Paystack Webhook (signature verified via HMAC-SHA512) ──
webhookRoutes.post('/paystack', async (c) => {
  const signature = c.req.header('x-paystack-signature');
  
  if (!signature) {
    return c.json({ error: 'Missing x-paystack-signature header' }, 401);
  }

  const rawBody = await c.req.text();
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    console.error('PAYSTACK_SECRET_KEY not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  const isValid = verifyWebhookSignature(rawBody, signature, secret);
  if (!isValid) {
    console.warn('[Webhook] Invalid Paystack signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { event, data } = body;
  console.log(`[Webhook] Paystack event received: ${event}`);

  if (event === 'charge.success') {
    const reference = data.reference;
    const amountKobo = data.amount;

    if (!reference) {
      return c.json({ error: 'Missing reference' }, 400);
    }

    // Find order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, event:events(id, organizer_id)')
      .or(`reference.eq.${reference},paystack_reference.eq.${reference},payment_reference.eq.${reference}`)
      .single();

    if (orderErr || !order) {
      console.warn(`[Webhook] Order not found for reference: ${reference}`);
      return c.json({ success: true, message: 'Order not found, acknowledged' });
    }

    // Idempotency check
    if (order.status === 'paid') {
      console.log(`[Webhook] Order already processed: ${reference}`);
      return c.json({ success: true, message: 'Already processed' });
    }

    // Verify amount (kobo vs naira * 100)
    const expectedKobo = Math.round((order.gross || order.total) * 100);
    if (amountKobo < expectedKobo) {
      console.warn(`[Webhook] Amount mismatch for ${reference}: expected ${expectedKobo}, got ${amountKobo}`);
      await supabase
        .from('orders')
        .update({ 
          status: 'amount_mismatch',
          amount_paid: amountKobo / 100,
        })
        .eq('id', order.id);

      return c.json({ success: true, message: 'Amount mismatch recorded' });
    }

    const paidAt = new Date().toISOString();

    // Mark order as paid
    await supabase
      .from('orders')
      .update({ 
        status: 'paid',
        paid_at: paidAt
      })
      .eq('id', order.id);

    // Lock organizer bank details once first paid ticket is sold
    if (order.event?.organizer_id) {
      await supabase
        .from('event_organizers')
        .update({
          bank_locked: true,
          first_paid_at: paidAt
        })
        .eq('id', order.event.organizer_id);
    }

    // Check if tickets already exist (idempotency)
    const { data: existingTickets } = await supabase
      .from('tickets')
      .select('id')
      .eq('order_id', order.id);

    if (!existingTickets || existingTickets.length === 0) {
      // Get order lines
      const { data: orderLines } = await supabase
        .from('order_lines')
        .select('*, ticket_type:ticket_types(name, admits)')
        .eq('order_id', order.id);

      // Generate tickets
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

    // Note: Paystack subaccount handles the settlement split automatically.
    // No separate payout record needed — the organizer_share is already
    // tracked on the order (organizer_share column).

    console.log(`[Webhook] Paystack payment successfully processed for order: ${reference}`);
  }

  return c.json({ success: true });
});

// Reconcile pending orders (admin only - cron job endpoint)
webhookRoutes.post('/reconcile', requireAdmin, async (c) => {
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('id, reference, expires_at')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());

  if (!pendingOrders || pendingOrders.length === 0) {
    return c.json({ message: 'No pending orders to reconcile', count: 0 });
  }

  let reconciled = 0;
  for (const order of pendingOrders) {
    await supabase
      .from('orders')
      .update({ status: 'expired' })
      .eq('id', order.id);
    reconciled++;
  }

  console.log(`[Reconcile] ${reconciled} orders marked expired`);
  return c.json({ message: 'Reconciliation complete', count: reconciled });
});
