"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const membershipColumns = await queryInterface.describeTable("shop_memberships");
    if (!membershipColumns.permissions) {
      await queryInterface.addColumn("shop_memberships", "permissions", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }

    const roleColumns = await queryInterface.describeTable("shop_roles");
    if (!roleColumns.permissions) {
      await queryInterface.addColumn("shop_roles", "permissions", {
        type: Sequelize.JSON,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const roleColumns = await queryInterface.describeTable("shop_roles");
    if (roleColumns.permissions) {
      await queryInterface.removeColumn("shop_roles", "permissions");
    }

    const membershipColumns = await queryInterface.describeTable("shop_memberships");
    if (membershipColumns.permissions) {
      await queryInterface.removeColumn("shop_memberships", "permissions");
    }
  },
};
