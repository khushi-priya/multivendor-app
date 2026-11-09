'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await Promise.all(['categories', 'subcategories', 'brands'].map((table) => queryInterface.describeTable(table)));
    for (const [index, table] of ['categories', 'subcategories', 'brands'].entries()) {
      if (!columns[index].image_url) await queryInterface.addColumn(table, 'image_url', { type: Sequelize.STRING(500), allowNull: true });
    }
  },

  async down(queryInterface) {
    for (const table of ['brands', 'subcategories', 'categories']) {
      const columns = await queryInterface.describeTable(table);
      if (columns.image_url) await queryInterface.removeColumn(table, 'image_url');
    }
  },
};
