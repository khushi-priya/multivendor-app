const { Op } = require("sequelize");
const {
  Category,
  Subcategory,
  Brand,
  Attribute,
  AttributeValue,
  Product,
  ProductVariant,
  ProductVariantValue,
  ProductImage,
  SellerListing,
  Inventory,
} = require("../models");
const { AppError } = require("../utils/errors");

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

async function listCategories(includeInactive = false) {
  const where = includeInactive ? {} : { isActive: true };
  return Category.findAll({
    where,
    include: [
      {
        model: Subcategory,
        as: "subcategories",
        where: includeInactive ? {} : { isActive: true },
        required: false,
      },
    ],
    order: [
      ["name", "ASC"],
      [{ model: Subcategory, as: "subcategories" }, "name", "ASC"],
    ],
  });
}

async function listBrands(includeInactive = false) {
  const where = includeInactive ? {} : { isActive: true };
  return Brand.findAll({ where, order: [["name", "ASC"]] });
}

async function listAttributes() {
  return Attribute.findAll({
    include: [{ model: AttributeValue, as: "values" }],
    order: [
      ["name", "ASC"],
      [{ model: AttributeValue, as: "values" }, "value", "ASC"],
    ],
  });
}

async function getProductWithDetails(productId, shopId = null) {
  const product = await Product.findByPk(productId, {
    include: [
      { model: Category, as: "category" },
      { model: Subcategory, as: "subcategory" },
      { model: Brand, as: "brand" },
      { model: ProductImage, as: "images" },
      {
        model: ProductVariant,
        as: "variants",
        include: [
          {
            model: ProductVariantValue,
            as: "variantValues",
            include: [
              { model: Attribute, as: "attribute" },
              { model: AttributeValue, as: "attributeValue" },
            ],
          },
        ],
      },
    ],
  });

  if (!product) return null;

  const json = product.toJSON();

  // If a shopId is provided, attach shop-specific listing & inventory
  if (shopId) {
    const variantIds = json.variants.map((v) => v.id);
    const [listings, stockRows] = await Promise.all([
      SellerListing.findAll({ where: { shopId, productVariantId: variantIds } }),
      Inventory.findAll({ where: { shopId, productVariantId: variantIds } }),
    ]);

    const listingMap = Object.fromEntries(listings.map((l) => [l.productVariantId, l]));
    const stockMap = Object.fromEntries(stockRows.map((s) => [s.productVariantId, s]));

    json.variants = json.variants.map((v) => ({
      ...v,
      sellerListing: listingMap[v.id] || null,
      inventory: stockMap[v.id] || { quantity: 0, lowStockThreshold: 5 },
    }));
  }

  return json;
}

module.exports = {
  slugify,
  listCategories,
  listBrands,
  listAttributes,
  getProductWithDetails,
};
