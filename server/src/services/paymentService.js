// const crypto = require("crypto");
// const Razorpay = require("razorpay");
// const { Payment, Order, OrderStatusHistory, sequelize } = require("../models");
// const { AppError } = require("../utils/errors");
// const { toCents } = require("./orderPricing");

// const razorpayKeyId = process.env.RAZORPAY_KEY_ID || "";
// const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || "";
// const razorpayWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

// let rzpInstance = null;
// if (razorpayKeyId && razorpayKeySecret) {
//   try {
//     rzpInstance = new Razorpay({
//       key_id: razorpayKeyId,
//       key_secret: razorpayKeySecret,
//     });
//   } catch (err) {
//     console.error("Failed to initialize Razorpay:", err.message);
//   }
// }

// /**
//  * Creates a Razorpay order on Razorpay servers.
//  */
// async function createRazorpayOrder(amountInRupees, receiptId, notes = {}) {
//   const amountInPaise = Math.round(Number(amountInRupees) * 100);

//   if (!rzpInstance) {
//     throw new AppError(503, "Online payments are not configured. Please use Cash on Delivery or contact support.");
//   }

//   try {
//     const rzpOrder = await rzpInstance.orders.create({
//       amount: amountInPaise,
//       currency: "INR",
//       receipt: String(receiptId),
//       notes,
//     });
//     return rzpOrder;
//   } catch (err) {
//     console.error("Razorpay order creation failed:", err.statusCode || err.status || err.code || 'provider_error');
//     throw new AppError(502, "Failed to create the online payment order. Please try again.");
//   }
// }

// /**
//  * Verifies Razorpay checkout signature.
//  */
// function verifyPaymentSignature(orderId, paymentId, signature) {
//   if (!razorpayKeySecret) {
//     throw new AppError(503, "Online payment verification is not configured on the server.");
//   }
//   const body = `${orderId}|${paymentId}`;
//   const expected = crypto
//     .createHmac("sha256", razorpayKeySecret)
//     .update(body)
//     .digest("hex");
//   const expectedBytes = Buffer.from(expected, 'hex');
//   const suppliedBytes = Buffer.from(String(signature), 'hex');
//   return expectedBytes.length === suppliedBytes.length && crypto.timingSafeEqual(expectedBytes, suppliedBytes);
// }

// /**
//  * Verifies Razorpay Webhook signature using raw request body.
//  */
// function verifyWebhookSignature(rawBody, signature) {
//   if (!razorpayWebhookSecret) {
//     throw new AppError(500, "Razorpay webhook secret is not configured.");
//   }
//   const expected = crypto
//     .createHmac("sha256", razorpayWebhookSecret)
//     .update(rawBody)
//     .digest("hex");
//   return expected === signature;
// }

// /**
//  * Reconciles COD payment. Delivery and payment are separate!
//  */
// async function reconcileCodPayment(paymentId, shopId, actorUserId, notes = "") {
//   return sequelize.transaction(async (t) => {
//     const payment = await Payment.findOne({
//       where: { id: paymentId, shopId, paymentMethod: "cod" },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!payment) {
//       throw new AppError(404, "COD payment record not found.");
//     }

//     if (payment.codReconciled) {
//       throw new AppError(409, "COD payment has already been reconciled.");
//     }
//     if (!payment.codCollectedAt || payment.codCollectedAmount == null) {
//       throw new AppError(409, "COD cash must be recorded by the assigned delivery associate before reconciliation.");
//     }
//     if (
//       toCents(payment.codCollectedAmount, "Collected amount") !==
//       toCents(payment.amount, "Amount due")
//     ) {
//       throw new AppError(409, "The recorded COD collection does not match the amount due.");
//     }

//     const order = await Order.findOne({
//       where: { id: payment.orderId, shopId },
//       transaction: t,
//       lock: t.LOCK.UPDATE,
//     });

//     if (!order) {
//       throw new AppError(404, "Associated order not found.");
//     }
//     await payment.update(
//       {
//         status: "paid",
//         codReconciled: true,
//         codReconciledAt: new Date(),
//         codReconciledBy: actorUserId,
//         meta: {
//           ...(payment.meta || {}),
//           codReconciliationNotes: notes || null,
//         },
//       },
//       { transaction: t }
//     );

//     if (order.paymentStatus !== "paid") {
//       await order.update({ paymentStatus: "paid" }, { transaction: t });
//     }

//     return payment;
//   });
// }

// module.exports = {
//   createRazorpayOrder,
//   verifyPaymentSignature,
//   verifyWebhookSignature,
//   reconcileCodPayment,
//   razorpayKeyId,
// };


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
 * Checks whether Razorpay is configured.
 */
function requireRazorpay() {
  if (!rzpInstance) {
    throw new AppError(
      503,
      "Online payments are not configured on the server."
    );
  }

  return rzpInstance;
}

/**
 * Creates a Razorpay order on Razorpay servers.
 */
async function createRazorpayOrder(amountInRupees, receiptId, notes = {}) {
  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
    throw new AppError(400, "A valid payment amount is required.");
  }

  const razorpay = requireRazorpay();

  try {
    return await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: String(receiptId),
      notes,
    });
  } catch (err) {
    console.error(
      "Razorpay order creation failed:",
      err.statusCode || err.status || err.code || "provider_error"
    );

    throw new AppError(
      502,
      "Failed to create the online payment order. Please try again."
    );
  }
}

/**
 * Creates an actual refund through Razorpay.
 *
 * amountInRupees must be validated against the remaining refundable
 * order/payment amount by the calling route before this function runs.
 *
 * This function does not update database payment or return statuses.
 * Those must only be updated after checking Razorpay's response.
 */
async function createRazorpayRefund(
  razorpayPaymentId,
  amountInRupees,
  receiptId,
  notes = {}
) {
  if (
    !razorpayPaymentId ||
    typeof razorpayPaymentId !== "string" ||
    !razorpayPaymentId.trim()
  ) {
    throw new AppError(400, "A valid Razorpay payment ID is required.");
  }

  const amountInPaise = Math.round(Number(amountInRupees) * 100);

  if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
    throw new AppError(400, "A valid refund amount is required.");
  }

  const razorpay = requireRazorpay();

  try {
    const refund = await razorpay.payments.refund(
      razorpayPaymentId.trim(),
      {
        amount: amountInPaise,
        receipt: String(receiptId),
        notes: {
          ...notes,
          refundReceipt: String(receiptId),
        },
      }
    );

    return refund;
  } catch (err) {
    console.error(
      "Razorpay refund request failed:",
      err.statusCode || err.status || err.code || "provider_error"
    );

    throw new AppError(
      502,
      "Razorpay could not confirm the refund request. Check the payment's refund status before trying again."
    );
  }
}

/**
 * Fetches a specific Razorpay refund for status verification.
 */
async function fetchRazorpayRefund(razorpayPaymentId, razorpayRefundId) {
  if (!razorpayPaymentId || !razorpayRefundId) {
    throw new AppError(
      400,
      "Razorpay payment ID and refund ID are required."
    );
  }

  const razorpay = requireRazorpay();

  try {
    return await razorpay.payments.fetchRefund(
      razorpayPaymentId,
      razorpayRefundId
    );
  } catch (err) {
    console.error(
      "Razorpay refund status lookup failed:",
      err.statusCode || err.status || err.code || "provider_error"
    );

    throw new AppError(
      502,
      "Unable to verify the refund status with Razorpay."
    );
  }
}

/**
 * Verifies Razorpay checkout signature.
 */
function verifyPaymentSignature(orderId, paymentId, signature) {
  if (!razorpayKeySecret) {
    throw new AppError(
      503,
      "Online payment verification is not configured on the server."
    );
  }

  const body = `${orderId}|${paymentId}`;

  const expected = crypto
    .createHmac("sha256", razorpayKeySecret)
    .update(body)
    .digest("hex");

  const expectedBytes = Buffer.from(expected, "hex");
  const suppliedBytes = Buffer.from(String(signature), "hex");

  return (
    expectedBytes.length === suppliedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

/**
 * Verifies Razorpay Webhook signature using the raw request body.
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!razorpayWebhookSecret) {
    throw new AppError(
      500,
      "Razorpay webhook secret is not configured."
    );
  }

  if (!rawBody || !signature) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", razorpayWebhookSecret)
    .update(rawBody)
    .digest("hex");

  const expectedBytes = Buffer.from(expected, "hex");
  const suppliedBytes = Buffer.from(String(signature), "hex");

  return (
    expectedBytes.length === suppliedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, suppliedBytes)
  );
}

/**
 * Reconciles COD payment.
 * Delivery collection and payment reconciliation are separate operations.
 */
async function reconcileCodPayment(
  paymentId,
  shopId,
  actorUserId,
  notes = ""
) {
  return sequelize.transaction(async (t) => {
    const payment = await Payment.findOne({
      where: {
        id: paymentId,
        shopId,
        paymentMethod: "cod",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!payment) {
      throw new AppError(404, "COD payment record not found.");
    }

    if (payment.codReconciled) {
      throw new AppError(
        409,
        "COD payment has already been reconciled."
      );
    }

    if (!payment.codCollectedAt || payment.codCollectedAmount == null) {
      throw new AppError(
        409,
        "COD cash must be recorded by the assigned delivery associate before reconciliation."
      );
    }

    if (
      toCents(payment.codCollectedAmount, "Collected amount") !==
      toCents(payment.amount, "Amount due")
    ) {
      throw new AppError(
        409,
        "The recorded COD collection does not match the amount due."
      );
    }

    const order = await Order.findOne({
      where: {
        id: payment.orderId,
        shopId,
      },
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
      await order.update(
        { paymentStatus: "paid" },
        { transaction: t }
      );
    }

    return payment;
  });
}

module.exports = {
  createRazorpayOrder,
  createRazorpayRefund,
  fetchRazorpayRefund,
  verifyPaymentSignature,
  verifyWebhookSignature,
  reconcileCodPayment,
  razorpayKeyId,
};
