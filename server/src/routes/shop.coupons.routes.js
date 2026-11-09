"use strict";

const router = require("express").Router();
const { Op } = require("sequelize");
const { sequelize, Coupon, CouponRedemption } = require("../models");
const { AppError, wrap, idParam } = require("../utils/errors");
const { validate, z } = require("../utils/validate");
const { requireShopAccess } = require("../middleware/auth");
const { audit } = require("../utils/audit");
const { normalizeCouponCode } = require("../services/couponService");

router.use(requireShopAccess(["shop_owner"]));

const codeSchema = z
  .string()
  .transform(normalizeCouponCode)
  .pipe(
    z
      .string()
      .min(3)
      .max(40)
      .regex(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/, "Use letters, numbers, and single hyphens only."),
  );
const amountSchema = z
  .string()
  .regex(/^\d{1,8}(?:\.\d{1,2})?$/, "Enter an amount with at most two decimal places.")
  .refine((value) => Number(value) >= 0, "Amount cannot be negative.");
const positiveAmountSchema = amountSchema.refine(
  (value) => Number(value) > 0,
  "Enter an amount greater than zero.",
);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a valid calendar date.");

const couponFieldsSchema = z.object({
  code: codeSchema,
  discountType: z.enum(["percentage", "flat"]),
  discountValue: positiveAmountSchema,
  maxDiscountAmount: positiveAmountSchema.nullable().optional(),
  minimumOrderAmount: amountSchema.default("0.00"),
  totalUsageLimit: z.union([z.number().int().positive(), z.null()]),
  perCustomerUsageLimit: z.number().int().positive(),
  startDate: dateSchema,
  expiryDate: dateSchema,
  status: z.enum(["active", "inactive"]).default("active"),
});
const couponSchema = couponFieldsSchema.superRefine((value, context) => {
  if (value.expiryDate < value.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["expiryDate"],
      message: "Expiry date cannot be earlier than the start date.",
    });
  }
  if (value.discountType === "percentage" && Number(value.discountValue) > 100) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "Percentage discount must be at most 100.",
    });
  }
  if (value.discountType === "flat" && value.maxDiscountAmount != null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["maxDiscountAmount"],
      message: "Maximum discount is only available for percentage coupons.",
    });
  }
});
const couponPatchSchema = couponFieldsSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "Provide at least one coupon field to update.",
  );

const listSchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(["all", "active", "inactive", "expired"]).default("all"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

function displayStatus(coupon, today) {
  if (coupon.status === "inactive") return "inactive";
  if (coupon.expiryDate < today) return "expired";
  return "active";
}

function serializeCoupon(coupon, today) {
  const item = coupon.toJSON ? coupon.toJSON() : coupon;
  return {
    ...item,
    displayStatus: displayStatus(item, today),
    remainingRedemptions:
      item.totalUsageLimit == null
        ? null
        : Math.max(Number(item.totalUsageLimit) - Number(item.usedCount), 0),
  };
}

router.get(
  "/",
  wrap(async (req, res) => {
    const { q, status, page, pageSize } = listSchema.parse(req.query);
    const shopId = req.shop.id;
    const today = new Date().toISOString().slice(0, 10);
    const where = { shopId };
    if (q) where.code = { [Op.like]: `%${normalizeCouponCode(q)}%` };
    if (status === "inactive") where.status = "inactive";
    if (status === "expired") {
      where.status = "active";
      where.expiryDate = { [Op.lt]: today };
    }
    if (status === "active") {
      where.status = "active";
      where.expiryDate = { [Op.gte]: today };
    }

    const [result, total, active, expired, totalRedemptions] = await Promise.all([
      Coupon.findAndCountAll({
        where,
        order: [["createdAt", "DESC"]],
        limit: pageSize,
        offset: (page - 1) * pageSize,
      }),
      Coupon.count({ where: { shopId } }),
      Coupon.count({
        where: {
          shopId,
          status: "active",
          startDate: { [Op.lte]: today },
          expiryDate: { [Op.gte]: today },
        },
      }),
      Coupon.count({
        where: { shopId, expiryDate: { [Op.lt]: today } },
      }),
      Coupon.sum("usedCount", { where: { shopId } }),
    ]);

    res.json({
      items: result.rows.map((coupon) => serializeCoupon(coupon, today)),
      pagination: {
        page,
        pageSize,
        total: result.count,
        pages: Math.ceil(result.count / pageSize),
      },
      summary: {
        totalCoupons: total,
        activeCoupons: active,
        expiredCoupons: expired,
        totalRedemptions: Number(totalRedemptions || 0),
      },
    });
  }),
);

router.post(
  "/",
  validate(couponSchema),
  wrap(async (req, res) => {
    try {
      const item = await sequelize.transaction(async (transaction) => {
        const coupon = await Coupon.create({
          ...req.valid,
          shopId: req.shop.id,
          maxDiscountAmount: req.valid.discountType === "percentage"
            ? req.valid.maxDiscountAmount ?? null
            : null,
        }, { transaction });
        await audit({
          actorId: req.user.id,
          action: "coupon.created",
          entityType: "coupon",
          entityId: coupon.id,
          shopId: req.shop.id,
          meta: { code: coupon.code },
          ip: req.ip,
        }, transaction);
        return coupon;
      });
      res.status(201).json({ item: serializeCoupon(item, new Date().toISOString().slice(0, 10)) });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new AppError(409, "A coupon with this code already exists for this shop.");
      }
      throw error;
    }
  }),
);

router.get(
  "/:id",
  wrap(async (req, res) => {
    const item = await Coupon.findOne({
      where: { id: idParam(req, "id"), shopId: req.shop.id },
    });
    if (!item) throw new AppError(404, "Coupon not found.");
    res.json({ item: serializeCoupon(item, new Date().toISOString().slice(0, 10)) });
  }),
);

router.patch(
  "/:id",
  validate(couponPatchSchema),
  wrap(async (req, res) => {
    try {
      const item = await sequelize.transaction(async (transaction) => {
        const coupon = await Coupon.findOne({
          where: { id: idParam(req, "id"), shopId: req.shop.id },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (!coupon) throw new AppError(404, "Coupon not found.");
        const next = couponSchema.parse({ ...coupon.toJSON(), ...req.valid });
        const redemptionCount = await CouponRedemption.count({
          where: {
            couponId: coupon.id,
            status: { [Op.in]: ["reserved", "redeemed"] },
          },
          transaction,
        });
        if (
          next.totalUsageLimit != null &&
          next.totalUsageLimit < Math.max(Number(coupon.usedCount), redemptionCount)
        ) {
          throw new AppError(409, "The total redemption limit cannot be below existing uses.");
        }
        if (
          next.perCustomerUsageLimit < Number(coupon.perCustomerUsageLimit) &&
          redemptionCount > 0
        ) {
          const counts = await CouponRedemption.findAll({
            attributes: [
              "customerId",
              [CouponRedemption.sequelize.fn("COUNT", CouponRedemption.sequelize.col("id")), "uses"],
            ],
            where: {
              couponId: coupon.id,
              status: { [Op.in]: ["reserved", "redeemed"] },
            },
            group: ["customerId"],
            raw: true,
            transaction,
          });
          if (counts.some((row) => Number(row.uses) > next.perCustomerUsageLimit)) {
            throw new AppError(409, "The per-customer limit cannot be below a customer's existing uses.");
          }
        }

        await coupon.update({
          ...next,
          maxDiscountAmount: next.discountType === "percentage"
            ? next.maxDiscountAmount ?? null
            : null,
        }, { transaction });
        await audit({
          actorId: req.user.id,
          action: "coupon.updated",
          entityType: "coupon",
          entityId: coupon.id,
          shopId: req.shop.id,
          meta: { code: coupon.code },
          ip: req.ip,
        }, transaction);
        return coupon;
      });
      res.json({ item: serializeCoupon(item, new Date().toISOString().slice(0, 10)) });
    } catch (error) {
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new AppError(409, "A coupon with this code already exists for this shop.");
      }
      throw error;
    }
  }),
);

router.patch(
  "/:id/status",
  validate(z.object({ status: z.enum(["active", "inactive"]) })),
  wrap(async (req, res) => {
    const item = await sequelize.transaction(async (transaction) => {
      const coupon = await Coupon.findOne({
        where: { id: idParam(req, "id"), shopId: req.shop.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!coupon) throw new AppError(404, "Coupon not found.");
      await coupon.update({ status: req.valid.status }, { transaction });
      await audit({
        actorId: req.user.id,
        action: "coupon.status_updated",
        entityType: "coupon",
        entityId: coupon.id,
        shopId: req.shop.id,
        meta: { status: coupon.status },
        ip: req.ip,
      }, transaction);
      return coupon;
    });
    res.json({ item: serializeCoupon(item, new Date().toISOString().slice(0, 10)) });
  }),
);

router.delete(
  "/:id",
  wrap(async (req, res) => {
    await sequelize.transaction(async (transaction) => {
      const item = await Coupon.findOne({
        where: { id: idParam(req, "id"), shopId: req.shop.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!item) throw new AppError(404, "Coupon not found.");
      const redemptionCount = await CouponRedemption.count({
        where: { couponId: item.id },
        transaction,
      });
      if (Number(item.usedCount) > 0 || redemptionCount > 0) {
        throw new AppError(409, "This coupon has order history and cannot be deleted.");
      }
      await audit({
        actorId: req.user.id,
        action: "coupon.deleted",
        entityType: "coupon",
        entityId: item.id,
        shopId: req.shop.id,
        meta: { code: item.code },
        ip: req.ip,
      }, transaction);
      await item.destroy({ transaction });
    });
    res.json({ message: "Coupon deleted." });
  }),
);

module.exports = router;
