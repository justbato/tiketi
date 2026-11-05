import {
  type Event,
  type Model,
  type GateStaff,
  type Order,
  type Ticket,
  type TicketType
} from './data';

const API_BASE = ((import.meta as any).env?.VITE_API_URL ?? '') + '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// API Client
export const api = {
  // Auth
  auth: {
    async getBanks(): Promise<{ id: number; name: string; code: string }[]> {
      try {
        const res = await fetch(`${API_BASE}/auth/banks`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.banks)) return data.banks;
        }
      } catch (e) {
        console.error('Failed to fetch banks:', e);
      }
      return [];
    },

    async resolveAccount(accountNumber: string, bankCode: string): Promise<string> {
      const res = await fetch(`${API_BASE}/auth/resolve-account?account_number=${encodeURIComponent(accountNumber.trim())}&bank_code=${encodeURIComponent(bankCode.trim())}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Could not verify account name');
      }
      const data = await res.json();
      return data.account_name;
    },

    async getAccountsByEmail(email: string): Promise<any[]> {
      const clean = email.trim().toLowerCase();
      if (!clean || !clean.includes('@')) return [];
      try {
        const res = await fetch(`${API_BASE}/auth/accounts?email=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.accounts)) return data.accounts;
        }
      } catch (e) {
        console.error('Failed to fetch accounts by email:', e);
      }
      return [];
    },

    async login(email: string, password: string, role: 'organizer' | 'planner' | 'model' | 'gate' | 'admin' = 'organizer', accountId?: string) {
      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, account_id: accountId }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Login failed');
        }
        const data = await res.json();
        if (data.multiple) {
          return data;
        }
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('tiketi_role', role);
          if (data.user) localStorage.setItem('tiketi_user', JSON.stringify(data.user));
        }
        return data;
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) throw err;
        throw new Error('Cannot reach the server. Please check your connection.');
      }
    },

    async registerOrganizer(organizerData: {
      name: string;
      email: string;
      password: string;
      bank_name: string;
      bank_code?: string;
      account_number: string;
      account_name: string;
      eventName?: string;
    }) {
      try {
        const res = await fetch(`${API_BASE}/auth/register/organizer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(organizerData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Registration failed');
        }
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('tiketi_role', 'organizer');
          if (data.user) localStorage.setItem('tiketi_user', JSON.stringify(data.user));
        }
        return data;
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) throw err;
        throw new Error('Cannot reach the server. Please check your connection.');
      }
    },

    async confirmInvite(token: string, password: string, role: 'model' | 'gate') {
      try {
        const res = await fetch(`${API_BASE}/auth/confirm-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, password, role }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Confirmation failed');
        }
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('tiketi_role', role === 'gate' ? 'gate' : 'model');
          if (data.user) localStorage.setItem('tiketi_user', JSON.stringify(data.user));
        }
        return data;
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) throw err;
        throw new Error('Could not confirm invite. Please check the link and try again.');
      }
    },

    async verifyToken() {
      try {
        const res = await fetch(`${API_BASE}/auth/verify`, {
          headers: getAuthHeader(),
        });
        return res.ok;
      } catch {
        return false;
      }
    },

    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('tiketi_role');
      localStorage.removeItem('tiketi_user');
    },

    async getInviteInfo(token: string): Promise<{ role: 'model' | 'gate'; name: string; email: string } | null> {
      try {
        const res = await fetch(`${API_BASE}/auth/invite/${encodeURIComponent(token)}`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.error('Failed to get invite info:', e);
      }
      return null;
    },

    getCurrentUser() {
      try {
        const raw = localStorage.getItem('tiketi_user');
        return raw ? JSON.parse(raw) : null;
      } catch { return null; }
    },

    getCurrentRole(): string {
      return localStorage.getItem('tiketi_role') || 'organizer';
    }
  },

  // Events
  events: {
    async list(organizerOnly?: boolean): Promise<Event[]> {
      try {
        const role = localStorage.getItem('tiketi_role');
        const token = localStorage.getItem('token');
        const isOrganizer = organizerOnly || (Boolean(token) && (role === 'organizer' || role === 'owner' || role === 'planner' || role === 'admin'));
        const endpoint = isOrganizer ? `${API_BASE}/events` : `${API_BASE}/events/public`;

        const res = await fetch(endpoint, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events)) {
            return data.events.map((e: any) => ({
              id: e.id,
              ownerId: e.organizer_id || e.planner_id || e.owner_id || '',
              name: e.name,
              description: e.description || '',
              venue: e.venue,
              eventDate: e.event_date || e.eventDate || '',
              timezone: e.timezone || 'Africa/Lagos',
              salesEndDate: e.sales_end_date || e.salesEndDate || '',
              capacity: e.capacity || 0,
              bannerUrl: e.banner_url || e.bannerUrl || '',
              posterUrl: e.poster_url || e.posterUrl || '',
              category: e.category || 'Other',
              status: e.status || 'draft',
              approval_status: e.approval_status || 'pending',
              createdAt: e.created_at || e.createdAt || '',
            }));
          }
        }
      } catch (e) {
        console.error('api.events.list failed:', e);
      }
      return [];
    },

    async get(id: string): Promise<Event | undefined> {
      try {
        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.event) {
            const e = data.event;
            return {
              id: e.id,
              ownerId: e.organizer_id || e.planner_id || e.owner_id || '',
              name: e.name,
              description: e.description || '',
              venue: e.venue,
              eventDate: e.event_date || e.eventDate || '',
              timezone: e.timezone || 'Africa/Lagos',
              salesEndDate: e.sales_end_date || e.salesEndDate || '',
              capacity: e.capacity || 0,
              bannerUrl: e.banner_url || e.bannerUrl || '',
              posterUrl: e.poster_url || e.posterUrl || '',
              category: e.category || 'Other',
              status: e.status || 'draft',
              approval_status: e.approval_status || 'pending',
              createdAt: e.created_at || e.createdAt || '',
            };
          }
        }
      } catch (e) {
        console.error('api.events.get failed:', e);
      }
      return undefined;
    },

    async create(eventData: Partial<Event> & { event_date?: string; sales_end_date?: string; banner_url?: string; poster_url?: string }): Promise<Event> {
      const payload = {
        name: eventData.name,
        description: eventData.description,
        venue: eventData.venue,
        event_date: eventData.eventDate || eventData.event_date,
        sales_end_date: eventData.salesEndDate || eventData.sales_end_date,
        capacity: eventData.capacity,
        timezone: eventData.timezone || 'Africa/Lagos',
        banner_url: eventData.bannerUrl || eventData.banner_url || null,
        poster_url: eventData.posterUrl || eventData.poster_url || null,
        category: eventData.category || 'Other',
      };

      const res = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create event');
      }

      const data = await res.json();
      const e = data.event || data;
      return {
        id: e.id,
        ownerId: e.organizer_id || e.planner_id || e.owner_id || '',
        name: e.name,
        description: e.description || '',
        venue: e.venue,
        eventDate: e.event_date || e.eventDate || '',
        timezone: e.timezone || 'Africa/Lagos',
        salesEndDate: e.sales_end_date || e.salesEndDate || '',
        capacity: e.capacity || 0,
        bannerUrl: e.banner_url || e.bannerUrl || '',
        posterUrl: e.poster_url || e.posterUrl || '',
        category: e.category || 'Other',
        status: e.status || 'draft',
        approval_status: e.approval_status || 'pending',
        createdAt: e.created_at || e.createdAt || '',
      };
    },

    async update(id: string, updates: Partial<Event> & { event_date?: string; sales_end_date?: string; banner_url?: string; poster_url?: string }): Promise<Event> {
      const payload: any = { ...updates };
      if (updates.eventDate) payload.event_date = updates.eventDate;
      if (updates.salesEndDate) payload.sales_end_date = updates.salesEndDate;
      if (updates.bannerUrl) payload.banner_url = updates.bannerUrl;
      if (updates.posterUrl) payload.poster_url = updates.posterUrl;

      const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update event');
      }

      const data = await res.json();
      const e = data.event || data;
      return {
        id: e.id,
        ownerId: e.organizer_id || e.planner_id || e.owner_id || '',
        name: e.name,
        description: e.description || '',
        venue: e.venue,
        eventDate: e.event_date || e.eventDate || '',
        timezone: e.timezone || 'Africa/Lagos',
        salesEndDate: e.sales_end_date || e.salesEndDate || '',
        capacity: e.capacity || 0,
        bannerUrl: e.banner_url || e.bannerUrl || '',
        posterUrl: e.poster_url || e.posterUrl || '',
        category: e.category || 'Other',
        status: e.status || 'draft',
        approval_status: e.approval_status || 'pending',
        createdAt: e.created_at || e.createdAt || '',
      };
    },

    async delete(id: string): Promise<boolean> {
      const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      return res.ok;
    },

    async getStats(id: string) {
      const res = await fetch(`${API_BASE}/events/${encodeURIComponent(id)}/stats`, {
        headers: getAuthHeader(),
      });
      if (res.ok) return await res.json();
      return null;
    }
  },

  // Ticket Types
  ticketTypes: {
    async list(eventId: string): Promise<TicketType[]> {
      try {
        const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/ticket-types`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.ticketTypes)) {
            return data.ticketTypes.map((t: any) => ({
              id: t.id,
              eventId: t.event_id || eventId,
              name: t.name,
              price: t.price ?? 0,
              genderPricing: t.gender_pricing || false,
              malePrice: t.male_price,
              femalePrice: t.female_price,
              quantity: t.quantity,
              admits: t.admits || 1,
              imageUrl: t.ticket_image_url || '',
              aspectRatio: '3:1',
              sortOrder: t.sort_order || 0,
              archived: t.archived || false,
              sold: t.sold || 0,
              locked: t.locked || false,
            }));
          }
        }
      } catch (e) {
        console.error('api.ticketTypes.list failed:', e);
      }
      return [];
    },

    async create(eventId: string, ticketData: Partial<TicketType> & { gender_pricing?: boolean; male_price?: number; female_price?: number; ticket_image_url?: string }): Promise<TicketType> {
      const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/ticket-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({
          name: ticketData.name,
          gender_pricing: ticketData.genderPricing ?? ticketData.gender_pricing ?? false,
          price: ticketData.price,
          male_price: ticketData.malePrice ?? ticketData.male_price,
          female_price: ticketData.femalePrice ?? ticketData.female_price,
          quantity: ticketData.quantity,
          admits: ticketData.admits ?? 1,
          ticket_image_url: ticketData.imageUrl || ticketData.ticket_image_url || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create ticket type');
      }

      const data = await res.json();
      const tt = data.ticketType;
      return {
        id: tt.id,
        eventId,
        name: tt.name,
        price: tt.price ?? 0,
        genderPricing: tt.gender_pricing || false,
        malePrice: tt.male_price,
        femalePrice: tt.female_price,
        quantity: tt.quantity,
        admits: tt.admits || 1,
        imageUrl: tt.ticket_image_url || '',
        aspectRatio: '3:1',
        sortOrder: 0,
        archived: false,
        sold: 0,
        locked: false,
      };
    },

    async update(eventId: string, ttId: string, updates: Partial<TicketType>): Promise<TicketType> {
      const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ttId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update ticket type');
      }

      const data = await res.json();
      return data.ticketType;
    },

    async delete(eventId: string, ttId: string): Promise<boolean> {
      const res = await fetch(`${API_BASE}/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ttId)}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      return res.ok;
    }
  },

  // Models
  models: {
    async list(eventId?: string): Promise<Model[]> {
      try {
        const url = eventId ? `${API_BASE}/models?event_id=${encodeURIComponent(eventId)}` : `${API_BASE}/models`;
        const res = await fetch(url, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models)) {
            return data.models.map((m: any) => ({
              id: m.id,
              eventId: m.event_id || eventId || '',
              name: m.name,
              email: m.email,
              referralCode: m.referral_code || m.referralCode || '',
              status: m.status,
              totalSold: m.total_sold || m.totalSold || 0,
              revenue: m.revenue || 0,
              createdAt: m.created_at || m.createdAt || '',
              inviteToken: m.invite_token,
            }));
          }
        }
      } catch (e) {
        console.error('api.models.list failed:', e);
      }
      return [];
    },

    async getByRef(code: string): Promise<{ model?: Model; error?: string; inactive?: boolean }> {
      try {
        const res = await fetch(`${API_BASE}/models/ref/${encodeURIComponent(code)}`);
        const data = await res.json();
        if (res.ok && data.model) {
          const m = data.model;
          return {
            model: {
              id: m.id,
              eventId: m.event_id,
              name: m.name,
              email: m.email,
              referralCode: m.referral_code,
              status: m.status,
              totalSold: m.total_sold || 0,
              revenue: m.revenue || 0,
              createdAt: m.created_at,
            }
          };
        }
        if (res.status === 403) {
          return { error: data.error || 'Referral link is inactive, suspended, or terminated.', inactive: true };
        }
        return { error: data.error || 'Invalid referral code.' };
      } catch (e: any) {
        return { error: e.message || 'Could not verify referral code.' };
      }
    },

    async invite(modelData: { event_id: string; name: string; email: string }): Promise<Model & { inviteToken?: string; inviteUrl?: string }> {
      const res = await fetch(`${API_BASE}/models/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(modelData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to invite model');
      }

      const data = await res.json();
      const m = data.model;
      const token = data.invite_token || m.invite_token;
      return {
        id: m.id,
        eventId: m.event_id,
        name: m.name,
        email: m.email,
        referralCode: m.referral_code,
        status: m.status,
        totalSold: 0,
        revenue: 0,
        createdAt: m.created_at,
        inviteToken: token,
        inviteUrl: data.invite_url || `${window.location.origin}/invite?token=${token}`
      };
    },

    async update(id: string, updates: { name?: string; status?: Model['status'] }): Promise<Model> {
      const res = await fetch(`${API_BASE}/models/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update model');
      }

      const data = await res.json();
      return data.model;
    },

    async remove(id: string): Promise<boolean> {
      const res = await fetch(`${API_BASE}/models/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getAuthHeader(),
      });
      return res.ok;
    }
  },

  // Gate Staff
  staff: {
    async list(): Promise<GateStaff[]> {
      try {
        const res = await fetch(`${API_BASE}/staff`, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.staff)) {
            return data.staff.map((s: any) => ({
              id: s.id,
              ownerId: s.organizer_id || '',
              name: s.name,
              email: s.email,
              assignedEvents: s.event_id ? [s.event_id] : (s.assigned_events || []),
              status: s.status,
              lastActivity: s.last_activity,
              createdAt: s.created_at,
              inviteToken: s.invite_token,
            }));
          }
        }
      } catch (e) {
        console.error('api.staff.list failed:', e);
      }
      return [];
    },

    async add(staffData: { event_id: string; name: string; email: string }): Promise<GateStaff & { inviteToken?: string; inviteUrl?: string }> {
      const res = await fetch(`${API_BASE}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(staffData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to add staff');
      }

      const data = await res.json();
      const s = data.staff;
      const token = data.invite_token || s.invite_token;
      return {
        id: s.id,
        ownerId: s.organizer_id || '',
        name: s.name,
        email: s.email,
        assignedEvents: [s.event_id],
        status: s.status,
        lastActivity: s.last_activity,
        createdAt: s.created_at,
        inviteToken: token,
        inviteUrl: data.invite_url || `${window.location.origin}/invite?token=${token}`
      };
    },

    async update(id: string, updates: { name?: string; status?: GateStaff['status'] }): Promise<GateStaff> {
      const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update staff');
      }

      const data = await res.json();
      return data.staff;
    },

    async revoke(id: string): Promise<boolean> {
      const res = await fetch(`${API_BASE}/staff/${encodeURIComponent(id)}/revoke`, {
        method: 'PUT',
        headers: getAuthHeader(),
      });
      return res.ok;
    }
  },

  // Orders
  orders: {
    async create(orderData: {
      event_id: string;
      model_id?: string | null;
      buyer_name: string;
      buyer_email: string;
      buyer_phone: string;
      items: { ticket_type_id: string; quantity: number }[];
    }) {
      const res = await fetch(`${API_BASE}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create order');
      }

      return await res.json();
    },

    async getStatus(reference: string) {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(reference)}/status`);
      if (res.ok) return await res.json();
      return { status: 'unknown' };
    },

    async verifyPayment(reference: string) {
      const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(reference)}/verify-payment`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
      return null;
    },

    async getOrderTickets(reference: string, email: string): Promise<{ order: any; tickets: any[] } | null> {
      if (!email.trim()) return null;

      try {
        const res = await fetch(`${API_BASE}/orders/${encodeURIComponent(reference)}/tickets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyer_email: email.trim().toLowerCase() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.order) return data;
        }
      } catch (e) {
        console.error('api.orders.getOrderTickets failed:', e);
      }
      return null;
    },

    async list(eventId?: string): Promise<Order[]> {
      try {
        const url = eventId ? `${API_BASE}/orders?event_id=${encodeURIComponent(eventId)}` : `${API_BASE}/orders`;
        const res = await fetch(url, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.orders)) {
            return data.orders.map((o: any) => ({
              id: o.id,
              reference: o.reference,
              buyerName: o.buyer_name || o.buyerName,
              buyerEmail: o.buyer_email || o.buyerEmail,
              buyerPhone: o.buyer_phone || o.buyerPhone || '',
              eventId: o.event_id || o.eventId,
              modelId: o.model_id || o.modelId || '',
              status: o.status,
              total: o.total,
              ticketPrice: o.ticket_price || o.total,
              serviceFee: o.fees || 0,
              paymentReference: o.payment_reference || o.paystack_reference || '',
              createdAt: o.created_at || o.createdAt,
              expiresAt: o.expires_at || '',
              lines: o.lines || []
            }));
          }
        }
      } catch (e) {
        console.error('api.orders.list failed:', e);
      }
      return [];
    }
  },

  // Verify
  verify: {
    async ticket(params: { event_id: string; code?: string; qr_payload?: string; method: 'code' | 'qr' }) {
      try {
        const res = await fetch(`${API_BASE}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(params),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          return {
            status: 'error',
            error: data.error || `Server returned ${res.status}`,
          };
        }

        return data;
      } catch (e: any) {
        return {
          status: 'error',
          error: e.message || 'Network connection failed while verifying ticket',
        };
      }
    },

    async getStats(eventId: string): Promise<{
      total_tickets: number;
      checked_in: number;
      total_admits: number;
      checked_in_admits: number;
      capacity: number;
      percentage: number;
    } | null> {
      try {
        const res = await fetch(`${API_BASE}/verify/stats/${encodeURIComponent(eventId)}`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        console.error('api.verify.getStats failed:', e);
      }
      return null;
    },

    async undo(ticketId: string, reason: string) {
      const res = await fetch(`${API_BASE}/verify/undo/${encodeURIComponent(ticketId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason }),
      });
      return res.ok;
    }
  },

  // Admin
  admin: {
    async getPendingEvents() {
      try {
        const res = await fetch(`${API_BASE}/admin/events/pending`, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          return data.events || [];
        }
      } catch (e) {
        console.error('api.admin.getPendingEvents failed:', e);
      }
      return [];
    },

    async approveEvent(eventId: string) {
      const res = await fetch(`${API_BASE}/admin/events/${encodeURIComponent(eventId)}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to approve event');
      }
      return await res.json();
    },

    async rejectEvent(eventId: string, reason?: string) {
      const res = await fetch(`${API_BASE}/admin/events/${encodeURIComponent(eventId)}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to reject event');
      }
      return await res.json();
    },

    async updateEventBankDetails(eventId: string, bankDetails: { bank_name: string; bank_code: string; account_number: string; account_name: string }) {
      const res = await fetch(`${API_BASE}/admin/events/${encodeURIComponent(eventId)}/bank-details`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(bankDetails),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update bank details');
      }
      return await res.json();
    },

    async getSettings() {
      try {
        const res = await fetch(`${API_BASE}/admin/settings`, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          return data.settings || {};
        }
      } catch (e) {
        console.error('api.admin.getSettings failed:', e);
      }
      return { fee_percent: 5.0, fee_bearer: 'organizer' };
    },

    async updateSettings(settings: { fee_percent?: number; fee_bearer?: string; announcement_banner?: string }) {
      const res = await fetch(`${API_BASE}/admin/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update settings');
      }
      return await res.json();
    },

    async deactivateOrganizer(plannerId: string) {
      const res = await fetch(`${API_BASE}/admin/owners/${encodeURIComponent(plannerId)}/deactivate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to deactivate organizer');
      }
      return await res.json();
    },

    async deactivatePlanner(plannerId: string) {
      return this.deactivateOrganizer(plannerId);
    }
  }
};
