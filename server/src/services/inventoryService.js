const { sequelize, Inventory, InventoryMovement, ProductVariant } = require("../models");
const { AppError } = require("../utils/errors");

/**
 * Concurrency-safe stock deduction for order placement.
 * Uses SELECT ... FOR UPDATE to prevent race conditions and overselling.
 */
async function deductStockForOrder(shopId, items, orderId, userId, t) {
  for (const item of items) {
    const { productVariantId, productId, quantity } = item;

    // Lock the inventory row
    let inv = await Inventory.findOne({
      where: { shopId, productVariantId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const currentQty = inv ? inv.quantity : 0;
    if (currentQty < quantity) {
      const variant = await ProductVariant.findByPk(productVariantId, { transaction: t });
      const name = variant ? variant.variantName : `Variant #${productVariantId}`;
      throw new AppError(
        400,
        `Insufficient stock for "${name}". Available: ${currentQty}, requested: ${quantity}.`
      );
    }

    const newQty = currentQty - quantity;
    await inv.update({ quantity: newQty }, { transaction: t });

    // Record inventory movement
    await InventoryMovement.create(
      {
        shopId,
        productId,
        productVariantId,
        changeQuantity: -quantity,
        balanceAfter: newQty,
        movementType: "sale",
        referenceType: "retail_order",
        referenceId: String(orderId),
        notes: `Order #${orderId} fulfilled`,
        createdBy: userId,
      },
      { transaction: t }
    );
  }
}

/**
 * Restores stock when an order is cancelled.
 */
async function restoreStockForOrder(shopId, items, orderId, userId, t) {
  for (const item of items) {
    const { productVariantId, productId, quantity } = item;

    let inv = await Inventory.findOne({
      where: { shopId, productVariantId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!inv) {
      inv = await Inventory.create(
        { shopId, productId, productVariantId, quantity: 0 },
        { transaction: t }
      );
    }

    const newQty = inv.quantity + quantity;
    await inv.update({ quantity: newQty }, { transaction: t });

    await InventoryMovement.create(
      {
        shopId,
        productId,
        productVariantId,
        changeQuantity: quantity,
        balanceAfter: newQty,
        movementType: "return",
        referenceType: "order_cancellation",
        referenceId: String(orderId),
        notes: `Restored stock from cancelled order #${orderId}`,
        createdBy: userId,
      },
      { transaction: t }
    );
  }
}

/**
 * Increases stock during purchase order goods receipt.
 */
async function addStockForReceipt(shopId, items, receiptNumber, receiptId, userId, t) {
  for (const item of items) {
    const { productVariantId, productId, quantityReceived } = item;
    if (quantityReceived <= 0) continue;

    let inv = await Inventory.findOne({
      where: { shopId, productVariantId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!inv) {
      inv = await Inventory.create(
        { shopId, productId, productVariantId, quantity: 0 },
        { transaction: t }
      );
    }

    const newQty = inv.quantity + quantityReceived;
    await inv.update({ quantity: newQty }, { transaction: t });

    await InventoryMovement.create(
      {
        shopId,
        productId,
        productVariantId,
        changeQuantity: quantityReceived,
        balanceAfter: newQty,
        movementType: "receipt",
        referenceType: "goods_receipt",
        referenceId: String(receiptNumber || receiptId),
        notes: `Goods receipt ${receiptNumber}`,
        createdBy: userId,
      },
      { transaction: t }
    );
  }
}

/**
 * Manual adjustment with reason
 */
async function adjustStock(shopId, productId, productVariantId, changeQuantity, reason, movementType, userId) {
  return sequelize.transaction(async (t) => {
    let inv = await Inventory.findOne({
      where: { shopId, productVariantId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!inv) {
      inv = await Inventory.create(
        { shopId, productId, productVariantId, quantity: 0 },
        { transaction: t }
      );
    }

    const newQty = inv.quantity + changeQuantity;
    if (newQty < 0) {
      throw new AppError(400, `Cannot adjust below 0. Current stock is ${inv.quantity}.`);
    }

    await inv.update({ quantity: newQty }, { transaction: t });

    const movement = await InventoryMovement.create(
      {
        shopId,
        productId,
        productVariantId,
        changeQuantity,
        balanceAfter: newQty,
        movementType: movementType || "adjustment",
        referenceType: "manual_adjustment",
        notes: reason || "Manual adjustment",
        createdBy: userId,
      },
      { transaction: t }
    );

    return { inventory: inv, movement };
  });
}

module.exports = {
  deductStockForOrder,
  restoreStockForOrder,
  addStockForReceipt,
  adjustStock,
};
