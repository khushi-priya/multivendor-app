
/*
 * Catalog Seeder
 * Creates 200 products across 6 departments.
 *
 * Run from your backend project.
 *
 * IMPORTANT:
 * Adjust the models import path if your models file
 * is located somewhere else.
 */

const db = require("../models");

const {
  sequelize,
  Shop,
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
} = db;

const slugify = (value) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const hash = (value) => {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
};

const priceFor = (category, index) => {
  const ranges = {
    Clothing: [199, 2499],
    Grocery: [25, 999],
    Footwear: [299, 3999],
    Electronics: [199, 49999],
    Pharmacy: [20, 1999],
    Stationery: [10, 999],
  };

  const [min, max] = ranges[category];
  return Math.round(min + (hash(`${category}-${index}`) % (max - min + 1)));
};

const departments = [
  {
    name: "Clothing",
    subcategories: [
      { name: "Men's Shirt", group: "mens" },
      { name: "Men's T-Shirt", group: "mens" },
      { name: "Men's Jeans", group: "waist" },
      { name: "Men's Trouser", group: "waist" },
      { name: "Men's Socks", group: "free" },
      { name: "Women's Top", group: "womens" },
      { name: "Women's Kurti", group: "womens" },
      { name: "Women's Palazzo", group: "womens" },
      { name: "Kids' Suit", group: "kids" },
    ],
    brands: ["H&M", "Zudio", "Lee", "Sparky"],
    descriptors: [
      "Classic", "Premium", "Casual", "Slim Fit", "Regular Fit", "Trendy",
    ],
  },
  {
    name: "Grocery",
    subcategories: [
      { name: "Rice", group: "grocery" },
      { name: "Atta & Flour", group: "grocery" },
      { name: "Cooking Oil", group: "grocery" },
      { name: "Pulses & Dal", group: "grocery" },
      { name: "Snacks", group: "grocery" },
      { name: "Beverages", group: "grocery" },
      { name: "Dairy Products", group: "grocery" },
      { name: "Spices", group: "grocery" },
    ],
    brands: [
      "Tata Sampann", "Aashirvaad", "Fortune", "Amul", "Haldiram's",
    ],
    descriptors: [
      "Premium", "Organic", "Daily Use", "Family Pack", "Classic",
    ],
  },
  {
    name: "Footwear",
    subcategories: [
      { name: "Men's Shoes", group: "footwear" },
      { name: "Women's Shoes", group: "footwear" },
      { name: "Sandals", group: "footwear" },
      { name: "Slippers", group: "footwear" },
      { name: "Sports Shoes", group: "footwear" },
      { name: "Kids' Shoes", group: "footwear" },
    ],
    brands: ["Bata", "Campus", "Sparx", "Liberty"],
    descriptors: [
      "Casual", "Comfort", "Sports", "Classic", "Lightweight",
    ],
  },
  {
    name: "Electronics",
    subcategories: [
      { name: "Mobiles", group: "electronics" },
      { name: "Laptops", group: "electronics" },
      { name: "Headphones", group: "electronics" },
      { name: "Chargers", group: "electronics" },
      { name: "Smart Watches", group: "electronics" },
      { name: "Speakers", group: "electronics" },
    ],
    brands: ["boAt", "Samsung", "Xiaomi", "HP", "Dell", "Lenovo"],
    descriptors: [
      "Essential", "Pro", "Wireless", "Smart", "Portable",
    ],
  },
  {
    name: "Pharmacy",
    subcategories: [
      { name: "Personal Care", group: "pharmacy" },
      { name: "First Aid", group: "pharmacy" },
      { name: "Healthcare Devices", group: "pharmacy" },
      { name: "Wellness Products", group: "pharmacy" },
      { name: "Hygiene Products", group: "pharmacy" },
    ],
    brands: ["Dettol", "Himalaya", "Dabur", "Dr. Morepen"],
    descriptors: [
      "Daily Care", "Family Pack", "Essential", "Gentle", "Standard",
    ],
  },
  {
    name: "Stationery",
    subcategories: [
      { name: "Notebooks", group: "stationery" },
      { name: "Pens", group: "stationery" },
      { name: "Pencils", group: "stationery" },
      { name: "Files & Folders", group: "stationery" },
      { name: "Art Supplies", group: "stationery" },
    ],
    brands: ["Classmate", "Camlin", "Cello", "Faber-Castell"],
    descriptors: [
      "Classic", "Premium", "Student", "Professional", "Value Pack",
    ],
  },
];

const attributeDefinitions = {
  color: {
    name: "Color",
    values: ["Red", "Black", "Blue", "White", "Green", "Grey"],
  },
  size: {
    name: "Size",
    values: [
      "S", "M", "L", "XL", "XXL",
      "28", "30", "32", "34", "36", "38", "40",
      "Free Size", "0", "20", "22", "24", "26",
      "6", "7", "8", "9", "10",
    ],
  },
  pack_size: {
    name: "Pack Size",
    values: [
      "100g", "200g", "250g", "500g", "1kg",
      "2kg", "5kg", "1 Pack", "2 Pack", "5 Pack",
      "100ml", "200ml", "500ml", "1 Litre",
    ],
  },
  storage: {
    name: "Storage",
    values: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
  },
};

function variantsFor(group, index) {
  const colors = ["Red", "Black", "Blue"];

  if (["mens", "womens", "kids", "waist", "free"].includes(group)) {
    const sizes = {
      mens: ["S", "M", "L", "XL", "XXL"],
      womens: ["S", "M", "L", "XL", "Free Size"],
      waist: ["28", "30", "32", "34", "36", "38", "40"],
      free: ["Free Size"],
      kids: ["0", "20", "22", "24", "26"],
    }[group];

    const result = [];
    const selectedColors = colors.slice(0, 2 + (index % 2));

    for (const color of selectedColors) {
      for (const size of sizes) {
        result.push({ color, size });
      }
    }
    return result;
  }

  if (group === "footwear") {
    return ["6", "7", "8", "9", "10"].map((size, i) => ({
      color: colors[i % 3],
      size,
    }));
  }

  if (group === "electronics") {
    return ["64GB", "128GB", "256GB"].map((storage) => ({ storage }));
  }

  if (group === "grocery") {
    return ["500g", "1kg", "5kg"].map((pack_size) => ({ pack_size }));
  }

  if (group === "pharmacy") {
    return ["1 Pack", "100ml", "200ml"].map((pack_size) => ({ pack_size }));
  }

  return ["1 Pack", "2 Pack", "5 Pack"].map((pack_size) => ({
    pack_size,
  }));
}

async function getOrCreateAttribute(code, transaction) {
  const definition = attributeDefinitions[code];

  const [attribute] = await Attribute.findOrCreate({
    where: { code },
    defaults: {
      name: definition.name,
      code,
      isActive: true,
    },
    transaction,
  });

  const values = {};

  for (const value of definition.values) {
    const [record] = await AttributeValue.findOrCreate({
      where: {
        attributeId: attribute.id,
        value,
      },
      defaults: {
        attributeId: attribute.id,
        value,
      },
      transaction,
    });

    values[value] = record.id;
  }

  return { attribute, values };
}

async function seedCatalog() {
  const transaction = await sequelize.transaction();

  try {
    // Use SEED_SHOP_ID if supplied, otherwise first active shop.
    const shop = process.env.SEED_SHOP_ID
      ? await Shop.findByPk(process.env.SEED_SHOP_ID, { transaction })
      : await Shop.findOne({
          where: { status: "active" },
          order: [["id", "ASC"]],
          transaction,
        });

    if (!shop || shop.status !== "active") {
      throw new Error(
        "No active shop found. Create a shop or set SEED_SHOP_ID.",
      );
    }

    console.log(`Seeding catalog for shop: ${shop.name} (${shop.id})`);

    // 1. Categories and subcategories.
    const categoryRecords = {};
    const subcategoryRecords = {};

    for (const department of departments) {
      const [category] = await Category.findOrCreate({
        where: { slug: slugify(department.name) },
        defaults: {
          name: department.name,
          slug: slugify(department.name),
          description: `${department.name} products`,
          imageUrl: `https://placehold.co/600x600?text=${encodeURIComponent(department.name)}`,
          isActive: true,
          submissionStatus: null,
          submittedByShopId: null,
        },
        transaction,
      });

      categoryRecords[department.name] = category;

      for (const sub of department.subcategories) {
        const slug = slugify(sub.name);

        const [subcategory] = await Subcategory.findOrCreate({
          where: {
            categoryId: category.id,
            slug,
          },
          defaults: {
            categoryId: category.id,
            name: sub.name,
            slug,
            description: `${sub.name} products`,
            imageUrl: `https://placehold.co/600x600?text=${encodeURIComponent(sub.name)}`,
            isActive: true,
            submissionStatus: null,
            submittedByShopId: null,
          },
          transaction,
        });

        subcategoryRecords[`${department.name}:${sub.name}`] = {
          record: subcategory,
          group: sub.group,
        };
      }
    }

    // 2. Brands.
    const brandRecords = {};

    for (const department of departments) {
      for (const name of department.brands) {
        const [brand] = await Brand.findOrCreate({
          where: { name },
          defaults: {
            name,
            description: `${name} brand`,
            imageUrl: `https://placehold.co/300x300?text=${encodeURIComponent(name)}`,
            isActive: true,
            submissionStatus: null,
            submittedByShopId: null,
          },
          transaction,
        });

        brandRecords[name] = brand;
      }
    }

    // 3. Attributes and values.
    const attributeRecords = {};

    for (const code of Object.keys(attributeDefinitions)) {
      attributeRecords[code] = await getOrCreateAttribute(
        code,
        transaction,
      );
    }

    // 4. Generate exactly 200 product definitions.
    const productDefinitions = [];

    for (const department of departments) {
      let localIndex = 0;

      for (const sub of department.subcategories) {
        for (const descriptor of department.descriptors) {
          // Clothing has 50 products; other departments use their
          // exact allocated totals.
          const target = {
            Clothing: 50,
            Grocery: 40,
            Footwear: 30,
            Electronics: 30,
            Pharmacy: 25,
            Stationery: 25,
          }[department.name];

          if (localIndex >= target) break;

          productDefinitions.push({
            department,
            subcategory: sub,
            name: `${descriptor} ${sub.name}`,
            index: localIndex,
          });

          localIndex++;
        }

        if (localIndex >= {
          Clothing: 50,
          Grocery: 40,
          Footwear: 30,
          Electronics: 30,
          Pharmacy: 25,
          Stationery: 25,
        }[department.name]) break;
      }

      // Continue generating names if the subcategory/descriptor
      // combination did not reach the requested department total.
      const target = {
        Clothing: 50,
        Grocery: 40,
        Footwear: 30,
        Electronics: 30,
        Pharmacy: 25,
        Stationery: 25,
      }[department.name];

      while (localIndex < target) {
        const sub = department.subcategories[
          localIndex % department.subcategories.length
        ];

        productDefinitions.push({
          department,
          subcategory: sub,
          name: `${department.name} Collection ${localIndex + 1} - ${sub.name}`,
          index: localIndex,
        });

        localIndex++;
      }
    }

    if (productDefinitions.length !== 200) {
      throw new Error(
        `Expected 200 products, generated ${productDefinitions.length}`,
      );
    }

    // 5. Products, variants, images, listings and inventory.
    let totalVariants = 0;
    let totalListings = 0;
    let totalInventory = 0;

    for (let i = 0; i < productDefinitions.length; i++) {
      const definition = productDefinitions[i];
      const { department, subcategory, name, index } = definition;

      const category = categoryRecords[department.name];

      const subcategoryData =
        subcategoryRecords[`${department.name}:${subcategory.name}`];

      const brandName =
        department.brands[i % department.brands.length];

      const brand = brandRecords[brandName];

      const productSku =
        `SEED-${slugify(department.name).toUpperCase()}-${String(i + 1).padStart(4, "0")}`;

      const basePrice = priceFor(department.name, i);

      const [product] = await Product.findOrCreate({
        where: { sku: productSku },
        defaults: {
          name,
          sku: productSku,
          categoryId: category.id,
          subcategoryId: subcategoryData.record.id,
          brandId: brand.id,
          description:
            `${name} from ${brandName}. Quality ${department.name.toLowerCase()} product for everyday use. Suitable for regular shopping and online orders.`,
          basePrice,
          weight: 0.5,
          weightUnit: "kg",
          isActive: true,
        },
        transaction,
      });

      // Product image.
      const imageUrl =
        `https://placehold.co/600x600?text=${encodeURIComponent(name)}`;

      await ProductImage.findOrCreate({
        where: {
          productId: product.id,
          imageUrl,
        },
        defaults: {
          productId: product.id,
          imageUrl,
          isPrimary: true,
          sortOrder: 0,
        },
        transaction,
      });

      // Variant definitions.
      const variants = variantsFor(subcategoryData.group, i);

      for (let j = 0; j < variants.length; j++) {
        const variantData = variants[j];

        const variantName = Object.entries(variantData)
          .map(([key, value]) => {
            const label = {
              color: "Color",
              size: "Size",
              storage: "Storage",
              pack_size: "Pack",
            }[key];

            return `${label}: ${value}`;
          })
          .join(" / ");

        const variantSku =
          `${productSku}-V${String(j + 1).padStart(3, "0")}`;

        const variantPrice = Number(
          (basePrice * (1 + (j % 4) * 0.05)).toFixed(2),
        );

        const [variant] = await ProductVariant.findOrCreate({
          where: { sku: variantSku },
          defaults: {
            productId: product.id,
            sku: variantSku,
            variantName,
            price: variantPrice,
            wholesalePrice: Number((variantPrice * 0.7).toFixed(2)),
            weight: 0.5,
            weightUnit: "kg",
            isActive: true,
          },
          transaction,
        });

        totalVariants++;

        // Connect variant to attribute values.
        for (const [code, value] of Object.entries(variantData)) {
          const attributeData = attributeRecords[code];

          const attributeValueId = attributeData.values[value];

          if (!attributeValueId) {
            throw new Error(`Missing attribute value: ${code}=${value}`);
          }

          const [variantValue] =
            await ProductVariantValue.findOrCreate({
              where: {
                productVariantId: variant.id,
                attributeId: attributeData.attribute.id,
                attributeValueId,
              },
              defaults: {
                productVariantId: variant.id,
                attributeId: attributeData.attribute.id,
                attributeValueId,
              },
              transaction,
            });
        }

        // Seller listing for this shop.
        const listing = await SellerListing.findOne({
          where: {
            shopId: shop.id,
            productVariantId: variant.id,
          },
          transaction,
        });

        if (!listing) {
          await SellerListing.create(
            {
              shopId: shop.id,
              productId: product.id,
              productVariantId: variant.id,
              customSku: `SHOP-${shop.id}-${variantSku}`,
              retailPrice: variantPrice,
              gstApplicable: true,
              gstRate: 5,
              priceIncludesGst: true,
              hsnCode: null,
              isActive: true,
            },
            { transaction },
          );

          totalListings++;
        }

        // Inventory.
        const inventory = await Inventory.findOne({
          where: {
            shopId: shop.id,
            productVariantId: variant.id,
          },
          transaction,
        });

        if (!inventory) {
          const stockOptions = [0, 2, 5, 12, 25, 40, 80];
          const quantity = stockOptions[
            hash(variantSku) % stockOptions.length
          ];

          await Inventory.create(
            {
              shopId: shop.id,
              productId: product.id,
              productVariantId: variant.id,
              quantity,
              lowStockThreshold: 5,
            },
            { transaction },
          );

          totalInventory++;
        }
      }

      if ((i + 1) % 25 === 0) {
        console.log(`Prepared ${i + 1}/200 products`);
      }
    }

    await transaction.commit();

    console.log("\n========== CATALOG SEED COMPLETE ==========");
    console.log("Shop:", shop.name);
    console.log("Products prepared:", productDefinitions.length);
    console.log("Variants prepared:", totalVariants);
    console.log("New seller listings:", totalListings);
    console.log("New inventory rows:", totalInventory);
    console.log("Categories:", departments.length);
    console.log("============================================\n");
  } catch (error) {
    await transaction.rollback();
    console.error("Catalog seeding failed:", error);
    throw error;
  }
}

seedCatalog()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
