const { Order, OrderStatusHistory, DeliveryAssignment, Payment, sequelize } = require("../models");
const { AppError } = require("../utils/errors");
const { restoreStockForOrder } = require("./inventoryService");

const VALID_TRANSITIONS = {
  pending_payment: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["packed", "cancelled"],
  packed: ["ready_for_dispatch", "cancelled"],
  ready_for_dispatch: ["assigned_to_delivery", "cancelled"],
  assigned_to_delivery: ["picked_up", "cancelled"],
  picked_up: ["out_for_delivery", "delivery_failed"],
  out_for_delivery: ["delivered", "delivery_failed"],
  delivery_failed: ["out_for_delivery", "cancelled", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

function canTransition(currentStatus, nextStatus) {
  const allowed = VALID_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}

/**
 * Safely updates order status, logs history, and applies side effects for valid workflow transitions.
 */
async function transitionOrderStatus(
  orderId,
  shopId,
  newStatus,
  actorUserId,
  notes = "",
  { allowStatusCorrection = false } = {},
) {
  return sequelize.transaction(async (t) => {
    const where = { id: orderId };
    if (shopId) where.shopId = shopId;

    const order = await Order.findOne({
      where,
      include: ["items"],
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!order) {
      throw new AppError(404, "Order not found");
    }

    if (order.status === newStatus) {
      return order;
    }

    const isWorkflowTransition = canTransition(order.status, newStatus);
    if (!isWorkflowTransition && !allowStatusCorrection) {
      throw new AppError(
        400,
        `Invalid status transition from "${order.status}" to "${newStatus}".`
      );
    }

    const previousStatus = order.status;
    const updates = { status: newStatus };

    // A correction records only the status and history; it must not replay side effects.
    if (isWorkflowTransition) {
      // Only normal workflow transitions synchronize delivery metadata.
      if (newStatus === "assigned_to_delivery") updates.deliveryStatus = "assigned";
      else if (newStatus === "picked_up") updates.deliveryStatus = "picked_up";
      else if (newStatus === "out_for_delivery") updates.deliveryStatus = "out_for_delivery";
      else if (newStatus === "delivered") updates.deliveryStatus = "delivered";
      else if (newStatus === "delivery_failed") updates.deliveryStatus = "failed";
    }

    await order.update(updates, { transaction: t });

    if (isWorkflowTransition) {
      const assignment = await DeliveryAssignment.findOne({
        where: { orderId: order.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (assignment) {
        const assignmentUpdates = {};
        if (newStatus === "picked_up") {
          assignmentUpdates.status = "picked_up";
          assignmentUpdates.pickedUpAt = new Date();
        } else if (newStatus === "out_for_delivery") {
          assignmentUpdates.status = "out_for_delivery";
        } else if (newStatus === "delivered") {
          assignmentUpdates.status = "delivered";
          assignmentUpdates.deliveredAt = new Date();
        } else if (newStatus === "delivery_failed") {
          assignmentUpdates.status = "failed";
        }
        if (Object.keys(assignmentUpdates).length) {
          await assignment.update(assignmentUpdates, { transaction: t });
        }
      }
    }

    // Status history
    await OrderStatusHistory.create(
      {
        orderId: order.id,
        previousStatus,
        newStatus,
        notes: notes || `Status changed to ${newStatus}`,
        changedBy: actorUserId,
      },
      { transaction: t }
    );

    // If cancelled, restore deducted stock!
    if (isWorkflowTransition && newStatus === "cancelled") {
      await restoreStockForOrder(order.shopId, order.items, order.id, actorUserId, t);

      // If payment was made and cancelled, mark payment status
      if (order.paymentStatus === "paid") {
        await order.update({ paymentStatus: "refunded" }, { transaction: t });
        await Payment.update(
          { status: "refunded" },
          { where: { orderId: order.id }, transaction: t }
        );
      }
    }

    return order;
  });
}

module.exports = {
  VALID_TRANSITIONS,
  canTransition,
  transitionOrderStatus,
};
