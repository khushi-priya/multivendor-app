"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("shops", "shipping_settings", {
      type: Sequelize.JSON,
      allowNull: true,
    });

    await queryInterface.addColumn("products", "weight", {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
    });
    await queryInterface.addColumn("products", "weight_unit", {
      type: Sequelize.ENUM("g", "kg"),
      allowNull: false,
      defaultValue: "kg",
    });
    await queryInterface.addColumn("product_variants", "weight", {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
    });
    await queryInterface.addColumn("product_variants", "weight_unit", {
      type: Sequelize.ENUM("g", "kg"),
      allowNull: true,
    });

    await queryInterface.addColumn("seller_listings", "gst_applicable", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("seller_listings", "gst_rate", {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("seller_listings", "price_includes_gst", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });
    await queryInterface.addColumn("seller_listings", "hsn_code", {
      type: Sequelize.STRING(20),
      allowNull: true,
    });

    await queryInterface.addColumn("orders", "tax_breakdown", {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn("orders", "shipping_snapshot", {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn("order_items", "taxable_value", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("order_items", "tax_amount", {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    });
    await queryInterface.addColumn("order_items", "tax_snapshot", {
      type: Sequelize.JSON,
      allowNull: true,
    });
    await queryInterface.addColumn("order_items", "weight_kg", {
      type: Sequelize.DECIMAL(10, 3),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    for (const [table, column] of [
      ["order_items", "weight_kg"],
      ["order_items", "tax_snapshot"],
      ["order_items", "tax_amount"],
      ["order_items", "taxable_value"],
      ["orders", "shipping_snapshot"],
      ["orders", "tax_breakdown"],
      ["seller_listings", "hsn_code"],
      ["seller_listings", "price_includes_gst"],
      ["seller_listings", "gst_rate"],
      ["seller_listings", "gst_applicable"],
      ["product_variants", "weight_unit"],
      ["product_variants", "weight"],
      ["products", "weight_unit"],
      ["products", "weight"],
      ["shops", "shipping_settings"],
    ]) {
      await queryInterface.removeColumn(table, column);
    }
  },
};
