import { describe, expect, it } from 'vitest';
import { calculateOrderInvoice } from '../src/pricing';

describe('calculateOrderInvoice', () => {
  it('1. calculates standard retail order subtotal, default 8.5% tax, and shipping', () => {
    const invoice = calculateOrderInvoice({
      orderId: 'ORD-101',
      items: [{ sku: 'KB-01', unitPriceCents: 5000, quantity: 1 }],
    });

    expect(invoice.subtotalCents).toBe(5000);
    expect(invoice.discountCents).toBe(0);
    expect(invoice.taxRatePercent).toBe(8.5);
    expect(invoice.taxCents).toBe(425);
    expect(invoice.shippingCents).toBe(995);
    expect(invoice.totalCents).toBe(6420);
  });

  it('2. applies explicit promotional percentage discount accurately', () => {
    const invoice = calculateOrderInvoice({
      orderId: 'ORD-102',
      items: [{ sku: 'MN-01', unitPriceCents: 8000, quantity: 1 }],
      overrideDiscountPercent: 25,
    });

    expect(invoice.discountPercent).toBe(25);
    expect(invoice.discountCents).toBe(2000);
    expect(invoice.taxableAmountCents).toBe(6000);
    expect(invoice.taxCents).toBe(510);
    expect(invoice.totalCents).toBe(7505);
  });

  it('3. grants free shipping when post-discount subtotal meets threshold ($100.00)', () => {
    const invoice = calculateOrderInvoice({
      orderId: 'ORD-103',
      items: [{ sku: 'DK-01', unitPriceCents: 6000, quantity: 2 }],
      overrideDiscountPercent: 10,
    });

    expect(invoice.taxableAmountCents).toBe(10800);
    expect(invoice.shippingCents).toBe(0);
  });

  it('4. honors explicit 0% promotional discount override without falling back to loyalty tier', () => {
    const invoice = calculateOrderInvoice({
      orderId: 'ORD-104',
      items: [{ sku: 'CH-01', unitPriceCents: 4000, quantity: 1 }],
      loyaltyTierDiscountPercent: 15,
      overrideDiscountPercent: 0,
    });

    expect(invoice.discountPercent).toBe(0);
    expect(invoice.discountCents).toBe(0);
  });

  it('5. honors explicit 0% tax rate for tax-exempt B2B orders', () => {
    const invoice = calculateOrderInvoice({
      orderId: 'ORD-105-B2B-EXEMPT',
      items: [{ sku: 'SRV-RACK', unitPriceCents: 20000, quantity: 1 }],
      taxRatePercent: 0,
    });

    expect(invoice.taxRatePercent).toBe(0);
    expect(invoice.taxCents).toBe(0);
    expect(invoice.totalCents).toBe(20000);
  });

  it('6. falls back to default 8.5% tax rate when taxRatePercent is null or undefined', () => {
    const nullTaxInvoice = calculateOrderInvoice({
      orderId: 'ORD-106A',
      items: [{ sku: 'CB-01', unitPriceCents: 2000, quantity: 1 }],
      taxRatePercent: null,
    });
    const undefinedTaxInvoice = calculateOrderInvoice({
      orderId: 'ORD-106B',
      items: [{ sku: 'CB-01', unitPriceCents: 2000, quantity: 1 }],
    });

    expect(nullTaxInvoice.taxRatePercent).toBe(8.5);
    expect(nullTaxInvoice.taxCents).toBe(170);
    expect(undefinedTaxInvoice.taxRatePercent).toBe(8.5);
    expect(undefinedTaxInvoice.taxCents).toBe(170);
  });

  it('7. rejects orders with negative item price or zero quantity', () => {
    expect(() =>
      calculateOrderInvoice({
        orderId: 'ORD-107A',
        items: [{ sku: 'BAD-PRICE', unitPriceCents: -100, quantity: 1 }],
      }),
    ).toThrow(/Negative unit price/);

    expect(() =>
      calculateOrderInvoice({
        orderId: 'ORD-107B',
        items: [{ sku: 'BAD-QTY', unitPriceCents: 500, quantity: 0 }],
      }),
    ).toThrow(/Invalid quantity/);
  });

  it('8. rounds fractional cent tax and discount amounts deterministically', () => {
    const invoice = calculateOrderInvoice({
      orderId: 'ORD-108',
      items: [{ sku: 'PEN-01', unitPriceCents: 333, quantity: 3 }],
      overrideDiscountPercent: 10,
      taxRatePercent: 7.25,
    });

    expect(invoice.subtotalCents).toBe(999);
    expect(invoice.discountCents).toBe(100);
    expect(invoice.taxableAmountCents).toBe(899);
    expect(invoice.taxCents).toBe(65);
    expect(invoice.totalCents).toBe(1959);
  });
});
