import { Hono } from 'hono';
import { z } from 'zod';
import crypto from 'crypto';
import type { AppEnv, JwtPayload } from '../index.js';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../index.js';
import { generateReferralCode } from '../utils/codes.js';

// =============================================
// SCHEMAS
// =============================================

const inviteModelSchema = z.object({
  event_id: z.string().uuid(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(254)
});

const updateModelSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(['active', 'invited', 'suspended', 'revoked', 'terminated', 'removed']).optional()
});

// =============================================
// ROUTES
// =============================================

export const modelRoutes = new Hono<AppEnv>();

// Auth hook - allow public referral lookup
modelRoutes.use('*', async (c, next) => {
  if (c.req.path.includes('/ref/')) {
    return next();
  }
  
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  
  // Let requireAuth handle it
  await next();
});

// Invite model
modelRoutes.post('/invite', requireAuth, async (c) => {
  let body: z.infer<typeof inviteModelSchema>;
  
  try {
    body = inviteModelSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;

  if (user.role !== 'owner' && user.role !== 'planner') {
    return c.json({ error: 'Only event planners can invite models' }, 403);
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

  // Check if model already exists for this event
  const { data: existing } = await supabase
    .from('models')
    .select('id')
    .eq('event_id', body.event_id)
    .eq('email', body.email.toLowerCase())
    .single();

  if (existing) {
    return c.json({ error: 'Model already invited' }, 409);
  }

  const referralCode = generateReferralCode();
  const inviteToken = crypto.randomUUID();

  const { data: model, error } = await supabase
    .from('models')
    .insert({
      event_id: body.event_id,
      name: body.name,
      email: body.email.toLowerCase(),
      referral_code: referralCode,
      invite_token: inviteToken,
      status: 'invited'
    })
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to invite model' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    actor_id: user.id,
    actor_role: user.role,
    action: 'model.invite',
    entity_type: 'model',
    entity_id: model.id,
    details: `Invited model: ${body.name} (${body.email})`
  });

  const frontendUrl = process.env.FRONTEND_URL || 'https://tiketi.ng';
  const inviteUrl = `${frontendUrl}/invite?token=${inviteToken}`;

  return c.json({
    model,
    invite_token: inviteToken,
    invite_url: inviteUrl
  }, 201);
});

// List models for event
modelRoutes.get('/', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const event_id = c.req.query('event_id');

  if (user.role !== 'owner' && user.role !== 'planner' && user.role !== 'admin') {
    return c.json({ error: 'Access denied' }, 403);
  }

  if (event_id) {
    const { data: models, error } = await supabase
      .from('models')
      .select('*')
      .eq('event_id', event_id)
      .order('created_at', { ascending: false });

    if (error) {
      return c.json({ error: 'Failed to fetch models' }, 500);
    }

    return c.json({ models: models || [] });
  }

  // Return all models across user's events
  const { data: events } = await supabase
    .from('events')
    .select('id')
    .or(`planner_id.eq.${user.id},owner_id.eq.${user.id}`);

  const eventIds = events?.map(e => e.id) || [];
  if (eventIds.length === 0) return c.json({ models: [] });

  const { data: models, error } = await supabase
    .from('models')
    .select('*')
    .in('event_id', eventIds)
    .order('created_at', { ascending: false });

  if (error) {
    return c.json({ error: 'Failed to fetch models' }, 500);
  }

  return c.json({ models: models || [] });
});

// Get model by referral code (public)
modelRoutes.get('/ref/:code', async (c) => {
  const { code } = c.req.param();

  const { data: model, error } = await supabase
    .from('models')
    .select('id, name, event_id, status')
    .eq('referral_code', code)
    .single();

  if (error || !model) {
    return c.json({ error: 'Invalid referral code' }, 404);
  }

  if (model.status !== 'active') {
    return c.json({
      error: `This referral link is ${model.status}. Purchases cannot be made through this referral code.`,
      status: model.status,
      name: model.name
    }, 403);
  }

  return c.json({ model });
});

// Update model
modelRoutes.put('/:id', requireAuth, async (c) => {
  let body: z.infer<typeof updateModelSchema>;
  
  try {
    body = updateModelSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const user = c.get('user') as JwtPayload;
  const { id } = c.req.param();

  if (user.role !== 'owner') {
    return c.json({ error: 'Access denied' }, 403);
  }

  // Verify ownership
  const { data: model } = await supabase
    .from('models')
    .select('event:events(owner_id)')
    .eq('id', id)
    .single();

  if (!model || (model as any).events.owner_id !== user.id) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { data: updated, error } = await supabase
    .from('models')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return c.json({ error: 'Failed to update model' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'model.update',
    entity_type: 'model',
    entity_id: id,
    details: `Updated model fields: ${Object.keys(body).join(', ')}`
  });

  return c.json({ model: updated });
});

// Remove model (soft delete)
modelRoutes.delete('/:id', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  const { id } = c.req.param();

  if (user.role !== 'owner') {
    return c.json({ error: 'Access denied' }, 403);
  }

  // Verify ownership
  const { data: model } = await supabase
    .from('models')
    .select('event:events(owner_id)')
    .eq('id', id)
    .single();

  if (!model || (model as any).events.owner_id !== user.id) {
    return c.json({ error: 'Access denied' }, 403);
  }

  const { error } = await supabase
    .from('models')
    .update({ status: 'removed' })
    .eq('id', id);

  if (error) {
    return c.json({ error: 'Failed to remove model' }, 500);
  }

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'model.remove',
    entity_type: 'model',
    entity_id: id,
    details: 'Model removed'
  });

  return c.json({ success: true });
});

// Model dashboard (for model token)
modelRoutes.get('/:id/dashboard', async (c) => {
  const { id } = c.req.param();

  // Verify model token
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Model ')) {
    return c.json({ error: 'Invalid model token' }, 401);
  }

  const token = authHeader.substring(6);
  const { data: modelToken } = await supabase
    .from('model_tokens')
    .select('model_id')
    .eq('token', token)
    .eq('revoked', false)
    .single();

  if (!modelToken || modelToken.model_id !== id) {
    return c.json({ error: 'Invalid model token' }, 401);
  }

  // Get model details
  const { data: model } = await supabase
    .from('models')
    .select(`
      *,
      event:events(name, venue, event_date)
    `)
    .eq('id', id)
    .single();

  if (!model) {
    return c.json({ error: 'Model not found' }, 404);
  }

  // Get sales stats
  const { data: orders } = await supabase
    .from('orders')
    .select('total, status, created_at')
    .eq('model_id', id)
    .eq('status', 'paid');

  const totalSales = orders?.reduce((sum, o) => sum + o.total, 0) || 0;
  const totalOrders = orders?.length || 0;

  // Get leaderboard position
  const { data: allModels } = await supabase
    .from('models')
    .select('id, name, referral_code')
    .eq('event_id', (model as any).event_id)
    .eq('status', 'active');

  // Calculate sales for each model
  const modelSales = await Promise.all(
    (allModels || []).map(async (m) => {
      const { data: mOrders } = await supabase
        .from('orders')
        .select('total')
        .eq('model_id', m.id)
        .eq('status', 'paid');

      return {
        id: m.id,
        name: m.id === id ? m.name : 'Model', // Mask other names
        referral_code: m.id === id ? m.referral_code : null,
        total_sales: mOrders?.reduce((sum, o) => sum + o.total, 0) || 0
      };
    })
  );

  // Sort and find rank
  modelSales.sort((a, b) => b.total_sales - a.total_sales);
  const rank = modelSales.findIndex(m => m.id === id) + 1;

  return c.json({
    model: {
      id: model.id,
      name: model.name,
      referral_code: model.referral_code,
      event: (model as any).event
    },
    stats: {
      total_sales: totalSales,
      total_orders: totalOrders,
      rank,
      total_models: modelSales.length
    },
    leaderboard: modelSales.slice(0, 10)
  });
});
