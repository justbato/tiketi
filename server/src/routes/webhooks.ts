import { Hono } from 'hono';
import crypto from 'crypto';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAdmin } from '../middleware/auth.js';
import { supabase } from '../index.js';
import { generateTicketCode } from '../utils/tickets.js';

// =============================================
// ROUTES
// =============================================

export const webhookRoutes = new Hono<AppEnv>();

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do comparison to avoid leaking length info via timing
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(a); // Compare against itself
    crypto.timingSafeEqual(bufA, bufB);
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// Monnify webhook - NO auth required (verified by signature)
webhookRoutes.post('/monnify', async (c) => {
  const signature = c.req.header('x-monnify-signature');
  
  if (!signature) {
    return c.json({ error: 'Missing signature' }, 401);
  }

  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  // Verify webhook signature with timing-safe comparison
  const secret = process.env.MONNIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('MONNIFY_WEBHOOK_SECRET not configured');
    return c.json({ error: 'Webhook not configured' }, 500);
  }

  const hash = crypto
    .createHmac('sha512', secret)
    .update(JSON.stringify(body))
    .digest('hex');

  if (!timingSafeCompare(hash, signature)) {
    console.warn('Invalid Monnify webhook signature');
    return c.json({ error: 'Invalid signature' }, 401);
  }

  const { eventData } = body;
  
  if (!eventData) {
    return c.json({ error: 'Invalid webhook payload' }, 400);
  }

  const { paymentReference, paymentStatus, amountPaid } = eventData;

  if (!paymentReference || !paymentStatus) {
    return c.json({ error: 'Missing required fields' }, 400);
  }

  console.log(`[Webhook] Monnify: ${paymentReference} → ${paymentStatus}`);

  // Find order
  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('payment_reference', paymentReference)
    .single();

  if (!order) {
    console.warn(`[Webhook] Order not found for: ${paymentReference}`);
    return c.json({ error: 'Order not found' }, 404);
  }

  // Check if already processed (idempotency)
  if (order.status === 'paid') {
    console.log(`[Webhook] Order already processed: ${paymentReference}`);
    return c.json({ success: true, message: 'Already processed' });
  }

  // Verify amount
  if (amountPaid !== order.total) {
    console.warn(`[Webhook] Amount mismatch: expected ${order.total}, got ${amountPaid}`);

    await supabase
      .from('orders')
      .update({ 
        status: 'amount_mismatch',
        amount_paid: amountPaid,
        monnify_response: body
      })
      .eq('id', order.id);

    return c.json({ success: true, message: 'Amount mismatch recorded' });
  }

  // Check expiry
  if (new Date() > new Date(order.expires_at)) {
    console.warn(`[Webhook] Payment received after expiry: ${paymentReference}`);

    await supabase
      .from('orders')
      .update({ 
        status: 'late_payment',
        monnify_response: body
      })
      .eq('id', order.id);

    return c.json({ success: true, message: 'Late payment recorded' });
  }

  // Process successful payment
  if (paymentStatus === 'PAID') {
    // Update order status
    await supabase
      .from('orders')
      .update({ 
        status: 'paid',
        paid_at: new Date().toISOString(),
        monnify_response: body
      })
      .eq('id', order.id);

    // Get order lines
    const { data: orderLines } = await supabase
      .from('order_lines')
      .select('*, ticket_type:ticket_types(name, admits)')
      .eq('order_id', order.id);

    // Generate tickets
    for (const line of orderLines || []) {
      const ticketType = (line as any).ticket_type;
      const admits = ticketType.admits || 1;

      // Create one ticket per quantity
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

    // Create payout record
    const ownerAmount = order.total - order.fees;
    await supabase
      .from('payouts')
      .insert({
        order_id: order.id,
        owner_id: order.owner_id,
        gross: order.total,
        fees: order.fees,
        net: ownerAmount,
        status: 'pending'
      });

    console.log(`[Webhook] Payment processed: ${paymentReference}`);
  } else if (paymentStatus === 'FAILED') {
    await supabase
      .from('orders')
      .update({ 
        status: 'failed',
        monnify_response: body
      })
      .eq('id', order.id);

    console.log(`[Webhook] Payment failed: ${paymentReference}`);
  }

  return c.json({ success: true });
});

// Reconcile pending orders (admin only - cron job endpoint)
webhookRoutes.post('/reconcile', requireAdmin, async (c) => {
  // Get pending orders that have expired
  const { data: pendingOrders } = await supabase
    .from('orders')
    .select('id, payment_reference, expires_at')
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString());

  if (!pendingOrders || pendingOrders.length === 0) {
    return c.json({ message: 'No pending orders to reconcile', count: 0 });
  }

  let reconciled = 0;

  for (const order of pendingOrders) {
    // Mark as expired
    await supabase
      .from('orders')
      .update({ status: 'expired' })
      .eq('id', order.id);

    reconciled++;
  }

  console.log(`[Reconcile] ${reconciled} orders reconciled`);

  return c.json({ message: 'Reconciliation complete', count: reconciled });
});
