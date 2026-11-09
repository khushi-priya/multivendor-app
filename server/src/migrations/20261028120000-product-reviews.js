'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const D = Sequelize;
    await queryInterface.createTable('product_reviews', {
      id: { type: D.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true, allowNull: false },
      product_id: { type: D.INTEGER.UNSIGNED, allowNull: false, references: { model: 'products', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      customer_id: { type: D.INTEGER.UNSIGNED, allowNull: false, references: { model: 'users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      order_id: { type: D.INTEGER.UNSIGNED, allowNull: false, references: { model: 'orders', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      rating: { type: D.TINYINT.UNSIGNED, allowNull: false },
      title: { type: D.STRING(150), allowNull: true },
      body: { type: D.STRING(1500), allowNull: false },
      created_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: D.DATE, allowNull: false, defaultValue: D.literal('CURRENT_TIMESTAMP') },
    });
    await queryInterface.addIndex('product_reviews', ['customer_id', 'product_id'], { unique: true, name: 'uq_product_reviews_customer_product' });
    await queryInterface.addIndex('product_reviews', ['product_id', 'created_at'], { name: 'ix_product_reviews_product_created' });
  },
  async down(queryInterface) {
    await queryInterface.dropTable('product_reviews');
  },
};
