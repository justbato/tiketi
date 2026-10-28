import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAuth, verifyEventOwnership } from '../middleware/auth.js';
import { supabase } from '../index.js';

// =============================================
// SCHEMAS
// =============================================

const createEventSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  venue: z.string().min(3).max(300),
  party_type: z.enum(['campus', 'off_campus']).default('campus'),
  university: z.string().max(200).optional(),
  state: z.string().max(100).optional(),
  event_date: z.string(),
  timezone: z.string().default('Africa/Lagos'),
  sales_end_date: z.string(),
  capacity: z.number().int().min(1).max(1000000),
  banner_url: z.string().url().optional(),
  logo_url: z.string().url().optional(),
  poster_url: z.string().url().optional(),
  // trim to 40 chars; fall back to 'Other' if omitted or blank
  category: z.string().max(40).optional().transform(v => {
    const trimmed = (v || '').trim();
    return trimmed.length > 0 ? trimmed.slice(0, 40) : 'Other';
  }),
});

const ticketTypeSchema = z.object({
  name: z.string().min(1).max(100),
  gender_pricing: z.boolean().default(false),
  gender: z.string().optional(),
  price: z.number().min(0).max(10000000).optional(),
  male_price: z.number().min(0).max(10000000).optional(),
  female_price: z.number().min(0).max(10000000).optional(),
  quantity: z.number().int().min(1).max(100000),
  admits: z.number().int().min(1).max(20).default(1),
  ticket_image_url: z.string().url().optional(),
  ticket_tier: z.string().max(50).optional(),
});

const updateEventSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  venue: z.string().min(3).max(300).optional(),
  event_date: z.string().optional(),
  sales_end_date: z.string().optional(),
  capacity: z.number().int().min(1).max(1000000).optional(),
  status: z.enum(['draft', 'active', 'ended']).optional(),
  category: z.string().max(40).optional().transform(v => {
    if (v === undefined) return undefined;
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed.slice(0, 40) : 'Other';
  }),
});

// =============================================
// ROUTES
// =============================================

export const eventRoutes = new Hono<AppEnv>();

// Auth for all routes

// Public list for the homepage (no login)
eventRoutes.get('/public', async (c) => {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, venue, event_date, poster_url, banner_url, category')
    .order('event_date', { ascending: true });

  if (error) {
    console.error('events/public error:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }

  return c.json({ events });
});

eventRoutes.use('*', requireAuth);

// Create event
eventRoutes.post('/', async (c) => {
  let body: z.infer<typeof createEventSchema>;
  try {
    body = createEventSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;

  if (user.role !== 'owner' && user.role !== 'planner') {
    return c.json({ error: 'Only event planners can create events' }, 403);
  }

  const { data: event, error } = await supabase
    .from('events')
    .insert({
      planner_id: user.id,
      name: body.name,
      description: body.description,
      venue: body.venue,
      party_type: body.party_type || 'campus',
      university: body.university || null,
      state: body.state || null,
      event_date: body.event_date,
      timezone: body.timezone,
      sales_end_date: body.sales_end_date,
      capacity: body.capacity,
      banner_url: body.banner_url || null,
      logo_url: body.logo_url || null,
      poster_url: body.poster_url || null,
      category: body.category || 'Other',
      status: 'draft'
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to create event' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'event.create',
    entity_type: 'event',
    entity_id: event.id,
    details: `Created event: ${event.name}`
  });

  return c.json(event, 201);
});

// List events for owner/planner
eventRoutes.get('/', async (c) => {
  const user = c.get('user') as JwtPayload;

  let query = supabase.from('events').select('*');

  if (user.role === 'owner' || user.role === 'planner') {
    query = query.or(`planner_id.eq.${user.id},owner_id.eq.${user.id}`);
  }

  const { data: events, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('events list error:', error);
    return c.json({ error: 'Failed to fetch events' }, 500);
  }

  return c.json({ events });
});

// Get single event
eventRoutes.get('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !event) {
    return c.json({ error: 'Event not found' }, 404);
  }

  // Check ownership
  const isOwner = event.planner_id === user.id || (event as any).owner_id === user.id;
  if ((user.role === 'owner' || user.role === 'planner') && !isOwner) {
    return c.json({ error: 'Access denied' }, 403);
  }

  return c.json({ event });
});

// Update event
eventRoutes.put('/:id', async (c) => {
  const { id } = c.req.param();
  let body: z.infer<typeof updateEventSchema>;
  
  try {
    body = updateEventSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;
  const { authorized } = await verifyEventOwnership(supabase, id, user.id, user.role);
  
  if (!authorized) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { data: updated, error } = await supabase
    .from('events')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to update event' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'event.update',
    entity_type: 'event',
    entity_id: id,
    details: `Updated event fields: ${Object.keys(body).join(', ')}`
  });

  return c.json({ event: updated });
});

// Delete event (soft delete)
eventRoutes.delete('/:id', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;
  const { authorized } = await verifyEventOwnership(supabase, id, user.id, user.role);
  
  if (!authorized) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) {
    return c.json({ error: 'Failed to delete event' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'event.delete',
    entity_type: 'event',
    entity_id: id,
    details: 'Event cancelled'
  });

  return c.json({ success: true });
});

// Get event stats
eventRoutes.get('/:id/stats', async (c) => {
  const { id } = c.req.param();
  const user = c.get('user') as JwtPayload;
  const { authorized } = await verifyEventOwnership(supabase, id, user.id, user.role);
  
  if (!authorized) {
    return c.json({ error: 'Access denied' }, 403);
  }

  // Get ticket types
  const { data: ticketTypes } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', id);

  // Get orders
  const { data: orders } = await supabase
    .from('orders')
    .select('total, status')
    .eq('event_id', id)
    .eq('status', 'paid');

  const totalRevenue = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const totalOrders = orders?.length || 0;

  return c.json({
    totalRevenue,
    totalOrders,
    ticketTypes: ticketTypes || []
  });
});

// List ticket types for an event
eventRoutes.get('/:id/ticket-types', async (c) => {
  const { id } = c.req.param();

  const { data: types, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('event_id', id)
    .order('created_at', { ascending: true });

  if (error) return c.json({ error: 'Failed to fetch ticket types' }, 500);
  return c.json({ ticketTypes: types || [] });
});

// Create a ticket type for an event
eventRoutes.post('/:id/ticket-types', async (c) => {
  const { id } = c.req.param();
  let body: z.infer<typeof ticketTypeSchema>;
  
  try {
    body = ticketTypeSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;
  const { authorized } = await verifyEventOwnership(supabase, id, user.id, user.role);
  
  if (!authorized) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { data: ticketType, error } = await supabase
    .from('ticket_types')
    .insert({
      event_id: id,
      name: body.name,
      gender_pricing: body.gender_pricing ?? false,
      price: body.gender_pricing ? null : (body.price ?? 0),
      male_price: body.gender_pricing ? (body.male_price ?? null) : null,
      female_price: body.gender_pricing ? (body.female_price ?? null) : null,
      ticket_image_url: body.ticket_image_url || null,
      quantity: body.quantity,
      admits: body.admits ?? 1,
      ticket_tier: body.ticket_tier || 'general',
      archived: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Ticket type creation error:', error);
    return c.json({ error: 'Failed to create ticket type' }, 500);
  }

  return c.json({ ticketType }, 201);
});

// Update a ticket type
eventRoutes.put('/:id/ticket-types/:ttId', async (c) => {
  const { id, ttId } = c.req.param();
  let body: Partial<z.infer<typeof ticketTypeSchema>>;
  
  try {
    body = ticketTypeSchema.partial().parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;
  const { authorized } = await verifyEventOwnership(supabase, id, user.id, user.role);
  
  if (!authorized) return c.json({ error: 'Access denied' }, 403);

  const updatePayload: Record<string, any> = {};
  if (body.name !== undefined) updatePayload.name = body.name;
  if (body.price !== undefined) updatePayload.price = body.price;
  if (body.male_price !== undefined) updatePayload.male_price = body.male_price;
  if (body.female_price !== undefined) updatePayload.female_price = body.female_price;
  if (body.gender_pricing !== undefined) updatePayload.gender_pricing = body.gender_pricing;
  if (body.quantity !== undefined) updatePayload.quantity = body.quantity;
  if (body.admits !== undefined) updatePayload.admits = body.admits;
  if (body.ticket_image_url !== undefined) updatePayload.ticket_image_url = body.ticket_image_url;
  if (body.ticket_tier !== undefined) updatePayload.ticket_tier = body.ticket_tier;

  const { data: updated, error } = await supabase
    .from('ticket_types')
    .update(updatePayload)
    .eq('id', ttId)
    .eq('event_id', id)
    .select()
    .single();

  if (error || !updated) return c.json({ error: 'Failed to update ticket type' }, 500);
  return c.json({ ticketType: updated });
});

// Delete a ticket type
eventRoutes.delete('/:id/ticket-types/:ttId', async (c) => {
  const { id, ttId } = c.req.param();
  const user = c.get('user') as JwtPayload;
  const { authorized } = await verifyEventOwnership(supabase, id, user.id, user.role);
  
  if (!authorized) return c.json({ error: 'Access denied' }, 403);

  const { error } = await supabase
    .from('ticket_types')
    .update({ archived: true })
    .eq('id', ttId)
    .eq('event_id', id);

  if (error) return c.json({ error: 'Failed to delete ticket type' }, 500);
  return c.json({ success: true });
});
