'use strict';

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

    await qi.addColumn('employee_profiles', 'employee_code', { type: D.STRING(40), allowNull: true });
    await qi.addColumn('employee_profiles', 'address', { type: D.STRING(500), allowNull: true });
    await qi.addIndex('employee_profiles', ['shop_id', 'employee_code'], { unique: true, name: 'uq_employee_code_shop' });

    await qi.createTable('employee_salaries', {
      id: pk,
      shop_id: fk('shops'),
      user_id: fk('users'),
      salary_type: { type: D.ENUM('monthly', 'hourly', 'daily'), allowNull: false },
      base_salary: { type: D.DECIMAL(10, 2), allowNull: false },
      allowances: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      deductions: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      effective_date: { type: D.DATEONLY, allowNull: false },
      notes: { type: D.STRING(500), allowNull: true },
      created_by: fk('users', true),
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('employee_salaries', ['shop_id', 'user_id', 'effective_date'], { name: 'ix_employee_salary_effective' });

    await qi.createTable('payroll_runs', {
      id: pk,
      shop_id: fk('shops'),
      pay_period: { type: D.STRING(7), allowNull: false },
      status: { type: D.ENUM('draft', 'finalized'), allowNull: false, defaultValue: 'draft' },
      total_gross: { type: D.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_deductions: { type: D.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      total_net: { type: D.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      generated_by: fk('users'),
      finalized_by: fk('users', true),
      finalized_at: { type: D.DATE, allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('payroll_runs', ['shop_id', 'pay_period'], { unique: true, name: 'uq_payroll_shop_period' });

    await qi.createTable('payroll_items', {
      id: pk,
      payroll_run_id: fk('payroll_runs'),
      shop_id: fk('shops'),
      user_id: fk('users'),
      employee_name: { type: D.STRING(120), allowNull: false },
      designation: { type: D.STRING(100), allowNull: true },
      salary_type: { type: D.ENUM('monthly', 'hourly', 'daily'), allowNull: false },
      base_salary: { type: D.DECIMAL(10, 2), allowNull: false },
      allowances: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      deductions: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      attendance_deduction: { type: D.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      payable_days: { type: D.DECIMAL(6, 2), allowNull: false, defaultValue: 0 },
      total_days: { type: D.INTEGER.UNSIGNED, allowNull: false },
      total_hours: { type: D.DECIMAL(8, 2), allowNull: false, defaultValue: 0 },
      calculation_basis: { type: D.STRING(500), allowNull: false },
      gross_amount: { type: D.DECIMAL(10, 2), allowNull: false },
      net_amount: { type: D.DECIMAL(10, 2), allowNull: false },
      payment_status: { type: D.ENUM('pending', 'paid'), allowNull: false, defaultValue: 'pending' },
      payment_date: { type: D.DATEONLY, allowNull: true },
      payment_method: { type: D.STRING(50), allowNull: true },
      paid_by: fk('users', true),
      notes: { type: D.STRING(500), allowNull: true },
      created_at: now(),
      updated_at: now(),
    }, opts);
    await qi.addIndex('payroll_items', ['payroll_run_id', 'user_id'], { unique: true, name: 'uq_payroll_item_employee' });
    await qi.addIndex('payroll_items', ['shop_id', 'user_id'], { name: 'ix_payroll_item_shop_employee' });
  },

  async down(qi) {
    await qi.dropTable('payroll_items');
    await qi.dropTable('payroll_runs');
    await qi.dropTable('employee_salaries');
    await qi.removeIndex('employee_profiles', 'uq_employee_code_shop');
    await qi.removeColumn('employee_profiles', 'address');
    await qi.removeColumn('employee_profiles', 'employee_code');
  },
};
