"use strict";

module.exports = {
  async up(queryInterface) {
    const [duplicates] = await queryInterface.sequelize.query(
      `SELECT shop_id, LOWER(name) AS normalized_name, COUNT(*) AS role_count
       FROM shop_roles
       GROUP BY shop_id, LOWER(name)
       HAVING COUNT(*) > 1
       LIMIT 1`,
    );
    if (duplicates.length) {
      throw new Error(
        `Cannot add unique shop role names: shop ${duplicates[0].shop_id} has duplicate role name "${duplicates[0].normalized_name}". Resolve duplicates and retry.`,
      );
    }

    await queryInterface.addIndex("shop_roles", ["shop_id", "name"], {
      unique: true,
      name: "uq_shop_roles_shop_name",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("shop_roles", "uq_shop_roles_shop_name");
  },
};
