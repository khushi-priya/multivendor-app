'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const userReference = {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    };

    await queryInterface.changeColumn('returns', 'status', {
      type: Sequelize.ENUM(
        'requested',
        'approved',
        'rejected',
        'item_received',
        'received',
        'refund_processing',
        'refunded',
      ),
      allowNull: false,
      defaultValue: 'requested',
    });

    await queryInterface.sequelize.query(
      "UPDATE `returns` SET `status` = 'received' WHERE `status` = 'item_received'",
    );

    await queryInterface.changeColumn('returns', 'status', {
      type: Sequelize.ENUM(
        'requested',
        'approved',
        'rejected',
        'received',
        'refund_processing',
        'refunded',
      ),
      allowNull: false,
      defaultValue: 'requested',
    });

    await queryInterface.addColumn('returns', 'approved_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('returns', 'approved_by', userReference);
    await queryInterface.addColumn('returns', 'rejected_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('returns', 'rejected_by', userReference);
    await queryInterface.addColumn('returns', 'rejection_reason', {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn('returns', 'received_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('returns', 'received_by', userReference);
    await queryInterface.addColumn('returns', 'refund_processing_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('returns', 'refunded_at', {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn('returns', 'refunded_by', userReference);
    await queryInterface.addColumn('returns', 'refund_reference', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      "UPDATE `returns` SET `received_at` = `updated_at` WHERE `status` IN ('received', 'refund_processing', 'refunded') AND `received_at` IS NULL",
    );
    await queryInterface.sequelize.query(
      "UPDATE `returns` SET `refunded_at` = `updated_at` WHERE `status` = 'refunded' AND `refunded_at` IS NULL",
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('returns', 'status', {
      type: Sequelize.ENUM(
        'requested',
        'approved',
        'rejected',
        'received',
        'refund_processing',
        'item_received',
        'refunded',
      ),
      allowNull: false,
      defaultValue: 'requested',
    });
    await queryInterface.sequelize.query(
      "UPDATE `returns` SET `status` = 'item_received' WHERE `status` IN ('received', 'refund_processing')",
    );
    await queryInterface.changeColumn('returns', 'status', {
      type: Sequelize.ENUM(
        'requested',
        'approved',
        'rejected',
        'item_received',
        'refunded',
      ),
      allowNull: false,
      defaultValue: 'requested',
    });

    for (const column of [
      'refund_reference',
      'refunded_by',
      'refunded_at',
      'refund_processing_at',
      'received_by',
      'received_at',
      'rejection_reason',
      'rejected_by',
      'rejected_at',
      'approved_by',
      'approved_at',
    ]) {
      await queryInterface.removeColumn('returns', column);
    }
  },
};
