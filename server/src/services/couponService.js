"use strict";

const { Op } = require("sequelize");
const { Coupon, CouponRedemption } = require("../models");
const { AppError } = require("../utils/errors");
const { toCents, fromCents } = require("./orderPricing");

const RESERVATION_CONFLICT = "This coupon has reached its redemption limit.";

function normalizeCouponCode(value) {
  return String(value || "").trim().toUpperCase();
}

function validateCouponWindow(coupon) {
  const today = new Date().toISOString().slice(0, 10);
  if (coupon.status !== "active") {
    throw new AppError(422, "This coupon is inactive.");
  }
  if (coupon.startDate > today) {
    throw new AppError(422, "This coupon is not available yet.");
  }
  if (coupon.expiryDate < today) {
    throw new AppError(422, "This coupon has expired.");
  }
}

function calculateCouponDiscount(coupon, subtotal) {
  const subtotalCents = toCents(subtotal, "Order subtotal");
  const minimumCents = toCents(coupon.minimumOrderAmount, "Minimum order amount");
  if (subtotalCents < minimumCents) {
    throw new AppError(
      422,
      `This coupon requires a minimum order of ₹${fromCents(minimumCents)}.`,
    );
  }

  const valueCents = toCents(coupon.discountValue, "Coupon discount");
  let discountCents;
  if (coupon.discountType === "percentage") {
    if (valueCents <= 0 || valueCents > 10000) {
      throw new AppError(422, "This coupon has an invalid percentage discount.");
    }
    discountCents = Math.floor(
      (subtotalCents * valueCents + 5000) / 10000,
    );
    if (coupon.maxDiscountAmount != null) {
      discountCents = Math.min(
        discountCents,
        toCents(coupon.maxDiscountAmount, "Maximum discount"),
      );
    }
  } else {
    discountCents = valueCents;
  }
  discountCents = Math.min(discountCents, subtotalCents);
  if (discountCents <= 0) {
    throw new AppError(422, "This coupon does not apply a discount to this order.");
  }
  return discountCents;
}

async function assertCouponCapacity({
  coupon,
  customerId,
  excludeOrderId,
  transaction,
}) {
  const where = {
    couponId: coupon.id,
    status: { [Op.in]: ["reserved", "redeemed"] },
    ...(excludeOrderId ? { orderId: { [Op.ne]: excludeOrderId } } : {}),
  };
  const [totalUses, customerUses] = await Promise.all([
    CouponRedemption.count({ where, transaction }),
    CouponRedemption.count({
      where: { ...where, customerId },
      transaction,
    }),
  ]);
  if (
    coupon.totalUsageLimit != null &&
    totalUses >= Number(coupon.totalUsageLimit)
  ) {
    throw new AppError(409, RESERVATION_CONFLICT);
  }
  if (customerUses >= Number(coupon.perCustomerUsageLimit)) {
    throw new AppError(409, "You have reached this coupon's per-customer usage limit.");
  }
}

async function getCouponDiscount({
  shopId,
  customerId,
  code,
  subtotal,
  transaction,
  excludeOrderId,
  lock = false,
}) {
  const normalizedCode = normalizeCouponCode(code);
  const coupon = await Coupon.findOne({
    where: { shopId, code: normalizedCode },
    transaction,
    ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!coupon) throw new AppError(404, "Coupon code was not found for this shop.");
  validateCouponWindow(coupon);
  const discountCents = calculateCouponDiscount(coupon, subtotal);
  await assertCouponCapacity({
    coupon,
    customerId,
    excludeOrderId,
    transaction,
  });
  return {
    coupon,
    discountAmount: fromCents(discountCents),
    discountCents,
  };
}

async function reserveCouponForOrder({
  coupon,
  shopId,
  customerId,
  orderId,
  discountAmount,
  transaction,
  redeemImmediately = false,
  allowExpired = false,
}) {
  const lockedCoupon = await Coupon.findOne({
    where: { id: coupon.id, shopId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!lockedCoupon) throw new AppError(409, "The applied coupon is no longer available.");
  if (!allowExpired) validateCouponWindow(lockedCoupon);

  const existing = await CouponRedemption.findOne({
    where: { orderId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (existing?.status === "redeemed") return existing;

  await assertCouponCapacity({
    coupon: lockedCoupon,
    customerId,
    excludeOrderId: orderId,
    transaction,
  });

  const values = {
    couponId: lockedCoupon.id,
    shopId,
    customerId,
    orderId,
    discountAmount,
    status: redeemImmediately ? "redeemed" : "reserved",
    redeemedAt: redeemImmediately ? new Date() : null,
  };
  if (existing) {
    await existing.update(values, { transaction });
  } else {
    await CouponRedemption.create(values, { transaction });
  }
  if (redeemImmediately) {
    await lockedCoupon.increment("usedCount", { by: 1, transaction });
  }
  return existing || values;
}

async function confirmCouponRedemption(orderId, transaction) {
  const redemption = await CouponRedemption.findOne({
    where: { orderId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!redemption || redemption.status === "redeemed") return redemption;
  if (redemption.status !== "reserved") return redemption;
  const coupon = await Coupon.findByPk(redemption.couponId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!coupon) throw new AppError(409, "The coupon for this order no longer exists.");
  await redemption.update(
    { status: "redeemed", redeemedAt: new Date() },
    { transaction },
  );
  await coupon.increment("usedCount", { by: 1, transaction });
  return redemption;
}

async function releaseCouponRedemption(orderId, transaction) {
  const redemption = await CouponRedemption.findOne({
    where: { orderId },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!redemption || redemption.status === "released") return redemption;
  const coupon = await Coupon.findByPk(redemption.couponId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (redemption.status === "redeemed" && coupon?.usedCount > 0) {
    await coupon.decrement("usedCount", { by: 1, transaction });
  }
  await redemption.update({ status: "released" }, { transaction });
  return redemption;
}

module.exports = {
  normalizeCouponCode,
  calculateCouponDiscount,
  getCouponDiscount,
  reserveCouponForOrder,
  confirmCouponRedemption,
  releaseCouponRedemption,
};
