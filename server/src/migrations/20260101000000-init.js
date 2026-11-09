'use strict';

/**
 * Initial schema: users, shops, memberships, wholesalers, access grants,
 * one-time auth tokens and audit logs.
 * (The `sessions` table is created automatically by express-mysql-session.)
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

    await qi.createTable('users', {
      id: pk,
      name: { type: D.STRING(120), allowNull: false },
      email: { type: D.STRING(190), allowNull: false },
      phone: { type: D.STRING(20), allowNull: true },
      password_hash: { type: D.STRING(100), allowNull: true },
      role: { type: D.ENUM('super_admin', 'shop_user', 'customer'), allowNull: false },
      status: { type: D.ENUM('active', 'invited', 'disabled'), allowNull: false, defaultValue: 'active' },
      email_verified_at: { type: D.DATE, allowNull: true },
      last_login_at: { type: D.DATE, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('users', ['email'], { unique: true, name: 'uq_users_email' });

    await qi.createTable('shop_categories', {
      id: pk,
      name: { type: D.STRING(100), allowNull: false },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('shop_categories', ['name'], { unique: true, name: 'uq_shop_categories_name' });

    await qi.createTable('shops', {
      id: pk,
      name: { type: D.STRING(150), allowNull: false },
      name_key: { type: D.STRING(150), allowNull: false },
      category_id: fk('shop_categories'),
      address: { type: D.STRING(500), allowNull: false },
      contact_phone: { type: D.STRING(20), allowNull: true },
      contact_email: { type: D.STRING(190), allowNull: true },
      status: { type: D.ENUM('active', 'suspended'), allowNull: false, defaultValue: 'active' },
      created_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('shops', ['name_key'], { unique: true, name: 'uq_shops_name_key' });
    await qi.addIndex('shops', ['status'], { name: 'ix_shops_status' });

    await qi.createTable('shop_memberships', {
      id: pk,
      user_id: fk('users'),
      shop_id: fk('shops'),
      role: {
        type: D.ENUM('shop_owner', 'shop_manager', 'sales_associate', 'delivery_associate', 'cashier', 'support'),
        allowNull: false,
      },
      status: { type: D.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('shop_memberships', ['user_id', 'shop_id'], { unique: true, name: 'uq_membership_user_shop' });
    await qi.addIndex('shop_memberships', ['shop_id', 'role'], { name: 'ix_membership_shop_role' });

    await qi.createTable('wholesalers', {
      id: pk,
      name: { type: D.STRING(150), allowNull: false },
      contact_email: { type: D.STRING(190), allowNull: true },
      contact_phone: { type: D.STRING(20), allowNull: true },
      address: { type: D.STRING(500), allowNull: true },
      status: { type: D.ENUM('active', 'inactive'), allowNull: false, defaultValue: 'active' },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('wholesalers', ['name'], { unique: true, name: 'uq_wholesalers_name' });

    await qi.createTable('wholesaler_shop_access', {
      id: pk,
      wholesaler_id: fk('wholesalers'),
      shop_id: fk('shops'),
      granted_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('wholesaler_shop_access', ['shop_id', 'wholesaler_id'], { unique: true, name: 'uq_access_shop_wholesaler' });

    await qi.createTable('auth_tokens', {
      id: pk,
      user_id: fk('users'),
      type: { type: D.ENUM('account_setup', 'password_reset'), allowNull: false },
      token_hash: { type: D.CHAR(64), allowNull: false },
      expires_at: { type: D.DATE, allowNull: false },
      used_at: { type: D.DATE, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('auth_tokens', ['token_hash'], { unique: true, name: 'uq_auth_tokens_hash' });
    await qi.addIndex('auth_tokens', ['user_id', 'type'], { name: 'ix_auth_tokens_user_type' });

    await qi.createTable('audit_logs', {
      id: { type: D.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
      actor_user_id: fk('users', true),
      shop_id: { type: D.INTEGER.UNSIGNED, allowNull: true },
      action: { type: D.STRING(80), allowNull: false },
      entity_type: { type: D.STRING(60), allowNull: true },
      entity_id: { type: D.STRING(40), allowNull: true },
      meta: { type: D.JSON, allowNull: true },
      ip: { type: D.STRING(64), allowNull: true },
      created_at: now(),
    }, opts);
    await qi.addIndex('audit_logs', ['created_at'], { name: 'ix_audit_created' });
    await qi.addIndex('audit_logs', ['shop_id'], { name: 'ix_audit_shop' });
  },

  async down(qi) {
    for (const t of [
      'audit_logs', 'auth_tokens', 'wholesaler_shop_access', 'wholesalers',
      'shop_memberships', 'shops', 'shop_categories', 'users',
    ]) {
      await qi.dropTable(t);
    }
  },
};
