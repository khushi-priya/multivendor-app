"use strict";

const { AppError } = require("../utils/errors");

const DEFAULT_SHIPPING_SETTINGS = Object.freeze({
  baseFee: "25.00",
  baseWeightKg: 1,
  additionalWeightRate: "10.00",
  additionalWeightStepKg: 1,
  zones: [{ name: "All pincodes", pincodes: ["*"], surcharge: "0.00", available: true }],
});

function toCents(value, label = "Amount") {
  const raw = String(value ?? "0").trim();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(raw);
  if (!match) throw new AppError(400, `${label} must be a valid amount with at most two decimal places.`);
  const sign = match[1] === "-" ? -1n : 1n;
  const cents = BigInt(match[2]) * 100n + BigInt((match[3] || "").padEnd(2, "0"));
  const result = sign * cents;
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new AppError(400, `${label} is outside the supported range.`);
  }
  return Number(result);
}

function fromCents(cents) {
  const value = Number(cents);
  return `${Math.trunc(value / 100)}.${String(Math.abs(value % 100)).padStart(2, "0")}`;
}

function normalizeShippingSettings(settings) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return structuredClone(DEFAULT_SHIPPING_SETTINGS);
  }
  return {
    baseFee: settings.baseFee ?? DEFAULT_SHIPPING_SETTINGS.baseFee,
    baseWeightKg: settings.baseWeightKg ?? DEFAULT_SHIPPING_SETTINGS.baseWeightKg,
    additionalWeightRate:
      settings.additionalWeightRate ?? DEFAULT_SHIPPING_SETTINGS.additionalWeightRate,
    additionalWeightStepKg:
      settings.additionalWeightStepKg ?? DEFAULT_SHIPPING_SETTINGS.additionalWeightStepKg,
    zones: Array.isArray(settings.zones)
      ? settings.zones
      : structuredClone(DEFAULT_SHIPPING_SETTINGS.zones),
  };
}

function weightInKg(value, unit, label) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError(400, `${label} has no valid shipping weight. Ask the shop to configure its product weight.`);
  }
  return unit === "g" ? amount / 1000 : amount;
}

function rateBasisPoints(value) {
  const rate = String(value ?? "0");
  if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(rate)) {
    throw new AppError(400, "A product has an invalid GST rate configuration.");
  }
  const [whole, fraction = ""] = rate.split(".");
  const basisPoints = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (basisPoints < 0 || basisPoints > 2800) {
    throw new AppError(400, "GST rate must be between 0 and 28 percent.");
  }
  return basisPoints;
}

function calculateTax(priceCents, quantity, listing, shopState, deliveryState, label) {
  const gstApplicable = Boolean(listing.gstApplicable);
  const rateBps = gstApplicable ? rateBasisPoints(listing.gstRate) : 0;
  const grossCents = priceCents * quantity;
  if (!gstApplicable || rateBps === 0) {
    return {
      taxableCents: grossCents,
      taxCents: 0,
      lineTotalCents: grossCents,
      snapshot: {
        gstApplicable,
        gstRate: rateBps / 100,
        priceIncludesGst: Boolean(listing.priceIncludesGst),
        hsnCode: listing.hsnCode || null,
        taxableValue: fromCents(grossCents),
        taxAmount: "0.00",
        components: { cgst: "0.00", sgst: "0.00", igst: "0.00" },
      },
    };
  }

  if (!shopState || !deliveryState) {
    throw new AppError(400, `GST cannot be calculated for ${label} until the shop dispatch state and delivery-address state are available.`);
  }
  const inclusive = Boolean(listing.priceIncludesGst);
  const taxableCents = inclusive
    ? Math.floor((grossCents * 10000 + Math.floor((10000 + rateBps) / 2)) / (10000 + rateBps))
    : grossCents;
  const taxCents = inclusive
    ? grossCents - taxableCents
    : Math.floor((taxableCents * rateBps + 5000) / 10000);
  const lineTotalCents = inclusive ? grossCents : taxableCents + taxCents;
  let cgstCents = 0;
  let sgstCents = 0;
  let igstCents = 0;
  if (shopState.trim().toLowerCase() === deliveryState.trim().toLowerCase()) {
    cgstCents = Math.floor(taxCents / 2);
    sgstCents = taxCents - cgstCents;
  } else {
    igstCents = taxCents;
  }

  return {
    taxableCents,
    taxCents,
    lineTotalCents,
    snapshot: {
      gstApplicable: true,
      gstRate: rateBps / 100,
      priceIncludesGst: inclusive,
      hsnCode: listing.hsnCode || null,
      taxableValue: fromCents(taxableCents),
      taxAmount: fromCents(taxCents),
      components: {
        cgst: fromCents(cgstCents),
        sgst: fromCents(sgstCents),
        igst: fromCents(igstCents),
      },
    },
  };
}

function calculateShipping(weightKg, postalCode, shippingSettings) {
  const settings = normalizeShippingSettings(shippingSettings);
  const zone = settings.zones.find((candidate) =>
    (candidate.pincodes || []).some((code) => String(code) === String(postalCode)),
  ) || settings.zones.find((candidate) =>
    (candidate.pincodes || []).includes("*"),
  );
  if (!zone || zone.available === false) {
    throw new AppError(400, "Delivery is not available at this postal code.");
  }
  if (zone.maxWeightKg != null && weightKg > Number(zone.maxWeightKg)) {
    throw new AppError(400, "The shipment exceeds the maximum supported weight for this delivery zone.");
  }
  const baseWeightKg = Number(settings.baseWeightKg);
  const weightStepKg = Number(settings.additionalWeightStepKg);
  if (!Number.isFinite(baseWeightKg) || baseWeightKg < 0 ||
      !Number.isFinite(weightStepKg) || weightStepKg <= 0) {
    throw new AppError(500, "Shop shipping settings are invalid. Please contact the shop.");
  }
  const additionalSlabs = weightKg > baseWeightKg
    ? Math.ceil((weightKg - baseWeightKg) / weightStepKg)
    : 0;
  const baseFeeCents = toCents(settings.baseFee, "Base delivery charge");
  const weightRateCents = toCents(settings.additionalWeightRate, "Additional weight charge");
  const surchargeCents = toCents(zone.surcharge || "0", "Delivery zone surcharge");
  if ([baseFeeCents, weightRateCents, surchargeCents].some((amount) => amount < 0)) {
    throw new AppError(500, "Shop shipping settings contain a negative charge.");
  }
  const deliveryCents = baseFeeCents + additionalSlabs * weightRateCents + surchargeCents;
  return {
    deliveryCents,
    snapshot: {
      zoneName: zone.name,
      postalCode: String(postalCode),
      weightKg: Number(weightKg.toFixed(3)),
      baseFee: fromCents(baseFeeCents),
      baseWeightKg,
      additionalWeightStepKg: weightStepKg,
      additionalWeightSlabs: additionalSlabs,
      additionalWeightRate: fromCents(weightRateCents),
      weightCharge: fromCents(additionalSlabs * weightRateCents),
      locationSurcharge: fromCents(surchargeCents),
      deliveryFee: fromCents(deliveryCents),
    },
  };
}

function calculateOrderPricing({ items, shop, address }) {
  let taxableSubtotalCents = 0;
  let taxTotalCents = 0;
  let finalItemTotalCents = 0;
  let totalWeightKg = 0;
  const orderItems = items.map((item) => {
    const listing = item.listing;
    const variant = listing.variant;
    const product = variant.product;
    const unitPriceCents = toCents(listing.retailPrice, "Product price");
    const weight = variant.weight != null
      ? weightInKg(variant.weight, variant.weightUnit, product.name)
      : weightInKg(product.weight, product.weightUnit, product.name);
    const itemWeightKg = weight * item.quantity;
    const tax = calculateTax(
      unitPriceCents,
      item.quantity,
      listing,
      shop.state,
      address.state,
      product.name,
    );
    taxableSubtotalCents += tax.taxableCents;
    taxTotalCents += tax.taxCents;
    finalItemTotalCents += tax.lineTotalCents;
    totalWeightKg += itemWeightKg;
    return {
      productId: listing.productId,
      productVariantId: variant.id,
      productName: product.name,
      variantName: variant.variantName,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice: fromCents(unitPriceCents),
      totalPrice: fromCents(tax.lineTotalCents),
      taxableValue: fromCents(tax.taxableCents),
      taxAmount: fromCents(tax.taxCents),
      taxSnapshot: tax.snapshot,
      weightKg: Number(itemWeightKg.toFixed(3)),
    };
  });
  const shipping = calculateShipping(
    totalWeightKg,
    address.postalCode,
    shop.shippingSettings,
  );
  return {
    items: orderItems,
    subtotal: fromCents(taxableSubtotalCents),
    taxAmount: fromCents(taxTotalCents),
    deliveryFee: fromCents(shipping.deliveryCents),
    totalAmount: fromCents(finalItemTotalCents + shipping.deliveryCents),
    totalWeightKg: Number(totalWeightKg.toFixed(3)),
    taxBreakdown: {
      taxableValue: fromCents(taxableSubtotalCents),
      taxAmount: fromCents(taxTotalCents),
      items: orderItems.map((item) => ({
        productId: item.productId,
        productVariantId: item.productVariantId,
        ...item.taxSnapshot,
      })),
    },
    shippingSnapshot: shipping.snapshot,
  };
}

module.exports = {
  DEFAULT_SHIPPING_SETTINGS,
  calculateOrderPricing,
  normalizeShippingSettings,
  toCents,
  fromCents,
};
