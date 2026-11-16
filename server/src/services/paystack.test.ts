import { describe, it, expect } from 'vitest';
import { calculateBuyerFee } from './paystack.js';

describe('calculateBuyerFee acceptance criteria', () => {
  const tests = [
    { subtotal: 1000, expected: 1116.76 },
    { subtotal: 2000, expected: 2131.98 },
    { subtotal: 3000, expected: 3248.74 },
    { subtotal: 5000, expected: 5279.19 },
    { subtotal: 10000, expected: 10355.33 },
    { subtotal: 20000, expected: 20507.62 },
  ];

  for (const t of tests) {
    it(`should charge ₦${t.expected.toLocaleString()} for a ₦${t.subtotal.toLocaleString()} ticket`, () => {
      const flatFee = 100; // 1 ticket
      const buyerFee = calculateBuyerFee(t.subtotal + flatFee);
      const total = Math.round((t.subtotal + flatFee + buyerFee) * 100) / 100;
      expect(total).toBe(t.expected);
    });
  }
});

