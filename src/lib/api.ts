import {
  mockEvents, mockModels, mockGateStaff, mockOrders, mockTickets, mockTicketTypes,
  generateTicketCode,
  type Event, type Model, type GateStaff, type Order, type Ticket, type TicketType
} from './data';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Local persistent storage keys for state persistence
const MODELS_STORAGE_KEY = 'tikiti_models_data';
const STAFF_STORAGE_KEY = 'tikiti_staff_data';
const EVENTS_STORAGE_KEY = 'tikiti_events_data';
const ORDERS_STORAGE_KEY = 'tikiti_orders_data';
const TICKET_TYPES_STORAGE_KEY = 'tikiti_ticket_types_data';
const PLANNERS_STORAGE_KEY = 'tikiti_planners_data';

export interface StoredPlannerAccount {
  id: string;
  email: string;
  name: string;
  eventId?: string;
  eventName?: string;
  whatsapp_number?: string;
  party_type?: 'campus' | 'off_campus';
  status: 'active' | 'suspended' | 'deactivated';
  created_at: string;
}

export function getStoredPlanners(): StoredPlannerAccount[] {
  try {
    const data = localStorage.getItem(PLANNERS_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [];
}

export function saveStoredPlanners(planners: StoredPlannerAccount[]) {
  try {
    localStorage.setItem(PLANNERS_STORAGE_KEY, JSON.stringify(planners));
  } catch (e) {
    console.error(e);
  }
}

// Helper to initialize local persistent state
export function getStoredModels(): Model[] {
  try {
    const data = localStorage.getItem(MODELS_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [...mockModels];
}

export function saveStoredModels(models: Model[]) {
  try {
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(models));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredStaff(): GateStaff[] {
  try {
    const data = localStorage.getItem(STAFF_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [...mockGateStaff];
}

export function saveStoredStaff(staff: GateStaff[]) {
  try {
    localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(staff));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredEvents(): Event[] {
  try {
    const data = localStorage.getItem(EVENTS_STORAGE_KEY);
    if (data) {
      const parsed: Event[] = JSON.parse(data);
      // Merge with mockEvents to guarantee updated poster URLs and new active events
      const merged = parsed.map(e => {
        const mock = mockEvents.find(m => m.id === e.id);
        return {
          ...e,
          posterUrl: e.posterUrl || mock?.posterUrl || '',
          bannerUrl: e.bannerUrl || mock?.bannerUrl || '',
        };
      });
      // Add any mockEvents not currently in storage
      for (const m of mockEvents) {
        if (!merged.some(e => e.id === m.id)) {
          merged.push(m);
        }
      }
      return merged;
    }
  } catch (e) {
    console.error(e);
  }
  return [...mockEvents];
}

export function saveStoredEvents(events: Event[]) {
  try {
    localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredOrders(): Order[] {
  try {
    const data = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch (e) {
    console.error(e);
  }
  return [...mockOrders];
}

export function saveStoredOrders(orders: Order[]) {
  try {
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error(e);
  }
}

export function getStoredTicketTypes(): TicketType[] {
  try {
    const data = localStorage.getItem(TICKET_TYPES_STORAGE_KEY);
    if (data) {
      const parsed: TicketType[] = JSON.parse(data);
      const merged = [...parsed];
      for (const m of mockTicketTypes) {
        if (!merged.some(t => t.id === m.id)) {
          merged.push(m);
        }
      }
      return merged;
    }
  } catch (e) {
    console.error(e);
  }
  return [...mockTicketTypes];
}

export function saveStoredTicketTypes(tickets: TicketType[]) {
  try {
    localStorage.setItem(TICKET_TYPES_STORAGE_KEY, JSON.stringify(tickets));
  } catch (e) {
    console.error(e);
  }
}

// API Client
export const api = {
  // Auth
  auth: {
    async getAccountsByEmail(email: string): Promise<any[]> {
      const clean = email.trim().toLowerCase();
      if (!clean || !clean.includes('@')) return [];
      try {
        const res = await fetch(`${API_BASE}/auth/accounts?email=${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.accounts)) return data.accounts;
        }
      } catch {}

      // Storage fallback
      const planners = getStoredPlanners();
      return planners
        .filter(p => p.email.toLowerCase() === clean)
        .map(p => ({
          id: p.id,
          email: p.email,
          name: p.name,
          status: p.status,
          eventName: p.eventName || 'Event Account',
          event_name: p.eventName || 'Event Account',
          eventId: p.eventId,
          event_id: p.eventId,
          created_at: p.created_at,
          bank_name: (p as any).bank_name,
          account_number: (p as any).account_number,
          account_name: (p as any).account_name,
          whatsapp_number: p.whatsapp_number,
        }));
    },

    async login(email: string, password: string, role: 'planner' | 'model' | 'gate' | 'admin' = 'planner', accountId?: string) {
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
          return data; // Multiple accounts for planner, return for selection
        }
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('tiketi_role', role);
          if (data.user) localStorage.setItem('tiketi_user', JSON.stringify(data.user));
        }
        return data;
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) throw err;
        throw new Error('Cannot reach the server. Please try again.');
      }
    },

    async registerPlanner(plannerData: {
      party_type: 'campus' | 'off_campus';
      university?: string;
      state?: string;
      location?: string;
      name: string;
      email: string;
      whatsapp_number: string;
      password: string;
      bank_name: string;
      account_number: string;
      account_name: string;
      eventName?: string;
      eventId?: string;
    }) {
      try {
        const res = await fetch(`${API_BASE}/auth/register/planner`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plannerData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Registration failed');
        }
        const data = await res.json();
        if (data.token) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('tiketi_role', 'planner');
          if (data.user) localStorage.setItem('tiketi_user', JSON.stringify(data.user));
        }
        return data;
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) throw err;
        throw new Error('Cannot reach the server. Please try again.');
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
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: getAuthHeader(),
      });
      return res.ok;
    },

    logout() {
      localStorage.removeItem('token');
      localStorage.removeItem('tiketi_role');
      localStorage.removeItem('tiketi_user');
    },

    async getInviteInfo(token: string): Promise<{ role: 'model' | 'gate'; name: string; email: string } | null> {
      try {
        const res = await fetch(`${API_BASE}/auth/invite/${token}`);
        if (res.ok) {
          return await res.json();
        }
      } catch {}
      // Fallback: check stored models and staff
      const model = getStoredModels().find((m: any) => m.inviteToken === token || m.referralCode === token || m.id === token);
      if (model) {
        return { role: 'model', name: model.name, email: model.email };
      }
      const staff = getStoredStaff().find((s: any) => s.inviteToken === token || s.id === token);
      if (staff) {
        return { role: 'gate', name: staff.name, email: staff.email };
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
      return localStorage.getItem('tiketi_role') || 'planner';
    }
  },

  // Events
  events: {
    async list(): Promise<Event[]> {
      try {
        const res = await fetch(`${API_BASE}/events/public`, {
          headers: getAuthHeader(),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.events) && data.events.length > 0) {
            return data.events;
          }
        }
      } catch (e) {
        // Fall back to local
      }
      return getStoredEvents();
    },
    async get(id: string): Promise<Event | undefined> {
      try {
        const res = await fetch(`${API_BASE}/events/${id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.event) return data.event;
        }
      } catch (e) {}
      return getStoredEvents().find(e => e.id === id);
    },
    async create(eventData: Partial<Event>): Promise<Event> {
      try {
        const res = await fetch(`${API_BASE}/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(eventData),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.event) return data.event;
        }
      } catch (e) {}
      
      const newEvent: Event = {
        id: 'evt_' + Date.now(),
        ownerId: 'owner_1',
        name: eventData.name || 'New Event',
        description: eventData.description || '',
        venue: eventData.venue || 'Lagos',
        eventDate: eventData.eventDate || new Date().toISOString(),
        timezone: 'Africa/Lagos',
        salesEndDate: eventData.salesEndDate || new Date().toISOString(),
        capacity: eventData.capacity || 500,
        bannerUrl: eventData.bannerUrl || '',
        posterUrl: eventData.posterUrl || '',
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
      };
      const events = [newEvent, ...getStoredEvents()];
      saveStoredEvents(events);
      return newEvent;
    }
  },

  // Ticket Types
  ticketTypes: {
    async list(eventId: string): Promise<TicketType[]> {
      try {
        const res = await fetch(`${API_BASE}/events/${eventId}/ticket-types`, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.ticketTypes) && data.ticketTypes.length > 0) {
            return data.ticketTypes.map((t: any) => ({
              id: t.id,
              eventId: t.event_id || eventId,
              name: t.name,
              price: t.price || 0,
              genderPricing: t.gender_pricing,
              malePrice: t.male_price,
              femalePrice: t.female_price,
              quantity: t.quantity,
              admits: t.admits || 1,
              imageUrl: t.ticket_image_url || '',
              aspectRatio: '3:1',
              sortOrder: t.sort_order || 0,
              archived: t.archived || false,
              sold: 0,
              locked: t.locked || false,
            }));
          }
        }
      } catch (e) {}
      return getStoredTicketTypes().filter(t => t.eventId === eventId);
    },

    async create(eventId: string, ticketData: Partial<TicketType> & { gender_pricing?: boolean; male_price?: number; female_price?: number; ticket_image_url?: string }): Promise<TicketType> {
      try {
        const res = await fetch(`${API_BASE}/events/${eventId}/ticket-types`, {
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
            ticket_image_url: ticketData.imageUrl || ticketData.ticket_image_url || '',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ticketType) {
            const tt = data.ticketType;
            const mapped: TicketType = {
              id: tt.id,
              eventId,
              name: tt.name,
              price: tt.price || 0,
              genderPricing: tt.gender_pricing,
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
            const current = getStoredTicketTypes();
            saveStoredTicketTypes([...current, mapped]);
            mockTicketTypes.push(mapped);
            return mapped;
          }
        }
      } catch (e) {}

      const newTicket: TicketType = {
        id: `tt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        eventId,
        name: ticketData.name || 'Regular',
        price: ticketData.price || 0,
        genderPricing: ticketData.genderPricing ?? ticketData.gender_pricing ?? false,
        malePrice: ticketData.malePrice ?? ticketData.male_price,
        femalePrice: ticketData.femalePrice ?? ticketData.female_price,
        gender: ticketData.gender,
        quantity: ticketData.quantity || 100,
        admits: ticketData.admits || 1,
        imageUrl: ticketData.imageUrl || ticketData.ticket_image_url || '',
        aspectRatio: '3:1',
        sortOrder: 0,
        archived: false,
        sold: 0,
        locked: false,
      };
      const current = getStoredTicketTypes();
      saveStoredTicketTypes([...current, newTicket]);
      mockTicketTypes.push(newTicket);
      return newTicket;
    }
  },

  // Models
  models: {
    async list(eventId?: string): Promise<Model[]> {
      try {
        const url = eventId ? `${API_BASE}/models?event_id=${eventId}` : `${API_BASE}/models`;
        const res = await fetch(url, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.models) && data.models.length > 0) {
            return data.models;
          }
        }
      } catch (e) {}
      const stored = getStoredModels();
      return eventId ? stored.filter(m => m.eventId === eventId) : stored;
    },

    async getByRef(code: string): Promise<{ model?: Model; error?: string; inactive?: boolean }> {
      try {
        const res = await fetch(`${API_BASE}/models/ref/${code}`);
        const data = await res.json();
        if (res.ok && data.model) {
          return { model: data.model };
        }
        if (res.status === 403) {
          return { error: data.error || 'Referral link is inactive, suspended, or terminated.', inactive: true };
        }
        return { error: data.error || 'Invalid referral code.' };
      } catch (e) {
        // Local lookup fallback
        const found = getStoredModels().find(m => m.referralCode === code);
        if (!found) return { error: 'Invalid referral code' };
        if (found.status !== 'active') {
          return {
            error: `This referral link is ${found.status}. Purchases cannot be made through this referral code.`,
            inactive: true,
            model: found
          };
        }
        return { model: found };
      }
    },

    async invite(modelData: { event_id: string; name: string; email: string }): Promise<Model & { inviteToken?: string; inviteUrl?: string }> {
      try {
        const res = await fetch(`${API_BASE}/models/invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(modelData),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.model) {
            const token = data.invite_token || data.model.invite_token;
            return {
              ...data.model,
              inviteToken: token,
              inviteUrl: data.invite_url || `${window.location.origin}/invite?token=${token}`
            };
          }
        }
      } catch (e) {}

      const chars = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';
      let ref = 'TKT-';
      for (let i = 0; i < 4; i++) ref += chars[Math.floor(Math.random() * chars.length)];
      const inviteToken = 'inv_mod_' + Math.random().toString(36).substring(2, 12);

      const newModel: Model = {
        id: 'mod_' + Date.now(),
        eventId: modelData.event_id || 'evt_1',
        name: modelData.name,
        email: modelData.email,
        referralCode: ref,
        status: 'invited',
        totalSold: 0,
        revenue: 0,
        createdAt: new Date().toISOString().split('T')[0],
        inviteToken,
      };
      const list = [newModel, ...getStoredModels()];
      saveStoredModels(list);
      return {
        ...newModel,
        inviteToken,
        inviteUrl: `${window.location.origin}/invite?token=${inviteToken}`
      };
    },

    async update(id: string, updates: { name?: string; status?: Model['status'] }): Promise<Model> {
      try {
        const res = await fetch(`${API_BASE}/models/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.model) {
            // Also sync local storage
            const list = getStoredModels().map(m => m.id === id ? { ...m, ...updates } : m);
            saveStoredModels(list);
            return data.model;
          }
        }
      } catch (e) {}

      const list = getStoredModels().map(m => m.id === id ? { ...m, ...updates } : m);
      saveStoredModels(list);
      const updated = list.find(m => m.id === id)!;
      return updated;
    },

    async remove(id: string): Promise<boolean> {
      try {
        const res = await fetch(`${API_BASE}/models/${id}`, {
          method: 'DELETE',
          headers: getAuthHeader(),
        });
        if (res.ok) return true;
      } catch (e) {}

      // Keep record intact, update status to removed or terminated
      const list = getStoredModels().map(m => m.id === id ? { ...m, status: 'terminated' as const } : m);
      saveStoredModels(list);
      return true;
    }
  },

  // Gate Staff
  staff: {
    async list(): Promise<GateStaff[]> {
      try {
        const res = await fetch(`${API_BASE}/staff`, { headers: getAuthHeader() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.staff) && data.staff.length > 0) {
            return data.staff;
          }
        }
      } catch (e) {}
      return getStoredStaff();
    },

    async add(staffData: { event_id: string; name: string; email: string }): Promise<GateStaff & { inviteToken?: string; inviteUrl?: string }> {
      try {
        const res = await fetch(`${API_BASE}/staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(staffData),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.staff) {
            const token = data.invite_token || data.staff.invite_token;
            return {
              ...data.staff,
              inviteToken: token,
              inviteUrl: data.invite_url || `${window.location.origin}/invite?token=${token}`
            };
          }
        }
      } catch (e) {}

      const inviteToken = 'inv_gate_' + Math.random().toString(36).substring(2, 12);
      const newStaff: GateStaff = {
        id: 'staff_' + Date.now(),
        ownerId: 'owner_1',
        name: staffData.name,
        email: staffData.email,
        assignedEvents: [staffData.event_id || 'evt_1'],
        status: 'invited',
        lastActivity: null,
        createdAt: new Date().toISOString().split('T')[0],
        inviteToken,
      };
      const list = [newStaff, ...getStoredStaff()];
      saveStoredStaff(list);
      return {
        ...newStaff,
        inviteToken,
        inviteUrl: `${window.location.origin}/invite?token=${inviteToken}`
      };
    },

    async update(id: string, updates: { name?: string; status?: GateStaff['status'] }): Promise<GateStaff> {
      try {
        const res = await fetch(`${API_BASE}/staff/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(updates),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.staff) {
            const list = getStoredStaff().map(s => s.id === id ? { ...s, ...updates } : s);
            saveStoredStaff(list);
            return data.staff;
          }
        }
      } catch (e) {}

      const list = getStoredStaff().map(s => s.id === id ? { ...s, ...updates } : s);
      saveStoredStaff(list);
      return list.find(s => s.id === id)!;
    },

    async revoke(id: string): Promise<boolean> {
      try {
        const res = await fetch(`${API_BASE}/staff/${id}/revoke`, {
          method: 'PUT',
          headers: getAuthHeader(),
        });
        if (res.ok) return true;
      } catch (e) {}

      const list = getStoredStaff().map(s => s.id === id ? { ...s, status: 'revoked' as const } : s);
      saveStoredStaff(list);
      return true;
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
      // Validate model status if provided
      if (orderData.model_id) {
        const models = getStoredModels();
        const model = models.find(m => m.id === orderData.model_id);
        if (model && model.status !== 'active') {
          throw new Error(`This model referral link is ${model.status}. Purchases cannot be made through this link.`);
        }
      }

      try {
        const res = await fetch(`${API_BASE}/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData),
        });
        if (res.ok) {
          return await res.json();
        }
        const err = await res.json().catch(() => ({}));
        if (err.error) throw new Error(err.error);
      } catch (e: any) {
        if (e.message && e.message.includes('model')) throw e;
      }

      // Offline / fallback order generator
      const ref = 'TKT-ORD-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      return {
        order: {
          reference: ref,
          accountNumber: '7294018563',
          bankName: 'Providus Bank',
          accountName: 'TiKeTi Events Ltd',
        }
      };
    },

    async getStatus(reference: string) {
      try {
        const res = await fetch(`${API_BASE}/orders/${reference}/status`);
        if (res.ok) return await res.json();
      } catch (e) {}
      return { status: 'paid', paid: true, expired: false };
    },

    async getOrderTickets(reference: string, email: string): Promise<{ order: any; tickets: any[] } | null> {
      if (!email.trim()) return null; // email is required

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
        // Non-ok response (404, 429, etc.) — do NOT fall through to local data
        // so that the security invariants hold even in hybrid-online mode.
        if (res.status !== 0) return null;
      } catch (e) {
        // Only fall through to local data when the request itself failed (offline)
      }

      // Offline fallback: honour the email check locally too
      const storedEmail = email.trim().toLowerCase();

      // Fallback 1: Direct localStorage saved order
      try {
        const cached = localStorage.getItem('tikiti_order_' + reference);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.tickets) {
            const buyerEmail = (parsed.order?.buyerEmail || parsed.order?.buyer_email || '').toLowerCase();
            return buyerEmail === storedEmail ? parsed : null;
          }
        }
      } catch (e) {}

      // Fallback 2: Check stored orders
      const stored = getStoredOrders();
      const match = stored.find(
        o => o.reference.toUpperCase() === reference.toUpperCase()
          && (o.buyerEmail || '').toLowerCase() === storedEmail
      );
      if (match) {
        const events = getStoredEvents();
        const event = events.find(e => e.id === match.eventId) || events[0] || mockEvents[0];
        const lines = match.lines || [];
        const tickets = lines.flatMap((l: any, idx: number) => {
          return Array.from({ length: l.quantity || 1 }, (_, i) => ({
            id: `tkt_${match.reference}_${idx}_${i}`,
            orderRef: match.reference,
            code: generateTicketCode(),
            type: l.ticketTypeName || 'Pass',
            admits: l.admits || 1,
            ticketImageUrl: l.imageUrl || l.ticket_image_url || event?.posterUrl || event?.bannerUrl || '',
            eventName: event?.name || 'Event',
            eventVenue: event?.venue || 'Venue',
            eventDate: event?.eventDate || new Date().toISOString(),
            buyerName: match.buyerName,
            buyerEmail: match.buyerEmail,
            createdAt: match.createdAt || new Date().toISOString()
          }));
        });
        return { order: match, tickets };
      }

      // Fallback 3: mockOrders
      const mockMatch = mockOrders.find(
        o => o.reference.toUpperCase() === reference.toUpperCase()
          && (o.buyerEmail || '').toLowerCase() === storedEmail
      );
      if (mockMatch) {
        const event = mockEvents.find(e => e.id === mockMatch.eventId) || mockEvents[0];
        const tickets = mockMatch.lines.flatMap((l, idx) => {
          return Array.from({ length: l.quantity }, (_, i) => ({
            id: `tkt_${mockMatch.reference}_${idx}_${i}`,
            orderRef: mockMatch.reference,
            code: generateTicketCode(),
            type: l.ticketTypeName,
            admits: 1,
            ticketImageUrl: event.posterUrl || event.bannerUrl || '',
            eventName: event.name,
            eventVenue: event.venue,
            eventDate: event.eventDate,
            buyerName: mockMatch.buyerName,
            buyerEmail: mockMatch.buyerEmail,
            createdAt: mockMatch.createdAt
          }));
        });
        return { order: mockMatch, tickets };
      }

      return null;
    }
  },

  // Verify
  verify: {
    async ticket(params: { event_id: string; code?: string; qr_payload?: string; method: 'code' | 'qr'; staff_id?: string }) {
      // Check if gate staff is suspended/revoked/terminated locally
      if (params.staff_id) {
        const staffList = getStoredStaff();
        const staff = staffList.find(s => s.id === params.staff_id);
        if (staff && staff.status !== 'active') {
          return {
            status: 'denied',
            error: `Gate staff account is ${staff.status}. Ticket check-in verification is disabled.`
          };
        }
      }

      try {
        const res = await fetch(`${API_BASE}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
          body: JSON.stringify(params),
        });
        if (res.ok) return await res.json();
        const err = await res.json().catch(() => ({}));
        if (err.error) return { status: 'denied', error: err.error };
      } catch (e) {}

      // Fallback
      const normalized = (params.code || '').replace(/[\s-]/g, '').toUpperCase();
      const match = mockTickets.find(t => t.code.replace(/[\s-]/g, '').toUpperCase() === normalized);
      if (!match) return { status: 'invalid', message: 'Ticket code not found' };
      if (match.checkedIn) return { status: 'already_checked_in', message: 'Ticket has already been checked in', ticket: match };
      return { status: 'valid', message: 'Valid ticket verified', ticket: { ...match, checkedIn: true } };
    }
  },

  // Admin
  admin: {
    async deactivatePlanner(plannerId: string) {
      try {
        const res = await fetch(`${API_BASE}/admin/owners/${plannerId}/deactivate`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
        });
        if (res.ok) return await res.json();
      } catch (e) {}

      // Fallback
      const planners = getStoredPlanners().map(p => {
        if (p.id === plannerId) {
          return { ...p, status: 'deactivated' as const };
        }
        return p;
      });
      saveStoredPlanners(planners);

      // Close associated event
      const target = getStoredPlanners().find(p => p.id === plannerId);
      if (target?.eventId) {
        const events = getStoredEvents().map(e => e.id === target.eventId ? { ...e, status: 'ended' as const } : e);
        saveStoredEvents(events);
      }

      // If active user is this planner, log them out
      const curUser = localStorage.getItem('tiketi_user');
      if (curUser) {
        try {
          const parsed = JSON.parse(curUser);
          if (parsed.id === plannerId) {
            localStorage.removeItem('token');
            localStorage.removeItem('tiketi_user');
            localStorage.removeItem('tiketi_role');
          }
        } catch (e) {}
      }

      return { success: true };
    }
  }
};
