


// const router = require("express").Router();
// const { Op } = require("sequelize");
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
// } = require("../models");
// const { AppError, wrap, idParam } = require("../utils/errors");
// const { validate, z } = require("../utils/validate");
// const { requireAuth, requireSuperAdmin } = require("../middleware/auth");
// const { uploadImage } = require("../utils/uploads");
// const { removeImageIfUnused } = require("../utils/imageStorage");
// const { slugify } = require("../services/catalogService");

// router.use(requireAuth, requireSuperAdmin);

// const id = z.coerce.number().int().positive();
// const name = z.string().trim().min(2).max(100);

// const duplicate = async (Model, where, currentId) => {
//   const found = await Model.findOne({ where });
//   if (found && found.id !== currentId) {
//     throw new AppError(409, "A record with these details already exists.");
//   }
// };

// const safeImageUpload = async (req, res, Model) => {
//   if (!req.file) {
//     throw new AppError(
//       400,
//       "Select a JPEG, PNG, WEBP, or GIF image no larger than 5 MB.",
//     );
//   }

//   const item = await Model.findByPk(idParam(req, "id"));

//   if (!item) {
//     throw new AppError(404, "Catalog record not found.");
//   }

//   const previous = item.imageUrl;

//   await item.update({
//     imageUrl: `/uploads/${req.file.filename}`,
//   });

//   await removeImageIfUnused(previous);

//   res.json({ item });
// };

// // Helper: include submitting shop info
// const submitterInclude = [
//   {
//     model: Shop,
//     as: "submittedByShop",
//     attributes: ["id", "name"],
//     required: false,
//   },
// ];

// router.get(
//   "/shops",
//   wrap(async (_req, res) => {
//     const items = await Shop.findAll({
//       attributes: ["id", "name", "status"],
//       order: [["name", "ASC"]],
//     });

//     res.json({ items });
//   }),
// );

// // Categories
// router.get(
//   "/categories",
//   wrap(async (_req, res) => {
//     const items = await Category.findAll({
//       include: [
//         { model: Subcategory, as: "subcategories" },
//         {
//           model: Shop,
//           as: "submittedByShop",
//           attributes: ["id", "name"],
//           required: false,
//         },
//       ],
//       order: [["name", "ASC"]],
//     });

//     res.json({ items, scope: "global_shared" });
//   }),
// );

// router.post(
//   "/categories",
//   validate(
//     z.object({
//       name,
//       description: z.string().trim().max(500).optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const slug = slugify(req.valid.name);

//     await duplicate(Category, { slug });

//     const item = await Category.create({
//       ...req.valid,
//       slug,
//     });

//     res.status(201).json({ item });
//   }),
// );

// router.patch(
//   "/categories/:id",
//   validate(
//     z.object({
//       name: name.optional(),
//       description: z.string().trim().max(500).optional(),
//       isActive: z.boolean().optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const item = await Category.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Category not found");
//     }

//     const updates = { ...req.valid };

//     if (updates.name) {
//       updates.slug = slugify(updates.name);

//       await duplicate(Category, { slug: updates.slug }, item.id);
//     }

//     await item.update(updates);

//     res.json({ item });
//   }),
// );

// router.delete(
//   "/categories/:id",
//   wrap(async (req, res) => {
//     const item = await Category.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Category not found");
//     }

//     if (
//       (await Product.count({ where: { categoryId: item.id } })) ||
//       (await Subcategory.count({ where: { categoryId: item.id } }))
//     ) {
//       throw new AppError(
//         409,
//         "Category is in use; deactivate it instead.",
//       );
//     }

//     await item.destroy();

//     res.status(204).end();
//   }),
// );

// // Subcategories
// router.get(
//   "/subcategories",
//   wrap(async (_req, res) => {
//     const items = await Subcategory.findAll({
//       include: [{ model: Category, as: "category" }],
//       order: [["name", "ASC"]],
//     });

//     res.json({ items, scope: "global_shared" });
//   }),
// );

// router.post(
//   "/subcategories",
//   validate(
//     z.object({
//       categoryId: id,
//       name,
//       description: z.string().trim().max(500).optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     if (
//       !(await Category.findOne({
//         where: {
//           id: req.valid.categoryId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(400, "Select an active category.");
//     }

//     const slug = slugify(req.valid.name);

//     await duplicate(Subcategory, {
//       categoryId: req.valid.categoryId,
//       slug,
//     });

//     const item = await Subcategory.create({
//       ...req.valid,
//       slug,
//     });

//     res.status(201).json({ item });
//   }),
// );

// router.patch(
//   "/subcategories/:id",
//   validate(
//     z.object({
//       categoryId: id.optional(),
//       name: name.optional(),
//       description: z.string().trim().max(500).optional(),
//       isActive: z.boolean().optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const item = await Subcategory.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Subcategory not found");
//     }

//     const updates = { ...req.valid };
//     const categoryId = updates.categoryId || item.categoryId;

//     if (
//       updates.categoryId &&
//       !(await Category.findOne({
//         where: {
//           id: categoryId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(400, "Select an active category.");
//     }

//     if (updates.name) {
//       updates.slug = slugify(updates.name);

//       await duplicate(
//         Subcategory,
//         { categoryId, slug: updates.slug },
//         item.id,
//       );
//     }

//     await item.update(updates);

//     res.json({ item });
//   }),
// );

// router.delete(
//   "/subcategories/:id",
//   wrap(async (req, res) => {
//     const item = await Subcategory.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Subcategory not found");
//     }

//     if (await Product.count({ where: { subcategoryId: item.id } })) {
//       throw new AppError(
//         409,
//         "Subcategory is in use; deactivate it instead.",
//       );
//     }

//     await item.destroy();

//     res.status(204).end();
//   }),
// );

// // Brands
// router.get(
//   "/brands",
//   wrap(async (_req, res) =>
//     res.json({
//       items: await Brand.findAll({
//         order: [["name", "ASC"]],
//       }),
//       scope: "global_shared",
//     }),
//   ),
// );

// router.post(
//   "/brands",
//   validate(
//     z.object({
//       name,
//       description: z.string().trim().max(500).optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     await duplicate(Brand, { name: req.valid.name });

//     const item = await Brand.create(req.valid);

//     res.status(201).json({ item });
//   }),
// );

// router.patch(
//   "/brands/:id",
//   validate(
//     z.object({
//       name: name.optional(),
//       description: z.string().trim().max(500).optional(),
//       isActive: z.boolean().optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const item = await Brand.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Brand not found");
//     }

//     if (req.valid.name) {
//       await duplicate(Brand, { name: req.valid.name }, item.id);
//     }

//     await item.update(req.valid);

//     res.json({ item });
//   }),
// );

// router.delete(
//   "/brands/:id",
//   wrap(async (req, res) => {
//     const item = await Brand.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Brand not found");
//     }

//     if (await Product.count({ where: { brandId: item.id } })) {
//       throw new AppError(
//         409,
//         "Brand is in use; deactivate it instead.",
//       );
//     }

//     await item.destroy();

//     res.status(204).end();
//   }),
// );

// // Attributes
// router.get(
//   "/attributes",
//   wrap(async (_req, res) =>
//     res.json({
//       items: await Attribute.findAll({
//         include: [{ model: AttributeValue, as: "values" }],
//         order: [["name", "ASC"]],
//       }),
//       scope: "global_shared",
//     }),
//   ),
// );

// router.post(
//   "/attributes",
//   validate(
//     z.object({
//       name: z.string().trim().min(2).max(60),
//       code: z.string().trim().min(2).max(60),
//     }),
//   ),
//   wrap(async (req, res) => {
//     await duplicate(Attribute, { code: req.valid.code });

//     const item = await Attribute.create(req.valid);

//     res.status(201).json({ item });
//   }),
// );

// router.patch(
//   "/attributes/:id",
//   validate(
//     z.object({
//       name: z.string().trim().min(2).max(60).optional(),
//       code: z.string().trim().min(2).max(60).optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const item = await Attribute.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Attribute not found");
//     }

//     if (req.valid.code) {
//       await duplicate(Attribute, { code: req.valid.code }, item.id);
//     }

//     await item.update(req.valid);

//     res.json({ item });
//   }),
// );

// router.post(
//   "/attributes/:id/values",
//   validate(
//     z.object({
//       value: z.string().trim().min(1).max(100),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const attr = await Attribute.findByPk(idParam(req, "id"));

//     if (!attr) {
//       throw new AppError(404, "Attribute not found");
//     }

//     if (
//       await AttributeValue.findOne({
//         where: {
//           attributeId: attr.id,
//           value: req.valid.value,
//         },
//       })
//     ) {
//       throw new AppError(
//         409,
//         "This value already exists for the attribute.",
//       );
//     }

//     const value = await AttributeValue.create({
//       attributeId: attr.id,
//       value: req.valid.value,
//     });

//     res.status(201).json({ value });
//   }),
// );

// router.delete(
//   "/attributes/values/:valueId",
//   wrap(async (req, res) => {
//     const value = await AttributeValue.findByPk(
//       idParam(req, "valueId"),
//     );

//     if (!value) {
//       throw new AppError(404, "Attribute value not found");
//     }

//     if (
//       await ProductVariantValue.count({
//         where: { attributeValueId: value.id },
//       })
//     ) {
//       throw new AppError(
//         409,
//         "This value is used by a product variant.",
//       );
//     }

//     await value.destroy();

//     res.status(204).end();
//   }),
// );

// router.delete(
//   "/attributes/:id",
//   wrap(async (req, res) => {
//     const item = await Attribute.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Attribute not found");
//     }

//     if (
//       await ProductVariantValue.count({
//         where: { attributeId: item.id },
//       })
//     ) {
//       throw new AppError(
//         409,
//         "This attribute is used by product variants.",
//       );
//     }

//     await AttributeValue.destroy({
//       where: { attributeId: item.id },
//     });

//     await item.destroy();

//     res.status(204).end();
//   }),
// );

// // Category / subcategory / brand image upload
// router.post(
//   "/:resource/:id/image",
//   uploadImage.single("image"),
//   wrap(async (req, res) => {
//     const model = {
//       categories: Category,
//       subcategories: Subcategory,
//       brands: Brand,
//     }[req.params.resource];

//     if (!model) {
//       throw new AppError(404, "Image target not found.");
//     }

//     await safeImageUpload(req, res, model);
//   }),
// );

// router.delete(
//   "/:resource/:id/image",
//   wrap(async (req, res) => {
//     const model = {
//       categories: Category,
//       subcategories: Subcategory,
//       brands: Brand,
//     }[req.params.resource];

//     if (!model) {
//       throw new AppError(404, "Image target not found.");
//     }

//     const item = await model.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Catalog record not found.");
//     }

//     const previous = item.imageUrl;

//     await item.update({ imageUrl: null });

//     await removeImageIfUnused(previous);

//     res.json({ item });
//   }),
// );
// // Product includes
// const productIncludes = [
//   { model: Category, as: "category" },
//   { model: Subcategory, as: "subcategory" },
//   { model: Brand, as: "brand" },
//   { model: ProductImage, as: "images" },
//   {
//     model: ProductVariant,
//     as: "variants",
//     include: [
//       {
//         model: ProductVariantValue,
//         as: "variantValues",
//         include: [
//           { model: Attribute, as: "attribute" },
//           { model: AttributeValue, as: "attributeValue" },
//         ],
//       },
//     ],
//   },
// ];

// // GET products
// router.get(
//   "/products",
//   validate(
//     z.object({
//       shopId: id.optional(),
//       q: z.string().trim().max(100).optional(),
//       categoryId: id.optional(),
//       brandId: id.optional(),
//       page: z.coerce.number().int().min(1).default(1),
//       pageSize: z.coerce.number().int().min(1).max(100).default(20),
//     }),
//     "query",
//   ),
//   wrap(async (req, res) => {
//     const { shopId, q, categoryId, brandId, page, pageSize } = req.valid;

//     const where = {};

//     if (q) {
//       where.name = { [Op.like]: `%${q}%` };
//     }

//     if (categoryId) {
//       where.categoryId = categoryId;
//     }

//     if (brandId) {
//       where.brandId = brandId;
//     }

//     if (shopId) {
//       if (!(await Shop.findByPk(shopId, { attributes: ["id"] }))) {
//         throw new AppError(404, "Shop not found");
//       }

//       const listed = await SellerListing.findAll({
//         where: { shopId },
//         attributes: ["productId"],
//         raw: true,
//       });

//       where.id = {
//         [Op.in]: [...new Set(listed.map((row) => row.productId))],
//       };
//     }

//     const result = await Product.findAndCountAll({
//       where,
//       include: productIncludes,
//       order: [["createdAt", "DESC"]],
//       limit: pageSize,
//       offset: (page - 1) * pageSize,
//       distinct: true,
//     });

//     const variantIds = result.rows.flatMap((product) =>
//       product.variants.map((variant) => variant.id),
//     );

//     const [listings, stock] = await Promise.all([
//       SellerListing.findAll({
//         where: {
//           ...(shopId ? { shopId } : {}),
//           productVariantId: variantIds,
//         },
//         include: [
//           {
//             model: Shop,
//             as: "shop",
//             attributes: ["id", "name"],
//           },
//         ],
//       }),

//       Inventory.findAll({
//         where: {
//           ...(shopId ? { shopId } : {}),
//           productVariantId: variantIds,
//         },
//       }),
//     ]);

//     const items = result.rows.map((product) => {
//       const json = product.toJSON();

//       // Preserve both product descriptions in the response.
//       json.shortDescription =
//         json.shortDescription ?? json.short_description ?? "";

//       json.variants = json.variants.map((variant) => {
//         const matching = listings.filter(
//           (listing) => listing.productVariantId === variant.id,
//         );

//         const current = shopId ? matching[0] : null;

//         return {
//           ...variant,
//           sellerListing: current || null,

//           listings: matching.map((listing) => ({
//             shop: listing.shop,
//             retailPrice: listing.retailPrice,
//             isActive: listing.isActive,
//           })),

//           inventory: shopId
//             ? stock.find(
//                 (row) => row.productVariantId === variant.id,
//               ) || { quantity: 0 }
//             : null,
//         };
//       });

//       return json;
//     });

//     res.json({
//       items,
//       total: result.count,
//       page,
//       pageSize,
//       scope: shopId ? "selected_shop" : "all_shops",
//     });
//   }),
// );

// // UPDATE PRODUCT
// router.patch(
//   "/products/:id",
//   validate(
//     z.object({
//       name: z.string().trim().min(2).max(200).optional(),
//       sku: z.string().trim().max(80).optional(),

//       categoryId: id.nullable().optional(),
//       subcategoryId: id.nullable().optional(),
//       brandId: id.nullable().optional(),

//       // FIX: accept shortDescription during product update.
//       shortDescription: z.string().trim().max(500).nullable().optional(),

//       description: z.string().trim().nullable().optional(),

//       basePrice: z.coerce
//         .number()
//         .finite()
//         .min(0)
//         .max(99999999.99)
//         .optional(),

//       isActive: z.boolean().optional(),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const item = await Product.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Product not found.");
//     }

//     const update = req.valid;

//     const categoryId =
//       update.categoryId === undefined
//         ? item.categoryId
//         : update.categoryId;

//     const subcategoryId =
//       update.subcategoryId === undefined
//         ? item.subcategoryId
//         : update.subcategoryId;

//     if (
//       categoryId &&
//       !(await Category.findOne({
//         where: {
//           id: categoryId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(400, "Select an active category.");
//     }

//     if (
//       subcategoryId &&
//       !(await Subcategory.findOne({
//         where: {
//           id: subcategoryId,
//           categoryId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(
//         400,
//         "Select a subcategory belonging to the category.",
//       );
//     }

//     if (
//       update.brandId &&
//       !(await Brand.findOne({
//         where: {
//           id: update.brandId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(400, "Select an active brand.");
//     }

//     await item.update(update);

//     res.json({
//       product: item,
//       message: "Product updated successfully.",
//     });
//   }),
// );

// // UPDATE SHOP PRODUCT LISTING
// router.patch(
//   "/products/:id/listing",
//   validate(
//     z.object({
//       shopId: id,
//       variants: z
//         .array(
//           z.object({
//             id,
//             retailPrice: z.coerce
//               .number()
//               .finite()
//               .min(0)
//               .max(99999999.99),
//             quantity: z.coerce
//               .number()
//               .int()
//               .min(0)
//               .max(10000000),
//             isActive: z.boolean().optional(),
//           }),
//         )
//         .min(1),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const productId = idParam(req, "id");

//     if (!(await Product.findByPk(productId))) {
//       throw new AppError(404, "Product not found.");
//     }

//     await sequelize.transaction(async (transaction) => {
//       for (const row of req.valid.variants) {
//         const listing = await SellerListing.findOne({
//           where: {
//             shopId: req.valid.shopId,
//             productId,
//             productVariantId: row.id,
//           },
//           transaction,
//         });

//         const inventory = await Inventory.findOne({
//           where: {
//             shopId: req.valid.shopId,
//             productId,
//             productVariantId: row.id,
//           },
//           transaction,
//         });

//         if (!listing || !inventory) {
//           throw new AppError(
//             404,
//             "Variant is not listed by the selected shop.",
//           );
//         }

//         await listing.update(
//           {
//             retailPrice: row.retailPrice,
//             ...(row.isActive === undefined
//               ? {}
//               : { isActive: row.isActive }),
//           },
//           { transaction },
//         );

//         await inventory.update(
//           { quantity: row.quantity },
//           { transaction },
//         );
//       }
//     });

//     res.json({ success: true });
//   }),
// );

// // PRODUCT CREATE VALIDATION
// const productSchema = z.object({
//   shopId: id,

//   name: z.string().trim().min(2).max(200),

//   sku: z.string().trim().max(80).optional(),

//   categoryId: id.optional(),
//   subcategoryId: id.optional(),
//   brandId: id.optional(),

//   // FIX: accept shortDescription during product creation.
//   shortDescription: z.string().trim().max(500).nullable().optional(),

//   description: z.string().trim().nullable().optional(),

//   basePrice: z.coerce
//     .number()
//     .min(0)
//     .max(99999999.99)
//     .default(0),

//   variants: z
//     .array(
//       z.object({
//         variantName: z.string().trim().min(1).max(150),
//         sku: z.string().trim().min(1).max(80),
//         price: z.coerce.number().min(0),
//         wholesalePrice: z.coerce.number().min(0).default(0),
//         retailPrice: z.coerce.number().min(0),
//         initialStock: z.coerce.number().int().min(0).default(0),

//         attributeValues: z
//           .array(
//             z.object({
//               attributeId: id,
//               attributeValueId: id,
//             }),
//           )
//           .optional(),
//       }),
//     )
//     .min(1),
// });

// // CREATE PRODUCT
// router.post(
//   "/products",
//   validate(productSchema),
//   wrap(async (req, res) => {
//     const v = req.valid;

//     if (!(await Shop.findByPk(v.shopId, { attributes: ["id"] }))) {
//       throw new AppError(404, "Shop not found");
//     }

//     if (
//       v.categoryId &&
//       !(await Category.findOne({
//         where: {
//           id: v.categoryId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(400, "Select an active category.");
//     }

//     if (
//       v.subcategoryId &&
//       !(await Subcategory.findOne({
//         where: {
//           id: v.subcategoryId,
//           categoryId: v.categoryId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(
//         400,
//         "Select a subcategory belonging to the category.",
//       );
//     }

//     if (
//       v.brandId &&
//       !(await Brand.findOne({
//         where: {
//           id: v.brandId,
//           isActive: true,
//         },
//       }))
//     ) {
//       throw new AppError(400, "Select an active brand.");
//     }

//     const product = await sequelize.transaction(async (transaction) => {
//       const item = await Product.create(
//         {
//           name: v.name,

//           sku:
//             v.sku ||
//             `SKU-${Date.now().toString(36).toUpperCase()}`,

//           categoryId: v.categoryId || null,
//           subcategoryId: v.subcategoryId || null,
//           brandId: v.brandId || null,

//           // FIX: save shortDescription in the database.
//           shortDescription: v.shortDescription || null,

//           description: v.description || null,

//           basePrice: v.basePrice,
//           isActive: true,
//         },
//         { transaction },
//       );

//       for (const row of v.variants) {
//         const variant = await ProductVariant.create(
//           {
//             productId: item.id,
//             sku: row.sku,
//             variantName: row.variantName,
//             price: row.price,
//             wholesalePrice: row.wholesalePrice,
//             isActive: true,
//           },
//           { transaction },
//         );

//         for (const av of row.attributeValues || []) {
//           if (
//             !(await AttributeValue.findOne({
//               where: {
//                 id: av.attributeValueId,
//                 attributeId: av.attributeId,
//               },
//               transaction,
//             }))
//           ) {
//             throw new AppError(
//               400,
//               "An attribute value does not match its selected attribute.",
//             );
//           }

//           await ProductVariantValue.create(
//             {
//               productVariantId: variant.id,
//               attributeId: av.attributeId,
//               attributeValueId: av.attributeValueId,
//             },
//             { transaction },
//           );
//         }

//         await SellerListing.create(
//           {
//             shopId: v.shopId,
//             productId: item.id,
//             productVariantId: variant.id,
//             retailPrice: row.retailPrice,
//             isActive: true,
//           },
//           { transaction },
//         );

//         await Inventory.create(
//           {
//             shopId: v.shopId,
//             productId: item.id,
//             productVariantId: variant.id,
//             quantity: row.initialStock,
//             lowStockThreshold: 5,
//           },
//           { transaction },
//         );
//       }

//       return item;
//     });

//     res.status(201).json({
//       product,
//       message: "Product created successfully.",
//     });
//   }),
// );

// // UPLOAD PRODUCT IMAGE
// router.post(
//   "/products/:id/images",
//   uploadImage.single("image"),
//   wrap(async (req, res) => {
//     if (!req.file) {
//       throw new AppError(400, "Select an image file to upload.");
//     }

//     const item = await Product.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Product not found.");
//     }

//     const isPrimary = req.body.isPrimary === "true";

//     const oldPrimary = isPrimary
//       ? await ProductImage.findAll({
//           where: {
//             productId: item.id,
//             isPrimary: true,
//           },
//         })
//       : [];

//     await sequelize.transaction(async (transaction) => {
//       if (isPrimary) {
//         await ProductImage.update(
//           { isPrimary: false },
//           {
//             where: { productId: item.id },
//             transaction,
//           },
//         );
//       }

//       await ProductImage.create(
//         {
//           productId: item.id,
//           imageUrl: `/uploads/${req.file.filename}`,
//           isPrimary,
//           sortOrder: Number(req.body.sortOrder || 0),
//         },
//         { transaction },
//       );
//     });

//     for (const old of oldPrimary) {
//       await removeImageIfUnused(old.imageUrl);
//     }

//     const image = await ProductImage.findOne({
//       where: {
//         productId: item.id,
//         imageUrl: `/uploads/${req.file.filename}`,
//       },
//     });

//     res.status(201).json({ image });
//   }),
// );

// // DELETE PRODUCT IMAGE
// router.delete(
//   "/products/:id/images/:imageId",
//   wrap(async (req, res) => {
//     const productId = idParam(req, "id");

//     const image = await ProductImage.findOne({
//       where: {
//         id: idParam(req, "imageId"),
//         productId,
//       },
//     });

//     if (!image) {
//       throw new AppError(404, "Product image not found.");
//     }

//     await image.destroy();

//     await removeImageIfUnused(image.imageUrl);

//     const remaining = await ProductImage.findAll({
//       where: { productId },
//       order: [
//         ["sortOrder", "ASC"],
//         ["id", "ASC"],
//       ],
//     });

//     if (
//       remaining.length &&
//       !remaining.some((row) => row.isPrimary)
//     ) {
//       await remaining[0].update({ isPrimary: true });
//     }

//     res.json({ items: remaining });
//   }),
// );

// /* ───────────────────────── Approval Workflow ───────────────────────── */

// const CATALOG_MODELS = {
//   categories: Category,
//   subcategories: Subcategory,
//   brands: Brand,
//   attributes: Attribute,
// };

// // GET pending submissions
// router.get(
//   "/pending",
//   wrap(async (_req, res) => {
//     const [cats, subs, brnds, attrs] = await Promise.all([
//       Category.findAll({
//         where: { submissionStatus: "pending" },
//         include: [
//           {
//             model: Shop,
//             as: "submittedByShop",
//             attributes: ["id", "name"],
//             required: false,
//           },
//         ],
//         order: [["createdAt", "ASC"]],
//       }),

//       Subcategory.findAll({
//         where: { submissionStatus: "pending" },
//         include: [
//           {
//             model: Category,
//             as: "category",
//             attributes: ["id", "name"],
//           },
//           {
//             model: Shop,
//             as: "submittedByShop",
//             attributes: ["id", "name"],
//             required: false,
//           },
//         ],
//         order: [["createdAt", "ASC"]],
//       }),

//       Brand.findAll({
//         where: { submissionStatus: "pending" },
//         include: [
//           {
//             model: Shop,
//             as: "submittedByShop",
//             attributes: ["id", "name"],
//             required: false,
//           },
//         ],
//         order: [["createdAt", "ASC"]],
//       }),

//       Attribute.findAll({
//         where: { submissionStatus: "pending" },
//         include: [
//           {
//             model: Shop,
//             as: "submittedByShop",
//             attributes: ["id", "name"],
//             required: false,
//           },
//         ],
//         order: [["createdAt", "ASC"]],
//       }),
//     ]);

//     res.json({
//       items: [
//         ...cats.map((x) => ({
//           ...x.toJSON(),
//           type: "category",
//         })),

//         ...subs.map((x) => ({
//           ...x.toJSON(),
//           type: "subcategory",
//         })),

//         ...brnds.map((x) => ({
//           ...x.toJSON(),
//           type: "brand",
//         })),

//         ...attrs.map((x) => ({
//           ...x.toJSON(),
//           type: "attribute",
//         })),
//       ],
//     });
//   }),
// );

// // APPROVE CATALOG RECORD
// router.post(
//   "/:resource/:id/approve",
//   wrap(async (req, res) => {
//     const Model = CATALOG_MODELS[req.params.resource];

//     if (!Model) {
//       throw new AppError(404, "Unknown catalog resource");
//     }

//     const item = await Model.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Record not found");
//     }

//     if (!item.submissionStatus) {
//       throw new AppError(
//         400,
//         "This record was not submitted for approval",
//       );
//     }

//     const updates = {
//       submissionStatus: "approved",
//       rejectionReason: null,
//     };

//     if (Model.rawAttributes.isActive) {
//       updates.isActive = true;
//     }

//     await item.update(updates);

//     res.json({ item });
//   }),
// );

// // REJECT CATALOG RECORD
// router.post(
//   "/:resource/:id/reject",
//   validate(
//     z.object({
//       reason: z.string().trim().min(1).max(500),
//     }),
//   ),
//   wrap(async (req, res) => {
//     const Model = CATALOG_MODELS[req.params.resource];

//     if (!Model) {
//       throw new AppError(404, "Unknown catalog resource");
//     }

//     const item = await Model.findByPk(idParam(req, "id"));

//     if (!item) {
//       throw new AppError(404, "Record not found");
//     }

//     if (!item.submissionStatus) {
//       throw new AppError(
//         400,
//         "This record was not submitted for approval",
//       );
//     }

//     const updates = {
//       submissionStatus: "rejected",
//       rejectionReason: req.valid.reason,
//     };

//     if (Model.rawAttributes.isActive) {
//       updates.isActive = false;
//     }

//     await item.update(updates);

//     res.json({ item });
//   }),
// );

// module.exports = router;


const router = require("express").Router();
const { Op } = require("sequelize");

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
} = require("../models");

const { AppError, wrap, idParam } = require("../utils/errors");
const { validate, z } = require("../utils/validate");
const { requireAuth, requireSuperAdmin } = require("../middleware/auth");
const { uploadImage } = require("../utils/uploads");
const { removeImageIfUnused } = require("../utils/imageStorage");
const { slugify } = require("../services/catalogService");

router.use(requireAuth, requireSuperAdmin);

const id = z.coerce.number().int().positive();
const name = z.string().trim().min(2).max(100);

const duplicate = async (Model, where, currentId) => {
  const found = await Model.findOne({ where });

  if (found && found.id !== currentId) {
    throw new AppError(409, "A record with these details already exists.");
  }
};

const safeImageUpload = async (req, res, Model) => {
  if (!req.file) {
    throw new AppError(
      400,
      "Select a JPEG, PNG, WEBP, or GIF image no larger than 5 MB."
    );
  }

  const item = await Model.findByPk(idParam(req, "id"));

  if (!item) {
    throw new AppError(404, "Catalog record not found.");
  }

  const previous = item.imageUrl;

  await item.update({
    imageUrl: `/uploads/${req.file.filename}`,
  });

  await removeImageIfUnused(previous);

  res.json({ item });
};

// Helper: include submitting shop info
const submitterInclude = [
  {
    model: Shop,
    as: "submittedByShop",
    attributes: ["id", "name"],
    required: false,
  },
];

// SHOPS
router.get(
  "/shops",
  wrap(async (_req, res) => {
    const items = await Shop.findAll({
      attributes: ["id", "name", "status"],
      order: [["name", "ASC"]],
    });

    res.json({ items });
  })
);

// CATEGORIES
router.get(
  "/categories",
  wrap(async (_req, res) => {
    const items = await Category.findAll({
      include: [
        { model: Subcategory, as: "subcategories" },
        {
          model: Shop,
          as: "submittedByShop",
          attributes: ["id", "name"],
          required: false,
        },
      ],
      order: [["name", "ASC"]],
    });

    res.json({ items, scope: "global_shared" });
  })
);

router.post(
  "/categories",
  validate(
    z.object({
      name,
      description: z.string().trim().max(500).optional(),
    })
  ),
  wrap(async (req, res) => {
    const slug = slugify(req.valid.name);

    await duplicate(Category, { slug });

    const item = await Category.create({
      ...req.valid,
      slug,
    });

    res.status(201).json({ item });
  })
);

router.patch(
  "/categories/:id",
  validate(
    z.object({
      name: name.optional(),
      description: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    })
  ),
  wrap(async (req, res) => {
    const item = await Category.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Category not found");
    }

    const updates = { ...req.valid };

    if (updates.name) {
      updates.slug = slugify(updates.name);
      await duplicate(Category, { slug: updates.slug }, item.id);
    }

    await item.update(updates);

    res.json({ item });
  })
);

router.delete(
  "/categories/:id",
  wrap(async (req, res) => {
    const item = await Category.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Category not found");
    }

    if (
      (await Product.count({ where: { categoryId: item.id } })) ||
      (await Subcategory.count({ where: { categoryId: item.id } }))
    ) {
      throw new AppError(
        409,
        "Category is in use; deactivate it instead."
      );
    }

    await item.destroy();

    res.status(204).end();
  })
);

// SUBCATEGORIES
router.get(
  "/subcategories",
  wrap(async (_req, res) => {
    const items = await Subcategory.findAll({
      include: [{ model: Category, as: "category" }],
      order: [["name", "ASC"]],
    });

    res.json({ items, scope: "global_shared" });
  })
);

router.post(
  "/subcategories",
  validate(
    z.object({
      categoryId: id,
      name,
      description: z.string().trim().max(500).optional(),
    })
  ),
  wrap(async (req, res) => {
    if (
      !(await Category.findOne({
        where: {
          id: req.valid.categoryId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(400, "Select an active category.");
    }

    const slug = slugify(req.valid.name);

    await duplicate(Subcategory, {
      categoryId: req.valid.categoryId,
      slug,
    });

    const item = await Subcategory.create({
      ...req.valid,
      slug,
    });

    res.status(201).json({ item });
  })
);

router.patch(
  "/subcategories/:id",
  validate(
    z.object({
      categoryId: id.optional(),
      name: name.optional(),
      description: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    })
  ),
  wrap(async (req, res) => {
    const item = await Subcategory.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Subcategory not found");
    }

    const updates = { ...req.valid };
    const categoryId = updates.categoryId || item.categoryId;

    if (
      updates.categoryId &&
      !(await Category.findOne({
        where: {
          id: categoryId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(400, "Select an active category.");
    }

    if (updates.name) {
      updates.slug = slugify(updates.name);

      await duplicate(
        Subcategory,
        { categoryId, slug: updates.slug },
        item.id
      );
    }

    await item.update(updates);

    res.json({ item });
  })
);

router.delete(
  "/subcategories/:id",
  wrap(async (req, res) => {
    const item = await Subcategory.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Subcategory not found");
    }

    if (await Product.count({ where: { subcategoryId: item.id } })) {
      throw new AppError(
        409,
        "Subcategory is in use; deactivate it instead."
      );
    }

    await item.destroy();

    res.status(204).end();
  })
);

// BRANDS
router.get(
  "/brands",
  wrap(async (_req, res) => {
    res.json({
      items: await Brand.findAll({
        order: [["name", "ASC"]],
      }),
      scope: "global_shared",
    });
  })
);

router.post(
  "/brands",
  validate(
    z.object({
      name,
      description: z.string().trim().max(500).optional(),
    })
  ),
  wrap(async (req, res) => {
    await duplicate(Brand, { name: req.valid.name });

    const item = await Brand.create(req.valid);

    res.status(201).json({ item });
  })
);

router.patch(
  "/brands/:id",
  validate(
    z.object({
      name: name.optional(),
      description: z.string().trim().max(500).optional(),
      isActive: z.boolean().optional(),
    })
  ),
  wrap(async (req, res) => {
    const item = await Brand.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Brand not found");
    }

    if (req.valid.name) {
      await duplicate(Brand, { name: req.valid.name }, item.id);
    }

    await item.update(req.valid);

    res.json({ item });
  })
);

router.delete(
  "/brands/:id",
  wrap(async (req, res) => {
    const item = await Brand.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Brand not found");
    }

    if (await Product.count({ where: { brandId: item.id } })) {
      throw new AppError(
        409,
        "Brand is in use; deactivate it instead."
      );
    }

    await item.destroy();

    res.status(204).end();
  })
);

// ATTRIBUTES
router.get(
  "/attributes",
  wrap(async (_req, res) => {
    res.json({
      items: await Attribute.findAll({
        include: [{ model: AttributeValue, as: "values" }],
        order: [["name", "ASC"]],
      }),
      scope: "global_shared",
    });
  })
);

router.post(
  "/attributes",
  validate(
    z.object({
      name: z.string().trim().min(2).max(60),
      code: z.string().trim().min(2).max(60),
    })
  ),
  wrap(async (req, res) => {
    await duplicate(Attribute, { code: req.valid.code });

    const item = await Attribute.create(req.valid);

    res.status(201).json({ item });
  })
);

router.patch(
  "/attributes/:id",
  validate(
    z.object({
      name: z.string().trim().min(2).max(60).optional(),
      code: z.string().trim().min(2).max(60).optional(),
    })
  ),
  wrap(async (req, res) => {
    const item = await Attribute.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Attribute not found");
    }

    if (req.valid.code) {
      await duplicate(Attribute, { code: req.valid.code }, item.id);
    }

    await item.update(req.valid);

    res.json({ item });
  })
);

router.post(
  "/attributes/:id/values",
  validate(
    z.object({
      value: z.string().trim().min(1).max(100),
    })
  ),
  wrap(async (req, res) => {
    const attr = await Attribute.findByPk(idParam(req, "id"));

    if (!attr) {
      throw new AppError(404, "Attribute not found");
    }

    if (
      await AttributeValue.findOne({
        where: {
          attributeId: attr.id,
          value: req.valid.value,
        },
      })
    ) {
      throw new AppError(
        409,
        "This value already exists for the attribute."
      );
    }

    const value = await AttributeValue.create({
      attributeId: attr.id,
      value: req.valid.value,
    });

    res.status(201).json({ value });
  })
);

router.delete(
  "/attributes/values/:valueId",
  wrap(async (req, res) => {
    const value = await AttributeValue.findByPk(
      idParam(req, "valueId")
    );

    if (!value) {
      throw new AppError(404, "Attribute value not found");
    }

    if (
      await ProductVariantValue.count({
        where: { attributeValueId: value.id },
      })
    ) {
      throw new AppError(
        409,
        "This value is used by a product variant."
      );
    }

    await value.destroy();

    res.status(204).end();
  })
);

router.delete(
  "/attributes/:id",
  wrap(async (req, res) => {
    const item = await Attribute.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Attribute not found");
    }

    if (
      await ProductVariantValue.count({
        where: { attributeId: item.id },
      })
    ) {
      throw new AppError(
        409,
        "This attribute is used by product variants."
      );
    }

    await AttributeValue.destroy({
      where: { attributeId: item.id },
    });

    await item.destroy();

    res.status(204).end();
  })
);

// CATEGORY / SUBCATEGORY / BRAND IMAGE UPLOAD
router.post(
  "/:resource/:id/image",
  uploadImage.single("image"),
  wrap(async (req, res) => {
    const model = {
      categories: Category,
      subcategories: Subcategory,
      brands: Brand,
    }[req.params.resource];

    if (!model) {
      throw new AppError(404, "Image target not found.");
    }

    await safeImageUpload(req, res, model);
  })
);

router.delete(
  "/:resource/:id/image",
  wrap(async (req, res) => {
    const model = {
      categories: Category,
      subcategories: Subcategory,
      brands: Brand,
    }[req.params.resource];

    if (!model) {
      throw new AppError(404, "Image target not found.");
    }

    const item = await model.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Catalog record not found.");
    }

    const previous = item.imageUrl;

    await item.update({ imageUrl: null });

    await removeImageIfUnused(previous);

    res.json({ item });
  })
);

// PRODUCT INCLUDES
const productIncludes = [
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
];

// GET PRODUCTS
router.get(
  "/products",
  validate(
    z.object({
      shopId: id.optional(),
      q: z.string().trim().max(100).optional(),
      categoryId: id.optional(),
      brandId: id.optional(),
      page: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(20),
    }),
    "query"
  ),
  wrap(async (req, res) => {
    const { shopId, q, categoryId, brandId, page, pageSize } = req.valid;

    const where = {};

    if (q) {
      where.name = { [Op.like]: `%${q}%` };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (brandId) {
      where.brandId = brandId;
    }

    // If a shop is selected, only return products listed by that shop.
    if (shopId) {
      if (!(await Shop.findByPk(shopId, { attributes: ["id"] }))) {
        throw new AppError(404, "Shop not found");
      }

      const listed = await SellerListing.findAll({
        where: { shopId },
        attributes: ["productId"],
        raw: true,
      });

      where.id = {
        [Op.in]: [...new Set(listed.map((row) => row.productId))],
      };
    }

    const result = await Product.findAndCountAll({
      where,
      include: productIncludes,
      order: [["createdAt", "DESC"]],
      limit: pageSize,
      offset: (page - 1) * pageSize,
      distinct: true,
    });

    const variantIds = result.rows.flatMap((product) =>
      product.variants.map((variant) => variant.id)
    );

    // Fetch listings and inventory for the requested products.
    // In global mode, fetch records from every shop.
    // In selected-shop mode, fetch only that shop's records.
    const [listings, stock] = await Promise.all([
      SellerListing.findAll({
        where: {
          ...(shopId ? { shopId } : {}),
          productVariantId: variantIds,
        },
        include: [
          {
            model: Shop,
            as: "shop",
            attributes: ["id", "name"],
          },
        ],
      }),

      Inventory.findAll({
        where: {
          ...(shopId ? { shopId } : {}),
          productVariantId: variantIds,
        },
      }),
    ]);

    const items = result.rows.map((product) => {
      const json = product.toJSON();

      // Preserve both product descriptions.
      json.shortDescription =
        json.shortDescription ?? json.short_description ?? "";

      json.variants = json.variants.map((variant) => {
        const matching = listings.filter(
          (listing) =>
            String(listing.productVariantId) === String(variant.id)
        );

        // Selected shop listing, if a shop filter is active.
        const current = shopId ? matching[0] : null;

        // Return every shop's individual listing and inventory.
        const variantListings = matching.map((listing) => {
          const listingInventory = stock.find(
            (row) =>
              String(row.productVariantId) === String(variant.id) &&
              String(row.shopId) === String(listing.shopId)
          );

          return {
            id: listing.id,
            shop: listing.shop
              ? {
                  id: listing.shop.id,
                  name: listing.shop.name,
                }
              : null,
            retailPrice: Number(listing.retailPrice),
            isActive: listing.isActive,
            inventory: {
              quantity: Number(listingInventory?.quantity ?? 0),
              lowStockThreshold: Number(
                listingInventory?.lowStockThreshold ?? 5
              ),
            },
          };
        });

        // Keep selected-shop inventory separate from global listings.
        const currentInventory = shopId
          ? stock.find(
              (row) =>
                String(row.productVariantId) === String(variant.id) &&
                String(row.shopId) === String(shopId)
            )
          : null;

        return {
          ...variant,

          // Existing selected-shop behavior.
          sellerListing: current || null,

          // New: each shop's price, stock, and status in global mode.
          listings: variantListings,

          // Existing selected-shop behavior.
          inventory: shopId
            ? currentInventory || { quantity: 0 }
            : null,
        };
      });

      return json;
    });

    res.json({
      items,
      total: result.count,
      page,
      pageSize,
      scope: shopId ? "selected_shop" : "all_shops",
    });
  })
);

// UPDATE PRODUCT
router.patch(
  "/products/:id",
  validate(
    z.object({
      name: z.string().trim().min(2).max(200).optional(),
      sku: z.string().trim().max(80).optional(),

      categoryId: id.nullable().optional(),
      subcategoryId: id.nullable().optional(),
      brandId: id.nullable().optional(),

      shortDescription: z.string().trim().max(500).nullable().optional(),
      description: z.string().trim().nullable().optional(),

      basePrice: z.coerce
        .number()
        .finite()
        .min(0)
        .max(99999999.99)
        .optional(),

      isActive: z.boolean().optional(),
    })
  ),
  wrap(async (req, res) => {
    const item = await Product.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Product not found.");
    }

    const update = req.valid;

    const categoryId =
      update.categoryId === undefined
        ? item.categoryId
        : update.categoryId;

    const subcategoryId =
      update.subcategoryId === undefined
        ? item.subcategoryId
        : update.subcategoryId;

    if (
      categoryId &&
      !(await Category.findOne({
        where: {
          id: categoryId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(400, "Select an active category.");
    }

    if (
      subcategoryId &&
      !(await Subcategory.findOne({
        where: {
          id: subcategoryId,
          categoryId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(
        400,
        "Select a subcategory belonging to the category."
      );
    }

    if (
      update.brandId &&
      !(await Brand.findOne({
        where: {
          id: update.brandId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(400, "Select an active brand.");
    }

    await item.update(update);

    res.json({
      product: item,
      message: "Product updated successfully.",
    });
  })
);

// UPDATE SHOP PRODUCT LISTING
router.patch(
  "/products/:id/listing",
  validate(
    z.object({
      shopId: id,
      variants: z
        .array(
          z.object({
            id,
            retailPrice: z.coerce
              .number()
              .finite()
              .min(0)
              .max(99999999.99),
            quantity: z.coerce
              .number()
              .int()
              .min(0)
              .max(10000000),
            isActive: z.boolean().optional(),
          })
        )
        .min(1),
    })
  ),
  wrap(async (req, res) => {
    const productId = idParam(req, "id");

    if (!(await Product.findByPk(productId))) {
      throw new AppError(404, "Product not found.");
    }

    await sequelize.transaction(async (transaction) => {
      for (const row of req.valid.variants) {
        const listing = await SellerListing.findOne({
          where: {
            shopId: req.valid.shopId,
            productId,
            productVariantId: row.id,
          },
          transaction,
        });

        const inventory = await Inventory.findOne({
          where: {
            shopId: req.valid.shopId,
            productId,
            productVariantId: row.id,
          },
          transaction,
        });

        if (!listing || !inventory) {
          throw new AppError(
            404,
            "Variant is not listed by the selected shop."
          );
        }

        await listing.update(
          {
            retailPrice: row.retailPrice,
            ...(row.isActive === undefined
              ? {}
              : { isActive: row.isActive }),
          },
          { transaction }
        );

        await inventory.update(
          { quantity: row.quantity },
          { transaction }
        );
      }
    });

    res.json({ success: true });
  })
);

// PRODUCT CREATE VALIDATION
const productSchema = z.object({
  shopId: id,

  name: z.string().trim().min(2).max(200),

  sku: z.string().trim().max(80).optional(),

  categoryId: id.optional(),
  subcategoryId: id.optional(),
  brandId: id.optional(),

  shortDescription: z.string().trim().max(500).nullable().optional(),
  description: z.string().trim().nullable().optional(),

  basePrice: z.coerce
    .number()
    .min(0)
    .max(99999999.99)
    .default(0),

  variants: z
    .array(
      z.object({
        variantName: z.string().trim().min(1).max(150),
        sku: z.string().trim().min(1).max(80),
        price: z.coerce.number().min(0),
        wholesalePrice: z.coerce.number().min(0).default(0),
        retailPrice: z.coerce.number().min(0),
        initialStock: z.coerce.number().int().min(0).default(0),

        attributeValues: z
          .array(
            z.object({
              attributeId: id,
              attributeValueId: id,
            })
          )
          .optional(),
      })
    )
    .min(1),
});

// CREATE PRODUCT
router.post(
  "/products",
  validate(productSchema),
  wrap(async (req, res) => {
    const v = req.valid;

    if (!(await Shop.findByPk(v.shopId, { attributes: ["id"] }))) {
      throw new AppError(404, "Shop not found");
    }

    if (
      v.categoryId &&
      !(await Category.findOne({
        where: {
          id: v.categoryId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(400, "Select an active category.");
    }

    if (
      v.subcategoryId &&
      !(await Subcategory.findOne({
        where: {
          id: v.subcategoryId,
          categoryId: v.categoryId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(
        400,
        "Select a subcategory belonging to the category."
      );
    }

    if (
      v.brandId &&
      !(await Brand.findOne({
        where: {
          id: v.brandId,
          isActive: true,
        },
      }))
    ) {
      throw new AppError(400, "Select an active brand.");
    }

    const product = await sequelize.transaction(async (transaction) => {
      const item = await Product.create(
        {
          name: v.name,
          sku:
            v.sku ||
            `SKU-${Date.now().toString(36).toUpperCase()}`,
          categoryId: v.categoryId || null,
          subcategoryId: v.subcategoryId || null,
          brandId: v.brandId || null,
          shortDescription: v.shortDescription || null,
          description: v.description || null,
          basePrice: v.basePrice,
          isActive: true,
        },
        { transaction }
      );

      for (const row of v.variants) {
        const variant = await ProductVariant.create(
          {
            productId: item.id,
            sku: row.sku,
            variantName: row.variantName,
            price: row.price,
            wholesalePrice: row.wholesalePrice,
            isActive: true,
          },
          { transaction }
        );

        for (const av of row.attributeValues || []) {
          if (
            !(await AttributeValue.findOne({
              where: {
                id: av.attributeValueId,
                attributeId: av.attributeId,
              },
              transaction,
            }))
          ) {
            throw new AppError(
              400,
              "An attribute value does not match its selected attribute."
            );
          }

          await ProductVariantValue.create(
            {
              productVariantId: variant.id,
              attributeId: av.attributeId,
              attributeValueId: av.attributeValueId,
            },
            { transaction }
          );
        }

        await SellerListing.create(
          {
            shopId: v.shopId,
            productId: item.id,
            productVariantId: variant.id,
            retailPrice: row.retailPrice,
            isActive: true,
          },
          { transaction }
        );

        await Inventory.create(
          {
            shopId: v.shopId,
            productId: item.id,
            productVariantId: variant.id,
            quantity: row.initialStock,
            lowStockThreshold: 5,
          },
          { transaction }
        );
      }

      return item;
    });

    res.status(201).json({
      product,
      message: "Product created successfully.",
    });
  })
);

// UPLOAD PRODUCT IMAGE
router.post(
  "/products/:id/images",
  uploadImage.single("image"),
  wrap(async (req, res) => {
    if (!req.file) {
      throw new AppError(400, "Select an image file to upload.");
    }

    const item = await Product.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Product not found.");
    }

    const isPrimary = req.body.isPrimary === "true";

    const oldPrimary = isPrimary
      ? await ProductImage.findAll({
          where: {
            productId: item.id,
            isPrimary: true,
          },
        })
      : [];

    await sequelize.transaction(async (transaction) => {
      if (isPrimary) {
        await ProductImage.update(
          { isPrimary: false },
          {
            where: { productId: item.id },
            transaction,
          }
        );
      }

      await ProductImage.create(
        {
          productId: item.id,
          imageUrl: `/uploads/${req.file.filename}`,
          isPrimary,
          sortOrder: Number(req.body.sortOrder || 0),
        },
        { transaction }
      );
    });

    for (const old of oldPrimary) {
      await removeImageIfUnused(old.imageUrl);
    }

    const image = await ProductImage.findOne({
      where: {
        productId: item.id,
        imageUrl: `/uploads/${req.file.filename}`,
      },
    });

    res.status(201).json({ image });
  })
);

// DELETE PRODUCT IMAGE
router.delete(
  "/products/:id/images/:imageId",
  wrap(async (req, res) => {
    const productId = idParam(req, "id");

    const image = await ProductImage.findOne({
      where: {
        id: idParam(req, "imageId"),
        productId,
      },
    });

    if (!image) {
      throw new AppError(404, "Product image not found.");
    }

    await image.destroy();

    await removeImageIfUnused(image.imageUrl);

    const remaining = await ProductImage.findAll({
      where: { productId },
      order: [
        ["sortOrder", "ASC"],
        ["id", "ASC"],
      ],
    });

    if (
      remaining.length &&
      !remaining.some((row) => row.isPrimary)
    ) {
      await remaining[0].update({ isPrimary: true });
    }

    res.json({ items: remaining });
  })
);

/* ───────────────────────── Approval Workflow ───────────────────────── */

const CATALOG_MODELS = {
  categories: Category,
  subcategories: Subcategory,
  brands: Brand,
  attributes: Attribute,
};

// GET PENDING SUBMISSIONS
router.get(
  "/pending",
  wrap(async (_req, res) => {
    const [cats, subs, brnds, attrs] = await Promise.all([
      Category.findAll({
        where: { submissionStatus: "pending" },
        include: [
          {
            model: Shop,
            as: "submittedByShop",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["createdAt", "ASC"]],
      }),

      Subcategory.findAll({
        where: { submissionStatus: "pending" },
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["id", "name"],
          },
          {
            model: Shop,
            as: "submittedByShop",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["createdAt", "ASC"]],
      }),

      Brand.findAll({
        where: { submissionStatus: "pending" },
        include: [
          {
            model: Shop,
            as: "submittedByShop",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["createdAt", "ASC"]],
      }),

      Attribute.findAll({
        where: { submissionStatus: "pending" },
        include: [
          {
            model: Shop,
            as: "submittedByShop",
            attributes: ["id", "name"],
            required: false,
          },
        ],
        order: [["createdAt", "ASC"]],
      }),
    ]);

    res.json({
      items: [
        ...cats.map((x) => ({
          ...x.toJSON(),
          type: "category",
        })),

        ...subs.map((x) => ({
          ...x.toJSON(),
          type: "subcategory",
        })),

        ...brnds.map((x) => ({
          ...x.toJSON(),
          type: "brand",
        })),

        ...attrs.map((x) => ({
          ...x.toJSON(),
          type: "attribute",
        })),
      ],
    });
  })
);

// APPROVE CATALOG RECORD
router.post(
  "/:resource/:id/approve",
  wrap(async (req, res) => {
    const Model = CATALOG_MODELS[req.params.resource];

    if (!Model) {
      throw new AppError(404, "Unknown catalog resource");
    }

    const item = await Model.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Record not found");
    }

    if (!item.submissionStatus) {
      throw new AppError(
        400,
        "This record was not submitted for approval"
      );
    }

    const updates = {
      submissionStatus: "approved",
      rejectionReason: null,
    };

    if (Model.rawAttributes.isActive) {
      updates.isActive = true;
    }

    await item.update(updates);

    res.json({ item });
  })
);

// REJECT CATALOG RECORD
router.post(
  "/:resource/:id/reject",
  validate(
    z.object({
      reason: z.string().trim().min(1).max(500),
    })
  ),
  wrap(async (req, res) => {
    const Model = CATALOG_MODELS[req.params.resource];

    if (!Model) {
      throw new AppError(404, "Unknown catalog resource");
    }

    const item = await Model.findByPk(idParam(req, "id"));

    if (!item) {
      throw new AppError(404, "Record not found");
    }

    if (!item.submissionStatus) {
      throw new AppError(
        400,
        "This record was not submitted for approval"
      );
    }

    const updates = {
      submissionStatus: "rejected",
      rejectionReason: req.valid.reason,
    };

    if (Model.rawAttributes.isActive) {
      updates.isActive = false;
    }

    await item.update(updates);

    res.json({ item });
  })
);

module.exports = router;
