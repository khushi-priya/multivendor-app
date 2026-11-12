
// const db = require("../models");

// const {
//   sequelize,
//   Shop,
//   Category,
//   Subcategory,
//   Brand,
//   Attribute,
//   AttributeValue,
//   Product,
//   ProductVariant,
//   ProductVariantValue,
//   ProductImage,
//   SellerListing,
//   Inventory,
// } = db;

// const slugify = (value) =>
//   value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// const hash = (value) => {
//   let h = 0;
//   for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
//   return h;
// };

// const priceFor = (category, index) => {
//   const ranges = {
//     Clothing: [199, 2499],
//     Grocery: [25, 999],
//     Footwear: [299, 3999],
//     Electronics: [199, 49999],
//     Pharmacy: [20, 1999],
//     Stationery: [10, 999],
//   };

//   const [min, max] = ranges[category];
//   return Math.round(min + (hash(`${category}-${index}`) % (max - min + 1)));
// };

// // ------------------------------------------------------
// // REAL PRODUCT IMAGE SOURCES
// // ------------------------------------------------------

// const PRODUCT_IMAGES = {
//   Clothing: [
//     "photo-1521572163474-6864f9cf17ab",
//     "photo-1523381210434-271e8be1f52b",
//     "photo-1598033129183-c4f50c736f10",
//     "photo-1489987707025-afc232f7ea0f",
//     "photo-1434389677669-e08b4cac3105",
//   ],

//   Grocery: [
//     "photo-1542838132-92c53300491e",
//     "photo-1547592180-85f173990554",
//     "photo-1604719312566-8912e9c8a213",
//     "photo-1540420773420-3366772f4999",
//   ],

//   Footwear: [
//     "photo-1542291026-7eec264c27ff",
//     "photo-1549298916-b41d501d3772",
//     "photo-1460353581641-37baddab0fa2",
//     "photo-1495555961986-6d4c1ecb7be3",
//   ],

//   Electronics: [
//     "photo-1511709268805-936d6aade4d8",
//     "photo-1496181133206-80ce9b88a853",
//     "photo-1505740420928-5e560c06d30e",
//     "photo-1523275335684-37898b6baf30",
//   ],

//   Pharmacy: [
//     "photo-1556228578-0d85b1a4d571",
//     "photo-1603398938378-e54eab446bdd",
//     "photo-1584308666744-24d5c474f2ae",
//     "photo-1576091160399-112ba8d25d1d",
//   ],

//   Stationery: [
//     "photo-1455390582262-044c272f2d2b",
//     "photo-1513475382585-d06e58bcb0e0",
//     "photo-1453738773917-9c3eff1db985",
//     "photo-1452860606245-08befc0ff44b",
//   ],
// };

// function getProductImageUrl(departmentName, index = 0) {
//   const images = PRODUCT_IMAGES[departmentName];

//   if (!images || images.length === 0) {
//     throw new Error(`No product images configured for ${departmentName}`);
//   }

//   const photoId = images[Math.abs(index) % images.length];

//   return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=85`;
// }

// const departments = [
//   {
//     name: "Clothing",
//     subcategories: [
//       { name: "Men's Shirt", group: "mens" },
//       { name: "Men's T-Shirt", group: "mens" },
//       { name: "Men's Jeans", group: "waist" },
//       { name: "Men's Trouser", group: "waist" },
//       { name: "Men's Socks", group: "free" },
//       { name: "Women's Top", group: "womens" },
//       { name: "Women's Kurti", group: "womens" },
//       { name: "Women's Palazzo", group: "womens" },
//       { name: "Kids' Suit", group: "kids" },
//     ],
//     brands: ["H&M", "Zudio", "Lee", "Sparky"],
//     descriptors: [
//       "Classic", "Premium", "Casual", "Slim Fit", "Regular Fit", "Trendy",
//     ],
//   },
//   {
//     name: "Grocery",
//     subcategories: [
//       { name: "Rice", group: "grocery" },
//       { name: "Atta & Flour", group: "grocery" },
//       { name: "Cooking Oil", group: "grocery" },
//       { name: "Pulses & Dal", group: "grocery" },
//       { name: "Snacks", group: "grocery" },
//       { name: "Beverages", group: "grocery" },
//       { name: "Dairy Products", group: "grocery" },
//       { name: "Spices", group: "grocery" },
//     ],
//     brands: [
//       "Tata Sampann", "Aashirvaad", "Fortune", "Amul", "Haldiram's",
//     ],
//     descriptors: [
//       "Premium", "Organic", "Daily Use", "Family Pack", "Classic",
//     ],
//   },
//   {
//     name: "Footwear",
//     subcategories: [
//       { name: "Men's Shoes", group: "footwear" },
//       { name: "Women's Shoes", group: "footwear" },
//       { name: "Sandals", group: "footwear" },
//       { name: "Slippers", group: "footwear" },
//       { name: "Sports Shoes", group: "footwear" },
//       { name: "Kids' Shoes", group: "footwear" },
//     ],
//     brands: ["Bata", "Campus", "Sparx", "Liberty"],
//     descriptors: [
//       "Casual", "Comfort", "Sports", "Classic", "Lightweight",
//     ],
//   },
//   {
//     name: "Electronics",
//     subcategories: [
//       { name: "Mobiles", group: "electronics" },
//       { name: "Laptops", group: "electronics" },
//       { name: "Headphones", group: "electronics" },
//       { name: "Chargers", group: "electronics" },
//       { name: "Smart Watches", group: "electronics" },
//       { name: "Speakers", group: "electronics" },
//     ],
//     brands: ["boAt", "Samsung", "Xiaomi", "HP", "Dell", "Lenovo"],
//     descriptors: [
//       "Essential", "Pro", "Wireless", "Smart", "Portable",
//     ],
//   },
//   {
//     name: "Pharmacy",
//     subcategories: [
//       { name: "Personal Care", group: "pharmacy" },
//       { name: "First Aid", group: "pharmacy" },
//       { name: "Healthcare Devices", group: "pharmacy" },
//       { name: "Wellness Products", group: "pharmacy" },
//       { name: "Hygiene Products", group: "pharmacy" },
//     ],
//     brands: ["Dettol", "Himalaya", "Dabur", "Dr. Morepen"],
//     descriptors: [
//       "Daily Care", "Family Pack", "Essential", "Gentle", "Standard",
//     ],
//   },
//   {
//     name: "Stationery",
//     subcategories: [
//       { name: "Notebooks", group: "stationery" },
//       { name: "Pens", group: "stationery" },
//       { name: "Pencils", group: "stationery" },
//       { name: "Files & Folders", group: "stationery" },
//       { name: "Art Supplies", group: "stationery" },
//     ],
//     brands: ["Classmate", "Camlin", "Cello", "Faber-Castell"],
//     descriptors: [
//       "Classic", "Premium", "Student", "Professional", "Value Pack",
//     ],
//   },
// ];

// const departmentTargets = {
//   Clothing: 50,
//   Grocery: 40,
//   Footwear: 30,
//   Electronics: 30,
//   Pharmacy: 25,
//   Stationery: 25,
// };

// const attributeDefinitions = {
//   color: {
//     name: "Color",
//     values: ["Red", "Black", "Blue", "White", "Green", "Grey"],
//   },
//   size: {
//     name: "Size",
//     values: [
//       "S", "M", "L", "XL", "XXL",
//       "28", "30", "32", "34", "36", "38", "40",
//       "Free Size", "0", "20", "22", "24", "26",
//       "6", "7", "8", "9", "10",
//     ],
//   },
//   pack_size: {
//     name: "Pack Size",
//     values: [
//       "100g", "200g", "250g", "500g", "1kg",
//       "2kg", "5kg", "1 Pack", "2 Pack", "5 Pack",
//       "100ml", "200ml", "500ml", "1 Litre",
//     ],
//   },
//   storage: {
//     name: "Storage",
//     values: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"],
//   },
// };

// function variantsFor(group, index) {
//   const colors = ["Red", "Black", "Blue"];

//   if (["mens", "womens", "kids", "waist", "free"].includes(group)) {
//     const sizes = {
//       mens: ["S", "M", "L", "XL", "XXL"],
//       womens: ["S", "M", "L", "XL", "Free Size"],
//       waist: ["28", "30", "32", "34", "36", "38", "40"],
//       free: ["Free Size"],
//       kids: ["0", "20", "22", "24", "26"],
//     }[group];

//     const result = [];
//     const selectedColors = colors.slice(0, 2 + (index % 2));

//     for (const color of selectedColors) {
//       for (const size of sizes) {
//         result.push({ color, size });
//       }
//     }

//     return result;
//   }

//   if (group === "footwear") {
//     return ["6", "7", "8", "9", "10"].map((size, i) => ({
//       color: colors[i % 3],
//       size,
//     }));
//   }

//   if (group === "electronics") {
//     return ["64GB", "128GB", "256GB"].map((storage) => ({ storage }));
//   }

//   if (group === "grocery") {
//     return ["500g", "1kg", "5kg"].map((pack_size) => ({ pack_size }));
//   }

//   if (group === "pharmacy") {
//     return ["1 Pack", "100ml", "200ml"].map((pack_size) => ({ pack_size }));
//   }

//   return ["1 Pack", "2 Pack", "5 Pack"].map((pack_size) => ({
//     pack_size,
//   }));
// }

// async function getOrCreateAttribute(code, transaction) {
//   const definition = attributeDefinitions[code];

//   const [attribute] = await Attribute.findOrCreate({
//     where: { code },
//     defaults: {
//       name: definition.name,
//       code,
//       isActive: true,
//     },
//     transaction,
//   });

//   const values = {};

//   for (const value of definition.values) {
//     const [record] = await AttributeValue.findOrCreate({
//       where: {
//         attributeId: attribute.id,
//         value,
//       },
//       defaults: {
//         attributeId: attribute.id,
//         value,
//       },
//       transaction,
//     });

//     values[value] = record.id;
//   }

//   return { attribute, values };
// }

// // ------------------------------------------------------
// // IMAGE UPDATE HELPERS
// // ------------------------------------------------------

// async function updateCategoryImage(category, departmentName, transaction) {
//   const currentImage = category.imageUrl || "";

//   // Do not overwrite manually uploaded images.
//   if (!currentImage || currentImage.includes("placehold.co")) {
//     await category.update(
//       {
//         imageUrl: getProductImageUrl(departmentName, 0),
//       },
//       { transaction },
//     );
//   }
// }

// async function updateSubcategoryImage(
//   subcategory,
//   departmentName,
//   index,
//   transaction,
// ) {
//   const currentImage = subcategory.imageUrl || "";

//   // Do not overwrite manually uploaded images.
//   if (!currentImage || currentImage.includes("placehold.co")) {
//     await subcategory.update(
//       {
//         imageUrl: getProductImageUrl(departmentName, index),
//       },
//       { transaction },
//     );
//   }
// }

// async function updateProductImages(
//   product,
//   departmentName,
//   index,
//   transaction,
// ) {
//   const existingImages = await ProductImage.findAll({
//     where: { productId: product.id },
//     order: [
//       ["isPrimary", "DESC"],
//       ["sortOrder", "ASC"],
//     ],
//     transaction,
//   });

//   const placeholderImages = existingImages.filter((image) =>
//     (image.imageUrl || "").includes("placehold.co"),
//   );

//   if (placeholderImages.length > 0) {
//     // Replace existing placeholder records.
//     for (let i = 0; i < placeholderImages.length; i++) {
//       await placeholderImages[i].update(
//         {
//           imageUrl: getProductImageUrl(departmentName, index + i),
//           isPrimary: i === 0,
//           sortOrder: i,
//         },
//         { transaction },
//       );
//     }

//     return;
//   }

//   // Preserve any existing manually uploaded image.
//   if (existingImages.length > 0) {
//     return;
//   }

//   // Create an image only when the product has no image.
//   await ProductImage.create(
//     {
//       productId: product.id,
//       imageUrl: getProductImageUrl(departmentName, index),
//       isPrimary: true,
//       sortOrder: 0,
//     },
//     { transaction },
//   );
// }

// // ------------------------------------------------------
// // MAIN SEEDER
// // ------------------------------------------------------

// async function seedCatalog() {
//   const transaction = await sequelize.transaction();

//   try {
//     const shops = await Shop.findAll({
//       where: { status: "active" },
//       order: [["id", "ASC"]],
//       transaction,
//     });
//     const requestedShopId = process.env.SEED_SHOP_ID
//       ? Number(process.env.SEED_SHOP_ID)
//       : null;
//     if (
//       !shops.length ||
//       (process.env.SEED_SHOP_ID &&
//         (!Number.isInteger(requestedShopId) ||
//           !shops.some((shop) => Number(shop.id) === requestedShopId)))
//     ) {
//       throw new Error(
//         "No active shop found, or SEED_SHOP_ID is not an active shop. Create shops before seeding.",
//       );
//     }

//     console.log(`Seeding seller listings for ${shops.length} active shop(s).`);

//     // 1. Categories and subcategories.
//     const categoryRecords = {};
//     const subcategoryRecords = {};

//     for (const department of departments) {
//       const [category] = await Category.findOrCreate({
//         where: { slug: slugify(department.name) },
//         defaults: {
//           name: department.name,
//           slug: slugify(department.name),
//           description: `${department.name} products`,
//           imageUrl: getProductImageUrl(department.name, 0),
//           isActive: true,
//           submissionStatus: null,
//           submittedByShopId: null,
//         },
//         transaction,
//       });

//       await updateCategoryImage(
//         category,
//         department.name,
//         transaction,
//       );

//       categoryRecords[department.name] = category;

//       for (let subIndex = 0; subIndex < department.subcategories.length; subIndex++) {
//         const sub = department.subcategories[subIndex];
//         const slug = slugify(sub.name);

//         const [subcategory] = await Subcategory.findOrCreate({
//           where: {
//             categoryId: category.id,
//             slug,
//           },
//           defaults: {
//             categoryId: category.id,
//             name: sub.name,
//             slug,
//             description: `${sub.name} products`,
//             imageUrl: getProductImageUrl(department.name, subIndex),
//             isActive: true,
//             submissionStatus: null,
//             submittedByShopId: null,
//           },
//           transaction,
//         });

//         await updateSubcategoryImage(
//           subcategory,
//           department.name,
//           subIndex,
//           transaction,
//         );

//         subcategoryRecords[`${department.name}:${sub.name}`] = {
//           record: subcategory,
//           group: sub.group,
//         };
//       }
//     }

//     // 2. Brands.
//     const brandRecords = {};

//     for (const department of departments) {
//       for (const name of department.brands) {
//         const [brand] = await Brand.findOrCreate({
//           where: { name },
//           defaults: {
//             name,
//             description: `${name} brand`,
//             imageUrl: `https://placehold.co/300x300?text=${encodeURIComponent(name)}`,
//             isActive: true,
//             submissionStatus: null,
//             submittedByShopId: null,
//           },
//           transaction,
//         });

//         brandRecords[name] = brand;
//       }
//     }

//     // 3. Attributes and values.
//     const attributeRecords = {};

//     for (const code of Object.keys(attributeDefinitions)) {
//       attributeRecords[code] = await getOrCreateAttribute(
//         code,
//         transaction,
//       );
//     }

//     // 4. Generate exactly 200 product definitions.
//     const productDefinitions = [];

//     for (const department of departments) {
//       let localIndex = 0;
//       const target = departmentTargets[department.name];

//       for (const sub of department.subcategories) {
//         for (const descriptor of department.descriptors) {
//           if (localIndex >= target) break;

//           productDefinitions.push({
//             department,
//             subcategory: sub,
//             name: `${descriptor} ${sub.name}`,
//             index: localIndex,
//           });

//           localIndex++;
//         }

//         if (localIndex >= target) break;
//       }

//       // Continue generating names if combinations did not reach target.
//       while (localIndex < target) {
//         const sub =
//           department.subcategories[
//             localIndex % department.subcategories.length
//           ];

//         productDefinitions.push({
//           department,
//           subcategory: sub,
//           name: `${department.name} Collection ${localIndex + 1} - ${sub.name}`,
//           index: localIndex,
//         });

//         localIndex++;
//       }
//     }

//     if (productDefinitions.length !== 200) {
//       throw new Error(
//         `Expected 200 products, generated ${productDefinitions.length}`,
//       );
//     }

//     // 5. Products, variants, images, listings and inventory.
//     let totalVariants = 0;
//     let totalListings = 0;
//     let totalInventory = 0;
//     let totalImagesUpdated = 0;
//     let totalImagesCreated = 0;

//     for (let i = 0; i < productDefinitions.length; i++) {
//       const definition = productDefinitions[i];
//       const { department, subcategory, name, index } = definition;
//       const assignedShop = shops[i % shops.length];
//       const category = categoryRecords[department.name];

//       const subcategoryData =
//         subcategoryRecords[`${department.name}:${subcategory.name}`];

//       const brandName = name === "Premium Atta & Flour"
//         ? "Tata Sampann"
//         : department.brands[i % department.brands.length];

//       const brand = brandRecords[brandName];

//       const productSku =
//         `SEED-${slugify(department.name).toUpperCase()}-${String(i + 1).padStart(4, "0")}`;

//       const basePrice = priceFor(department.name, i);

//       const [product] = await Product.findOrCreate({
//         where: { sku: productSku },
//         defaults: {
//           name,
//           sku: productSku,
//           categoryId: category.id,
//           subcategoryId: subcategoryData.record.id,
//           brandId: brand.id,
//           description:
//             `${name} from ${brandName}. Quality ${department.name.toLowerCase()} product for everyday use. Suitable for regular shopping and online orders.`,
//           basePrice,
//           weight: 0.5,
//           weightUnit: "kg",
//           isActive: true,
//         },
//         transaction,
//       });
//       if (name === "Premium Atta & Flour" && Number(product.brandId) !== Number(brand.id)) {
//         await product.update({ brandId: brand.id }, { transaction });
//       }

//       // Product image: update placeholders, preserve manual images.
//       const imagesBefore = await ProductImage.findAll({
//         where: { productId: product.id },
//         transaction,
//       });

//       const placeholdersBefore = imagesBefore.filter((image) =>
//         (image.imageUrl || "").includes("placehold.co"),
//       );

//       await updateProductImages(
//         product,
//         department.name,
//         i,
//         transaction,
//       );

//       if (placeholdersBefore.length > 0) {
//         totalImagesUpdated += placeholdersBefore.length;
//       } else if (imagesBefore.length === 0) {
//         totalImagesCreated++;
//       }

//       // Variant definitions.
//       const variants = variantsFor(subcategoryData.group, i);

//       for (let j = 0; j < variants.length; j++) {
//         const variantData = variants[j];

//         const variantName = Object.entries(variantData)
//           .map(([key, value]) => {
//             const label = {
//               color: "Color",
//               size: "Size",
//               storage: "Storage",
//               pack_size: "Pack",
//             }[key];

//             return `${label}: ${value}`;
//           })
//           .join(" / ");

//         const variantSku =
//           `${productSku}-V${String(j + 1).padStart(3, "0")}`;

//         const variantPrice = Number(
//           (basePrice * (1 + (j % 4) * 0.05)).toFixed(2),
//         );

//         const [variant] = await ProductVariant.findOrCreate({
//           where: { sku: variantSku },
//           defaults: {
//             productId: product.id,
//             sku: variantSku,
//             variantName,
//             price: variantPrice,
//             wholesalePrice: Number((variantPrice * 0.7).toFixed(2)),
//             weight: 0.5,
//             weightUnit: "kg",
//             isActive: true,
//           },
//           transaction,
//         });

//         totalVariants++;

//         // Connect variant to attribute values.
//         for (const [code, value] of Object.entries(variantData)) {
//           const attributeData = attributeRecords[code];
//           const attributeValueId = attributeData.values[value];

//           if (!attributeValueId) {
//             throw new Error(`Missing attribute value: ${code}=${value}`);
//           }

//           await ProductVariantValue.findOrCreate({
//             where: {
//               productVariantId: variant.id,
//               attributeId: attributeData.attribute.id,
//               attributeValueId,
//             },
//             defaults: {
//               productVariantId: variant.id,
//               attributeId: attributeData.attribute.id,
//               attributeValueId,
//             },
//             transaction,
//           });
//         }

        
//       for (const [shopIndex, shop] of shops.entries()) {    const listing = await SellerListing.findOne({
//             where: { shopId: shop.id, productVariantId: variant.id },
//             transaction,
//           });
//           if (!listing) {
//             const priceAdjustment = (((shopIndex % 9) - 4) * 0.01);
//             await SellerListing.create(
//               {
//                 shopId: shop.id,
//                 productId: product.id,
//                 productVariantId: variant.id,
//                 customSku: `SHOP-${shop.id}-${variantSku}`,
//                 retailPrice: Number((variantPrice * (1 + priceAdjustment)).toFixed(2)),
//                 gstApplicable: true,
//                 gstRate: 5,
//                 priceIncludesGst: true,
//                 hsnCode: null,
//                 isActive: true,
//               },
//               { transaction },
//             );
//             totalListings++;
//           }

//           const inventory = await Inventory.findOne({
//             where: { shopId: shop.id, productVariantId: variant.id },
//             transaction,
//           });
//           if (!inventory) {
//             const stockOptions = [0, 2, 5, 12, 25, 40, 80];
//             const quantity = stockOptions[
//               hash(`${variantSku}-${shop.id}`) % stockOptions.length
//             ];
//             await Inventory.create(
//               {
//                 shopId: shop.id,
//                 productId: product.id,
//                 productVariantId: variant.id,
//                 quantity,
//                 lowStockThreshold: 5,
//               },
//               { transaction },
//             );
//             totalInventory++;
//           }
//         }
//       }

//       if ((i + 1) % 25 === 0) {
//         console.log(`Prepared ${i + 1}/200 products`);
//       }
//     }

//     await transaction.commit();

//     console.log("\n========== CATALOG SEED COMPLETE ==========");
//     console.log("Shops:", shops.map((shop) => shop.name).join(", "));
//     console.log("Products prepared:", productDefinitions.length);
//     console.log("Variants prepared:", totalVariants);
//     console.log("New seller listings:", totalListings);
//     console.log("New inventory rows:", totalInventory);
//     console.log("Product images updated:", totalImagesUpdated);
//     console.log("Product images created:", totalImagesCreated);
//     console.log("Categories:", departments.length);
//     console.log("============================================\n");
//   } catch (error) {
//     await transaction.rollback();
//     console.error("Catalog seeding failed:", error);
//     throw error;
//   }
// }

// seedCatalog()
//   .then(() => process.exit(0))
//   .catch(() => process.exit(1));



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

// ------------------------------------------------------
// REAL PRODUCT IMAGE SOURCES
// ------------------------------------------------------

const PRODUCT_IMAGES = {
  Clothing: [
    "photo-1521572163474-6864f9cf17ab",
    "photo-1523381210434-271e8be1f52b",
    "photo-1598033129183-c4f50c736f10",
    "photo-1489987707025-afc232f7ea0f",
    "photo-1434389677669-e08b4cac3105",
  ],

  Grocery: [
    "photo-1542838132-92c53300491e",
    "photo-1547592180-85f173990554",
    "photo-1604719312566-8912e9c8a213",
    "photo-1540420773420-3366772f4999",
  ],

  Footwear: [
    "photo-1542291026-7eec264c27ff",
    "photo-1549298916-b41d501d3772",
    "photo-1460353581641-37baddab0fa2",
    "photo-1495555961986-6d4c1ecb7be3",
  ],

  Electronics: [
    "photo-1511709268805-936d6aade4d8",
    "photo-1496181133206-80ce9b88a853",
    "photo-1505740420928-5e560c06d30e",
    "photo-1523275335684-37898b6baf30",
  ],

  Pharmacy: [
    "photo-1556228578-0d85b1a4d571",
    "photo-1603398938378-e54eab446bdd",
    "photo-1584308666744-24d5c474f2ae",
    "photo-1576091160399-112ba8d25d1d",
  ],

  Stationery: [
    "photo-1455390582262-044c272f2d2b",
    "photo-1513475382585-d06e58bcb0e0",
    "photo-1453738773917-9c3eff1db985",
    "photo-1452860606245-08befc0ff44b",
  ],
};

function getProductImageUrl(departmentName, index = 0) {
  const images = PRODUCT_IMAGES[departmentName];

  if (!images || images.length === 0) {
    throw new Error(`No product images configured for ${departmentName}`);
  }

  const photoId = images[Math.abs(index) % images.length];

  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=85`;
}

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

const departmentTargets = {
  Clothing: 50,
  Grocery: 40,
  Footwear: 30,
  Electronics: 30,
  Pharmacy: 25,
  Stationery: 25,
};

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

// ------------------------------------------------------
// IMAGE UPDATE HELPERS
// ------------------------------------------------------

async function updateCategoryImage(category, departmentName, transaction) {
  const currentImage = category.imageUrl || "";

  // Do not overwrite manually uploaded images.
  if (!currentImage || currentImage.includes("placehold.co")) {
    await category.update(
      {
        imageUrl: getProductImageUrl(departmentName, 0),
      },
      { transaction },
    );
  }
}

async function updateSubcategoryImage(
  subcategory,
  departmentName,
  index,
  transaction,
) {
  const currentImage = subcategory.imageUrl || "";

  // Do not overwrite manually uploaded images.
  if (!currentImage || currentImage.includes("placehold.co")) {
    await subcategory.update(
      {
        imageUrl: getProductImageUrl(departmentName, index),
      },
      { transaction },
    );
  }
}

async function updateProductImages(
  product,
  departmentName,
  index,
  transaction,
) {
  const existingImages = await ProductImage.findAll({
    where: { productId: product.id },
    order: [
      ["isPrimary", "DESC"],
      ["sortOrder", "ASC"],
    ],
    transaction,
  });

  const placeholderImages = existingImages.filter((image) =>
    (image.imageUrl || "").includes("placehold.co"),
  );

  if (placeholderImages.length > 0) {
    // Replace existing placeholder records.
    for (let i = 0; i < placeholderImages.length; i++) {
      await placeholderImages[i].update(
        {
          imageUrl: getProductImageUrl(departmentName, index + i),
          isPrimary: i === 0,
          sortOrder: i,
        },
        { transaction },
      );
    }

    return;
  }

  // Preserve any existing manually uploaded image.
  if (existingImages.length > 0) {
    return;
  }

  // Create an image only when the product has no image.
  await ProductImage.create(
    {
      productId: product.id,
      imageUrl: getProductImageUrl(departmentName, index),
      isPrimary: true,
      sortOrder: 0,
    },
    { transaction },
  );
}

// ------------------------------------------------------
// SELLER LISTING AND INVENTORY HELPERS
// ------------------------------------------------------

async function createShopListingAndInventory({
  shop,
  product,
  variant,
  variantSku,
  variantPrice,
  transaction,
}) {
  const customSku = `SHOP-${shop.id}-${variantSku}`;

  // Find the listing for the assigned shop.
  const [listing, listingCreated] = await SellerListing.findOrCreate({
    where: {
      shopId: shop.id,
      productVariantId: variant.id,
    },
    defaults: {
      shopId: shop.id,
      productId: product.id,
      productVariantId: variant.id,
      customSku,
      retailPrice: variantPrice,
      gstApplicable: true,
      gstRate: 5,
      priceIncludesGst: true,
      hsnCode: null,
      isActive: true,
    },
    transaction,
  });

  if (listingCreated) {
    returnListingCount++;
  }

  // Deactivate only old listings generated by this seeder.
  // Do not deactivate manually created listings.
  const existingListings = await SellerListing.findAll({
    where: {
      productVariantId: variant.id,
      isActive: true,
    },
    transaction,
  });

  for (const existingListing of existingListings) {
    const isOtherShop =
      Number(existingListing.shopId) !== Number(shop.id);

    const isSeederListing =
      existingListing.customSku ===
      `SHOP-${existingListing.shopId}-${variantSku}`;

    if (isOtherShop && isSeederListing) {
      await existingListing.update(
        { isActive: false },
        { transaction },
      );
    }
  }

  // Create inventory only for the assigned shop.
  const [inventory, inventoryCreated] = await Inventory.findOrCreate({
    where: {
      shopId: shop.id,
      productVariantId: variant.id,
    },
    defaults: {
      shopId: shop.id,
      productId: product.id,
      productVariantId: variant.id,
      quantity: [0, 2, 5, 12, 25, 40, 80][
        hash(`${variantSku}-${shop.id}`) % 7
      ],
      lowStockThreshold: 5,
    },
    transaction,
  });

  if (inventoryCreated) {
    returnInventoryCount++;
  }

  return { listing, inventory };
}

// ------------------------------------------------------
// MAIN SEEDER
// ------------------------------------------------------

let returnListingCount = 0;
let returnInventoryCount = 0;

async function seedCatalog() {
  const transaction = await sequelize.transaction();

  try {
    const shops = await Shop.findAll({
      where: { status: "active" },
      order: [["id", "ASC"]],
      transaction,
    });

    const requestedShopId = process.env.SEED_SHOP_ID
      ? Number(process.env.SEED_SHOP_ID)
      : null;

    if (
      !shops.length ||
      (
        process.env.SEED_SHOP_ID &&
        (
          !Number.isInteger(requestedShopId) ||
          !shops.some(
            (shop) => Number(shop.id) === requestedShopId,
          )
        )
      )
    ) {
      throw new Error(
        "No active shop found, or SEED_SHOP_ID is not an active shop. Create shops before seeding.",
      );
    }

    // If SEED_SHOP_ID is provided, all products go to that shop.
    // Otherwise, products are distributed between active shops.
    const selectedShop = requestedShopId
      ? shops.find(
          (shop) => Number(shop.id) === requestedShopId,
        )
      : null;

    console.log(
      selectedShop
        ? `Seeding products only for ${selectedShop.name}.`
        : `Distributing products between ${shops.length} active shop(s).`,
    );

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
          imageUrl: getProductImageUrl(department.name, 0),
          isActive: true,
          submissionStatus: null,
          submittedByShopId: null,
        },
        transaction,
      });

      await updateCategoryImage(
        category,
        department.name,
        transaction,
      );

      categoryRecords[department.name] = category;

      for (
        let subIndex = 0;
        subIndex < department.subcategories.length;
        subIndex++
      ) {
        const sub = department.subcategories[subIndex];
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
            imageUrl: getProductImageUrl(
              department.name,
              subIndex,
            ),
            isActive: true,
            submissionStatus: null,
            submittedByShopId: null,
          },
          transaction,
        });

        await updateSubcategoryImage(
          subcategory,
          department.name,
          subIndex,
          transaction,
        );

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
      const target = departmentTargets[department.name];

      for (const sub of department.subcategories) {
        for (const descriptor of department.descriptors) {
          if (localIndex >= target) break;

          productDefinitions.push({
            department,
            subcategory: sub,
            name: `${descriptor} ${sub.name}`,
            index: localIndex,
          });

          localIndex++;
        }

        if (localIndex >= target) break;
      }

      // Continue generating names if combinations did not reach target.
      while (localIndex < target) {
        const sub =
          department.subcategories[
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
    let totalImagesUpdated = 0;
    let totalImagesCreated = 0;

    for (let i = 0; i < productDefinitions.length; i++) {
      const definition = productDefinitions[i];

      const {
        department,
        subcategory,
        name,
      } = definition;

      // Assign each product to exactly one shop.
      // SEED_SHOP_ID overrides round-robin assignment.
      const assignedShop = selectedShop || shops[i % shops.length];

      const category = categoryRecords[department.name];

      const subcategoryData =
        subcategoryRecords[
          `${department.name}:${subcategory.name}`
        ];

      const brandName = name === "Premium Atta & Flour"
        ? "Tata Sampann"
        : department.brands[i % department.brands.length];

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

      if (
        name === "Premium Atta & Flour" &&
        Number(product.brandId) !== Number(brand.id)
      ) {
        await product.update(
          { brandId: brand.id },
          { transaction },
        );
      }

      // Product image: update placeholders, preserve manual images.
      const imagesBefore = await ProductImage.findAll({
        where: { productId: product.id },
        transaction,
      });

      const placeholdersBefore = imagesBefore.filter((image) =>
        (image.imageUrl || "").includes("placehold.co"),
      );

      await updateProductImages(
        product,
        department.name,
        i,
        transaction,
      );

      if (placeholdersBefore.length > 0) {
        totalImagesUpdated += placeholdersBefore.length;
      } else if (imagesBefore.length === 0) {
        totalImagesCreated++;
      }

      // Variant definitions.
      const variants = variantsFor(
        subcategoryData.group,
        i,
      );

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
            wholesalePrice: Number(
              (variantPrice * 0.7).toFixed(2),
            ),
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
            throw new Error(
              `Missing attribute value: ${code}=${value}`,
            );
          }

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

        // IMPORTANT:
        // Only the assigned shop gets this variant listing and inventory.
        await createShopListingAndInventory({
          shop: assignedShop,
          product,
          variant,
          variantSku,
          variantPrice,
          transaction,
        });
      }

      if ((i + 1) % 25 === 0) {
        console.log(`Prepared ${i + 1}/200 products`);
      }
    }

    await transaction.commit();

    console.log("\n========== CATALOG SEED COMPLETE ==========");
    console.log("Active shops:", shops.map((shop) => shop.name).join(", "));
    console.log(
      "Assignment:",
      selectedShop
        ? `All products assigned to ${selectedShop.name}`
        : "Products distributed between active shops",
    );
    console.log("Products prepared:", productDefinitions.length);
    console.log("Variants prepared:", totalVariants);
    console.log("New seller listings:", returnListingCount);
    console.log("New inventory rows:", returnInventoryCount);
    console.log("Product images updated:", totalImagesUpdated);
    console.log("Product images created:", totalImagesCreated);
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
