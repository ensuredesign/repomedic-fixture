export interface OrderLineItem {
  sku: string;
  unitPriceCents: number;
  quantity: number;
}

export interface OrderInput {
  orderId: string;
  items: OrderLineItem[];
  loyaltyTierDiscountPercent?: number;
  overrideDiscountPercent?: number | null;
  taxRatePercent?: number | null;
  freeShippingThresholdCents?: number;
  baseShippingCents?: number;
}

export interface OrderInvoice {
  orderId: string;
  subtotalCents: number;
  discountPercent: number;
  discountCents: number;
  taxableAmountCents: number;
  taxRatePercent: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

export const DEFAULT_TAX_RATE_PERCENT = 8.5;
export const DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS = 10000;
export const DEFAULT_BASE_SHIPPING_CENTS = 995;

export function resolveDiscountPercent(
  overrideDiscountPercent?: number | null,
  loyaltyTierDiscountPercent = 0,
): number {
  const effective = overrideDiscountPercent ?? loyaltyTierDiscountPercent;
  if (effective < 0 || effective > 100) {
    throw new RangeError(`Invalid discount percentage: ${effective}`);
  }
  return effective;
}

export function resolveTaxRatePercent(
  taxRatePercent?: number | null,
  defaultRatePercent = DEFAULT_TAX_RATE_PERCENT,
): number {
  // BUG: Using logical OR treats an explicit 0% tax-exempt rate as falsy
  // and erroneously falls back to the 8.5% default tax rate.
  const effective = taxRatePercent || defaultRatePercent;
  if (effective < 0 || effective > 100) {
    throw new RangeError(`Invalid tax rate percentage: ${effective}`);
  }
  return effective;
}

export function calculateOrderInvoice(order: OrderInput): OrderInvoice {
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must contain at least one line item');
  }

  let subtotalCents = 0;
  for (const item of order.items) {
    if (item.unitPriceCents < 0) {
      throw new RangeError(`Negative unit price for SKU ${item.sku}`);
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new RangeError(`Invalid quantity for SKU ${item.sku}`);
    }
    subtotalCents += item.unitPriceCents * item.quantity;
  }

  const discountPercent = resolveDiscountPercent(
    order.overrideDiscountPercent,
    order.loyaltyTierDiscountPercent ?? 0,
  );
  const discountCents = Math.round((subtotalCents * discountPercent) / 100);
  const taxableAmountCents = Math.max(0, subtotalCents - discountCents);

  const taxRatePercent = resolveTaxRatePercent(order.taxRatePercent);
  const taxCents = Math.round((taxableAmountCents * taxRatePercent) / 100);

  const freeShippingThreshold =
    order.freeShippingThresholdCents ?? DEFAULT_FREE_SHIPPING_THRESHOLD_CENTS;
  const baseShipping = order.baseShippingCents ?? DEFAULT_BASE_SHIPPING_CENTS;
  const shippingCents = taxableAmountCents >= freeShippingThreshold ? 0 : baseShipping;

  const totalCents = taxableAmountCents + taxCents + shippingCents;

  return {
    orderId: order.orderId,
    subtotalCents,
    discountPercent,
    discountCents,
    taxableAmountCents,
    taxRatePercent,
    taxCents,
    shippingCents,
    totalCents,
  };
}
