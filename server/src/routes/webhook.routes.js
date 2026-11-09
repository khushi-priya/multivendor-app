const router = require("express").Router();
const { verifyWebhookSignature } = require("../services/paymentService");
const { Order, Payment, OrderStatusHistory, sequelize } = require("../models");
const { wrap } = require("../utils/errors");
const { confirmCouponRedemption } = require("../services/couponService");

router.post(
  "/razorpay",
  wrap(async (req, res) => {
    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing webhook signature" });
    }

    const isValid = verifyWebhookSignature(req.rawBody || JSON.stringify(req.body), signature);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid webhook signature" });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    if (event === "order.paid" || event === "payment.captured") {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      const razorpayPaymentId = paymentEntity.id;

      await sequelize.transaction(async (t) => {
        const payment = await Payment.findOne({
          where: { razorpayOrderId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (payment && payment.status !== "paid") {
          await payment.update(
            {
              status: "paid",
              razorpayPaymentId,
              meta: { ...payment.meta, webhookEvent: req.body },
            },
            { transaction: t }
          );

          const order = await Order.findByPk(payment.orderId, { transaction: t, lock: t.LOCK.UPDATE });
          if (order && order.paymentStatus !== "paid") {
            await order.update(
              {
                paymentStatus: "paid",
                status: order.status === "pending_payment" ? "confirmed" : order.status,
              },
              { transaction: t }
            );

            await OrderStatusHistory.create(
              {
                orderId: order.id,
                previousStatus: "pending_payment",
                newStatus: order.status === "pending_payment" ? "confirmed" : order.status,
                notes: `Payment confirmed via Razorpay Webhook (${razorpayPaymentId})`,
              },
              { transaction: t }
            );
          }
          if (order) await confirmCouponRedemption(order.id, t);
        }
      });
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payment.entity;
      const razorpayOrderId = paymentEntity.order_id;
      await sequelize.transaction(async (t) => {
        const payment = await Payment.findOne({
          where: { razorpayOrderId },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!payment || payment.status === "paid") return;
        await payment.update(
          {
            status: "failed",
            meta: { ...(payment.meta || {}), webhookFailure: req.body },
          },
          { transaction: t },
        );
        const order = await Order.findByPk(payment.orderId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (order && order.paymentStatus !== "paid") {
          await order.update({ paymentStatus: "failed" }, { transaction: t });
        }
      });
    }

    res.json({ status: "ok" });
  })
);

module.exports = router;
