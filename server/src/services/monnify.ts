import axios from 'axios';

// =============================================
// MONNIFY PAYMENT SERVICE
// =============================================

const MONNIFY_BASE_URL = 'https://api.monnify.com/api/v1';
const MONNIFY_SANDBOX_URL = 'https://sandbox.monnify.com/api/v1';

const baseUrl = process.env.NODE_ENV === 'production' ? MONNIFY_BASE_URL : MONNIFY_SANDBOX_URL;

interface MonnifyAuth {
  accessToken: string;
  expiresIn: number;
  expiresAt: number;
}

let authCache: MonnifyAuth | null = null;

/**
 * Get Monnify auth token with caching
 * Tokens are cached and refreshed 60s before expiry
 */
async function getAuthToken(): Promise<string> {
  if (authCache && Date.now() < authCache.expiresAt) {
    return authCache.accessToken;
  }

  const apiKey = process.env.MONNIFY_API_KEY;
  const secretKey = process.env.MONNIFY_SECRET_KEY;
  
  if (!apiKey || !secretKey) {
    throw new Error('Monnify credentials not configured');
  }

  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

  try {
    const response = await axios.post(
      `${baseUrl}/auth/login`,
      {},
      {
        headers: {
          Authorization: `Basic ${credentials}`
        },
        timeout: 10000, // 10s timeout
      }
    );

    authCache = {
      accessToken: response.data.responseBody.accessToken,
      expiresIn: response.data.responseBody.expiresIn,
      expiresAt: Date.now() + (response.data.responseBody.expiresIn - 60) * 1000
    };

    return authCache.accessToken;
  } catch (err) {
    // Clear cache on auth failure
    authCache = null;
    throw new Error('Failed to authenticate with Monnify');
  }
}

interface CreatePaymentParams {
  amount: number;
  reference: string;
  customerName: string;
  customerEmail: string;
}

interface MonnifyPaymentResponse {
  accountNumber: string;
  bankName: string;
  accountName: string;
  paymentReference: string;
}

/**
 * Create a Monnify payment (virtual account generation)
 */
export async function createMonnifyPayment(params: CreatePaymentParams): Promise<MonnifyPaymentResponse> {
  const token = await getAuthToken();
  const contractCode = process.env.MONNIFY_CONTRACT_CODE;
  
  if (!contractCode) {
    throw new Error('Monnify contract code not configured');
  }

  try {
    const response = await axios.post(
      `${baseUrl}/merchant/transactions/initiate`,
      {
        amount: params.amount,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        paymentReference: params.reference,
        paymentDescription: 'TiKeTi Ticket Purchase',
        currencyCode: 'NGN',
        contractCode,
        redirectUrl: process.env.FRONTEND_URL + '/payment/success',
        paymentMethods: ['ACCOUNT_TRANSFER']
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 15000, // 15s timeout
      }
    );

    const responseBody = response.data.responseBody;

    return {
      accountNumber: responseBody.accounts[0].accountNumber,
      bankName: responseBody.accounts[0].bankName,
      accountName: responseBody.accounts[0].accountName,
      paymentReference: responseBody.paymentReference
    };
  } catch (err) {
    if (axios.isAxiosError(err) && err.response) {
      console.error('Monnify API error:', err.response.data);
      throw new Error(`Payment initialization failed: ${err.response.data?.responseMessage || 'Unknown error'}`);
    }
    throw new Error('Payment initialization failed');
  }
}

/**
 * Calculate platform fees
 * Fees include: Monnify fee, VAT, and platform fee
 */
export function calculateFees(subtotal: number) {
  const settings = {
    monnify_fee_rate: 0.015, // 1.5%
    monnify_fee_cap: 2000,
    vat_rate: 0.075, // 7.5%
    platform_fee_percent: 0.05 // 5%
  };

  // Monnify fee (1.5% capped at 2000)
  const monnifyFee = Math.min(subtotal * settings.monnify_fee_rate, settings.monnify_fee_cap);

  // VAT on Monnify fee
  const vat = monnifyFee * settings.vat_rate;

  // Platform fee
  const platformFee = subtotal * settings.platform_fee_percent;

  const totalFees = monnifyFee + vat + platformFee;

  return {
    monnifyFee: Math.round(monnifyFee * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100
  };
}

/**
 * Verify Monnify payment status
 */
export async function verifyMonnifyPayment(paymentReference: string): Promise<any> {
  const token = await getAuthToken();

  try {
    const response = await axios.get(
      `${baseUrl}/merchant/transactions/query?paymentReference=${paymentReference}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        timeout: 10000,
      }
    );

    return response.data.responseBody;
  } catch (err) {
    throw new Error('Failed to verify payment');
  }
}
