const crypto = require("crypto");
const Razorpay = require("razorpay");
const { Payment, Order, OrderStatusHistory, sequelize } = require("../models");
const { AppError } = require("../utils/errors");
const { toCents } = require("./orderPricing");

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

let rzpInstance = null;
if (razorpayKeyId && razorpayKeySecret) {
  try {
    rzpInstance = new Razorpay({
      key_id: razorpayKeyId,
      key_secret: razorpayKeySecret,
    });
  } catch (err) {
    console.error("Failed to initialize Razorpay:", err.message);
  }
}

/**
 * Creates a Razorpay order on Razorpay servers.
 */
async function createRazorpayOrder(amountInRupees, receiptId, notes = {}) {
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  if (!rzpInstance) {
    throw new AppError(503, "Online payments are not configured. Please use Cash on Delivery or contact support.");
  }

  try {
    const rzpOrder = await rzpInstance.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: String(receiptId),
      notes,
    });
    return rzpOrder;
  } catch (err) {
    console.error("Razorpay order creation failed:", err.statusCode || err.status || err.code || 'provider_error');
    throw new AppError(502, "Failed to create the online payment order. Please try again.");
  }
}

/**
 * Verifies Razorpay checkout signature.
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!razorpayKeySecret) {
    throw new AppError(503, "Online payment verification is not configured on the server.");
  }
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(body)
    .digest("hex");
  const expectedBytes = Buffer.from(expected, 'hex');
  const suppliedBytes = Buffer.from(String(signature), 'hex');
  return expectedBytes.length === suppliedBytes.length && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
}

/**
 * Verifies Razorpay Webhook signature using raw request body.
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!razorpayWebhookSecret) {
    throw new AppError(500, "Razorpay webhook secret is not configured.");
  }
  const expected = crypto
    .createHmac("sha256", razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");
  return expected === signature;
}

/**
 * Reconciles COD payment. Delivery and payment are separate!
 */
async function reconcileCodPayment(paymentId, shopId, actorUserId, notes = "") {
  return sequelize.transaction(async (t) => {
    const payment = await Payment.findOne({
      where: { id: paymentId, shopId, paymentMethod: "cod" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      throw new AppError(404, "COD payment record not found.");
    }

    if (payment.codReconciled) {
      throw new AppError(409, "COD payment has already been reconciled.");
    }
    if (!payment.codCollectedAt || payment.codCollectedAmount == null) {
      throw new AppError(409, "COD cash must be recorded by the assigned delivery associate before reconciliation.");
    }
    if (
      toCents(payment.codCollectedAmount, "Collected amount") !==
      toCents(payment.amount, "Amount due")
    ) {
      throw new AppError(409, "The recorded COD collection does not match the amount due.");
    }

    const order = await Order.findOne({
      where: { id: payment.orderId, shopId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new AppError(404, "Associated order not found.");
    }
    await payment.update(
      {
        status: "paid",
        codReconciled: true,
        codReconciledAt: new Date(),
        codReconciledBy: actorUserId,
        meta: {
          ...(payment.meta || {}),
          codReconciliationNotes: notes || null,
        },
      },
      { transaction: t }
    );

    if (order.paymentStatus !== "paid") {
      await order.update({ paymentStatus: "paid" }, { transaction: t });
    }

    return payment;
  });
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  reconcileCodPayment,
  razorpayKeyId,
};
