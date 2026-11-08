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
  category?: string;
  poster_url?: string | null;
  banner_url?: string | null;
  approval_status?: 'pending' | 'approved' | 'rejected';
  status: 'draft' | 'active' | 'ended' | 'cancelled' | 'taken_down';
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
  inviteConfirmedAt?: string | null;
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
  inviteConfirmedAt?: string | null;
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
  processingFeeRate: number;
  processingFeeCap: number;
  vatRate: number;
  paymentWindowMinutes: number;
  announcementBanner: string;
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
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
