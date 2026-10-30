import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { AppEnv, JwtPayload } from '../index.js';
import { signToken } from '../utils/jwt.js';
import { requireAuth, loginRateLimit, resetLoginRateLimit } from '../middleware/auth.js';
import { sanitizeString } from '../middleware/validation.js';
import { supabase } from '../index.js';

// =============================================
// SCHEMAS
// =============================================

const plannerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.literal('planner'),
  account_id: z.string().uuid().optional()
});

const modelLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.literal('model')
});

const gateLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.literal('gate')
});

const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.literal('admin')
});

const loginSchema = z.discriminatedUnion('role', [
  plannerLoginSchema,
  modelLoginSchema,
  gateLoginSchema,
  adminLoginSchema,
]);

const plannerRegisterSchema = z.object({
  party_type: z.enum(['campus', 'off_campus']),
  university: z.string().optional(),
  state: z.string().optional(),
  location: z.string().optional(),
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  whatsapp_number: z.string().min(10).max(20),
  password: z.string().min(8).max(128),
  bank_name: z.string().min(2).max(100),
  account_number: z.string().min(10).max(20),
  account_name: z.string().min(2).max(100),
});

const setPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8).max(128),
  role: z.enum(['model', 'gate'])
});

const adminLoginDedicatedSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  totp_code: z.string().optional()
});

// =============================================
// ROUTES
// =============================================

export const authRoutes = new Hono<AppEnv>();

// ── Lookup event accounts by email ──
authRoutes.get('/accounts', async (c) => {
  const email = c.req.query('email');
  if (!email) return c.json({ accounts: [] });

  const sanitizedEmail = sanitizeString(email).toLowerCase();

  const { data: planners, error } = await supabase
    .from('event_planners')
    .select('*, events(id, name, status, event_date)')
    .eq('email', sanitizedEmail);

  if (error || !planners) return c.json({ accounts: [] });

  return c.json({
    accounts: planners.map(p => ({
      id: p.id,
      email: p.email,
      name: p.name,
      status: p.status,
      event_name: p.events?.[0]?.name || p.name,
      event_id: p.events?.[0]?.id,
      created_at: p.created_at,
      whatsapp_number: p.whatsapp_number,
      bank_name: p.bank_name,
      account_number: p.account_number,
      account_name: p.account_name,
    }))
  });
});

// ── Unified Login (with brute-force protection) ──
authRoutes.post('/login', loginRateLimit, async (c) => {
  let body: z.infer<typeof loginSchema>;
  
  try {
    body = loginSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  if (body.role === 'planner') {
    const { data: planners, error } = await supabase
      .from('event_planners')
      .select('*, events(id, name, status, event_date)')
      .eq('email', body.email.toLowerCase());

    if (error || !planners || planners.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check passwords for matching accounts
    const matching = [];
    for (const p of planners) {
      const valid = await bcrypt.compare(body.password, p.password_hash);
      if (valid) matching.push(p);
    }

    if (matching.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // If user specified account_id
    let selectedPlanner = matching[0];
    const reqAccountId = 'account_id' in body ? body.account_id : undefined;

    if (reqAccountId) {
      const found = matching.find(p => p.id === reqAccountId);
      if (!found) return c.json({ error: 'Event account not found' }, 404);
      selectedPlanner = found;
    } else if (matching.length > 1) {
      // Reset rate limit on successful password match
      resetLoginRateLimit(ip);
      return c.json({
        multiple: true,
        accounts: matching.map(p => ({
          id: p.id,
          email: p.email,
          name: p.name,
          status: p.status,
          event_name: p.events?.[0]?.name || p.name,
          event_id: p.events?.[0]?.id,
          created_at: p.created_at,
        }))
      });
    }

    if (selectedPlanner.status === 'deactivated') {
      return c.json({
        error: 'This event account has ended and was closed by the administrator. Access to this dashboard is no longer available.'
      }, 403);
    }
    if (selectedPlanner.status === 'suspended') {
      return c.json({ error: 'Account suspended' }, 403);
    }

    // Reset rate limit on successful login
    resetLoginRateLimit(ip);

    const token = await signToken({ 
      id: selectedPlanner.id, 
      email: selectedPlanner.email, 
      role: 'planner' 
    });
    
    return c.json({
      token,
      user: {
        id: selectedPlanner.id,
        email: selectedPlanner.email,
        name: selectedPlanner.name,
        role: 'planner',
        status: selectedPlanner.status,
        whatsapp: selectedPlanner.whatsapp_number,
        event_id: selectedPlanner.events?.[0]?.id,
        event_name: selectedPlanner.events?.[0]?.name,
      }
    });
  }

  if (body.role === 'model') {
    const { data: model, error } = await supabase
      .from('models')
      .select('*')
      .eq('email', body.email.toLowerCase())
      .single();

    if (error || !model) return c.json({ error: 'Invalid credentials' }, 401);
    if (!model.password_hash) return c.json({ error: 'Please confirm your invite first' }, 401);

    const valid = await bcrypt.compare(body.password, model.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
    if (model.status === 'suspended' || model.status === 'revoked' || model.status === 'terminated')
      return c.json({ error: `Account ${model.status}` }, 403);

    resetLoginRateLimit(ip);

    const token = await signToken({ 
      id: model.id, 
      email: model.email, 
      role: 'model', 
      event_id: model.event_id 
    });
    
    return c.json({ 
      token, 
      user: { 
        id: model.id, 
        email: model.email, 
        name: model.name, 
        role: 'model', 
        event_id: model.event_id, 
        referral_code: model.referral_code 
      } 
    });
  }

  if (body.role === 'gate') {
    const { data: staff, error } = await supabase
      .from('gate_staff')
      .select('*')
      .eq('email', body.email.toLowerCase())
      .single();

    if (error || !staff) return c.json({ error: 'Invalid credentials' }, 401);
    if (!staff.password_hash) return c.json({ error: 'Please confirm your invite first' }, 401);

    const valid = await bcrypt.compare(body.password, staff.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
    if (staff.status !== 'active') return c.json({ error: `Account ${staff.status}` }, 403);

    resetLoginRateLimit(ip);

    const token = await signToken({ 
      id: staff.id, 
      email: staff.email, 
      role: 'gate', 
      event_id: staff.event_id 
    });
    
    return c.json({ 
      token, 
      user: { 
        id: staff.id, 
        email: staff.email, 
        name: staff.name, 
        role: 'gate', 
        event_id: staff.event_id 
      } 
    });
  }

  if (body.role === 'admin') {
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', body.email.toLowerCase())
      .single();

    if (error || !admin) return c.json({ error: 'Invalid credentials' }, 401);

    const valid = await bcrypt.compare(body.password, admin.password_hash);
    if (!valid) return c.json({ error: 'Invalid credentials' }, 401);
    if (admin.status === 'suspended') return c.json({ error: 'Account suspended' }, 403);

    resetLoginRateLimit(ip);

    const token = await signToken({ 
      id: admin.id, 
      email: admin.email, 
      role: 'admin' 
    });
    
    return c.json({ 
      token, 
      user: { 
        id: admin.id, 
        email: admin.email, 
        name: admin.name, 
        role: 'admin' 
      } 
    });
  }

  return c.json({ error: 'Invalid role' }, 400);
});

// ── Dedicated Admin Portal Login ──
authRoutes.post('/admin/login', loginRateLimit, async (c) => {
  let body: z.infer<typeof adminLoginDedicatedSchema>;
  
  try {
    body = adminLoginDedicatedSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';

  const { data: admin, error } = await supabase
    .from('admins')
    .select('*')
    .eq('email', body.email.trim().toLowerCase())
    .single();

  if (error || !admin) {
    try {
      await supabase.from('audit_logs').insert({
        actor_type: 'system',
        actor_id: '00000000-0000-0000-0000-000000000000',
        action: 'admin_login_failed',
        entity_type: 'admin',
        entity_id: '00000000-0000-0000-0000-000000000000',
        details: `Failed admin login attempt for ${body.email}`,
        ip_address: ip
      });
    } catch {}
    return c.json({ error: 'Invalid administrative credentials' }, 401);
  }

  const valid = await bcrypt.compare(body.password, admin.password_hash);
  if (!valid) {
    try {
      await supabase.from('audit_logs').insert({
        actor_type: 'system',
        actor_id: admin.id,
        action: 'admin_password_invalid',
        entity_type: 'admin',
        entity_id: admin.id,
        details: `Invalid password attempt for admin ${admin.email}`,
        ip_address: ip
      });
    } catch {}
    return c.json({ error: 'Invalid administrative credentials' }, 401);
  }

  if (admin.status === 'suspended') {
    return c.json({ error: 'Administrative access suspended' }, 403);
  }

  try {
    await supabase.from('audit_logs').insert({
      actor_type: 'admin',
      actor_id: admin.id,
      action: 'admin_login_success',
      entity_type: 'admin',
      entity_id: admin.id,
      details: `Admin ${admin.name} authenticated into terminal`,
      ip_address: ip
    });
  } catch {}

  resetLoginRateLimit(ip);

  const token = await signToken({ 
    id: admin.id, 
    email: admin.email, 
    role: 'admin' 
  });
  
  return c.json({ 
    token, 
    user: { 
      id: admin.id, 
      email: admin.email, 
      name: admin.name, 
      role: 'admin' 
    } 
  });
});

// ── Event Planner Registration ──
authRoutes.post('/register/planner', async (c) => {
  let body: z.infer<typeof plannerRegisterSchema>;
  
  try {
    body = plannerRegisterSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  // Validate location fields
  if (body.party_type === 'campus' && !body.university) {
    return c.json({ error: 'University is required for campus parties' }, 400);
  }
  if (body.party_type === 'off_campus' && (!body.state || !body.location)) {
    return c.json({ error: 'State and location are required for off-campus parties' }, 400);
  }

  const passwordHash = await bcrypt.hash(body.password, 12); // Increased cost factor

  const { data: planner, error } = await supabase
    .from('event_planners')
    .insert({
      email: body.email.toLowerCase(),
      password_hash: passwordHash,
      name: sanitizeString(body.name),
      whatsapp_number: body.whatsapp_number,
      party_type: body.party_type,
      university: body.university || null,
      state: body.state || null,
      location: body.location || null,
      bank_name: sanitizeString(body.bank_name),
      account_number: body.account_number,
      account_name: sanitizeString(body.account_name),
      status: 'active'
    })
    .select()
    .single();

  if (error || !planner) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }

  const token = await signToken({ 
    id: planner.id, 
    email: planner.email, 
    role: 'planner' 
  });

  return c.json({
    token,
    user: { 
      id: planner.id, 
      email: planner.email, 
      name: planner.name, 
      role: 'planner' 
    }
  }, 201);
});

// ── Confirm Invite & Set Password ──
authRoutes.post('/confirm-invite', async (c) => {
  let body: z.infer<typeof setPasswordSchema>;
  
  try {
    body = setPasswordSchema.parse(await c.req.json());
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const table = body.role === 'model' ? 'models' : 'gate_staff';

  const { data: record, error } = await supabase
    .from(table)
    .select('*')
    .eq('invite_token', body.token)
    .single();

  if (error || !record) {
    return c.json({ error: 'Invalid or expired invite link' }, 400);
  }

  if (record.invite_confirmed_at) {
    return c.json({ error: 'Invite already confirmed' }, 400);
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  await supabase
    .from(table)
    .update({
      password_hash: passwordHash,
      invite_token: null,
      invite_confirmed_at: new Date().toISOString(),
      status: 'active'
    })
    .eq('id', record.id);

  const jwtRole = body.role === 'model' ? 'model' : 'gate';
  const token = await signToken({ 
    id: record.id, 
    email: record.email, 
    role: jwtRole, 
    event_id: record.event_id 
  });

  return c.json({
    token,
    user: { 
      id: record.id, 
      email: record.email, 
      name: record.name, 
      role: jwtRole, 
      event_id: record.event_id 
    }
  });
});

// ── Verify Token ──
authRoutes.get('/verify', requireAuth, async (c) => {
  const user = c.get('user') as JwtPayload;
  return c.json({ valid: true, user });
});

// ── Get Invite Info ──
authRoutes.get('/invite/:token', async (c) => {
  const { token } = c.req.param();

  // Check models table first
  const { data: model } = await supabase
    .from('models')
    .select('id, name, email, invite_confirmed_at, event_id')
    .eq('invite_token', token)
    .single();

  if (model) {
    if (model.invite_confirmed_at) {
      return c.json({ error: 'Invite already confirmed' }, 400);
    }
    return c.json({ role: 'model', name: model.name, email: model.email });
  }

  // Check gate_staff table
  const { data: staff } = await supabase
    .from('gate_staff')
    .select('id, name, email, invite_confirmed_at, event_id')
    .eq('invite_token', token)
    .single();

  if (staff) {
    if (staff.invite_confirmed_at) {
      return c.json({ error: 'Invite already confirmed' }, 400);
    }
    return c.json({ role: 'gate', name: staff.name, email: staff.email });
  }

  return c.json({ error: 'Invalid invite link' }, 404);
});
