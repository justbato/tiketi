export type UserRole = 'admin' | 'owner' | 'model' | 'staff' | 'buyer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  status: 'active' | 'invited' | 'suspended' | 'revoked' | 'terminated';
}

export interface Event {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  venue: string;
  eventDate: string;
  timezone: string;
  salesEndDate: string;
  capacity: number;
  bannerUrl: string;
  posterUrl: string;
  category?: string;        // dynamic, from server
  poster_url?: string | null; // snake_case alias from API
  status: 'draft' | 'active' | 'ended' | 'taken_down';
  createdAt: string;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: number;
  genderPricing?: boolean;
  malePrice?: number;
  femalePrice?: number;
  gender?: 'male' | 'female' | 'any';
  quantity: number;
  admits: number;
  imageUrl: string;
  aspectRatio: string;
  sortOrder: number;
  archived: boolean;
  sold: number;
  locked: boolean;
}

export interface Model {
  id: string;
  eventId: string;
  name: string;
  email: string;
  referralCode: string;
  status: 'invited' | 'active' | 'suspended' | 'revoked' | 'terminated' | 'removed';
  totalSold: number;
  revenue: number;
  createdAt: string;
  inviteToken?: string;
}

export interface Order {
  id: string;
  reference: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  eventId: string;
  modelId: string;
  status: 'pending' | 'paid' | 'expired' | 'refunded';
  total: number;
  ticketPrice: number;
  serviceFee: number;
  paymentReference: string;
  createdAt: string;
  expiresAt: string;
  lines: OrderLine[];
}

export interface OrderLine {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  price: number;
  admits: number;
}

export interface Ticket {
  id: string;
  orderId: string;
  ticketTypeId: string;
  ticketTypeName: string;
  modelId: string;
  code: string;
  admits: number;
  checkedIn: boolean;
  checkedInAt: string | null;
  checkedInBy: string | null;
  checkInMethod: 'code' | 'qr' | null;
  createdAt: string;
}

export interface GateStaff {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  assignedEvents: string[];
  status: 'active' | 'invited' | 'suspended' | 'revoked' | 'terminated';
  lastActivity: string | null;
  createdAt: string;
  inviteToken?: string;
}

export interface Payout {
  id: string;
  ownerId: string;
  orderId: string;
  gross: number;
  platformFee: number;
  ownerAmount: number;
  status: 'pending' | 'settled' | 'failed';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
}

export interface PlatformSettings {
  platformFeePercent: number;
  monnifyFeeRate: number;
  monnifyFeeCap: number;
  vatRate: number;
  paymentWindowMinutes: number;
  announcementBanner: string;
}

// Mock data
export const mockSettings: PlatformSettings = {
  platformFeePercent: 5,
  monnifyFeeRate: 1.5,
  monnifyFeeCap: 2000,
  vatRate: 7.5,
  paymentWindowMinutes: 20,
  announcementBanner: '',
};

export const mockEvents: Event[] = [
  {
    id: 'evt_1',
    ownerId: 'owner_1',
    name: 'UNILAG Freshers Night 2026',
    description: 'The biggest campus welcome festival for new and returning students. Live stage performances, celebrity guest DJs, food and drink vendors, and non-stop rave vibrations.',
    venue: 'UNILAG Sports Complex, Akoka, Lagos',
    eventDate: '2026-03-15T19:00:00',
    timezone: 'Africa/Lagos',
    salesEndDate: '2026-03-16',
    capacity: 2000,
    bannerUrl: '/posters/unifest_concert.jpg',
    posterUrl: '/posters/unifest_concert.jpg',
    status: 'active',
    createdAt: '2026-01-10',
  },
  {
    id: 'evt_2',
    ownerId: 'owner_1',
    name: 'Convocation Gala & Awards Night',
    description: 'An evening of prestige and elegance celebrating academic excellence. Black tie gala banquet dinner, live jazz orchestra, awards presentation, and VIP champagne reception.',
    venue: 'Eko Hotels & Suites, Grand Ballroom, Victoria Island',
    eventDate: '2026-04-20T18:00:00',
    timezone: 'Africa/Lagos',
    salesEndDate: '2026-04-21',
    capacity: 500,
    bannerUrl: '/posters/gala_night.jpg',
    posterUrl: '/posters/gala_night.jpg',
    status: 'active',
    createdAt: '2026-02-01',
  },
  {
    id: 'evt_3',
    ownerId: 'owner_2',
    name: 'AfroBeats Campus Carnival 2026',
    description: 'The ultimate university music festival featuring top AfroBeats headliners, fireworks displays, dance battles, cultural food stalls, and an all-night festival vibe.',
    venue: 'Tafawa Balewa Square (TBS), Lagos Island',
    eventDate: '2026-05-02T16:00:00',
    timezone: 'Africa/Lagos',
    salesEndDate: '2026-05-03',
    capacity: 3500,
    bannerUrl: '/posters/afrobeats_carnival.jpg',
    posterUrl: '/posters/afrobeats_carnival.jpg',
    status: 'active',
    createdAt: '2026-02-15',
  },
  {
    id: 'evt_4',
    ownerId: 'owner_1',
    name: 'Departmental Honors Dinner & Awards',
    description: 'Annual formal dinner and merit awards night honoring top students, graduating seniors, esteemed faculty, and technology industry alumni leaders.',
    venue: 'Faculty of Science Main Auditorium, Akoka',
    eventDate: '2026-05-18T18:00:00',
    timezone: 'Africa/Lagos',
    salesEndDate: '2026-05-19',
    capacity: 400,
    bannerUrl: '/posters/gala_night.jpg',
    posterUrl: '/posters/gala_night.jpg',
    status: 'active',
    createdAt: '2026-02-20',
  },
  {
    id: 'evt_5',
    ownerId: 'owner_2',
    name: 'Electric Neon Rave Festival',
    description: 'Immerse yourself in UV neon body paint, electrifying amapiano & EDM sets, laser shows, and high-energy music in a beachfront festival setup.',
    venue: 'Landmark Beach Arena, Oniru, Victoria Island',
    eventDate: '2026-06-06T20:00:00',
    timezone: 'Africa/Lagos',
    salesEndDate: '2026-06-07',
    capacity: 2500,
    bannerUrl: '/posters/unifest_concert.jpg',
    posterUrl: '/posters/unifest_concert.jpg',
    status: 'active',
    createdAt: '2026-02-22',
  },
];

export const mockTicketTypes: TicketType[] = [
  { id: 'tt_1', eventId: 'evt_1', name: 'Regular Entry', price: 3000, quantity: 1500, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 0, archived: false, sold: 847, locked: true },
  { id: 'tt_2', eventId: 'evt_1', name: 'VIP Pass', price: 10000, quantity: 200, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 1, archived: false, sold: 156, locked: true },
  { id: 'tt_3', eventId: 'evt_1', name: 'Table for 4', price: 35000, quantity: 50, admits: 4, imageUrl: '', aspectRatio: '3:1', sortOrder: 2, archived: false, sold: 23, locked: false },
  { id: 'tt_4', eventId: 'evt_1', name: 'Table for 6', price: 50000, quantity: 20, admits: 6, imageUrl: '', aspectRatio: '3:1', sortOrder: 3, archived: false, sold: 8, locked: false },
  { id: 'tt_5', eventId: 'evt_2', name: 'Single Standard', price: 15000, quantity: 400, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 0, archived: false, sold: 234, locked: true },
  { id: 'tt_6', eventId: 'evt_2', name: 'VVIP Table (6 Guests)', price: 80000, quantity: 20, admits: 6, imageUrl: '', aspectRatio: '3:1', sortOrder: 1, archived: false, sold: 12, locked: false },
  { id: 'tt_7', eventId: 'evt_3', name: 'Early Bird Pass', price: 2500, quantity: 800, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 0, archived: false, sold: 620, locked: true },
  { id: 'tt_8', eventId: 'evt_3', name: 'Regular Festival Pass', price: 4000, quantity: 2000, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 1, archived: false, sold: 1150, locked: true },
  { id: 'tt_9', eventId: 'evt_3', name: 'VIP Frontstage Access', price: 12000, quantity: 300, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 2, archived: false, sold: 180, locked: false },
  { id: 'tt_10', eventId: 'evt_3', name: 'Squad Pass (Admits 4)', price: 14000, quantity: 100, admits: 4, imageUrl: '', aspectRatio: '3:1', sortOrder: 3, archived: false, sold: 45, locked: false },
  { id: 'tt_11', eventId: 'evt_4', name: 'Student Ticket', price: 5000, quantity: 250, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 0, archived: false, sold: 180, locked: true },
  { id: 'tt_12', eventId: 'evt_4', name: 'Alumni & VIP Guest', price: 10000, quantity: 100, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 1, archived: false, sold: 75, locked: false },
  { id: 'tt_13', eventId: 'evt_4', name: 'Faculty Table (Admits 5)', price: 45000, quantity: 20, admits: 5, imageUrl: '', aspectRatio: '3:1', sortOrder: 2, archived: false, sold: 12, locked: false },
  { id: 'tt_14', eventId: 'evt_5', name: 'Glow General Pass', price: 3500, quantity: 1500, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 0, archived: false, sold: 890, locked: true },
  { id: 'tt_15', eventId: 'evt_5', name: 'Neon VIP', price: 8000, quantity: 400, admits: 1, imageUrl: '', aspectRatio: '3:1', sortOrder: 1, archived: false, sold: 260, locked: false },
  { id: 'tt_16', eventId: 'evt_5', name: 'Rave Crew Table (Admits 4)', price: 30000, quantity: 50, admits: 4, imageUrl: '', aspectRatio: '3:1', sortOrder: 2, archived: false, sold: 28, locked: false },
];

export const mockModels: Model[] = [
  { id: 'mod_1', eventId: 'evt_1', name: 'Adaeze Okonkwo', email: 'adaeze@example.com', referralCode: 'TKT-AX7M', status: 'active', totalSold: 342, revenue: 1456000, createdAt: '2026-01-12' },
  { id: 'mod_2', eventId: 'evt_1', name: 'Chidi Nwosu', email: 'chidi@example.com', referralCode: 'TKT-BK3P', status: 'active', totalSold: 287, revenue: 1198000, createdAt: '2026-01-12' },
  { id: 'mod_3', eventId: 'evt_1', name: 'Fatima Ibrahim', email: 'fatima@example.com', referralCode: 'TKT-CM9Q', status: 'active', totalSold: 215, revenue: 876000, createdAt: '2026-01-14' },
  { id: 'mod_4', eventId: 'evt_1', name: 'Emeka Eze', email: 'emeka@example.com', referralCode: 'TKT-DN2R', status: 'active', totalSold: 189, revenue: 734000, createdAt: '2026-01-15' },
  { id: 'mod_5', eventId: 'evt_1', name: 'Blessing Okafor', email: 'blessing@example.com', referralCode: 'TKT-EP5S', status: 'suspended', totalSold: 143, revenue: 567000, createdAt: '2026-01-16' },
  { id: 'mod_6', eventId: 'evt_1', name: 'Tunde Bakare', email: 'tunde@example.com', referralCode: 'TKT-FQ8T', status: 'terminated', totalSold: 88, revenue: 264000, createdAt: '2026-02-20' },
  { id: 'mod_7', eventId: 'evt_1', name: 'Kareem Balogun', email: 'kareem@example.com', referralCode: 'TKT-KB91', status: 'invited', totalSold: 0, revenue: 0, createdAt: '2026-03-01' },
];

export const mockOrders: Order[] = [
  {
    id: 'ord_1', reference: 'TKT-ORD-7K4M9XQ2', buyerName: 'John Adeyemi', buyerEmail: 'john@gmail.com', buyerPhone: '08012345678',
    eventId: 'evt_1', modelId: 'mod_1', status: 'paid', total: 3045, ticketPrice: 3000, serviceFee: 45,
    paymentReference: 'MNFP-20260301-ABC123', createdAt: '2026-03-01T14:30:00', expiresAt: '2026-03-01T14:50:00',
    lines: [{ id: 'ol_1', orderId: 'ord_1', ticketTypeId: 'tt_1', ticketTypeName: 'Regular', quantity: 1, price: 3000, admits: 1 }],
  },
  {
    id: 'ord_2', reference: 'TKT-ORD-3H8N2WZ5', buyerName: 'Sarah Mohammed', buyerEmail: 'sarah@gmail.com', buyerPhone: '08098765432',
    eventId: 'evt_1', modelId: 'mod_1', status: 'paid', total: 35525, ticketPrice: 35000, serviceFee: 525,
    paymentReference: 'MNFP-20260302-DEF456', createdAt: '2026-03-02T10:15:00', expiresAt: '2026-03-02T10:35:00',
    lines: [{ id: 'ol_2', orderId: 'ord_2', ticketTypeId: 'tt_3', ticketTypeName: 'Table for 4', quantity: 1, price: 35000, admits: 4 }],
  },
  {
    id: 'ord_3', reference: 'TKT-ORD-9P2K7YR1', buyerName: 'David Ogunleye', buyerEmail: 'david@gmail.com', buyerPhone: '08055551234',
    eventId: 'evt_1', modelId: 'mod_2', status: 'pending', total: 10150, ticketPrice: 10000, serviceFee: 150,
    paymentReference: 'MNFP-20260305-GHI789', createdAt: '2026-03-05T16:45:00', expiresAt: '2026-03-05T17:05:00',
    lines: [{ id: 'ol_3', orderId: 'ord_3', ticketTypeId: 'tt_2', ticketTypeName: 'VIP', quantity: 1, price: 10000, admits: 1 }],
  },
  {
    id: 'ord_4', reference: 'TKT-ORD-2M5P8KX3', buyerName: 'Amina Lawal', buyerEmail: 'amina.l@gmail.com', buyerPhone: '08077771234',
    eventId: 'evt_1', modelId: '', status: 'paid', total: 6090, ticketPrice: 6000, serviceFee: 90,
    paymentReference: 'MNFP-20260306-JKL012', createdAt: '2026-03-06T09:20:00', expiresAt: '2026-03-06T09:40:00',
    lines: [{ id: 'ol_4', orderId: 'ord_4', ticketTypeId: 'tt_1', ticketTypeName: 'Regular', quantity: 2, price: 3000, admits: 1 }],
  },
];

export const mockTickets: Ticket[] = [
  { id: 'tkt_1', orderId: 'ord_1', ticketTypeId: 'tt_1', ticketTypeName: 'Regular', modelId: 'mod_1', code: '7K4M 9XQ2', admits: 1, checkedIn: true, checkedInAt: '2026-03-15T19:23:00', checkedInBy: 'staff_1', checkInMethod: 'qr', createdAt: '2026-03-01T14:32:00' },
  { id: 'tkt_2', orderId: 'ord_2', ticketTypeId: 'tt_3', ticketTypeName: 'Table for 4', modelId: 'mod_1', code: '3H8N 2WZ5', admits: 4, checkedIn: false, checkedInAt: null, checkedInBy: null, checkInMethod: null, createdAt: '2026-03-02T10:17:00' },
  { id: 'tkt_3', orderId: 'ord_2', ticketTypeId: 'tt_3', ticketTypeName: 'Table for 4', modelId: 'mod_1', code: '5P9R 4VX7', admits: 4, checkedIn: false, checkedInAt: null, checkedInBy: null, checkInMethod: null, createdAt: '2026-03-02T10:17:00' },
  { id: 'tkt_4', orderId: 'ord_1', ticketTypeId: 'tt_1', ticketTypeName: 'Regular', modelId: 'mod_2', code: 'BK3P QM8N', admits: 1, checkedIn: true, checkedInAt: '2026-03-15T19:45:00', checkedInBy: 'staff_1', checkInMethod: 'code', createdAt: '2026-03-03T11:00:00' },
];

export const mockGateStaff: GateStaff[] = [
  { id: 'staff_1', ownerId: 'owner_1', name: 'Kelechi Amadi', email: 'kelechi@example.com', assignedEvents: ['evt_1'], status: 'active', lastActivity: '2026-03-15T19:45:00', createdAt: '2026-03-01' },
  { id: 'staff_2', ownerId: 'owner_1', name: 'Amina Yusuf', email: 'amina@example.com', assignedEvents: ['evt_1', 'evt_2'], status: 'suspended', lastActivity: '2026-03-10T14:20:00', createdAt: '2026-03-05' },
  { id: 'staff_3', ownerId: 'owner_1', name: 'Oluwaseun Adeleke', email: 'seun@example.com', assignedEvents: ['evt_2'], status: 'terminated', lastActivity: '2026-03-08T09:00:00', createdAt: '2026-02-28' },
  { id: 'staff_4', ownerId: 'owner_1', name: 'Ibrahim Danladi', email: 'ibrahim@example.com', assignedEvents: ['evt_1'], status: 'revoked', lastActivity: '2026-03-04T12:00:00', createdAt: '2026-02-25' },
];

export const mockPayouts: Payout[] = [
  { id: 'pay_1', ownerId: 'owner_1', orderId: 'ord_1', gross: 3000, platformFee: 150, ownerAmount: 2850, status: 'settled', createdAt: '2026-03-01' },
  { id: 'pay_2', ownerId: 'owner_1', orderId: 'ord_2', gross: 35000, platformFee: 1750, ownerAmount: 33250, status: 'pending', createdAt: '2026-03-02' },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'al_1', userId: 'admin_1', action: 'settings.update', entityType: 'platform_settings', entityId: 'settings_1', details: 'Platform fee changed from 3% to 5%', createdAt: '2026-02-01T10:00:00' },
  { id: 'al_2', userId: 'owner_1', action: 'model.remove', entityType: 'model', entityId: 'mod_6', details: 'Model Tunde Bakare removed from event', createdAt: '2026-02-20T15:30:00' },
  { id: 'al_3', userId: 'staff_1', action: 'ticket.checkin', entityType: 'ticket', entityId: 'tkt_1', details: 'Ticket 7K4M 9XQ2 checked in via QR', createdAt: '2026-03-15T19:23:00' },
  { id: 'al_4', userId: 'owner_1', action: 'ticket.undo_checkin', entityType: 'ticket', entityId: 'tkt_4', details: 'Check-in undone. Reason: Duplicate scan error', createdAt: '2026-03-15T20:10:00' },
  { id: 'al_5', userId: 'admin_1', action: 'event.takedown', entityType: 'event', entityId: 'evt_3', details: 'Event taken down for policy violation', createdAt: '2026-03-10T08:00:00' },
];

export const mockSalesData = [
  { date: 'Mar 1', sales: 45, revenue: 135000 },
  { date: 'Mar 2', sales: 62, revenue: 186000 },
  { date: 'Mar 3', sales: 38, revenue: 114000 },
  { date: 'Mar 4', sales: 71, revenue: 213000 },
  { date: 'Mar 5', sales: 55, revenue: 165000 },
  { date: 'Mar 6', sales: 89, revenue: 267000 },
  { date: 'Mar 7', sales: 94, revenue: 282000 },
  { date: 'Mar 8', sales: 67, revenue: 201000 },
  { date: 'Mar 9', sales: 112, revenue: 336000 },
  { date: 'Mar 10', sales: 98, revenue: 294000 },
  { date: 'Mar 11', sales: 134, revenue: 402000 },
  { date: 'Mar 12', sales: 156, revenue: 468000 },
  { date: 'Mar 13', sales: 178, revenue: 534000 },
  { date: 'Mar 14', sales: 203, revenue: 609000 },
];

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function generateTicketCode(): string {
  const chars = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += ' ';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
