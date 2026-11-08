import { Hono } from 'hono';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { AppEnv, JwtPayload } from '../index.js';
import { signToken } from '../utils/jwt.js';
import { requireAuth, loginRateLimit, resetLoginRateLimit, signupRateLimit, confirmInviteRateLimit } from '../middleware/auth.js';
import { sanitizeString } from '../middleware/validation.js';
import { supabase } from '../index.js';
import { listBanks, resolveAccountName } from '../services/paystack.js';

// =============================================
// SCHEMAS
// =============================================

const organizerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  role: z.enum(['organizer', 'planner']),
  account_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
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
  organizerLoginSchema,
  modelLoginSchema,
  gateLoginSchema,
  adminLoginSchema,
]);

const organizerRegisterSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  bank_name: z.string().min(2).max(100),
  bank_code: z.string().min(1).max(20).optional(),
  account_number: z.string().min(10).max(20),
  account_name: z.string().min(2).max(100),
});

const setPasswordSchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8).max(128),
  role: z.enum(['model', 'gate']),
  email_confirm: z.string().email().optional()
});

const adminLoginDedicatedSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(128),
  totp_code: z.string().optional()
});

// Helper to query event_organizers with fallback to event_planners
async function getOrganizersByEmail(email: string) {
  let { data, error } = await supabase
    .from('event_organizers')
    .select('*, events(id, name, status, event_date)')
    .eq('email', email);

  if (error) {
    const fallback = await supabase
      .from('event_planners')
      .select('*, events(id, name, status, event_date)')
      .eq('email', email);
    data = fallback.data;
    error = fallback.error;
  }

  return { data, error };
}

// =============================================
// ROUTES
// =============================================

export const authRoutes = new Hono<AppEnv>();

// ── Paystack Banks list (public for registration/payout) ──
authRoutes.get('/banks', async (c) => {
  try {
    const banks = await listBanks();
    return c.json({ banks });
  } catch (err: any) {
    console.error('Failed to list banks from Paystack:', err.message);
    // Fallback static list if network/Paystack key issue
    return c.json({
      banks: [
        { id: 1, name: 'Access Bank', code: '044' },
        { id: 2, name: 'Zenith Bank', code: '057' },
        { id: 3, name: 'Guaranty Trust Bank (GTBank)', code: '058' },
        { id: 4, name: 'First Bank of Nigeria', code: '011' },
        { id: 5, name: 'United Bank for Africa (UBA)', code: '033' },
        { id: 6, name: 'Fidelity Bank', code: '070' },
        { id: 7, name: 'Union Bank of Nigeria', code: '032' },
        { id: 8, name: 'Stanbic IBTC Bank', code: '221' },
        { id: 9, name: 'Sterling Bank', code: '232' },
        { id: 10, name: 'Polaris Bank', code: '076' },
        { id: 11, name: 'Kuda Bank', code: '50211' },
        { id: 12, name: 'Opay (Paycom)', code: '999992' },
        { id: 13, name: 'PalmPay', code: '999991' },
        { id: 14, name: 'Moniepoint MFB', code: '50515' },
      ]
    });
  }
});

// ── Paystack Resolve Account Name (public) ──
authRoutes.get('/resolve-account', async (c) => {
  const account_number = c.req.query('account_number');
  const bank_code = c.req.query('bank_code');

  if (!account_number || !bank_code) {
    return c.json({ error: 'account_number and bank_code are required' }, 400);
  }

  try {
    const account_name = await resolveAccountName(account_number.trim(), bank_code.trim());
    return c.json({ account_name });
  } catch (err: any) {
    return c.json({ error: err.message || 'Could not resolve account name' }, 400);
  }
});

// ── Lookup event accounts by email (RETURNS ONLY event_id and event_name) ──
authRoutes.get('/accounts', async (c) => {
  const email = c.req.query('email');
  if (!email) return c.json({ accounts: [] });

  const sanitizedEmail = sanitizeString(email).toLowerCase();
  const { data: organizers, error } = await getOrganizersByEmail(sanitizedEmail);

  if (error || !organizers) return c.json({ accounts: [] });

  // Strictly return only non-sensitive event identifiers
  const accounts: any[] = [];
  for (const p of organizers) {
    if (Array.isArray(p.events) && p.events.length > 0) {
      for (const ev of p.events) {
        accounts.push({
          id: p.id,
          event_id: ev.id,
          event_name: ev.name || p.name || 'Unnamed Event',
          status: p.status,
        });
      }
    } else {
      accounts.push({
        id: p.id,
        event_id: null,
        event_name: p.name || 'Unnamed Event',
        status: p.status,
      });
    }
  }

  return c.json({ accounts });
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

  if (body.role === 'organizer' || body.role === 'planner') {
    const { data: organizers, error } = await getOrganizersByEmail(body.email.toLowerCase());

    if (error || !organizers || organizers.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Check passwords for matching accounts
    const matching = [];
    for (const p of organizers) {
      const valid = await bcrypt.compare(body.password, p.password_hash);
      if (valid) matching.push(p);
    }

    if (matching.length === 0) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // If user specified account_id or event_id
    let selectedOrganizer = matching[0];
    const reqAccountId = 'account_id' in body ? body.account_id : undefined;
    const reqEventId = 'event_id' in body ? body.event_id : undefined;

    if (reqAccountId) {
      const found = matching.find(p => p.id === reqAccountId);
      if (!found) return c.json({ error: 'Event account not found' }, 404);
      selectedOrganizer = found;
    } else if (reqEventId) {
      const found = matching.find(p => p.events?.some((e: any) => e.id === reqEventId));
      if (!found) return c.json({ error: 'Event not found for this account' }, 404);
      selectedOrganizer = found;
    } else if (matching.length > 1) {
      resetLoginRateLimit(ip);
      const accounts: any[] = [];
      for (const p of matching) {
        if (Array.isArray(p.events) && p.events.length > 0) {
          for (const ev of p.events) {
            accounts.push({
              id: p.id,
              event_id: ev.id,
              event_name: ev.name || p.name,
              status: p.status,
            });
          }
        } else {
          accounts.push({
            id: p.id,
            event_id: null,
            event_name: p.name,
            status: p.status,
          });
        }
      }
      return c.json({
        multiple: true,
        accounts
      });
    }

    if (selectedOrganizer.status === 'deactivated') {
      return c.json({
        error: 'This event account has ended and was closed by the administrator. Access to this dashboard is no longer available.'
      }, 403);
    }
    if (selectedOrganizer.status === 'suspended') {
      return c.json({ error: 'Account suspended' }, 403);
    }

    resetLoginRateLimit(ip);

    const matchingEvent = reqEventId
      ? selectedOrganizer.events?.find((e: any) => e.id === reqEventId)
      : selectedOrganizer.events?.[0];
    const activeEventId = matchingEvent?.id || null;
    const activeEventName = matchingEvent?.name || selectedOrganizer.name;

    const token = await signToken({ 
      id: selectedOrganizer.id, 
      email: selectedOrganizer.email, 
      role: 'organizer',
      event_id: activeEventId
    });
    
    return c.json({
      token,
      user: {
        id: selectedOrganizer.id,
        email: selectedOrganizer.email,
        name: selectedOrganizer.name,
        role: 'organizer',
        status: selectedOrganizer.status,
        event_id: activeEventId,
        event_name: activeEventName,
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

// ── Event Organizer Registration Handler (No KYC, multi-event email/account allowed) ──
async function handleOrganizerRegister(c: any) {
  let body: z.infer<typeof organizerRegisterSchema>;
  
  try {
    body = organizerRegisterSchema.parse(await c.req.json());
  } catch (err: any) {
    return c.json({ error: 'Invalid request body', details: err?.errors }, 400);
  }

  const passwordHash = await bcrypt.hash(body.password, 12);

  const insertData = {
    email: body.email.toLowerCase(),
    password_hash: passwordHash,
    name: sanitizeString(body.name),
    bank_name: sanitizeString(body.bank_name),
    bank_code: body.bank_code || null,
    account_number: body.account_number.trim(),
    account_name: sanitizeString(body.account_name),
    status: 'active'
  };

  let { data: organizer, error } = await supabase
    .from('event_organizers')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    // Fallback if table name is still event_planners
    const fallback = await supabase
      .from('event_planners')
      .insert(insertData)
      .select()
      .single();
    organizer = fallback.data;
    error = fallback.error;
  }

  if (error || !organizer) {
    console.error('Registration error:', error);
    return c.json({ error: 'Registration failed' }, 500);
  }

  const token = await signToken({ 
    id: organizer.id, 
    email: organizer.email, 
    role: 'organizer' 
  });

  return c.json({
    token,
    user: { 
      id: organizer.id, 
      email: organizer.email, 
      name: organizer.name, 
      role: 'organizer' 
    }
  }, 201);
}

authRoutes.post('/register/organizer', signupRateLimit, handleOrganizerRegister);
authRoutes.post('/register/planner', signupRateLimit, handleOrganizerRegister);

// ── Confirm Invite & Set Password ──
authRoutes.post('/confirm-invite', confirmInviteRateLimit, async (c) => {
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

  if (record.invite_expires_at && new Date(record.invite_expires_at) < new Date()) {
    return c.json({ error: 'This invite link has expired. Please ask the organizer to send a new invite.' }, 410);
  }

  // Verify the submitted email matches the invite record (extra guard on top of frontend check)
  if (body.email_confirm && body.email_confirm.toLowerCase() !== record.email.toLowerCase()) {
    return c.json({ error: 'Email address does not match the invite.' }, 400);
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

  const { data: model } = await supabase
    .from('models')
    .select('id, name, email, invite_confirmed_at, invite_expires_at, event_id')
    .eq('invite_token', token)
    .single();

  if (model) {
    if (model.invite_confirmed_at) {
      return c.json({ error: 'Invite already confirmed' }, 400);
    }
    if (model.invite_expires_at && new Date(model.invite_expires_at) < new Date()) {
      return c.json({ error: 'This invite link has expired. Please ask the organizer to send a new invite.' }, 410);
    }
    return c.json({ role: 'model', name: model.name, email: model.email });
  }

  const { data: staff } = await supabase
    .from('gate_staff')
    .select('id, name, email, invite_confirmed_at, invite_expires_at, event_id')
    .eq('invite_token', token)
    .single();

  if (staff) {
    if (staff.invite_confirmed_at) {
      return c.json({ error: 'Invite already confirmed' }, 400);
    }
    if (staff.invite_expires_at && new Date(staff.invite_expires_at) < new Date()) {
      return c.json({ error: 'This invite link has expired. Please ask the organizer to send a new invite.' }, 410);
    }
    return c.json({ role: 'gate', name: staff.name, email: staff.email });
  }

  return c.json({ error: 'Invalid invite link' }, 404);
});
