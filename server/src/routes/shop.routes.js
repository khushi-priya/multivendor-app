const router = require("express").Router();
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Shop,
  ShopCategory,
  ShopMembership,
  ShopRole,
  Wholesaler,
  WholesalerShopAccess,
  Category,
  Subcategory,
  Brand,
  Attribute,
  AttributeValue,
  Product,
  ProductVariant,
  ProductVariantValue,
  ProductImage,
  SellerListing,
  Inventory,
  InventoryMovement,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  UploadedDocument,
  WholesalePayment,
  EmployeeProfile,
  EmployeeSalary,
  AttendanceRecord,
  SalaryPayment,
  PayrollRun,
  PayrollItem,
  Order,
  OrderItem,
  OrderStatusHistory,
  DeliveryAssignment,
  Payment,
  Return,
  ReturnItem,
} = require("../models");
const env = require("../config/env");
const { AppError, wrap, idParam } = require("../utils/errors");
const { validate, z, optional, phone, password } = require("../utils/validate");
const { requireAuth, requireShopAccess } = require("../middleware/auth");
const { uploadBill, uploadImage } = require("../utils/uploads");
const { removeImageIfUnused } = require("../utils/imageStorage");
const { slugify } = require("../services/catalogService");
const {
  adjustStock,
  addStockForReceipt,
} = require("../services/inventoryService");
const { transitionOrderStatus } = require("../services/orderService");
const { reconcileCodPayment } = require("../services/paymentService");
const { DEFAULT_SHIPPING_SETTINGS, normalizeShippingSettings } = require("../services/orderPricing");
const { audit } = require("../utils/audit");
const {
  PERMISSION_MODULES,
  PERMISSION_KEYS,
  normalizePermissions,
  defaultPermissionsForRole,
  effectivePermissionsForMembership,
  permissionGranted,
} = require("../services/permissions");

// Every shop route: authenticated + shop resolved from caller's membership.
router.use(requireAuth);
router.use("/coupons", require("./shop.coupons.routes"));

const OWNER_ONLY = ["shop_owner"];
const WHOLESALE_ROLES = ["shop_owner", "shop_manager"];
const CATALOG_ROLES = ["shop_owner", "shop_manager", "sales_associate"];
const INVENTORY_ROLES = ["shop_owner", "shop_manager"];
const ORDER_ROLES = [
  "shop_owner",
  "shop_manager",
  "sales_associate",
  "cashier",
  "support",
];


const ATTENDANCE_ROLES = ["shop_owner", "shop_manager"];


const page = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const validDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid calendar date");
const money = z.preprocess(
  (value) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && /^\d+(?:\.\d{1,2})?$/.test(value))
      return Number(value);
    return Number.NaN;
  },
  z
    .number()
    .finite()
    .min(0)
    .max(99999999.99)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
      "Use at most two decimal places",
    ),
);
const cents = (value) => Math.round(Number(value || 0) * 100);
const moneyValue = (value) => (value / 100).toFixed(2);
const optionalWeight = z.preprocess(
  (value) => value === "" || value == null ? undefined : value,
  z.coerce.number().finite().positive().max(100000).optional(),
);
const optionalWeightUnit = z.enum(["g", "kg"]).optional();
const optionalGstRate = z.coerce.number().finite().min(0).max(28)
  .refine((value) => Math.round(value * 100) === value * 100, "Use at most two decimal places")
  .optional();


const authorizedWholesalers = (shopId) =>
  WholesalerShopAccess.findAll({
    where: { shopId, status: "active" },
    include: [{ model: Wholesaler, as: "wholesaler" }],
  });

const ownerSubmissionWhere = (shopId) => ({
  [Op.or]: [
    { submittedByShopId: null },
    { submissionStatus: "approved" },
    { submittedByShopId: shopId },
  ],
});

async function requireEditableSubmission(Model, id, shopId, options = {}) {
  const item = await Model.findByPk(id, options);
  if (!item) throw new AppError(404, "Catalog record not found");
  if (
    Number(item.submittedByShopId) !== Number(shopId) ||
    !["pending", "rejected"].includes(item.submissionStatus)
  ) {
    throw new AppError(
      403,
      "Only your own pending or rejected catalog submissions can be edited or deleted.",
    );
  }
  return item;
}

/* ========================================================================== */
/*                                DASHBOARD                                   */
/* ========================================================================== */
router.get(
  "/owner-dashboard",
  requireShopAccess(OWNER_ONLY),
  wrap(async (req, res) => {
    res.json({
      owner: { id: req.user.id, name: req.user.name },
      shop: {
        id: req.shop.id,
        name: req.shop.name,
        status: req.shop.status,
      },
    });
  }),
);

router.get(
  "/dashboard",
  requireShopAccess(),
  wrap(async (req, res) => {
    const shop = await Shop.findByPk(req.shop.id, {
      include: [{ model: ShopCategory, as: "category", attributes: ["name"] }],
    });
    if (!shop) throw new AppError(404, "Shop not found");

    const shopId = req.shop.id;
    const can = (permission) =>
      permissionGranted(req.permissions || [], permission);
    const paidOrderWhere = {
      shopId,
      paymentStatus: "paid",
      status: { [Op.ne]: "cancelled" },
    };
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sumPaidOrders = async (createdAt) => {
      const total = await Order.sum("totalAmount", {
        where: {
          ...paidOrderWhere,
          ...(createdAt ? { createdAt } : {}),
        },
      });
      return total ?? 0;
    };

    const metricErrors = [];
    const runMetric = async (name, query, fallback) => {
      try {
        return await query();
      } catch (error) {
        metricErrors.push(name);
        console.error(
          `[dashboard] shop=${shopId} metric=${name} failed: ${error.name}: ${error.message}`,
        );
        return fallback;
      }
    };

    const [
      wholesalers,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      totalRevenue,
      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      lowStockCount,
      employeeCount,
      pendingReturns,
      pendingRefunds,
      recentOrders,
      lowStockAlerts,
      pendingReturnItems,
      pendingRefundItems,
    ] = await Promise.all([
      runMetric("authorizedWholesalers", () =>
        can("wholesalers.view") ? authorizedWholesalers(shopId) : [],
      null),
      runMetric("totalOrders", () =>
        can("orders.view") ? Order.count({ where: { shopId } }) : 0,
      null),
      runMetric("pendingOrders", () => can("orders.view") ? Order.count({
        where: {
          shopId,
          status: ["confirmed", "processing", "packed"],
        },
      }) : 0, null),
      runMetric("deliveredOrders", () => can("orders.view") ? Order.count({
        where: {
          shopId,
          [Op.or]: [{ status: "delivered" }, { deliveryStatus: "delivered" }],
        },
      }) : 0, null),
      runMetric("totalRevenue", () =>
        can("payments.view") ? sumPaidOrders() : 0,
      null),
      runMetric("todayRevenue", () =>
        can("payments.view") ? sumPaidOrders({ [Op.gte]: startOfToday }) : 0,
      null),
      runMetric("weeklyRevenue", () =>
        can("payments.view") ? sumPaidOrders({ [Op.gte]: sevenDaysAgo }) : 0,
      null),
      runMetric("monthlyRevenue", () =>
        can("payments.view") ? sumPaidOrders({ [Op.gte]: startOfMonth }) : 0,
      null),
      runMetric("lowStockCount", () => can("inventory.view") ? Inventory.count({
        distinct: true,
        col: "productId",
        where: {
          shopId,
          quantity: { [Op.lte]: sequelize.col("low_stock_threshold") },
        },
      }) : 0, null),
      runMetric("employeeCount", () => can("employees.view") ? ShopMembership.count({
        where: {
          shopId,
          status: "active",
          role: { [Op.ne]: "shop_owner" },
        },
        include: [
          {
            model: User,
            as: "user",
            attributes: [],
            where: { status: "active" },
          },
        ],
        distinct: true,
      }) : 0, null),
      runMetric("pendingReturns", () =>
        can("orders.approve") ? Return.count({ where: { shopId, status: "requested" } }) : 0,
      null),
      runMetric("pendingRefunds", () => can("orders.approve") ? Return.count({
        where: { shopId, status: ["received", "refund_processing"] },
      }) : 0, null),
      runMetric("recentOrders", () => can("orders.view") ? Order.findAll({
        where: { shopId },
        attributes: ["id", "orderNumber", "totalAmount", "status", "createdAt"],
        include: [
          { model: User, as: "customer", attributes: ["id", "name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }) : [], []),
      runMetric("lowStockAlerts", () => can("inventory.view") ? Inventory.findAll({
        where: {
          shopId,
          quantity: { [Op.lte]: sequelize.col("low_stock_threshold") },
        },
        attributes: [
          "id",
          "productId",
          "productVariantId",
          "quantity",
          "lowStockThreshold",
        ],
        include: [
          { model: Product, as: "product", attributes: ["id", "name"] },
          {
            model: ProductVariant,
            as: "variant",
            attributes: ["id", "variantName"],
          },
        ],
        order: [["quantity", "ASC"]],
        limit: 5,
      }) : [], []),
      runMetric("pendingReturnItems", () => can("orders.approve") ? Return.findAll({
        where: { shopId, status: "requested" },
        attributes: ["id", "orderId", "status", "createdAt"],
        include: [
          { model: Order, as: "order", attributes: ["id", "orderNumber"] },
          { model: User, as: "customer", attributes: ["id", "name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }) : [], []),
      runMetric("pendingRefundItems", () => can("orders.approve") ? Return.findAll({
        where: { shopId, status: ["received", "refund_processing"] },
        attributes: [
          "id",
          "orderId",
          "status",
          "refundAmount",
          "createdAt",
        ],
        include: [
          { model: Order, as: "order", attributes: ["id", "orderNumber"] },
          { model: User, as: "customer", attributes: ["id", "name"] },
        ],
        order: [["createdAt", "DESC"]],
        limit: 5,
      }) : [], []),
    ]);

    const currencyAmount = (value) =>
      value == null ? null : Number(Number(value).toFixed(2));

    res.json({
      shop: {
        id: shop.id,
        name: shop.name,
        address: can("shop_settings.manage") ? shop.address : null,
        contactPhone: can("shop_settings.manage") ? shop.contactPhone : null,
        contactEmail: can("shop_settings.manage") ? shop.contactEmail : null,
        status: shop.status,
        category: shop.category ? shop.category.name : null,
      },
      membershipRole: req.membership.role,
      stats: {
        authorizedWholesalers: can("wholesalers.view")
          ? wholesalers?.length ?? null
          : null,
        totalOrders: can("orders.view") ? totalOrders : null,
        pendingOrders: can("orders.view") ? pendingOrders : null,
        deliveredOrders: can("orders.view") ? deliveredOrders : null,
        totalRevenue: can("payments.view") ? currencyAmount(totalRevenue) : null,
        pendingReturns: can("orders.approve") ? pendingReturns : null,
        pendingRefunds: can("orders.approve") ? pendingRefunds : null,
        lowStockProducts: can("inventory.view") ? lowStockCount : null,
        activeEmployees: can("employees.view") ? employeeCount : null,
      },
      salesOverview: {
        today: can("payments.view") ? currencyAmount(todayRevenue) : null,
        last7Days: can("payments.view") ? currencyAmount(weeklyRevenue) : null,
        thisMonth: can("payments.view") ? currencyAmount(monthlyRevenue) : null,
      },
      recentOrders,
      lowStockAlerts,
      returnOverview: {
        pendingRequests: can("orders.approve") ? pendingReturnItems : [],
        pendingRefunds: can("orders.approve") ? pendingRefundItems : [],
      },
      partialErrors: metricErrors,
    });
  }),
);



router.get(
  "/wholesalers",
  requireShopAccess(WHOLESALE_ROLES),
  wrap(async (req, res) => {
    const grants = await WholesalerShopAccess.findAll({
      where: { shopId: req.shop.id },
      include: [
        {
          model: Wholesaler,
          as: "wholesaler",
          required: true,
        },
      ],
      order: [
        [{ model: Wholesaler, as: "wholesaler" }, "name", "ASC"],
      ],
    });

    const wholesalerIds = grants.map((grant) => grant.wholesalerId);

    const [orders, payments] = wholesalerIds.length
      ? await Promise.all([
          PurchaseOrder.findAll({
            where: {
              shopId: req.shop.id,
              wholesalerId: wholesalerIds,
            },
            attributes: ["wholesalerId", "totalAmount", "status"],
            raw: true,
          }),
          WholesalePayment.findAll({
            where: {
              shopId: req.shop.id,
              wholesalerId: wholesalerIds,
            },
            attributes: ["wholesalerId", "amount"],
            raw: true,
          }),
        ])
      : [[], []];

    const summaries = new Map(
      wholesalerIds.map((id) => [
        Number(id),
        {
          openPurchaseOrders: 0,
          purchaseTotalCents: 0,
          paidTotalCents: 0,
        },
      ]),
    );

    for (const order of orders) {
      const summary = summaries.get(Number(order.wholesalerId));

      if (!summary) continue;

      if (!["completed", "cancelled"].includes(order.status)) {
        summary.openPurchaseOrders += 1;
      }

      if (!["cancelled", "rejected"].includes(order.status)) {
        summary.purchaseTotalCents += cents(order.totalAmount);
      }
    }

    for (const payment of payments) {
      const summary = summaries.get(Number(payment.wholesalerId));

      if (summary) {
        summary.paidTotalCents += cents(payment.amount);
      }
    }

    res.json({
      items: grants.map((grant) => {
        const wholesaler = grant.wholesaler;
        const summary = summaries.get(Number(wholesaler.id));

        return {
          ...wholesaler.toJSON(),
          status: grant.status,
          code: `WH-${String(wholesaler.id).padStart(6, "0")}`,
          openPurchaseOrders: summary?.openPurchaseOrders ?? 0,
          outstandingAmount:
            Math.max(
              0,
              (summary?.purchaseTotalCents ?? 0) -
                (summary?.paidTotalCents ?? 0),
            ) / 100,
        };
      }),
    });
  }),
);


const updateShopWholesalerSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  contactPerson: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  contactEmail: z.string().trim().toLowerCase().email().max(190).optional().or(z.literal("")),
  contactPhone: optional(phone),
  gstNumber: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).optional(),
}).refine((value) => Object.keys(value).length > 0, "Provide at least one wholesaler field to update.");

router.patch(
  "/wholesalers/:id",
  requireShopAccess(WHOLESALE_ROLES),
  validate(updateShopWholesalerSchema),
  wrap(async (req, res) => {
    const id = idParam(req, "id");

    const updated = await sequelize.transaction(async (transaction) => {
      const grant = await WholesalerShopAccess.findOne({
        where: {
          shopId: req.shop.id,
          wholesalerId: id,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!grant) {
        throw new AppError(404, "Wholesaler not found for this shop.");
      }

      const wholesaler = await Wholesaler.findByPk(id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!wholesaler) {
        throw new AppError(404, "Wholesaler not found.");
      }

      const { status, ...wholesalerData } = req.valid;
      const previousStatus = grant.status;
      const updates = { ...wholesalerData };
      for (const field of ["contactPerson", "contactEmail", "gstNumber", "address"]) {
        if (Object.hasOwn(updates, field) && updates[field] === "") {
          updates[field] = null;
        }
      }

      if (Object.keys(updates).length) {
        await wholesaler.update(updates, { transaction });
      }
      if (status !== undefined) {
        await grant.update({ status }, { transaction });
      }

      await audit(
        {
          actorId: req.user.id,
          action: "wholesaler.updated",
          entityType: "wholesaler",
          entityId: id,
          shopId: req.shop.id,
          meta: {
            previousStatus,
            newStatus: grant.status,
          },
          ip: req.ip,
        },
        transaction,
      );

      return {
        ...wholesaler.toJSON(),
        status: grant.status,
        code: `WH-${String(wholesaler.id).padStart(6, "0")}`,
      };
    });

    res.json({
      message: "Wholesaler updated successfully.",
      item: {
        id: updated.id,
        status: updated.status, 
      },
    });
  }),
);

const createShopWholesalerSchema = z.object({
  name: z.string().trim().min(2, "Business name is required").max(150),
  contactPerson: z.string().trim().min(2, "Contact person is required").max(120),
  contactEmail: z.string().trim().toLowerCase().email().max(190).optional().or(z.literal("")),
  contactPhone: phone,
  gstNumber: z.string().trim().max(20).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});



router.post(
  "/wholesalers",
  requireShopAccess(WHOLESALE_ROLES),
  validate(createShopWholesalerSchema),
  wrap(async (req, res) => {
    const wholesaler = await sequelize.transaction(async (transaction) => {
    
      const {
  status,
  ...wholesalerData
} = req.valid;

const item = await Wholesaler.create(
  {
    ...wholesalerData,
    contactEmail: req.valid.contactEmail || null,
    contactPhone: req.valid.contactPhone,
    gstNumber: req.valid.gstNumber || null,
    address: req.valid.address || null,
  },
  { transaction },
);

await WholesalerShopAccess.create(
  {
    wholesalerId: item.id,
    shopId: req.shop.id,
    grantedBy: req.user.id,
    status,
  },
  { transaction },
);

      return item;
    }).catch((error) => {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new AppError(409, "A wholesaler with this business name already exists.");
      }
      throw error;
    });
    res.status(201).json({ item: wholesaler });
  }),
);

router.get(
  "/wholesalers/:id",
  requireShopAccess(WHOLESALE_ROLES),
  wrap(async (req, res) => {
    const id = idParam(req, "id");
   
    const grant = await WholesalerShopAccess.findOne({
  where: {
    shopId: req.shop.id,
    wholesalerId: id,
  },
  include: [{ model: Wholesaler, as: "wholesaler" }],
});
    if (!grant) throw new AppError(404, "Wholesaler not found");
    const w = grant.wholesaler;
   
    res.json({
      item: {
        ...w.toJSON(),
        status: grant.status,
        code: `WH-${String(w.id).padStart(6, "0")}`,
      },
});
  }),
);

/* ========================================================================== */
/*                         WHOLESALE PURCHASE ORDERS                          */
/* ========================================================================== */
const createPOSchema = z.object({
  wholesalerId: z.coerce.number().int().positive(),
  notes: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        productVariantId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive(),
        unitPrice: z.coerce.number().positive(),
      }),
    )
    .min(1, "At least one item is required"),
});

router.post(
  "/wholesale-orders",
  requireShopAccess(WHOLESALE_ROLES),
  validate(createPOSchema),
  wrap(async (req, res) => {
    const { wholesalerId, notes, items } = req.valid;

    // Validate shop is authorized for this wholesaler
    // const grant = await WholesalerShopAccess.findOne({
    //   where: { shopId: req.shop.id, wholesalerId },
    //   include: [{ model: Wholesaler, as: "wholesaler", where: { status: "active" } }],
    // });
    const grant = await WholesalerShopAccess.findOne({
      where: {
        shopId: req.shop.id,
        wholesalerId,
        status: "active",
      },
      include: [
        {
          model: Wholesaler,
          as: "wholesaler",
          where: { status: "active" },
        },
      ],
    });
    if (!grant) {
      throw new AppError(
        403,
        "You are not authorized to purchase from this wholesaler.",
      );
    }

    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const result = await sequelize.transaction(async (t) => {
      let totalAmount = 0;
      const orderItemsData = [];

      for (const it of items) {
        const variant = await ProductVariant.findByPk(it.productVariantId, {
          include: [{ model: Product, as: "product" }],
          transaction: t,
        });
        if (!variant)
          throw new AppError(
            404,
            `Product variant #${it.productVariantId} not found`,
          );
        if (Number(variant.productId) !== Number(it.productId)) {
          throw new AppError(
            400,
            `Product variant #${it.productVariantId} does not belong to product #${it.productId}.`,
          );
        }

        const lineTotal = Number((it.quantity * it.unitPrice).toFixed(2));
        totalAmount += lineTotal;

        orderItemsData.push({
          productId: it.productId,
          productVariantId: it.productVariantId,
          productName: variant.product ? variant.product.name : "Product",
          variantName: variant.variantName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          totalPrice: lineTotal,
          receivedQuantity: 0,
        });
      }

      const po = await PurchaseOrder.create(
        {
          shopId: req.shop.id,
          wholesalerId,
          orderNumber,
          status: "submitted",
          totalAmount,
          notes: notes || null,
          createdBy: req.user.id,
        },
        { transaction: t },
      );

      for (const itemData of orderItemsData) {
        await PurchaseOrderItem.create(
          { ...itemData, purchaseOrderId: po.id },
          { transaction: t },
        );
      }

      await audit(
        {
          actorId: req.user.id,
          action: "wholesale_po.created",
          entityType: "purchase_order",
          entityId: po.id,
          shopId: req.shop.id,
          meta: { orderNumber, totalAmount, wholesalerId },
          ip: req.ip,
        },
        t,
      );

      return po;
    });

    const fullPO = await PurchaseOrder.findByPk(result.id, {
      include: [
        { model: Wholesaler, as: "wholesaler" },
        { model: PurchaseOrderItem, as: "items" },
      ],
    });

    res.status(201).json({ purchaseOrder: fullPO });
  }),
);

router.get(
  "/wholesale-orders",
  requireShopAccess(WHOLESALE_ROLES),
  validate(
    z.object({
      ...page,
      wholesalerId: z.coerce.number().int().positive().optional(),
      status: z.string().optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const { page: p, pageSize, wholesalerId, status } = req.valid;
    const where = { shopId: req.shop.id };
    if (wholesalerId) where.wholesalerId = wholesalerId;
    if (status) where.status = status;

    const { rows, count } = await PurchaseOrder.findAndCountAll({
      where,
      include: [
        { model: Wholesaler, as: "wholesaler", attributes: ["id", "name"] },
        { model: PurchaseOrderItem, as: "items" },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (p - 1) * pageSize,
      distinct: true,
    });

    res.json({ items: rows, total: count, page: p, pageSize });
  }),
);

router.get(
  "/wholesale-orders/:id",
  requireShopAccess(WHOLESALE_ROLES),
  wrap(async (req, res) => {
    const po = await PurchaseOrder.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
      include: [
        { model: Wholesaler, as: "wholesaler" },
        { model: PurchaseOrderItem, as: "items" },
        {
          model: GoodsReceipt,
          as: "receipts",
          include: [{ model: GoodsReceiptItem, as: "items" }],
        },
        { model: UploadedDocument, as: "documents" },
        { model: WholesalePayment, as: "payments" },
      ],
    });
    if (!po) throw new AppError(404, "Purchase order not found");
    res.json({ purchaseOrder: po });
  }),
);

router.patch(
  "/wholesale-orders/:id/status",
  requireShopAccess(WHOLESALE_ROLES),
  validate(
    z.object({
      status: z.enum([
        "accepted",
        "rejected",
        "dispatched",
        "received",
        "completed",
        "cancelled",
      ]),
      notes: z.string().trim().optional(),
    }),
  ),
  wrap(async (req, res) => {
    const po = await PurchaseOrder.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
    });
    if (!po) throw new AppError(404, "Purchase order not found");

    const previousStatus = po.status;
    await po.update({ status: req.valid.status });

    await audit({
      actorId: req.user.id,
      action: "wholesale_po.status_updated",
      entityType: "purchase_order",
      entityId: po.id,
      shopId: req.shop.id,
      meta: {
        previousStatus,
        newStatus: req.valid.status,
        notes: req.valid.notes,
      },
      ip: req.ip,
    });

    res.json({ purchaseOrder: po });
  }),
);

router.patch(
  "/catalog/categories/:id/status",
  requireShopAccess(CATALOG_ROLES),
  wrap(async () => {
    throw new AppError(
      403,
      "Shared catalog status is controlled by Super Admin approval.",
    );
  }),
);
router.delete(
  "/catalog/categories/:id",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const item = await requireEditableSubmission(
      Category,
      idParam(req, "id"),
      req.shop.id,
    );
    if (
      (await Product.count({ where: { categoryId: item.id } })) ||
      (await Subcategory.count({ where: { categoryId: item.id } }))
    )
      throw new AppError(409, "Category is in use; deactivate it instead.");
    await item.destroy();
    res.status(204).end();
  }),
);

/* -------------------------- Goods Receipt -------------------------- */
const goodsReceiptSchema = z.object({
  notes: z.string().trim().optional(),
  items: z
    .array(
      z.object({
        purchaseOrderItemId: z.coerce.number().int().positive(),
        quantityReceived: z.coerce.number().int().min(0),
        quantityRejected: z.coerce.number().int().min(0).default(0),
        discrepancyReason: z.string().trim().optional(),
      }),
    )
    .min(1, "At least one item must be received"),
});

router.post(
  "/wholesale-orders/:id/receipt",
  requireShopAccess(WHOLESALE_ROLES),
  validate(goodsReceiptSchema),
  wrap(async (req, res) => {
    const poId = idParam(req, "id");
    const { notes, items } = req.valid;

    const receipt = await sequelize.transaction(async (t) => {
      const po = await PurchaseOrder.findOne({
        where: { id: poId, shopId: req.shop.id },
        include: [{ model: PurchaseOrderItem, as: "items" }],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!po) throw new AppError(404, "Purchase order not found");
      if (["cancelled", "rejected"].includes(po.status)) {
        throw new AppError(
          400,
          `Cannot receive items for a ${po.status} purchase order.`,
        );
      }

      const receiptNumber = `GR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
      if (
        items.every(
          (item) => item.quantityReceived === 0 && item.quantityRejected === 0,
        )
      ) {
        throw new AppError(400, "Enter a received or rejected quantity for at least one item.");
      }

      const gr = await GoodsReceipt.create(
        {
          purchaseOrderId: po.id,
          shopId: req.shop.id,
          receiptNumber,
          notes: notes || null,
          receivedBy: req.user.id,
        },
        { transaction: t },
      );

      const itemsForInventory = [];
      const poItemMap = Object.fromEntries(po.items.map((i) => [i.id, i]));

      for (const recItem of items) {
        const poItem = poItemMap[recItem.purchaseOrderItemId];
        if (!poItem) {
          throw new AppError(
            400,
            `Item #${recItem.purchaseOrderItemId} does not belong to this purchase order`,
          );
        }

        // Prevent over-receiving
        const remaining = poItem.quantity - poItem.receivedQuantity;
        if (recItem.quantityReceived + recItem.quantityRejected > remaining) {
          throw new AppError(
            400,
            `Received and rejected quantities for "${poItem.productName}" exceed the remaining quantity of ${remaining}.`,
          );
        }

        await GoodsReceiptItem.create(
          {
            goodsReceiptId: gr.id,
            purchaseOrderItemId: poItem.id,
            productId: poItem.productId,
            productVariantId: poItem.productVariantId,
            quantityReceived: recItem.quantityReceived,
            quantityRejected: recItem.quantityRejected,
            discrepancyReason: recItem.discrepancyReason || null,
          },
          { transaction: t },
        );

        await poItem.update(
          {
            receivedQuantity:
              poItem.receivedQuantity + recItem.quantityReceived,
          },
          { transaction: t },
        );

        itemsForInventory.push({
          productId: poItem.productId,
          productVariantId: poItem.productVariantId,
          quantityReceived: recItem.quantityReceived,
        });
      }

      // Concurrency-safe inventory increment!
      await addStockForReceipt(
        req.shop.id,
        itemsForInventory,
        receiptNumber,
        gr.id,
        req.user.id,
        t,
      );

      // Check if PO is completely received
      const updatedPOItems = await PurchaseOrderItem.findAll({
        where: { purchaseOrderId: po.id },
        transaction: t,
      });
      const allReceived = updatedPOItems.every(
        (i) => i.receivedQuantity >= i.quantity,
      );
      await po.update(
        { status: allReceived ? "completed" : "received" },
        { transaction: t },
      );

      await audit(
        {
          actorId: req.user.id,
          action: "wholesale_po.goods_receipt",
          entityType: "goods_receipt",
          entityId: gr.id,
          shopId: req.shop.id,
          meta: { receiptNumber, poId: po.id },
          ip: req.ip,
        },
        t,
      );

      return gr;
    });

    const fullReceipt = await GoodsReceipt.findByPk(receipt.id, {
      include: [{ model: GoodsReceiptItem, as: "items" }],
    });

    res.status(201).json({ receipt: fullReceipt });
  }),
);

router.patch(
  "/catalog/subcategories/:id",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      categoryId: z.coerce.number().int().positive().optional(),
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    }),
  ),
  wrap(async (req, res) => {
    const item = await requireEditableSubmission(
      Subcategory,
      idParam(req, "id"),
      req.shop.id,
    );
    const updates = { ...req.valid };
    if (updates.name) updates.slug = slugify(updates.name);
    if (
      updates.categoryId &&
      !(await Category.findOne({
        where: { id: updates.categoryId, isActive: true },
      }))
    )
      throw new AppError(400, "Select an active category.");
    await item.update({
      ...updates,
      submissionStatus: "pending",
      isActive: false,
      rejectionReason: null,
    });
    res.json({ item });
  }),
);
router.patch(
  "/catalog/subcategories/:id/status",
  requireShopAccess(CATALOG_ROLES),
  wrap(async () => {
    throw new AppError(
      403,
      "Shared catalog status is controlled by Super Admin approval.",
    );
  }),
);
router.delete(
  "/catalog/subcategories/:id",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const item = await requireEditableSubmission(
      Subcategory,
      idParam(req, "id"),
      req.shop.id,
    );
    if (await Product.count({ where: { subcategoryId: item.id } }))
      throw new AppError(409, "Subcategory is in use; it cannot be deleted.");
    await item.destroy();
    res.status(204).end();
  }),
);

/* -------------------- Upload Bills & Private Documents ---------------- */
router.post(
  "/bills",
  requireShopAccess(WHOLESALE_ROLES),
  uploadBill.single("file"),
  wrap(async (req, res) => {
    if (!req.file) throw new AppError(400, "Please select a file to upload.");

    const wholesalerId = req.body.wholesalerId
      ? Number(req.body.wholesalerId)
      : null;
    const purchaseOrderId = req.body.purchaseOrderId
      ? Number(req.body.purchaseOrderId)
      : null;
    const documentType = req.body.documentType || "bill";
    const notes = req.body.notes || null;

    if (wholesalerId) {
      const grant = await WholesalerShopAccess.findOne({
        where: { shopId: req.shop.id, wholesalerId },
      });
      if (!grant) throw new AppError(404, "Authorized wholesaler not found");
    }

    if (purchaseOrderId) {
      const po = await PurchaseOrder.findOne({
        where: { id: purchaseOrderId, shopId: req.shop.id },
      });
      if (!po) throw new AppError(404, "Associated purchase order not found");
      if (wholesalerId && Number(po.wholesalerId) !== wholesalerId) {
        throw new AppError(400, "The purchase order does not belong to the selected wholesaler.");
      }
    }

    const doc = await UploadedDocument.create({
      shopId: req.shop.id,
      wholesalerId,
      purchaseOrderId,
      documentType,
      originalFilename: req.file.originalname,
      storedFilename: req.file.filename,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy: req.user.id,
      notes,
    });

    await audit({
      actorId: req.user.id,
      action: "document.uploaded",
      entityType: "uploaded_document",
      entityId: doc.id,
      shopId: req.shop.id,
      meta: { filename: doc.originalFilename, size: doc.fileSize },
      ip: req.ip,
    });

    res.status(201).json({ document: doc });
  }),
);

router.patch(
  "/catalog/brands/:id",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().max(500).optional(),
    }),
  ),
  wrap(async (req, res) => {
    const item = await requireEditableSubmission(
      Brand,
      idParam(req, "id"),
      req.shop.id,
    );
    await item.update({
      ...req.valid,
      submissionStatus: "pending",
      isActive: false,
      rejectionReason: null,
    });
    res.json({ item });
  }),
);
router.patch(
  "/catalog/brands/:id/status",
  requireShopAccess(CATALOG_ROLES),
  wrap(async () => {
    throw new AppError(
      403,
      "Shared catalog status is controlled by Super Admin approval.",
    );
  }),
);
router.delete(
  "/catalog/brands/:id",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const item = await requireEditableSubmission(
      Brand,
      idParam(req, "id"),
      req.shop.id,
    );
    if (await Product.count({ where: { brandId: item.id } }))
      throw new AppError(409, "Brand is in use; it cannot be deleted.");
    await item.destroy();
    res.status(204).end();
  }),
);

router.get(
  "/bills",
  requireShopAccess(WHOLESALE_ROLES),
  validate(
    z.object({
      wholesalerId: z.coerce.number().int().positive().optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const where = { shopId: req.shop.id };
    if (req.valid.wholesalerId) {
      const grant = await WholesalerShopAccess.findOne({
        where: {
          shopId: req.shop.id,
          wholesalerId: req.valid.wholesalerId,
        },
      });
      if (!grant) throw new AppError(404, "Authorized wholesaler not found");
      where.wholesalerId = req.valid.wholesalerId;
    }
    const items = await UploadedDocument.findAll({
      where,
      include: [
        { model: Wholesaler, as: "wholesaler", attributes: ["id", "name"] },
        {
          model: PurchaseOrder,
          as: "purchaseOrder",
          attributes: ["id", "orderNumber"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ items });
  }),
);

// Secure download endpoint: strictly enforces shop ownership!
router.get(
  "/bills/:id/download",
  requireShopAccess(WHOLESALE_ROLES),
  wrap(async (req, res) => {
    const doc = await UploadedDocument.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
    });
    if (!doc) throw new AppError(404, "Document not found or access denied");

    if (!fs.existsSync(doc.filePath)) {
      throw new AppError(404, "Document file is missing on the server");
    }

    res.download(doc.filePath, doc.originalFilename);
  }),
);

/* ------------------------- Wholesale Payments ----------------------- */
const wholesalePaymentSchema = z.object({
  wholesalerId: z.coerce.number().int().positive(),
  purchaseOrderId: z.coerce.number().int().positive().optional(),
  amount: z.coerce.number().positive("Enter a valid payment amount"),
  paymentMethod: z.enum(["bank_transfer", "upi", "cash", "cheque"]).default("bank_transfer"),
  paymentDate: validDate.optional(),
  referenceNumber: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

router.post(
  "/wholesale-payments",
  requireShopAccess(WHOLESALE_ROLES),
  validate(wholesalePaymentSchema),
  wrap(async (req, res) => {
    const {
      wholesalerId,
      purchaseOrderId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
    } = req.valid;

    const payment = await sequelize.transaction(async (transaction) => {
      const grant = await WholesalerShopAccess.findOne({
        where: { shopId: req.shop.id, wholesalerId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!grant) throw new AppError(403, "Unauthorized wholesaler");

      if (purchaseOrderId) {
        const order = await PurchaseOrder.findOne({
          where: { id: purchaseOrderId, shopId: req.shop.id, wholesalerId },
          transaction,
        });
        if (!order) throw new AppError(404, "Purchase order not found for this wholesaler.");
      }

      const [purchaseOrders, payments] = await Promise.all([
        PurchaseOrder.findAll({
          where: {
            shopId: req.shop.id,
            wholesalerId,
            status: { [Op.notIn]: ["cancelled", "rejected", "draft"] },
          },
          attributes: ["totalAmount"],
          raw: true,
          transaction,
        }),
        WholesalePayment.findAll({
          where: { shopId: req.shop.id, wholesalerId },
          attributes: ["amount"],
          raw: true,
          transaction,
        }),
      ]);
      const outstandingCents =
        purchaseOrders.reduce((sum, order) => sum + cents(order.totalAmount), 0) -
        payments.reduce((sum, recorded) => sum + cents(recorded.amount), 0);
      if (cents(amount) > Math.max(0, outstandingCents)) {
        throw new AppError(
          400,
          `Payment exceeds the outstanding balance of ${moneyValue(Math.max(0, outstandingCents))}.`,
        );
      }

      return WholesalePayment.create(
        {
          shopId: req.shop.id,
          wholesalerId,
          purchaseOrderId: purchaseOrderId || null,
          amount,
          paymentMethod,
          paymentDate: req.valid.paymentDate || new Date(),
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          createdBy: req.user.id,
        },
        { transaction },
      );
    });

    res.status(201).json({ payment });
  }),
);

router.patch(
  "/catalog/attributes/:id",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      name: z.string().trim().min(2).max(60).optional(),
      code: z.string().trim().min(2).max(60).optional(),
      values: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    }),
  ),
  wrap(async (req, res) => {
    const itemId = idParam(req, "id");
    await sequelize.transaction(async (transaction) => {
      const item = await requireEditableSubmission(Attribute, itemId, req.shop.id, { transaction, lock: transaction.LOCK.UPDATE });
      const { values, ...fields } = req.valid;
      if (fields.code && await Attribute.findOne({ where: { code: fields.code, id: { [Op.ne]: item.id } }, transaction }))
        throw new AppError(409, "This attribute code is already in use.");
      if (values !== undefined) {
        const normalized = values.map((value) => value.toLowerCase());
        if (new Set(normalized).size !== normalized.length) throw new AppError(400, "Attribute values must be unique.");
        const existing = await AttributeValue.findAll({ where: { attributeId: item.id }, transaction });
        const wanted = new Set(normalized);
        const removeIds = existing.filter((value) => !wanted.has(value.value.trim().toLowerCase())).map((value) => value.id);
        if (removeIds.length && await ProductVariantValue.count({ where: { attributeValueId: removeIds }, transaction }))
          throw new AppError(409, "One or more values are used by product variants and cannot be removed.");
        if (removeIds.length) await AttributeValue.destroy({ where: { id: removeIds }, transaction });
        const existingValues = new Set(existing.filter((value) => !removeIds.includes(value.id)).map((value) => value.value.trim().toLowerCase()));
        const addValues = values.filter((value) => !existingValues.has(value.toLowerCase()));
        if (addValues.length) await AttributeValue.bulkCreate(addValues.map((value) => ({ attributeId: item.id, value })), { transaction });
      }
      await item.update({
        ...fields,
        submissionStatus: "pending",
        isActive: false,
        rejectionReason: null,
      }, { transaction });
    });
    const item = await Attribute.findByPk(itemId, { include: [{ model: AttributeValue, as: "values" }] });
    res.json({ item });
  }),
);
router.delete(
  "/catalog/attributes/values/:valueId",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const item = await AttributeValue.findByPk(idParam(req, "valueId"));
    if (!item) throw new AppError(404, "Attribute value not found");
    await requireEditableSubmission(Attribute, item.attributeId, req.shop.id);
    if (
      await ProductVariantValue.count({ where: { attributeValueId: item.id } })
    )
      throw new AppError(409, "This value is used by a product variant.");
    await item.destroy();
    res.status(204).end();
  }),
);
router.delete(
  "/catalog/attributes/:id",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const item = await requireEditableSubmission(
      Attribute,
      idParam(req, "id"),
      req.shop.id,
    );
    if (await ProductVariantValue.count({ where: { attributeId: item.id } }))
      throw new AppError(409, "This attribute is used by product variants.");
    await AttributeValue.destroy({ where: { attributeId: item.id } });
    await item.destroy();
    res.status(204).end();
  }),
);

router.get(
  "/wholesale-payments",
  requireShopAccess(WHOLESALE_ROLES),
  validate(
    z.object({
      wholesalerId: z.coerce.number().int().positive().optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const where = { shopId: req.shop.id };
    if (req.valid.wholesalerId) {
      const grant = await WholesalerShopAccess.findOne({
        where: {
          shopId: req.shop.id,
          wholesalerId: req.valid.wholesalerId,
        },
      });
      if (!grant) throw new AppError(404, "Authorized wholesaler not found");
      where.wholesalerId = req.valid.wholesalerId;
    }
    const items = await WholesalePayment.findAll({
      where,
      include: [
        { model: Wholesaler, as: "wholesaler", attributes: ["id", "name"] },
        {
          model: PurchaseOrder,
          as: "purchaseOrder",
          attributes: ["id", "orderNumber"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ items });
  }),
);

/* ========================================================================== */
/*                                  CATALOG                                   */
/* ========================================================================== */
router.post(
  "/catalog/:resource/:id/image",
  requireShopAccess(CATALOG_ROLES),
  uploadImage.single("image"),
  wrap(async (req, res) => {
    if (!req.file)
      throw new AppError(
        400,
        "Select a JPEG, PNG, WEBP, or GIF image no larger than 5 MB.",
      );
    const models = {
      categories: Category,
      subcategories: Subcategory,
      brands: Brand,
    };
    const Model = models[req.params.resource];
    if (!Model) throw new AppError(404, "Image target not found.");
    const item = await requireEditableSubmission(
      Model,
      idParam(req, "id"),
      req.shop.id,
    );
    const imageUrl = `/uploads/${req.file.filename}`;
    const previous = item.imageUrl;
    await item.update({ imageUrl });
    await removeImageIfUnused(previous);
    res.json({ item });
  }),
);
router.delete(
  "/catalog/:resource/:id/image",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const Model = {
      categories: Category,
      subcategories: Subcategory,
      brands: Brand,
    }[req.params.resource];
    if (!Model) throw new AppError(404, "Image target not found.");
    const item = await requireEditableSubmission(
      Model,
      idParam(req, "id"),
      req.shop.id,
    );
    const previous = item.imageUrl;
    await item.update({ imageUrl: null });
    await removeImageIfUnused(previous);
    res.json({ item });
  }),
);

// Categories
router.get(
  "/catalog/categories",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const items = await Category.findAll({
      where: ownerSubmissionWhere(req.shop.id),
      include: [{ model: Subcategory, as: "subcategories" }],
      order: [["name", "ASC"]],
    });
    res.json({ items });
  }),
);

router.post(
  "/catalog/categories",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      description: z.string().trim().optional(),
    }),
  ),
  wrap(async (req, res) => {
    const slug = slugify(req.valid.name);
    if (await Category.findOne({ where: { slug } }))
      throw new AppError(
        409,
        "This category already exists in the shared catalog. Use the existing approved entry instead.",
      );
    const item = await Category.create({
      name: req.valid.name,
      slug,
      description: req.valid.description,
      isActive: false,
      submissionStatus: "pending",
      submittedByShopId: req.shop.id,
    });
    res.status(201).json({ item });
  }),
);

router.patch(
  "/catalog/categories/:id",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      name: z.string().trim().min(2).max(100).optional(),
      description: z.string().trim().optional(),
    }),
  ),
  wrap(async (req, res) => {
    const item = await requireEditableSubmission(
      Category,
      idParam(req, "id"),
      req.shop.id,
    );
    const updates = { ...req.valid };
    if (updates.name) updates.slug = slugify(updates.name);
    await item.update({
      ...updates,
      submissionStatus: "pending",
      isActive: false,
      rejectionReason: null,
    });
    res.json({ item });
  }),
);

// Subcategories
router.get(
  "/catalog/subcategories",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const items = await Subcategory.findAll({
      where: ownerSubmissionWhere(req.shop.id),
      include: [{ model: Category, as: "category" }],
      order: [["name", "ASC"]],
    });
    res.json({ items });
  }),
);

router.post(
  "/catalog/subcategories",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      categoryId: z.coerce.number().int().positive(),
      name: z.string().trim().min(2).max(100),
      description: z.string().trim().optional(),
    }),
  ),
  wrap(async (req, res) => {
    const parent = await Category.findOne({
      where: { id: req.valid.categoryId, isActive: true },
    });
    if (!parent) throw new AppError(400, "Select an active category.");
    const slug = slugify(req.valid.name);
    if (await Subcategory.findOne({ where: { categoryId: parent.id, slug } }))
      throw new AppError(
        409,
        "This subcategory already exists in the shared catalog. Use the existing entry instead.",
      );
    const item = await Subcategory.create({
      categoryId: req.valid.categoryId,
      name: req.valid.name,
      slug,
      description: req.valid.description,
      isActive: false,
      submissionStatus: "pending",
      submittedByShopId: req.shop.id,
    });
    res.status(201).json({ item });
  }),
);

// Brands
router.get(
  "/catalog/brands",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const items = await Brand.findAll({
      where: ownerSubmissionWhere(req.shop.id),
      order: [["name", "ASC"]],
    });
    res.json({ items });
  }),
);

router.post(
  "/catalog/brands",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      name: z.string().trim().min(2).max(100),
      description: z.string().trim().optional(),
    }),
  ),
  wrap(async (req, res) => {
    if (await Brand.findOne({ where: { name: req.valid.name } }))
      throw new AppError(
        409,
        "This brand already exists in the shared catalog. Use the existing approved entry instead.",
      );
    const item = await Brand.create({
      ...req.valid,
      isActive: false,
      submissionStatus: "pending",
      submittedByShopId: req.shop.id,
    });
    res.status(201).json({ item });
  }),
);

// Dynamic Attributes
router.get(
  "/catalog/attributes",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const items = await Attribute.findAll({
      where: ownerSubmissionWhere(req.shop.id),
      include: [{ model: AttributeValue, as: "values" }],
      order: [["name", "ASC"]],
    });
    res.json({ items });
  }),
);

router.post(
  "/catalog/attributes",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      name: z.string().trim().min(2).max(60),
      code: z.string().trim().min(2).max(60),
      values: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
    }),
  ),
  wrap(async (req, res) => {
    const item = await sequelize.transaction(async (transaction) => {
      if (await Attribute.findOne({ where: { code: req.valid.code }, transaction }))
        throw new AppError(409, "This attribute already exists in the shared catalog. Use the existing approved entry instead.");
      const created = await Attribute.create({
        name: req.valid.name,
        code: req.valid.code,
        isActive: false,
        submissionStatus: "pending",
        submittedByShopId: req.shop.id,
      }, { transaction });
      const values = [...new Map(req.valid.values.map((value) => [value.toLowerCase(), value])).values()];
      if (values.length) await AttributeValue.bulkCreate(values.map((value) => ({ attributeId: created.id, value })), { transaction });
      return Attribute.findByPk(created.id, { include: [{ model: AttributeValue, as: "values" }], transaction });
    });
    res.status(201).json({ item });
  }),
);

router.post(
  "/catalog/attributes/:id/values",
  requireShopAccess(CATALOG_ROLES),
  validate(z.object({ value: z.string().trim().min(1).max(100) })),
  wrap(async (req, res) => {
    const attr = await requireEditableSubmission(
      Attribute,
      idParam(req, "id"),
      req.shop.id,
    );
    const val = await AttributeValue.create({
      attributeId: attr.id,
      value: req.valid.value,
    });
    res.status(201).json({ value: val });
  }),
);

// Products & Dynamic Variants
const createProductSchema = z.object({
  name: z.string().trim().min(2).max(200),
  sku: z.string().trim().max(80).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  subcategoryId: z.coerce.number().int().positive().optional(),
  brandId: z.coerce.number().int().positive().optional(),
  description: z.string().trim().optional(),
  basePrice: z.coerce.number().min(0).default(0),
  weight: optionalWeight,
  weightUnit: optionalWeightUnit.default("kg"),
  variants: z
    .array(
      z.object({
        variantName: z.string().trim().min(1).max(150),
        sku: z.string().trim().min(1).max(80),
        price: z.coerce.number().min(0),
        wholesalePrice: z.coerce.number().min(0).default(0),
        retailPrice: z.coerce.number().min(0),
        weight: optionalWeight,
        weightUnit: optionalWeightUnit,
        gstApplicable: z.boolean().optional(),
        gstRate: optionalGstRate,
        priceIncludesGst: z.boolean().optional(),
        hsnCode: z.string().trim().max(20).nullable().optional(),
        initialStock: z.coerce.number().int().min(0).default(0),
        attributeValues: z
          .array(
            z.object({
              attributeId: z.coerce.number().int().positive(),
              attributeValueId: z.coerce.number().int().positive(),
            }),
          )
          .optional(),
      }),
    )
    .min(1, "At least one variant is required"),
}).superRefine((body, context) => {
  if (body.weight == null && body.variants.some((variant) => variant.weight == null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["weight"],
      message: "Set a product weight or configure a weight for every variant.",
    });
  }
  body.variants.forEach((variant, index) => {
    if (variant.gstApplicable && !(Number(variant.gstRate) > 0)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["variants", index, "gstRate"],
        message: "Enter a GST rate greater than zero when GST applies.",
      });
    }
  });
});

router.post(
  "/catalog/products",
  requireShopAccess(CATALOG_ROLES),
  validate(createProductSchema),
  wrap(async (req, res) => {
    const {
      name,
      sku,
      categoryId,
      subcategoryId,
      brandId,
      description,
      basePrice,
      weight,
      weightUnit,
      variants,
    } = req.valid;
    if (
      req.membership.role !== "shop_owner" &&
      variants.some((variant) =>
        variant.gstApplicable !== undefined ||
        variant.gstRate !== undefined ||
        variant.priceIncludesGst !== undefined ||
        variant.hsnCode !== undefined,
      )
    ) {
      throw new AppError(403, "Only the Shop Owner can configure product tax details.");
    }
    if (
      categoryId &&
      !(await Category.findOne({ where: { id: categoryId, isActive: true } }))
    )
      throw new AppError(400, "Select an active category.");
    if (
      subcategoryId &&
      !(await Subcategory.findOne({
        where: { id: subcategoryId, categoryId, isActive: true },
      }))
    )
      throw new AppError(
        400,
        "Select a subcategory belonging to the selected category.",
      );
    if (
      brandId &&
      !(await Brand.findOne({ where: { id: brandId, isActive: true } }))
    )
      throw new AppError(400, "Select an active brand.");
    for (const variant of variants)
      for (const selected of variant.attributeValues || []) {
        const attribute = await Attribute.findOne({
          where: {
            id: selected.attributeId,
            [Op.or]: [
              { submissionStatus: null },
              { submissionStatus: "approved" },
            ],
          },
        });
        const value = await AttributeValue.findOne({
          where: {
            id: selected.attributeValueId,
            attributeId: selected.attributeId,
          },
        });
        if (!attribute || !value)
          throw new AppError(400, "Choose values from an approved attribute.");
      }

    const result = await sequelize.transaction(async (t) => {
      const product = await Product.create(
        {
          name,
          sku: sku || `SKU-${Date.now().toString(36).toUpperCase()}`,
          categoryId: categoryId || null,
          subcategoryId: subcategoryId || null,
          brandId: brandId || null,
          description: description || null,
          basePrice,
          weight,
          weightUnit,
          isActive: true,
        },
        { transaction: t },
      );

      for (const v of variants) {
        const variant = await ProductVariant.create(
          {
            productId: product.id,
            sku: v.sku,
            variantName: v.variantName,
            price: v.price,
            wholesalePrice: v.wholesalePrice,
            weight: v.weight,
            weightUnit: v.weightUnit || weightUnit,
            isActive: true,
          },
          { transaction: t },
        );

        if (v.attributeValues && v.attributeValues.length > 0) {
          for (const av of v.attributeValues) {
            await ProductVariantValue.create(
              {
                productVariantId: variant.id,
                attributeId: av.attributeId,
                attributeValueId: av.attributeValueId,
              },
              { transaction: t },
            );
          }
        }

        // Create seller listing for caller's shop
        await SellerListing.create(
          {
            shopId: req.shop.id,
            productId: product.id,
            productVariantId: variant.id,
            retailPrice: v.retailPrice || v.price,
            gstApplicable: v.gstApplicable ?? false,
            gstRate: v.gstApplicable ? v.gstRate || 0 : 0,
            priceIncludesGst: v.gstApplicable ? v.priceIncludesGst ?? false : false,
            hsnCode: v.gstApplicable ? v.hsnCode || null : null,
            isActive: true,
          },
          { transaction: t },
        );

        // Create inventory record
        const inv = await Inventory.create(
          {
            shopId: req.shop.id,
            productId: product.id,
            productVariantId: variant.id,
            quantity: v.initialStock || 0,
            lowStockThreshold: 5,
          },
          { transaction: t },
        );

        if (v.initialStock > 0) {
          await InventoryMovement.create(
            {
              shopId: req.shop.id,
              productId: product.id,
              productVariantId: variant.id,
              changeQuantity: v.initialStock,
              balanceAfter: v.initialStock,
              movementType: "receipt",
              referenceType: "initial_stock",
              notes: "Initial inventory entry",
              createdBy: req.user.id,
            },
            { transaction: t },
          );
        }
      }

      return product;
    });

    res.status(201).json({ product: result });
  }),
);

router.get(
  "/catalog/products",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      ...page,
      categoryId: z.coerce.number().int().positive().optional(),
      subcategoryId: z.coerce.number().int().positive().optional(),
      brandId: z.coerce.number().int().positive().optional(),
      q: z.string().trim().max(100).optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const {
      page: p,
      pageSize,
      categoryId,
      subcategoryId,
      brandId,
      q,
    } = req.valid;
    const where = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (brandId) where.brandId = brandId;
    if (q) where.name = { [Op.like]: `%${q}%` };

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["id", "name", "imageUrl"],
        },
        {
          model: Subcategory,
          as: "subcategory",
          attributes: ["id", "name", "imageUrl"],
        },
        { model: Brand, as: "brand", attributes: ["id", "name", "imageUrl"] },
        { model: ProductImage, as: "images" },
        {
          model: ProductVariant,
          as: "variants",
          include: [
            {
              model: ProductVariantValue,
              as: "variantValues",
              include: [
                { model: Attribute, as: "attribute" },
                { model: AttributeValue, as: "attributeValue" },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (p - 1) * pageSize,
      distinct: true,
    });

    // Attach caller shop's listings and inventory
    const variantIds = rows.flatMap((prod) => prod.variants.map((v) => v.id));
    const [listings, stockRows, listingsForOtherShops] = await Promise.all([
      SellerListing.findAll({
        where: { shopId: req.shop.id, productVariantId: variantIds },
      }),
      Inventory.findAll({
        where: { shopId: req.shop.id, productVariantId: variantIds },
      }),
      SellerListing.findAll({
        where: {
          productId: { [Op.in]: rows.map((product) => product.id) },
          shopId: { [Op.ne]: req.shop.id },
        },
        attributes: ["productId"],
        raw: true,
      }),
    ]);

    const listingMap = Object.fromEntries(
      listings.map((l) => [l.productVariantId, l]),
    );
    const stockMap = Object.fromEntries(
      stockRows.map((s) => [s.productVariantId, s]),
    );

    const sharedProductIds = new Set(
      listingsForOtherShops.map((listing) => Number(listing.productId)),
    );
    const items = rows.map((prod) => {
      const json = prod.toJSON();
      json.sharedAcrossShops = sharedProductIds.has(Number(json.id));
      json.variants = json.variants.map((v) => ({
        ...v,
        sellerListing: listingMap[v.id] || null,
        inventory: stockMap[v.id] || { quantity: 0, lowStockThreshold: 5 },
      }));
      return json;
    });

    res.json({ items, total: count, page: p, pageSize });
  }),
);

router.patch(
  "/catalog/products/:id/listing",
  requireShopAccess(CATALOG_ROLES),
  validate(
    z.object({
      variants: z
        .array(
          z.object({
            id: z.coerce.number().int().positive(),
            retailPrice: money.refine((value) => value > 0, "Enter a selling price greater than zero."),
            quantity: z.coerce.number().int().min(0).max(10000000),
            isActive: z.boolean().optional(),
            gstApplicable: z.boolean().optional(),
            gstRate: optionalGstRate,
            priceIncludesGst: z.boolean().optional(),
            hsnCode: z.string().trim().max(20).nullable().optional(),
          }),
        )
        .min(1)
        .superRefine((variants, context) => {
          variants.forEach((variant, index) => {
            if (variant.gstApplicable && !(Number(variant.gstRate) > 0)) {
              context.addIssue({
                code: z.ZodIssueCode.custom,
                path: [index, "gstRate"],
                message: "Enter a GST rate greater than zero when GST applies.",
              });
            }
          });
        }),
    }),
  ),
  wrap(async (req, res) => {
    const productId = idParam(req, "id");
    if (
      req.membership.role !== "shop_owner" &&
      req.valid.variants.some((variant) =>
        variant.gstApplicable !== undefined ||
        variant.gstRate !== undefined ||
        variant.priceIncludesGst !== undefined ||
        variant.hsnCode !== undefined,
      )
    ) {
      throw new AppError(403, "Only the Shop Owner can configure product tax details.");
    }
    const product = await Product.findOne({ where: { id: productId, isActive: true } });
    if (!product) throw new AppError(404, "Product not found");
    await sequelize.transaction(async (t) => {
      for (const row of req.valid.variants) {
        const variant = await ProductVariant.findOne({
          where: { id: row.id, productId, isActive: true },
          transaction: t,
        });
        if (!variant) {
          throw new AppError(404, "A product variant is not available in this catalog product.");
        }
        const listing = await SellerListing.findOne({
          where: { shopId: req.shop.id, productId, productVariantId: row.id },
          transaction: t,
        });
        const inventory = await Inventory.findOne({
          where: { shopId: req.shop.id, productId, productVariantId: row.id },
          transaction: t,
        });
        const listingValues = {
            retailPrice: moneyValue(cents(row.retailPrice)),
            isActive: row.isActive ?? listing?.isActive ?? true,
            ...(row.gstApplicable === undefined ? {} : {
              gstApplicable: row.gstApplicable,
              gstRate: row.gstApplicable ? row.gstRate || 0 : 0,
              priceIncludesGst: row.gstApplicable ? row.priceIncludesGst ?? false : false,
              hsnCode: row.gstApplicable ? row.hsnCode || null : null,
            }),
        };
        if (listing) {
          await listing.update(listingValues, { transaction: t });
        } else {
          await SellerListing.create({
            shopId: req.shop.id,
            productId,
            productVariantId: row.id,
            ...listingValues,
          }, { transaction: t });
        }
        if (inventory) {
          await inventory.update({ quantity: row.quantity }, { transaction: t });
        } else {
          await Inventory.create({
            shopId: req.shop.id,
            productId,
            productVariantId: row.id,
            quantity: row.quantity,
            lowStockThreshold: 5,
          }, { transaction: t });
        }
      }
    });
    res.json({ success: true });
  }),
);

const productEditSchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    sku: z.string().trim().max(80).optional(),
    categoryId: z.coerce.number().int().positive().nullable().optional(),
    subcategoryId: z.coerce.number().int().positive().nullable().optional(),
    brandId: z.coerce.number().int().positive().nullable().optional(),
    description: z.string().trim().optional(),
    basePrice: money.optional(),
    weight: optionalWeight,
    weightUnit: optionalWeightUnit,
    variants: z
      .array(
        z.object({
          id: z.coerce.number().int().positive().optional(),
          variantName: z.string().trim().min(1).max(150),
          sku: z.string().trim().min(1).max(80),
          price: money,
          wholesalePrice: money.default(0),
          retailPrice: money,
          weight: optionalWeight,
          weightUnit: optionalWeightUnit,
          gstApplicable: z.boolean().optional(),
          gstRate: optionalGstRate,
          priceIncludesGst: z.boolean().optional(),
          hsnCode: z.string().trim().max(20).nullable().optional(),
          initialStock: z.coerce.number().int().min(0).max(10000000),
          isActive: z.boolean().optional(),
          attributeValues: z
            .array(
              z.object({
                attributeId: z.coerce.number().int().positive(),
                attributeValueId: z.coerce.number().int().positive(),
              }),
            )
            .default([]),
        }),
      )
      .optional(),
  })
  .superRefine((body, context) => {
    const weightWasUpdated =
      body.weight !== undefined ||
      body.variants?.some((variant) => variant.weight !== undefined);
    if (
      weightWasUpdated &&
      body.variants?.length &&
      body.weight == null &&
      body.variants.some((variant) => variant.weight == null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weight"],
        message: "Set a product weight or configure a weight for every variant.",
      });
    }
    body.variants?.forEach((variant, index) => {
      if (variant.gstApplicable && !(Number(variant.gstRate) > 0)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["variants", index, "gstRate"],
          message: "Enter a GST rate greater than zero when GST applies.",
        });
      }
    });
  })
  .refine((body) => Object.keys(body).length > 0, "Nothing to update");

router.patch(
  "/catalog/products/:id",
  requireShopAccess(CATALOG_ROLES),
  validate(productEditSchema),
  wrap(async (req, res) => {
    const productId = idParam(req, "id");
    const data = req.valid;
    if (
      req.membership.role !== "shop_owner" &&
      data.variants?.some((variant) =>
        variant.gstApplicable !== undefined ||
        variant.gstRate !== undefined ||
        variant.priceIncludesGst !== undefined ||
        variant.hsnCode !== undefined,
      )
    ) {
      throw new AppError(403, "Only the Shop Owner can configure product tax details.");
    }
    const product = await Product.findOne({
      where: { id: productId },
      include: [{ model: ProductVariant, as: "variants" }],
    });
    if (!product) throw new AppError(404, "Product not found");
    if (
      !(await SellerListing.findOne({
        where: { shopId: req.shop.id, productId },
      }))
    )
      throw new AppError(404, "Product is not listed by this shop.");
    if (
      await SellerListing.count({
        where: { productId, shopId: { [Op.ne]: req.shop.id } },
      })
    )
      throw new AppError(
        403,
        "This product is shared with other shops. Ask a Super Admin to change shared product details.",
      );
    const categoryId =
      data.categoryId === undefined ? product.categoryId : data.categoryId;
    if (
      categoryId &&
      !(await Category.findOne({ where: { id: categoryId, isActive: true } }))
    )
      throw new AppError(400, "Select an active approved category.");
    if (
      data.subcategoryId &&
      !(await Subcategory.findOne({
        where: { id: data.subcategoryId, categoryId, isActive: true },
      }))
    )
      throw new AppError(
        400,
        "Select an active subcategory belonging to the selected category.",
      );
    if (
      data.brandId &&
      !(await Brand.findOne({ where: { id: data.brandId, isActive: true } }))
    )
      throw new AppError(400, "Select an active approved brand.");

    await sequelize.transaction(async (t) => {
      const locked = await Product.findByPk(productId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      await locked.update(
        {
          name: data.name,
          sku: data.sku,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          brandId: data.brandId,
          description: data.description,
          basePrice: data.basePrice,
          weight: data.weight,
          weightUnit: data.weightUnit,
        },
        { transaction: t },
      );
      const retainedVariantIds = new Set();
      for (const row of data.variants || []) {
        for (const selected of row.attributeValues) {
          const attribute = await Attribute.findOne({
            where: {
              id: selected.attributeId,
              [Op.or]: [
                { submissionStatus: null },
                { submissionStatus: "approved" },
              ],
            },
            transaction: t,
          });
          const value = await AttributeValue.findOne({
            where: {
              id: selected.attributeValueId,
              attributeId: selected.attributeId,
            },
            transaction: t,
          });
          if (!attribute || !value)
            throw new AppError(
              400,
              "Choose values from an approved attribute.",
            );
        }
        let variant;
        let listing;
        let inventory;
        if (row.id) {
          variant = await ProductVariant.findOne({
            where: { id: row.id, productId },
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (!variant)
            throw new AppError(
              400,
              "A product variant does not belong to this product.",
            );
          [listing, inventory] = await Promise.all([
            SellerListing.findOne({
              where: {
                shopId: req.shop.id,
                productId,
                productVariantId: row.id,
              },
              transaction: t,
              lock: t.LOCK.UPDATE,
            }),
            Inventory.findOne({
              where: {
                shopId: req.shop.id,
                productId,
                productVariantId: row.id,
              },
              transaction: t,
              lock: t.LOCK.UPDATE,
            }),
          ]);
          if (!listing || !inventory)
            throw new AppError(
              404,
              "Shop listing or inventory for a variant was not found.",
            );
          await variant.update(
            {
              variantName: row.variantName,
              sku: row.sku,
              price: row.price,
              wholesalePrice: row.wholesalePrice,
              weight: row.weight,
              weightUnit: row.weightUnit || locked.weightUnit,
            },
            { transaction: t },
          );
          await listing.update(
            {
              retailPrice: row.retailPrice,
              gstApplicable: row.gstApplicable ?? listing.gstApplicable,
              gstRate: row.gstApplicable === false ? 0 : row.gstRate ?? listing.gstRate,
              priceIncludesGst:
                row.gstApplicable === false
                  ? false
                  : row.priceIncludesGst ?? listing.priceIncludesGst,
              hsnCode:
                row.gstApplicable === false
                  ? null
                  : row.hsnCode === undefined
                    ? listing.hsnCode
                    : row.hsnCode || null,
              ...(row.isActive === undefined ? {} : { isActive: row.isActive }),
            },
            { transaction: t },
          );
          if (inventory.quantity !== row.initialStock) {
            const difference = row.initialStock - inventory.quantity;
            await inventory.update(
              { quantity: row.initialStock },
              { transaction: t },
            );
            await InventoryMovement.create(
              {
                shopId: req.shop.id,
                productId,
                productVariantId: variant.id,
                changeQuantity: difference,
                balanceAfter: row.initialStock,
                movementType: "adjustment",
                referenceType: "product_edit",
                referenceId: String(productId),
                notes: "Stock updated while editing product",
                createdBy: req.user.id,
              },
              { transaction: t },
            );
          }
          await ProductVariantValue.destroy({
            where: { productVariantId: variant.id },
            transaction: t,
          });
        } else {
          variant = await ProductVariant.create(
            {
              productId,
              variantName: row.variantName,
              sku: row.sku,
              price: row.price,
              wholesalePrice: row.wholesalePrice,
              weight: row.weight,
              weightUnit: row.weightUnit || locked.weightUnit,
              isActive: true,
            },
            { transaction: t },
          );
          await SellerListing.create(
            {
              shopId: req.shop.id,
              productId,
              productVariantId: variant.id,
              retailPrice: row.retailPrice,
              gstApplicable: row.gstApplicable ?? false,
              gstRate: row.gstApplicable ? row.gstRate || 0 : 0,
              priceIncludesGst: row.gstApplicable ? row.priceIncludesGst ?? false : false,
              hsnCode: row.gstApplicable ? row.hsnCode || null : null,
              isActive: row.isActive ?? true,
            },
            { transaction: t },
          );
          inventory = await Inventory.create(
            {
              shopId: req.shop.id,
              productId,
              productVariantId: variant.id,
              quantity: row.initialStock,
              lowStockThreshold: 5,
            },
            { transaction: t },
          );
          if (row.initialStock)
            await InventoryMovement.create(
              {
                shopId: req.shop.id,
                productId,
                productVariantId: variant.id,
                changeQuantity: row.initialStock,
                balanceAfter: row.initialStock,
                movementType: "receipt",
                referenceType: "product_edit",
                referenceId: String(productId),
                notes: "Initial stock for added product variant",
                createdBy: req.user.id,
              },
              { transaction: t },
            );
        }
        if (row.attributeValues.length)
          await ProductVariantValue.bulkCreate(
            row.attributeValues.map((entry) => ({
              productVariantId: variant.id,
              attributeId: entry.attributeId,
              attributeValueId: entry.attributeValueId,
            })),
            { transaction: t },
          );
        retainedVariantIds.add(Number(variant.id));
      }
      if (data.variants !== undefined) {
        const currentVariants = await ProductVariant.findAll({
          where: { productId },
          attributes: ["id"],
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        for (const currentVariant of currentVariants) {
          if (retainedVariantIds.has(Number(currentVariant.id))) continue;
          await SellerListing.update(
            { isActive: false },
            { where: { shopId: req.shop.id, productId, productVariantId: currentVariant.id }, transaction: t },
          );
        }
      }
    });
    const updated = await Product.findByPk(productId, {
      include: [
        { model: ProductImage, as: "images" },
        {
          model: ProductVariant,
          as: "variants",
          include: [
            {
              model: ProductVariantValue,
              as: "variantValues",
              include: [
                { model: Attribute, as: "attribute" },
                { model: AttributeValue, as: "attributeValue" },
              ],
            },
          ],
        },
      ],
    });
    res.json({ product: updated });
  }),
);

// A Shop Owner removes only their own seller listing. The shared Product,
// other shops' listings, inventory, and historical order snapshots remain intact.
router.delete(
  "/catalog/products/:id",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const productId = idParam(req, "id");
    const listing = await sequelize.transaction(async (transaction) => {
      const product = await Product.findByPk(productId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!product) throw new AppError(404, "Product not found.");
      const ownListing = await SellerListing.findOne({
        where: { productId, shopId: req.shop.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!ownListing) throw new AppError(404, "This product is not listed by your shop.");
      await ownListing.update({ isActive: false }, { transaction });
      return ownListing;
    });
    res.json({ listing, archived: true, message: "Product listing archived for this shop." });
  }),
);

router.post(
  "/catalog/products/:id/images",
  requireShopAccess(CATALOG_ROLES),
  uploadImage.single("image"),
  wrap(async (req, res) => {
    if (!req.file)
      throw new AppError(400, "Please select an image file to upload.");
    const product = await Product.findByPk(idParam(req, "id"));
    if (!product) throw new AppError(404, "Product not found");
    const listing = await SellerListing.findOne({
      where: { shopId: req.shop.id, productId: product.id },
    });
    if (!listing) throw new AppError(404, "Product not found in this shop.");
    if (
      await SellerListing.count({
        where: { productId: product.id, shopId: { [Op.ne]: req.shop.id } },
      })
    )
      throw new AppError(
        403,
        "This product image is shared with other shops and can only be changed by a Super Admin.",
      );

    const imageUrl = `/uploads/${req.file.filename}`;
    const isPrimary =
      req.body.isPrimary === "true" || req.body.isPrimary === true;
    const oldPrimary = isPrimary
      ? await ProductImage.findAll({
          where: { productId: product.id, isPrimary: true },
        })
      : [];
    let img;
    await sequelize.transaction(async (transaction) => {
      if (isPrimary)
        await ProductImage.update(
          { isPrimary: false },
          { where: { productId: product.id }, transaction },
        );
      img = await ProductImage.create(
        {
          productId: product.id,
          imageUrl,
          isPrimary,
          sortOrder: Number(req.body.sortOrder || 0),
        },
        { transaction },
      );
    });
    for (const old of oldPrimary) await removeImageIfUnused(old.imageUrl);

    res.status(201).json({ image: img });
  }),
);

router.delete(
  "/catalog/products/:id/images/:imageId",
  requireShopAccess(CATALOG_ROLES),
  wrap(async (req, res) => {
    const productId = idParam(req, "id");
    const image = await ProductImage.findOne({
      where: { id: idParam(req, "imageId"), productId },
    });
    if (!image) throw new AppError(404, "Product image not found.");
    const listedByShop = await SellerListing.findOne({
      where: { shopId: req.shop.id, productId },
    });
    if (!listedByShop)
      throw new AppError(404, "Product not found in this shop.");
    if (
      await SellerListing.count({
        where: { productId, shopId: { [Op.ne]: req.shop.id } },
      })
    )
      throw new AppError(
        403,
        "This product image is shared with other shops and can only be changed by a Super Admin.",
      );
    await image.destroy();
    await removeImageIfUnused(image.imageUrl);
    const remaining = await ProductImage.findAll({
      where: { productId },
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });
    if (remaining.length && !remaining.some((row) => row.isPrimary))
      await remaining[0].update({ isPrimary: true });
    res.json({ items: remaining });
  }),
);

/* ========================================================================== */
/*                                 INVENTORY                                  */
/* ========================================================================== */
router.get(
  "/inventory",
  requireShopAccess(INVENTORY_ROLES),
  wrap(async (req, res) => {
    const items = await Inventory.findAll({
      where: { shopId: req.shop.id },
      include: [
        {
          model: Product,
          as: "product",
          include: [
            { model: Category, as: "category" },
            { model: Brand, as: "brand" },
          ],
        },
        {
          model: ProductVariant,
          as: "variant",
          include: [
            {
              model: ProductVariantValue,
              as: "variantValues",
              include: [
                { model: Attribute, as: "attribute" },
                { model: AttributeValue, as: "attributeValue" },
              ],
            },
          ],
        },
      ],
      order: [["quantity", "ASC"]],
    });

    // Attach retail listings
    const variantIds = items.map((i) => i.productVariantId);
    const listings = await SellerListing.findAll({
      where: { shopId: req.shop.id, productVariantId: variantIds },
    });
    const listingMap = Object.fromEntries(
      listings.map((l) => [l.productVariantId, l]),
    );

    let totalValuation = 0;
    const enriched = items.map((inv) => {
      const json = inv.toJSON();
      const listing = listingMap[inv.productVariantId];
      const unitVal = listing
        ? Number(listing.retailPrice)
        : Number(inv.variant?.price || 0);
      json.retailPrice = unitVal;
      json.valuation = Number((inv.quantity * unitVal).toFixed(2));
      totalValuation += json.valuation;
      json.isLowStock = inv.quantity <= inv.lowStockThreshold;
      return json;
    });

    res.json({
      items: enriched,
      totalValuation: Number(totalValuation.toFixed(2)),
    });
  }),
);

const adjustStockSchema = z.object({
  productVariantId: z.coerce.number().int().positive(),
  changeQuantity: z.coerce
    .number()
    .int()
    .refine((n) => n !== 0, "Quantity change must not be 0"),
  reason: z.string().trim().min(3, "Reason is required"),
  movementType: z
    .enum(["receipt", "sale", "return", "damaged", "adjustment"])
    .default("adjustment"),
});

router.post(
  "/inventory/adjust",
  requireShopAccess(INVENTORY_ROLES),
  validate(adjustStockSchema),
  wrap(async (req, res) => {
    const { productVariantId, changeQuantity, reason, movementType } =
      req.valid;

    const variant = await ProductVariant.findByPk(productVariantId);
    if (!variant) throw new AppError(404, "Variant not found");

    const result = await adjustStock(
      req.shop.id,
      variant.productId,
      productVariantId,
      changeQuantity,
      reason,
      movementType,
      req.user.id,
    );

    res.json(result);
  }),
);

router.get(
  "/inventory/movements",
  requireShopAccess(INVENTORY_ROLES),
  validate(
    z.object({
      ...page,
      productVariantId: z.coerce.number().int().positive().optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const { page: p, pageSize, productVariantId } = req.valid;
    const where = { shopId: req.shop.id };
    if (productVariantId) where.productVariantId = productVariantId;

    const { rows, count } = await InventoryMovement.findAndCountAll({
      where,
      include: [
        { model: Product, as: "product", attributes: ["id", "name"] },
        {
          model: ProductVariant,
          as: "variant",
          attributes: ["id", "variantName", "sku"],
        },
        { model: User, as: "creator", attributes: ["id", "name"] },
      ],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset: (p - 1) * pageSize,
    });

    res.json({ items: rows, total: count, page: p, pageSize });
  }),
);

/* ========================================================================== */
/*                                RETAIL ORDERS                               */
/* ========================================================================== */
router.get(
  "/orders",
  requireShopAccess(ORDER_ROLES),
  validate(
    z.object({
      ...page,
      status: z.string().optional(),
      paymentStatus: z.string().optional(),
      q: z.string().trim().max(100).optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const { page: p, pageSize, status, paymentStatus, q } = req.valid;
    const where = { shopId: req.shop.id };
    if (req.membership.role === "delivery_associate") {
      const assignments = await DeliveryAssignment.findAll({
        where: { shopId: req.shop.id, deliveryUserId: req.user.id },
        attributes: ["orderId"],
        raw: true,
      });
      where.id = { [Op.in]: assignments.map((assignment) => assignment.orderId) };
    }
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (q) where.orderNumber = { [Op.like]: `%${q}%` };

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "customer",
          attributes: ["id", "name", "email", "phone"],
        },
        { model: OrderItem, as: "items" },
        {
          model: DeliveryAssignment,
          as: "delivery",
          include: [
            {
              model: User,
              as: "deliveryUser",
              attributes: ["id", "name", "phone"],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (p - 1) * pageSize,
      distinct: true,
    });

    res.json({ items: rows, total: count, page: p, pageSize });
  }),
);

router.get(
  "/orders/delivery-associates",
  requireShopAccess(ORDER_ROLES),
  wrap(async (req, res) => {
    if (req.membership.role === "delivery_associate") {
      throw new AppError(403, "Delivery associates cannot view the assignment directory.");
    }
    const members = await ShopMembership.findAll({
      where: {
        shopId: req.shop.id,
        role: "delivery_associate",
        status: "active",
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "status"],
          where: { status: "active" },
        },
      ],
      order: [["createdAt", "ASC"]],
    });
    res.json({
      items: members.map(({ user }) => ({
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: "delivery_associate",
        status: "active",
      })),
    });
  }),
);

router.get(
  "/orders/:id",
  requireShopAccess(ORDER_ROLES),
  wrap(async (req, res) => {
    if (req.membership.role === "delivery_associate") {
      const assignment = await DeliveryAssignment.findOne({
        where: {
          orderId: idParam(req, "id"),
          shopId: req.shop.id,
          deliveryUserId: req.user.id,
        },
      });
      if (!assignment) throw new AppError(404, "Order not found");
    }
    const order = await Order.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
      include: [
        {
          model: User,
          as: "customer",
          attributes:
            req.membership.role === "delivery_associate"
              ? ["id", "name", "phone"]
              : ["id", "name", "email", "phone"],
        },
        { model: OrderItem, as: "items" },
        {
          model: DeliveryAssignment,
          as: "delivery",
          include: [
            {
              model: User,
              as: "deliveryUser",
              attributes: ["id", "name", "phone"],
            },
          ],
        },
        {
          model: OrderStatusHistory,
          as: "statusHistory",
          include: [{ model: User, as: "changer", attributes: ["id", "name"] }],
        },
        ...(req.membership.role === "delivery_associate"
          ? []
          : [
              { model: Payment, as: "payments" },
              {
                model: Return,
                as: "returns",
                include: [
                  {
                    model: ReturnItem,
                    as: "items",
                    include: [{ model: OrderItem, as: "orderItem" }],
                  },
                  { model: User, as: "approver", attributes: ["id", "name"] },
                  { model: User, as: "rejector", attributes: ["id", "name"] },
                  { model: User, as: "receiver", attributes: ["id", "name"] },
                  { model: User, as: "refundProcessor", attributes: ["id", "name"] },
                ],
              },
            ]),
      ],
      order: [[{ model: OrderStatusHistory, as: "statusHistory" }, "createdAt", "ASC"]],
    });

    if (!order) throw new AppError(404, "Order not found");
    res.json({ order });
  }),
);

router.patch(
  "/orders/:id/status",
  requireShopAccess(ORDER_ROLES),
  validate(
    z.object({
      status: z.enum([
        "pending_payment",
        "confirmed",
        "processing",
        "packed",
        "ready_for_dispatch",
        "assigned_to_delivery",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "delivery_failed",
        "returned",
      ]),
      notes: z.string().trim().max(500).optional(),
    }),
  ),
  wrap(async (req, res) => {
    if (req.membership.role === "delivery_associate") {
      throw new AppError(
        403,
        "Delivery associates must use the delivery workflow to update assigned orders.",
      );
    }
    const order = await transitionOrderStatus(
      idParam(req, "id"),
      req.shop.id,
      req.valid.status,
      req.user.id,
      req.valid.notes,
      { allowStatusCorrection: true },
    );
    res.json({ order });
  }),
);

router.post(
  "/orders/:id/assign-delivery",
  requireShopAccess(ORDER_ROLES),
  validate(
    z.object({
      deliveryUserId: z.coerce
        .number()
        .int()
        .positive("Select a delivery associate"),
      notes: z.string().trim().max(500).optional(),
    }),
  ),
  wrap(async (req, res) => {
    if (req.membership.role === "delivery_associate") {
      throw new AppError(403, "Delivery associates cannot assign deliveries.");
    }
    const { deliveryUserId, notes } = req.valid;

    // Verify employee belongs to this shop and has delivery role
    const member = await ShopMembership.findOne({
      where: {
        shopId: req.shop.id,
        userId: deliveryUserId,
        status: "active",
        role: "delivery_associate",
      },
    });
    if (!member)
      throw new AppError(
        400,
        "Selected user is not an active delivery associate for this shop.",
      );

    const assignment = await sequelize.transaction(async (t) => {
      const order = await Order.findOne({
        where: { id: idParam(req, "id"), shopId: req.shop.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!order) throw new AppError(404, "Order not found");
      if (!["ready_for_dispatch", "assigned_to_delivery"].includes(order.status)) {
        throw new AppError(
          400,
          "An order must be ready for dispatch before assigning delivery.",
        );
      }

      const previousStatus = order.status;
      const [deliveryAssignment, created] = await DeliveryAssignment.findOrCreate({
        where: { orderId: order.id },
        defaults: {
          shopId: req.shop.id,
          deliveryUserId,
          status: "assigned",
          notes: notes || null,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!created) {
        await deliveryAssignment.update(
          {
            deliveryUserId,
            status: "assigned",
            notes: notes || deliveryAssignment.notes,
            pickedUpAt: null,
            deliveredAt: null,
          },
          { transaction: t },
        );
      }

      if (previousStatus !== "assigned_to_delivery") {
        await order.update(
          { status: "assigned_to_delivery", deliveryStatus: "assigned" },
          { transaction: t },
        );
      }
      await OrderStatusHistory.create(
        {
          orderId: order.id,
          previousStatus,
          newStatus: "assigned_to_delivery",
          notes: notes || `Assigned to delivery associate #${deliveryUserId}`,
          changedBy: req.user.id,
        },
        { transaction: t },
      );
      return deliveryAssignment;
    });

    res.json({ delivery: assignment });
  }),
);



/* ========================================================================== */
/*                            RETURNS & REFUNDS                               */
/* ========================================================================== */

// function getPaymentMeta(payment) {
//   return payment.meta && typeof payment.meta === "object"
//     ? payment.meta
//     : {};
// }

// /**
//  * Finalizes a refund only after the provider confirms it,
//  * or after the shop records an actual COD refund.
//  *
//  * Payment.status supports paid/refunded, while Order.paymentStatus
//  * also supports partially_refunded.
//  */
// async function completeReturnRefund({
//   ret,
//   payment,
//   order,
//   actorUserId,
//   refundReference,
//   transaction,
// }) {
//   await ret.update(
//     {
//       status: "refunded",
//       refundReference,
//       refundedAt: new Date(),
//       refundedBy: actorUserId,
//       processedBy: actorUserId,
//     },
//     { transaction },
//   );

//   const completedReturns = await Return.findAll({
//     where: {
//       shopId: order.shopId,
//       orderId: order.id,
//       status: "refunded",
//     },
//     transaction,
//     lock: transaction.LOCK.UPDATE,
//   });

//   const refundedCents = completedReturns.reduce(
//     (sum, item) => sum + cents(item.refundAmount),
//     0,
//   );

//   const originalPaymentCents = cents(payment.amount);

//   if (refundedCents > originalPaymentCents) {
//     throw new AppError(
//       409,
//       "Completed refunds exceed the original payment amount.",
//     );
//   }

//   const fullyRefunded = refundedCents >= originalPaymentCents;

//   const meta = getPaymentMeta(payment);
//   const reservations = { ...(meta.refundReservations || {}) };

//   reservations[String(ret.id)] = {
//     status: "processed",
//     amount: Number(ret.refundAmount),
//     reference: refundReference,
//     completedAt: new Date().toISOString(),
//   };

//   await payment.update(
//     {
//       status: fullyRefunded ? "refunded" : "paid",
//       meta: {
//         ...meta,
//         refundReservations: reservations,
//       },
//     },
//     { transaction },
//   );

//   await order.update(
//     {
//       paymentStatus: fullyRefunded
//         ? "refunded"
//         : "partially_refunded",
//     },
//     { transaction },
//   );

//   await audit(
//     {
//       actorId: actorUserId,
//       action: "return.refund_completed",
//       entityType: "return",
//       entityId: ret.id,
//       shopId: order.shopId,
//       meta: {
//         orderId: order.id,
//         paymentId: payment.id,
//         refundAmount: ret.refundAmount,
//         refundReference,
//         paymentMethod: payment.paymentMethod,
//         fullyRefunded,
//       },
//     },
//     transaction,
//   );

//   return {
//     return: ret,
//     fullyRefunded,
//     refundedAmount: moneyValue(refundedCents),
//   };
// }

// /* ------------------------------ List Returns ------------------------------ */

// router.get(
//   "/returns",
//   requireShopAccess(ORDER_ROLES),
//   wrap(async (req, res) => {
//     const items = await Return.findAll({
//       where: { shopId: req.shop.id },
//       include: [
//         {
//           model: Order,
//           as: "order",
//           attributes: [
//             "id",
//             "orderNumber",
//             "totalAmount",
//             "paymentMethod",
//             "paymentStatus",
//             "status",
//           ],
//         },
//         {
//           model: User,
//           as: "customer",
//           attributes: ["id", "name", "phone"],
//         },
//         {
//           model: ReturnItem,
//           as: "items",
//           include: [
//             {
//               model: OrderItem,
//               as: "orderItem",
//             },
//           ],
//         },
//         {
//           model: User,
//           as: "approver",
//           attributes: ["id", "name"],
//         },
//         {
//           model: User,
//           as: "rejector",
//           attributes: ["id", "name"],
//         },
//         {
//           model: User,
//           as: "receiver",
//           attributes: ["id", "name"],
//         },
//         {
//           model: User,
//           as: "refundProcessor",
//           attributes: ["id", "name"],
//         },
//       ],
//       order: [["createdAt", "DESC"]],
//     });

//     res.json({ items });
//   }),
// );

// /* -------------------------- Approve / Reject / Receive -------------------- */

// router.patch(
//   "/returns/:id",
//   requireShopAccess(ORDER_ROLES),
//   validate(
//     z.object({
//       status: z.enum(["approved", "rejected", "received"]),
//       rejectionReason: z.string().trim().min(5).max(500).optional(),
//       notes: z.string().trim().max(2000).optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const returnId = idParam(req, "id");

//     const updatedReturn = await sequelize.transaction(async (t) => {
//       const ret = await Return.findOne({
//         where: {
//           id: returnId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!ret) {
//         throw new AppError(404, "Return record not found.");
//       }

//       const { status, rejectionReason, notes } = req.valid;

//       const transitions = {
//         requested: ["approved", "rejected"],
//         approved: ["received"],
//         received: [],
//         refund_processing: [],
//         rejected: [],
//         refunded: [],
//       };

//       if (!(transitions[ret.status] || []).includes(status)) {
//         throw new AppError(
//           409,
//           `Cannot change return status from "${ret.status}" to "${status}".`,
//         );
//       }

//       if (status === "rejected" && !rejectionReason) {
//         throw new AppError(
//           400,
//           "A rejection reason is required.",
//         );
//       }

//       const updates = {
//         status,
//         processedBy: req.user.id,
//         notes: notes !== undefined ? notes : ret.notes,
//       };

//       if (status === "approved") {
//         updates.approvedAt = new Date();
//         updates.approvedBy = req.user.id;
//       }

//       if (status === "rejected") {
//         updates.rejectedAt = new Date();
//         updates.rejectedBy = req.user.id;
//         updates.rejectionReason = rejectionReason;
//       }

//       if (status === "received") {
//         updates.receivedAt = new Date();
//         updates.receivedBy = req.user.id;
//       }

//       await ret.update(updates, { transaction: t });

//       await audit(
//         {
//           actorId: req.user.id,
//           action: `return.${status}`,
//           entityType: "return",
//           entityId: ret.id,
//           shopId: req.shop.id,
//           meta: {
//             previousStatus: transitions[ret.status],
//             status,
//             rejectionReason: rejectionReason || null,
//           },
//           ip: req.ip,
//         },
//         t,
//       );

//       return ret;
//     });

//     const fullReturn = await Return.findByPk(updatedReturn.id, {
//       include: [
//         {
//           model: ReturnItem,
//           as: "items",
//           include: [{ model: OrderItem, as: "orderItem" }],
//         },
//         { model: User, as: "approver", attributes: ["id", "name"] },
//         { model: User, as: "rejector", attributes: ["id", "name"] },
//         { model: User, as: "receiver", attributes: ["id", "name"] },
//         { model: User, as: "refundProcessor", attributes: ["id", "name"] },
//       ],
//     });

//     res.json({ return: fullReturn });
//   }),
// );

// /* -------------------------- Process a Refund ------------------------------ */

// /**
//  * Razorpay refunds are initiated server-side.
//  *
//  * COD refunds are recorded only when the shop provides the real
//  * external refund transaction reference.
//  */
// router.post(
//   "/returns/:id/refund",
//   requireShopAccess(FINANCE_ROLES),
//   validate(
//     z.object({
//       refundAmount: money.refine(
//         (value) => value > 0,
//         "Refund amount must be greater than zero.",
//       ),
//       refundReference: z.string().trim().min(4).max(255).optional(),
//       notes: z.string().trim().max(2000).optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const returnId = idParam(req, "id");
//     const { refundAmount, refundReference, notes } = req.valid;

//     /*
//      * First reserve the refund inside a DB transaction.
//      * Locking the order serializes refund reservations for that order.
//      */
//     const reservation = await sequelize.transaction(async (t) => {
//       const ret = await Return.findOne({
//         where: {
//           id: returnId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!ret) {
//         throw new AppError(404, "Return record not found.");
//       }

//       if (ret.status !== "received") {
//         throw new AppError(
//           409,
//           "The returned item must be received before processing its refund.",
//         );
//       }

//       const order = await Order.findOne({
//         where: {
//           id: ret.orderId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!order) {
//         throw new AppError(404, "Associated order not found.");
//       }

//       const payment = await Payment.findOne({
//         where: {
//           orderId: order.id,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!payment) {
//         throw new AppError(
//           400,
//           "A payment record is required before processing a refund.",
//         );
//       }

//       if (payment.status !== "paid") {
//         throw new AppError(
//           409,
//           "The original payment must be settled before a refund can be processed.",
//         );
//       }

//       const previousReturns = await Return.findAll({
//         where: {
//           shopId: req.shop.id,
//           orderId: order.id,
//           status: ["refund_processing", "refunded"],
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const reservedCents = previousReturns.reduce(
//         (sum, item) => sum + cents(item.refundAmount),
//         0,
//       );

//       const originalPaymentCents = cents(payment.amount);
//       const requestedRefundCents = cents(refundAmount);
//       const remainingCents = originalPaymentCents - reservedCents;

//       if (requestedRefundCents > remainingCents) {
//         throw new AppError(
//           400,
//           `Refund exceeds the remaining refundable amount of ₹${moneyValue(Math.max(0, remainingCents))}.`,
//         );
//       }

//       if (payment.paymentMethod === "cod") {
//         if (!payment.codCollectedAt || !payment.codReconciled) {
//           throw new AppError(
//             409,
//             "COD must be collected and reconciled before issuing a refund.",
//           );
//         }

//         if (!refundReference) {
//           throw new AppError(
//             400,
//             "Enter the actual COD refund UPI, bank, or cash receipt reference.",
//           );
//         }

//         await ret.update(
//           {
//             refundAmount: Number(moneyValue(requestedRefundCents)),
//             notes: notes || ret.notes,
//             refundProcessingAt: new Date(),
//           },
//           { transaction: t },
//         );

//         const result = await completeReturnRefund({
//           ret,
//           payment,
//           order,
//           actorUserId: req.user.id,
//           refundReference,
//           transaction: t,
//         });

//         return {
//           method: "cod",
//           result,
//         };
//       }

//       if (payment.paymentMethod !== "razorpay") {
//         throw new AppError(
//           400,
//           "Unsupported payment method for refund.",
//         );
//       }

//       if (!payment.razorpayPaymentId) {
//         throw new AppError(
//           409,
//           "The original Razorpay payment ID is missing.",
//         );
//       }

//       const meta = getPaymentMeta(payment);
//       const reservations = { ...(meta.refundReservations || {}) };

//       if (reservations[String(ret.id)]) {
//         throw new AppError(
//           409,
//           "A refund has already been initiated for this return. Verify its provider status before retrying.",
//         );
//       }

//       reservations[String(ret.id)] = {
//         status: "initiating",
//         amount: Number(moneyValue(requestedRefundCents)),
//         initiatedAt: new Date().toISOString(),
//       };

//       await ret.update(
//         {
//           status: "refund_processing",
//           refundAmount: Number(moneyValue(requestedRefundCents)),
//           refundProcessingAt: new Date(),
//           processedBy: req.user.id,
//           notes: notes || ret.notes,
//         },
//         { transaction: t },
//       );

//       await payment.update(
//         {
//           meta: {
//             ...meta,
//             refundReservations: reservations,
//           },
//         },
//         { transaction: t },
//       );

//       return {
//         method: "razorpay",
//         returnId: ret.id,
//         paymentId: payment.id,
//         razorpayPaymentId: payment.razorpayPaymentId,
//         orderId: order.id,
//         amount: Number(moneyValue(requestedRefundCents)),
//       };
//     });

//     if (reservation.method === "cod") {
//       return res.json({
//         message: "COD refund recorded successfully.",
//         ...reservation.result,
//       });
//     }

//     /*
//      * Provider network call is deliberately outside the database
//      * transaction. Do not hold SQL locks during an external API request.
//      */
//     const providerRefund = await createRazorpayRefund(
//       reservation.razorpayPaymentId,
//       reservation.amount,
//       `RETURN-${reservation.returnId}`,
//       {
//         returnId: String(reservation.returnId),
//         orderId: String(reservation.orderId),
//         shopId: String(req.shop.id),
//       },
//     );

//     if (!providerRefund || !providerRefund.id) {
//       throw new AppError(
//         502,
//         "Razorpay did not return a refund reference. Verify the provider dashboard before retrying.",
//       );
//     }

//     const providerStatus = String(providerRefund.status || "").toLowerCase();

//     const result = await sequelize.transaction(async (t) => {
//       const ret = await Return.findOne({
//         where: {
//           id: reservation.returnId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!ret) {
//         throw new AppError(404, "Return record not found.");
//       }

//       const order = await Order.findOne({
//         where: {
//           id: reservation.orderId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!order) {
//         throw new AppError(404, "Associated order not found.");
//       }

//       const payment = await Payment.findOne({
//         where: {
//           id: reservation.paymentId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!payment) {
//         throw new AppError(404, "Payment record not found.");
//       }

//       if (providerStatus === "processed") {
//         return completeReturnRefund({
//           ret,
//           payment,
//           order,
//           actorUserId: req.user.id,
//           refundReference: providerRefund.id,
//           transaction: t,
//         });
//       }

//       if (providerStatus === "failed") {
//         const meta = getPaymentMeta(payment);
//         const reservations = { ...(meta.refundReservations || {}) };
//         delete reservations[String(ret.id)];

//         await payment.update(
//           {
//             meta: {
//               ...meta,
//               refundReservations: reservations,
//             },
//           },
//           { transaction: t },
//         );

//         await ret.update(
//           {
//             status: "received",
//             refundAmount: null,
//             refundReference: null,
//             notes: [
//               ret.notes,
//               "Razorpay reported that the refund failed. It can be reviewed and retried.",
//             ]
//               .filter(Boolean)
//               .join("\n"),
//           },
//           { transaction: t },
//         );

//         return {
//           return: ret,
//           providerStatus: "failed",
//         };
//       }

//       // Razorpay may accept a refund and process it asynchronously.
//       const meta = getPaymentMeta(payment);
//       const reservations = { ...(meta.refundReservations || {}) };

//       reservations[String(ret.id)] = {
//         status: "pending",
//         amount: reservation.amount,
//         refundId: providerRefund.id,
//         initiatedAt: reservations[String(ret.id)]?.initiatedAt || null,
//       };

//       await payment.update(
//         {
//           meta: {
//             ...meta,
//             refundReservations: reservations,
//           },
//         },
//         { transaction: t },
//       );

//       await ret.update(
//         {
//           refundReference: providerRefund.id,
//         },
//         { transaction: t },
//       );

//       return {
//         return: ret,
//         providerStatus: providerStatus || "pending",
//       };
//     });

//     res.json({
//       message:
//         providerStatus === "processed"
//           ? "Razorpay refund completed successfully."
//           : providerStatus === "failed"
//             ? "Razorpay refund failed. You can review and retry it."
//             : "Refund submitted to Razorpay and is awaiting confirmation.",
//       ...result,
//     });
//   }),
// );

// /* ------------------------ Refresh Razorpay Refund ------------------------ */

// /**
//  * Use this endpoint to check a pending Razorpay refund.
//  * It does not create another refund.
//  */
// router.post(
//   "/returns/:id/refresh-refund",
//   requireShopAccess(FINANCE_ROLES),
//   wrap(async (req, res) => {
//     const returnId = idParam(req, "id");

//     const snapshot = await sequelize.transaction(async (t) => {
//       const ret = await Return.findOne({
//         where: {
//           id: returnId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!ret) {
//         throw new AppError(404, "Return record not found.");
//       }

//       if (ret.status !== "refund_processing" || !ret.refundReference) {
//         throw new AppError(
//           409,
//           "This return does not have a pending Razorpay refund to verify.",
//         );
//       }

//       const payment = await Payment.findOne({
//         where: {
//           orderId: ret.orderId,
//           shopId: req.shop.id,
//           paymentMethod: "razorpay",
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!payment || !payment.razorpayPaymentId) {
//         throw new AppError(
//           404,
//           "Original Razorpay payment record not found.",
//         );
//       }

//       return {
//         returnId: ret.id,
//         refundId: ret.refundReference,
//         paymentId: payment.id,
//         razorpayPaymentId: payment.razorpayPaymentId,
//         orderId: ret.orderId,
//       };
//     });

//     const providerRefund = await fetchRazorpayRefund(
//       snapshot.razorpayPaymentId,
//       snapshot.refundId,
//     );

//     const providerStatus = String(providerRefund.status || "").toLowerCase();

//     const updatedReturn = await sequelize.transaction(async (t) => {
//       const ret = await Return.findOne({
//         where: {
//           id: snapshot.returnId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!ret) {
//         throw new AppError(404, "Return record not found.");
//       }

//       if (ret.status === "refunded") {
//         return ret;
//       }

//       const order = await Order.findOne({
//         where: {
//           id: snapshot.orderId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       const payment = await Payment.findOne({
//         where: {
//           id: snapshot.paymentId,
//           shopId: req.shop.id,
//         },
//         transaction: t,
//         lock: t.LOCK.UPDATE,
//       });

//       if (!order || !payment) {
//         throw new AppError(404, "Associated order or payment not found.");
//       }

//       if (providerStatus === "processed") {
//         await completeReturnRefund({
//           ret,
//           payment,
//           order,
//           actorUserId: req.user.id,
//           refundReference: snapshot.refundId,
//           transaction: t,
//         });
//       } else if (providerStatus === "failed") {
//         const meta = getPaymentMeta(payment);
//         const reservations = { ...(meta.refundReservations || {}) };
//         delete reservations[String(ret.id)];

//         await payment.update(
//           {
//             meta: {
//               ...meta,
//               refundReservations: reservations,
//             },
//           },
//           { transaction: t },
//         );

//         await ret.update(
//           {
//             status: "received",
//             refundAmount: null,
//             refundReference: null,
//             notes: [
//               ret.notes,
//               "Razorpay confirmed that this refund failed.",
//             ]
//               .filter(Boolean)
//               .join("\n"),
//           },
//           { transaction: t },
//         );
//       }

//       return ret;
//     });

//     res.json({
//       message:
//         providerStatus === "processed"
//           ? "Refund confirmed by Razorpay."
//           : providerStatus === "failed"
//             ? "Razorpay confirmed that the refund failed."
//             : "Razorpay refund is still processing.",
//       providerStatus,
//       return: updatedReturn,
//     });
//   }),
// );

// /* ------------------------------- Refund List ------------------------------ */

// router.get(
//   "/refunds",
//   requireShopAccess(ORDER_ROLES),
//   wrap(async (req, res) => {
//     const items = await Return.findAll({
//       where: {
//         shopId: req.shop.id,
//         status: "refunded",
//       },
//       include: [
//         {
//           model: Order,
//           as: "order",
//         },
//         {
//           model: User,
//           as: "customer",
//           attributes: ["id", "name", "phone"],
//         },
//         {
//           model: ReturnItem,
//           as: "items",
//           include: [{ model: OrderItem, as: "orderItem" }],
//         },
//         {
//           model: User,
//           as: "refundProcessor",
//           attributes: ["id", "name"],
//         },
//       ],
//       order: [["refundedAt", "DESC"]],
//     });

//     res.json({ items });
//   }),
// );

router.get(
  "/returns",
  requireShopAccess(ORDER_ROLES),
  wrap(async (req, res) => {
    const items = await Return.findAll({
      where: { shopId: req.shop.id },
      include: [
        {
          model: Order,
          as: "order",
          attributes: ["id", "orderNumber", "totalAmount"],
        },
        { model: User, as: "customer", attributes: ["id", "name", "phone"] },
        {
          model: ReturnItem,
          as: "items",
          include: [{ model: OrderItem, as: "orderItem" }],
        },
        { model: User, as: "approver", attributes: ["id", "name"] },
        { model: User, as: "rejector", attributes: ["id", "name"] },
        { model: User, as: "receiver", attributes: ["id", "name"] },
        { model: User, as: "refundProcessor", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ items });
  }),
);

router.patch(
  "/returns/:id",
  requireShopAccess(ORDER_ROLES),
  validate(
    z.object({
      status: z.enum([
        "approved",
        "rejected",
        "received",
        "refund_processing",
        "refunded",
      ]),
      rejectionReason: z.string().trim().min(5).max(500).optional(),
      refundReference: z.string().trim().min(4).max(255).optional(),
      notes: z.string().trim().max(2000).optional(),
    }),
  ),
  wrap(async (req, res) => {
    const updatedReturn = await sequelize.transaction(async (t) => {
      const ret = await Return.findOne({
        where: { id: idParam(req, "id"), shopId: req.shop.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!ret) throw new AppError(404, "Return record not found");

      const { status, rejectionReason, refundReference, notes } = req.valid;
      const validTransitions = {
        requested: ["approved", "rejected"],
        approved: ["received"],
        received: ["refund_processing"],
        refund_processing: ["refunded"],
        rejected: [],
        refunded: [],
      };
      if (!(validTransitions[ret.status] || []).includes(status)) {
        throw new AppError(
          400,
          `Invalid return status transition from "${ret.status}" to "${status}".`,
        );
      }

      if (status === "rejected" && !rejectionReason) {
        throw new AppError(400, "A rejection reason is required.");
      }
      if (status === "refunded" && !refundReference) {
        throw new AppError(
          400,
          "Enter the manual refund transaction or receipt reference before confirming the refund.",
        );
      }

      const updates = {
        status,
        processedBy: req.user.id,
        notes: notes || ret.notes,
      };
      if (status === "approved") {
        updates.approvedAt = new Date();
        updates.approvedBy = req.user.id;
      } else if (status === "rejected") {
        updates.rejectedAt = new Date();
        updates.rejectedBy = req.user.id;
        updates.rejectionReason = rejectionReason;
      } else if (status === "received") {
        updates.receivedAt = new Date();
        updates.receivedBy = req.user.id;
      } else if (status === "refund_processing") {
        updates.refundProcessingAt = new Date();
      } else if (status === "refunded") {
        const order = await Order.findOne({
          where: { id: ret.orderId, shopId: req.shop.id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!order) throw new AppError(404, "Order not found");

        const payment = await Payment.findOne({
          where: { orderId: order.id, shopId: req.shop.id },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!payment) throw new AppError(400, "A payment record is required before confirming a refund.");
        if (payment.paymentMethod === "cod" && !payment.codCollectedAt) {
          throw new AppError(400, "Cash on delivery must be collected before a refund can be confirmed.");
        }
        if (payment.paymentMethod === "razorpay" && payment.status !== "paid") {
          throw new AppError(400, "The online payment must be settled before a refund can be confirmed.");
        }

        updates.refundedAt = new Date();
        updates.refundedBy = req.user.id;
        updates.refundReference = refundReference;
      }

      await ret.update(updates, { transaction: t });
      return Return.findByPk(ret.id, {
        transaction: t,
        include: [
          {
            model: ReturnItem,
            as: "items",
            include: [{ model: OrderItem, as: "orderItem" }],
          },
          { model: User, as: "approver", attributes: ["id", "name"] },
          { model: User, as: "rejector", attributes: ["id", "name"] },
          { model: User, as: "receiver", attributes: ["id", "name"] },
          { model: User, as: "refundProcessor", attributes: ["id", "name"] },
        ],
      });
    });

    res.json({ return: updatedReturn });
  }),
);

router.get(
  "/refunds",
  requireShopAccess(ORDER_ROLES),
  wrap(async (req, res) => {
    const items = await Return.findAll({
      where: { shopId: req.shop.id, status: "refunded" },
      include: [
        { model: Order, as: "order" },
        { model: User, as: "customer", attributes: ["id", "name", "phone"] },
      ],
      order: [["updatedAt", "DESC"]],
    });
    res.json({ items });
  }),
);

/* ========================================================================== */
/*                    PAYMENTS & COD RECONCILIATION                           */
/* ========================================================================== */
router.get(
  "/payments",
  requireShopAccess(ORDER_ROLES),
  wrap(async (req, res) => {
    const items = await Payment.findAll({
      where: { shopId: req.shop.id },
      include: [
        {
          model: Order,
          as: "order",
          attributes: ["id", "orderNumber", "totalAmount"],
        },
        { model: User, as: "collector", attributes: ["id", "name"] },
        { model: User, as: "reconciler", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ items });
  }),
);

router.post(
  "/payments/:id/reconcile-cod",
  requireShopAccess(ORDER_ROLES),
  validate(z.object({
    notes: z.string().trim().max(500).optional(),
  })),
  wrap(async (req, res) => {
    const payment = await reconcileCodPayment(
      idParam(req, "id"),
      req.shop.id,
      req.user.id,
      req.valid.notes,
    );
    await audit({
      actorId: req.user.id,
      action: "payment.cod_reconciled",
      entityType: "payment",
      entityId: payment.id,
      shopId: req.shop.id,
      meta: { amount: payment.amount, orderId: payment.orderId },
      ip: req.ip,
    });
    res.json({ payment });
  }),
);

/* ========================================================================== */
/*                                DELIVERY                                    */
/* ========================================================================== */
router.get(
  "/delivery",
  requireShopAccess(ORDER_ROLES),
  wrap(async (req, res) => {
    const items = await DeliveryAssignment.findAll({
      where: { shopId: req.shop.id },
      include: [
        {
          model: Order,
          as: "order",
          include: [
            {
              model: User,
              as: "customer",
              attributes: ["id", "name", "phone"],
            },
          ],
        },
        {
          model: User,
          as: "deliveryUser",
          attributes: ["id", "name", "phone"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ items });
  }),
);

/* ========================================================================== */
/*                         EMPLOYEES & PAYROLL                                */
/* ========================================================================== */
const BUILT_IN_EMPLOYEE_ROLES = [
  { value: "shop_manager", label: "Shop Manager" },
  { value: "sales_associate", label: "Sales Associate" },
  { value: "delivery_associate", label: "Delivery Associate" },
  { value: "cashier", label: "Cashier" },
  { value: "support", label: "Support" },
];
const BUILT_IN_EMPLOYEE_ROLE_CODES = new Set(
  [...BUILT_IN_EMPLOYEE_ROLES.map(({ value }) => value), "shop_owner"],
);

function normalizeEmployeeRoleCode(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function requireAssignableEmployeeRole(role, shopId, transaction) {
  const customRole = await ShopRole.findOne({
    where: { shopId, code: role, isActive: true },
    transaction,
    ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  if (!customRole && !BUILT_IN_EMPLOYEE_ROLE_CODES.has(role)) {
    throw new AppError(400, "Select an active role available to this shop.");
  }
}

async function permissionsForEmployee(role, shopId, permissions, transaction) {
  if (permissions === undefined) return null;
  const normalized = normalizePermissions(permissions);
  const roleDefinition = await ShopRole.findOne({
    where: { shopId, code: role, isActive: true },
    transaction,
  });
  const defaults = defaultPermissionsForRole(role, roleDefinition);
  const sortedPermissions = [...normalized].sort();
  const sortedDefaults = [...defaults].sort();
  return JSON.stringify(sortedPermissions) === JSON.stringify(sortedDefaults)
    ? null
    : normalized;
}

router.get(
  "/employee-roles",
  requireShopAccess(OWNER_ONLY),
  wrap(async (req, res) => {
    const customRoles = await ShopRole.findAll({
      where: { shopId: req.shop.id, isActive: true },
      attributes: ["name", "code", "isActive", "permissions"],
      order: [["name", "ASC"]],
    });
    const roleOverrides = new Map(customRoles.map((role) => [role.code, role]));
    const items = [
      ...BUILT_IN_EMPLOYEE_ROLES.map((role) => ({
        ...role,
        key: role.value,
        code: role.value,
        name: roleOverrides.get(role.value)?.name || role.label,
        isActive: roleOverrides.get(role.value)?.isActive ?? true,
        permissions: roleOverrides.has(role.value)
          ? normalizePermissions(roleOverrides.get(role.value).permissions)
          : defaultPermissionsForRole(role.value),
      })),
      ...customRoles
        .filter((role) => !BUILT_IN_EMPLOYEE_ROLE_CODES.has(role.code))
        .map((role) => ({
        value: role.code,
        key: role.code,
        code: role.code,
        label: role.name,
        name: role.name,
        isActive: role.isActive,
        permissions: normalizePermissions(role.permissions),
        })),
    ];
    res.json({ items, permissionModules: PERMISSION_MODULES });
  }),
);

router.get(
  "/employee-roles/manage",
  requireShopAccess(OWNER_ONLY),
  wrap(async (req, res) => {
    const savedRoles = await ShopRole.findAll({
      where: { shopId: req.shop.id },
      order: [["name", "ASC"]],
    });
    const rolesByCode = new Map(savedRoles.map((role) => [role.code, role]));
    const roleDefinitions = [
      ...BUILT_IN_EMPLOYEE_ROLES.map((role) => ({
        code: role.value,
        name: role.label,
        builtIn: true,
        isActive: true,
        permissions: defaultPermissionsForRole(role.value),
      })),
      ...savedRoles
        .filter((role) => !BUILT_IN_EMPLOYEE_ROLE_CODES.has(role.code))
        .map((role) => ({
          code: role.code,
          name: role.name,
          builtIn: false,
          isActive: role.isActive,
          permissions: normalizePermissions(role.permissions),
        })),
    ].map((role) => {
      const saved = rolesByCode.get(role.code);
      return {
        ...role,
        ...(saved
          ? {
              name: saved.name,
              isActive: saved.isActive,
              permissions: normalizePermissions(saved.permissions),
            }
          : {}),
      };
    });
    const items = await Promise.all(
      roleDefinitions.map(async (role) => ({
        ...role,
        employeeCount: await ShopMembership.count({
          where: { shopId: req.shop.id, role: role.code },
        }),
      })),
    );
    res.json({ items, permissionModules: PERMISSION_MODULES });
  }),
);

router.post(
  "/employee-roles",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({
      name: z.string().trim().min(1, "Role name is required").max(100),
      permissions: z.array(z.enum([...PERMISSION_KEYS])).max(PERMISSION_KEYS.size).optional(),
    }),
  ),
  wrap(async (req, res) => {
    const name = req.valid.name.trim().replace(/\s+/g, " ");
    const code = normalizeEmployeeRoleCode(name);
    if (!code || code.length > 100) {
      throw new AppError(
        400,
        "Enter a role name using letters or numbers, up to 100 characters.",
      );
    }
    if (BUILT_IN_EMPLOYEE_ROLE_CODES.has(code)) {
      throw new AppError(409, "This role is already available as a built-in role.");
    }

    try {
      const role = await ShopRole.create({
        shopId: req.shop.id,
        name,
        code,
        isActive: true,
        permissions:
          req.valid.permissions === undefined
            ? ["dashboard.view"]
            : normalizePermissions(req.valid.permissions),
      });
      res.status(201).json({
        role: {
          value: role.code,
          key: role.code,
          code: role.code,
          label: role.name,
          name: role.name,
          isActive: role.isActive,
          permissions: normalizePermissions(role.permissions),
        },
      });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new AppError(409, "A role with this name already exists in this shop.");
      }
      throw error;
    }
  }),
);

router.patch(
  "/employee-roles/:code",
  requireShopAccess(OWNER_ONLY),
  validate(
    z
      .object({
        name: z.string().trim().min(1).max(100).optional(),
        permissions: z.array(z.enum([...PERMISSION_KEYS])).max(PERMISSION_KEYS.size).optional(),
        isActive: z.boolean().optional(),
      })
      .refine((body) => Object.keys(body).length > 0, "Provide role changes to save."),
  ),
  wrap(async (req, res) => {
    const code = String(req.params.code || "").trim();
    const isBuiltInRole = BUILT_IN_EMPLOYEE_ROLE_CODES.has(code);
    if (req.valid.isActive === false && isBuiltInRole) {
      throw new AppError(400, "Built-in employee roles cannot be deactivated.");
    }

    const role = await sequelize.transaction(async (transaction) => {
      let savedRole = await ShopRole.findOne({
        where: { shopId: req.shop.id, code },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!savedRole && !isBuiltInRole) {
        throw new AppError(404, "Role not found for this shop.");
      }

      const updates = {
        ...(req.valid.name
          ? { name: req.valid.name.trim().replace(/\s+/g, " ") }
          : {}),
        ...(req.valid.permissions !== undefined
          ? { permissions: normalizePermissions(req.valid.permissions) }
          : {}),
        ...(req.valid.isActive !== undefined
          ? { isActive: req.valid.isActive }
          : {}),
      };
      if (!savedRole) {
        const definition = BUILT_IN_EMPLOYEE_ROLES.find(
          (roleDefinition) => roleDefinition.value === code,
        );
        savedRole = await ShopRole.create(
          {
            shopId: req.shop.id,
            code,
            name: updates.name || definition.label,
            permissions:
              updates.permissions || defaultPermissionsForRole(code),
            isActive: true,
          },
          { transaction },
        );
      } else {
        await savedRole.update(updates, { transaction });
      }
      await audit(
        {
          actorId: req.user.id,
          action: "employee_role.updated",
          entityType: "shop_role",
          entityId: savedRole.id,
          shopId: req.shop.id,
          meta: { code, changedFields: Object.keys(req.valid) },
          ip: req.ip,
        },
        transaction,
      );
      return savedRole;
    }).catch((error) => {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new AppError(409, "A role with this name already exists in this shop.");
      }
      throw error;
    });

    res.json({
      role: {
        code: role.code,
        name: role.name,
        isActive: role.isActive,
        permissions: normalizePermissions(role.permissions),
      },
    });
  }),
);

router.get(
  "/employees",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({
      q: z.string().trim().max(100).optional(),
      designation: z.string().trim().max(100).optional(),
      status: z.enum(["active", "inactive"]).optional(),
      excludeOwners: z.coerce.boolean().default(false),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const {
      q,
      designation,
      status,
      excludeOwners,
      page: currentPage,
      pageSize,
    } = req.valid;
    const membershipWhere = { shopId: req.shop.id };
    if (excludeOwners) membershipWhere.role = { [Op.ne]: "shop_owner" };
    if (status) membershipWhere.status = status;
    const members = await ShopMembership.findAll({
      where: membershipWhere,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "status"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });
    const customRoles = await ShopRole.findAll({
      where: { shopId: req.shop.id, isActive: true },
      attributes: ["code", "permissions"],
    });
    const customRolesByCode = new Map(
      customRoles.map((role) => [role.code, role]),
    );
    const userIds = members.map((m) => m.userId);
    const profiles = userIds.length
      ? await EmployeeProfile.findAll({
          where: { shopId: req.shop.id, userId: userIds },
        })
      : [];
    const profileMap = Object.fromEntries(profiles.map((p) => [p.userId, p]));
    let items = members.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      role: m.role,
      status: m.status,
      permissions: effectivePermissionsForMembership(
        m,
        customRolesByCode.get(m.role),
      ),
      name: m.user?.name,
      email: m.user?.email,
      phone: m.user?.phone,
      userStatus: m.user?.status,
      profile: profileMap[m.userId] || null,
    }));
    if (q) {
      const needle = q.toLowerCase();
      items = items.filter((e) =>
        [
          e.name,
          e.email,
          e.phone,
          e.profile?.employeeCode,
          String(e.userId),
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(needle),
        ),
      );
    }
    if (designation)
      items = items.filter((e) => e.profile?.designation === designation);
    const total = items.length;
    const offset = (currentPage - 1) * pageSize;
    res.json({
      items: items.slice(offset, offset + pageSize),
      total,
      page: currentPage,
      pageSize,
      designations: [
        ...new Set(profiles.map((p) => p.designation).filter(Boolean)),
      ].sort(),
    });
  }),
);

const createEmployeeSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(190),
  phone: optional(phone),
  password: password,
  role: z.string().trim().min(1).max(100),
  salaryType: z.enum(["monthly", "hourly", "daily"]).default("monthly"),
  baseSalary: money.default(0),
  designation: optional(z.string().trim().max(100)),
  employeeCode: optional(z.string().trim().min(1).max(40)),
  address: optional(z.string().trim().max(500)),
  joinedDate: validDate.optional(),
  permissions: z.array(z.enum([...PERMISSION_KEYS])).max(PERMISSION_KEYS.size).optional(),
});

router.post(
  "/employees",
  requireShopAccess(OWNER_ONLY),
  validate(createEmployeeSchema),
  wrap(async (req, res) => {
    const {
      name,
      email,
      phone: ph,
      password: pw,
      role,
      salaryType,
      baseSalary,
      designation,
      employeeCode,
      address,
      joinedDate,
      permissions,
    } = req.valid;

    await requireAssignableEmployeeRole(role, req.shop.id);
    const existing = await User.unscoped().findOne({ where: { email } });
    if (existing) {
      throw new AppError(
        409,
        "An account with this email address already exists.",
      );
    }
    if (
      employeeCode &&
      (await EmployeeProfile.findOne({
        where: { shopId: req.shop.id, employeeCode },
      }))
    ) {
      throw new AppError(
        409,
        "This employee code is already in use in this shop.",
      );
    }

    const hash = await bcrypt.hash(pw, env.bcryptRounds);

    const result = await sequelize.transaction(async (t) => {
      const user = await User.create(
        {
          name,
          email,
          phone: ph || null,
          passwordHash: hash,
          role: "shop_user",
          status: "active",
          emailVerifiedAt: new Date(),
        },
        { transaction: t },
      );

      const membership = await ShopMembership.create(
        {
          userId: user.id,
          shopId: req.shop.id,
          role,
          status: "active",
          permissions: await permissionsForEmployee(
            role,
            req.shop.id,
            permissions,
            t,
          ),
        },
        { transaction: t },
      );

      const profile = await EmployeeProfile.create(
        {
          userId: user.id,
          shopId: req.shop.id,
          salaryType,
          baseSalary,
          designation: designation || role.replace(/_/g, " "),
          employeeCode: employeeCode || null,
          address: address || null,
          joinedDate: joinedDate || new Date(),
        },
        { transaction: t },
      );
      await EmployeeSalary.create(
        {
          shopId: req.shop.id,
          userId: user.id,
          salaryType,
          baseSalary,
          allowances: 0,
          deductions: 0,
          effectiveDate: joinedDate || new Date().toISOString().slice(0, 10),
          createdBy: req.user.id,
        },
        { transaction: t },
      );

      await audit(
        {
          actorId: req.user.id,
          action: "employee.created",
          entityType: "user",
          entityId: user.id,
          shopId: req.shop.id,
          meta: { role, email, baseSalary },
          ip: req.ip,
        },
        t,
      );

      return { user, membership, profile };
    });

    res.status(201).json({
      employee: {
        membershipId: result.membership.id,
        userId: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.membership.role,
        status: result.membership.status,
        profile: result.profile,
      },
    });
  }),
);

router.patch(
  "/employees/:id",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({
      role: z.string().trim().min(1).max(100).optional(),
      status: z.enum(["active", "inactive"]).optional(),
      name: z.string().trim().min(2).max(120).optional(),
      email: z.string().trim().toLowerCase().email().max(190).optional(),
      phone: optional(phone),
      baseSalary: money.optional(),
      designation: optional(z.string().trim().max(100)),
      employeeCode: optional(z.string().trim().min(1).max(40)),
      address: optional(z.string().trim().max(500)),
      joinedDate: validDate.optional(),
      permissions: z.array(z.enum([...PERMISSION_KEYS])).max(PERMISSION_KEYS.size).optional(),
    }),
  ),
  wrap(async (req, res) => {
    const member = await ShopMembership.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
    });
    if (!member || member.role === "shop_owner")
      throw new AppError(404, "Employee membership not found");
    const {
      role,
      status,
      name,
      email,
      phone: ph,
      baseSalary,
      designation,
      employeeCode,
      address,
      joinedDate,
      permissions,
    } = req.valid;
    if (
      Number(member.userId) === Number(req.user.id) &&
      (role !== undefined ||
        status !== undefined ||
        permissions !== undefined)
    ) {
      throw new AppError(403, "Employees cannot change their own role or permissions.");
    }
    await sequelize.transaction(async (t) => {
      if (role !== undefined) {
        await requireAssignableEmployeeRole(role, req.shop.id, t);
      }
      const user = await User.findByPk(member.userId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (email && email !== user.email) {
        if (await User.unscoped().findOne({ where: { email }, transaction: t }))
          throw new AppError(409, "An account with this email already exists.");
      }
      const profile = await EmployeeProfile.findOne({
        where: { userId: member.userId, shopId: req.shop.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (name !== undefined || email !== undefined || ph !== undefined)
        await user.update(
          {
            ...(name !== undefined ? { name } : {}),
            ...(email !== undefined ? { email } : {}),
            ...(ph !== undefined ? { phone: ph || null } : {}),
          },
          { transaction: t },
        );
      if (role !== undefined || status !== undefined || permissions !== undefined)
        await member.update(
          {
            ...(role !== undefined ? { role } : {}),
            ...(status !== undefined ? { status } : {}),
            ...(permissions !== undefined
              ? {
                  permissions: await permissionsForEmployee(
                    role || member.role,
                    req.shop.id,
                    permissions,
                    t,
                  ),
                }
              : role !== undefined
                ? { permissions: null }
                : {}),
          },
          { transaction: t },
        );
      if (
        employeeCode &&
        (await EmployeeProfile.findOne({
          where: {
            shopId: req.shop.id,
            employeeCode,
            userId: { [Op.ne]: member.userId },
          },
          transaction: t,
        }))
      )
        throw new AppError(
          409,
          "This employee code is already in use in this shop.",
        );
      if (profile)
        await profile.update(
          {
            ...(baseSalary !== undefined ? { baseSalary } : {}),
            ...(designation !== undefined ? { designation } : {}),
            ...(employeeCode !== undefined
              ? { employeeCode: employeeCode || null }
              : {}),
            ...(address !== undefined ? { address: address || null } : {}),
            ...(joinedDate !== undefined ? { joinedDate } : {}),
          },
          { transaction: t },
        );
      await audit(
        {
          actorId: req.user.id,
          action: "employee.updated",
          entityType: "user",
          entityId: member.userId,
          shopId: req.shop.id,
          meta: { changedFields: Object.keys(req.valid) },
          ip: req.ip,
        },
        t,
      );
    });
    res.json({ message: "Employee updated successfully" });
  }),
);

/* ----------------------------- Attendance --------------------------- */
router.get(
  "/attendance/employees",
  requireShopAccess(ATTENDANCE_ROLES),
  wrap(async (req, res) => {
    const members = await ShopMembership.findAll({
      where: {
        shopId: req.shop.id,
        status: "active",
        role: { [Op.ne]: "shop_owner" },
      },
      include: [{ model: User, as: "user", attributes: ["id", "name"] }],
      order: [["createdAt", "ASC"]],
    });
    res.json({
      items: members.map((m) => ({
        userId: m.userId,
        name: m.user?.name,
        role: m.role,
      })),
    });
  }),
);

router.get(
  "/attendance",
  requireShopAccess(ATTENDANCE_ROLES),
  validate(
    z
      .object({
        date: validDate.optional(),
        from: validDate.optional(),
        to: validDate.optional(),
        userId: z.coerce.number().int().positive().optional(),
        status: z
          .enum(["present", "absent", "half_day", "on_leave"])
          .optional(),
        month: z
          .string()
          .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
          .optional(),
      })
      .refine((v) => !v.from || !v.to || v.from <= v.to, {
        message: "From date must be on or before to date",
        path: ["to"],
      }),
    "query",
  ),
  wrap(async (req, res) => {
    const { date, from, to, userId, status, month } = req.valid;
    const where = { shopId: req.shop.id };
    if (date) where.date = date;
    else if (month)
      where.date = {
        [Op.between]: [
          `${month}-01`,
          `${month}-${new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate()}`,
        ],
      };
    else if (from || to)
      where.date = {
        ...(from ? { [Op.gte]: from } : {}),
        ...(to ? { [Op.lte]: to } : {}),
      };
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const items = await AttendanceRecord.findAll({
      where,
      include: [{ model: User, as: "user", attributes: ["id", "name"] }],
      order: [
        ["date", "DESC"],
        ["id", "DESC"],
      ],
    });
    const summary = items.reduce((out, item) => {
      out[item.status] = (out[item.status] || 0) + 1;
      return out;
    }, {});
    res.json({ items, summary });
  }),
);

router.post(
  "/attendance",
  requireShopAccess(ATTENDANCE_ROLES),
  validate(
    z.object({
      userId: z.coerce.number().int().positive(),
      date: validDate,
      status: z.enum(["present", "absent", "half_day", "on_leave"]),
      checkIn: optional(
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
      ),
      checkOut: optional(
        z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
      ),
      workingHours: z.coerce.number().finite().min(0).max(24).optional(),
      notes: optional(z.string().trim().max(255)),
    }),
  ),
  wrap(async (req, res) => {
    const { userId, date, status, checkIn, checkOut, workingHours, notes } =
      req.valid;

    // Verify user belongs to this shop
    const member = await ShopMembership.findOne({
      where: {
        shopId: req.shop.id,
        userId,
        status: "active",
        role: { [Op.ne]: "shop_owner" },
      },
    });
    if (!member)
      throw new AppError(400, "User is not an active employee of this shop");
    if (checkOut && !checkIn)
      throw new AppError(
        422,
        "Check-in time is required when check-out time is provided",
      );
    if (checkIn && checkOut && checkOut <= checkIn)
      throw new AppError(422, "Check-out must be later than check-in");
    if (status === "absent" || status === "on_leave") {
      if (checkIn || checkOut)
        throw new AppError(
          422,
          "Absent and leave records cannot have check-in or check-out times",
        );
    }
    const exists = await AttendanceRecord.findOne({
      where: { shopId: req.shop.id, userId, date },
    });
    if (exists)
      throw new AppError(
        409,
        "Attendance is already recorded for this employee and date. Edit the existing record instead.",
      );
    const hours =
      workingHours ??
      (checkIn && checkOut
        ? (() => {
            const [ih, im] = checkIn.split(":").map(Number);
            const [oh, om] = checkOut.split(":").map(Number);
            return (
              Math.round(((oh * 60 + om - (ih * 60 + im)) / 60) * 100) / 100
            );
          })()
        : status === "half_day"
          ? 4
          : status === "present"
            ? 8
            : 0);
    if (hours < 0 || hours > 24)
      throw new AppError(422, "Working hours must be between 0 and 24");
    let record;
    try {
      record = await AttendanceRecord.create({
        shopId: req.shop.id,
        userId,
        date,
        status,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        workingHours: hours,
        notes: notes || null,
        recordedBy: req.user.id,
      });
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError")
        throw new AppError(
          409,
          "Attendance is already recorded for this employee and date.",
        );
      throw err;
    }
    res.status(201).json({ record });
  }),
);

router.patch(
  "/attendance/:id",
  requireShopAccess(ATTENDANCE_ROLES),
  validate(
    z
      .object({
        date: validDate.optional(),
        status: z
          .enum(["present", "absent", "half_day", "on_leave"])
          .optional(),
        checkIn: z
          .preprocess(
            (v) => (v === "" || v === null ? null : v),
            z
              .string()
              .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
              .nullable(),
          )
          .optional(),
        checkOut: z
          .preprocess(
            (v) => (v === "" || v === null ? null : v),
            z
              .string()
              .regex(/^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/)
              .nullable(),
          )
          .optional(),
        workingHours: z.coerce.number().finite().min(0).max(24).optional(),
        notes: optional(z.string().trim().max(255)),
      })
      .refine((v) => Object.keys(v).length > 0, "Nothing to update"),
  ),
  wrap(async (req, res) => {
    const record = await AttendanceRecord.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
    });
    if (!record) throw new AppError(404, "Attendance record not found");
    const changes = req.valid;
    const date = changes.date || record.date;
    if (date !== record.date) {
      const duplicate = await AttendanceRecord.findOne({
        where: {
          shopId: req.shop.id,
          userId: record.userId,
          date,
          id: { [Op.ne]: record.id },
        },
      });
      if (duplicate)
        throw new AppError(
          409,
          "Attendance already exists for this employee on that date.",
        );
    }
    const status = changes.status ?? record.status;
    const checkIn = Object.prototype.hasOwnProperty.call(changes, "checkIn")
      ? changes.checkIn
      : record.checkIn;
    const checkOut = Object.prototype.hasOwnProperty.call(changes, "checkOut")
      ? changes.checkOut
      : record.checkOut;
    if (checkOut && !checkIn)
      throw new AppError(
        422,
        "Check-in time is required when check-out time is provided",
      );
    if (checkIn && checkOut && checkOut <= checkIn)
      throw new AppError(422, "Check-out must be later than check-in");
    if ((status === "absent" || status === "on_leave") && (checkIn || checkOut))
      throw new AppError(
        422,
        "Absent and leave records cannot have check-in or check-out times",
      );
    await sequelize.transaction(async (t) => {
      await record.update(
        {
          ...changes,
          date,
          checkIn: checkIn || null,
          checkOut: checkOut || null,
          recordedBy: req.user.id,
        },
        { transaction: t },
      );
      await audit(
        {
          actorId: req.user.id,
          action: "attendance.corrected",
          entityType: "attendance",
          entityId: record.id,
          shopId: req.shop.id,
          meta: changes,
          ip: req.ip,
        },
        t,
      );
    });
    res.json({ record });
  }),
);

/* -------------------------- Salary management ---------------------- */
router.get(
  "/salary",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({ userId: z.coerce.number().int().positive().optional() }),
    "query",
  ),
  wrap(async (req, res) => {
    const where = { shopId: req.shop.id };
    if (req.valid.userId) where.userId = req.valid.userId;
    const items = await EmployeeSalary.findAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["id", "name", "email"] },
      ],
      order: [
        ["effectiveDate", "DESC"],
        ["id", "DESC"],
      ],
    });
    res.json({ items });
  }),
);

router.post(
  "/salary",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({
      userId: z.coerce.number().int().positive(),
      salaryType: z.enum(["monthly", "hourly", "daily"]).default("monthly"),
      baseSalary: money,
      allowances: money.default(0),
      deductions: money.default(0),
      effectiveDate: validDate,
      notes: optional(z.string().trim().max(500)),
    }),
  ),
  wrap(async (req, res) => {
    const data = req.valid;
    const member = await ShopMembership.findOne({
      where: {
        shopId: req.shop.id,
        userId: data.userId,
        status: "active",
        role: { [Op.ne]: "shop_owner" },
      },
    });
    if (!member)
      throw new AppError(404, "Active employee not found in this shop");
    const date = new Date(`${data.effectiveDate}T00:00:00.000Z`);
    const salary = await sequelize.transaction(async (t) => {
      const created = await EmployeeSalary.create(
        {
          ...data,
          shopId: req.shop.id,
          createdBy: req.user.id,
          notes: data.notes || null,
        },
        { transaction: t },
      );
      if (date <= new Date()) {
        await EmployeeProfile.update(
          { salaryType: data.salaryType, baseSalary: data.baseSalary },
          {
            where: { shopId: req.shop.id, userId: data.userId },
            transaction: t,
          },
        );
      }
      await audit(
        {
          actorId: req.user.id,
          action: "employee.salary_updated",
          entityType: "employee_salary",
          entityId: created.id,
          shopId: req.shop.id,
          meta: { userId: data.userId, effectiveDate: data.effectiveDate },
          ip: req.ip,
        },
        t,
      );
      return created;
    });
    res.status(201).json({ salary });
  }),
);

/* -------------------------- Payroll drafts -------------------------- */
router.get(
  "/payroll",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({
      payPeriod: z
        .string()
        .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
        .optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const where = { shopId: req.shop.id };
    if (req.valid.payPeriod) where.payPeriod = req.valid.payPeriod;
    const [items, legacyPayments] = await Promise.all([
      PayrollRun.findAll({
        where,
        include: [{ model: PayrollItem, as: "items" }],
        order: [
          ["payPeriod", "DESC"],
          ["id", "DESC"],
        ],
      }),
      SalaryPayment.findAll({
        where: {
          shopId: req.shop.id,
          ...(req.valid.payPeriod ? { payPeriod: req.valid.payPeriod } : {}),
        },
        include: [{ model: User, as: "user", attributes: ["id", "name"] }],
        order: [["paymentDate", "DESC"]],
      }),
    ]);
    res.json({ items, legacyPayments });
  }),
);

router.get(
  "/payroll/:id",
  requireShopAccess(OWNER_ONLY),
  wrap(async (req, res) => {
    const run = await PayrollRun.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
      include: [
        {
          model: PayrollItem,
          as: "items",
          include: [
            { model: User, as: "user", attributes: ["id", "name", "email"] },
          ],
        },
      ],
    });
    if (!run) throw new AppError(404, "Payroll run not found");
    res.json({ run });
  }),
);

router.post(
  "/payroll",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({ payPeriod: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }),
  ),
  wrap(async (req, res) => {
    const { payPeriod } = req.valid;
    const [year, month] = payPeriod.split("-").map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const startDate = `${payPeriod}-01`;
    const endDate = `${payPeriod}-${String(totalDays).padStart(2, "0")}`;
    const members = await ShopMembership.findAll({
      where: {
        shopId: req.shop.id,
        status: "active",
        role: { [Op.ne]: "shop_owner" },
      },
      include: [{ model: User, as: "user", attributes: ["id", "name"] }],
      order: [["id", "ASC"]],
    });
    if (!members.length)
      throw new AppError(
        422,
        "There are no active employees to include in payroll",
      );
    const userIds = members.map((m) => m.userId);
    const [profiles, histories, attendance] = await Promise.all([
      EmployeeProfile.findAll({
        where: { shopId: req.shop.id, userId: userIds },
      }),
      EmployeeSalary.findAll({
        where: {
          shopId: req.shop.id,
          userId: userIds,
          effectiveDate: { [Op.lte]: endDate },
        },
        order: [
          ["effectiveDate", "DESC"],
          ["id", "DESC"],
        ],
      }),
      AttendanceRecord.findAll({
        where: {
          shopId: req.shop.id,
          userId: userIds,
          date: { [Op.between]: [startDate, endDate] },
        },
      }),
    ]);
    const profileMap = new Map(profiles.map((p) => [p.userId, p]));
    const salaryMap = new Map();
    for (const salary of histories)
      if (!salaryMap.has(salary.userId)) salaryMap.set(salary.userId, salary);
    const attendanceMap = new Map();
    for (const row of attendance) {
      const data = attendanceMap.get(row.userId) || {
        absent: 0,
        half: 0,
        present: 0,
        leave: 0,
        hours: 0,
      };
      if (row.status === "absent") data.absent += 1;
      if (row.status === "half_day") data.half += 1;
      if (row.status === "present") data.present += 1;
      if (row.status === "on_leave") data.leave += 1;
      data.hours += Number(row.workingHours || 0);
      attendanceMap.set(row.userId, data);
    }
    const lineData = [];
    for (const member of members) {
      const profile = profileMap.get(member.userId);
      const historical = salaryMap.get(member.userId);
      if (profile?.joinedDate && profile.joinedDate > endDate) continue;
      if (!profile && !historical) continue;
      const salaryType = historical?.salaryType || profile.salaryType;
      const baseCents = cents(historical?.baseSalary ?? profile.baseSalary);
      const allowanceCents = cents(historical?.allowances ?? 0);
      const otherDeductionCents = cents(historical?.deductions ?? 0);
      const a = attendanceMap.get(member.userId) || {
        absent: 0,
        half: 0,
        present: 0,
        leave: 0,
        hours: 0,
      };
      const unpaidDays = a.absent + a.half * 0.5;
      const paidDays =
        salaryType === "monthly"
          ? totalDays - unpaidDays
          : a.present + a.half * 0.5;
      let earnedCents = baseCents;
      let attendanceDeductionCents = 0;
      let basis;
      if (salaryType === "monthly") {
        attendanceDeductionCents = Math.round(
          (baseCents * unpaidDays) / totalDays,
        );
        earnedCents = baseCents - attendanceDeductionCents;
        basis = `Monthly base; absent days (${a.absent}) and half days (${a.half}) deducted pro rata over ${totalDays} calendar days. Leave is paid; unmarked days count as payable.`;
      } else if (salaryType === "daily") {
        earnedCents = Math.round(baseCents * paidDays);
        basis = `Daily rate × ${paidDays} payable days (present + half-day at 0.5; absent and leave unpaid).`;
      } else {
        earnedCents = Math.round(baseCents * a.hours);
        basis = `Hourly rate × ${a.hours.toFixed(2)} recorded hours; absent and leave days are unpaid.`;
      }
      const grossCents = earnedCents + allowanceCents;
      const deductionCents = attendanceDeductionCents + otherDeductionCents;
      if (grossCents < deductionCents)
        throw new AppError(
          422,
          `Deductions exceed gross pay for ${member.user.name}`,
        );
      lineData.push({
        shopId: req.shop.id,
        userId: member.userId,
        employeeName: member.user.name,
        designation: profile?.designation || member.role.replace(/_/g, " "),
        salaryType,
        baseSalary: moneyValue(baseCents),
        allowances: moneyValue(allowanceCents),
        deductions: moneyValue(otherDeductionCents),
        attendanceDeduction: moneyValue(attendanceDeductionCents),
        payableDays: paidDays,
        totalDays,
        totalHours: a.hours.toFixed(2),
        calculationBasis: basis,
        grossAmount: moneyValue(grossCents),
        netAmount: moneyValue(grossCents - deductionCents),
        paymentStatus: "pending",
      });
    }
    if (!lineData.length)
      throw new AppError(
        422,
        "No active employees have salary details effective for this payroll period",
      );
    try {
      const run = await sequelize.transaction(async (t) => {
        const created = await PayrollRun.create(
          {
            shopId: req.shop.id,
            payPeriod,
            status: "draft",
            generatedBy: req.user.id,
          },
          { transaction: t },
        );
        await PayrollItem.bulkCreate(
          lineData.map((item) => ({ ...item, payrollRunId: created.id })),
          { transaction: t },
        );
        const totalGross = lineData.reduce(
          (sum, item) => sum + cents(item.grossAmount),
          0,
        );
        const totalDeductions = lineData.reduce(
          (sum, item) =>
            sum + cents(item.deductions) + cents(item.attendanceDeduction),
          0,
        );
        const totalNet = lineData.reduce(
          (sum, item) => sum + cents(item.netAmount),
          0,
        );
        await created.update(
          {
            totalGross: moneyValue(totalGross),
            totalDeductions: moneyValue(totalDeductions),
            totalNet: moneyValue(totalNet),
          },
          { transaction: t },
        );
        await audit(
          {
            actorId: req.user.id,
            action: "payroll.draft_generated",
            entityType: "payroll_run",
            entityId: created.id,
            shopId: req.shop.id,
            meta: { payPeriod, employeeCount: lineData.length },
            ip: req.ip,
          },
          t,
        );
        return PayrollRun.findByPk(created.id, {
          include: [{ model: PayrollItem, as: "items" }],
          transaction: t,
        });
      });
      res.status(201).json({ run });
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError")
        throw new AppError(
          409,
          "A payroll run already exists for this shop and period",
        );
      throw err;
    }
  }),
);

router.patch(
  "/payroll/:runId/items/:itemId",
  requireShopAccess(OWNER_ONLY),
  validate(
    z
      .object({
        allowances: money.optional(),
        deductions: money.optional(),
        notes: optional(z.string().trim().max(500)),
      })
      .refine((v) => Object.keys(v).length > 0, "Nothing to update"),
  ),
  wrap(async (req, res) => {
    const runId = idParam(req, "runId");
    const run = await PayrollRun.findOne({
      where: { id: runId, shopId: req.shop.id },
    });
    if (!run) throw new AppError(404, "Payroll run not found");
    if (run.status !== "draft")
      throw new AppError(409, "Finalized payroll cannot be changed");
    const item = await PayrollItem.findOne({
      where: {
        id: idParam(req, "itemId"),
        payrollRunId: run.id,
        shopId: req.shop.id,
      },
    });
    if (!item) throw new AppError(404, "Payroll line not found");
    await sequelize.transaction(async (t) => {
      const changes = req.valid;
      const allowances = cents(changes.allowances ?? item.allowances);
      const deductions = cents(changes.deductions ?? item.deductions);
      const earnedBase =
        item.salaryType === "monthly"
          ? cents(item.baseSalary) - cents(item.attendanceDeduction)
          : Math.round(
              cents(item.baseSalary) *
                Number(
                  item.salaryType === "hourly"
                    ? item.totalHours
                    : item.payableDays,
                ),
            );
      const gross = earnedBase + allowances;
      const totalDeductions = cents(item.attendanceDeduction) + deductions;
      if (gross < totalDeductions)
        throw new AppError(422, "Deductions exceed gross pay");
      await item.update(
        {
          ...changes,
          allowances: moneyValue(allowances),
          deductions: moneyValue(deductions),
          grossAmount: moneyValue(gross),
          netAmount: moneyValue(gross - totalDeductions),
        },
        { transaction: t },
      );
      const all = await PayrollItem.findAll({
        where: { payrollRunId: run.id, shopId: req.shop.id },
        transaction: t,
      });
      await run.update(
        {
          totalGross: moneyValue(
            all.reduce((sum, line) => sum + cents(line.grossAmount), 0),
          ),
          totalDeductions: moneyValue(
            all.reduce(
              (sum, line) =>
                sum + cents(line.attendanceDeduction) + cents(line.deductions),
              0,
            ),
          ),
          totalNet: moneyValue(
            all.reduce((sum, line) => sum + cents(line.netAmount), 0),
          ),
        },
        { transaction: t },
      );
      await audit(
        {
          actorId: req.user.id,
          action: "payroll.draft_corrected",
          entityType: "payroll_item",
          entityId: item.id,
          shopId: req.shop.id,
          meta: changes,
          ip: req.ip,
        },
        t,
      );
    });
    res.json({ item });
  }),
);

router.post(
  "/payroll/:id/finalize",
  requireShopAccess(OWNER_ONLY),
  wrap(async (req, res) => {
    const run = await sequelize.transaction(async (t) => {
      const row = await PayrollRun.findOne({
        where: { id: idParam(req, "id"), shopId: req.shop.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!row) throw new AppError(404, "Payroll run not found");
      if (row.status !== "draft")
        throw new AppError(409, "Payroll run has already been finalized");
      await row.update(
        {
          status: "finalized",
          finalizedBy: req.user.id,
          finalizedAt: new Date(),
        },
        { transaction: t },
      );
      await audit(
        {
          actorId: req.user.id,
          action: "payroll.finalized",
          entityType: "payroll_run",
          entityId: row.id,
          shopId: req.shop.id,
          meta: { payPeriod: row.payPeriod },
          ip: req.ip,
        },
        t,
      );
      return row;
    });
    res.json({ run });
  }),
);

router.post(
  "/payroll/:runId/items/:itemId/payment",
  requireShopAccess(OWNER_ONLY),
  validate(
    z.object({
      paymentDate: validDate,
      paymentMethod: z.enum(["bank_transfer", "upi", "cash", "cheque"]),
      notes: optional(z.string().trim().max(500)),
    }),
  ),
  wrap(async (req, res) => {
    const { runId, itemId } = req.params;
    const item = await sequelize.transaction(async (t) => {
      const run = await PayrollRun.findOne({
        where: { id: idParam(req, "runId"), shopId: req.shop.id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!run) throw new AppError(404, "Payroll run not found");
      if (run.status !== "finalized")
        throw new AppError(
          409,
          "Finalize the payroll run before recording payment",
        );
      const row = await PayrollItem.findOne({
        where: {
          id: idParam(req, "itemId"),
          payrollRunId: run.id,
          shopId: req.shop.id,
        },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!row) throw new AppError(404, "Payroll line not found");
      if (row.paymentStatus === "paid")
        throw new AppError(409, "This payroll line has already been paid");
      await row.update(
        {
          paymentStatus: "paid",
          paymentDate: req.valid.paymentDate,
          paymentMethod: req.valid.paymentMethod,
          notes: req.valid.notes || null,
          paidBy: req.user.id,
        },
        { transaction: t },
      );
      await audit(
        {
          actorId: req.user.id,
          action: "payroll.payment_recorded",
          entityType: "payroll_item",
          entityId: row.id,
          shopId: req.shop.id,
          meta: {
            paymentDate: req.valid.paymentDate,
            paymentMethod: req.valid.paymentMethod,
          },
          ip: req.ip,
        },
        t,
      );
      return row;
    });
    res.json({ item });
  }),
);

/* ========================================================================== */
/*                                 CUSTOMERS                                  */
/* ========================================================================== */
router.get(
  "/customers",
  requireShopAccess(ORDER_ROLES),
  wrap(async (req, res) => {
    const rows = await Order.findAll({
      attributes: [
        "customerId",
        [sequelize.fn("COUNT", sequelize.col("Order.id")), "orderCount"],
        [
          sequelize.fn("SUM", sequelize.col("Order.total_amount")),
          "totalSpent",
        ],
      ],
      include: [
        {
          model: User,
          as: "customer",
          attributes: ["id", "name", "email", "phone"],
        },
      ],
      where: { shopId: req.shop.id },
      group: [
        "customerId",
        "customer.id",
        "customer.name",
        "customer.email",
        "customer.phone",
      ],
      raw: true,
      nest: true,
    });

    const items = rows.map((r) => ({
      id: r.customer?.id,
      name: r.customer?.name,
      email: r.customer?.email,
      phone: r.customer?.phone,
      orderCount: Number(r.orderCount),
      totalSpent: Number(r.totalSpent || 0),
    }));

    res.json({ items });
  }),
);

/* ========================================================================== */
/*                                  REPORTS                                   */
/* ========================================================================== */
router.get(
  "/reports",
  requireShopAccess(OWNER_ONLY),
  wrap(async (req, res) => {
    const [
      ordersByStatus,
      revenueResult,
      wholesaleSpendResult,
      topProductsResult,
      inventoryValuationResult,
    ] = await Promise.all([
      Order.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: { shopId: req.shop.id },
        group: ["status"],
        raw: true,
      }),
      Order.findAll({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("total_amount")), "totalRevenue"],
        ],
        where: { shopId: req.shop.id, paymentStatus: "paid" },
        raw: true,
      }),
      WholesalePayment.findAll({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("amount")), "totalWholesaleSpend"],
        ],
        where: { shopId: req.shop.id },
        raw: true,
      }),
      OrderItem.findAll({
        attributes: [
          "productName",
          [
            sequelize.fn("SUM", sequelize.col("OrderItem.quantity")),
            "totalQuantity",
          ],
          [
            sequelize.fn("SUM", sequelize.col("OrderItem.total_price")),
            "totalSales",
          ],
        ],
        include: [
          {
            model: Order,
            as: "order",
            where: { shopId: req.shop.id, paymentStatus: "paid" },
            attributes: [],
          },
        ],
        group: ["productName"],
        order: [
          [sequelize.fn("SUM", sequelize.col("OrderItem.total_price")), "DESC"],
        ],
        limit: 5,
        raw: true,
      }),
      Inventory.findAll({
        where: { shopId: req.shop.id },
        include: [
          { model: ProductVariant, as: "variant", attributes: ["price"] },
        ],
      }),
    ]);

    const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
    const wholesaleSpend = Number(
      wholesaleSpendResult[0]?.totalWholesaleSpend || 0,
    );

    let stockValuation = 0;
    inventoryValuationResult.forEach((inv) => {
      stockValuation += inv.quantity * Number(inv.variant?.price || 0);
    });

    res.json({
      summary: {
        totalRevenue,
        wholesaleSpend,
        netMargin: Number((totalRevenue - wholesaleSpend).toFixed(2)),
        stockValuation: Number(stockValuation.toFixed(2)),
      },
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((s) => [s.status, Number(s.count)]),
      ),
      topProducts: topProductsResult.map((tp) => ({
        name: tp.productName,
        quantity: Number(tp.totalQuantity),
        sales: Number(tp.totalSales),
      })),
    });
  }),
);

/* ========================================================================== */
/*                           SHOP SETTINGS / PROFILE                          */
/* ========================================================================== */
router.get(
  "/settings",
  requireShopAccess(),
  wrap(async (req, res) => {
    const shop = await Shop.findByPk(req.shop.id, {
      include: [{ model: ShopCategory, as: "category" }],
    });
    res.json({ shop });
  }),
);

const patchShopSettingsSchema = z.object({
  contactPhone: optional(phone),
  contactEmail: optional(z.string().trim().toLowerCase().email().max(190)),
  address: z.string().trim().min(5).max(500).optional(),
  city: z.string().trim().min(2).max(100).optional(),
  state: z.string().trim().min(2).max(100).optional(),
  pinCode: z.string().trim().regex(/^\d{6}$/).optional(),
});

router.patch(
  "/settings",
  requireShopAccess(OWNER_ONLY),
  validate(patchShopSettingsSchema),
  wrap(async (req, res) => {
    const shop = await Shop.findByPk(req.shop.id);
    await shop.update(req.valid);
    await audit({
      actorId: req.user.id,
      action: "shop.settings_updated",
      entityType: "shop",
      entityId: shop.id,
      shopId: shop.id,
      meta: req.valid,
      ip: req.ip,
    });
    res.json({ shop });
  }),
);

const shippingSettingsSchema = z.object({
  baseFee: money,
  baseWeightKg: z.coerce.number().positive().max(1000),
  additionalWeightRate: money,
  additionalWeightStepKg: z.coerce.number().positive().max(1000),
  zones: z.array(z.object({
    name: z.string().trim().min(1).max(80),
    pincodes: z.array(z.string().trim().regex(/^(?:\*|\d{6})$/)).min(1).max(1000),
    surcharge: money,
    available: z.boolean().default(true),
    maxWeightKg: z.coerce.number().positive().max(10000).nullable().optional(),
  })).min(1).max(100),
}).superRefine((settings, context) => {
  const seen = new Set();
  let wildcardSeen = false;
  for (const [zoneIndex, zone] of settings.zones.entries()) {
    for (const [codeIndex, code] of zone.pincodes.entries()) {
      if (code === "*" && wildcardSeen) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["zones", zoneIndex, "pincodes", codeIndex],
          message: "Only one fallback wildcard zone is allowed.",
        });
      }
      if (code === "*") wildcardSeen = true;
      if (seen.has(code)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["zones", zoneIndex, "pincodes", codeIndex],
          message: "Each pincode or wildcard can belong to only one zone.",
        });
      }
      seen.add(code);
    }
  }
});

router.get(
  "/settings/shipping",
  requireShopAccess(OWNER_ONLY),
  wrap(async (req, res) => {
    const shop = await Shop.findByPk(req.shop.id, {
      attributes: ["id", "shippingSettings"],
    });
    res.json({
      settings: normalizeShippingSettings(shop.shippingSettings),
      defaults: DEFAULT_SHIPPING_SETTINGS,
    });
  }),
);

router.patch(
  "/settings/shipping",
  requireShopAccess(OWNER_ONLY),
  validate(shippingSettingsSchema),
  wrap(async (req, res) => {
    const settings = {
      ...req.valid,
      baseFee: moneyValue(cents(req.valid.baseFee)),
      additionalWeightRate: moneyValue(cents(req.valid.additionalWeightRate)),
      zones: req.valid.zones.map((zone) => ({
        ...zone,
        surcharge: moneyValue(cents(zone.surcharge)),
        pincodes: [...new Set(zone.pincodes)],
      })),
    };
    const shop = await Shop.findByPk(req.shop.id);
    await shop.update({ shippingSettings: settings });
    await audit({
      actorId: req.user.id,
      action: "shop.shipping_settings_updated",
      entityType: "shop",
      entityId: shop.id,
      shopId: shop.id,
      meta: settings,
      ip: req.ip,
    });
    res.json({ settings });
  }),
);

module.exports = router;
