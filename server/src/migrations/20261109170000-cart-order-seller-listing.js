'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const listingReference = {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'seller_listings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    };

    const cartItemColumns = await queryInterface.describeTable('cart_items');
    if (!cartItemColumns.seller_listing_id) {
      await queryInterface.addColumn('cart_items', 'seller_listing_id', listingReference);
      await queryInterface.addIndex('cart_items', ['seller_listing_id'], {
        name: 'ix_cart_items_seller_listing',
      });
    }

    const orderItemColumns = await queryInterface.describeTable('order_items');
    if (!orderItemColumns.seller_listing_id) {
      await queryInterface.addColumn('order_items', 'seller_listing_id', listingReference);
      await queryInterface.addIndex('order_items', ['seller_listing_id'], {
        name: 'ix_order_items_seller_listing',
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE cart_items AS ci
      INNER JOIN carts AS c ON c.id = ci.cart_id
      INNER JOIN seller_listings AS sl
        ON sl.shop_id = c.shop_id
        AND sl.product_id = ci.product_id
        AND sl.product_variant_id = ci.product_variant_id
      SET ci.seller_listing_id = sl.id
      WHERE ci.seller_listing_id IS NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE order_items AS oi
      INNER JOIN orders AS o ON o.id = oi.order_id
      INNER JOIN seller_listings AS sl
        ON sl.shop_id = o.shop_id
        AND sl.product_id = oi.product_id
        AND sl.product_variant_id = oi.product_variant_id
      SET oi.seller_listing_id = sl.id
      WHERE oi.seller_listing_id IS NULL
    `);
  },

  async down(queryInterface) {
    for (const [table, indexName] of [
      ['order_items', 'ix_order_items_seller_listing'],
      ['cart_items', 'ix_cart_items_seller_listing'],
    ]) {
      const columns = await queryInterface.describeTable(table);
      if (columns.seller_listing_id) {
        await queryInterface.removeIndex(table, indexName);
        await queryInterface.removeColumn(table, 'seller_listing_id');
      }
    }
  },
};
