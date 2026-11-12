// Integration tests: Catalog, Dynamic Variants, Wholesale POs & Goods Receipts,
// Inventory Concurrency, Customer Storefront, Checkout & Delivery Workflow, Tenant Isolation.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const catalogActionsModule = import("../../client/src/utils/catalogActions.js");

process.env.NODE_ENV = "test";
const {
  sequelize,
  User,
  Shop,
  ShopCategory,
  ShopMembership,
  Wholesaler,
  WholesalerShopAccess,
  Category,
  Product,
  ProductVariant,
  SellerListing,
  Inventory,
  PurchaseOrder,
  PurchaseOrderItem,
  Order,
  OrderStatusHistory,
  Payment,
  DeliveryAssignment,
  Coupon,
  CouponRedemption,
} = require("../src/models");
const { createApp } = require("../src/app");
const {
  permissionGranted,
  requiredPermissionForRequest,
} = require("../src/services/permissions");
const { calculateOrderPricing } = require("../src/services/orderPricing");
const {
  getCouponDiscount,
  reserveCouponForOrder,
  confirmCouponRedemption,
} = require("../src/services/couponService");

const H = { "X-Requested-With": "XMLHttpRequest" };
const run =
  Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
const PASSWORD = "Passw0rd-test123";

let app;
let admin;
let shopAId, shopBId;
let ownerAEmail = `owner-a-${run}@test.local`;
let ownerBEmail = `owner-b-${run}@test.local`;
let customerEmail = `customer-${run}@test.local`;
let deliveryEmail = `delivery-${run}@test.local`;
let agentOwnerA, agentOwnerB, agentCustomer, agentDelivery;
let wholesalerId;
let productIdForArchive;
let productVariantIdForSellerFlow;
let couponCodeForCheckout;
let couponIdForCheckout;

test("module view permissions authorize normal operations, not sensitive actions", () => {
  const permissions = ["inventory.view", "orders.view", "payments.view"];
  for (const action of ["create", "update", "delete"]) {
    assert.equal(permissionGranted(permissions, `inventory.${action}`), true);
    assert.equal(permissionGranted(permissions, `orders.${action}`), true);
  }
  assert.equal(permissionGranted(permissions, "orders.approve"), false);
  assert.equal(permissionGranted(permissions, "orders.assign"), false);
  assert.equal(permissionGranted(permissions, "payments.collect"), false);
  assert.equal(permissionGranted(permissions, "payments.reconcile"), false);
  assert.equal(permissionGranted(permissions, "employees.manage"), false);
  assert.equal(requiredPermissionForRequest("/delivery", "GET"), "delivery.view");
  assert.equal(
    requiredPermissionForRequest("/delivery/assignments/1/status", "PATCH"),
    "delivery.update",
  );
});

test("order pricing snapshots configured GST and weight-based delivery", () => {
  const quote = calculateOrderPricing({
    items: [{
      quantity: 1,
      listing: {
        retailPrice: "118.00",
        gstApplicable: true,
        gstRate: "18.00",
        priceIncludesGst: true,
        hsnCode: "610910",
        variant: {
          id: 21,
          variantName: "Standard",
          sku: "SKU-21",
          weight: "2.20",
          weightUnit: "kg",
          product: { id: 11, name: "Configured shirt", weight: null, weightUnit: "kg" },
        },
      },
    }],
    shop: {
      state: "Karnataka",
      shippingSettings: {
        baseFee: "25.00",
        baseWeightKg: 1,
        additionalWeightRate: "10.00",
        additionalWeightStepKg: 1,
        zones: [{ name: "Local zone", pincodes: ["560001"], surcharge: "5.00", available: true }],
      },
    },
    address: { state: "Karnataka", postalCode: "560001" },
  });
  assert.equal(quote.items[0].taxableValue, "100.00");
  assert.equal(quote.items[0].taxAmount, "18.00");
  assert.equal(quote.taxBreakdown.items[0].components.cgst, "9.00");
  assert.equal(quote.taxBreakdown.items[0].components.sgst, "9.00");
  assert.equal(quote.taxBreakdown.items[0].components.igst, "0.00");
  assert.equal(quote.shippingSnapshot.additionalWeightSlabs, 2);
  assert.equal(quote.shippingSnapshot.locationSurcharge, "5.00");
  assert.equal(quote.deliveryFee, "50.00");
  assert.equal(quote.totalAmount, "168.00");
});

test("order pricing uses IGST for a different delivery state", () => {
  const quote = calculateOrderPricing({
    items: [{
      quantity: 2,
      listing: {
        retailPrice: "100.00",
        gstApplicable: true,
        gstRate: "18.00",
        priceIncludesGst: false,
        variant: {
          id: 22,
          variantName: "Standard",
          sku: "SKU-22",
          weight: "500",
          weightUnit: "g",
          product: { id: 12, name: "Configured item", weight: null, weightUnit: "kg" },
        },
      },
    }],
    shop: {
      state: "Karnataka",
      shippingSettings: {
        baseFee: "25.00",
        baseWeightKg: 1,
        additionalWeightRate: "10.00",
        additionalWeightStepKg: 1,
        zones: [{ name: "All pincodes", pincodes: ["*"], surcharge: "0.00", available: true }],
      },
    },
    address: { state: "Delhi", postalCode: "110001" },
  });
  assert.equal(quote.items[0].taxableValue, "200.00");
  assert.equal(quote.items[0].taxAmount, "36.00");
  assert.equal(quote.taxBreakdown.items[0].components.igst, "36.00");
  assert.equal(quote.taxBreakdown.items[0].components.cgst, "0.00");
  assert.equal(quote.taxBreakdown.items[0].components.sgst, "0.00");
  assert.equal(quote.totalWeightKg, 1);
  assert.equal(quote.totalAmount, "261.00");
});

test("Catalog table action policy keeps controls visible and follows approval permissions", async () => {
  const { catalogActions } = await catalogActionsModule;
  const ownPending = catalogActions(
    { submittedByShopId: "12", submissionStatus: "pending" },
    { shopId: 12 },
  );
  assert.equal(ownPending.showEdit, true);
  assert.equal(ownPending.showDelete, true);
  assert.equal(ownPending.editEnabled, true);
  assert.equal(ownPending.deleteEnabled, true);
  assert.equal(ownPending.statusEnabled, false);

  const ownRejected = catalogActions(
    { submittedByShopId: 12, submissionStatus: "rejected" },
    { shopId: 12 },
  );
  assert.equal(ownRejected.editEnabled, true);
  assert.equal(ownRejected.deleteEnabled, true);

  const shared = catalogActions(
    { submittedByShopId: null, submissionStatus: "approved", isActive: true },
    { shopId: 12 },
  );
  assert.equal(shared.showEdit, true);
  assert.equal(shared.showDelete, true);
  assert.equal(shared.editEnabled, false);
  assert.equal(shared.deleteEnabled, false);
  assert.equal(shared.statusEnabled, false);
  const ownApproved = catalogActions(
    { submittedByShopId: "12", submissionStatus: "approved" },
    { shopId: 12 },
  );
  assert.equal(ownApproved.editEnabled, false);
  assert.match(ownApproved.reason, /Approved catalog entries/);

  const attribute = catalogActions(
    { submissionStatus: "approved" },
    { isAdmin: true, supportsActive: false },
  );
  assert.equal(attribute.statusEnabled, false);

  const admin = catalogActions(
    { submissionStatus: "approved", isActive: true },
    { isAdmin: true },
  );
  assert.equal(admin.editEnabled, true);
  assert.equal(admin.deleteEnabled, true);
  assert.equal(admin.statusEnabled, true);
});

async function login(email, password = PASSWORD) {
  const agent = request.agent(app);
  const res = await agent
    .post("/api/v1/auth/login")
    .set(H)
    .send({ email, password });
  return { agent, res };
}

before(async () => {
  app = createApp();

  // Create Super Admin
  const adminEmail = `admin-comp-${run}@test.local`;
  await User.create({
    name: "Admin",
    email: adminEmail,
    role: "super_admin",
    status: "active",
    passwordHash: await bcrypt.hash(PASSWORD, 4),
  });
  admin = (await login(adminEmail)).agent;

  // Create Shop Category
  const cat = (
    await ShopCategory.findOrCreate({ where: { name: `Cat-${run}` } })
  )[0];

  // Create Shop A with Owner A
  const shopARes = await admin
    .post("/api/v1/admin/shops")
    .set(H)
    .send({
      shop: { name: `Shop A ${run}`, categoryId: cat.id, address: "Road 1" },
      owner: {
        name: `Owner A ${run}`,
        email: ownerAEmail,
        phone: "9000000001",
        initialPassword: PASSWORD,
      },
    });
  shopAId = shopARes.body.shop.id;

  // Create Shop B with Owner B
  const shopBRes = await admin
    .post("/api/v1/admin/shops")
    .set(H)
    .send({
      shop: { name: `Shop B ${run}`, categoryId: cat.id, address: "Road 2" },
      owner: {
        name: `Owner B ${run}`,
        email: ownerBEmail,
        phone: "9000000002",
        initialPassword: PASSWORD,
      },
    });
  shopBId = shopBRes.body.shop.id;

  // Create Wholesaler and authorize for Shop A only
  const w = await Wholesaler.create({
    name: `Wholesaler ${run}`,
    status: "active",
  });
  wholesalerId = w.id;
  await admin
    .put(`/api/v1/admin/shops/${shopAId}/wholesalers`)
    .set(H)
    .send({ wholesalerIds: [wholesalerId] });

  // Login agents
  agentOwnerA = (await login(ownerAEmail)).agent;
  agentOwnerB = (await login(ownerBEmail)).agent;
});

after(async () => {
  await new Promise((resolve) => app.locals.sessionStore.close(resolve));
  await sequelize.close();
});

test("Customer registration and profile", async () => {
  const regRes = await request(app).post("/api/v1/auth/register").set(H).send({
    name: "Test Customer",
    email: customerEmail,
    password: PASSWORD,
    phone: "9876543210",
  });
  assert.equal(regRes.status, 201);
  assert.equal(regRes.body.user.role, "customer");

  agentCustomer = (await login(customerEmail)).agent;
  const meRes = await agentCustomer.get("/api/v1/auth/me");
  assert.equal(meRes.status, 200);
  assert.equal(meRes.body.user.email, customerEmail);
});

test("Catalog product with dynamic variants and shop listing", async () => {
  const attribute = await agentOwnerA
    .post("/api/v1/shop/catalog/attributes")
    .set(H)
    .send({ name: "Size", code: `size_${run}` });
  assert.equal(attribute.status, 201);
  const attributeValue = await agentOwnerA
    .post(`/api/v1/shop/catalog/attributes/${attribute.body.item.id}/values`)
    .set(H)
    .send({ value: "M" });
  assert.equal(attributeValue.status, 201);
  assert.equal(attribute.body.item.submissionStatus, "pending");
  const approval = await admin
    .post(`/api/v1/admin/catalog/attributes/${attribute.body.item.id}/approve`)
    .set(H)
    .send({});
  assert.equal(approval.status, 200);
  const prodRes = await agentOwnerA
    .post("/api/v1/shop/catalog/products")
    .set(H)
    .send({
      name: `Premium Shirt ${run}`,
      description: "Cotton shirt",
      basePrice: 500,
      weight: 1,
      weightUnit: "kg",
      variants: [
        {
          variantName: "Medium Blue",
          sku: `SHIRT-M-BLU-${run}`,
          price: 500,
          wholesalePrice: 300,
          retailPrice: 650,
          initialStock: 10,
          attributeValues: [
            {
              attributeId: attribute.body.item.id,
              attributeValueId: attributeValue.body.value.id,
            },
          ],
        },
        {
          variantName: "Large Blue",
          sku: `SHIRT-L-BLU-${run}`,
          price: 550,
          wholesalePrice: 350,
          retailPrice: 700,
          initialStock: 5,
        },
      ],
    });

  assert.equal(prodRes.status, 201);
  assert.ok(prodRes.body.product.id);

  const productId = prodRes.body.product.id;
  productIdForArchive = productId;
  const ownCatalog = await agentOwnerA.get("/api/v1/shop/catalog/products");
  const otherCatalog = await agentOwnerB.get("/api/v1/shop/catalog/products");
  assert.ok(ownCatalog.body.items.some((item) => item.id === productId));
  assert.equal(
    otherCatalog.body.items.some((item) => item.id === productId),
    true,
  );
  assert.equal(
    otherCatalog.body.items.find((item) => item.id === productId)
      .variants[0].sellerListing,
    null,
  );
  assert.equal(
    (
      await agentOwnerB
        .patch(`/api/v1/shop/catalog/products/${productId}/listing`)
        .set(H)
        .send({ variants: [{ id: 999999, retailPrice: 1, quantity: 1 }] })
    ).status,
    404,
  );
  const adminShopCatalog = await admin.get(
    `/api/v1/admin/catalog/products?shopId=${shopAId}`,
  );
  assert.equal(adminShopCatalog.status, 200);
  assert.ok(adminShopCatalog.body.items.some((item) => item.id === productId));
  assert.equal(
    (await agentOwnerA.get("/api/v1/admin/catalog/products")).status,
    403,
  );

  const savedProduct = ownCatalog.body.items.find(
    (item) => item.id === productId,
  );
  const firstVariant = savedProduct.variants[0];
  productVariantIdForSellerFlow = firstVariant.id;
  const changedSku = `EDIT-${run}`;
  const edited = await agentOwnerA
    .patch(`/api/v1/shop/catalog/products/${productId}`)
    .set(H)
    .send({
      name: `Premium Shirt Updated ${run}`,
      description: "Updated cotton shirt",
      basePrice: 520,
      categoryId: null,
      subcategoryId: null,
      brandId: null,
      variants: savedProduct.variants.map((variant) => ({
        id: variant.id,
        variantName: variant.variantName,
        sku: variant.id === firstVariant.id ? changedSku : variant.sku,
        price: variant.price,
        wholesalePrice:
          variant.id === firstVariant.id ? 321.5 : variant.wholesalePrice,
        retailPrice:
          variant.id === firstVariant.id
            ? 675
            : variant.sellerListing.retailPrice,
        initialStock:
          variant.id === firstVariant.id ? 13 : variant.inventory.quantity,
        isActive:
          variant.id === firstVariant.id
            ? false
            : variant.sellerListing.isActive,
        attributeValues: (variant.variantValues || []).map((row) => ({
          attributeId: row.attributeId,
          attributeValueId: row.attributeValueId,
        })),
      })),
    });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.product.name, `Premium Shirt Updated ${run}`);
  const savedVariant = await ProductVariant.findByPk(firstVariant.id);
  const savedListing = await SellerListing.findOne({
    where: { shopId: shopAId, productVariantId: firstVariant.id },
  });
  const savedInventory = await Inventory.findOne({
    where: { shopId: shopAId, productVariantId: firstVariant.id },
  });
  assert.equal(savedVariant.sku, changedSku);
  assert.equal(Number(savedVariant.wholesalePrice), 321.5);
  assert.equal(Number(savedListing.retailPrice), 675);
  assert.equal(savedListing.isActive, false);
  assert.equal(savedInventory.quantity, 13);
  await savedVariant.update({ isActive: true });
  const secondShopListing = await agentOwnerB
    .patch(`/api/v1/shop/catalog/products/${productId}/listing`)
    .set(H)
    .send({
      variants: [{
        id: firstVariant.id,
        retailPrice: 800,
        quantity: 7,
        isActive: true,
        gstApplicable: true,
        gstRate: 5,
        priceIncludesGst: true,
      }],
    });
  assert.equal(secondShopListing.status, 200);
  const nowShared = await agentOwnerA.get("/api/v1/shop/catalog/products");
  assert.equal(
    nowShared.body.items.find((item) => item.id === productId)
      .sharedAcrossShops,
    true,
  );
  assert.equal(
    (
      await agentOwnerA
        .patch(`/api/v1/shop/catalog/products/${productId}`)
        .set(H)
        .send({ name: "Shared product edit" })
    ).status,
    403,
  );
  assert.equal(
    (
      await agentOwnerB
        .patch(`/api/v1/shop/catalog/products/${productId}`)
        .set(H)
        .send({ name: "Unauthorized edit" })
    ).status,
    403,
  );
  const shopSpecificUpdate = await agentOwnerA
    .patch(`/api/v1/shop/catalog/products/${productId}/listing`)
    .set(H)
    .send({
      variants: [
        {
          id: firstVariant.id,
          retailPrice: 700,
          quantity: 12,
          isActive: false,
        },
      ],
    });
  assert.equal(shopSpecificUpdate.status, 200);
  const otherShopListing = await SellerListing.findOne({
    where: { shopId: shopBId, productVariantId: firstVariant.id },
  });
  assert.equal(Number(otherShopListing.retailPrice), 800);
  assert.equal(otherShopListing.isActive, true);
  // Restore shop A availability; keep shop B's independent listing for storefront checks.
  const restored = await agentOwnerA
    .patch(`/api/v1/shop/catalog/products/${productId}/listing`)
    .set(H)
    .send({
      variants: [
        { id: firstVariant.id, retailPrice: 675, quantity: 13, isActive: true },
      ],
    });
  assert.equal(restored.status, 200);

  // Verify stock was initialized
  const invRes = await agentOwnerA.get("/api/v1/shop/inventory");
  assert.equal(invRes.status, 200);
  assert.ok(invRes.body.items.length >= 2);
});

test("Shop catalog submissions can be edited only by their submitting shop", async () => {
  const created = await agentOwnerA
    .post("/api/v1/shop/catalog/categories")
    .set(H)
    .send({ name: `Owner Category ${run}` });
  assert.equal(created.status, 201);
  assert.equal(created.body.item.submissionStatus, "pending");
  const edited = await agentOwnerA
    .patch(`/api/v1/shop/catalog/categories/${created.body.item.id}`)
    .set(H)
    .send({ name: `Owner Category Updated ${run}` });
  assert.equal(edited.status, 200);
  assert.equal(edited.body.item.name, `Owner Category Updated ${run}`);
  assert.equal(
    (
      await agentOwnerB
        .patch(`/api/v1/shop/catalog/categories/${created.body.item.id}`)
        .set(H)
        .send({ name: "Cross-shop edit" })
    ).status,
    403,
  );
  assert.equal(
    (
      await agentOwnerA
        .patch(`/api/v1/shop/catalog/categories/${created.body.item.id}/status`)
        .set(H)
        .send({ isActive: true })
    ).status,
    403,
  );

  const rejected = await agentOwnerA
    .post("/api/v1/shop/catalog/categories")
    .set(H)
    .send({ name: `Rejected Category ${run}` });
  assert.equal(rejected.status, 201);
  assert.equal(
    (
      await admin
        .post(
          `/api/v1/admin/catalog/categories/${rejected.body.item.id}/reject`,
        )
        .set(H)
        .send({ reason: "Please clarify the category scope." })
    ).status,
    200,
  );
  const resubmitted = await agentOwnerA
    .patch(`/api/v1/shop/catalog/categories/${rejected.body.item.id}`)
    .set(H)
    .send({ name: `Resubmitted Category ${run}` });
  assert.equal(resubmitted.status, 200);
  assert.equal(resubmitted.body.item.submissionStatus, "pending");
  assert.equal(resubmitted.body.item.rejectionReason, null);

  const removable = await agentOwnerA
    .post("/api/v1/shop/catalog/categories")
    .set(H)
    .send({ name: `Removable Category ${run}` });
  assert.equal(removable.status, 201);
  assert.equal(
    (
      await agentOwnerA
        .delete(`/api/v1/shop/catalog/categories/${removable.body.item.id}`)
        .set(H)
    ).status,
    204,
  );

  const parent = await admin
    .post("/api/v1/admin/catalog/categories")
    .set(H)
    .send({ name: `Parent ${run}` });
  assert.equal(parent.status, 201);
  const subcategory = await agentOwnerA
    .post("/api/v1/shop/catalog/subcategories")
    .set(H)
    .send({ categoryId: parent.body.item.id, name: `Child ${run}` });
  assert.equal(subcategory.status, 201);
  const subcategoryEdit = await agentOwnerA
    .patch(`/api/v1/shop/catalog/subcategories/${subcategory.body.item.id}`)
    .set(H)
    .send({ categoryId: parent.body.item.id, name: `Child Updated ${run}` });
  assert.equal(subcategoryEdit.status, 200);
  assert.equal(subcategoryEdit.body.item.name, `Child Updated ${run}`);
  assert.equal(
    (
      await agentOwnerB
        .delete(
          `/api/v1/shop/catalog/subcategories/${subcategory.body.item.id}`,
        )
        .set(H)
    ).status,
    403,
  );
  assert.equal(
    (
      await agentOwnerA
        .delete(
          `/api/v1/shop/catalog/subcategories/${subcategory.body.item.id}`,
        )
        .set(H)
    ).status,
    204,
  );
  assert.equal(
    (
      await admin
        .delete(`/api/v1/admin/catalog/categories/${parent.body.item.id}`)
        .set(H)
    ).status,
    204,
  );

  const brand = await agentOwnerA
    .post("/api/v1/shop/catalog/brands")
    .set(H)
    .send({ name: `Owner Brand ${run}`, description: "Submitted brand" });
  assert.equal(brand.status, 201);
  const brandEdit = await agentOwnerA
    .patch(`/api/v1/shop/catalog/brands/${brand.body.item.id}`)
    .set(H)
    .send({ name: `Owner Brand Updated ${run}` });
  assert.equal(brandEdit.status, 200);
  assert.equal(brandEdit.body.item.name, `Owner Brand Updated ${run}`);
  assert.equal(
    (
      await agentOwnerB
        .patch(`/api/v1/shop/catalog/brands/${brand.body.item.id}`)
        .set(H)
        .send({ name: "Cross-shop brand" })
    ).status,
    403,
  );
  assert.equal(
    (
      await agentOwnerA
        .delete(`/api/v1/shop/catalog/brands/${brand.body.item.id}`)
        .set(H)
    ).status,
    204,
  );

  const sharedBrand = await admin
    .post("/api/v1/admin/catalog/brands")
    .set(H)
    .send({ name: `Shared Brand ${run}` });
  assert.equal(sharedBrand.status, 201);
  assert.equal(
    (
      await agentOwnerA
        .patch(`/api/v1/shop/catalog/brands/${sharedBrand.body.item.id}`)
        .set(H)
        .send({ name: "Owner cannot rename shared data" })
    ).status,
    403,
  );
  assert.equal(
    (
      await agentOwnerA
        .delete(`/api/v1/shop/catalog/brands/${sharedBrand.body.item.id}`)
        .set(H)
    ).status,
    403,
  );

  const attribute = await agentOwnerA
    .post("/api/v1/shop/catalog/attributes")
    .set(H)
    .send({
      name: `Material ${run}`,
      code: `material_${run}`,
      values: ["Cotton", "Wool"],
    });
  assert.equal(attribute.status, 201);
  assert.deepEqual(
    attribute.body.item.values.map((value) => value.value).sort(),
    ["Cotton", "Wool"],
  );
  const attributeEdit = await agentOwnerA
    .patch(`/api/v1/shop/catalog/attributes/${attribute.body.item.id}`)
    .set(H)
    .send({
      name: `Material Updated ${run}`,
      code: `material_updated_${run}`,
      values: ["Wool", "Linen"],
    });
  assert.equal(attributeEdit.status, 200);
  assert.deepEqual(
    attributeEdit.body.item.values.map((value) => value.value).sort(),
    ["Linen", "Wool"],
  );
  assert.equal(
    (
      await agentOwnerB
        .patch(`/api/v1/shop/catalog/attributes/${attribute.body.item.id}`)
        .set(H)
        .send({ name: "Cross-shop attribute" })
    ).status,
    403,
  );
  assert.equal(
    (
      await agentOwnerA
        .delete(`/api/v1/shop/catalog/attributes/${attribute.body.item.id}`)
        .set(H)
    ).status,
    204,
  );
});

test("Super Admin catalog status toggle persists and unused category deletion succeeds", async () => {
  const created = await admin
    .post("/api/v1/admin/catalog/categories")
    .set(H)
    .send({ name: `Admin Toggle ${run}` });
  assert.equal(created.status, 201);
  const id = created.body.item.id;
  const toggled = await admin
    .patch(`/api/v1/admin/catalog/categories/${id}`)
    .set(H)
    .send({ isActive: false });
  assert.equal(toggled.status, 200);
  assert.equal(toggled.body.item.isActive, false);
  const persisted = await Category.findByPk(id);
  assert.equal(persisted.isActive, false);
  assert.equal(
    (await admin.delete(`/api/v1/admin/catalog/categories/${id}`).set(H))
      .status,
    204,
  );
});

test("Manage Wholesalers only returns access granted to the authenticated shop", async () => {
  const shopDashboard = await agentOwnerA.get("/api/v1/shop/dashboard");
  assert.equal(shopDashboard.status, 200);
  assert.equal(shopDashboard.body.shop.id, shopAId);

  const adminDashboard = await admin.get("/api/v1/admin/stats");
  assert.equal(adminDashboard.status, 200);
  assert.equal(typeof adminDashboard.body.shops, "number");

  const shopAList = await agentOwnerA.get("/api/v1/shop/wholesalers");
  const shopBList = await agentOwnerB.get("/api/v1/shop/wholesalers");
  assert.equal(shopAList.status, 200);
  assert.ok(shopAList.body.items.some((item) => item.id === wholesalerId));
  assert.equal(shopBList.status, 200);
  assert.equal(
    shopBList.body.items.some((item) => item.id === wholesalerId),
    false,
  );
  assert.equal(
    (await agentOwnerB.get(`/api/v1/shop/wholesalers/${wholesalerId}`)).status,
    404,
  );

  const detailUpdate = await agentOwnerA
    .patch(`/api/v1/shop/wholesalers/${wholesalerId}`)
    .set(H)
    .send({
      contactPerson: `Supplier Contact ${run}`,
      contactEmail: `supplier-detail-${run}@test.local`,
    });
  assert.equal(detailUpdate.status, 200);
  const detail = await agentOwnerA.get(
    `/api/v1/shop/wholesalers/${wholesalerId}`,
  );
  assert.equal(detail.status, 200);
  assert.equal(detail.body.item.contactPerson, `Supplier Contact ${run}`);
  assert.equal(
    detail.body.item.contactEmail,
    `supplier-detail-${run}@test.local`,
  );

  const inactive = await agentOwnerA
    .patch(`/api/v1/shop/wholesalers/${wholesalerId}`)
    .set(H)
    .send({ status: "inactive" });
  assert.equal(inactive.status, 200);
  assert.deepEqual(inactive.body.item, {
    id: wholesalerId,
    status: "inactive",
  });
  assert.equal(
    (await agentOwnerA.get("/api/v1/shop/wholesalers")).body.items.find(
      (item) => item.id === wholesalerId,
    ).status,
    "inactive",
  );
  const afterStatusToggle = await agentOwnerA.get(
    `/api/v1/shop/wholesalers/${wholesalerId}`,
  );
  assert.equal(afterStatusToggle.body.item.contactPerson, `Supplier Contact ${run}`);
  assert.equal(
    afterStatusToggle.body.item.contactEmail,
    `supplier-detail-${run}@test.local`,
  );
  assert.equal(
    (
      await agentOwnerB
        .patch(`/api/v1/shop/wholesalers/${wholesalerId}`)
        .set(H)
        .send({ status: "active" })
    ).status,
    404,
  );

  const shopListing = await SellerListing.findOne({
    where: { shopId: shopAId },
    attributes: ["productId", "productVariantId"],
  });
  const inactivePurchase = await agentOwnerA
    .post("/api/v1/shop/wholesale-orders")
    .set(H)
    .send({
      wholesalerId,
      items: [
        {
          productId: shopListing.productId,
          productVariantId: shopListing.productVariantId,
          quantity: 1,
          unitPrice: 1,
        },
      ],
    });
  assert.equal(inactivePurchase.status, 403);

  const reactivated = await agentOwnerA
    .patch(`/api/v1/shop/wholesalers/${wholesalerId}`)
    .set(H)
    .send({ status: "active" });
  assert.equal(reactivated.status, 200);

  const created = await agentOwnerA.post("/api/v1/shop/wholesalers").set(H).send({
    name: `Shop Created Wholesaler ${run}`,
    contactPerson: "Supplier Contact",
    contactPhone: "9876543210",
    contactEmail: `supplier-${run}@test.local`,
    status: "active",
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.item.contactPerson, "Supplier Contact");
  assert.equal(
    (await agentOwnerA.get("/api/v1/shop/wholesalers")).body.items.some(
      (item) => item.id === created.body.item.id,
    ),
    true,
  );
  assert.equal(
    (await agentOwnerB.get("/api/v1/shop/wholesalers")).body.items.some(
      (item) => item.id === created.body.item.id,
    ),
    false,
  );
  assert.equal(
    (
      await agentOwnerA.post("/api/v1/shop/wholesalers").set(H).send({
        name: `Shop Created Wholesaler ${run}`,
        contactPerson: "Supplier Contact",
        contactPhone: "9876543210",
      })
    ).status,
    409,
  );
});

test("Shop Owner manages coupons with shop isolation and safe deletion", async () => {
  couponCodeForCheckout = `WELCOME-${run}`.toUpperCase();
  const created = await agentOwnerA.post("/api/v1/shop/coupons").set(H).send({
    code: couponCodeForCheckout.toLowerCase(),
    discountType: "percentage",
    discountValue: "10.00",
    maxDiscountAmount: "50.00",
    minimumOrderAmount: "10.00",
    totalUsageLimit: 1,
    perCustomerUsageLimit: 1,
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2099-12-31",
    status: "active",
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.item.code, couponCodeForCheckout);
  couponIdForCheckout = created.body.item.id;

  const duplicate = await agentOwnerA.post("/api/v1/shop/coupons").set(H).send({
    code: couponCodeForCheckout.toLowerCase(),
    discountType: "flat",
    discountValue: "10.00",
    minimumOrderAmount: "0.00",
    totalUsageLimit: 10,
    perCustomerUsageLimit: 1,
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2099-12-31",
    status: "active",
  });
  assert.equal(duplicate.status, 409);

  const list = await agentOwnerA.get("/api/v1/shop/coupons");
  assert.equal(list.status, 200);
  assert.ok(list.body.items.some((item) => item.id === couponIdForCheckout));
  assert.equal(list.body.summary.totalCoupons >= 1, true);
  assert.equal(
    (await agentOwnerB.get(`/api/v1/shop/coupons/${couponIdForCheckout}`)).status,
    404,
  );
  assert.equal(
    (await agentOwnerB.patch(`/api/v1/shop/coupons/${couponIdForCheckout}/status`).set(H).send({
      status: "inactive",
    })).status,
    404,
  );

  const detail = await agentOwnerA.get(`/api/v1/shop/coupons/${couponIdForCheckout}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.item.maxDiscountAmount, "50.00");
  const updated = await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}`).set(H).send({
    minimumOrderAmount: "15.00",
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.item.minimumOrderAmount, "15.00");

  const inactive = await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}/status`).set(H).send({
    status: "inactive",
  });
  assert.equal(inactive.status, 200);
  assert.equal(inactive.body.item.status, "inactive");
  const active = await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}/status`).set(H).send({
    status: "active",
  });
  assert.equal(active.status, 200);

  const flat = await agentOwnerA.post("/api/v1/shop/coupons").set(H).send({
    code: `FLAT-${run}`.toUpperCase(),
    discountType: "flat",
    discountValue: "100.00",
    minimumOrderAmount: "0.00",
    totalUsageLimit: null,
    perCustomerUsageLimit: 1,
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2099-12-31",
    status: "active",
  });
  assert.equal(flat.status, 201);
  assert.equal(
    (await agentOwnerA.delete(`/api/v1/shop/coupons/${flat.body.item.id}`).set(H)).status,
    200,
  );
});

test("Coupon reservation serializes concurrent claims and redemption increments once", async () => {
  const raceCoupon = await agentOwnerA.post("/api/v1/shop/coupons").set(H).send({
    code: `RACE-${run}`.toUpperCase(),
    discountType: "flat",
    discountValue: "10.00",
    minimumOrderAmount: "0.00",
    totalUsageLimit: 1,
    perCustomerUsageLimit: 1,
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2099-12-31",
    status: "active",
  });
  assert.equal(raceCoupon.status, 201);

  const customers = await Promise.all([1, 2].map((number) =>
    User.create({
      name: `Coupon Race Customer ${number}`,
      email: `coupon-race-${number}-${run}@test.local`,
      role: "customer",
      status: "active",
      passwordHash: bcrypt.hashSync(PASSWORD, 4),
    }),
  ));

  const attempt = (customer, suffix) => sequelize.transaction(async (transaction) => {
    const discount = await getCouponDiscount({
      shopId: shopAId,
      customerId: customer.id,
      code: raceCoupon.body.item.code,
      subtotal: "100.00",
      transaction,
      lock: true,
    });
    const order = await Order.create({
      orderNumber: `COUPON-RACE-${run}-${suffix}`,
      shopId: shopAId,
      customerId: customer.id,
      status: "pending_payment",
      paymentMethod: "razorpay",
      paymentStatus: "pending",
      subtotal: "100.00",
      discountAmount: discount.discountAmount,
      couponId: discount.coupon.id,
      couponCode: discount.coupon.code,
      totalAmount: "90.00",
    }, { transaction });
    await reserveCouponForOrder({
      coupon: discount.coupon,
      shopId: shopAId,
      customerId: customer.id,
      orderId: order.id,
      discountAmount: discount.discountAmount,
      transaction,
    });
    return order.id;
  });

  const outcomes = await Promise.allSettled([
    attempt(customers[0], "A"),
    attempt(customers[1], "B"),
  ]);
  const fulfilled = outcomes.filter((outcome) => outcome.status === "fulfilled");
  const rejected = outcomes.filter((outcome) => outcome.status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.status, 409);

  const winningOrderId = fulfilled[0].value;
  assert.equal(
    await CouponRedemption.count({
      where: { couponId: raceCoupon.body.item.id, status: "reserved" },
    }),
    1,
  );
  const couponBeforePayment = await Coupon.findByPk(raceCoupon.body.item.id);
  assert.equal(couponBeforePayment.usedCount, 0);

  await sequelize.transaction(async (transaction) => {
    await confirmCouponRedemption(winningOrderId, transaction);
    await confirmCouponRedemption(winningOrderId, transaction);
  });
  const couponAfterPayment = await Coupon.findByPk(raceCoupon.body.item.id);
  assert.equal(couponAfterPayment.usedCount, 1);
});

test("Employee roles are shop-scoped, persistent, unique, and assignable", async () => {
  const initialRoles = await agentOwnerA.get("/api/v1/shop/employee-roles");
  assert.equal(initialRoles.status, 200);
  assert.ok(initialRoles.body.permissionModules.some((module) => module.key === "inventory"));
  assert.ok(
    initialRoles.body.items
      .find((role) => role.code === "delivery_associate")
      .permissions.includes("delivery.update"),
  );
  assert.ok(
    initialRoles.body.items
      .filter((role) => role.value !== "shop_owner")
      .every((role) => Array.isArray(role.permissions)),
  );
  assert.ok(
    initialRoles.body.items.some((role) => role.code === "sales_associate"),
  );

  const roleName = `Stock Controller ${run}`;
  const created = await agentOwnerA
    .post("/api/v1/shop/employee-roles")
    .set(H)
    .send({ name: `  ${roleName}  ` });
  assert.equal(created.status, 201);
  assert.equal(created.body.role.code, roleName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""));
  assert.equal(created.body.role.name, roleName);

  const refreshedRoles = await agentOwnerA.get("/api/v1/shop/employee-roles");
  assert.equal(refreshedRoles.status, 200);
  assert.ok(refreshedRoles.body.items.some((role) => role.code === created.body.role.code));
  assert.equal(
    (await agentOwnerB.get("/api/v1/shop/employee-roles")).body.items.some(
      (role) => role.code === created.body.role.code,
    ),
    false,
  );

  const duplicate = await agentOwnerA
    .post("/api/v1/shop/employee-roles")
    .set(H)
    .send({ name: roleName.toUpperCase() });
  assert.equal(duplicate.status, 409);

  const createdEmployee = await agentOwnerA
    .post("/api/v1/shop/employees")
    .set(H)
    .send({
      name: `Custom Role Employee ${run}`,
      email: `custom-role-${run}@test.local`,
      password: PASSWORD,
      role: created.body.role.code,
      salaryType: "monthly",
      baseSalary: 1200,
      permissions: ["dashboard.view"],
    });
  assert.equal(createdEmployee.status, 201);
  assert.equal(createdEmployee.body.employee.role, created.body.role.code);

  const updatedEmployee = await agentOwnerA
    .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
    .set(H)
    .send({ role: created.body.role.code });
  assert.equal(updatedEmployee.status, 200);

  const employeeEmail = `custom-role-${run}@test.local`;
  const employeeAgent = request.agent(app);
  const employeeLogin = await employeeAgent
    .post("/api/v1/auth/shop-owner/login")
    .set(H)
    .send({ email: employeeEmail, password: PASSWORD });
  assert.equal(employeeLogin.status, 200);
  const employeeSession = await employeeAgent.get("/api/v1/auth/me");
  assert.equal(employeeSession.status, 200);
  assert.deepEqual(employeeSession.body.user.permissions, ["dashboard.view"]);
  assert.equal(employeeSession.body.user.status, "active");
  assert.equal(
    employeeSession.body.user.membershipId,
    createdEmployee.body.employee.membershipId,
  );
  assert.equal(employeeSession.body.user.shopId, shopAId);
  assert.equal(employeeSession.body.user.employeeRole, created.body.role.code);

  const employeeDashboard = await employeeAgent.get("/api/v1/shop/dashboard");
  assert.equal(employeeDashboard.status, 200);
  assert.equal(employeeDashboard.body.stats.totalOrders, null);
  assert.equal(
    (await employeeAgent.get("/api/v1/shop/inventory")).status,
    403,
  );

  const savedPermissions = ["dashboard.view", "inventory.view"];
  const permissionsUpdate = await agentOwnerA
    .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
    .set(H)
    .send({
      permissions: [
        ...savedPermissions,
        "employees.manage",
        "employees.assign",
      ],
    });
  assert.equal(permissionsUpdate.status, 200);

  const selfPermissionEscalation = await employeeAgent
    .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
    .set(H)
    .send({
      role: "shop_manager",
      permissions: ["dashboard.view", "employees.manage"],
    });
  assert.equal(selfPermissionEscalation.status, 403);

  const employeeList = await agentOwnerA.get("/api/v1/shop/employees");
  const savedEmployee = employeeList.body.items.find(
    (item) => item.membershipId === createdEmployee.body.employee.membershipId,
  );
  assert.deepEqual(
    savedEmployee.permissions,
    [...savedPermissions, "employees.manage", "employees.assign"],
  );
  const refreshedSession = await employeeAgent.get("/api/v1/auth/me");
  assert.deepEqual(
    refreshedSession.body.user.permissions,
    [...savedPermissions, "employees.manage", "employees.assign"],
  );

  const invalidPermissions = await agentOwnerA
    .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
    .set(H)
    .send({ permissions: ["dashboard.view", "not.a.permission"] });
  assert.equal(invalidPermissions.status, 422);

  assert.equal((await employeeAgent.get("/api/v1/shop/inventory")).status, 200);
  assert.equal((await employeeAgent.get("/api/v1/shop/orders")).status, 403);

  const inheritedRoleEmployee = await agentOwnerA
    .post("/api/v1/shop/employees")
    .set(H)
    .send({
      name: `Inherited Role Employee ${run}`,
      email: `inherited-role-${run}@test.local`,
      password: PASSWORD,
      role: created.body.role.code,
      salaryType: "monthly",
      baseSalary: 1200,
      permissions: ["dashboard.view"],
    });
  assert.equal(inheritedRoleEmployee.status, 201);
  const inheritedRoleUpdate = await agentOwnerA
    .patch(`/api/v1/shop/employee-roles/${created.body.role.code}`)
    .set(H)
    .send({ permissions: ["dashboard.view", "inventory.view"] });
  assert.equal(inheritedRoleUpdate.status, 200);
  const inheritedRoleAgent = request.agent(app);
  const inheritedRoleLogin = await inheritedRoleAgent
    .post("/api/v1/auth/shop-owner/login")
    .set(H)
    .send({
      email: `inherited-role-${run}@test.local`,
      password: PASSWORD,
    });
  assert.equal(inheritedRoleLogin.status, 200);
  assert.deepEqual(inheritedRoleLogin.body.user.permissions, [
    "dashboard.view",
    "inventory.view",
  ]);
  assert.equal((await inheritedRoleAgent.get("/api/v1/shop/inventory")).status, 200);

  const salesEmployee = await agentOwnerA
    .post("/api/v1/shop/employees")
    .set(H)
    .send({
      name: `Inventory Sales Staff ${run}`,
      email: `inventory-sales-${run}@test.local`,
      password: PASSWORD,
      role: "sales_associate",
      salaryType: "monthly",
      baseSalary: 1200,
    });
  assert.equal(salesEmployee.status, 201);
  const salesPermissions = await agentOwnerA
    .patch(
      `/api/v1/shop/employees/${salesEmployee.body.employee.membershipId}`,
    )
    .set(H)
    .send({ permissions: ["dashboard.view", "inventory.view"] });
  assert.equal(salesPermissions.status, 200);

  const salesAgent = request.agent(app);
  const salesLogin = await salesAgent
    .post("/api/v1/auth/shop-owner/login")
    .set(H)
    .send({
      email: `inventory-sales-${run}@test.local`,
      password: PASSWORD,
    });
  assert.equal(salesLogin.status, 200);
  assert.deepEqual(salesLogin.body.user.permissions, [
    "dashboard.view",
    "inventory.view",
  ]);
  const stockBefore = await salesAgent.get("/api/v1/shop/inventory");
  assert.equal(stockBefore.status, 200);
  assert.ok(stockBefore.body.items.length > 0);
  const stockItem = stockBefore.body.items[0];
  const inventoryRecord = await Inventory.findOne({
    where: {
      shopId: shopAId,
      productVariantId: stockItem.productVariantId,
    },
  });
  assert.ok(inventoryRecord);
  const previousQuantity = inventoryRecord.quantity;
  const stockAdjustment = await salesAgent
    .post("/api/v1/shop/inventory/adjust")
    .set(H)
    .send({
      productVariantId: stockItem.productVariantId,
      changeQuantity: 2,
      reason: "Permission regression test adjustment",
      movementType: "adjustment",
    });
  assert.equal(stockAdjustment.status, 200);
  await inventoryRecord.reload();
  assert.equal(inventoryRecord.quantity, previousQuantity + 2);
  const stockAfterRefresh = await salesAgent.get("/api/v1/shop/inventory");
  assert.equal(stockAfterRefresh.status, 200);
  assert.equal(
    stockAfterRefresh.body.items.find(
      (item) => item.productVariantId === stockItem.productVariantId,
    ).quantity,
    previousQuantity + 2,
  );
  assert.equal((await salesAgent.get("/api/v1/shop/orders")).status, 403);

  const resetEmployeePermissions = await agentOwnerA
    .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
    .set(H)
    .send({ permissions: savedPermissions });
  assert.equal(resetEmployeePermissions.status, 200);
  const resetEmployee = (
    await agentOwnerA.get("/api/v1/shop/employees")
  ).body.items.find(
    (item) => item.membershipId === createdEmployee.body.employee.membershipId,
  );
  assert.deepEqual(resetEmployee.permissions, savedPermissions);

  const roleReset = await agentOwnerA
    .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
    .set(H)
    .send({ role: "cashier" });
  assert.equal(roleReset.status, 200);
  const cashierEmployee = (
    await agentOwnerA.get("/api/v1/shop/employees")
  ).body.items.find(
    (item) => item.membershipId === createdEmployee.body.employee.membershipId,
  );
  assert.ok(cashierEmployee.permissions.includes("payments.collect"));
  assert.equal(cashierEmployee.permissions.includes("inventory.view"), false);
  assert.equal((await employeeAgent.get("/api/v1/shop/inventory")).status, 403);

  const expectedRolePermissions = {
    shop_manager: "orders.view",
    sales_associate: "customers.view",
    delivery_associate: "delivery.view",
    cashier: "payments.collect",
    support: "customers.view",
  };
  for (const [role, expectedPermission] of Object.entries(
    expectedRolePermissions,
  )) {
    const roleChange = await agentOwnerA
      .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
      .set(H)
      .send({ role });
    assert.equal(roleChange.status, 200);

    const roleAgent = request.agent(app);
    const roleLogin = await roleAgent
      .post("/api/v1/auth/shop-owner/login")
      .set(H)
      .send({ email: employeeEmail, password: PASSWORD });
    assert.equal(roleLogin.status, 200);
    assert.equal(roleLogin.body.user.employeeRole, role);
    assert.ok(roleLogin.body.user.permissions.includes(expectedPermission));
    assert.equal((await roleAgent.get("/api/v1/shop/dashboard")).status, 200);
  }

  const deactivateEmployee = await agentOwnerA
    .patch(`/api/v1/shop/employees/${createdEmployee.body.employee.membershipId}`)
    .set(H)
    .send({ status: "inactive" });
  assert.equal(deactivateEmployee.status, 200);
  assert.equal((await employeeAgent.get("/api/v1/auth/me")).status, 401);
  const inactiveEmployeeLogin = await request(app)
    .post("/api/v1/auth/shop-owner/login")
    .set(H)
    .send({ email: employeeEmail, password: PASSWORD });
  assert.equal(inactiveEmployeeLogin.status, 403);

  const crossShopAssignment = await agentOwnerB
    .post("/api/v1/shop/employees")
    .set(H)
    .send({
      name: `Unauthorized Role Employee ${run}`,
      email: `unauthorized-role-${run}@test.local`,
      password: PASSWORD,
      role: created.body.role.code,
      salaryType: "monthly",
      baseSalary: 1200,
    });
  assert.equal(crossShopAssignment.status, 400);
});

test("Wholesale purchase order -> goods receipt increases retail stock", async () => {
  // Find variant id
  const invBefore = await agentOwnerA.get("/api/v1/shop/inventory");
  const targetItem = invBefore.body.items[0];
  const initialQty = targetItem.quantity;

  // 1. Create wholesale purchase order
  const poRes = await agentOwnerA
    .post("/api/v1/shop/wholesale-orders")
    .set(H)
    .send({
      wholesalerId,
      notes: "Need more stock",
      items: [
        {
          productId: targetItem.productId,
          productVariantId: targetItem.productVariantId,
          quantity: 20,
          unitPrice: 300,
        },
      ],
    });
  assert.equal(poRes.status, 201);
  const poId = poRes.body.purchaseOrder.id;
  const poItemId = poRes.body.purchaseOrder.items[0].id;
  assert.equal(
    (await agentOwnerA.get("/api/v1/shop/wholesalers")).body.items.find(
      (item) => item.id === wholesalerId,
    ).outstandingAmount,
    6000,
  );

  // Shop B cannot access Shop A's PO
  const bAccess = await agentOwnerB.get(
    `/api/v1/shop/wholesale-orders/${poId}`,
  );
  assert.equal(bAccess.status, 404);

  // 2. Receive goods
  const grRes = await agentOwnerA
    .post(`/api/v1/shop/wholesale-orders/${poId}/receipt`)
    .set(H)
    .send({
      items: [
        {
          purchaseOrderItemId: poItemId,
          quantityReceived: 15,
          quantityRejected: 0,
        },
      ],
    });
  assert.equal(grRes.status, 201);

  const excessiveReceipt = await agentOwnerA
    .post(`/api/v1/shop/wholesale-orders/${poId}/receipt`)
    .set(H)
    .send({
      items: [
        {
          purchaseOrderItemId: poItemId,
          quantityReceived: 5,
          quantityRejected: 1,
        },
      ],
    });
  assert.equal(excessiveReceipt.status, 400);

  // 3. Verify stock increased by exactly 15
  const invAfter = await agentOwnerA.get("/api/v1/shop/inventory");
  const updatedItem = invAfter.body.items.find(
    (i) => i.productVariantId === targetItem.productVariantId,
  );
  assert.equal(updatedItem.quantity, initialQty + 15);

  const overpayment = await agentOwnerA
    .post("/api/v1/shop/wholesale-payments")
    .set(H)
    .send({ wholesalerId, amount: 6000.01, paymentMethod: "bank_transfer" });
  assert.equal(overpayment.status, 400);
  const payment = await agentOwnerA
    .post("/api/v1/shop/wholesale-payments")
    .set(H)
    .send({
      wholesalerId,
      purchaseOrderId: poId,
      amount: 1000,
      paymentMethod: "bank_transfer",
      paymentDate: "2026-11-03",
    });
  assert.equal(payment.status, 201);
  const wholesalerAfterPayment = (
    await agentOwnerA.get("/api/v1/shop/wholesalers")
  ).body.items.find((item) => item.id === wholesalerId);
  assert.equal(wholesalerAfterPayment.outstandingAmount, 5000);

  const scopedPayments = await agentOwnerA.get(
    `/api/v1/shop/wholesale-payments?wholesalerId=${wholesalerId}`,
  );
  assert.equal(scopedPayments.status, 200);
  assert.ok(scopedPayments.body.items.length > 0);
  assert.ok(
    scopedPayments.body.items.every(
      (item) => item.wholesalerId === wholesalerId,
    ),
  );
  const scopedBills = await agentOwnerA.get(
    `/api/v1/shop/bills?wholesalerId=${wholesalerId}`,
  );
  assert.equal(scopedBills.status, 200);
  assert.ok(
    scopedBills.body.items.every(
      (item) => item.wholesalerId === wholesalerId,
    ),
  );
  assert.equal(
    (
      await agentOwnerB.get(
        `/api/v1/shop/wholesale-payments?wholesalerId=${wholesalerId}`,
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await agentOwnerB.get(
        `/api/v1/shop/bills?wholesalerId=${wholesalerId}`,
      )
    ).status,
    404,
  );
});

test("Customer adds to cart and completes checkout with COD and inventory deduction", async () => {
  // Add address
  const addrRes = await agentCustomer
    .post("/api/v1/customer/addresses")
    .set(H)
    .send({
      label: "Home",
      recipientName: "Test Buyer",
      phone: "9876543210",
      streetAddress: "123 Baker Street",
      city: "Delhi",
      state: "Delhi",
      postalCode: "110001",
      isDefault: true,
    });
  assert.equal(addrRes.status, 201);
  const addressId = addrRes.body.address.id;

  // Get product variant
  const productDetail = await agentCustomer.get(
    `/api/v1/store/products/${productIdForArchive}`,
  );
  assert.equal(productDetail.status, 200);
  const variant = productDetail.body.product.variants.find(
    (item) => item.id === productVariantIdForSellerFlow,
  );
  const sellerResponse = await agentCustomer.get(
    `/api/v1/store/products/${productIdForArchive}?variantId=${productVariantIdForSellerFlow}`,
  );
  assert.equal(sellerResponse.status, 200);
  assert.deepEqual(
    sellerResponse.body.sellers.map((seller) => seller.shopId).sort(),
    [shopAId, shopBId].sort(),
  );
  const shopASeller = sellerResponse.body.sellers.find((seller) => seller.shopId === shopAId);
  const shopBSeller = sellerResponse.body.sellers.find((seller) => seller.shopId === shopBId);
  assert.notEqual(shopASeller.sellingPrice, shopBSeller.sellingPrice);
  const otherVariant = productDetail.body.product.variants.find(
    (item) => item.id !== productVariantIdForSellerFlow,
  );
  const otherVariantSellers = await agentCustomer.get(
    `/api/v1/store/products/${productIdForArchive}?variantId=${otherVariant.id}`,
  );
  assert.equal(otherVariantSellers.status, 200);
  assert.equal(
    otherVariantSellers.body.sellers.some((seller) => seller.shopId === shopBId),
    false,
  );
  const initialStock = shopASeller.availableStock;
  const mismatchedProduct = await agentCustomer
    .post("/api/v1/customer/cart")
    .set(H)
    .send({
      shopId: shopAId,
      sellerListingId: shopASeller.listingId,
      productId: productIdForArchive + 100000,
      productVariantId: variant.id,
      quantity: 1,
    });
  assert.equal(mismatchedProduct.status, 400);

  // Add to cart
  const cartRes = await agentCustomer
    .post("/api/v1/customer/cart")
    .set(H)
    .send({
      shopId: shopAId,
      sellerListingId: shopASeller.listingId,
      productId: productIdForArchive,
      productVariantId: variant.id,
      quantity: 2,
    });
  assert.equal(cartRes.status, 201);
  const crossShopAdd = await agentCustomer
    .post("/api/v1/customer/cart")
    .set(H)
    .send({
      sellerListingId: shopBSeller.listingId,
      productId: productIdForArchive,
      productVariantId: variant.id,
      quantity: 1,
    });
  assert.equal(crossShopAdd.status, 409);
  assert.match(crossShopAdd.body.message, /complete.*checkout|clear.*cart/i);
  const cartContents = await agentCustomer.get("/api/v1/customer/cart");
  assert.equal(cartContents.body.carts[0].items[0].sellerListingId, shopASeller.listingId);

  const quoteWithCoupon = () =>
    agentCustomer.post("/api/v1/customer/checkout/quote").set(H).send({
      shopId: shopAId,
      shippingAddressId: addressId,
      paymentMethod: "cod",
      couponCode: couponCodeForCheckout,
      items: [{ productVariantId: variant.id, quantity: 2 }],
    });

  await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}/status`).set(H).send({
    status: "inactive",
  });
  assert.equal((await quoteWithCoupon()).status, 422);
  await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}/status`).set(H).send({
    status: "active",
  });
  await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}`).set(H).send({
    startDate: "2099-01-01",
    expiryDate: "2099-12-31",
  });
  assert.equal((await quoteWithCoupon()).status, 422);
  await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}`).set(H).send({
    startDate: "2000-01-01",
    expiryDate: "2000-12-31",
  });
  assert.equal((await quoteWithCoupon()).status, 422);
  await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}`).set(H).send({
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2099-12-31",
    minimumOrderAmount: "999999.00",
  });
  assert.equal((await quoteWithCoupon()).status, 422);
  await agentOwnerA.patch(`/api/v1/shop/coupons/${couponIdForCheckout}`).set(H).send({
    startDate: new Date().toISOString().slice(0, 10),
    expiryDate: "2099-12-31",
    minimumOrderAmount: "15.00",
  });

  const quoteRes = await agentCustomer
    .post("/api/v1/customer/checkout/quote")
    .set(H)
    .send({
      shopId: shopAId,
      shippingAddressId: addressId,
      paymentMethod: "cod",
      couponCode: couponCodeForCheckout,
      items: [{ productVariantId: variant.id, quantity: 2 }],
    });
  assert.equal(quoteRes.status, 200);
  assert.equal(quoteRes.body.quote.discountAmount, "50.00");
  assert.equal(
    Number(quoteRes.body.quote.totalAmount),
    Number(quoteRes.body.quote.items[0].totalPrice) +
      Number(quoteRes.body.quote.deliveryFee) -
      50,
  );
  assert.equal(quoteRes.body.quote.shippingSnapshot.weightKg, 2);
  assert.equal(quoteRes.body.quote.deliveryFee, "35.00");
  assert.equal(
    Number(quoteRes.body.quote.totalAmount),
    Number(quoteRes.body.quote.items[0].totalPrice) +
      Number(quoteRes.body.quote.deliveryFee) -
      50,
  );

  // Checkout
  const checkRes = await agentCustomer
    .post("/api/v1/customer/checkout")
    .set(H)
    .send({
      shopId: shopAId,
      shippingAddressId: addressId,
      paymentMethod: "cod",
      couponCode: couponCodeForCheckout,
      items: [{ productVariantId: variant.id, quantity: 2 }],
    });
  assert.equal(checkRes.status, 201);
  const orderId = checkRes.body.order.id;
  assert.equal(checkRes.body.order.items[0].sellerListingId, shopASeller.listingId);
  assert.equal(checkRes.body.order.discountAmount, "50.00");
  assert.equal(checkRes.body.order.couponCode, couponCodeForCheckout);
  const persistedCoupon = await Coupon.findByPk(couponIdForCheckout);
  assert.equal(persistedCoupon.usedCount, 1);
  assert.equal(
    await CouponRedemption.count({
      where: { couponId: couponIdForCheckout, orderId, status: "redeemed" },
    }),
    1,
  );
  assert.equal(
    (await agentOwnerA.delete(`/api/v1/shop/coupons/${couponIdForCheckout}`).set(H)).status,
    409,
  );
  assert.equal(checkRes.body.order.status, "confirmed");
  assert.deepEqual(checkRes.body.order.shippingSnapshot, quoteRes.body.quote.shippingSnapshot);
  assert.deepEqual(checkRes.body.order.taxBreakdown, quoteRes.body.quote.taxBreakdown);

  const dashboard = await agentOwnerA.get("/api/v1/shop/dashboard");
  assert.equal(dashboard.status, 200);
  assert.ok(dashboard.body.stats.totalOrders >= 1);
  assert.ok(dashboard.body.stats.pendingOrders >= 1);
  assert.equal(dashboard.body.stats.totalRevenue, 0);
  assert.ok(
    dashboard.body.recentOrders.some((order) => order.id === orderId),
    "dashboard shows a persisted order for its own shop",
  );
  assert.equal(
    (await agentOwnerB.get("/api/v1/shop/dashboard")).body.recentOrders.some(
      (order) => order.id === orderId,
    ),
    false,
  );

  const shopOrders = await agentOwnerA.get(
    `/api/v1/shop/orders?status=confirmed&shopId=${shopBId}`,
  );
  assert.equal(shopOrders.status, 200);
  const shopOrder = shopOrders.body.items.find((order) => order.id === orderId);
  assert.ok(shopOrder, "the authenticated shop sees its customer order");
  assert.equal(shopOrder.shopId, shopAId);
  assert.equal(shopOrder.items.length, 1);
  assert.equal(shopOrder.items[0].productId, productIdForArchive);
  assert.ok(shopOrder.items.every((item) => item.orderId === orderId));

  const ownerBOrders = await agentOwnerB.get("/api/v1/shop/orders");
  assert.equal(ownerBOrders.status, 200);
  assert.equal(ownerBOrders.body.items.some((order) => order.id === orderId), false);
  assert.equal(
    (
      await agentOwnerB.get(`/api/v1/shop/orders/${orderId}`)
    ).status,
    404,
  );
  const crossShopStatusUpdate = await agentOwnerB
    .patch(`/api/v1/shop/orders/${orderId}/status`)
    .set(H)
    .send({ status: "processing" });
  assert.equal(crossShopStatusUpdate.status, 404);

  const shopOrderStatuses = [
    "confirmed",
    "processing",
    "packed",
    "ready_for_dispatch",
    "assigned_to_delivery",
    "picked_up",
    "out_for_delivery",
    "delivered",
    "cancelled",
  ];
  for (const status of shopOrderStatuses) {
    const response = await agentOwnerA.get(
      `/api/v1/shop/orders?status=${status}`,
    );
    assert.equal(response.status, 200);
    assert.ok(response.body.items.every((order) => order.status === status));
    assert.ok(response.body.items.every((order) => order.shopId === shopAId));
  }

  // Verify inventory was deducted by 2
  const invCheck = await agentOwnerA.get("/api/v1/shop/inventory");
  const invRow = invCheck.body.items.find(
    (i) => i.productVariantId === variant.id,
  );
  assert.equal(invRow.quantity, initialStock - 2);
  const shopBInventory = await Inventory.findOne({
    where: { shopId: shopBId, productVariantId: variant.id },
  });
  assert.equal(shopBInventory.quantity, shopBSeller.availableStock);

  // Shop Owner creates delivery employee and assigns delivery
  deliveryEmail = `deliver-${run}@test.local`;
  const empRes = await agentOwnerA.post("/api/v1/shop/employees").set(H).send({
    name: "Rider Dave",
    email: deliveryEmail,
    password: PASSWORD,
    role: "delivery_associate",
    salaryType: "monthly",
    baseSalary: 15000,
  });
  assert.equal(empRes.status, 201);
  const deliveryUserId = empRes.body.employee.userId;

  const deliveryAssociates = await agentOwnerA.get(
    "/api/v1/shop/orders/delivery-associates",
  );
  assert.equal(deliveryAssociates.status, 200);
  assert.ok(deliveryAssociates.body.items.some((item) => item.userId === deliveryUserId));

  const prematureAssignment = await agentOwnerA
    .post(`/api/v1/shop/orders/${orderId}/assign-delivery`)
    .set(H)
    .send({ deliveryUserId });
  assert.equal(prematureAssignment.status, 400);

  const skippedStatus = await agentOwnerA
    .patch(`/api/v1/shop/orders/${orderId}/status`)
    .set(H)
    .send({ status: "not_a_real_order_status" });
  assert.equal(skippedStatus.status, 422);

  for (const status of ["processing", "packed", "ready_for_dispatch"]) {
    const transition = await agentOwnerA
      .patch(`/api/v1/shop/orders/${orderId}/status`)
      .set(H)
      .send({ status });
    assert.equal(transition.status, 200);
    assert.equal(transition.body.order.status, status);
  }

  // Assign delivery
  const assignRes = await agentOwnerA
    .post(`/api/v1/shop/orders/${orderId}/assign-delivery`)
    .set(H)
    .send({ deliveryUserId, notes: "Call on arrival" });
  assert.equal(assignRes.status, 200);
  const assignedShopOrders = await agentOwnerA.get(
    "/api/v1/shop/orders?status=assigned_to_delivery",
  );
  assert.ok(assignedShopOrders.body.items.some((order) => order.id === orderId));

  // Shop users manage the delivery lifecycle from the existing order workflow.
  const pickRes = await agentOwnerA
    .patch(`/api/v1/shop/orders/${orderId}/status`)
    .set(H)
    .send({ status: "picked_up" });
  assert.equal(pickRes.status, 200);
  const pickedUpShopOrders = await agentOwnerA.get(
    "/api/v1/shop/orders?status=picked_up",
  );
  assert.ok(pickedUpShopOrders.body.items.some((order) => order.id === orderId));

  const outForDelivery = await agentOwnerA
    .patch(`/api/v1/shop/orders/${orderId}/status`)
    .set(H)
    .send({ status: "out_for_delivery" });
  assert.equal(outForDelivery.status, 200);

  const delivRes = await agentOwnerA
    .patch(`/api/v1/shop/orders/${orderId}/status`)
    .set(H)
    .send({ status: "delivered", notes: "Handed to recipient" });
  assert.equal(delivRes.status, 200);
  const deliveredShopOrders = await agentOwnerA.get(
    "/api/v1/shop/orders?status=delivered",
  );
  assert.ok(deliveredShopOrders.body.items.some((order) => order.id === orderId));
  const completedOrder = await agentOwnerA.get(`/api/v1/shop/orders/${orderId}`);
  assert.equal(completedOrder.status, 200);
  assert.equal(completedOrder.body.order.status, "delivered");
  assert.equal(completedOrder.body.order.delivery.status, "delivered");
  assert.equal(
    completedOrder.body.order.statusHistory.map((entry) => entry.newStatus).join(","),
    "confirmed,processing,packed,ready_for_dispatch,assigned_to_delivery,picked_up,out_for_delivery,delivered",
  );

  // Verify the shop can complete delivery itself without creating an assignment.
  const secondCart = await agentCustomer
    .post("/api/v1/customer/cart")
    .set(H)
    .send({
      shopId: shopAId,
      productId: prods.body.items[0].id,
      productVariantId: variant.id,
      quantity: 1,
    });
  assert.equal(secondCart.status, 201);
  const exhaustedCoupon = await agentCustomer
    .post("/api/v1/customer/checkout/quote")
    .set(H)
    .send({
      shopId: shopAId,
      shippingAddressId: addressId,
      paymentMethod: "cod",
      couponCode: couponCodeForCheckout,
      items: [{ productVariantId: variant.id, quantity: 1 }],
    });
  assert.equal(exhaustedCoupon.status, 409);
  const secondCheckout = await agentCustomer
    .post("/api/v1/customer/checkout")
    .set(H)
    .send({
      shopId: shopAId,
      shippingAddressId: addressId,
      paymentMethod: "cod",
      items: [{ productVariantId: variant.id, quantity: 1 }],
    });
  assert.equal(secondCheckout.status, 201);
  const ownerManagedOrderId = secondCheckout.body.order.id;
  const toProcessing = await agentOwnerA
    .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
    .set(H)
    .send({ status: "processing" });
  assert.equal(toProcessing.status, 200);
  assert.equal(toProcessing.body.order.status, "processing");

  const backToConfirmed = await agentOwnerA
    .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
    .set(H)
    .send({ status: "confirmed" });
  assert.equal(backToConfirmed.status, 200);
  assert.equal(backToConfirmed.body.order.status, "confirmed");

  const backToProcessing = await agentOwnerA
    .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
    .set(H)
    .send({ status: "processing" });
  assert.equal(backToProcessing.status, 200);
  assert.equal(backToProcessing.body.order.status, "processing");

  const forwardForCorrectionTest = await agentOwnerA
    .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
    .set(H)
    .send({ status: "ready_for_dispatch" });
  assert.equal(forwardForCorrectionTest.status, 200);
  assert.equal(forwardForCorrectionTest.body.order.status, "ready_for_dispatch");

  const backwardForCorrectionTest = await agentOwnerA
    .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
    .set(H)
    .send({ status: "processing" });
  assert.equal(backwardForCorrectionTest.status, 200);
  assert.equal(backwardForCorrectionTest.body.order.status, "processing");

  const invalidOrderStatus = await agentOwnerA
    .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
    .set(H)
    .send({ status: "not_a_real_order_status" });
  assert.equal(invalidOrderStatus.status, 422);

  const crossShopOrderStatus = await agentOwnerB
    .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
    .set(H)
    .send({ status: "confirmed" });
  assert.equal(crossShopOrderStatus.status, 404);

  for (const status of [
    "processing",
    "packed",
    "ready_for_dispatch",
    "assigned_to_delivery",
    "picked_up",
    "out_for_delivery",
    "delivered",
  ]) {
    const transition = await agentOwnerA
      .patch(`/api/v1/shop/orders/${ownerManagedOrderId}/status`)
      .set(H)
      .send({ status });
    assert.equal(transition.status, 200);
    assert.equal(transition.body.order.status, status);
  }
  const ownerManagedOrder = await agentOwnerA.get(
    `/api/v1/shop/orders/${ownerManagedOrderId}`,
  );
  assert.equal(ownerManagedOrder.status, 200);
  assert.equal(ownerManagedOrder.body.order.deliveryStatus, "delivered");
  assert.equal(ownerManagedOrder.body.order.delivery, null);
  assert.ok(
    ownerManagedOrder.body.order.statusHistory.some(
      (entry) => entry.newStatus === "out_for_delivery",
    ),
  );
  assert.ok(
    ownerManagedOrder.body.order.statusHistory.some(
      (entry) =>
        entry.previousStatus === "processing" &&
        entry.newStatus === "confirmed" &&
        entry.changedBy &&
        entry.createdAt,
    ),
  );
  assert.ok(
    ownerManagedOrder.body.order.statusHistory.some(
      (entry) =>
        entry.previousStatus === "ready_for_dispatch" &&
        entry.newStatus === "processing" &&
        entry.changedBy &&
        entry.createdAt,
    ),
  );
  assert.equal(
    ownerManagedOrder.body.order.payments[0].codCollectedAmount,
    null,
  );

  // Delivery associates can access only their assigned orders and complete the
  // delivery workflow through the dedicated, assignment-scoped API.
  const riderCart = await agentCustomer
    .post("/api/v1/customer/cart")
    .set(H)
    .send({
      shopId: shopAId,
      productId: prods.body.items[0].id,
      productVariantId: variant.id,
      quantity: 1,
    });
  assert.equal(riderCart.status, 201);
  const riderCheckout = await agentCustomer
    .post("/api/v1/customer/checkout")
    .set(H)
    .send({
      shopId: shopAId,
      shippingAddressId: addressId,
      paymentMethod: "cod",
      items: [{ productVariantId: variant.id, quantity: 1 }],
    });
  assert.equal(riderCheckout.status, 201);
  const riderOrderId = riderCheckout.body.order.id;
  for (const status of ["processing", "packed", "ready_for_dispatch"]) {
    const transition = await agentOwnerA
      .patch(`/api/v1/shop/orders/${riderOrderId}/status`)
      .set(H)
      .send({ status });
    assert.equal(transition.status, 200);
  }
  const riderAssignmentResponse = await agentOwnerA
    .post(`/api/v1/shop/orders/${riderOrderId}/assign-delivery`)
    .set(H)
    .send({ deliveryUserId });
  assert.equal(riderAssignmentResponse.status, 200);
  agentDelivery = (await login(deliveryEmail)).agent;

  await ShopMembership.update(
    { permissions: ["delivery.view", "delivery.update", "orders.view"] },
    { where: { userId: deliveryUserId, shopId: shopAId } },
  );
  const riderOrders = await agentDelivery.get("/api/v1/shop/orders");
  assert.equal(riderOrders.status, 200);
  assert.ok(riderOrders.body.items.some((order) => order.id === riderOrderId));
  assert.equal(
    riderOrders.body.items.some((order) => order.id === ownerManagedOrderId),
    false,
  );
  const ownOrderDetails = await agentDelivery.get(
    `/api/v1/shop/orders/${riderOrderId}`,
  );
  assert.equal(ownOrderDetails.status, 200);
  assert.equal(Object.hasOwn(ownOrderDetails.body.order.customer, "email"), false);
  assert.equal(Object.hasOwn(ownOrderDetails.body.order, "payments"), false);
  assert.equal(
    (await agentDelivery.get(`/api/v1/shop/orders/${ownerManagedOrderId}`)).status,
    404,
  );
  assert.equal(
    (
      await agentDelivery
        .get("/api/v1/shop/orders/delivery-associates")
    ).status,
    403,
  );
  assert.equal(
    (
      await agentDelivery
        .patch(`/api/v1/shop/orders/${riderOrderId}/status`)
        .set(H)
        .send({ status: "picked_up" })
    ).status,
    403,
  );
  assert.equal(
    (
      await agentDelivery
        .post(`/api/v1/shop/orders/${riderOrderId}/assign-delivery`)
        .set(H)
        .send({ deliveryUserId })
    ).status,
    403,
  );

  const riderAssignments = await agentDelivery.get("/api/v1/delivery/assignments");
  assert.equal(riderAssignments.status, 200);
  const riderAssignment = riderAssignments.body.items.find(
    (item) => item.orderId === riderOrderId,
  );
  assert.ok(riderAssignment);
  assert.equal(
    (
      await agentDelivery
        .patch(`/api/v1/delivery/assignments/${riderAssignment.id}/status`)
        .set(H)
        .send({ status: "out_for_delivery" })
    ).status,
    409,
  );
  for (const status of ["picked_up", "out_for_delivery", "delivered"]) {
    const update = await agentDelivery
      .patch(`/api/v1/delivery/assignments/${riderAssignment.id}/status`)
      .set(H)
      .send({ status });
    assert.equal(update.status, 200);
    assert.equal(update.body.assignment.status, status);
  }
  const persistedRiderOrder = await Order.findByPk(riderOrderId);
  const persistedRiderAssignment = await DeliveryAssignment.findByPk(
    riderAssignment.id,
  );
  assert.equal(persistedRiderOrder.status, "delivered");
  assert.equal(persistedRiderOrder.deliveryStatus, "delivered");
  assert.equal(persistedRiderAssignment.status, "delivered");
  const riderPaymentBeforeCollection = await Payment.findOne({
    where: { orderId: riderOrderId },
  });
  assert.equal(riderPaymentBeforeCollection.codCollectedAt, null);
  assert.equal(
    (await agentDelivery
      .post(`/api/v1/delivery/assignments/${riderAssignment.id}/cod-collection`)
      .set(H)
      .send({ amount: Number(riderPaymentBeforeCollection.amount) - 1 })).status,
    400,
  );
  const codCollection = await agentDelivery
    .post(`/api/v1/delivery/assignments/${riderAssignment.id}/cod-collection`)
    .set(H)
    .send({ amount: Number(riderPaymentBeforeCollection.amount) });
  assert.equal(codCollection.status, 200);
  assert.ok(codCollection.body.payment.codCollectedAt);
  assert.equal(
    Number(codCollection.body.payment.codCollectedAmount),
    Number(riderPaymentBeforeCollection.amount),
  );
  assert.equal(
    (await agentDelivery
      .post(`/api/v1/delivery/assignments/${riderAssignment.id}/cod-collection`)
      .set(H)
      .send({ amount: Number(riderPaymentBeforeCollection.amount) })).status,
    409,
  );
  const riderHistory = await OrderStatusHistory.findAll({
    where: { orderId: riderOrderId },
    order: [["createdAt", "ASC"]],
  });
  assert.deepEqual(
    riderHistory.slice(-3).map((entry) => [entry.previousStatus, entry.newStatus]),
    [
      ["assigned_to_delivery", "picked_up"],
      ["picked_up", "out_for_delivery"],
      ["out_for_delivery", "delivered"],
    ],
  );
  assert.equal((await agentDelivery.get("/api/v1/delivery/history")).status, 200);
  assert.equal((await agentDelivery.get("/api/v1/delivery/profile")).status, 200);
  assert.equal((await agentDelivery.get("/api/v1/delivery/attendance")).status, 200);

  // Cancellation remains available and restores the deducted stock.
  const cancelCart = await agentCustomer
    .post("/api/v1/customer/cart")
    .set(H)
    .send({
      shopId: shopAId,
      productId: prods.body.items[0].id,
      productVariantId: variant.id,
      quantity: 1,
    });
  assert.equal(cancelCart.status, 201);
  const cancelCheckout = await agentCustomer
    .post("/api/v1/customer/checkout")
    .set(H)
    .send({
      shopId: shopAId,
      shippingAddressId: addressId,
      paymentMethod: "cod",
      items: [{ productVariantId: variant.id, quantity: 1 }],
    });
  assert.equal(cancelCheckout.status, 201);
  const cancelledOrderId = cancelCheckout.body.order.id;
  const stockBeforeCancellation = await agentOwnerA.get("/api/v1/shop/inventory");
  const stockBeforeCancel = stockBeforeCancellation.body.items.find(
    (item) => item.productVariantId === variant.id,
  ).quantity;
  const cancellation = await agentOwnerA
    .patch(`/api/v1/shop/orders/${cancelledOrderId}/status`)
    .set(H)
    .send({ status: "cancelled", notes: "Customer requested cancellation" });
  assert.equal(cancellation.status, 200);
  assert.equal(cancellation.body.order.status, "cancelled");
  const stockAfterCancellation = await agentOwnerA.get("/api/v1/shop/inventory");
  assert.equal(
    stockAfterCancellation.body.items.find(
      (item) => item.productVariantId === variant.id,
    ).quantity,
    stockBeforeCancel + 1,
  );

  // Verify order is delivered
  const orderCheck = await agentCustomer.get(
    `/api/v1/customer/orders/${orderId}`,
  );
  assert.equal(orderCheck.status, 200);
  assert.equal(orderCheck.body.order.status, "delivered");
  assert.equal(
    Object.hasOwn(orderCheck.body.order.payments[0], "razorpaySignature"),
    false,
  );
  await Order.update(
    { status: "out_for_delivery" },
    { where: { id: orderId } },
  );
  const reviewEligibility = await agentCustomer.get(
    `/api/v1/customer/products/${prods.body.items[0].id}/review-eligibility`,
  );
  assert.equal(reviewEligibility.status, 200);
  assert.equal(reviewEligibility.body.eligible, true);
  assert.equal(reviewEligibility.body.orderId, orderId);

  const review = await agentCustomer
    .post(`/api/v1/customer/products/${prods.body.items[0].id}/reviews`)
    .set(H)
    .send({
      rating: 5,
      title: "Great quality",
      body: "The product matched the description and arrived safely.",
    });
  assert.equal(review.status, 201);
  const reviews = await agentCustomer.get(
    `/api/v1/store/products/${prods.body.items[0].id}/reviews`,
  );
  assert.equal(reviews.status, 200);
  assert.equal(reviews.body.count, 1);
  assert.equal(reviews.body.average, 5);
  assert.equal(reviews.body.distribution.find((row) => row.rating === 5).count, 1);
  assert.equal(reviews.body.items[0].verifiedPurchase, true);
  assert.equal(Object.hasOwn(reviews.body.items[0].customer, "email"), false);
  const ratedProducts = await agentCustomer.get("/api/v1/store/products");
  const ratedProduct = ratedProducts.body.items.find(
    (item) => item.id === prods.body.items[0].id,
  );
  assert.equal(ratedProduct.ratingAverage, 5);
  assert.equal(ratedProduct.reviewCount, 1);
  await Order.update(
    { status: "delivered", deliveryStatus: "delivered" },
    { where: { id: orderId } },
  );

  const secondCustomerEmail = `review-editor-${run}@test.local`;
  const secondCustomerRegistration = await request(app)
    .post("/api/v1/auth/register")
    .set(H)
    .send({
      name: "Review Editor",
      email: secondCustomerEmail,
      password: PASSWORD,
    });
  assert.equal(secondCustomerRegistration.status, 201);
  const secondCustomer = (await login(secondCustomerEmail)).agent;
  assert.equal(
    (
      await secondCustomer
        .put(`/api/v1/customer/reviews/${review.body.review.id}`)
        .set(H)
        .send({ rating: 1, title: "Not mine", body: "This review is not mine." })
    ).status,
    404,
  );

  const updatedReview = await agentCustomer
    .put(`/api/v1/customer/reviews/${review.body.review.id}`)
    .set(H)
    .send({
      rating: 3,
      title: "Updated quality",
      body: "After using it longer, I have updated my review.",
    });
  assert.equal(updatedReview.status, 200);
  assert.equal(updatedReview.body.review.id, review.body.review.id);
  assert.equal(updatedReview.body.review.rating, 3);

  const updatedReviews = await agentCustomer.get(
    `/api/v1/store/products/${prods.body.items[0].id}/reviews`,
  );
  assert.equal(updatedReviews.body.count, 1);
  assert.equal(updatedReviews.body.average, 3);
  assert.equal(updatedReviews.body.distribution.find((row) => row.rating === 3).count, 1);
  const reviewedOrders = await agentCustomer.get("/api/v1/customer/orders");
  assert.equal(reviewedOrders.body.items.find((order) => order.id === orderId).items[0].review.rating, 3);

  await Order.update(
    { status: "out_for_delivery", deliveryStatus: "out_for_delivery" },
    { where: { id: orderId } },
  );
  assert.equal(
    (
      await agentCustomer
        .put(`/api/v1/customer/reviews/${review.body.review.id}`)
        .set(H)
        .send({ rating: 4, body: "This order is no longer delivered." })
    ).status,
    403,
  );
  await Order.update(
    { status: "delivered", deliveryStatus: "delivered" },
    { where: { id: orderId } },
  );

  assert.equal(
    (
      await agentCustomer
        .post(`/api/v1/customer/products/${prods.body.items[0].id}/reviews`)
        .set(H)
        .send({
          orderId,
          rating: 4,
          body: "Another review for the same product.",
        })
    ).status,
    409,
  );
  const foreignReturnItem = await agentCustomer
    .post(`/api/v1/customer/orders/${riderOrderId}/return`)
    .set(H)
    .send({
      reason: "The wrong item is being selected",
      items: [{ orderItemId: 99999999, quantity: 1 }],
    });
  assert.equal(foreignReturnItem.status, 400);

  const returnRequestResponse = await agentCustomer
    .post(`/api/v1/customer/orders/${riderOrderId}/return`)
    .set(H)
    .send({
      reason: "Product arrived with damage",
      items: [{ orderItemId: riderAssignment.order.items[0].id, quantity: 1 }],
    });
  assert.equal(returnRequestResponse.status, 201);
  const returnId = returnRequestResponse.body.return.id;
  const dashboardWithReturn = await agentOwnerA.get("/api/v1/shop/dashboard");
  assert.equal(dashboardWithReturn.body.stats.pendingReturns, 1);
  assert.equal(dashboardWithReturn.body.stats.pendingRefunds, 0);
  assert.equal(
    (
      await agentCustomer
        .post(`/api/v1/customer/orders/${riderOrderId}/return`)
        .set(H)
        .send({
          reason: "Duplicate return request",
          items: [{ orderItemId: riderAssignment.order.items[0].id, quantity: 1 }],
        })
    ).status,
    409,
  );
  const customerOrdersWithReturn = await agentCustomer.get("/api/v1/customer/orders");
  const customerReturn = customerOrdersWithReturn.body.items
    .find((order) => order.id === riderOrderId)
    .returns[0];
  assert.equal(customerReturn.status, "requested");
  assert.equal(customerReturn.items[0].orderItem.productName, riderAssignment.order.items[0].productName);

  const shopOrderWithReturn = await agentOwnerA.get(
    `/api/v1/shop/orders/${riderOrderId}`,
  );
  assert.equal(shopOrderWithReturn.status, 200);
  assert.equal(shopOrderWithReturn.body.order.status, "delivered");
  assert.equal(shopOrderWithReturn.body.order.returns[0].id, returnId);
  assert.equal(
    (await agentOwnerB.patch(`/api/v1/shop/returns/${returnId}`).set(H).send({
      status: "approved",
    })).status,
    404,
  );
  assert.equal(
    (await agentOwnerB.get("/api/v1/shop/returns")).body.items.some(
      (item) => item.id === returnId,
    ),
    false,
  );
  assert.equal(
    (
      await agentCustomer
        .patch(`/api/v1/shop/returns/${returnId}`)
        .set(H)
        .send({ status: "approved" })
    ).status,
    403,
  );

  const refundTooEarly = await agentOwnerA
    .patch(`/api/v1/shop/returns/${returnId}`)
    .set(H)
    .send({ status: "refunded", refundReference: "manual-ref-101" });
  assert.equal(refundTooEarly.status, 400);

  const approveReturn = await agentOwnerA
    .patch(`/api/v1/shop/returns/${returnId}`)
    .set(H)
    .send({ status: "approved" });
  assert.equal(approveReturn.status, 200);
  assert.equal(approveReturn.body.return.status, "approved");
  assert.ok(approveReturn.body.return.approvedAt);

  const refundBeforeReceived = await agentOwnerA
    .patch(`/api/v1/shop/returns/${returnId}`)
    .set(H)
    .send({ status: "refund_processing" });
  assert.equal(refundBeforeReceived.status, 400);

  const inventoryBeforeReturnReceive = await agentOwnerA.get(
    "/api/v1/shop/inventory",
  );
  const stockBeforeReturnReceive = inventoryBeforeReturnReceive.body.items.find(
    (item) => item.productVariantId === variant.id,
  ).quantity;
  const receiveReturn = await agentOwnerA
    .patch(`/api/v1/shop/returns/${returnId}`)
    .set(H)
    .send({ status: "received" });
  assert.equal(receiveReturn.status, 200);
  assert.ok(receiveReturn.body.return.receivedAt);
  const inventoryAfterReturnReceive = await agentOwnerA.get(
    "/api/v1/shop/inventory",
  );
  assert.equal(
    inventoryAfterReturnReceive.body.items.find(
      (item) => item.productVariantId === variant.id,
    ).quantity,
    stockBeforeReturnReceive,
  );
  const dashboardWithReceivedReturn = await agentOwnerA.get(
    "/api/v1/shop/dashboard",
  );
  assert.equal(dashboardWithReceivedReturn.body.stats.pendingReturns, 0);
  assert.equal(dashboardWithReceivedReturn.body.stats.pendingRefunds, 1);

  const startRefund = await agentOwnerA
    .patch(`/api/v1/shop/returns/${returnId}`)
    .set(H)
    .send({ status: "refund_processing" });
  assert.equal(startRefund.status, 200);
  assert.ok(startRefund.body.return.refundProcessingAt);

  const missingRefundReference = await agentOwnerA
    .patch(`/api/v1/shop/returns/${returnId}`)
    .set(H)
    .send({ status: "refunded" });
  assert.equal(missingRefundReference.status, 400);
  const completeRefund = await agentOwnerA
    .patch(`/api/v1/shop/returns/${returnId}`)
    .set(H)
    .send({ status: "refunded", refundReference: "MANUAL-REF-101" });
  assert.equal(completeRefund.status, 200);
  assert.equal(completeRefund.body.return.status, "refunded");
  assert.equal(completeRefund.body.return.refundReference, "MANUAL-REF-101");
  assert.ok(completeRefund.body.return.refundedAt);
  assert.equal(
    (
      await agentOwnerA
        .patch(`/api/v1/shop/returns/${returnId}`)
        .set(H)
        .send({ status: "refunded", refundReference: "MANUAL-REF-101" })
    ).status,
    400,
  );
  const customerRefundStatus = await agentCustomer.get(
    `/api/v1/customer/orders/${riderOrderId}`,
  );
  assert.equal(customerRefundStatus.body.order.returns[0].status, "refunded");
  assert.equal(
    (await agentOwnerA.get("/api/v1/shop/dashboard")).body.stats.pendingRefunds,
    0,
  );
  assert.equal(
    customerRefundStatus.body.order.returns[0].refundReference,
    "MANUAL-REF-101",
  );

  const rejectOrderItem = ownerManagedOrder.body.order.items[0];
  const rejectionRequest = await agentCustomer
    .post(`/api/v1/customer/orders/${ownerManagedOrderId}/return`)
    .set(H)
    .send({
      reason: "Changed my mind about this item",
      items: [{ orderItemId: rejectOrderItem.id, quantity: 1 }],
    });
  assert.equal(rejectionRequest.status, 201);
  const rejectionId = rejectionRequest.body.return.id;
  const missingRejectionReason = await agentOwnerA
    .patch(`/api/v1/shop/returns/${rejectionId}`)
    .set(H)
    .send({ status: "rejected" });
  assert.equal(missingRejectionReason.status, 400);
  const rejectReturn = await agentOwnerA
    .patch(`/api/v1/shop/returns/${rejectionId}`)
    .set(H)
    .send({ status: "rejected", rejectionReason: "Return window has expired" });
  assert.equal(rejectReturn.status, 200);
  assert.equal(rejectReturn.body.return.rejectionReason, "Return window has expired");
  const rejectedCustomerOrder = await agentCustomer.get(
    "/api/v1/customer/orders",
  );
  const rejectedCustomerReturn = rejectedCustomerOrder.body.items
    .find((order) => order.id === ownerManagedOrderId)
    .returns[0];
  assert.equal(rejectedCustomerReturn.status, "rejected");
  assert.equal(rejectedCustomerReturn.rejectionReason, "Return window has expired");
  assert.equal(
    (
      await agentOwnerA
        .patch(`/api/v1/shop/returns/${rejectionId}`)
        .set(H)
        .send({ status: "approved" })
    ).status,
    400,
  );

  // COD is collected but NOT yet reconciled
  const shopPayments = await agentOwnerA.get("/api/v1/shop/payments");
  assert.equal(shopPayments.status, 200);
  const uncollectedPaymentRecord = shopPayments.body.items.find(
    (p) => p.orderId === orderId,
  );
  assert.ok(uncollectedPaymentRecord);
  assert.equal(uncollectedPaymentRecord.codReconciled, false);
  assert.equal(uncollectedPaymentRecord.codCollectedAt, null);
  assert.equal(
    (await agentOwnerA
      .post(`/api/v1/shop/payments/${uncollectedPaymentRecord.id}/reconcile-cod`)
      .set(H)
      .send({})).status,
    409,
  );
  const paymentRecord = shopPayments.body.items.find(
    (p) => p.orderId === riderOrderId,
  );
  assert.ok(paymentRecord);
  assert.ok(paymentRecord.codCollectedAt);
  assert.equal(
    (await agentOwnerA.get("/api/v1/shop/dashboard")).body.stats.totalRevenue,
    0,
  );

  // Cashier / Owner reconciles COD payment
  const recRes = await agentOwnerA
    .post(`/api/v1/shop/payments/${paymentRecord.id}/reconcile-cod`)
    .set(H)
    .send({});
  assert.equal(recRes.status, 200);
  assert.equal(recRes.body.payment.codReconciled, true);
  assert.equal(recRes.body.payment.status, "paid");
  assert.equal(
    (await agentOwnerA
      .post(`/api/v1/shop/payments/${paymentRecord.id}/reconcile-cod`)
      .set(H)
      .send({})).status,
    409,
  );
  const paidOrder = await Order.findByPk(riderOrderId);
  const dashboardAfterCodReconciliation = await agentOwnerA.get(
    "/api/v1/shop/dashboard",
  );
  assert.equal(
    dashboardAfterCodReconciliation.body.stats.totalRevenue,
    Number(paidOrder.totalAmount),
  );
});

test("Shop Owner delete archives only its own product listing", async () => {
  assert.ok(productIdForArchive);
  const ownListing = await SellerListing.findOne({
    where: { shopId: shopAId, productId: productIdForArchive },
  });
  const ownVariant = await ProductVariant.findOne({
    where: { productId: productIdForArchive },
  });
  assert.ok(ownListing);
  assert.ok(ownVariant);
  assert.equal(
    (
      await agentOwnerB
        .delete(`/api/v1/shop/catalog/products/${productIdForArchive}`)
        .set(H)
    ).status,
    404,
  );

  const otherShopListing = await SellerListing.create({
    shopId: shopBId,
    productId: productIdForArchive,
    productVariantId: ownVariant.id,
    retailPrice: 999,
    isActive: true,
  });
  const otherShopInventory = await Inventory.create({
    shopId: shopBId,
    productId: productIdForArchive,
    productVariantId: ownVariant.id,
    quantity: 4,
    lowStockThreshold: 5,
  });
  const archived = await agentOwnerA
    .delete(`/api/v1/shop/catalog/products/${productIdForArchive}`)
    .set(H);
  assert.equal(archived.status, 200);
  assert.equal(archived.body.archived, true);
  const savedOwnListing = await SellerListing.findOne({
    where: { shopId: shopAId, productId: productIdForArchive },
  });
  assert.equal(savedOwnListing.isActive, false);
  const savedOtherListing = await SellerListing.findByPk(otherShopListing.id);
  assert.equal(savedOtherListing.isActive, true);
  assert.equal(Number(savedOtherListing.retailPrice), 999);
  await otherShopInventory.destroy();
  await savedOtherListing.destroy();
});

test("Super Admin archives products without destroying order-linked catalog data", async () => {
  assert.ok(productIdForArchive);
  assert.equal(
    (
      await agentOwnerA
        .delete(`/api/v1/admin/catalog/products/${productIdForArchive}`)
        .set(H)
    ).status,
    403,
  );
  const archived = await admin
    .delete(`/api/v1/admin/catalog/products/${productIdForArchive}`)
    .set(H);
  assert.equal(archived.status, 200);
  assert.equal(archived.body.archived, true);
  const product = await Product.findByPk(productIdForArchive);
  assert.equal(product.isActive, false);
  const listings = await SellerListing.findAll({
    where: { productId: productIdForArchive },
  });
  assert.ok(listings.length > 0);
  assert.ok(listings.every((listing) => listing.isActive === false));
});

test("Tenant isolation: Shop B cannot access Shop A inventory, orders, or employees", async () => {
  assert.equal((await agentOwnerA.get("/api/v1/customer/cart")).status, 403);
  // Shop B inventory doesn't show Shop A items
  const bInv = await agentOwnerB.get("/api/v1/shop/inventory");
  assert.equal(bInv.status, 200);
  assert.equal(bInv.body.items.length, 0);

  // Shop B orders doesn't show Shop A orders
  const bOrders = await agentOwnerB.get("/api/v1/shop/orders");
  assert.equal(bOrders.status, 200);
  assert.equal(bOrders.body.items.length, 0);

  // Shop B employees doesn't show Shop A employees
  const bEmps = await agentOwnerB.get("/api/v1/shop/employees");
  assert.equal(bEmps.status, 200);
  assert.equal(bEmps.body.items.length, 1); // Only Owner B
});
