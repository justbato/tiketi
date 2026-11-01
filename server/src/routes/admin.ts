import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAdmin } from '../middleware/auth.js';
import { supabase } from '../index.js';
import { createSubaccount, findSubaccount, updateSubaccount } from '../services/paystack.js';

// =============================================
// SCHEMAS
// =============================================

const updateSettingsSchema = z.object({
  fee_percent: z.number().min(0).max(100).optional(),
  fee_bearer: z.enum(['organizer', 'platform']).optional(),
  platform_fee_percent: z.number().min(0).max(100).optional(), // alias
});

const statusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deactivated'])
});

const takedownSchema = z.object({
  reason: z.string().min(5).max(1000)
});

const rejectEventSchema = z.object({
  reason: z.string().max(1000).optional(),
  note: z.string().max(1000).optional(),
});

const bankDetailsSchema = z.object({
  bank_name: z.string().min(2).max(100),
  bank_code: z.string().min(1).max(20),
  account_number: z.string().min(10).max(20),
  account_name: z.string().min(2).max(100),
});

// Helper to select from event_organizers with fallback to event_planners
async function getOrganizersTable() {
  const { data, error } = await supabase.from('event_organizers').select('id').limit(1);
  return error ? 'event_planners' : 'event_organizers';
}

// =============================================
// ROUTES
// =============================================

export const adminRoutes = new Hono<AppEnv>();

// Admin auth for all routes
adminRoutes.use('*', requireAdmin);

// Platform overview
adminRoutes.get('/overview', async (c) => {
  const { data: orders } = await supabase
    .from('orders')
    .select('total, gross, fees, platform_fee')
    .eq('status', 'paid');

  const totalRevenue = orders?.reduce((sum, o) => sum + (o.gross || o.total || 0), 0) || 0;
  const totalFees = orders?.reduce((sum, o) => sum + (o.platform_fee || o.fees || 0), 0) || 0;
  const totalOrders = orders?.length || 0;

  const { count: activeEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  const { count: pendingEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending');

  const organizersTable = await getOrganizersTable();
  const { count: organizers } = await supabase
    .from(organizersTable)
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  return c.json({
    total_revenue: totalRevenue,
    total_fees: totalFees,
    total_orders: totalOrders,
    active_events: activeEvents || 0,
    pending_events: pendingEvents || 0,
    event_owners: organizers || 0,
    event_organizers: organizers || 0
  });
});

// ── Pending Events Approval List ──
adminRoutes.get('/events/pending', async (c) => {
  const organizersTable = await getOrganizersTable();

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:${organizersTable}!organizer_id(
        id, name, email, bank_name, bank_code, account_number, account_name, created_at, status
      )
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    // If join by organizer_id fails, fallback to planner_id
    const { data: fallbackEvents } = await supabase
      .from('events')
      .select(`
        *,
        organizer:${organizersTable}!planner_id(
          id, name, email, bank_name, bank_code, account_number, account_name, created_at, status
        )
      `)
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    return c.json({ events: fallbackEvents || [] });
  }

  return c.json({ events: events || [] });
});

// ── Approve Event (Creates or links Paystack subaccount & activates event) ──
adminRoutes.put('/events/:id/approve', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;

  const organizersTable = await getOrganizersTable();

  // Fetch event
  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (eventErr || !event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  // Fetch organizer
  const organizerId = event.organizer_id || event.planner_id;
  let organizer: any = null;
  if (organizerId) {
    const { data: orgData } = await supabase
      .from(organizersTable)
      .select('*')
      .eq('id', organizerId)
      .single();
    organizer = orgData;
  }

  // Get fee percent from settings or event override
  let feePercent = 5.0;
  if (event.fee_percent_override != null) {
    feePercent = Number(event.fee_percent_override);
  } else {
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('fee_percent')
      .single();
    if (settings?.fee_percent != null) feePercent = Number(settings.fee_percent);
  }

  let subaccountCode = event.paystack_subaccount_code;

  // If no subaccount code yet on event, create or find one via Paystack
  if (!subaccountCode && organizer?.account_number && organizer?.bank_code) {
    try {
      // 1. Check if subaccount already exists on Paystack for this account
      const existing = await findSubaccount(organizer.account_number, organizer.bank_code);
      if (existing) {
        subaccountCode = existing.subaccount_code;
        console.log(`[Admin] Reusing existing Paystack subaccount: ${subaccountCode}`);
      } else {
        // 2. Create fresh subaccount
        const created = await createSubaccount({
          business_name: event.name || organizer.name || 'TiKiTi Organizer',
          settlement_bank: organizer.bank_code,
          account_number: organizer.account_number,
          percentage_charge: feePercent,
          description: `Event: ${event.name} (${id})`,
        });
        subaccountCode = created.subaccount_code;
        console.log(`[Admin] Created new Paystack subaccount: ${subaccountCode}`);
      }
    } catch (err: any) {
      console.error('Failed to create/link Paystack subaccount during approval:', err.message);
      // Still proceed with approval if Paystack credentials are in sandbox/test mode
    }
  }

  // Update event to approved and active
  const { data: updatedEvent, error: updateErr } = await supabase
    .from('events')
    .update({
      approval_status: 'approved',
      status: 'active',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
      paystack_subaccount_code: subaccountCode || null,
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) {
    return c.json({ error: 'Failed to approve event' }, 500);
  }

  // Also update organizer's subaccount code if empty
  if (organizerId && subaccountCode) {
    await supabase
      .from(organizersTable)
      .update({ paystack_subaccount_code: subaccountCode })
      .eq('id', organizerId);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'event.approve',
    entity_type: 'event',
    entity_id: id,
    details: `Approved event "${event.name}" with subaccount ${subaccountCode || 'none'}`
  });

  return c.json({ 
    success: true, 
    message: 'Event approved successfully', 
    event: updatedEvent 
  });
});

// ── Reject Event ──
adminRoutes.put('/events/:id/reject', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;

  let body: z.infer<typeof rejectEventSchema> = {};
  try {
    body = rejectEventSchema.parse(await c.req.json());
  } catch {}

  const note = body.reason || body.note || 'Event details rejected by administrator.';

  const { error } = await supabase
    .from('events')
    .update({
      approval_status: 'rejected',
      approval_note: note,
      status: 'draft'
    })
    .eq('id', id);

  if (error) {
    return c.json({ error: 'Failed to reject event' }, 500);
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'event.reject',
    entity_type: 'event',
    entity_id: id,
    details: `Rejected event. Reason: ${note}`
  });

  return c.json({ success: true, message: 'Event rejected' });
});

// ── Admin-Only Bank Detail Change (Updates Paystack Subaccount & Logs Change) ──
adminRoutes.put('/events/:id/bank-details', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;

  let body: z.infer<typeof bankDetailsSchema>;
  try {
    body = bankDetailsSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid bank details format' }, 400);
  }

  const organizersTable = await getOrganizersTable();

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('*, organizer:event_organizers(id, bank_name, account_number, account_name, bank_code)')
    .eq('id', id)
    .single();

  if (eventErr || !event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  const organizerId = event.organizer_id || event.planner_id;
  if (!organizerId) {
    return c.json({ error: 'No organizer associated with this event' }, 400);
  }

  const oldBankName = event.organizer?.bank_name || '';
  const oldAccountNumber = event.organizer?.account_number || '';
  const oldAccountName = event.organizer?.account_name || '';

  // 1. Update Paystack subaccount if event already has one
  if (event.paystack_subaccount_code) {
    try {
      await updateSubaccount(event.paystack_subaccount_code, {
        settlement_bank: body.bank_code,
        account_number: body.account_number,
      });
      console.log(`[Admin] Paystack subaccount ${event.paystack_subaccount_code} settlement bank updated`);
    } catch (err: any) {
      console.error('Failed to update Paystack subaccount settlement details:', err.message);
    }
  }

  // 2. Update organizer table
  await supabase
    .from(organizersTable)
    .update({
      bank_name: body.bank_name,
      bank_code: body.bank_code,
      account_number: body.account_number,
      account_name: body.account_name,
    })
    .eq('id', organizerId);

  // 3. Log into bank_change_log
  try {
    await supabase.from('bank_change_log').insert({
      event_id: id,
      old_bank_name: oldBankName,
      old_account_number: oldAccountNumber,
      old_account_name: oldAccountName,
      new_bank_name: body.bank_name,
      new_account_number: body.account_number,
      new_account_name: body.account_name,
      changed_by: user.id
    });
  } catch {}

  // 4. Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'event.bank_update',
    entity_type: 'event',
    entity_id: id,
    details: `Updated bank details to ${body.bank_name} / ${body.account_number}`
  });

  return c.json({ success: true, message: 'Bank details updated successfully' });
});

// List all event organizers
adminRoutes.get('/owners', async (c) => {
  const organizersTable = await getOrganizersTable();

  const { data: organizers, error } = await supabase
    .from(organizersTable)
    .select('id, name, email, bank_name, bank_code, account_number, account_name, bank_locked, first_paid_at, status, created_at')
    .order('created_at', { ascending: false });

  if (error || !organizers) {
    return c.json({ owners: [] });
  }

  const organizersWithCounts = await Promise.all(
    organizers.map(async (org) => {
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .or(`organizer_id.eq.${org.id},planner_id.eq.${org.id}`);

      return { ...org, event_count: count || 0 };
    })
  );

  return c.json({ owners: organizersWithCounts });
});

// Suspend/activate/deactivate organizer
adminRoutes.put('/owners/:id/status', async (c) => {
  const { id } = c.req.param();
  let body: z.infer<typeof statusSchema>;
  
  try {
    body = statusSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;
  const organizersTable = await getOrganizersTable();

  await supabase
    .from(organizersTable)
    .update({ status: body.status })
    .eq('id', id);

  if (body.status === 'deactivated') {
    await supabase
      .from('events')
      .update({ status: 'ended' })
      .or(`organizer_id.eq.${id},planner_id.eq.${id}`);
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: `organizer.${body.status}`,
    entity_type: 'event_organizer',
    entity_id: id,
    details: body.status === 'deactivated'
      ? 'Event ended. Organizer account deactivated and closed.'
      : `Organizer ${body.status === 'suspended' ? 'suspended' : 'reactivated'}`
  });

  return c.json({ success: true });
});

// Deactivate organizer account and close event
adminRoutes.put('/owners/:id/deactivate', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;
  const organizersTable = await getOrganizersTable();

  await supabase
    .from(organizersTable)
    .update({ status: 'deactivated' })
    .eq('id', id);

  await supabase
    .from('events')
    .update({ status: 'ended' })
    .or(`organizer_id.eq.${id},planner_id.eq.${id}`);

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'organizer.deactivated',
    entity_type: 'event_organizer',
    entity_id: id,
    details: 'Event concluded. Organizer account deactivated and event closed from live sales.'
  });

  return c.json({ success: true, message: 'Organizer account deactivated and event closed' });
});

// List all events
adminRoutes.get('/events', async (c) => {
  const organizersTable = await getOrganizersTable();

  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      organizer:${organizersTable}!organizer_id(name, email, bank_name, account_number)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    const { data: fallbackEvents } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });
    return c.json({ events: fallbackEvents || [] });
  }

  return c.json({ events });
});

// Take down event
adminRoutes.put('/events/:id/takedown', async (c) => {
  const { id } = c.req.param();
  let body: z.infer<typeof takedownSchema>;
  
  try {
    body = takedownSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;

  const { error } = await supabase
    .from('events')
    .update({ status: 'taken_down' })
    .eq('id', id);

  if (error) {
    return c.json({ error: 'Failed to take down event' }, 500);
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'event.takedown',
    entity_type: 'event',
    entity_id: id,
    details: `Event taken down. Reason: ${body.reason}`
  });

  return c.json({ success: true });
});

// List all orders
adminRoutes.get('/orders', async (c) => {
  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      *,
      event:events(name),
      model:models(name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return c.json({ error: 'Failed to fetch orders' }, 500);
  }

  return c.json({ orders });
});

// Get platform settings
adminRoutes.get('/settings', async (c) => {
  const { data: settings } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(1)
    .single();

  return c.json({ 
    settings: settings || {
      fee_percent: 5.0,
      fee_bearer: 'organizer'
    }
  });
});

// Update platform settings (fee %, bearer, banner)
adminRoutes.put('/settings', async (c) => {
  let body: z.infer<typeof updateSettingsSchema>;
  
  try {
    body = updateSettingsSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;

  const { data: currentSettings } = await supabase
    .from('platform_settings')
    .select('*')
    .limit(1)
    .single();

  const newFeePercent = body.fee_percent ?? body.platform_fee_percent;

  // Log fee changes
  if (newFeePercent !== undefined && currentSettings && newFeePercent !== currentSettings.fee_percent) {
    try {
      await supabase.from('fee_percent_log').insert({
        old_percent: currentSettings.fee_percent,
        new_percent: newFeePercent,
        changed_by: user.id,
        event_id: null
      });
    } catch {}
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: user.id
  };
  if (newFeePercent !== undefined) updatePayload.fee_percent = newFeePercent;
  if (body.fee_bearer !== undefined) updatePayload.fee_bearer = body.fee_bearer;

  if (currentSettings?.id) {
    await supabase
      .from('platform_settings')
      .update(updatePayload)
      .eq('id', currentSettings.id);
  } else {
    await supabase
      .from('platform_settings')
      .insert({
        fee_percent: newFeePercent ?? 5.0,
        fee_bearer: body.fee_bearer ?? 'organizer',
        ...updatePayload
      });
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'settings.update',
    entity_type: 'platform_settings',
    entity_id: 'settings',
    details: `Updated settings: ${Object.keys(body).join(', ')}`
  });

  return c.json({ success: true, message: 'Settings updated' });
});

// Audit logs
adminRoutes.get('/audit', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  if (isNaN(limit) || limit < 1 || limit > 500) {
    return c.json({ error: 'Invalid limit parameter' }, 400);
  }
  if (isNaN(offset) || offset < 0) {
    return c.json({ error: 'Invalid offset parameter' }, 400);
  }

  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return c.json({ error: 'Failed to fetch audit logs' }, 500);
  }

  return c.json({ logs });
});

// Payouts (derived from paid orders — Paystack handles settlement via subaccounts)
adminRoutes.get('/payouts', async (c) => {
  const organizersTable = await getOrganizersTable();

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`
      id, reference, event_id, gross, fees, platform_fee, organizer_share,
      fee_percent_used, paystack_reference, status, created_at,
      event:events(id, name, paystack_subaccount_code)
    `)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return c.json({ error: 'Failed to fetch payouts' }, 500);
  }

  // Shape into payout-like records for the frontend
  const payouts = (orders || []).map(o => ({
    id: o.id,
    order_reference: o.reference,
    paystack_reference: o.paystack_reference,
    event_id: o.event_id,
    event_name: (o.event as any)?.name || '',
    paystack_subaccount_code: (o.event as any)?.paystack_subaccount_code || '',
    gross: o.gross,
    platform_fee: o.platform_fee ?? o.fees,
    organizer_share: o.organizer_share,
    fee_percent_used: o.fee_percent_used,
    status: 'settled_via_subaccount',
    created_at: o.created_at,
  }));

  return c.json({ payouts });
});
