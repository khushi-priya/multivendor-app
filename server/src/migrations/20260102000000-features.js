'use strict';

/**
 * Platform features migration:
 * - Commission settings
 * - Catalog: categories, subcategories, brands, attributes, attribute values, products, variants, images
 * - Seller listings & inventory & stock movements
 * - Wholesale purchase orders, items, goods receipts, receipt items, uploaded documents, wholesale payments
 * - Employee profiles, attendance, salary payments
 * - Customer addresses, carts, cart items, wishlists
 * - Orders, order items, status history, deliveries, payments, returns, return items
 */
module.exports = {
  async up(qi, Sequelize) {
    const D = Sequelize;
    const pk = { type: D.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true };
    const fk = (table, allowNull = false) => ({
      type: D.INTEGER.UNSIGNED,
      allowNull,
      references: { model: table, key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });
    const now = () => ({ type: D.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') });
    const opts = { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci' };

    // 1. Commission Settings
    await qi.createTable('commission_settings', {
      id: pk,
      percentage: { type: D.DECIMAL(5, 2), allowNull: false, defaultValue: 5.00 },
      min_order_amount: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      notes: { type: D.STRING(255), allowNull: true },
      updated_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);

    // 2. Categories
    await qi.createTable('categories', {
      id: pk,
      name: { type: D.STRING(100), allowNull: false },
      slug: { type: D.STRING(120), allowNull: false },
      description: { type: D.STRING(500), allowNull: true },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('categories', ['slug'], { unique: true, name: 'uq_categories_slug' });

    // 3. Subcategories
    await qi.createTable('subcategories', {
      id: pk,
      category_id: fk('categories'),
      name: { type: D.STRING(100), allowNull: false },
      slug: { type: D.STRING(120), allowNull: false },
      description: { type: D.STRING(500), allowNull: true },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('subcategories', ['category_id', 'slug'], { unique: true, name: 'uq_subcategories_cat_slug' });

    // 4. Brands
    await qi.createTable('brands', {
      id: pk,
      name: { type: D.STRING(100), allowNull: false },
      description: { type: D.STRING(500), allowNull: true },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('brands', ['name'], { unique: true, name: 'uq_brands_name' });

    // 5. Attributes
    await qi.createTable('attributes', {
      id: pk,
      name: { type: D.STRING(60), allowNull: false },
      code: { type: D.STRING(60), allowNull: false },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('attributes', ['code'], { unique: true, name: 'uq_attributes_code' });

    // 6. Attribute Values
    await qi.createTable('attribute_values', {
      id: pk,
      attribute_id: fk('attributes'),
      value: { type: D.STRING(100), allowNull: false },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('attribute_values', ['attribute_id', 'value'], { unique: true, name: 'uq_attribute_values_attr_val' });

    // 7. Products
    await qi.createTable('products', {
      id: pk,
      name: { type: D.STRING(200), allowNull: false },
      sku: { type: D.STRING(80), allowNull: true },
      category_id: fk('categories', true),
      subcategory_id: fk('subcategories', true),
      brand_id: fk('brands', true),
      description: { type: D.TEXT, allowNull: true },
      base_price: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('products', ['sku'], { unique: true, name: 'uq_products_sku' });

    // 8. Product Variants
    await qi.createTable('product_variants', {
      id: pk,
      product_id: fk('products'),
      sku: { type: D.STRING(80), allowNull: false },
      variant_name: { type: D.STRING(150), allowNull: false },
      price: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      wholesale_price: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('product_variants', ['sku'], { unique: true, name: 'uq_product_variants_sku' });

    // 9. Product Variant Values
    await qi.createTable('product_variant_values', {
      id: pk,
      product_variant_id: fk('product_variants'),
      attribute_id: fk('attributes'),
      attribute_value_id: fk('attribute_values'),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('product_variant_values', ['product_variant_id', 'attribute_id'], { unique: true, name: 'uq_pvv_variant_attr' });

    // 10. Product Images
    await qi.createTable('product_images', {
      id: pk,
      product_id: fk('products'),
      image_url: { type: D.STRING(500), allowNull: false },
      is_primary: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
      sort_order: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: now(),
      updated_at: now(),
    }, opts);

    // 11. Seller Listings
    await qi.createTable('seller_listings', {
      id: pk,
      shop_id: fk('shops'),
      product_id: fk('products'),
      product_variant_id: fk('product_variants'),
      custom_sku: { type: D.STRING(80), allowNull: true },
      retail_price: { type: D.DECIMAL(10, 2), allowNull: false },
      is_active: { type: D.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('seller_listings', ['shop_id', 'product_variant_id'], { unique: true, name: 'uq_seller_listings_shop_variant' });

    // 12. Inventory
    await qi.createTable('inventory', {
      id: pk,
      shop_id: fk('shops'),
      product_id: fk('products'),
      product_variant_id: fk('product_variants'),
      quantity: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      low_stock_threshold: { type: D.INTEGER, allowNull: false, defaultValue: 5 },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('inventory', ['shop_id', 'product_variant_id'], { unique: true, name: 'uq_inventory_shop_variant' });

    // 13. Inventory Movements
    await qi.createTable('inventory_movements', {
      id: { type: D.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      shop_id: fk('shops'),
      product_id: fk('products'),
      product_variant_id: fk('product_variants'),
      change_quantity: { type: D.INTEGER, allowNull: false },
      balance_after: { type: D.INTEGER, allowNull: false },
      movement_type: {
        type: D.ENUM('receipt', 'sale', 'return', 'damaged', 'adjustment'),
        allowNull: false,
      },
      reference_type: { type: D.STRING(50), allowNull: true },
      reference_id: { type: D.STRING(50), allowNull: true },
      notes: { type: D.STRING(500), allowNull: true },
      created_by: fk('users', true),
      created_at: now(),
    }, opts);
    await qi.addIndex('inventory_movements', ['shop_id', 'product_variant_id'], { name: 'ix_inv_mov_shop_variant' });

    // 14. Purchase Orders
    await qi.createTable('purchase_orders', {
      id: pk,
      shop_id: fk('shops'),
      wholesaler_id: fk('wholesalers'),
      order_number: { type: D.STRING(50), allowNull: false },
      status: {
        type: D.ENUM('draft', 'submitted', 'accepted', 'rejected', 'dispatched', 'received', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'submitted',
      },
      total_amount: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      notes: { type: D.TEXT, allowNull: true },
      created_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('purchase_orders', ['order_number'], { unique: true, name: 'uq_po_order_number' });
    await qi.addIndex('purchase_orders', ['shop_id'], { name: 'ix_po_shop' });
    await qi.addIndex('purchase_orders', ['wholesaler_id'], { name: 'ix_po_wholesaler' });

    // 15. Purchase Order Items
    await qi.createTable('purchase_order_items', {
      id: pk,
      purchase_order_id: fk('purchase_orders'),
      product_id: fk('products'),
      product_variant_id: fk('product_variants'),
      product_name: { type: D.STRING(200), allowNull: false },
      variant_name: { type: D.STRING(150), allowNull: false },
      quantity: { type: D.INTEGER, allowNull: false },
      unit_price: { type: D.DECIMAL(10, 2), allowNull: false },
      total_price: { type: D.DECIMAL(10, 2), allowNull: false },
      received_quantity: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      created_at: now(),
      updated_at: now(),
    }, opts);

    // 16. Goods Receipts
    await qi.createTable('goods_receipts', {
      id: pk,
      purchase_order_id: fk('purchase_orders'),
      shop_id: fk('shops'),
      receipt_number: { type: D.STRING(50), allowNull: false },
      received_date: { type: D.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      notes: { type: D.TEXT, allowNull: true },
      received_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('goods_receipts', ['receipt_number'], { unique: true, name: 'uq_receipt_number' });

    // 17. Goods Receipt Items
    await qi.createTable('goods_receipt_items', {
      id: pk,
      goods_receipt_id: fk('goods_receipts'),
      purchase_order_item_id: fk('purchase_order_items'),
      product_id: fk('products'),
      product_variant_id: fk('product_variants'),
      quantity_received: { type: D.INTEGER, allowNull: false },
      quantity_rejected: { type: D.INTEGER, allowNull: false, defaultValue: 0 },
      discrepancy_reason: { type: D.STRING(255), allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);

    // 18. Uploaded Documents
    await qi.createTable('uploaded_documents', {
      id: pk,
      shop_id: fk('shops'),
      wholesaler_id: fk('wholesalers', true),
      purchase_order_id: fk('purchase_orders', true),
      document_type: {
        type: D.ENUM('bill', 'invoice', 'receipt', 'delivery_proof', 'other'),
        allowNull: false,
        defaultValue: 'bill',
      },
      original_filename: { type: D.STRING(255), allowNull: false },
      stored_filename: { type: D.STRING(255), allowNull: false },
      file_path: { type: D.STRING(500), allowNull: false },
      file_size: { type: D.INTEGER, allowNull: false },
      mime_type: { type: D.STRING(100), allowNull: false },
      uploaded_by: fk('users', true),
      notes: { type: D.STRING(500), allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('uploaded_documents', ['shop_id'], { name: 'ix_uploaded_docs_shop' });

    // 19. Wholesale Payments
    await qi.createTable('wholesale_payments', {
      id: pk,
      shop_id: fk('shops'),
      wholesaler_id: fk('wholesalers'),
      purchase_order_id: fk('purchase_orders', true),
      amount: { type: D.DECIMAL(10, 2), allowNull: false },
      payment_method: { type: D.STRING(50), allowNull: false, defaultValue: 'bank_transfer' },
      payment_date: { type: D.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      reference_number: { type: D.STRING(100), allowNull: true },
      notes: { type: D.STRING(500), allowNull: true },
      created_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);

    // 20. Employee Profiles
    await qi.createTable('employee_profiles', {
      id: pk,
      user_id: fk('users'),
      shop_id: fk('shops'),
      salary_type: { type: D.ENUM('monthly', 'hourly', 'daily'), allowNull: false, defaultValue: 'monthly' },
      base_salary: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      joined_date: { type: D.DATEONLY, allowNull: true },
      designation: { type: D.STRING(100), allowNull: true },
      notes: { type: D.TEXT, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('employee_profiles', ['user_id', 'shop_id'], { unique: true, name: 'uq_employee_user_shop' });

    // 21. Attendance Records
    await qi.createTable('attendance_records', {
      id: pk,
      shop_id: fk('shops'),
      user_id: fk('users'),
      date: { type: D.DATEONLY, allowNull: false },
      status: {
        type: D.ENUM('present', 'absent', 'half_day', 'on_leave'),
        allowNull: false,
        defaultValue: 'present',
      },
      check_in: { type: D.TIME, allowNull: true },
      check_out: { type: D.TIME, allowNull: true },
      working_hours: { type: D.DECIMAL(4, 2), allowNull: true },
      notes: { type: D.STRING(255), allowNull: true },
      recorded_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('attendance_records', ['shop_id', 'user_id', 'date'], { unique: true, name: 'uq_attendance_shop_user_date' });

    // 22. Salary Payments
    await qi.createTable('salary_payments', {
      id: pk,
      shop_id: fk('shops'),
      user_id: fk('users'),
      pay_period: { type: D.STRING(20), allowNull: false },
      base_amount: { type: D.DECIMAL(10, 2), allowNull: false },
      allowances: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      deductions: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      net_amount: { type: D.DECIMAL(10, 2), allowNull: false },
      payment_date: { type: D.DATEONLY, allowNull: false },
      payment_method: { type: D.STRING(50), allowNull: false, defaultValue: 'cash' },
      status: { type: D.ENUM('pending', 'paid'), allowNull: false, defaultValue: 'paid' },
      notes: { type: D.STRING(500), allowNull: true },
      paid_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);

    // 23. Customer Addresses
    await qi.createTable('customer_addresses', {
      id: pk,
      user_id: fk('users'),
      label: { type: D.STRING(50), allowNull: false, defaultValue: 'Home' },
      recipient_name: { type: D.STRING(120), allowNull: false },
      phone: { type: D.STRING(20), allowNull: false },
      street_address: { type: D.STRING(300), allowNull: false },
      city: { type: D.STRING(100), allowNull: false },
      state: { type: D.STRING(100), allowNull: false },
      postal_code: { type: D.STRING(20), allowNull: false },
      is_default: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('customer_addresses', ['user_id'], { name: 'ix_cust_addr_user' });

    // 24. Carts
    await qi.createTable('carts', {
      id: pk,
      user_id: fk('users'),
      shop_id: fk('shops'),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('carts', ['user_id', 'shop_id'], { unique: true, name: 'uq_carts_user_shop' });

    // 25. Cart Items
    await qi.createTable('cart_items', {
      id: pk,
      cart_id: fk('carts'),
      product_id: fk('products'),
      product_variant_id: fk('product_variants'),
      quantity: { type: D.INTEGER, allowNull: false, defaultValue: 1 },
      unit_price: { type: D.DECIMAL(10, 2), allowNull: false },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('cart_items', ['cart_id', 'product_variant_id'], { unique: true, name: 'uq_cart_items_cart_variant' });

    // 26. Wishlists
    await qi.createTable('wishlists', {
      id: pk,
      user_id: fk('users'),
      product_id: fk('products'),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('wishlists', ['user_id', 'product_id'], { unique: true, name: 'uq_wishlist_user_product' });

    // 27. Orders
    await qi.createTable('orders', {
      id: pk,
      order_number: { type: D.STRING(50), allowNull: false },
      shop_id: fk('shops'),
      customer_id: fk('users'),
      status: {
        type: D.ENUM(
          'pending_payment', 'confirmed', 'processing', 'packed', 'ready_for_dispatch',
          'assigned_to_delivery', 'picked_up', 'out_for_delivery', 'delivered',
          'cancelled', 'delivery_failed', 'returned'
        ),
        allowNull: false,
        defaultValue: 'confirmed',
      },
      delivery_status: {
        type: D.ENUM('not_assigned', 'assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'),
        allowNull: false,
        defaultValue: 'not_assigned',
      },
      payment_method: { type: D.ENUM('cod', 'razorpay'), allowNull: false, defaultValue: 'cod' },
      payment_status: {
        type: D.ENUM('pending', 'paid', 'failed', 'refunded', 'partially_refunded'),
        allowNull: false,
        defaultValue: 'pending',
      },
      subtotal: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      tax_amount: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      delivery_fee: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      discount_amount: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      total_amount: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      commission_rate: { type: D.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
      commission_amount: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      shipping_address: { type: D.JSON, allowNull: true },
      notes: { type: D.TEXT, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('orders', ['order_number'], { unique: true, name: 'uq_orders_number' });
    await qi.addIndex('orders', ['shop_id', 'status'], { name: 'ix_orders_shop_status' });
    await qi.addIndex('orders', ['customer_id'], { name: 'ix_orders_customer' });

    // 28. Order Items
    await qi.createTable('order_items', {
      id: pk,
      order_id: fk('orders'),
      product_id: fk('products'),
      product_variant_id: fk('product_variants'),
      product_name: { type: D.STRING(200), allowNull: false },
      variant_name: { type: D.STRING(150), allowNull: false },
      sku: { type: D.STRING(80), allowNull: true },
      quantity: { type: D.INTEGER, allowNull: false },
      unit_price: { type: D.DECIMAL(10, 2), allowNull: false },
      total_price: { type: D.DECIMAL(10, 2), allowNull: false },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('order_items', ['order_id'], { name: 'ix_order_items_order' });

    // 29. Order Status History
    await qi.createTable('order_status_history', {
      id: { type: D.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      order_id: fk('orders'),
      previous_status: { type: D.STRING(50), allowNull: true },
      new_status: { type: D.STRING(50), allowNull: false },
      notes: { type: D.STRING(500), allowNull: true },
      changed_by: fk('users', true),
      created_at: now(),
    }, opts);
    await qi.addIndex('order_status_history', ['order_id'], { name: 'ix_order_hist_order' });

    // 30. Delivery Assignments
    await qi.createTable('delivery_assignments', {
      id: pk,
      order_id: fk('orders'),
      shop_id: fk('shops'),
      delivery_user_id: fk('users'),
      status: {
        type: D.ENUM('assigned', 'picked_up', 'out_for_delivery', 'delivered', 'failed'),
        allowNull: false,
        defaultValue: 'assigned',
      },
      assigned_at: { type: D.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      picked_up_at: { type: D.DATE, allowNull: true },
      delivered_at: { type: D.DATE, allowNull: true },
      notes: { type: D.STRING(500), allowNull: true },
      proof_image_path: { type: D.STRING(500), allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('delivery_assignments', ['delivery_user_id', 'status'], { name: 'ix_deliv_user_status' });
    await qi.addIndex('delivery_assignments', ['order_id'], { name: 'ix_deliv_order' });

    // 31. Payments
    await qi.createTable('payments', {
      id: pk,
      order_id: fk('orders'),
      shop_id: fk('shops'),
      amount: { type: D.DECIMAL(10, 2), allowNull: false },
      payment_method: { type: D.ENUM('cod', 'razorpay'), allowNull: false },
      status: { type: D.ENUM('pending', 'paid', 'failed', 'refunded'), allowNull: false, defaultValue: 'pending' },
      razorpay_order_id: { type: D.STRING(100), allowNull: true },
      razorpay_payment_id: { type: D.STRING(100), allowNull: true },
      razorpay_signature: { type: D.STRING(255), allowNull: true },
      cod_collected_amount: { type: D.DECIMAL(10, 2), allowNull: true },
      cod_collected_by: fk('users', true),
      cod_collected_at: { type: D.DATE, allowNull: true },
      cod_reconciled: { type: D.BOOLEAN, allowNull: false, defaultValue: false },
      cod_reconciled_at: { type: D.DATE, allowNull: true },
      cod_reconciled_by: fk('users', true),
      meta: { type: D.JSON, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('payments', ['order_id'], { name: 'ix_payments_order' });
    await qi.addIndex('payments', ['shop_id'], { name: 'ix_payments_shop' });

    // 32. Returns
    await qi.createTable('returns', {
      id: pk,
      order_id: fk('orders'),
      shop_id: fk('shops'),
      customer_id: fk('users'),
      reason: { type: D.STRING(500), allowNull: false },
      status: {
        type: D.ENUM('requested', 'approved', 'rejected', 'item_received', 'refunded'),
        allowNull: false,
        defaultValue: 'requested',
      },
      refund_amount: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
      processed_by: fk('users', true),
      notes: { type: D.TEXT, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('returns', ['shop_id'], { name: 'ix_returns_shop' });
    await qi.addIndex('returns', ['customer_id'], { name: 'ix_returns_customer' });

    // 33. Return Items
    await qi.createTable('return_items', {
      id: pk,
      return_id: fk('returns'),
      order_item_id: fk('order_items'),
      quantity: { type: D.INTEGER, allowNull: false },
      reason: { type: D.STRING(255), allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
  },

  async down(qi) {
    const tables = [
      'return_items', 'returns', 'payments', 'delivery_assignments', 'order_status_history',
      'order_items', 'orders', 'wishlists', 'cart_items', 'carts', 'customer_addresses',
      'salary_payments', 'attendance_records', 'employee_profiles', 'wholesale_payments',
      'uploaded_documents', 'goods_receipt_items', 'goods_receipts', 'purchase_order_items',
      'purchase_orders', 'inventory_movements', 'inventory', 'seller_listings',
      'product_images', 'product_variant_values', 'product_variants', 'products',
      'attribute_values', 'attributes', 'brands', 'subcategories', 'categories',
      'commission_settings',
    ];
    for (const t of tables) {
      await qi.dropTable(t);
    }
  },
};
