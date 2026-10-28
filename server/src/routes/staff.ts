import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'crypto';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../index.js';

// =============================================
// SCHEMAS
// =============================================

const addStaffSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(254)
});

const updateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'invited', 'suspended', 'revoked', 'terminated']).optional()
});

// =============================================
// ROUTES
// =============================================

export const staffRoutes = new Hono<AppEnv>();

// Auth for all routes
staffRoutes.use('*', requireAuth);

// Add / Invite gate staff
staffRoutes.post('/', async (c) => {
  let body: z.infer<typeof addStaffSchema>;
  
  try {
    body = addStaffSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;

  if (user.role !== 'owner' && user.role !== 'planner') {
    return c.json({ error: 'Only event planners can add gate staff' }, 403);
  }

  // Verify event ownership
  const { data: event } = await supabase
    .from('events')
    .select('id, planner_id')
    .eq('id', body.event_id)
    .single();

  if (!event || (event.planner_id && event.planner_id !== user.id && (event as any).owner_id !== user.id)) {
    return c.json({ error: 'Access denied' }, 403);
  }

  // Check if staff already exists for this event
  const { data: existing } = await supabase
    .from('gate_staff')
    .select('id')
    .eq('event_id', body.event_id)
    .eq('email', body.email.toLowerCase())
    .single();

  if (existing) {
    return c.json({ error: 'Staff member already invited to this event' }, 409);
  }

  const inviteToken = crypto.randomUUID();

  const { data: staffUser, error } = await supabase
    .from('gate_staff')
    .insert({
      event_id: body.event_id,
      name: body.name,
      email: body.email.toLowerCase(),
      invite_token: inviteToken,
      status: 'invited',
      tickets_verified: 0
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to add gate staff' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'staff.invite',
    entity_type: 'gate_staff',
    entity_id: staffUser.id,
    details: `Invited gate staff: ${body.name} (${body.email}) for event ${body.event_id}`
  });

  const frontendUrl = process.env.FRONTEND_URL || 'https://tiketi.ng';
  const inviteUrl = `${frontendUrl}/invite?token=${inviteToken}`;

  return c.json({
    staff: staffUser,
    invite_token: inviteToken,
    invite_url: inviteUrl
  }, 201);
});

// List staff for planner
staffRoutes.get('/', async (c) => {
  const user = c.get('user') as JwtPayload;
  const event_id = c.req.query('event_id');

  if (user.role !== 'owner' && user.role !== 'planner' && user.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403);
  }

  if (event_id) {
    const { data: staff, error } = await supabase
      .from('gate_staff')
      .select('*')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false });

    if (error) return c.json({ error: 'Failed to fetch staff' }, 500);
    return c.json({ staff: staff || [] });
  }

  // Get all events owned by planner
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .or(`planner_id.eq.${user.id},owner_id.eq.${user.id}`);

  const eventIds = events?.map(e => e.id) || [];
  if (eventIds.length === 0) {
    return c.json({ staff: [] });
  }

  const { data: staff, error } = await supabase
    .from('gate_staff')
    .select('*')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'Failed to fetch staff' }, 500);
  }

  return c.json({ staff: staff || [] });
});

// Update staff status or name
staffRoutes.put('/:id', async (c) => {
  let body: z.infer<typeof updateStaffSchema>;
  
  try {
    body = updateStaffSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;
  const { id } = c.req.param();

  if (user.role !== 'owner' && user.role !== 'planner') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { data: staff } = await supabase
    .from('gate_staff')
    .select('id, event:events(planner_id)')
    .eq('id', id)
    .single();

  if (!staff) {
    return c.json({ error: 'Staff member not found' }, 404);
  }

  const { data: updated, error } = await supabase
    .from('gate_staff')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to update staff' }, 500);
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'staff.update',
    entity_type: 'gate_staff',
    entity_id: id,
    details: `Updated staff ${id}: ${Object.entries(body).map(([k, v]) => `${k}=${v}`).join(', ')}`
  });

  return c.json({ staff: updated });
});

// Revoke staff access
staffRoutes.put('/:id/revoke', async (c) => {
  const user = c.get('user') as JwtPayload;
  const { id } = c.req.param();

  if (user.role !== 'owner' && user.role !== 'planner') {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { error } = await supabase
    .from('gate_staff')
    .update({ status: 'revoked' })
    .eq('id', id);

  if (error) {
    return c.json({ error: 'Failed to revoke staff' }, 500);
  }

  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'staff.revoke',
    entity_type: 'gate_staff',
    entity_id: id,
    details: 'Gate staff access revoked'
  });

  return c.json({ success: true });
});
