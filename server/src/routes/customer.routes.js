const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const env = require('../config/env');
const {
  sequelize,
  CustomerAddress,
  Cart,
  CartItem,
  Wishlist,
  ProductReview,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  Coupon,
  CouponRedemption,
  Return,
  ReturnItem,
  Product,
  ProductVariant,
  ProductImage,
  SellerListing,
  Inventory,
  Shop,
  DeliveryAssignment,
  CommissionSetting,
  User,
} = require('../models');
const { AppError, wrap, idParam } = require('../utils/errors');
const { validate, z, phone, optional, password } = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const { deductStockForOrder } = require('../services/inventoryService');
const { transitionOrderStatus } = require('../services/orderService');
const { createRazorpayOrder, verifyPaymentSignature, razorpayKeyId } = require('../services/paymentService');
const {
  calculateOrderPricing,
  toCents,
  fromCents,
} = require('../services/orderPricing');
const {
  getCouponDiscount,
  reserveCouponForOrder,
  confirmCouponRedemption,
  releaseCouponRedemption,
} = require('../services/couponService');

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user?.role !== 'customer') return next(new AppError(403, 'Customer account required'));
  next();
});

/* ========================================================================== */
/*                            CUSTOMER ADDRESSES                              */
/* ========================================================================== */
router.get(
  '/addresses',
  wrap(async (req, res) => {
    const items = await CustomerAddress.findAll({
      where: { userId: req.user.id },
      order: [['isDefault', 'DESC'], ['id', 'DESC']],
    });
    res.json({ items });
  }),
);

const addressSchema = z.object({
  label: z.string().trim().default('Home'),
  recipientName: z.string().trim().min(2, 'Recipient name is required').max(120),
  phone: phone,
  streetAddress: z.string().trim().min(5, 'Street address is required').max(300),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().min(4).max(20),
  isDefault: z.boolean().default(false),
});

router.post(
  '/addresses',
  validate(addressSchema),
  wrap(async (req, res) => {
    if (req.valid.isDefault) {
      await CustomerAddress.update({ isDefault: false }, { where: { userId: req.user.id } });
    }
    const address = await CustomerAddress.create({
      ...req.valid,
      userId: req.user.id,
    });
    res.status(201).json({ address });
  }),
);

router.patch(
  '/addresses/:id',
  validate(addressSchema.partial()),
  wrap(async (req, res) => {
    const address = await CustomerAddress.findOne({
      where: { id: idParam(req, 'id'), userId: req.user.id },
    });
    if (!address) throw new AppError(404, 'Address not found');

    if (req.valid.isDefault) {
      await CustomerAddress.update({ isDefault: false }, { where: { userId: req.user.id } });
    }
    await address.update(req.valid);
    res.json({ address });
  }),
);

router.post('/profile/password', validate(z.object({ currentPassword: z.string().min(1).max(100), newPassword: password })), wrap(async (req, res) => {
  const user = await User.unscoped().findByPk(req.user.id);
  if (!user?.passwordHash || !(await bcrypt.compare(req.valid.currentPassword, user.passwordHash))) throw new AppError(400, 'Current password is incorrect.');
  if (await bcrypt.compare(req.valid.newPassword, user.passwordHash)) throw new AppError(400, 'Choose a password different from your current password.');
  await user.update({ passwordHash: await bcrypt.hash(req.valid.newPassword, env.bcryptRounds) });
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = user.id;
  await new Promise((resolve, reject) => req.session.save((error) => error ? reject(error) : resolve()));
  res.json({ message: 'Password changed successfully.' });
}));

router.delete(
  '/addresses/:id',
  wrap(async (req, res) => {
    const deleted = await CustomerAddress.destroy({
      where: { id: idParam(req, 'id'), userId: req.user.id },
    });
    if (!deleted) throw new AppError(404, 'Address not found');
    res.json({ ok: true });
  }),
);

/* ========================================================================== */
/*                                 WISHLIST                                   */
/* ========================================================================== */
router.get(
  '/wishlist',
  wrap(async (req, res) => {
    const records = await Wishlist.findAll({
      where: { userId: req.user.id },
      include: [
        {
          model: Product,
          as: 'product',
          include: [
            { model: ProductImage, as: 'images' },
            { model: ProductVariant, as: 'variants', where: { isActive: true }, required: false },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
    const items = await Promise.all(records.map(async (record) => {
      const json = record.toJSON();
      const variants = json.product?.variants || [];
      const ids = variants.map((variant) => variant.id);
      const [listings, inventory] = await Promise.all([
        SellerListing.findAll({ where: { productVariantId: ids, isActive: true }, include: [{ model: Shop, as: 'shop', where: { status: 'active' }, attributes: ['id', 'name'], required: true }] }),
        Inventory.findAll({ where: { productVariantId: ids } }),
      ]);
      if (json.product) json.product.variants = variants.map((variant) => ({
        ...variant,
        listings: listings.filter((listing) => Number(listing.productVariantId) === Number(variant.id)).map((listing) => ({
          shopId: listing.shopId, shopName: listing.shop?.name, retailPrice: Number(listing.retailPrice),
          stock: inventory.find((row) => Number(row.shopId) === Number(listing.shopId) && Number(row.productVariantId) === Number(variant.id))?.quantity || 0,
        })),
      }));
      return json;
    }));
    res.json({ items });
  }),
);

router.post(
  '/wishlist',
  validate(z.object({ productId: z.coerce.number().int().positive() })),
  wrap(async (req, res) => {
    const { productId } = req.valid;
    const existing = await Wishlist.findOne({ where: { userId: req.user.id, productId } });
    if (existing) {
      await existing.destroy();
      return res.json({ added: false, message: 'Removed from wishlist' });
    }
    const item = await Wishlist.create({ userId: req.user.id, productId });
    res.status(201).json({ added: true, item });
  }),
);

router.delete(
  '/wishlist/:productId',
  wrap(async (req, res) => {
    await Wishlist.destroy({
      where: { userId: req.user.id, productId: idParam(req, 'productId') },
    });
    res.json({ ok: true });
  }),
);

/* ========================================================================== */
/*                                   CART                                     */
/* ========================================================================== */
router.get(
  '/cart',
  wrap(async (req, res) => {
    const carts = await Cart.findAll({
      where: { userId: req.user.id },
      include: [
        { model: Shop, as: 'shop', attributes: ['id', 'name', 'address', 'status'] },
        {
          model: CartItem,
          as: 'items',
          include: [
            { model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] },
            { model: ProductVariant, as: 'variant' },
          ],
        },
      ],
    });

    // Check inventory and current seller listing prices
    const enrichedCarts = await Promise.all(
      carts.map(async (c) => {
        const json = c.toJSON();
        const variantIds = json.items.map((it) => it.productVariantId);

        const [listings, stocks] = await Promise.all([
          SellerListing.findAll({ where: { shopId: c.shopId, productVariantId: variantIds } }),
          Inventory.findAll({ where: { shopId: c.shopId, productVariantId: variantIds } }),
        ]);

        const listingMap = Object.fromEntries(listings.map((l) => [l.productVariantId, Number(l.retailPrice)]));
        const stockMap = Object.fromEntries(stocks.map((s) => [s.productVariantId, s.quantity]));

        json.items = json.items.map((it) => {
          const currentPrice = listingMap[it.productVariantId] ?? Number(it.unitPrice);
          const currentStock = stockMap[it.productVariantId] ?? 0;
          return {
            ...it,
            currentPrice,
            currentStock,
            lineTotal: Number((it.quantity * currentPrice).toFixed(2)),
            isAvailable: currentStock >= it.quantity,
          };
        });

        json.subtotal = Number(json.items.reduce((sum, it) => sum + it.lineTotal, 0).toFixed(2));
        return json;
      }),
    );

    res.json({ carts: enrichedCarts });
  }),
);

const addToCartSchema = z.object({
  shopId: z.coerce.number().int().positive(),
  productId: z.coerce.number().int().positive(),
  productVariantId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).default(1),
});

router.post(
  '/cart',
  validate(addToCartSchema),
  wrap(async (req, res) => {
    const { shopId, productId, productVariantId, quantity } = req.valid;

    // Validate shop is active
    const shop = await Shop.findOne({ where: { id: shopId, status: 'active' } });
    if (!shop) throw new AppError(404, 'Shop not found or not currently active');

    // Validate listing & price
    const listing = await SellerListing.findOne({
      where: { shopId, productVariantId, isActive: true },
      include: [{ model: ProductVariant, as: 'variant', attributes: ['id', 'productId', 'isActive'] }],
    });
    if (!listing) throw new AppError(404, 'Product variant is not available from this shop');
    if (!listing.variant?.isActive || Number(listing.productId) !== productId || Number(listing.variant.productId) !== productId) {
      throw new AppError(400, 'Selected product does not match the available variant. Refresh and try again.');
    }

    // Check stock
    const inv = await Inventory.findOne({ where: { shopId, productVariantId } });
    const availableStock = inv ? inv.quantity : 0;
    if (availableStock < quantity) {
      throw new AppError(400, `Only ${availableStock} units available in stock`);
    }

    const [cart] = await Cart.findOrCreate({
      where: { userId: req.user.id, shopId },
    });

    const [item, created] = await CartItem.findOrCreate({
      where: { cartId: cart.id, productVariantId },
      defaults: {
        productId,
        quantity,
        unitPrice: listing.retailPrice,
      },
    });

    if (!created) {
      const newQty = item.quantity + quantity;
      if (availableStock < newQty) {
        throw new AppError(400, `Cannot add more. Only ${availableStock} units in stock (${item.quantity} already in cart).`);
      }
      await item.update({ quantity: newQty, unitPrice: listing.retailPrice });
    }

    res.status(201).json({ item });
  }),
);
const updateCartItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(1000),
});

router.patch(
  '/cart/:id',
  validate(updateCartItemSchema),
  wrap(async (req, res) => {
    const item = await CartItem.findOne({
      where: { id: idParam(req, 'id') },
      include: [
        {
          model: Cart,
          as: 'cart',
          where: { userId: req.user.id },
          required: true,
        },
      ],
    });

    if (!item) {
      throw new AppError(404, 'Cart item not found.');
    }

    const quantity = req.valid.quantity;
    const cart = item.cart;

    const [listing, inventory] = await Promise.all([
      SellerListing.findOne({
        where: {
          shopId: cart.shopId,
          productVariantId: item.productVariantId,
          isActive: true,
        },
      }),
      Inventory.findOne({
        where: {
          shopId: cart.shopId,
          productVariantId: item.productVariantId,
        },
      }),
    ]);

    if (!listing) {
      throw new AppError(400, 'This product is no longer available from this shop.');
    }

    const availableStock = Number(inventory?.quantity ?? 0);

    if (quantity > availableStock) {
      throw new AppError(
        400,
        `Only ${availableStock} units are available in stock.`,
      );
    }

    await item.update({
      quantity,
      unitPrice: listing.retailPrice,
    });

    return res.json({
      item,
      message: 'Cart quantity updated successfully.',
    });
  }),
);

router.delete(
  '/cart/:id',
  wrap(async (req, res) => {
    const item = await CartItem.findByPk(idParam(req, 'id'), {
      include: [{ model: Cart, as: 'cart', where: { userId: req.user.id } }],
    });
    if (!item) throw new AppError(404, 'Cart item not found');
    await item.destroy();
    res.json({ ok: true });
  }),
);

router.delete(
  '/cart',
  wrap(async (req, res) => {
    const carts = await Cart.findAll({ where: { userId: req.user.id } });
    const cartIds = carts.map((c) => c.id);
    if (cartIds.length) {
      await CartItem.destroy({ where: { cartId: cartIds } });
      await Cart.destroy({ where: { id: cartIds } });
    }
    res.json({ ok: true });
  }),
);

/* ========================================================================== */
/*                            CHECKOUT & PAYMENTS                             */
/* ========================================================================== */
const checkoutSchema = z.object({
  shopId: z.coerce.number().int().positive(),
  shippingAddressId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(['cod', 'razorpay']),
  couponCode: z.string().trim().max(40).optional(),
  notes: z.string().trim().optional(),
  items: z.array(
    z.object({
      productVariantId: z.coerce.number().int().positive(),
      quantity: z.coerce.number().int().positive(),
    }),
  ).min(1, 'Cart items required for checkout').optional(),
});

async function loadCheckoutCart({ userId, shopId, requestedItems, transaction }) {
  const cart = await Cart.findOne({
    where: { userId, shopId },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!cart) throw new AppError(400, 'Your cart is empty. Add items before checkout.');
  const cartItems = await CartItem.findAll({
    where: { cartId: cart.id },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!cartItems.length) throw new AppError(400, 'Your cart is empty. Add items before checkout.');
  const items = cartItems.map((item) => ({
    productVariantId: item.productVariantId,
    quantity: item.quantity,
  }));
  if (requestedItems) {
    const canonical = (rows) =>
      rows.map((row) => `${Number(row.productVariantId)}:${Number(row.quantity)}`).sort();
    if (JSON.stringify(canonical(requestedItems)) !== JSON.stringify(canonical(items))) {
      throw new AppError(409, 'Your cart changed. Refresh checkout and try again.');
    }
  }
  return { cart, items };
}

async function priceCart({ userId, shop, address, requestedItems, transaction, couponCode }) {
  const { cart, items } = await loadCheckoutCart({
    userId,
    shopId: shop.id,
    requestedItems,
    transaction,
  });
  const pricedItems = [];
  for (const item of items) {
    const listing = await SellerListing.findOne({
      where: {
        shopId: shop.id,
        productVariantId: item.productVariantId,
        isActive: true,
      },
      include: [{
        model: ProductVariant,
        as: 'variant',
        include: [{ model: Product, as: 'product' }],
      }],
      transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!listing || !listing.variant?.isActive || !listing.variant.product?.isActive) {
      throw new AppError(400, `Item #${item.productVariantId} is not available from this shop.`);
    }
    const stock = await Inventory.findOne({
      where: { shopId: shop.id, productVariantId: item.productVariantId },
      transaction,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
    if (!stock || stock.quantity < item.quantity) {
      throw new AppError(409, `${listing.variant.product.name} does not have enough stock.`);
    }
    pricedItems.push({ ...item, listing });
  }
  const pricing = calculateOrderPricing({ items: pricedItems, shop, address });
  let coupon = null;
  if (couponCode) {
    coupon = await getCouponDiscount({
      shopId: shop.id,
      customerId: userId,
      code: couponCode,
      subtotal: pricing.subtotal,
      transaction,
      lock: Boolean(transaction),
    });
    const totalCents = toCents(pricing.totalAmount, 'Order total');
    const discountCents = Math.min(
      coupon.discountCents,
      toCents(pricing.subtotal, 'Order subtotal'),
    );
    pricing.discountAmount = fromCents(discountCents);
    pricing.totalAmount = fromCents(
      Math.max(totalCents - discountCents, 0),
    );
    pricing.coupon = {
      id: coupon.coupon.id,
      code: coupon.coupon.code,
      discountAmount: pricing.discountAmount,
    };
  }
  return {
    cart,
    pricing,
    coupon,
  };
}

router.post(
  '/checkout/quote',
  validate(checkoutSchema),
  wrap(async (req, res) => {
    const { shopId, shippingAddressId, items: requestedItems, couponCode } = req.valid;
    const [shop, address] = await Promise.all([
      Shop.findOne({ where: { id: shopId, status: 'active' } }),
      CustomerAddress.findOne({
        where: { id: shippingAddressId, userId: req.user.id },
      }),
    ]);
    if (!shop) throw new AppError(400, 'Selected shop is currently unavailable.');
    if (!address) throw new AppError(400, 'Shipping address not found.');
    const { pricing } = await priceCart({
      userId: req.user.id,
      shop,
      address,
      requestedItems,
      couponCode,
    });
    res.json({ quote: pricing });
  }),
);

router.post(
  '/checkout',
  validate(checkoutSchema),
  wrap(async (req, res) => {
    const { shopId, shippingAddressId, paymentMethod, notes, items: requestedItems, couponCode } = req.valid;

    // Validate shop
    const shop = await Shop.findOne({ where: { id: shopId, status: 'active' } });
    if (!shop) throw new AppError(400, 'Selected shop is currently unavailable');

    // Validate shipping address
    const address = await CustomerAddress.findOne({
      where: { id: shippingAddressId, userId: req.user.id },
    });
    if (!address) throw new AppError(400, 'Shipping address not found');

    // Retrieve active commission settings snapshot
    let commSetting = await CommissionSetting.findOne({ order: [['id', 'DESC']] });
    const commissionRate = commSetting ? Number(commSetting.percentage) : 5.0;

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const { order, razorpayOrderData } = await sequelize.transaction(async (t) => {
      // The customer's persisted cart is authoritative. Client-provided line items
      // are only checked for stale UI state and can never add arbitrary products.
      const { cart, pricing, coupon } = await priceCart({
        userId: req.user.id,
        shop,
        address,
        requestedItems,
        transaction: t,
        couponCode,
      });
      const {
        items: verifiedItems,
        subtotal,
        taxAmount,
        deliveryFee,
        totalAmount,
        discountAmount = '0.00',
      } = pricing;
      const commissionAmount = Number(
        ((Number(subtotal) * commissionRate) / 100).toFixed(2),
      );

      // Transaction-safe stock deduction (locks rows & throws if insufficient)
      await deductStockForOrder(shopId, verifiedItems, orderNumber, req.user.id, t);

      // Create Order
      const initialStatus = paymentMethod === 'cod' ? 'confirmed' : 'pending_payment';
      const newOrder = await Order.create(
        {
          orderNumber,
          shopId,
          customerId: req.user.id,
          status: initialStatus,
          deliveryStatus: 'not_assigned',
          paymentMethod,
          paymentStatus: 'pending',
          subtotal,
          taxAmount,
          deliveryFee,
          discountAmount,
          couponId: coupon?.coupon.id || null,
          couponCode: coupon?.coupon.code || null,
          totalAmount,
          taxBreakdown: pricing.taxBreakdown,
          shippingSnapshot: pricing.shippingSnapshot,
          commissionRate,
          commissionAmount,
          shippingAddress: address.toJSON(),
          notes: notes || null,
        },
        { transaction: t },
      );

      // Create Order Items
      for (const itemData of verifiedItems) {
        await OrderItem.create(
          { ...itemData, orderId: newOrder.id },
          { transaction: t },
        );
      }

      // Create initial status history
      await OrderStatusHistory.create(
        {
          orderId: newOrder.id,
          newStatus: initialStatus,
          notes: `Order placed with ${paymentMethod.toUpperCase()}`,
          changedBy: req.user.id,
        },
        { transaction: t },
      );

      // Create Payment entry
      const payment = await Payment.create(
        {
          orderId: newOrder.id,
          shopId,
          amount: totalAmount,
          paymentMethod,
          status: 'pending',
        },
        { transaction: t },
      );

      if (coupon) {
        await reserveCouponForOrder({
          coupon: coupon.coupon,
          shopId,
          customerId: req.user.id,
          orderId: newOrder.id,
          discountAmount,
          transaction: t,
          redeemImmediately: paymentMethod === 'cod',
        });
      }

      // Clear purchased items from Cart
      await CartItem.destroy({ where: { cartId: cart.id }, transaction: t });

      let rzpData = null;
      if (paymentMethod === 'razorpay') {
        const rzpOrder = await createRazorpayOrder(totalAmount, newOrder.orderNumber, {
          orderId: String(newOrder.id),
          shopId: String(shopId),
        });
        await payment.update({ razorpayOrderId: rzpOrder.id }, { transaction: t });
        rzpData = {
          orderId: rzpOrder.id,
          amount: rzpOrder.amount,
          currency: rzpOrder.currency,
          key: razorpayKeyId,
        };
      }

      return { order: newOrder, razorpayOrderData: rzpData };
    });

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] }] },
        { model: Shop, as: 'shop', attributes: ['id', 'name', 'address', 'contactPhone'] },
      ],
    });

    res.status(201).json({ order: fullOrder, razorpay: razorpayOrderData });
  }),
);

/* -------------------- Razorpay Payment Verification ---------------- */
const verifyPaymentSchema = z.object({
  orderId: z.coerce.number().int().positive(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

router.post('/payments/razorpay/failure', validate(z.object({ orderId: z.coerce.number().int().positive(), reason: z.string().trim().max(300).optional() })), wrap(async (req, res) => {
  const outcome = await sequelize.transaction(async (t) => {
    const order = await Order.findOne({ where: { id: req.valid.orderId, customerId: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.paymentMethod !== 'razorpay' || order.paymentStatus === 'paid') throw new AppError(409, 'This order cannot be marked as a failed payment.');
    const payment = await Payment.findOne({ where: { orderId: order.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!payment) throw new AppError(404, 'Payment record not found');
    await payment.update({ status: 'failed', meta: { failureReason: req.valid.reason || 'Gateway reported payment failure' } }, { transaction: t });
    await order.update({ paymentStatus: 'failed' }, { transaction: t });
    return order;
  });
  res.json({ order: outcome, message: 'Payment failure recorded. You can retry this order.' });
}));

router.post('/payments/razorpay/retry', validate(z.object({ orderId: z.coerce.number().int().positive() })), wrap(async (req, res) => {
  const result = await sequelize.transaction(async (t) => {
    const order = await Order.findOne({ where: { id: req.valid.orderId, customerId: req.user.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!order) throw new AppError(404, 'Order not found');
    if (order.paymentMethod !== 'razorpay' || order.status !== 'pending_payment' || order.paymentStatus === 'paid') throw new AppError(409, 'This order is not eligible for a payment retry.');
    const payment = await Payment.findOne({ where: { orderId: order.id }, transaction: t, lock: t.LOCK.UPDATE });
    if (!payment || payment.status === 'paid') throw new AppError(409, 'This order has no unpaid Razorpay payment.');
    if (order.couponId) {
    const coupon = await Coupon.findOne({
      where: { id: order.couponId, shopId: order.shopId },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!coupon) throw new AppError(409, 'The coupon for this order is unavailable for retry.');
    await reserveCouponForOrder({
      coupon,
      shopId: order.shopId,
      customerId: req.user.id,
      orderId: order.id,
      discountAmount: order.discountAmount,
      transaction: t,
      allowExpired: true,
    });
    }
    const remoteOrder = await createRazorpayOrder(Number(payment.amount), order.orderNumber, { orderId: String(order.id), shopId: String(order.shopId) });
    await payment.update({ status: 'pending', razorpayOrderId: remoteOrder.id, razorpayPaymentId: null, razorpaySignature: null, meta: null }, { transaction: t });
    await order.update({ status: 'pending_payment', paymentStatus: 'pending' }, { transaction: t });
    return { order, razorpay: { orderId: remoteOrder.id, amount: remoteOrder.amount, currency: remoteOrder.currency, key: razorpayKeyId } };
  });
  res.json(result);
}));

router.post(
  '/payments/razorpay/verify',
  validate(verifyPaymentSchema),
  wrap(async (req, res) => {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.valid;

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      throw new AppError(400, 'Invalid payment signature. Payment verification failed.');
    }

    const verifiedOrder = await sequelize.transaction(async (t) => {
      const order = await Order.findOne({
        where: { id: orderId, customerId: req.user.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) throw new AppError(404, 'Order not found');

      const payment = await Payment.findOne({
        where: { orderId: order.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!payment || payment.paymentMethod !== 'razorpay' || !payment.razorpayOrderId) {
        throw new AppError(409, 'This order has no active Razorpay payment.');
      }
      if (payment.razorpayOrderId !== razorpayOrderId) {
        throw new AppError(400, 'Payment does not belong to this order.');
      }
      if (payment.status === 'paid') {
        if (payment.razorpayPaymentId !== razorpayPaymentId) {
          throw new AppError(409, 'A different payment has already been recorded for this order.');
        }
        await confirmCouponRedemption(order.id, t);
        return order;
      }
      if (order.status !== 'pending_payment' || order.paymentStatus !== 'pending') {
        throw new AppError(409, 'This order is no longer awaiting payment.');
      }
      await payment.update(
        {
          status: 'paid',
          razorpayPaymentId,
          razorpaySignature,
        },
        { transaction: t },
      );

      await order.update(
        {
          paymentStatus: 'paid',
          status: 'confirmed',
        },
        { transaction: t },
      );

      await OrderStatusHistory.create(
        {
          orderId: order.id,
          previousStatus: 'pending_payment',
          newStatus: 'confirmed',
          notes: `Razorpay payment verified (${razorpayPaymentId})`,
          changedBy: req.user.id,
        },
        { transaction: t },
      );
      await confirmCouponRedemption(order.id, t);
      return order;
    });

    const fullOrder = await Order.findByPk(verifiedOrder.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name'], include: [{ model: ProductImage, as: 'images', attributes: ['imageUrl', 'isPrimary'] }] }] },
        { model: Shop, as: 'shop', attributes: ['id', 'name', 'address', 'contactPhone'] },
      ],
    });
    res.json({ success: true, message: 'Payment verified and order confirmed.', order: fullOrder });
  }),
);

const deliveredOrderWhere = {
  [Op.or]: [{ status: 'delivered' }, { deliveryStatus: 'delivered' }],
};

router.get('/products/:id/review-eligibility', wrap(async (req, res) => {
  const productId = idParam(req, 'id');
  const product = await Product.findOne({ where: { id: productId, isActive: true }, attributes: ['id'] });
  if (!product) throw new AppError(404, 'Product not found');
  const orders = await Order.findAll({ where: { customerId: req.user.id, ...deliveredOrderWhere }, include: [{ model: OrderItem, as: 'items', where: { productId }, required: true }], order: [['updatedAt', 'DESC']] });
  if (!orders.length) return res.json({ eligible: false, reason: 'A delivered purchase is required before reviewing this product.' });
  const reviews = await ProductReview.findAll({ where: { productId, customerId: req.user.id, orderId: orders.map((order) => order.id) } });
  const reviewedOrderIds = new Set(reviews.map((review) => Number(review.orderId)));
  const eligibleOrder = orders.find((order) => !reviewedOrderIds.has(Number(order.id)));
  res.json({ eligible: Boolean(eligibleOrder), orderId: eligibleOrder?.id || null, review: reviews[0] || null, reason: eligibleOrder ? null : 'You have already reviewed this product.' });
}));

router.post('/products/:id/reviews', validate(z.object({ orderId: z.coerce.number().int().positive().optional(), rating: z.coerce.number().int().min(1).max(5), title: z.string().trim().max(150).optional(), body: z.string().trim().min(1, 'Review body is required').max(1500) })), wrap(async (req, res) => {
  const productId = idParam(req, 'id');
  const product = await Product.findOne({ where: { id: productId, isActive: true } });
  if (!product) throw new AppError(404, 'Product not found');
  const deliveredOrders = await Order.findAll({
    where: {
      customerId: req.user.id,
      ...deliveredOrderWhere,
      ...(req.valid.orderId ? { id: req.valid.orderId } : {}),
    },
    include: [{ model: OrderItem, as: 'items', where: { productId }, required: true }],
    order: [['updatedAt', 'DESC']],
  });
  if (!deliveredOrders.length) throw new AppError(403, 'A delivered purchase is required before reviewing this product.');

  let eligibleOrder = deliveredOrders[0];
  if (!req.valid.orderId) {
    const existingReviews = await ProductReview.findAll({
      where: { productId, customerId: req.user.id, orderId: deliveredOrders.map((order) => order.id) },
      attributes: ['orderId'],
    });
    const reviewedOrderIds = new Set(existingReviews.map((review) => Number(review.orderId)));
    eligibleOrder = deliveredOrders.find((order) => !reviewedOrderIds.has(Number(order.id)));
    if (!eligibleOrder) throw new AppError(409, 'You have already reviewed this product for every delivered order.');
  }

  try {
    const review = await ProductReview.create({ productId, customerId: req.user.id, orderId: eligibleOrder.id, rating: req.valid.rating, title: req.valid.title || null, body: req.valid.body });
    res.status(201).json({ review, message: 'Your verified purchase review was published.' });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') throw new AppError(409, 'You have already reviewed this product for this order.');
    throw error;
  }
}));

router.put('/reviews/:id', validate(z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional(),
  body: z.string().trim().min(1, 'Review body is required').max(1500),
})), wrap(async (req, res) => {
  const review = await ProductReview.findOne({
    where: { id: idParam(req, 'id'), customerId: req.user.id },
  });
  if (!review) throw new AppError(404, 'Review not found');

  const deliveredOrder = await Order.findOne({
    where: {
      id: review.orderId,
      customerId: req.user.id,
      ...deliveredOrderWhere,
    },
    include: [{
      model: OrderItem,
      as: 'items',
      where: { productId: review.productId },
      required: true,
    }],
  });
  if (!deliveredOrder) {
    throw new AppError(403, 'Only reviews for your delivered purchases can be edited.');
  }

  await review.update({
    rating: req.valid.rating,
    title: req.valid.title || null,
    body: req.valid.body,
  });
  res.json({ review, message: 'Your review was updated successfully.' });
}));

/* ---------------------- Customer Order History ---------------------- */
router.get(
  '/orders',
  wrap(async (req, res) => {
    const items = await Order.findAll({
      where: { customerId: req.user.id },
      include: [
        { model: Shop, as: 'shop', attributes: ['id', 'name', 'address', 'contactPhone'] },
        { model: OrderItem, as: 'items' },
        { model: Return, as: 'returns', include: [{ model: ReturnItem, as: 'items', include: [{ model: OrderItem, as: 'orderItem' }] }] },
      ],
      order: [['createdAt', 'DESC']],
    });
    const orderIds = items.map((order) => order.id);
    const reviews = orderIds.length ? await ProductReview.findAll({ where: { customerId: req.user.id, orderId: orderIds } }) : [];
    const reviewByProductAndOrder = new Map(reviews.map((review) => [`${review.orderId}:${review.productId}`, review.toJSON()]));
    const enrichedItems = items.map((order) => {
      const json = order.toJSON();
      json.items = (json.items || []).map((item) => ({ ...item, review: reviewByProductAndOrder.get(`${order.id}:${item.productId}`) || null }));
      return json;
    });
    res.json({ items: enrichedItems });
  }),
);

router.get(
  '/orders/:id',
  wrap(async (req, res) => {
    const order = await Order.findOne({
      where: { id: idParam(req, 'id'), customerId: req.user.id },
      include: [
        { model: Shop, as: 'shop', attributes: ['id', 'name', 'address', 'contactPhone'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', include: [{ model: ProductImage, as: 'images' }] }] },
        { model: OrderStatusHistory, as: 'statusHistory' },
        { model: Payment, as: 'payments', attributes: ['id', 'amount', 'paymentMethod', 'status', 'razorpayOrderId', 'razorpayPaymentId', 'codCollectedAmount', 'codCollectedAt'] },
        { model: Return, as: 'returns', include: [{ model: ReturnItem, as: 'items' }] },
        { model: DeliveryAssignment, as: 'delivery', attributes: ['status', 'assignedAt', 'pickedUpAt', 'deliveredAt', 'notes'] },
      ],
    });
    if (!order) throw new AppError(404, 'Order not found');
    res.json({ order });
  }),
);

router.post('/orders/:id/reorder', wrap(async (req, res) => {
  const order = await Order.findOne({ where: { id: idParam(req, 'id'), customerId: req.user.id } });
  if (!order) throw new AppError(404, 'Order not found');
  const items = await OrderItem.findAll({ where: { orderId: order.id } });
  if (!items.length) throw new AppError(400, 'This order has no items to reorder.');
  const result = await sequelize.transaction(async (t) => {
    const [cart] = await Cart.findOrCreate({ where: { userId: req.user.id, shopId: order.shopId }, transaction: t, defaults: { userId: req.user.id, shopId: order.shopId } });
    const added = [];
    const unavailable = [];
    for (const oldItem of items) {
      const listing = await SellerListing.findOne({ where: { shopId: order.shopId, productVariantId: oldItem.productVariantId, isActive: true }, include: [{ model: ProductVariant, as: 'variant', include: [{ model: Product, as: 'product' }] }], transaction: t });
      const stock = await Inventory.findOne({ where: { shopId: order.shopId, productVariantId: oldItem.productVariantId }, transaction: t, lock: t.LOCK.UPDATE });
      if (!listing || !listing.variant?.isActive || !listing.variant.product?.isActive || !stock || stock.quantity < 1) { unavailable.push(oldItem.productName); continue; }
      const existing = await CartItem.findOne({ where: { cartId: cart.id, productVariantId: oldItem.productVariantId }, transaction: t, lock: t.LOCK.UPDATE });
      const desired = (existing?.quantity || 0) + oldItem.quantity;
      const quantity = Math.min(desired, stock.quantity);
      if (existing) await existing.update({ quantity, unitPrice: listing.retailPrice }, { transaction: t });
      else await CartItem.create({ cartId: cart.id, productId: listing.productId, productVariantId: oldItem.productVariantId, quantity, unitPrice: listing.retailPrice }, { transaction: t });
      added.push({ name: oldItem.productName, quantity });
    }
    return { added, unavailable };
  });
  res.json(result);
}));

router.post(
  '/orders/:id/cancel',
  validate(z.object({ reason: z.string().trim().optional() })),
  wrap(async (req, res) => {
    const order = await Order.findOne({
      where: { id: idParam(req, 'id'), customerId: req.user.id },
    });
    if (!order) throw new AppError(404, 'Order not found');

    const cancellableStatuses = ['pending_payment', 'confirmed', 'processing'];
    if (!cancellableStatuses.includes(order.status)) {
      throw new AppError(400, `Cannot cancel an order in "${order.status}" status.`);
    }

    const updated = await transitionOrderStatus(
      order.id,
      order.shopId,
      'cancelled',
      req.user.id,
      req.valid.reason || 'Cancelled by customer',
    );
    if (order.paymentStatus !== 'paid') {
      await sequelize.transaction((transaction) =>
        releaseCouponRedemption(order.id, transaction),
      );
    }

    res.json({ order: updated, message: 'Order successfully cancelled.' });
  }),
);

router.post(
  '/orders/:id/return',
  validate(
    z.object({
      reason: z.string().trim().min(5, 'Reason is required'),
      items: z.array(
        z.object({
          orderItemId: z.coerce.number().int().positive(),
          quantity: z.coerce.number().int().positive(),
        }),
      ).min(1, 'Select items to return'),
    }),
  ),
  wrap(async (req, res) => {
    const order = await Order.findOne({
      where: { id: idParam(req, 'id'), customerId: req.user.id },
    });
    if (!order) throw new AppError(404, 'Order not found');

    if (order.status !== 'delivered') {
      throw new AppError(400, 'Returns can only be requested for delivered orders.');
    }

    const ret = await sequelize.transaction(async (t) => {
      await order.reload({ transaction: t, lock: t.LOCK.UPDATE });
      if (order.status !== 'delivered') {
        throw new AppError(400, 'Returns can only be requested for delivered orders.');
      }
      const existingReturn = await Return.findOne({ where: { orderId: order.id }, transaction: t, lock: t.LOCK.UPDATE });
      if (existingReturn) throw new AppError(409, 'A return request has already been submitted for this order.');
      const requestedIds = req.valid.items.map((item) => item.orderItemId);
      if (new Set(requestedIds).size !== requestedIds.length) throw new AppError(400, 'A return item can only be selected once.');
      const orderItems = await OrderItem.findAll({ where: { orderId: order.id }, transaction: t, lock: t.LOCK.UPDATE });
      const orderItemsById = new Map(orderItems.map((item) => [Number(item.id), item]));
      let refundAmount = 0;
      for (const requested of req.valid.items) {
        const orderItem = orderItemsById.get(requested.orderItemId);
        if (!orderItem) throw new AppError(400, 'One or more selected items do not belong to this order.');
        if (requested.quantity > orderItem.quantity) throw new AppError(400, `Return quantity for ${orderItem.productName} exceeds the purchased quantity.`);
        refundAmount += Number(orderItem.unitPrice) * requested.quantity;
      }
      const returnDoc = await Return.create(
        {
          orderId: order.id,
          shopId: order.shopId,
          customerId: req.user.id,
          reason: req.valid.reason,
          status: 'requested',
          refundAmount: Number(refundAmount.toFixed(2)),
        },
        { transaction: t },
      );

      for (const item of req.valid.items) {
        await ReturnItem.create(
          {
            returnId: returnDoc.id,
            orderItemId: item.orderItemId,
            quantity: item.quantity,
            reason: req.valid.reason,
          },
          { transaction: t },
        );
      }

      return returnDoc;
    });

    res.status(201).json({ return: ret, message: 'Return request submitted successfully.' });
  }),
);

/* -------------------- Customer Payment History ---------------------- */
router.get(
  '/payments',
  wrap(async (req, res) => {
    const items = await Payment.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          where: { customerId: req.user.id },
          attributes: ['id', 'orderNumber', 'status', 'totalAmount'],
        },
      ],
      attributes: ['id', 'orderId', 'amount', 'paymentMethod', 'status', 'razorpayOrderId', 'razorpayPaymentId', 'codCollectedAmount', 'codCollectedAt', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    res.json({ items });
  }),
);

/* ------------------------ Customer Profile -------------------------- */
router.get(
  '/profile',
  wrap(async (req, res) => {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'name', 'email', 'phone', 'role', 'status', 'createdAt'],
    });
    res.json({ profile: user });
  }),
);

router.patch(
  '/profile',
  validate(z.object({ name: z.string().trim().min(2).max(120).optional(), phone: optional(phone) })),
  wrap(async (req, res) => {
    const user = await User.findByPk(req.user.id);
    await user.update(req.valid);
    res.json({ profile: user });
  }),
);

module.exports = router;
