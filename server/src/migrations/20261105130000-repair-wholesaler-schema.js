"use strict";

const now = (Sequelize) => ({
  type: Sequelize.DATE,
  allowNull: false,
  defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
});

async function ensureIndex(queryInterface, table, name, fields, unique) {
  const indexes = await queryInterface.showIndex(table);
  if (indexes.some((index) => index.name === name)) return;

  if (unique) {
    const [duplicates] = await queryInterface.sequelize.query(
      `SELECT ${fields.join(", ")}, COUNT(*) AS row_count
       FROM ${table}
       GROUP BY ${fields.join(", ")}
       HAVING COUNT(*) > 1
       LIMIT 1`,
    );
    if (duplicates.length) {
      throw new Error(
        `Cannot add ${name} to ${table}: duplicate relationship records exist. Resolve the duplicate rows and rerun the migration.`,
      );
    }
  }

  await queryInterface.addIndex(table, fields, { name, unique });
}

async function ensureForeignKey(
  queryInterface,
  table,
  column,
  referencedTable,
) {
  const references = await queryInterface.getForeignKeyReferencesForTable(table);
  if (
    references.some(
      (reference) =>
        reference.columnName === column &&
        reference.referencedTableName === referencedTable &&
        reference.referencedColumnName === "id",
    )
  ) {
    return;
  }

  await queryInterface.addConstraint(table, {
    fields: [column],
    type: "foreign key",
    name: `fk_${table}_${column}`,
    references: { table: referencedTable, field: "id" },
    onUpdate: "CASCADE",
    onDelete: "RESTRICT",
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();

    if (!tables.includes("wholesalers")) {
      await queryInterface.createTable(
        "wholesalers",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
          },
          name: { type: Sequelize.STRING(150), allowNull: false },
          contactPerson: {
            type: Sequelize.STRING(120),
            allowNull: true,
            field: "contact_person",
          },
          contactEmail: {
            type: Sequelize.STRING(190),
            allowNull: true,
            field: "contact_email",
          },
          contactPhone: {
            type: Sequelize.STRING(20),
            allowNull: true,
            field: "contact_phone",
          },
          address: { type: Sequelize.STRING(500), allowNull: true },
          gstNumber: {
            type: Sequelize.STRING(20),
            allowNull: true,
            field: "gst_number",
          },
          status: {
            type: Sequelize.ENUM("active", "inactive"),
            allowNull: false,
            defaultValue: "active",
          },
          createdAt: { ...now(Sequelize), field: "created_at" },
          updatedAt: { ...now(Sequelize), field: "updated_at" },
        },
        { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" },
      );
    }

    let wholesalerColumns = await queryInterface.describeTable("wholesalers");
    const wholesalerColumnDefinitions = {
      contact_person: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      contact_email: {
        type: Sequelize.STRING(190),
        allowNull: true,
      },
      contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      gst_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      created_at: now(Sequelize),
      updated_at: now(Sequelize),
    };
    for (const [column, definition] of Object.entries(
      wholesalerColumnDefinitions,
    )) {
      if (!wholesalerColumns[column]) {
        await queryInterface.addColumn("wholesalers", column, definition);
      }
    }
    wholesalerColumns = await queryInterface.describeTable("wholesalers");
    if (!wholesalerColumns.name) {
      throw new Error("The wholesalers table is missing its required name column.");
    }
    await ensureIndex(
      queryInterface,
      "wholesalers",
      "uq_wholesalers_name",
      ["name"],
      true,
    );

    const refreshedTables = await queryInterface.showAllTables();
    if (!refreshedTables.includes("wholesaler_shop_access")) {
      await queryInterface.createTable(
        "wholesaler_shop_access",
        {
          id: {
            type: Sequelize.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true,
          },
          wholesaler_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "wholesalers", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          shop_id: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: false,
            references: { model: "shops", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          granted_by: {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          status: {
            type: Sequelize.ENUM("active", "inactive"),
            allowNull: false,
            defaultValue: "active",
          },
          created_at: now(Sequelize),
          updated_at: now(Sequelize),
        },
        { charset: "utf8mb4", collate: "utf8mb4_unicode_ci" },
      );
    }

    let accessColumns = await queryInterface.describeTable(
      "wholesaler_shop_access",
    );
    const accessColumnDefinitions = {
      wholesaler_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      shop_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      granted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("active", "inactive"),
        allowNull: false,
        defaultValue: "active",
      },
      created_at: now(Sequelize),
      updated_at: now(Sequelize),
    };
    for (const [column, definition] of Object.entries(
      accessColumnDefinitions,
    )) {
      if (!accessColumns[column]) {
        await queryInterface.addColumn(
          "wholesaler_shop_access",
          column,
          definition,
        );
      }
    }
    accessColumns = await queryInterface.describeTable(
      "wholesaler_shop_access",
    );
    for (const column of ["wholesaler_id", "shop_id", "granted_by"]) {
      if (accessColumns[column].type.toLowerCase() !== "int unsigned") {
        throw new Error(
          `wholesaler_shop_access.${column} has an incompatible type; expected INT UNSIGNED.`,
        );
      }
    }

    await ensureIndex(
      queryInterface,
      "wholesaler_shop_access",
      "uq_access_shop_wholesaler",
      ["shop_id", "wholesaler_id"],
      true,
    );
    await ensureForeignKey(
      queryInterface,
      "wholesaler_shop_access",
      "wholesaler_id",
      "wholesalers",
    );
    await ensureForeignKey(
      queryInterface,
      "wholesaler_shop_access",
      "shop_id",
      "shops",
    );
    await ensureForeignKey(
      queryInterface,
      "wholesaler_shop_access",
      "granted_by",
      "users",
    );
  },

  async down(queryInterface) {
    const accessColumns = await queryInterface.describeTable(
      "wholesaler_shop_access",
    );
    if (accessColumns.status) {
      await queryInterface.removeColumn("wholesaler_shop_access", "status");
    }
  },
};
