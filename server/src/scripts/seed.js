// Seeds ONLY the initial Super Admin and essential reference data (shop categories, attributes).
// Shop owners are never seeded: they are created by Super Admin -> Create Shop.
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const {
  sequelize,
  User,
  ShopCategory,
  CommissionSetting,
  Category,
  Subcategory,
  Brand,
  Attribute,
  AttributeValue,
} = require('../models');

const DEFAULT_SHOP_CATEGORIES = ['Grocery', 'Electronics', 'Apparel', 'Pharmacy', 'Home & Kitchen', 'General Store'];

const DEFAULT_ATTRIBUTES = [
  { name: 'Size', code: 'size', values: ['S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'Color', code: 'color', values: ['Black', 'White', 'Blue', 'Red', 'Green'] },
  { name: 'Storage Capacity', code: 'storage', values: ['64GB', '128GB', '256GB', '512GB', '1TB'] },
  { name: 'Weight', code: 'weight', values: ['250g', '500g', '1kg', '2kg', '5kg'] },
  { name: 'Pack Size', code: 'pack_size', values: ['Pack of 1', 'Pack of 2', 'Pack of 5', 'Pack of 10'] },
];

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = process.env.SUPER_ADMIN_PASSWORD || '';
  const name = process.env.SUPER_ADMIN_NAME || 'Platform Admin';
  if (!email || pw.length < 10) {
    throw new Error('Set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD (min 10 characters) in server/.env');
  }

  await sequelize.authenticate();

  let adminUser = await User.unscoped().findOne({ where: { email } });
  if (adminUser) {
    console.log(`Super Admin ${email} already exists; leaving it unchanged.`);
  } else {
    adminUser = await User.create({
      name,
      email,
      role: 'super_admin',
      status: 'active',
      passwordHash: await bcrypt.hash(pw, env.bcryptRounds),
      emailVerifiedAt: new Date(),
    });
    console.log(`Created Super Admin ${email}`);
  }

  for (const catName of DEFAULT_SHOP_CATEGORIES) {
    await ShopCategory.findOrCreate({ where: { name: catName } });
  }
  console.log(`Shop categories ready (${DEFAULT_SHOP_CATEGORIES.length}).`);

  // Default Commission Setting (5%)
  const commCount = await CommissionSetting.count();
  if (commCount === 0) {
    await CommissionSetting.create({
      percentage: 5.0,
      minOrderAmount: 0.0,
      notes: 'Initial default platform commission',
      updatedBy: adminUser.id,
    });
    console.log('Default platform commission setting initialized (5%).');
  }

  // Default Catalog Attributes & Values
  for (const attrDef of DEFAULT_ATTRIBUTES) {
    const [attr] = await Attribute.findOrCreate({
      where: { code: attrDef.code },
      defaults: { name: attrDef.name, code: attrDef.code },
    });
    for (const val of attrDef.values) {
      await AttributeValue.findOrCreate({
        where: { attributeId: attr.id, value: val },
        defaults: { attributeId: attr.id, value: val },
      });
    }
  }
  console.log('Standard product attributes & values ready.');

  await sequelize.close();
}

main().catch(async (err) => {
  console.error(`Seed failed: ${err.message}`);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
