import axios from 'axios';

// =============================================
// PAYSTACK SERVICE
// =============================================

const PAYSTACK_BASE = 'https://api.paystack.co';

function getHeaders() {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error('PAYSTACK_SECRET_KEY not configured');
  return {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  };
}

// ─────────────────────────────────────────────
// Bank list
// ─────────────────────────────────────────────
export interface PaystackBank {
  id: number;
  name: string;
  code: string;
  longcode: string;
}

export async function listBanks(): Promise<PaystackBank[]> {
  const res = await axios.get(`${PAYSTACK_BASE}/bank?currency=NGN&country=nigeria`, {
    headers: getHeaders(),
    timeout: 10000,
  });
  return res.data.data as PaystackBank[];
}

// ─────────────────────────────────────────────
// Resolve account name
// ─────────────────────────────────────────────
export async function resolveAccountName(
  account_number: string,
  bank_code: string
): Promise<string> {
  const res = await axios.get(
    `${PAYSTACK_BASE}/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
    { headers: getHeaders(), timeout: 10000 }
  );
  if (!res.data.status) throw new Error(res.data.message || 'Could not resolve account');
  return res.data.data.account_name as string;
}

// ─────────────────────────────────────────────
// Subaccounts
// ─────────────────────────────────────────────
export interface SubaccountParams {
  business_name: string;
  settlement_bank: string;   // bank code
  account_number: string;
  percentage_charge: number; // platform share %
  description?: string;
}

export interface SubaccountResult {
  subaccount_code: string;
  id: number;
  account_number: string;
  settlement_bank: string;
}

export async function createSubaccount(params: SubaccountParams): Promise<SubaccountResult> {
  const res = await axios.post(
    `${PAYSTACK_BASE}/subaccount`,
    {
      business_name: params.business_name,
      settlement_bank: params.settlement_bank,
      account_number: params.account_number,
      percentage_charge: params.percentage_charge,
      description: params.description || 'TiKiTi event organizer',
      primary_contact_email: undefined, // optional
    },
    { headers: getHeaders(), timeout: 15000 }
  );
  if (!res.data.status) throw new Error(res.data.message || 'Failed to create subaccount');
  return {
    subaccount_code: res.data.data.subaccount_code,
    id: res.data.data.id,
    account_number: res.data.data.account_number,
    settlement_bank: res.data.data.settlement_bank,
  };
}

/** Search existing subaccounts by account number. Returns first match or null. */
export async function findSubaccount(
  account_number: string,
  bank_code: string
): Promise<SubaccountResult | null> {
  try {
    // Paystack list subaccounts (up to 100)
    const res = await axios.get(`${PAYSTACK_BASE}/subaccount?perPage=100`, {
      headers: getHeaders(),
      timeout: 10000,
    });
    const list: any[] = res.data.data || [];
    const match = list.find(
      (s) => s.account_number === account_number && s.settlement_bank === bank_code
    );
    if (!match) return null;
    return {
      subaccount_code: match.subaccount_code,
      id: match.id,
      account_number: match.account_number,
      settlement_bank: match.settlement_bank,
    };
  } catch {
    return null;
  }
}

export async function updateSubaccount(
  subaccount_code: string,
  params: Partial<SubaccountParams>
): Promise<void> {
  await axios.put(
    `${PAYSTACK_BASE}/subaccount/${subaccount_code}`,
    params,
    { headers: getHeaders(), timeout: 15000 }
  );
}

// ─────────────────────────────────────────────
// Transactions
// ─────────────────────────────────────────────
export interface InitializeParams {
  email: string;
  amount_kobo: number;         // total in kobo
  reference: string;
  subaccount_code: string;
  transaction_charge_kobo: number; // platform share in kobo
  fee_bearer: 'account' | 'subaccount';
  callback_url?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializeResult {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(
  params: InitializeParams
): Promise<InitializeResult> {
  const body: Record<string, unknown> = {
    email: params.email,
    amount: params.amount_kobo,
    reference: params.reference,
    subaccount: params.subaccount_code,
    transaction_charge: params.transaction_charge_kobo,
    bearer: params.fee_bearer,
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
  };
  if (params.callback_url) body.callback_url = params.callback_url;
  if (params.metadata) body.metadata = params.metadata;

  const res = await axios.post(`${PAYSTACK_BASE}/transaction/initialize`, body, {
    headers: getHeaders(),
    timeout: 15000,
  });
  if (!res.data.status) throw new Error(res.data.message || 'Payment initialization failed');
  return {
    authorization_url: res.data.data.authorization_url,
    access_code: res.data.data.access_code,
    reference: res.data.data.reference,
  };
}

export interface VerifyResult {
  status: 'success' | 'failed' | 'abandoned' | string;
  reference: string;
  amount: number;   // kobo
  currency: string;
  paid_at: string | null;
  metadata: Record<string, unknown>;
  subaccount?: { subaccount_code: string };
}

export async function verifyTransaction(reference: string): Promise<VerifyResult> {
  const res = await axios.get(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: getHeaders(), timeout: 15000 }
  );
  if (!res.data.status) throw new Error(res.data.message || 'Verification failed');
  const d = res.data.data;
  return {
    status: d.status,
    reference: d.reference,
    amount: d.amount,
    currency: d.currency,
    paid_at: d.paid_at || null,
    metadata: d.metadata || {},
    subaccount: d.subaccount || undefined,
  };
}

// ─────────────────────────────────────────────
// Webhook signature verification
// ─────────────────────────────────────────────
import crypto from 'crypto';

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const hash = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Fee calculation (always backend-only)
// ─────────────────────────────────────────────
export interface FeeBreakdown {
  gross_naira: number;
  fee_percent: number;
  platform_fee_naira: number;
  organizer_share_naira: number;
  /** Platform share in kobo for Paystack transaction_charge */
  platform_fee_kobo: number;
  /** Total charge in kobo */
  gross_kobo: number;
}

export function calculateSplit(
  subtotal_naira: number,
  fee_percent: number
): FeeBreakdown {
  const platform_fee_naira = Math.round(subtotal_naira * (fee_percent / 100) * 100) / 100;
  const organizer_share_naira = Math.round((subtotal_naira - platform_fee_naira) * 100) / 100;
  return {
    gross_naira: subtotal_naira,
    fee_percent,
    platform_fee_naira,
    organizer_share_naira,
    platform_fee_kobo: Math.round(platform_fee_naira * 100),
    gross_kobo: Math.round(subtotal_naira * 100),
  };
}
