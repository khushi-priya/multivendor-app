const router = require('express').Router();
const { Op } = require('sequelize');
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
  ProductReview,
  User,
  SellerListing,
  Inventory,
  Shop,
  Order,
} = require('../models');
const { sequelize } = require('../models');
const { wrap, idParam, AppError } = require('../utils/errors');
const { validate, z } = require('../utils/validate');

const page = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};

/* -------------------- Public Category Discovery -------------------- */
router.get(
  '/categories',
  wrap(async (req, res) => {
    const items = await Category.findAll({
      where: { isActive: true },
      include: [
        {
          model: Subcategory,
          as: 'subcategories',
          where: { isActive: true },
          required: false,
        },
      ],
      order: [
        ['name', 'ASC'],
        [{ model: Subcategory, as: 'subcategories' }, 'name', 'ASC'],
      ],
    });
    res.json({ items });
  }),
);

/* -------------------- Public Active Shops List --------------------- */
router.get(
  '/shops',
  wrap(async (req, res) => {
    const items = await Shop.findAll({
      where: { status: 'active' },
      attributes: ['id', 'name', 'address', 'contactPhone', 'contactEmail'],
      order: [['name', 'ASC']],
    });
    res.json({ items });
  }),
);

router.get('/brands', wrap(async (req, res) => {
  const items = await Brand.findAll({ where: { isActive: true }, attributes: ['id', 'name', 'imageUrl'], order: [['name', 'ASC']] });
  res.json({ items });
}));

/* -------------------- Public Product Discovery --------------------- */
router.get(
  '/products',
  validate(
    z.object({
      ...page,
      categoryId: z.coerce.number().int().positive().optional(),
      subcategoryId: z.coerce.number().int().positive().optional(),
      brandId: z.coerce.number().int().positive().optional(),
      availability: z.enum(['all', 'in_stock']).default('all'),
      shopId: z.coerce.number().int().positive().optional(),
      minPrice: z.coerce.number().min(0).optional(),
      maxPrice: z.coerce.number().min(0).optional(),
      q: z.string().trim().max(100).optional(),
      sort: z.enum(['price_asc', 'price_desc', 'newest', 'name_asc', 'name_desc']).default('newest'),
    }),
    'query',
  ),
  wrap(async (req, res) => {
    const { page: p, pageSize, categoryId, subcategoryId, brandId, shopId, minPrice, maxPrice, q, sort, availability } = req.valid;

    const where = { isActive: true };
    if (categoryId) where.categoryId = categoryId;
    if (subcategoryId) where.subcategoryId = subcategoryId;
    if (brandId) where.brandId = brandId;
    if (q) where.name = { [Op.like]: `%${q}%` };
    const listingPriceWhere = { isActive: true, ...(shopId ? { shopId } : {}) };
    if (minPrice !== undefined || maxPrice !== undefined) {
      listingPriceWhere.retailPrice = {};
      if (minPrice !== undefined) listingPriceWhere.retailPrice[Op.gte] = minPrice;
      if (maxPrice !== undefined) listingPriceWhere.retailPrice[Op.lte] = maxPrice;
    }
    const filterByListing = availability === 'in_stock' || minPrice !== undefined || maxPrice !== undefined;

    let order = [['createdAt', 'DESC']];
    if (sort === 'price_asc') order = [[{ model: ProductVariant, as: 'variants' }, { model: SellerListing, as: 'sellerListings' }, 'retailPrice', 'ASC']];
    else if (sort === 'price_desc') order = [[{ model: ProductVariant, as: 'variants' }, { model: SellerListing, as: 'sellerListings' }, 'retailPrice', 'DESC']];
    else if (sort === 'name_asc') order = [['name', 'ASC']];
    else if (sort === 'name_desc') order = [['name', 'DESC']];

    const { rows, count } = await Product.findAndCountAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug', 'imageUrl'] },
        { model: Subcategory, as: 'subcategory', attributes: ['id', 'name', 'slug', 'imageUrl'] },
        { model: Brand, as: 'brand', attributes: ['id', 'name', 'imageUrl'] },
        { model: ProductImage, as: 'images' },
        {
          model: ProductVariant,
          as: 'variants',
          where: { isActive: true },
          required: false,
          required: filterByListing,
          include: [
            { model: SellerListing, as: 'sellerListings', attributes: ['id', 'productVariantId', 'shopId', 'retailPrice', 'gstApplicable', 'gstRate', 'priceIncludesGst', 'hsnCode'], where: listingPriceWhere, required: filterByListing, include: [{ model: Shop, as: 'shop', where: { status: 'active' }, attributes: ['id'], required: true }] },
            ...(availability === 'in_stock' ? [{ model: Inventory, as: 'inventoryRows', where: { quantity: { [Op.gt]: 0 }, ...(shopId ? { shopId } : {}) }, required: true }] : []),
            {
              model: ProductVariantValue,
              as: 'variantValues',
              include: [
                { model: Attribute, as: 'attribute' },
                { model: AttributeValue, as: 'attributeValue' },
              ],
            },
          ],
        },
      ],
      order,
      limit: pageSize,
      offset: (p - 1) * pageSize,
      distinct: true,
    });

    // Attach active seller listings and stock
    const variantIds = rows.flatMap((prod) => prod.variants.map((v) => v.id));
    const listingWhere = { productVariantId: variantIds, isActive: true };
    if (shopId) listingWhere.shopId = shopId;

    const [listings, stockList] = await Promise.all([
      SellerListing.findAll({
        where: listingWhere,
        include: [{ model: Shop, as: 'shop', where: { status: 'active' }, attributes: ['id', 'name'] }],
      }),
      Inventory.findAll({ where: { productVariantId: variantIds } }),
    ]);
    const productIds = rows.map((product) => product.id);
    const reviewRows = productIds.length ? await ProductReview.findAll({ where: { productId: productIds }, attributes: ['productId', 'rating', [sequelize.fn('COUNT', sequelize.col('rating')), 'ratingCount']], group: ['productId', 'rating'], raw: true }) : [];
    const ratingsByProduct = new Map();
    for (const row of reviewRows) {
      const summary = ratingsByProduct.get(Number(row.productId)) || { count: 0, total: 0 };
      const countForRating = Number(row.ratingCount);
      summary.count += countForRating;
      summary.total += Number(row.rating) * countForRating;
      ratingsByProduct.set(Number(row.productId), summary);
    }

    const listingsByVariant = {};
    listings.forEach((l) => {
      if (!listingsByVariant[l.productVariantId]) listingsByVariant[l.productVariantId] = [];
      listingsByVariant[l.productVariantId].push(l);
    });

    const stockMap = {};
    stockList.forEach((s) => {
      stockMap[`${s.shopId}_${s.productVariantId}`] = s.quantity;
    });

    const items = rows.map((prod) => {
      const json = prod.toJSON();
      const rating = ratingsByProduct.get(Number(prod.id)) || { count: 0, total: 0 };
      json.ratingAverage = rating.count ? Number((rating.total / rating.count).toFixed(1)) : 0;
      json.reviewCount = rating.count;
      json.variants = json.variants.map((v) => {
        const variantListings = (listingsByVariant[v.id] || []).map((l) => ({
          id: l.id,
          shopId: l.shopId,
          shopName: l.shop?.name,
          retailPrice: Number(l.retailPrice),
          gstApplicable: l.gstApplicable,
          gstRate: Number(l.gstRate || 0),
          priceIncludesGst: l.priceIncludesGst,
          hsnCode: l.hsnCode,
          stock: stockMap[`${l.shopId}_${v.id}`] || 0,
        }));
        return {
          ...v,
          listings: variantListings,
        };
      });
      return json;
    });

    res.json({ items, total: count, page: p, pageSize });
  }),
);

/* -------------------- Product Detail Page ------------------------- */
router.get('/products/:id/reviews', validate(z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(10) }), 'query'), wrap(async (req, res) => {
  const productId = idParam(req, 'id');
  const product = await Product.findOne({ where: { id: productId, isActive: true }, attributes: ['id'] });
  if (!product) throw new AppError(404, 'Product not found');
  const { page: p, pageSize } = req.valid;
  const [count, items, ratingRows] = await Promise.all([
    ProductReview.count({ where: { productId } }),
    ProductReview.findAll({ where: { productId }, include: [{ model: User, as: 'customer', attributes: ['name'] }, { model: Order, as: 'order', attributes: ['status', 'deliveryStatus'] }], order: [['createdAt', 'DESC']], limit: pageSize, offset: (p - 1) * pageSize }),
    ProductReview.findAll({ where: { productId }, attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('rating')), 'ratingCount']], group: ['rating'], raw: true }),
  ]);
  const distribution = [1, 2, 3, 4, 5].map((rating) => ({ rating, count: Number(ratingRows.find((row) => Number(row.rating) === rating)?.ratingCount || 0) }));
  const weighted = distribution.reduce((sum, row) => sum + row.rating * row.count, 0);
  const average = count ? weighted / count : 0;
  res.json({ items: items.map((review) => ({ ...review.toJSON(), verifiedPurchase: review.order?.status === 'delivered' || review.order?.deliveryStatus === 'delivered' })), count, average: Number(average.toFixed(1)), distribution, page: p, pageSize });
}));

router.get(
  '/products/:id',
  wrap(async (req, res) => {
    const product = await Product.findOne({
      where: { id: idParam(req, 'id'), isActive: true },
      include: [
        { model: Category, as: 'category' },
        { model: Subcategory, as: 'subcategory' },
        { model: Brand, as: 'brand' },
        { model: ProductImage, as: 'images' },
        {
          model: ProductVariant,
          as: 'variants',
          where: { isActive: true },
          required: false,
          include: [
            {
              model: ProductVariantValue,
              as: 'variantValues',
              include: [
                { model: Attribute, as: 'attribute' },
                { model: AttributeValue, as: 'attributeValue' },
              ],
            },
          ],
        },
      ],
    });

    if (!product) throw new AppError(404, 'Product not found');

    const json = product.toJSON();
    const variantIds = json.variants.map((v) => v.id);

    const [listings, stockList] = await Promise.all([
      SellerListing.findAll({
        where: { productVariantId: variantIds, isActive: true },
        include: [{ model: Shop, as: 'shop', where: { status: 'active' }, attributes: ['id', 'name', 'address'] }],
      }),
      Inventory.findAll({ where: { productVariantId: variantIds } }),
    ]);

    const listingsByVariant = {};
    listings.forEach((l) => {
      if (!listingsByVariant[l.productVariantId]) listingsByVariant[l.productVariantId] = [];
      listingsByVariant[l.productVariantId].push(l);
    });

    const stockMap = {};
    stockList.forEach((s) => {
      stockMap[`${s.shopId}_${s.productVariantId}`] = s.quantity;
    });

    json.variants = json.variants.map((v) => ({
      ...v,
      listings: (listingsByVariant[v.id] || []).map((l) => ({
        id: l.id,
        shopId: l.shopId,
        shopName: l.shop?.name,
        retailPrice: Number(l.retailPrice),
        gstApplicable: l.gstApplicable,
        gstRate: Number(l.gstRate || 0),
        priceIncludesGst: l.priceIncludesGst,
        hsnCode: l.hsnCode,
        stock: stockMap[`${l.shopId}_${v.id}`] || 0,
      })),
    }));

    res.json({ product: json });
  }),
);

module.exports = router;
