import 'dotenv/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import app, { supabase } from '../index.js';
import { signToken } from '../utils/jwt.js';

describe('Admin Routes & Permissions', () => {
  let adminToken: string;
  let organizerToken: string;

  beforeEach(async () => {
    vi.restoreAllMocks();

    adminToken = await signToken({
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@tiketi.com',
      role: 'admin',
    });

    organizerToken = await signToken({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'organizer@example.com',
      role: 'organizer',
    });
  });

  it('should block unauthenticated requests to /api/admin/overview with 401', async () => {
    const res = await app.request('/api/admin/overview');
    expect(res.status).toBe(401);
  });

  it('should reject non-admin users with 403', async () => {
    const res = await app.request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${organizerToken}` },
    });
    expect(res.status).toBe(403);
  });

  it('should allow admin token to access /api/orders without 403', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).not.toBe(403);
  });

  it('should return platform overview data for admin on GET /api/admin/overview', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ gross: 10000, platform_fee: 500 }], error: null }),
      limit: vi.fn().mockResolvedValue({ data: [{ id: '1' }], error: null }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/overview', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('total_revenue');
    expect(body).toHaveProperty('total_fees');
    expect(body).toHaveProperty('active_events');
    expect(body).toHaveProperty('pending_events');
  });

  it('should return pending events on GET /api/admin/events/pending', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'evt-1', name: 'Pending Gala', approval_status: 'pending' }],
        error: null,
      }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/events/pending', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toHaveProperty('events');
    expect(Array.isArray(body.events)).toBe(true);
  });

  it('should return all registered events on GET /api/admin/events', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'evt-1', name: 'Campus Fest', status: 'active' }],
        error: null,
      }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/events', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('events');
  });

  it('should return organizers on GET /api/admin/owners', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: [{ id: 'org-1', name: 'John Doe', email: 'john@example.com' }],
        error: null,
      }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/owners', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('owners');
  });

  it('should return orders on GET /api/admin/orders', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'ord-1', reference: 'REF-123', total: 5000, status: 'paid' }],
        error: null,
      }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/orders', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('orders');
  });

  it('should return payouts on GET /api/admin/payouts', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{ id: 'ord-1', reference: 'REF-1', gross: 10000, platform_fee: 500, organizer_share: 9500 }],
        error: null,
      }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/payouts', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('payouts');
  });

  it('should return platform settings on GET /api/admin/settings', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'sett-1', fee_percent: 7.5, fee_bearer: 'organizer' },
        error: null,
      }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/settings', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toHaveProperty('settings');
    expect(body.settings.fee_percent).toBe(7.5);
  });

  it('should reject invalid settings payload on PUT /api/admin/settings with 400', async () => {
    const res = await app.request('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ fee_percent: 'not-a-number' }),
    });

    expect(res.status).toBe(400);
  });

  it('should successfully update settings on PUT /api/admin/settings', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'sett-1', fee_percent: 5.0, fee_bearer: 'organizer' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ fee_percent: 6.5, fee_bearer: 'organizer' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.success).toBe(true);
    expect(body.settings.fee_percent).toBe(6.5);
  });

  it('should return audit logs on GET /api/admin/audit', async () => {
    const mockQuery: any = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ id: 'log-1', action: 'event.approve', details: 'Approved event' }],
        error: null,
      }),
    };
    vi.spyOn(supabase, 'from').mockReturnValue(mockQuery);

    const res = await app.request('/api/admin/audit', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body).toHaveProperty('logs');
    expect(body.logs.length).toBe(1);
  });

  it('should reject invalid bank details format on PUT /api/admin/events/:id/bank-details with 400', async () => {
    const res = await app.request('/api/admin/events/00000000-0000-0000-0000-000000000001/bank-details', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ bank_name: '' }), // Invalid: missing required fields
    });

    expect(res.status).toBe(400);
  });

  it('should reject takedown without reason on PUT /api/admin/events/:id/takedown with 400', async () => {
    const res = await app.request('/api/admin/events/00000000-0000-0000-0000-000000000001/takedown', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({}), // Missing reason
    });

    expect(res.status).toBe(400);
  });
});
