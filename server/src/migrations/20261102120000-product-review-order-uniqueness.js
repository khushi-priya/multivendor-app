'use strict';

module.exports = {
  async up(queryInterface) {
    const [duplicates] = await queryInterface.sequelize.query(
      'SELECT customer_id, product_id, order_id, COUNT(*) AS duplicate_count FROM product_reviews GROUP BY customer_id, product_id, order_id HAVING COUNT(*) > 1 LIMIT 1',
    );
    if (duplicates.length) {
      throw new Error('Cannot add the product review uniqueness constraint: duplicate customer/product/order reviews exist.');
    }

    let indexes = await queryInterface.showIndex('product_reviews');
    const hasOrderScopedUnique = indexes.some((index) => {
      const fields = (index.fields || []).map((field) => field.attribute || field.name);
      return index.unique && fields.length === 3 && ['customer_id', 'product_id', 'order_id'].every((field) => fields.includes(field));
    });

    // Keep an index beginning with customer_id in place for MySQL's customer foreign key.
    if (!hasOrderScopedUnique) {
      await queryInterface.addIndex('product_reviews', ['customer_id', 'product_id', 'order_id'], { unique: true, name: 'unique_customer_product_order_review' });
      indexes = await queryInterface.showIndex('product_reviews');
    }

    for (const index of indexes) {
      const fields = (index.fields || []).map((field) => field.attribute || field.name);
      if (index.unique && fields.length === 2 && fields.includes('customer_id') && fields.includes('product_id')) {
        await queryInterface.removeIndex('product_reviews', index.name);
      }
    }
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex('product_reviews');
    for (const index of indexes) {
      const fields = (index.fields || []).map((field) => field.attribute || field.name);
      if (index.unique && fields.length === 3 && ['customer_id', 'product_id', 'order_id'].every((field) => fields.includes(field))) {
        await queryInterface.removeIndex('product_reviews', index.name);
      }
    }
    await queryInterface.addIndex('product_reviews', ['customer_id', 'product_id'], { unique: true, name: 'uq_product_reviews_customer_product' });
  },
};
