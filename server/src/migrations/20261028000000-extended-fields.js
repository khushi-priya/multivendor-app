'use strict';

/**
 * Non-destructive migration:
 * 1. shops – add gst_number, city, district, state, pin_code
 * 2. users – add first_name, last_name (name kept for backward compat)
 * 3. wholesalers – add gst_number
 * 4. categories, subcategories, brands, attributes –
 *    add submission_status, submitted_by_shop_id, rejection_reason
 */
module.exports = {
  async up(qi, Sequelize) {
    const D = Sequelize;

    // ── shops ──────────────────────────────────────────────────────────────
    const shopCols = await qi.describeTable('shops');
    if (!shopCols.gst_number)
      await qi.addColumn('shops', 'gst_number', { type: D.STRING(20), allowNull: true });
    if (!shopCols.city)
      await qi.addColumn('shops', 'city', { type: D.STRING(100), allowNull: true });
    if (!shopCols.district)
      await qi.addColumn('shops', 'district', { type: D.STRING(100), allowNull: true });
    if (!shopCols.state)
      await qi.addColumn('shops', 'state', { type: D.STRING(100), allowNull: true });
    if (!shopCols.pin_code)
      await qi.addColumn('shops', 'pin_code', { type: D.STRING(10), allowNull: true });

    // ── users ──────────────────────────────────────────────────────────────
    const userCols = await qi.describeTable('users');
    if (!userCols.first_name)
      await qi.addColumn('users', 'first_name', { type: D.STRING(80), allowNull: true });
    if (!userCols.last_name)
      await qi.addColumn('users', 'last_name', { type: D.STRING(80), allowNull: true });

    // ── wholesalers ────────────────────────────────────────────────────────
    const wCols = await qi.describeTable('wholesalers');
    if (!wCols.gst_number)
      await qi.addColumn('wholesalers', 'gst_number', { type: D.STRING(20), allowNull: true });

    // ── catalog approval fields ────────────────────────────────────────────
    // submission_status: null = admin-created (always approved)
    //                    pending / approved / rejected = shop submission
    const approvalCols = [
      {
        column: 'submission_status',
        def: {
          type: D.ENUM('pending', 'approved', 'rejected'),
          allowNull: true,
          defaultValue: null,
        },
      },
      {
        column: 'submitted_by_shop_id',
        def: {
          type: D.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: 'shops', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
      },
      {
        column: 'rejection_reason',
        def: { type: D.STRING(500), allowNull: true },
      },
    ];

    for (const table of ['categories', 'subcategories', 'brands', 'attributes']) {
      const cols = await qi.describeTable(table);
      for (const { column, def } of approvalCols) {
        if (!cols[column]) await qi.addColumn(table, column, def);
      }
    }
  },

  async down(qi) {
    // Remove in reverse order; ignore missing columns to allow partial rollback
    for (const table of ['attributes', 'brands', 'subcategories', 'categories']) {
      const cols = await qi.describeTable(table);
      for (const col of ['rejection_reason', 'submitted_by_shop_id', 'submission_status']) {
        if (cols[col]) await qi.removeColumn(table, col);
      }
    }

    const wCols = await qi.describeTable('wholesalers');
    if (wCols.gst_number) await qi.removeColumn('wholesalers', 'gst_number');

    const userCols = await qi.describeTable('users');
    if (userCols.last_name) await qi.removeColumn('users', 'last_name');
    if (userCols.first_name) await qi.removeColumn('users', 'first_name');

    const shopCols = await qi.describeTable('shops');
    if (shopCols.pin_code) await qi.removeColumn('shops', 'pin_code');
    if (shopCols.state) await qi.removeColumn('shops', 'state');
    if (shopCols.district) await qi.removeColumn('shops', 'district');
    if (shopCols.city) await qi.removeColumn('shops', 'city');
    if (shopCols.gst_number) await qi.removeColumn('shops', 'gst_number');
  },
};
