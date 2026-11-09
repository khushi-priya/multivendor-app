
'use strict';

module.exports = {
  async up(qi, Sequelize) {
    const D = Sequelize;
    const now = () => ({
      type: D.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
    });

    // Allow built-in and custom role codes in shop_memberships.
    // Existing role values are preserved during this conversion.
    await qi.changeColumn('shop_memberships', 'role', {
      type: D.STRING(100),
      allowNull: false,
    });

    // Store custom roles separately for each shop.
    await qi.createTable('shop_roles', {
      id: {
        type: D.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      shop_id: {
        type: D.INTEGER.UNSIGNED,
        allowNull: false,
        references: {
          model: 'shops',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      name: {
        type: D.STRING(100),
        allowNull: false,
      },
      code: {
        type: D.STRING(100),
        allowNull: false,
      },
      is_active: {
        type: D.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: now(),
      updated_at: now(),
    }, {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
    });

    await qi.addIndex('shop_roles', ['shop_id', 'code'], {
      unique: true,
      name: 'uq_shop_roles_shop_code',
    });

    await qi.addIndex('shop_roles', ['shop_id', 'is_active'], {
      name: 'ix_shop_roles_shop_active',
    });
  },

  async down(qi, Sequelize) {
    // Do not silently discard custom role assignments on rollback.
    const [rows] = await qi.sequelize.query(
      `SELECT role
       FROM shop_memberships
       WHERE role NOT IN (
         'shop_owner',
         'shop_manager',
         'sales_associate',
         'delivery_associate',
         'cashier',
         'support'
       )
       LIMIT 1`
    );

    if (rows.length > 0) {
      throw new Error(
        `Cannot rollback shop roles: custom role "${rows[0].role}" is still assigned to an employee. Reassign those employees to built-in roles first.`
      );
    }

    await qi.dropTable('shop_roles');

    await qi.changeColumn('shop_memberships', 'role', {
      type: Sequelize.ENUM(
        'shop_owner',
        'shop_manager',
        'sales_associate',
        'delivery_associate',
        'cashier',
        'support'
      ),
      allowNull: false,
    });
  },
};
