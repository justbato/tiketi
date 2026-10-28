import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAdmin } from '../middleware/auth.js';
import { supabase } from '../index.js';

// =============================================
// SCHEMAS
// =============================================

const updateSettingsSchema = z.object({
  platform_fee_percent: z.number().min(0).max(100).optional(),
  monnify_fee_rate: z.number().min(0).optional(),
  monnify_fee_cap: z.number().min(0).optional(),
  vat_rate: z.number().min(0).optional(),
  payment_window_minutes: z.number().int().min(1).max(1440).optional(),
  announcement_banner: z.string().max(500).optional()
});

const statusSchema = z.object({
  status: z.enum(['active', 'suspended', 'deactivated'])
});

const takedownSchema = z.object({
  reason: z.string().min(10).max(1000)
});

// =============================================
// ROUTES
// =============================================

export const adminRoutes = new Hono<AppEnv>();

// Admin auth for all routes
adminRoutes.use('*', requireAdmin);

// Platform overview
adminRoutes.get('/overview', async (c) => {
  // Total revenue
  const { data: orders } = await supabase
    .from('orders')
    .select('total, fees')
    .eq('status', 'paid');

  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const totalFees = orders?.reduce((sum, o) => sum + o.fees, 0) || 0;
  const totalOrders = orders?.length || 0;

  // Active events
  const { count: activeEvents } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  // Event planners
  let { count: planners } = await supabase
    .from('event_planners')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');

  if (planners === null || planners === undefined) {
    const { count: legacyOwners } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('status', 'active');
    planners = legacyOwners || 0;
  }

  return c.json({
    total_revenue: totalRevenue,
    total_fees: totalFees,
    total_orders: totalOrders,
    active_events: activeEvents || 0,
    event_owners: planners || 0
  });
});

// List all event planners
adminRoutes.get('/owners', async (c) => {
  const { data: planners, error } = await supabase
    .from('event_planners')
    .select('id, name, email, whatsapp_number, party_type, university, state, location, bank_name, account_number, account_name, status, created_at')
    .order('created_at', { ascending: false });

  if (error || !planners) {
    // Fallback to legacy users table
    const { data: legacyOwners } = await supabase
      .from('users')
      .select('id, name, email, status, created_at')
      .eq('role', 'owner')
      .order('created_at', { ascending: false });

    const ownersWithCounts = await Promise.all(
      (legacyOwners || []).map(async (owner) => {
        const { count } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .or(`planner_id.eq.${owner.id},owner_id.eq.${owner.id}`);

        return { ...owner, event_count: count || 0 };
      })
    );
    return c.json({ owners: ownersWithCounts });
  }

  // Get event count for each planner
  const plannersWithCounts = await Promise.all(
    (planners || []).map(async (planner) => {
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .or(`planner_id.eq.${planner.id},owner_id.eq.${planner.id}`);

      return { ...planner, event_count: count || 0 };
    })
  );

  return c.json({ owners: plannersWithCounts });
});

// Suspend/activate/deactivate planner
adminRoutes.put('/owners/:id/status', async (c) => {
  const { id } = c.req.param();
  let body: z.infer<typeof statusSchema>;
  
  try {
    body = statusSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;

  const { error } = await supabase
    .from('event_planners')
    .update({ status: body.status })
    .eq('id', id);

  if (error) {
    // Try fallback to users
    await supabase
      .from('users')
      .update({ status: body.status })
      .eq('id', id);
  }

  if (body.status === 'deactivated') {
    // Mark event as ended
    await supabase
      .from('events')
      .update({ status: 'ended' })
      .or(`planner_id.eq.${id},owner_id.eq.${id}`);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: `planner.${body.status}`,
    entity_type: 'event_planner',
    entity_id: id,
    details: body.status === 'deactivated'
      ? 'Event ended. Event planner account deactivated and closed.'
      : `Event Planner ${body.status === 'suspended' ? 'suspended' : 'reactivated'}`
  });

  return c.json({ success: true });
});

// Deactivate planner account and close event
adminRoutes.put('/owners/:id/deactivate', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;

  await supabase
    .from('event_planners')
    .update({ status: 'deactivated' })
    .eq('id', id);

  await supabase
    .from('events')
    .update({ status: 'ended' })
    .or(`planner_id.eq.${id},owner_id.eq.${id}`);

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'planner.deactivated',
    entity_type: 'event_planner',
    entity_id: id,
    details: 'Event concluded. Planner account deactivated and event closed from live sales.'
  });

  return c.json({ success: true, message: 'Planner account deactivated and event closed' });
});

// List all events
adminRoutes.get('/events', async (c) => {
  const { data: events, error } = await supabase
    .from('events')
    .select(`
      *,
      owner:users!owner_id(name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'Failed to fetch events' }, 500);
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

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
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
  const { data: settings, error } = await supabase
    .from('platform_settings')
    .select('*')
    .single();

  if (error) {
    return c.json({ error: 'Failed to fetch settings' }, 500);
  }

  return c.json({ settings });
});

// Update platform settings
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
    .single();

  const { error } = await supabase
    .from('platform_settings')
    .update(body)
    .eq('id', currentSettings?.id || '00000000-0000-0000-0000-000000000000');

  if (error) {
    return c.json({ error: 'Failed to update settings' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'settings.update',
    entity_type: 'platform_settings',
    entity_id: 'settings',
    details: `Updated settings: ${Object.keys(body).join(', ')}`
  });

  return c.json({ success: true });
});

// Audit logs
adminRoutes.get('/audit', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const offset = parseInt(c.req.query('offset') || '0');

  // Validate pagination params
  if (isNaN(limit) || limit < 1 || limit > 500) {
    return c.json({ error: 'Invalid limit parameter' }, 400);
  }
  if (isNaN(offset) || offset < 0) {
    return c.json({ error: 'Invalid offset parameter' }, 400);
  }

  const { data: logs, error } = await supabase
    .from('audit_logs')
    .select(`
      *,
      user:users(name, email)
    `)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return c.json({ error: 'Failed to fetch audit logs' }, 500);
  }

  return c.json({ logs });
});

// Payouts
adminRoutes.get('/payouts', async (c) => {
  const { data: payouts, error } = await supabase
    .from('payouts')
    .select(`
      *,
      owner:users!owner_id(name, email),
      order:orders(reference)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'Failed to fetch payouts' }, 500);
  }

  return c.json({ payouts });
});
