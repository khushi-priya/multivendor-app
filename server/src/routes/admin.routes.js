const router = require("express").Router();
const bcrypt = require("bcryptjs");
const env = require("../config/env");
const { Op } = require("sequelize");
const {
  sequelize,
  User,
  Shop,
  ShopCategory,
  ShopMembership,
  EmployeeProfile,
  EmployeeSalary,
  AttendanceRecord,
  SalaryPayment,
  PayrollItem,
  Wholesaler,
  WholesalerShopAccess,
  AuditLog,
  CommissionSetting,
  Order,
  OrderItem,
  Payment,
} = require("../models");
const { AppError, wrap, idParam } = require("../utils/errors");
const { validate, optional, phone, password, z } = require("../utils/validate");
const { requireAuth, requireSuperAdmin } = require("../middleware/auth");
const { audit } = require("../utils/audit");
const {
  createShopWithOwner,
  resendOwnerInvite,
  serializeShop,
  shopIncludes,
  makeNameKey,
  mapUniqueError,
} = require("../services/shopService");

router.use(requireAuth, requireSuperAdmin);

const page = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const likeEscape = (s) => s.replace(/[\\%_]/g, "\\$&");

/* ------------------------- shop employees ------------------------- */
router.get(
  "/employees",
  validate(
    z.object({
      shopId: z.coerce.number().int().positive().optional(),
      q: z.string().trim().max(100).optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const { shopId, q } = req.valid;
    if (shopId && !(await Shop.findByPk(shopId, { attributes: ["id"] }))) {
      throw new AppError(404, "Shop not found");
    }
    const membershipWhere = { role: { [Op.ne]: "shop_owner" } };
    if (shopId) membershipWhere.shopId = shopId;
    const userWhere = q
      ? {
          [Op.or]: [
            { name: { [Op.like]: `%${likeEscape(q)}%` } },
            { email: { [Op.like]: `%${likeEscape(q)}%` } },
            { phone: { [Op.like]: `%${likeEscape(q)}%` } },
          ],
        }
      : undefined;
    const memberships = await ShopMembership.findAll({
      where: membershipWhere,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "phone", "status"],
          where: userWhere,
        },
        { model: Shop, as: "shop", attributes: ["id", "name"] },
      ],
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
    });
    const profileShopIds = [...new Set(memberships.map((m) => m.shopId))];
    const profileUserIds = memberships.map((m) => m.userId);
    const profiles = profileUserIds.length
      ? await EmployeeProfile.findAll({
          where: { shopId: profileShopIds, userId: profileUserIds },
          attributes: [
            "userId",
            "shopId",
            "salaryType",
            "baseSalary",
            "joinedDate",
            "designation",
            "employeeCode",
            "address",
          ],
        })
      : [];
    const profilesByMembership = new Map(
      profiles.map((p) => [`${p.shopId}:${p.userId}`, p]),
    );
    res.json({
      items: memberships.map((m) => ({
        id: m.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        userStatus: m.user.status,
        shop: m.shop,
        role: m.role,
        status: m.status,
        profile: profilesByMembership.get(`${m.shopId}:${m.userId}`) || null,
      })),
    });
  }),
);

const adminEmployeeSchema = z.object({
  shopId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(190),
  phone: optional(phone),
  role: z.enum([
    "shop_manager",
    "sales_associate",
    "delivery_associate",
    "cashier",
    "support",
  ]),
  status: z.enum(["active", "inactive"]).default("active"),
  designation: optional(z.string().trim().max(100)),
  employeeCode: optional(z.string().trim().min(1).max(40)),
  address: optional(z.string().trim().max(500)),
  joinedDate: optional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  salaryType: z.enum(["monthly", "hourly", "daily"]).default("monthly"),
  baseSalary: z.coerce.number().finite().min(0).max(99999999.99).default(0),
  password: password.optional(),
});

router.post(
  "/employees",
  validate(adminEmployeeSchema),
  wrap(async (req, res) => {
    const data = req.valid;
    if (!(await Shop.findByPk(data.shopId, { attributes: ["id"] })))
      throw new AppError(404, "Shop not found.");
    if (await User.unscoped().findOne({ where: { email: data.email } }))
      throw new AppError(409, "An account with this email already exists.");
    if (
      data.employeeCode &&
      (await EmployeeProfile.findOne({
        where: { shopId: data.shopId, employeeCode: data.employeeCode },
      }))
    )
      throw new AppError(
        409,
        "This employee code is already in use in this shop.",
      );
    if (!data.password)
      throw new AppError(
        422,
        "A password is required when creating an employee account.",
      );
    const hash = await bcrypt.hash(data.password, env.bcryptRounds);
    const result = await sequelize.transaction(async (t) => {
      const user = await User.create(
        {
          name: data.name,
          email: data.email,
          phone: data.phone || null,
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
          shopId: data.shopId,
          role: data.role,
          status: data.status,
        },
        { transaction: t },
      );
      const profile = await EmployeeProfile.create(
        {
          userId: user.id,
          shopId: data.shopId,
          salaryType: data.salaryType,
          baseSalary: data.baseSalary,
          designation: data.designation || data.role.replace(/_/g, " "),
          employeeCode: data.employeeCode || null,
          address: data.address || null,
          joinedDate: data.joinedDate || new Date(),
        },
        { transaction: t },
      );
      await EmployeeSalary.create(
        {
          shopId: data.shopId,
          userId: user.id,
          salaryType: data.salaryType,
          baseSalary: data.baseSalary,
          allowances: 0,
          deductions: 0,
          effectiveDate:
            data.joinedDate || new Date().toISOString().slice(0, 10),
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
          shopId: data.shopId,
          meta: { role: data.role },
          ip: req.ip,
        },
        t,
      );
      return { user, membership, profile };
    });
    res
      .status(201)
      .json({
        employee: {
          id: result.membership.id,
          userId: result.user.id,
          name: result.user.name,
          email: result.user.email,
          phone: result.user.phone,
          role: result.membership.role,
          status: result.membership.status,
          shop: { id: data.shopId },
          profile: result.profile,
        },
      });
  }),
);

const adminEmployeeUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().email().max(190).optional(),
    phone: optional(phone),
    role: z
      .enum([
        "shop_manager",
        "sales_associate",
        "delivery_associate",
        "cashier",
        "support",
      ])
      .optional(),
    status: z.enum(["active", "inactive"]).optional(),
    designation: optional(z.string().trim().max(100)),
    employeeCode: optional(z.string().trim().min(1).max(40)),
    address: optional(z.string().trim().max(500)),
    joinedDate: optional(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  })
  .refine((value) => Object.keys(value).length > 0, "Nothing to update");

router.patch(
  "/employees/:id",
  validate(adminEmployeeUpdateSchema),
  wrap(async (req, res) => {
    const membership = await ShopMembership.findOne({
      where: { id: idParam(req, "id"), role: { [Op.ne]: "shop_owner" } },
    });
    if (!membership) throw new AppError(404, "Employee not found.");
    const data = req.valid;
    const user = await User.unscoped().findByPk(membership.userId);
    if (
      data.email &&
      data.email !== user.email &&
      (await User.unscoped().findOne({ where: { email: data.email } }))
    )
      throw new AppError(409, "An account with this email already exists.");
    if (
      data.employeeCode &&
      (await EmployeeProfile.findOne({
        where: {
          shopId: membership.shopId,
          employeeCode: data.employeeCode,
          userId: { [Op.ne]: membership.userId },
        },
      }))
    )
      throw new AppError(
        409,
        "This employee code is already in use in this shop.",
      );
    await sequelize.transaction(async (t) => {
      const profile = await EmployeeProfile.findOne({
        where: { shopId: membership.shopId, userId: membership.userId },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const userChanges = {};
      if (data.name !== undefined) userChanges.name = data.name;
      if (data.email !== undefined) userChanges.email = data.email;
      if (data.phone !== undefined) userChanges.phone = data.phone || null;
      if (data.status !== undefined)
        userChanges.status = data.status === "active" ? "active" : "disabled";
      if (Object.keys(userChanges).length)
        await user.update(userChanges, { transaction: t });
      await membership.update(
        {
          ...(data.role !== undefined ? { role: data.role } : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
        },
        { transaction: t },
      );
      if (profile)
        await profile.update(
          {
            ...(data.designation !== undefined
              ? { designation: data.designation || null }
              : {}),
            ...(data.employeeCode !== undefined
              ? { employeeCode: data.employeeCode || null }
              : {}),
            ...(data.address !== undefined
              ? { address: data.address || null }
              : {}),
            ...(data.joinedDate !== undefined
              ? { joinedDate: data.joinedDate }
              : {}),
          },
          { transaction: t },
        );
      await audit(
        {
          actorId: req.user.id,
          action: "employee.updated",
          entityType: "user",
          entityId: user.id,
          shopId: membership.shopId,
          meta: { fields: Object.keys(data) },
          ip: req.ip,
        },
        t,
      );
    });
    res.json({ message: "Employee updated." });
  }),
);

router.delete(
  "/employees/:id",
  wrap(async (req, res) => {
    const membership = await ShopMembership.findOne({
      where: { id: idParam(req, "id"), role: { [Op.ne]: "shop_owner" } },
    });
    if (!membership) throw new AppError(404, "Employee not found.");
    const [attendance, salaryHistory, salaryPayments, payrollLines] =
      await Promise.all([
        AttendanceRecord.count({
          where: { shopId: membership.shopId, userId: membership.userId },
        }),
        EmployeeSalary.count({
          where: { shopId: membership.shopId, userId: membership.userId },
        }),
        SalaryPayment.count({
          where: { shopId: membership.shopId, userId: membership.userId },
        }),
        PayrollItem.count({
          where: { shopId: membership.shopId, userId: membership.userId },
        }),
      ]);
    if (attendance + salaryHistory + salaryPayments + payrollLines)
      throw new AppError(
        409,
        "This employee has attendance or payroll history. Deactivate the employee to preserve records.",
      );
    await sequelize.transaction(async (t) => {
      await EmployeeProfile.destroy({
        where: { shopId: membership.shopId, userId: membership.userId },
        transaction: t,
      });
      await membership.destroy({ transaction: t });
      const otherMembership = await ShopMembership.count({
        where: { userId: membership.userId },
        transaction: t,
      });
      if (!otherMembership)
        await User.destroy({
          where: { id: membership.userId },
          transaction: t,
        });
      await audit(
        {
          actorId: req.user.id,
          action: "employee.deleted",
          entityType: "user",
          entityId: membership.userId,
          shopId: membership.shopId,
          ip: req.ip,
        },
        t,
      );
    });
    res.status(204).end();
  }),
);

/* ------------------------------ stats ------------------------------ */
router.get(
  "/stats",
  wrap(async (req, res) => {
    const metricErrors = [];
    const runMetric = async (name, query) => {
      try {
        return await query();
      } catch (error) {
        metricErrors.push(name);
        console.error(
          `[dashboard] admin metric=${name} failed: ${error.name}: ${error.message}`,
        );
        return null;
      }
    };
    const [shops, activeShops, suspendedShops, wholesalers, pendingOwners] =
      await Promise.all([
        runMetric("shops", () => Shop.count()),
        runMetric("activeShops", () =>
          Shop.count({ where: { status: "active" } }),
        ),
        runMetric("suspendedShops", () =>
          Shop.count({ where: { status: "suspended" } }),
        ),
        runMetric("wholesalers", () =>
          Wholesaler.count({ where: { status: "active" } }),
        ),
        runMetric("pendingOwners", () =>
          User.count({ where: { role: "shop_user", status: "invited" } }),
        ),
      ]);
    res.json({
      shops,
      activeShops,
      suspendedShops,
      wholesalers,
      pendingOwners,
      partialErrors: metricErrors,
    });
  }),
);

/* ------------------------------ shops ------------------------------ */
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PIN_REGEX = /^[1-9][0-9]{5}$/;
const optionalGst = optional(
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      GST_REGEX,
      "Enter a valid 15-character GST number (e.g. 29ABCDE1234F1Z5)",
    )
    .max(20),
);
const optionalPin = optional(
  z.string().trim().regex(PIN_REGEX, "Enter a valid 6-digit PIN code").max(10),
);

const createShopSchema = z.object({
  shop: z.object({
    name: z.string().trim().min(2, "Shop name is required").max(150),
    categoryId: z.coerce
      .number({ invalid_type_error: "Select a category" })
      .int()
      .positive("Select a category"),
    address: z.string().trim().min(5, "Enter the shop address").max(500),
    gstNumber: optionalGst,
    city: optional(z.string().trim().max(100)),
    district: optional(z.string().trim().max(100)),
    state: optional(z.string().trim().max(100)),
    pinCode: optionalPin,
    contactPhone: optional(phone),
    contactEmail: optional(
      z.string().trim().toLowerCase().email("Enter a valid email").max(190),
    ),
    status: z.enum(["active", "suspended"]).default("active"),
  }),
  owner: z
    .object({
      // `name` remains accepted for older API clients; the current UI sends
      // separate first/last names and these are what we persist.
      name: optional(z.string().trim().min(2).max(120)),
      firstName: optional(
        z.string().trim().min(1, "Owner's first name is required").max(80),
      ),
      lastName: optional(
        z.string().trim().min(1, "Owner's last name is required").max(80),
      ),
      email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Enter a valid email")
        .max(190),
      phone,
      initialPassword: optional(password),
    })
    .superRefine((owner, ctx) => {
      if ((!owner.firstName || !owner.lastName) && !owner.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["firstName"],
          message: "Owner's first and last name are required",
        });
      }
    })
    .transform((owner) => {
      if (owner.firstName && owner.lastName) return owner;
      const [firstName, ...rest] = (owner.name || "").split(/\s+/);
      return {
        ...owner,
        firstName: firstName || "",
        lastName: rest.join(" ") || firstName || "",
      };
    }),
});

router.post(
  "/shops",
  validate(createShopSchema),
  wrap(async (req, res) => {
    const result = await createShopWithOwner(req.valid, req.user, req.ip);
    res.status(201).json(result);
  }),
);

const listShopsSchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(["active", "suspended"]).optional(),
  ...page,
});

router.get(
  "/shops",
  validate(listShopsSchema, "query"),
  wrap(async (req, res) => {
    const { q, status, page: p, pageSize } = req.valid;
    const where = {};
    if (q) where.name = { [Op.like]: `%${likeEscape(q)}%` };
    if (status) where.status = status;
    const { rows, count } = await Shop.findAndCountAll({
      where,
      include: shopIncludes(),
      order: [
        ["createdAt", "DESC"],
        ["id", "DESC"],
      ],
      limit: pageSize,
      offset: (p - 1) * pageSize,
      distinct: true,
    });
    res.json({
      items: rows.map(serializeShop),
      total: count,
      page: p,
      pageSize,
    });
  }),
);

router.get(
  "/shops/:shopId",
  wrap(async (req, res) => {
    const shop = await Shop.findByPk(idParam(req, "shopId"), {
      include: shopIncludes(),
    });
    if (!shop) throw new AppError(404, "Shop not found");
    res.json({ shop: serializeShop(shop) });
  }),
);

const patchShopSchema = z
  .object({
    name: z.string().trim().min(2).max(150),
    categoryId: z.coerce.number().int().positive(),
    address: z.string().trim().min(5).max(500),
    gstNumber: optionalGst,
    city: optional(z.string().trim().max(100)),
    district: optional(z.string().trim().max(100)),
    state: optional(z.string().trim().max(100)),
    pinCode: optionalPin,
    contactPhone: optional(phone),
    contactEmail: optional(z.string().trim().toLowerCase().email().max(190)),
    status: z.enum(["active", "suspended"]),
    ownerFirstName: z.string().trim().min(1).max(80).optional(),
    ownerLastName: z.string().trim().min(1).max(80).optional(),
    ownerPhone: optional(phone),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, "Nothing to update");

router.patch(
  "/shops/:shopId",
  validate(patchShopSchema),
  wrap(async (req, res) => {
    const shopId = idParam(req, "shopId");
    const { ownerFirstName, ownerLastName, ownerPhone, ...shopChanges } =
      req.valid;
    if (
      shopChanges.categoryId &&
      !(await ShopCategory.findByPk(shopChanges.categoryId))
    ) {
      throw new AppError(422, "Validation failed", {
        categoryId: ["Select a valid shop category"],
      });
    }
    if (shopChanges.name) shopChanges.nameKey = makeNameKey(shopChanges.name);

    try {
      await sequelize.transaction(async (t) => {
        const shop = await Shop.findByPk(shopId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (!shop) throw new AppError(404, "Shop not found");
        const before = {};
        for (const k of Object.keys(shopChanges)) before[k] = shop[k];
        await shop.update(shopChanges, { transaction: t });

        // Update owner name/phone if provided (find the shop_owner membership)
        if (ownerFirstName || ownerLastName || ownerPhone) {
          const ownerMembership = await ShopMembership.findOne({
            where: { shopId, role: "shop_owner", status: "active" },
            transaction: t,
          });
          if (ownerMembership) {
            const owner = await User.unscoped().findByPk(
              ownerMembership.userId,
              { transaction: t },
            );
            if (owner) {
              const nameUpdate = {};
              if (ownerFirstName !== undefined)
                nameUpdate.firstName = ownerFirstName;
              if (ownerLastName !== undefined)
                nameUpdate.lastName = ownerLastName;
              if (ownerFirstName || ownerLastName) {
                nameUpdate.name =
                  `${ownerFirstName || owner.firstName || ""} ${ownerLastName || owner.lastName || ""}`.trim();
              }
              if (ownerPhone !== undefined)
                nameUpdate.phone = ownerPhone || null;
              await owner.update(nameUpdate, { transaction: t });
            }
          }
        }

        const isStatusChange =
          shopChanges.status && shopChanges.status !== before.status;
        await audit(
          {
            actorId: req.user.id,
            action: isStatusChange
              ? shopChanges.status === "suspended"
                ? "shop.suspended"
                : "shop.activated"
              : "shop.updated",
            entityType: "shop",
            entityId: shopId,
            shopId,
            meta: { before, after: req.valid },
            ip: req.ip,
          },
          t,
        );
      });
    } catch (err) {
      throw mapUniqueError(err);
    }
    const shop = await Shop.findByPk(shopId, { include: shopIncludes() });
    res.json({ shop: serializeShop(shop) });
  }),
);

router.post(
  "/shops/:shopId/resend-invite",
  wrap(async (req, res) => {
    res.json(await resendOwnerInvite(idParam(req, "shopId"), req.user, req.ip));
  }),
);

router.delete(
  "/shops/:shopId",
  wrap(async (req, res) => {
    const shopId = idParam(req, "shopId");
    const shop = await Shop.findByPk(shopId, { include: shopIncludes() });
    if (!shop) throw new AppError(404, "Shop not found");

    // Delete only a genuinely unused shop. Historical or financial records are
    // retained by deactivating/suspending their shop instead.
    const {
      SellerListing,
      PurchaseOrder,
      Inventory,
      EmployeeProfile,
      AttendanceRecord,
      EmployeeSalary,
      PayrollRun,
      WholesalePayment,
      WholesalerShopAccess,
    } = require("../models");
    const [
      orderCount,
      listingCount,
      purchaseCount,
      inventoryCount,
      employeeCount,
      membershipEmployeeCount,
      attendanceCount,
      salaryCount,
      payrollCount,
      paymentCount,
      accessCount,
    ] = await Promise.all([
      Order.count({ where: { shopId } }),
      SellerListing.count({ where: { shopId } }),
      PurchaseOrder.count({ where: { shopId } }),
      Inventory.count({ where: { shopId } }),
      EmployeeProfile.count({ where: { shopId } }),
      AttendanceRecord.count({ where: { shopId } }),
      ShopMembership.count({
        where: { shopId, role: { [Op.ne]: "shop_owner" } },
      }),
      EmployeeSalary.count({ where: { shopId } }),
      PayrollRun.count({ where: { shopId } }),
      WholesalePayment.count({ where: { shopId } }),
      WholesalerShopAccess.count({ where: { shopId } }),
    ]);
    const dependentCount =
      orderCount +
      listingCount +
      purchaseCount +
      inventoryCount +
      employeeCount +
      membershipEmployeeCount +
      attendanceCount +
      salaryCount +
      payrollCount +
      paymentCount +
      accessCount;
    if (dependentCount > 0)
      throw new AppError(
        409,
        "This shop has dependent operational or financial records. Suspend it to preserve history.",
      );

    await sequelize.transaction(async (t) => {
      // Remove memberships
      await ShopMembership.destroy({ where: { shopId }, transaction: t });
      await shop.destroy({ transaction: t });
      await audit(
        {
          actorId: req.user.id,
          action: "shop.deleted",
          entityType: "shop",
          entityId: shopId,
          meta: { name: shop.name },
          ip: req.ip,
        },
        t,
      );
    });
    res.status(204).end();
  }),
);

/* ------------------------- shop categories ------------------------- */
const categorySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
});

router.get(
  "/shop-categories",
  wrap(async (req, res) => {
    const items = await ShopCategory.findAll({ order: [["name", "ASC"]] });
    res.json({ items });
  }),
);

router.post(
  "/shop-categories",
  validate(categorySchema),
  wrap(async (req, res) => {
    try {
      const item = await ShopCategory.create({ name: req.valid.name });
      await audit({
        actorId: req.user.id,
        action: "shop_category.created",
        entityType: "shop_category",
        entityId: item.id,
        meta: { name: item.name },
        ip: req.ip,
      });
      res.status(201).json({ item });
    } catch (err) {
      throw mapUniqueError(err);
    }
  }),
);

router.patch(
  "/shop-categories/:id",
  validate(categorySchema),
  wrap(async (req, res) => {
    const item = await ShopCategory.findByPk(idParam(req, "id"));
    if (!item) throw new AppError(404, "Category not found");
    try {
      await item.update({ name: req.valid.name });
    } catch (err) {
      throw mapUniqueError(err);
    }
    await audit({
      actorId: req.user.id,
      action: "shop_category.updated",
      entityType: "shop_category",
      entityId: item.id,
      meta: { name: item.name },
      ip: req.ip,
    });
    res.json({ item });
  }),
);

router.delete(
  "/shop-categories/:id",
  wrap(async (req, res) => {
    const item = await ShopCategory.findByPk(idParam(req, "id"));
    if (!item) throw new AppError(404, "Category not found");
    const shopCount = await Shop.count({ where: { categoryId: item.id } });
    if (shopCount > 0)
      throw new AppError(
        409,
        `Cannot delete: ${shopCount} shop(s) use this category. Rename it instead.`,
      );
    await item.destroy();
    await audit({
      actorId: req.user.id,
      action: "shop_category.deleted",
      entityType: "shop_category",
      entityId: item.id,
      meta: { name: item.name },
      ip: req.ip,
    });
    res.status(204).end();
  }),
);

/* ---------------------------- wholesalers --------------------------- */
// const wholesalerSchema = z.object({
//   name: z.string().trim().min(2, "Name is required").max(150),
//   contactPerson: optional(z.string().trim().min(2).max(120)),
//   contactEmail: optional(
//     z.string().trim().toLowerCase().email("Enter a valid email").max(190),
//   ),
//   contactPhone: optional(phone),
//   address: optional(z.string().trim().max(500)),
//   gstNumber: optionalGst,
//   status: z.enum(["active", "inactive"]).default("active"),
// });
const wholesalerSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(150),
  contactPerson: optional(z.string().trim().min(2).max(120)),
  contactEmail: optional(
    z.string().trim().toLowerCase().email("Enter a valid email").max(190),
  ),
  contactPhone: optional(phone),
  address: optional(z.string().trim().max(500)),
  gstNumber: optionalGst,
  status: z.enum(["active", "inactive"]).default("active"),
  shopId: z.coerce.number().int().positive().optional(),
});

router.get(
  "/wholesalers",
  wrap(async (req, res) => {
    const items = await Wholesaler.findAll({ order: [["name", "ASC"]] });
    const counts = await WholesalerShopAccess.findAll({
      attributes: [
        "wholesalerId",
        [sequelize.fn("COUNT", sequelize.col("id")), "shopCount"],
      ],
      group: ["wholesalerId"],
      raw: true,
    });
    const byId = Object.fromEntries(
      counts.map((c) => [c.wholesalerId, Number(c.shopCount)]),
    );
    res.json({
      items: items.map((w) => ({ ...w.toJSON(), shopCount: byId[w.id] || 0 })),
    });
  }),
);

router.post(
  "/wholesalers",
  validate(wholesalerSchema),
  wrap(async (req, res) => {
    const { shopId, ...wholesalerData } = req.valid;

    if (!shopId) {
      throw new AppError(422, "Please select a shop.", {
        shopId: ["Shop is required"],
      });
    }

    try {
      const result = await sequelize.transaction(async (t) => {
        const shop = await Shop.findByPk(shopId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (!shop) {
          throw new AppError(404, "Selected shop not found.");
        }

        const item = await Wholesaler.create(wholesalerData, {
          transaction: t,
        });

        await WholesalerShopAccess.create(
          {
            shopId: shop.id,
            wholesalerId: item.id,
            grantedBy: req.user.id,
          },
          { transaction: t },
        );

        await audit(
          {
            actorId: req.user.id,
            action: "wholesaler.created",
            entityType: "wholesaler",
            entityId: item.id,
            meta: {
              name: item.name,
              shopId: shop.id,
              shopName: shop.name,
            },
            ip: req.ip,
          },
          t,
        );

        return item;
      });

      res.status(201).json({ item: result });
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        throw new AppError(
          409,
          "A wholesaler with this name already exists.",
          { name: ["Already exists"] },
        );
      }

      throw err;
    }
  }),
);



router.patch(
  "/wholesalers/:id",
  validate(wholesalerSchema.partial()),
  wrap(async (req, res) => {
    const item = await Wholesaler.findByPk(idParam(req, "id"));
    if (!item) throw new AppError(404, "Wholesaler not found");
    try {
      await item.update(req.valid);
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError")
        throw new AppError(409, "A wholesaler with this name already exists.", {
          name: ["Already exists"],
        });
      throw err;
    }
    await audit({
      actorId: req.user.id,
      action: "wholesaler.updated",
      entityType: "wholesaler",
      entityId: item.id,
      meta: req.valid,
      ip: req.ip,
    });
    res.json({ item });
  }),
);

/* ------------------- shop <-> wholesaler access -------------------- */
router.get(
  "/shops/:shopId/wholesalers",
  wrap(async (req, res) => {
    const shopId = idParam(req, "shopId");
    const shop = await Shop.findByPk(shopId, { attributes: ["id", "name"] });
    if (!shop) throw new AppError(404, "Shop not found");
    const [all, grants] = await Promise.all([
      Wholesaler.findAll({ order: [["name", "ASC"]] }),
      WholesalerShopAccess.findAll({ where: { shopId } }),
    ]);
    const granted = new Set(grants.map((g) => g.wholesalerId));
    res.json({
      shop: { id: shop.id, name: shop.name },
      items: all.map((w) => ({
        id: w.id,
        name: w.name,
        status: w.status,
        authorized: granted.has(w.id),
      })),
    });
  }),
);

const accessSchema = z.object({
  wholesalerIds: z.array(z.number().int().positive()).max(500),
});

router.put(
  "/shops/:shopId/wholesalers",
  validate(accessSchema),
  wrap(async (req, res) => {
    const shopId = idParam(req, "shopId");
    const wanted = [...new Set(req.valid.wholesalerIds)];

    const result = await sequelize.transaction(async (t) => {
      const shop = await Shop.findByPk(shopId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!shop) throw new AppError(404, "Shop not found");
      if (wanted.length) {
        const found = await Wholesaler.count({
          where: { id: wanted },
          transaction: t,
        });
        if (found !== wanted.length)
          throw new AppError(422, "One or more wholesalers do not exist");
      }
      const current = (
        await WholesalerShopAccess.findAll({
          where: { shopId },
          transaction: t,
        })
      ).map((g) => g.wholesalerId);
      const toAdd = wanted.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !wanted.includes(id));
      if (toRemove.length)
        await WholesalerShopAccess.destroy({
          where: { shopId, wholesalerId: toRemove },
          transaction: t,
        });
      if (toAdd.length) {
        await WholesalerShopAccess.bulkCreate(
          toAdd.map((wholesalerId) => ({
            shopId,
            wholesalerId,
            grantedBy: req.user.id,
          })),
          { transaction: t },
        );
      }
      if (toAdd.length || toRemove.length) {
        await audit(
          {
            actorId: req.user.id,
            action: "shop_wholesaler_access.updated",
            entityType: "shop",
            entityId: shopId,
            shopId,
            meta: { added: toAdd, removed: toRemove },
            ip: req.ip,
          },
          t,
        );
      }
      return { added: toAdd.length, removed: toRemove.length };
    });
    res.json(result);
  }),
);

/* ---------------------------- audit logs --------------------------- */
// router.get(
//   "/audit-logs",
//   validate(
//     z.object({ ...page, action: z.string().trim().max(80).optional() }),
//     "query",
//   ),
//   wrap(async (req, res) => {
//     const { page: p, pageSize, action } = req.valid;
//     const where = action
//       ? { action: { [Op.like]: `${likeEscape(action)}%` } }
//       : {};
//     const { rows, count } = await AuditLog.findAndCountAll({
//       where,
//       include: [
//         { model: User, as: "actor", attributes: ["id", "name", "email"] },
//       ],
//       order: [["id", "DESC"]],
//       limit: pageSize,
//       offset: (p - 1) * pageSize,
//     });
//     res.json({
//       items: rows.map((r) => ({
//         id: r.id,
//         action: r.action,
//         entityType: r.entityType,
//         entityId: r.entityId,
//         shopId: r.shopId,
//         meta: r.meta,
//         actor: r.actor
//           ? { id: r.actor.id, name: r.actor.name, email: r.actor.email }
//           : null,
//         createdAt: r.createdAt,
//       })),
//       total: count,
//       page: p,
//       pageSize,
//     });
//   }),
// );


router.get(
  "/audit-logs",
  validate(
    z.object({
      ...page,
      action: z.string().trim().max(80).optional(),
      from: z.string().optional(),
      to: z.string().optional(),
    }).refine(
      (v) => {
        if (v.from && Number.isNaN(Date.parse(v.from))) return false;
        if (v.to && Number.isNaN(Date.parse(v.to))) return false;
        if (v.from && v.to && new Date(v.from) >= new Date(v.to)) {
          return false;
        }
        return true;
      },
      {
        message: "Invalid audit log date range",
      }
    ),
    "query",
  ),
  wrap(async (req, res) => {
    const { page: p, pageSize, action, from, to } = req.valid;

    const where = {};

    if (action) {
      where.action = {
        [Op.like]: `${likeEscape(action)}%`,
      };
    }

    // Date filtering uses the browser's local calendar boundaries,
    // converted to ISO timestamps by the frontend.
    if (from || to) {
      where.createdAt = {};

      if (from) {
        where.createdAt[Op.gte] = new Date(from);
      }

      if (to) {
        where.createdAt[Op.lt] = new Date(to);
      }
    }

    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: "actor",
          attributes: ["id", "name", "email"],
        },
      ],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset: (p - 1) * pageSize,
      distinct: true,
    });

    res.json({
      items: rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        shopId: r.shopId,
        meta: r.meta,
        actor: r.actor
          ? {
              id: r.actor.id,
              name: r.actor.name,
              email: r.actor.email,
            }
          : null,
        createdAt: r.createdAt,
      })),
      total: count,
      page: p,
      pageSize,
    });
  }),
);


/* ------------------------ commission settings ----------------------- */
router.get(
  "/commission",
  wrap(async (req, res) => {
    let setting = await CommissionSetting.findOne({ order: [["id", "DESC"]] });
    if (!setting) {
      setting = await CommissionSetting.create({
        percentage: 5.0,
        minOrderAmount: 0.0,
        notes: "Default platform commission",
        updatedBy: req.user.id,
      });
    }
    res.json({ setting });
  }),
);

const commissionSchema = z.object({
  percentage: z.coerce.number().min(0).max(100),
  minOrderAmount: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(255).optional(),
});

router.put(
  "/commission",
  validate(commissionSchema),
  wrap(async (req, res) => {
    const { percentage, minOrderAmount, notes } = req.valid;
    let setting = await CommissionSetting.findOne({ order: [["id", "DESC"]] });
    if (!setting) {
      setting = await CommissionSetting.create({
        percentage,
        minOrderAmount,
        notes,
        updatedBy: req.user.id,
      });
    } else {
      await setting.update({
        percentage,
        minOrderAmount,
        notes,
        updatedBy: req.user.id,
      });
    }
    await audit({
      actorId: req.user.id,
      action: "commission.updated",
      entityType: "commission_setting",
      entityId: setting.id,
      meta: req.valid,
      ip: req.ip,
    });
    res.json({ setting });
  }),
);

/* ----------------------- platform orders & activity ----------------- */
// router.get(
//   "/orders",
//   validate(
//     z.object({
//       ...page,
//       status: z.string().optional(),
//       paymentStatus: z.string().optional(),
//       shopId: z.coerce.number().int().positive().optional(),
//       q: z.string().trim().max(100).optional(),
//     }),
//     "query",
//   ),
//   wrap(async (req, res) => {
//     const { page: p, pageSize, status, paymentStatus, shopId, q } = req.valid;
//     const where = {};
//     if (status) where.status = status;
//     if (paymentStatus) where.paymentStatus = paymentStatus;
//     if (shopId) where.shopId = shopId;
//     if (q) where.orderNumber = { [Op.like]: `%${likeEscape(q)}%` };

//     const { rows, count } = await Order.findAndCountAll({
//       where,
//       include: [
//         { model: Shop, as: "shop", attributes: ["id", "name"] },
//         {
//           model: User,
//           as: "customer",
//           attributes: ["id", "name", "email", "phone"],
//         },
//         { model: OrderItem, as: "items" },
//       ],
//       order: [["createdAt", "DESC"]],
//       limit: pageSize,
//       offset: (p - 1) * pageSize,
//       distinct: true,
//     });

//     res.json({ items: rows, total: count, page: p, pageSize });
//   }),
// );

/* ----------------------- platform orders & activity ----------------- */
router.get(
  "/orders",
  validate(
    z.object({
      ...page,
      status: z.string().optional(),
      paymentStatus: z.string().optional(),
      shopId: z.coerce.number().int().positive().optional(),
      q: z.string().trim().max(100).optional(),
    }),
    "query",
  ),
  wrap(async (req, res) => {
    const {
      page: p,
      pageSize,
      status,
      paymentStatus,
      shopId,
      q,
    } = req.valid;

    const where = {};

    // Existing filters
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (shopId) where.shopId = shopId;

    // Search by order number OR shop name
    if (q) {
      const searchTerm = `%${likeEscape(q)}%`;

      // Find shops whose names match the search text
      const matchingShops = await Shop.findAll({
        attributes: ["id"],
        where: {
          name: {
            [Op.like]: searchTerm,
          },
        },
        raw: true,
      });

      const matchingShopIds = matchingShops.map((shop) => shop.id);

      // Match either the order number or one of the matching shops
      const searchConditions = [
        {
          orderNumber: {
            [Op.like]: searchTerm,
          },
        },
      ];

      if (matchingShopIds.length > 0) {
        searchConditions.push({
          shopId: {
            [Op.in]: matchingShopIds,
          },
        });
      }

      where[Op.or] = searchConditions;
    }

    const { rows, count } = await Order.findAndCountAll({
      where,
      include: [
        {
          model: Shop,
          as: "shop",
          attributes: ["id", "name"],
        },
        {
          model: User,
          as: "customer",
          attributes: ["id", "name", "email", "phone"],
        },
        {
          model: OrderItem,
          as: "items",
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (p - 1) * pageSize,
      distinct: true,
    });

    res.json({
      items: rows,
      total: count,
      page: p,
      pageSize,
    });
  }),
);

/* --------------------------- platform reports ----------------------- */
router.get(
  "/reports",
  wrap(async (req, res) => {
    const [
      totalOrders,
      revenueResult,
      commissionResult,
      ordersByStatus,
      topShopsResult,
    ] = await Promise.all([
      Order.count(),
      Order.findAll({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("total_amount")), "totalRevenue"],
        ],
        where: { paymentStatus: "paid" },
        raw: true,
      }),
      Order.findAll({
        attributes: [
          [
            sequelize.fn("SUM", sequelize.col("commission_amount")),
            "totalCommission",
          ],
        ],
        where: { paymentStatus: "paid" },
        raw: true,
      }),
      Order.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        group: ["status"],
        raw: true,
      }),
      Order.findAll({
        attributes: [
          "shopId",
          [sequelize.fn("COUNT", sequelize.col("Order.id")), "orderCount"],
          [
            sequelize.fn("SUM", sequelize.col("Order.total_amount")),
            "totalSales",
          ],
        ],
        include: [{ model: Shop, as: "shop", attributes: ["id", "name"] }],
        where: { paymentStatus: "paid" },
        group: ["shopId", "shop.id", "shop.name"],
        order: [
          [sequelize.fn("SUM", sequelize.col("Order.total_amount")), "DESC"],
        ],
        limit: 5,
        raw: true,
        nest: true,
      }),
    ]);

    const totalRevenue = Number(revenueResult[0]?.totalRevenue || 0);
    const totalCommission = Number(commissionResult[0]?.totalCommission || 0);

    res.json({
      summary: {
        totalOrders,
        totalRevenue,
        totalCommission,
      },
      ordersByStatus: Object.fromEntries(
        ordersByStatus.map((s) => [s.status, Number(s.count)]),
      ),
      topShops: topShopsResult.map((ts) => ({
        shopId: ts.shopId,
        shopName: ts.shop?.name || `Shop #${ts.shopId}`,
        orderCount: Number(ts.orderCount),
        totalSales: Number(ts.totalSales || 0),
      })),
    });
  }),
);

module.exports = router;
