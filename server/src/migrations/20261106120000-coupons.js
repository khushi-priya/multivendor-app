"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;
    const pk = { type: D.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true };
    const fk = (table, allowNull = false) => ({
      type: D.INTEGER.UNSIGNED,
      allowNull,
      references: { model: table, key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    const now = () => ({
      type: D.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    });
    const opts = { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" };

    await queryInterface.createTable("coupons", {
      id: pk,
      shop_id: fk("shops"),
      code: { type: D.STRING(40), allowNull: false },
      discount_type: {
        type: D.ENUM("percentage", "flat"),
        allowNull: false,
      },
      discount_value: { type: D.DECIMAL(10, 2), allowNull: false },
      max_discount_amount: { type: D.DECIMAL(10, 2), allowNull: true },
      minimum_order_amount: {
        type: D.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_usage_limit: { type: D.INTEGER.UNSIGNED, allowNull: true },
      per_customer_usage_limit: {
        type: D.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
      used_count: {
        type: D.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      start_date: { type: D.DATEONLY, allowNull: false },
      expiry_date: { type: D.DATEONLY, allowNull: false },
      status: {
        type: D.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await queryInterface.addIndex("coupons", ["shop_id", "code"], {
      unique: true,
      name: "uq_coupons_shop_code",
    });
    await queryInterface.addIndex("coupons", ["shop_id", "status", "expiry_date"], {
      name: "ix_coupons_shop_status_expiry",
    });

    await queryInterface.addColumn("orders", "coupon_id", {
      ...fk("coupons", true),
    });
    await queryInterface.addColumn("orders", "coupon_code", {
      type: D.STRING(40),
      allowNull: true,
    });
    await queryInterface.addIndex("orders", ["coupon_id"], {
      name: "ix_orders_coupon",
    });

    await queryInterface.createTable("coupon_redemptions", {
      id: pk,
      coupon_id: fk("coupons"),
      shop_id: fk("shops"),
      customer_id: fk("users"),
      order_id: fk("orders"),
      discount_amount: { type: D.DECIMAL(10, 2), allowNull: false },
      status: {
        type: D.ENUM("reserved", "redeemed", "released"),
        allowNull: false,
        defaultValue: "reserved",
      },
      redeemed_at: { type: D.DATE, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await queryInterface.addIndex("coupon_redemptions", ["order_id"], {
      unique: true,
      name: "uq_coupon_redemptions_order",
    });
    await queryInterface.addIndex(
      "coupon_redemptions",
      ["coupon_id", "customer_id", "status"],
      { name: "ix_coupon_redemptions_customer_status" },
    );
    await queryInterface.addIndex("coupon_redemptions", ["coupon_id", "status"], {
      name: "ix_coupon_redemptions_coupon_status",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("coupon_redemptions");
    await queryInterface.removeIndex("orders", "ix_orders_coupon");
    await queryInterface.removeColumn("orders", "coupon_code");
    await queryInterface.removeColumn("orders", "coupon_id");
    await queryInterface.dropTable("coupons");
  },
};
