'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('auth_tokens');

    if (!table.attempts) {
      await queryInterface.addColumn('auth_tokens', 'attempts', {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      });
    }

    const [typeColumns] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM `auth_tokens` LIKE 'type'",
    );

    const typeDefinition = typeColumns && typeColumns[0] ? typeColumns[0].Type : '';
    const hasEmailVerification = typeDefinition.includes('email_verification');

    if (!hasEmailVerification) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `auth_tokens` MODIFY `type` ENUM('account_setup', 'password_reset', 'email_verification') NOT NULL",
      );
    }
  },

  async down(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('auth_tokens');

    if (table.attempts) {
      await queryInterface.removeColumn('auth_tokens', 'attempts');
    }

    const [typeColumns] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM `auth_tokens` LIKE 'type'",
    );

    const typeDefinition = typeColumns && typeColumns[0] ? typeColumns[0].Type : '';
    const hasEmailVerification = typeDefinition.includes('email_verification');

    if (hasEmailVerification) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `auth_tokens` MODIFY `type` ENUM('account_setup', 'password_reset') NOT NULL",
      );
    }
  },
};
