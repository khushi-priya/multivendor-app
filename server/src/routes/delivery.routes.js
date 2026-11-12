// // const router = require('express').Router();
// // const { AttendanceRecord, DeliveryAssignment, EmployeeProfile, Order, OrderItem, OrderStatusHistory, Payment, Shop, ShopRole, ShopMembership, User, sequelize } = require('../models');
// // const { AppError, wrap, idParam } = require('../utils/errors');
// // const { validate, z } = require('../utils/validate');
// // const { requireAuth } = require('../middleware/auth');
// // const { uploadImage } = require('../utils/uploads');
// // const { toCents } = require('../services/orderPricing');
// // const {
// //   effectivePermissionsForMembership,
// //   permissionGranted,
// // } = require('../services/permissions');

// // router.use(requireAuth);

// // // Delivery associate must be an active shop_user
// // router.use((req, res, next) => {
// //   if (!req.user || req.user.role !== 'shop_user') {
// //     throw new AppError(403, 'Forbidden: Delivery associate access required');
// //   }
// //   next();
// // });

// // const requireDeliveryPermission = (permission) =>
// //   wrap(async (req, res, next) => {
// //     const membership = await ShopMembership.findOne({
// //       where: { userId: req.user.id, status: 'active' },
// //       include: [{ model: Shop, as: 'shop' }],
// //     });
// //     if (!membership || !membership.shop || membership.shop.status !== 'active') {
// //       throw new AppError(403, 'No active shop is assigned to this account.');
// //     }

// //     let customRole = null;
// //     if (membership.role !== 'shop_owner') {
// //       customRole = await ShopRole.findOne({
// //         where: {
// //           shopId: membership.shopId,
// //           code: membership.role,
// //           isActive: true,
// //         },
// //       });
// //     }
// //     const permissions = effectivePermissionsForMembership(membership, customRole);
// //     if (
// //       membership.role !== 'shop_owner' &&
// //       !permissionGranted(permissions, permission)
// //     ) {
// //       throw new AppError(403, 'You do not have permission to access delivery assignments.');
// //     }
// //     req.shop = membership.shop;
// //     req.membership = membership;
// //     req.permissions = permissions;
// //     next();
// //   });

// // /* --------------------- List My Assigned Deliveries ------------------- */
// // router.get(
// //   '/assignments',
// //   requireDeliveryPermission('delivery.view'),
// //   wrap(async (req, res) => {
// //     const items = await DeliveryAssignment.findAll({
// //       where: { shopId: req.shop.id, deliveryUserId: req.user.id },
// //       include: [
// //         {
// //           model: Order,
// //           as: 'order',
// //           include: [
// //             { model: Shop, as: 'shop', attributes: ['id', 'name', 'address', 'contactPhone'] },
// //             { model: User, as: 'customer', attributes: ['id', 'name', 'phone'] },
// //             { model: OrderItem, as: 'items' },
// //             { model: Payment, as: 'payments', attributes: ['id', 'amount', 'paymentMethod', 'codCollectedAmount', 'codCollectedAt', 'codReconciled'] },
// //             { model: OrderStatusHistory, as: 'statusHistory', order: [['createdAt', 'ASC']] },
// //           ],
// //         },
// //       ],
// //       order: [['assignedAt', 'DESC']],
// //     });
// //     res.json({ items });
// //   }),
// // );

// // /* ---------------------- Get Assignment Details ---------------------- */
// // router.get(
// //   '/assignments/:id',
// //   requireDeliveryPermission('delivery.view'),
// //   wrap(async (req, res) => {
// //     const item = await DeliveryAssignment.findOne({
// //       where: {
// //         id: idParam(req, 'id'),
// //         shopId: req.shop.id,
// //         deliveryUserId: req.user.id,
// //       },
// //       include: [
// //         {
// //           model: Order,
// //           as: 'order',
// //           include: [
// //             { model: Shop, as: 'shop', attributes: ['id', 'name', 'address', 'contactPhone'] },
// //             { model: User, as: 'customer', attributes: ['id', 'name', 'phone'] },
// //             { model: OrderItem, as: 'items' },
// //             { model: Payment, as: 'payments', attributes: ['id', 'amount', 'paymentMethod', 'codCollectedAmount', 'codCollectedAt', 'codReconciled'] },
// //             { model: OrderStatusHistory, as: 'statusHistory', order: [['createdAt', 'ASC']] },
// //           ],
// //         },
// //       ],
// //     });
// //     if (!item) throw new AppError(404, 'Delivery assignment not found');
// //     res.json({ item });
// //   }),
// // );

// // /* ---------------------- Update Delivery Status ---------------------- */
// // const updateStatusSchema = z.object({
// //   status: z.enum(['picked_up', 'out_for_delivery', 'delivered', 'failed']),
// //   notes: z.string().trim().max(500).optional(),
// //   failureReason: z.enum([
// //     'customer_unavailable',
// //     'customer_refused',
// //     'incorrect_address',
// //     'customer_unreachable',
// //     'other',
// //   ]).optional(),
// //   failureDescription: z.string().trim().max(400).optional(),
// // }).superRefine((body, context) => {
// //   if (body.status === 'failed' && !body.failureReason) {
// //     context.addIssue({
// //       code: z.ZodIssueCode.custom,
// //       path: ['failureReason'],
// //       message: 'Select a reason for the failed delivery.',
// //     });
// //   }
// //   if (
// //     body.status === 'failed' &&
// //     body.failureReason === 'other' &&
// //     !body.failureDescription
// //   ) {
// //     context.addIssue({
// //       code: z.ZodIssueCode.custom,
// //       path: ['failureDescription'],
// //       message: 'Describe the failure when Other is selected.',
// //     });
// //   }
// // });

// // router.patch(
// //   '/assignments/:id/status',
// //   requireDeliveryPermission('delivery.update'),
// //   uploadImage.single('proof'),
// //   validate(updateStatusSchema),
// //   wrap(async (req, res) => {
// //     const { status, notes, failureReason, failureDescription } = req.valid;
// //     if (req.file && status !== 'delivered') {
// //       throw new AppError(400, 'Delivery proof can only be uploaded when marking an order delivered.');
// //     }

// //     const assignment = await sequelize.transaction(async (t) => {
// //       const currentAssignment = await DeliveryAssignment.findOne({
// //         where: {
// //           id: idParam(req, 'id'),
// //           shopId: req.shop.id,
// //           deliveryUserId: req.user.id,
// //         },
// //         transaction: t,
// //         lock: t.LOCK.UPDATE,
// //       });
// //       if (!currentAssignment) throw new AppError(404, 'Delivery assignment not found');

// //       const allowedNextStatuses = {
// //         assigned: ['picked_up'],
// //         picked_up: ['out_for_delivery'],
// //         out_for_delivery: ['delivered', 'failed'],
// //       };
// //       if (!(allowedNextStatuses[currentAssignment.status] || []).includes(status)) {
// //         throw new AppError(409, 'This delivery status transition is not allowed.');
// //       }

// //       const order = await Order.findOne({
// //         where: { id: currentAssignment.orderId, shopId: req.shop.id },
// //         transaction: t,
// //         lock: t.LOCK.UPDATE,
// //       });
// //       if (!order) throw new AppError(404, 'Associated order not found');

// //       const now = new Date();
// //       const orderStatus = {
// //         picked_up: 'picked_up',
// //         out_for_delivery: 'out_for_delivery',
// //         delivered: 'delivered',
// //         failed: 'delivery_failed',
// //       }[status];
// //       const failureLabels = {
// //         customer_unavailable: 'Customer unavailable',
// //         customer_refused: 'Customer refused delivery',
// //         incorrect_address: 'Incorrect or incomplete address',
// //         customer_unreachable: 'Customer unreachable',
// //         other: 'Other',
// //       };
// //       const deliveryNotes = status === 'failed'
// //         ? `${failureLabels[failureReason]}${failureDescription ? `: ${failureDescription}` : ''}${notes ? ` — ${notes}` : ''}`
// //         : notes || currentAssignment.notes;
// //       const previousStatus = order.status;

// //       await currentAssignment.update(
// //         {
// //           status,
// //           notes: deliveryNotes,
// //           ...(status === 'picked_up' ? { pickedUpAt: now } : {}),
// //           ...(status === 'delivered' ? { deliveredAt: now } : {}),
// //           ...(req.file ? { proofImagePath: `/uploads/${req.file.filename}` } : {}),
// //         },
// //         { transaction: t },
// //       );
// //       await order.update(
// //         { status: orderStatus, deliveryStatus: status },
// //         { transaction: t },
// //       );

// //       await OrderStatusHistory.create(
// //         {
// //           orderId: order.id,
// //           previousStatus,
// //           newStatus: orderStatus,
// //           notes: deliveryNotes || `Delivery updated to ${status}`,
// //           changedBy: req.user.id,
// //         },
// //         { transaction: t },
// //       );
// //       return currentAssignment;
// //     });

// //     res.json({ assignment });
// //   }),
// // );

// // router.post(
// //   '/assignments/:id/cod-collection',
// //   requireDeliveryPermission('delivery.update'),
// //   validate(z.object({
// //     amount: z.coerce.number().finite().positive().max(99999999.99),
// //     notes: z.string().trim().max(500).optional(),
// //   })),
// //   wrap(async (req, res) => {
// //     const payment = await sequelize.transaction(async (t) => {
// //       const assignment = await DeliveryAssignment.findOne({
// //         where: {
// //           id: idParam(req, 'id'),
// //           shopId: req.shop.id,
// //           deliveryUserId: req.user.id,
// //         },
// //         transaction: t,
// //         lock: t.LOCK.UPDATE,
// //       });
// //       if (!assignment) throw new AppError(404, 'Delivery assignment not found.');
// //       if (assignment.status !== 'delivered') {
// //         throw new AppError(409, 'Record COD cash only after the delivery is marked delivered.');
// //       }

// //       const order = await Order.findOne({
// //         where: { id: assignment.orderId, shopId: req.shop.id },
// //         transaction: t,
// //         lock: t.LOCK.UPDATE,
// //       });
// //       if (!order) throw new AppError(404, 'Order not found.');
// //       if (order.paymentMethod !== 'cod') {
// //         throw new AppError(400, 'Only Cash on Delivery orders can record cash collection.');
// //       }

// //       const record = await Payment.findOne({
// //         where: { orderId: order.id, shopId: req.shop.id, paymentMethod: 'cod' },
// //         transaction: t,
// //         lock: t.LOCK.UPDATE,
// //       });
// //       if (!record) throw new AppError(404, 'COD payment record not found.');
// //       if (record.codCollectedAt || record.codCollectedAmount != null) {
// //         throw new AppError(409, 'COD collection has already been recorded.');
// //       }
// //       if (toCents(req.valid.amount, 'Collected amount') !== toCents(record.amount, 'Amount due')) {
// //         throw new AppError(400, 'Collected cash must equal the COD amount due. Partial collection is not supported.');
// //       }

// //       await record.update({
// //         codCollectedAmount: req.valid.amount.toFixed(2),
// //         codCollectedBy: req.user.id,
// //         codCollectedAt: new Date(),
// //         meta: {
// //           ...(record.meta || {}),
// //           codCollectionNotes: req.valid.notes || null,
// //         },
// //       }, { transaction: t });
// //       return record;
// //     });
// //     res.json({
// //       payment,
// //       reconciliationStatus: 'pending_reconciliation',
// //     });
// //   }),
// // );

// // router.get(
// //   '/history',
// //   requireDeliveryPermission('delivery.view'),
// //   wrap(async (req, res) => {
// //     const assignments = await DeliveryAssignment.findAll({
// //       where: { shopId: req.shop.id, deliveryUserId: req.user.id },
// //       attributes: ['orderId'],
// //     });
// //     const orderIds = assignments.map((assignment) => assignment.orderId);
// //     if (!orderIds.length) return res.json({ items: [] });
// //     const items = await OrderStatusHistory.findAll({
// //       where: { orderId: orderIds },
// //       include: [
// //         { model: Order, as: 'order', attributes: ['id', 'orderNumber'] },
// //         { model: User, as: 'changer', attributes: ['id', 'name'] },
// //       ],
// //       order: [['createdAt', 'ASC']],
// //     });
// //     res.json({ items });
// //   }),
// // );

// // router.get(
// //   '/profile',
// //   requireDeliveryPermission('delivery.view'),
// //   wrap(async (req, res) => {
// //     const [user, profile] = await Promise.all([
// //       User.findByPk(req.user.id, { attributes: ['id', 'name', 'email', 'phone'] }),
// //       EmployeeProfile.findOne({
// //         where: { userId: req.user.id, shopId: req.shop.id },
// //         attributes: ['designation', 'employeeCode', 'joinedDate', 'address'],
// //       }),
// //     ]);
// //     if (!user) throw new AppError(404, 'Employee profile not found.');
// //     res.json({ user, profile });
// //   }),
// // );

// // router.get(
// //   '/attendance',
// //   requireDeliveryPermission('delivery.view'),
// //   wrap(async (req, res) => {
// //     const items = await AttendanceRecord.findAll({
// //       where: { shopId: req.shop.id, userId: req.user.id },
// //       order: [['date', 'DESC']],
// //     });
// //     res.json({ items });
// //   }),
// // );

// // module.exports = router;






const router = require('express').Router();

const {
  AttendanceRecord,
  DeliveryAssignment,
  EmployeeProfile,
  Order,
  OrderItem,
  OrderStatusHistory,
  Payment,
  Shop,
  ShopRole,
  ShopMembership,
  User,
  sequelize,
} = require('../models');

const { AppError, wrap, idParam } = require('../utils/errors');
const { validate, z } = require('../utils/validate');
const { requireAuth } = require('../middleware/auth');
const { uploadImage } = require('../utils/uploads');
const { toCents } = require('../services/orderPricing');

const {
  effectivePermissionsForMembership,
  permissionGranted,
} = require('../services/permissions');

router.use(requireAuth);

/* =========================================================
   DELIVERY ASSOCIATE ACCESS
========================================================= */

router.use((req, res, next) => {
  if (!req.user || req.user.role !== 'shop_user') {
    return next(
      new AppError(
        403,
        'Forbidden: Delivery associate access required.'
      )
    );
  }

  next();
});

/* =========================================================
   DELIVERY PERMISSION MIDDLEWARE
========================================================= */

const requireDeliveryPermission = (permission) =>
  wrap(async (req, res, next) => {
    const membership = await ShopMembership.findOne({
      where: {
        userId: req.user.id,
        status: 'active',
      },
      include: [
        {
          model: Shop,
          as: 'shop',
        },
      ],
    });

    if (
      !membership ||
      !membership.shop ||
      membership.shop.status !== 'active'
    ) {
      throw new AppError(
        403,
        'No active shop is assigned to this account.'
      );
    }

    let customRole = null;

    if (membership.role !== 'shop_owner') {
      customRole = await ShopRole.findOne({
        where: {
          shopId: membership.shopId,
          code: membership.role,
          isActive: true,
        },
      });
    }

    const permissions = effectivePermissionsForMembership(
      membership,
      customRole
    );

    if (
      membership.role !== 'shop_owner' &&
      !permissionGranted(permissions, permission)
    ) {
      throw new AppError(
        403,
        `You do not have permission: ${permission}.`
      );
    }

    req.shop = membership.shop;
    req.membership = membership;
    req.permissions = permissions;

    next();
  });

/* =========================================================
   SHARED ORDER INCLUDE
========================================================= */

const assignmentOrderInclude = [
  {
    model: Shop,
    as: 'shop',
    attributes: [
      'id',
      'name',
      'address',
      'contactPhone',
    ],
  },
  {
    model: User,
    as: 'customer',
    attributes: [
      'id',
      'name',
      'phone',
    ],
  },
  {
    model: OrderItem,
    as: 'items',
  },
  {
    model: Payment,
    as: 'payments',
    attributes: [
      'id',
      'amount',
      'status',
      'paymentMethod',
      'codCollectedAmount',
      'codCollectedBy',
      'codCollectedAt',
      'codReconciled',
      'codReconciledAt',
    ],
  },
  {
    model: OrderStatusHistory,
    as: 'statusHistory',
  },
];

/* =========================================================
   1. MY ASSIGNED DELIVERIES
========================================================= */

router.get(
  '/assignments',
  requireDeliveryPermission('delivery.view'),
  wrap(async (req, res) => {
    const items = await DeliveryAssignment.findAll({
      where: {
        shopId: req.shop.id,
        deliveryUserId: req.user.id,
      },
      include: [
        {
          model: Order,
          as: 'order',
          include: assignmentOrderInclude,
        },
      ],
      order: [['assignedAt', 'DESC']],
    });

    res.json({ items });
  })
);

/* =========================================================
   2. DELIVERY ASSIGNMENT DETAILS
========================================================= */

router.get(
  '/assignments/:id',
  requireDeliveryPermission('delivery.view'),
  wrap(async (req, res) => {
    const item = await DeliveryAssignment.findOne({
      where: {
        id: idParam(req, 'id'),
        shopId: req.shop.id,
        deliveryUserId: req.user.id,
      },
      include: [
        {
          model: Order,
          as: 'order',
          include: assignmentOrderInclude,
        },
      ],
    });

    if (!item) {
      throw new AppError(
        404,
        'Delivery assignment not found.'
      );
    }

    res.json({ item });
  })
);

/* =========================================================
   3. UPDATE DELIVERY STATUS
========================================================= */

const updateStatusSchema = z.object({
  status: z.enum([
    'picked_up',
    'out_for_delivery',
    'delivered',
    'failed',
  ]),

  notes: z.string().trim().max(500).optional(),

  failureReason: z.enum([
    'customer_unavailable',
    'customer_refused',
    'incorrect_address',
    'customer_unreachable',
    'other',
  ]).optional(),

  failureDescription: z.string().trim().max(400).optional(),
}).superRefine((body, context) => {
  if (body.status === 'failed' && !body.failureReason) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['failureReason'],
      message: 'Select a reason for the failed delivery.',
    });
  }

  if (
    body.status === 'failed' &&
    body.failureReason === 'other' &&
    !body.failureDescription
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['failureDescription'],
      message: 'Describe the failure when Other is selected.',
    });
  }
});

router.patch(
  '/assignments/:id/status',
  requireDeliveryPermission('delivery.update'),
  uploadImage.single('proof'),
  validate(updateStatusSchema),
  wrap(async (req, res) => {
    const {
      status,
      notes,
      failureReason,
      failureDescription,
    } = req.valid;

    if (req.file && status !== 'delivered') {
      throw new AppError(
        400,
        'Delivery proof can only be uploaded when marking an order delivered.'
      );
    }

    const result = await sequelize.transaction(async (t) => {
      const assignment = await DeliveryAssignment.findOne({
        where: {
          id: idParam(req, 'id'),
          shopId: req.shop.id,
          deliveryUserId: req.user.id,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!assignment) {
        throw new AppError(
          404,
          'Delivery assignment not found.'
        );
      }

      const allowedNextStatuses = {
        assigned: ['picked_up'],
        picked_up: ['out_for_delivery'],
        out_for_delivery: ['delivered', 'failed'],
      };

      if (
        !(allowedNextStatuses[assignment.status] || []).includes(status)
      ) {
        throw new AppError(
          409,
          'This delivery status transition is not allowed.'
        );
      }

      const order = await Order.findOne({
        where: {
          id: assignment.orderId,
          shopId: req.shop.id,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        throw new AppError(
          404,
          'Associated order not found.'
        );
      }

      const now = new Date();

      const orderStatusMap = {
        picked_up: 'picked_up',
        out_for_delivery: 'out_for_delivery',
        delivered: 'delivered',
        failed: 'delivery_failed',
      };

      const failureLabels = {
        customer_unavailable: 'Customer unavailable',
        customer_refused: 'Customer refused delivery',
        incorrect_address: 'Incorrect or incomplete address',
        customer_unreachable: 'Customer unreachable',
        other: 'Other',
      };

      const deliveryNotes =
        status === 'failed'
          ? `${failureLabels[failureReason]}${
              failureDescription
                ? `: ${failureDescription}`
                : ''
            }${notes ? ` — ${notes}` : ''}`
          : notes || assignment.notes;

      const previousStatus = order.status;
      const nextOrderStatus = orderStatusMap[status];

      await assignment.update(
        {
          status,
          notes: deliveryNotes,

          ...(status === 'picked_up'
            ? { pickedUpAt: now }
            : {}),

          ...(status === 'delivered'
            ? { deliveredAt: now }
            : {}),

          ...(req.file
            ? {
                proofImagePath: `/uploads/${req.file.filename}`,
              }
            : {}),
        },
        { transaction: t }
      );

      await order.update(
        {
          status: nextOrderStatus,
          deliveryStatus: status,
        },
        { transaction: t }
      );

      await OrderStatusHistory.create(
        {
          orderId: order.id,
          previousStatus,
          newStatus: nextOrderStatus,
          notes:
            deliveryNotes ||
            `Delivery updated to ${status}`,
          changedBy: req.user.id,
        },
        { transaction: t }
      );

      return {
        assignment,
        order,
      };
    });

    res.json({
      message: 'Delivery status updated successfully.',
      assignment: result.assignment,
      order: {
        id: result.order.id,
        status: result.order.status,
        deliveryStatus: result.order.deliveryStatus,
      },
    });
  })
);

/* =========================================================
   4. COD CASH COLLECTION
========================================================= */

const codCollectionSchema = z.object({
  amount: z.coerce
    .number()
    .finite()
    .positive()
    .max(99999999.99),

  notes: z.string().trim().max(500).optional(),
});

router.post(
  '/assignments/:id/cod-collection',
  requireDeliveryPermission('delivery.update'),
  validate(codCollectionSchema),
  wrap(async (req, res) => {
    const result = await sequelize.transaction(async (t) => {
      // Only the associate assigned to this delivery can collect COD.
      const assignment = await DeliveryAssignment.findOne({
        where: {
          id: idParam(req, 'id'),
          shopId: req.shop.id,
          deliveryUserId: req.user.id,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!assignment) {
        throw new AppError(
          404,
          'Delivery assignment not found.'
        );
      }

      if (assignment.status !== 'delivered') {
        throw new AppError(
          409,
          'Record COD cash only after the delivery is marked delivered.'
        );
      }

      // Lock the order before changing its payment status.
      const order = await Order.findOne({
        where: {
          id: assignment.orderId,
          shopId: req.shop.id,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!order) {
        throw new AppError(
          404,
          'Associated order not found.'
        );
      }

      if (order.paymentMethod !== 'cod') {
        throw new AppError(
          400,
          'Only Cash on Delivery orders can record cash collection.'
        );
      }

      // Lock the COD payment record.
      const payment = await Payment.findOne({
        where: {
          orderId: order.id,
          shopId: req.shop.id,
          paymentMethod: 'cod',
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!payment) {
        throw new AppError(
          404,
          'COD payment record not found.'
        );
      }

      // Prevent duplicate collection.
      if (
        payment.codCollectedAt ||
        payment.codCollectedAmount !== null &&
          payment.codCollectedAmount !== undefined
      ) {
        throw new AppError(
          409,
          'COD collection has already been recorded.'
        );
      }

      if (payment.status !== 'pending') {
        throw new AppError(
          409,
          'This COD payment is not pending collection.'
        );
      }

      // Partial COD collection is not supported.
      const collectedCents = toCents(
        req.valid.amount,
        'Collected amount'
      );

      const dueCents = toCents(
        payment.amount,
        'Amount due'
      );

      if (collectedCents !== dueCents) {
        throw new AppError(
          400,
          'Collected cash must equal the COD amount due. Partial collection is not supported.'
        );
      }

      const collectedAt = new Date();

      // Customer has paid the delivery associate.
      // Cash handover to the shop is still pending.
      await payment.update(
        {
          status: 'paid',
          codCollectedAmount: req.valid.amount.toFixed(2),
          codCollectedBy: req.user.id,
          codCollectedAt: collectedAt,

          // Collection and shop reconciliation are separate steps.
          codReconciled: false,
          codReconciledAt: null,
          codReconciledBy: null,

          meta: {
            ...(payment.meta || {}),
            codCollectionNotes: req.valid.notes || null,
          },
        },
        { transaction: t }
      );

      await order.update(
        {
          paymentStatus: 'paid',
        },
        { transaction: t }
      );

      return {
        payment,
        paymentStatus: 'paid',
        collectedAmount: payment.codCollectedAmount,
        collectedAt: payment.codCollectedAt,
      };
    });

    res.json({
      message: 'COD cash collected successfully.',
      payment: result.payment,
      paymentStatus: result.paymentStatus,
      collectedAmount: result.collectedAmount,
      collectedAt: result.collectedAt,
      reconciliationStatus: 'pending_reconciliation',
    });
  })
);

/* =========================================================
   5. MY DELIVERY HISTORY
========================================================= */

router.get(
  '/history',
  requireDeliveryPermission('delivery.view'),
  wrap(async (req, res) => {
    const assignments = await DeliveryAssignment.findAll({
      where: {
        shopId: req.shop.id,
        deliveryUserId: req.user.id,
      },
      attributes: ['orderId'],
    });

    const orderIds = assignments.map(
      (assignment) => assignment.orderId
    );

    if (!orderIds.length) {
      return res.json({ items: [] });
    }

    const items = await OrderStatusHistory.findAll({
      where: {
        orderId: orderIds,
      },
      include: [
        {
          model: Order,
          as: 'order',
          attributes: [
            'id',
            'orderNumber',
          ],
          where: {
            shopId: req.shop.id,
          },
        },
        {
          model: User,
          as: 'changer',
          attributes: [
            'id',
            'name',
          ],
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.json({ items });
  })
);

/* =========================================================
   6. MY PROFILE
========================================================= */

router.get(
  '/profile',
  requireDeliveryPermission('delivery.view'),
  wrap(async (req, res) => {
    const [user, profile] = await Promise.all([
      User.findByPk(req.user.id, {
        attributes: [
          'id',
          'name',
          'email',
          'phone',
        ],
      }),

      EmployeeProfile.findOne({
        where: {
          userId: req.user.id,
          shopId: req.shop.id,
        },
        attributes: [
          'designation',
          'employeeCode',
          'joinedDate',
          'address',
        ],
      }),
    ]);

    if (!user) {
      throw new AppError(
        404,
        'Employee profile not found.'
      );
    }

    res.json({
      user,
      profile,
    });
  })
);

/* =========================================================
   7. MY ATTENDANCE
========================================================= */

router.get(
  '/attendance',
  requireDeliveryPermission('delivery.view'),
  wrap(async (req, res) => {
    const items = await AttendanceRecord.findAll({
      where: {
        shopId: req.shop.id,
        userId: req.user.id,
      },
      order: [['date', 'DESC']],
    });

    res.json({ items });
  })
);

module.exports = router;
