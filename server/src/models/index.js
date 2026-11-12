
const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const T = (tableName, extra = {}) => ({
  tableName,
  underscored: true,
  ...extra,
});

const User = sequelize.define(
  "User",
  {
    name: { type: DataTypes.STRING(120), allowNull: false },
    firstName: { type: DataTypes.STRING(80), allowNull: true },
    lastName: { type: DataTypes.STRING(80), allowNull: true },
    email: { type: DataTypes.STRING(190), allowNull: false },
    phone: DataTypes.STRING(20),
    passwordHash: DataTypes.STRING(100),
    role: {
      type: DataTypes.ENUM("super_admin", "shop_user", "customer"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "invited", "disabled"),
      allowNull: false,
      defaultValue: "active",
    },
    emailVerifiedAt: DataTypes.DATE,
    lastLoginAt: DataTypes.DATE,
  },
  T("users", { defaultScope: { attributes: { exclude: ["passwordHash"] } } }),
);

const ShopCategory = sequelize.define(
  "ShopCategory",
  {
    name: { type: DataTypes.STRING(100), allowNull: false },
  },
  T("shop_categories"),
);

const Shop = sequelize.define(
  "Shop",
  {
    name: { type: DataTypes.STRING(150), allowNull: false },
    nameKey: { type: DataTypes.STRING(150), allowNull: false },
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    address: { type: DataTypes.STRING(500), allowNull: false },
    gstNumber: { type: DataTypes.STRING(20), allowNull: true },
    city: { type: DataTypes.STRING(100), allowNull: true },
    district: { type: DataTypes.STRING(100), allowNull: true },
    state: { type: DataTypes.STRING(100), allowNull: true },
    pinCode: { type: DataTypes.STRING(10), allowNull: true },
    contactPhone: DataTypes.STRING(20),
    contactEmail: DataTypes.STRING(190),
    shippingSettings: { type: DataTypes.JSON, allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "suspended"),
      allowNull: false,
      defaultValue: "active",
    },
    createdBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("shops"),
);


const ShopMembership = sequelize.define(
  "ShopMembership",
  {
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
    },
  },
  T("shop_memberships"),
);

const ShopRole = sequelize.define(
  "ShopRole",
  {
    shopId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    permissions: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  T("shop_roles", {
    indexes: [
      {
        unique: true,
        name: "uq_shop_roles_shop_code",
        fields: ["shop_id", "code"],
      },
      {
        unique: true,
        name: "uq_shop_roles_shop_name",
        fields: ["shop_id", "name"],
      },
      {
        name: "ix_shop_roles_shop_active",
        fields: ["shop_id", "is_active"],
      },
    ],
  }),
);

const Wholesaler = sequelize.define(
  "Wholesaler",
  {
    name: { type: DataTypes.STRING(150), allowNull: false },
    contactPerson: DataTypes.STRING(120),
    contactEmail: DataTypes.STRING(190),
    contactPhone: DataTypes.STRING(20),
    address: DataTypes.STRING(500),
    gstNumber: { type: DataTypes.STRING(20), allowNull: true },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  T("wholesalers"),
);



const WholesalerShopAccess = sequelize.define(
  "WholesalerShopAccess",
  {
    wholesalerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    shopId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    grantedBy: DataTypes.INTEGER.UNSIGNED,
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  T("wholesaler_shop_access"),
);

const AuthToken = sequelize.define(
  "AuthToken",
  {
    userId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM(
        "account_setup",
        "password_reset",
        "email_verification"
      ),
      allowNull: false,
    },
    tokenHash: {
      type: DataTypes.CHAR(64),
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usedAt: DataTypes.DATE,
    attempts: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  T("auth_tokens"),
);
const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    actorUserId: DataTypes.INTEGER.UNSIGNED,
    shopId: DataTypes.INTEGER.UNSIGNED,
    action: { type: DataTypes.STRING(80), allowNull: false },
    entityType: DataTypes.STRING(60),
    entityId: DataTypes.STRING(40),
    meta: DataTypes.JSON,
    ip: DataTypes.STRING(64),
  },
  T("audit_logs", { updatedAt: false }),
);

// Commission Settings
const CommissionSetting = sequelize.define(
  "CommissionSetting",
  {
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 5.0,
    },
    minOrderAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    notes: DataTypes.STRING(255),
    updatedBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("commission_settings"),
);

// Catalog Models
const Category = sequelize.define(
  "Category",
  {
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false },
    description: DataTypes.STRING(500),
    imageUrl: DataTypes.STRING(500),
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    submissionStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: true,
      defaultValue: null,
    },
    submittedByShopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    rejectionReason: { type: DataTypes.STRING(500), allowNull: true },
  },
  T("categories"),
);

const Subcategory = sequelize.define(
  "Subcategory",
  {
    categoryId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    slug: { type: DataTypes.STRING(120), allowNull: false },
    description: DataTypes.STRING(500),
    imageUrl: DataTypes.STRING(500),
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    submissionStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: true,
      defaultValue: null,
    },
    submittedByShopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    rejectionReason: { type: DataTypes.STRING(500), allowNull: true },
  },
  T("subcategories"),
);

const Brand = sequelize.define(
  "Brand",
  {
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: DataTypes.STRING(500),
    imageUrl: DataTypes.STRING(500),
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    submissionStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: true,
      defaultValue: null,
    },
    submittedByShopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    rejectionReason: { type: DataTypes.STRING(500), allowNull: true },
  },
  T("brands"),
);

const Attribute = sequelize.define(
  "Attribute",
  {
    name: { type: DataTypes.STRING(60), allowNull: false },
    code: { type: DataTypes.STRING(60), allowNull: false },
    submissionStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: true,
      defaultValue: null,
    },
    submittedByShopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    rejectionReason: { type: DataTypes.STRING(500), allowNull: true },
  },
  T("attributes"),
);

const AttributeValue = sequelize.define(
  "AttributeValue",
  {
    attributeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    value: { type: DataTypes.STRING(100), allowNull: false },
  },
  T("attribute_values"),
);

// const Product = sequelize.define(
//   "Product",
//   {
//     name: { type: DataTypes.STRING(200), allowNull: false },
//     sku: DataTypes.STRING(80),
//     categoryId: DataTypes.INTEGER.UNSIGNED,
//     subcategoryId: DataTypes.INTEGER.UNSIGNED,
//     brandId: DataTypes.INTEGER.UNSIGNED,
//     description: DataTypes.TEXT,
//     basePrice: {
//       type: DataTypes.DECIMAL(10, 2),
//       allowNull: false,
//       defaultValue: 0.0,
//     },
//     weight: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
//     weightUnit: {
//       type: DataTypes.ENUM("g", "kg"),
//       allowNull: false,
//       defaultValue: "kg",
//     },
//     isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
//   },
//   T("products"),
// );

const Product = sequelize.define(
  "Product",
  {
    name: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },

    sku: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },

    categoryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    subcategoryId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    brandId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },

    // Short description shown on customer product cards
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      defaultValue: null,
    },

    // Full product description shown on product detail page
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },

    basePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },

    weight: {
      type: DataTypes.DECIMAL(10, 3),
      allowNull: true,
    },

    weightUnit: {
      type: DataTypes.ENUM("g", "kg"),
      allowNull: false,
      defaultValue: "kg",
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  T("products"),
);



const ProductVariant = sequelize.define(
  "ProductVariant",
  {
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sku: { type: DataTypes.STRING(80), allowNull: false },
    variantName: { type: DataTypes.STRING(150), allowNull: false },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    wholesalePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    weight: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
    weightUnit: { type: DataTypes.ENUM("g", "kg"), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  T("product_variants"),
);

const ProductVariantValue = sequelize.define(
  "ProductVariantValue",
  {
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    attributeId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    attributeValueId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  T("product_variant_values"),
);

const ProductImage = sequelize.define(
  "ProductImage",
  {
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    imageUrl: { type: DataTypes.STRING(500), allowNull: false },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  T("product_images"),
);

// Seller Listings & Inventory
const SellerListing = sequelize.define(
  "SellerListing",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    customSku: DataTypes.STRING(80),
    retailPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    gstApplicable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    gstRate: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    priceIncludesGst: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    hsnCode: { type: DataTypes.STRING(20), allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  T("seller_listings"),
);

const Inventory = sequelize.define(
  "Inventory",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lowStockThreshold: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
  },
  T("inventory"),
);

const InventoryMovement = sequelize.define(
  "InventoryMovement",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    changeQuantity: { type: DataTypes.INTEGER, allowNull: false },
    balanceAfter: { type: DataTypes.INTEGER, allowNull: false },
    movementType: {
      type: DataTypes.ENUM(
        "receipt",
        "sale",
        "return",
        "damaged",
        "adjustment",
      ),
      allowNull: false,
    },
    referenceType: DataTypes.STRING(50),
    referenceId: DataTypes.STRING(50),
    notes: DataTypes.STRING(500),
    createdBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("inventory_movements", { updatedAt: false }),
);

// Wholesale Purchase Orders, Receipts, Bills & Payments
const PurchaseOrder = sequelize.define(
  "PurchaseOrder",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    wholesalerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    orderNumber: { type: DataTypes.STRING(50), allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "draft",
        "submitted",
        "accepted",
        "rejected",
        "dispatched",
        "received",
        "completed",
        "cancelled",
      ),
      allowNull: false,
      defaultValue: "submitted",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    notes: DataTypes.TEXT,
    createdBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("purchase_orders"),
);

const PurchaseOrderItem = sequelize.define(
  "PurchaseOrderItem",
  {
    purchaseOrderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productName: { type: DataTypes.STRING(200), allowNull: false },
    variantName: { type: DataTypes.STRING(150), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    receivedQuantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  T("purchase_order_items"),
);

const GoodsReceipt = sequelize.define(
  "GoodsReceipt",
  {
    purchaseOrderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    receiptNumber: { type: DataTypes.STRING(50), allowNull: false },
    receivedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    notes: DataTypes.TEXT,
    receivedBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("goods_receipts"),
);

const GoodsReceiptItem = sequelize.define(
  "GoodsReceiptItem",
  {
    goodsReceiptId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    purchaseOrderItemId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quantityReceived: { type: DataTypes.INTEGER, allowNull: false },
    quantityRejected: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    discrepancyReason: DataTypes.STRING(255),
  },
  T("goods_receipt_items"),
);

const UploadedDocument = sequelize.define(
  "UploadedDocument",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    wholesalerId: DataTypes.INTEGER.UNSIGNED,
    purchaseOrderId: DataTypes.INTEGER.UNSIGNED,
    documentType: {
      type: DataTypes.ENUM(
        "bill",
        "invoice",
        "receipt",
        "delivery_proof",
        "other",
      ),
      allowNull: false,
      defaultValue: "bill",
    },
    originalFilename: { type: DataTypes.STRING(255), allowNull: false },
    storedFilename: { type: DataTypes.STRING(255), allowNull: false },
    filePath: { type: DataTypes.STRING(500), allowNull: false },
    fileSize: { type: DataTypes.INTEGER, allowNull: false },
    mimeType: { type: DataTypes.STRING(100), allowNull: false },
    uploadedBy: DataTypes.INTEGER.UNSIGNED,
    notes: DataTypes.STRING(500),
  },
  T("uploaded_documents"),
);

const WholesalePayment = sequelize.define(
  "WholesalePayment",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    wholesalerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    purchaseOrderId: DataTypes.INTEGER.UNSIGNED,
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "bank_transfer",
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    referenceNumber: DataTypes.STRING(100),
    notes: DataTypes.STRING(500),
    createdBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("wholesale_payments"),
);

// Employee Profiles, Attendance & Salaries
const EmployeeProfile = sequelize.define(
  "EmployeeProfile",
  {
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    salaryType: {
      type: DataTypes.ENUM("monthly", "hourly", "daily"),
      allowNull: false,
      defaultValue: "monthly",
    },
    baseSalary: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    joinedDate: DataTypes.DATEONLY,
    designation: DataTypes.STRING(100),
    employeeCode: DataTypes.STRING(40),
    address: DataTypes.STRING(500),
    notes: DataTypes.TEXT,
  },
  T("employee_profiles"),
);

const AttendanceRecord = sequelize.define(
  "AttendanceRecord",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM("present", "absent", "half_day", "on_leave"),
      allowNull: false,
      defaultValue: "present",
    },
    checkIn: DataTypes.TIME,
    checkOut: DataTypes.TIME,
    workingHours: DataTypes.DECIMAL(4, 2),
    notes: DataTypes.STRING(255),
    recordedBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("attendance_records"),
);

const SalaryPayment = sequelize.define(
  "SalaryPayment",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    payPeriod: { type: DataTypes.STRING(20), allowNull: false },
    baseAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    netAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentDate: { type: DataTypes.DATEONLY, allowNull: false },
    paymentMethod: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "cash",
    },
    status: {
      type: DataTypes.ENUM("pending", "paid"),
      allowNull: false,
      defaultValue: "paid",
    },
    notes: DataTypes.STRING(500),
    paidBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("salary_payments"),
);

const EmployeeSalary = sequelize.define(
  "EmployeeSalary",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    salaryType: {
      type: DataTypes.ENUM("monthly", "hourly", "daily"),
      allowNull: false,
    },
    baseSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    effectiveDate: { type: DataTypes.DATEONLY, allowNull: false },
    notes: DataTypes.STRING(500),
    createdBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("employee_salaries"),
);

const PayrollRun = sequelize.define(
  "PayrollRun",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    payPeriod: { type: DataTypes.STRING(7), allowNull: false },
    status: {
      type: DataTypes.ENUM("draft", "finalized"),
      allowNull: false,
      defaultValue: "draft",
    },
    totalGross: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalDeductions: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalNet: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    generatedBy: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    finalizedBy: DataTypes.INTEGER.UNSIGNED,
    finalizedAt: DataTypes.DATE,
  },
  T("payroll_runs"),
);

const PayrollItem = sequelize.define(
  "PayrollItem",
  {
    payrollRunId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    employeeName: { type: DataTypes.STRING(120), allowNull: false },
    designation: DataTypes.STRING(100),
    salaryType: {
      type: DataTypes.ENUM("monthly", "hourly", "daily"),
      allowNull: false,
    },
    baseSalary: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    allowances: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    deductions: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    attendanceDeduction: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    payableDays: {
      type: DataTypes.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalDays: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    totalHours: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
      defaultValue: 0,
    },
    calculationBasis: { type: DataTypes.STRING(500), allowNull: false },
    grossAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    netAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "paid"),
      allowNull: false,
      defaultValue: "pending",
    },
    paymentDate: DataTypes.DATEONLY,
    paymentMethod: DataTypes.STRING(50),
    paidBy: DataTypes.INTEGER.UNSIGNED,
    notes: DataTypes.STRING(500),
  },
  T("payroll_items"),
);

// Customer Addresses, Cart & Wishlist
const CustomerAddress = sequelize.define(
  "CustomerAddress",
  {
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    label: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "Home",
    },
    recipientName: { type: DataTypes.STRING(120), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false },
    streetAddress: { type: DataTypes.STRING(300), allowNull: false },
    city: { type: DataTypes.STRING(100), allowNull: false },
    state: { type: DataTypes.STRING(100), allowNull: false },
    postalCode: { type: DataTypes.STRING(20), allowNull: false },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  T("customer_addresses"),
);

const Cart = sequelize.define(
  "Cart",
  {
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  T("carts"),
);

const CartItem = sequelize.define(
  "CartItem",
  {
    cartId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sellerListingId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  },
  T("cart_items"),
);

const Wishlist = sequelize.define(
  "Wishlist",
  {
    userId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  T("wishlists"),
);

// Product Reviews
const ProductReview = sequelize.define(
  "ProductReview",
  {
    productId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    customerId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    orderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    rating: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    title: {
      type: DataTypes.STRING(150),
      allowNull: true,
    },
    body: {
      type: DataTypes.STRING(1500),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 1500],
      },
    },
  },
  T("product_reviews", {
    indexes: [
      {
        unique: true,
        name: "unique_customer_product_order_review",
        fields: ["customer_id", "product_id", "order_id"],
      },
    ],
  }),
);

// Orders, Items, Status History, Deliveries, Payments, Returns
const Order = sequelize.define(
  "Order",
  {
    orderNumber: { type: DataTypes.STRING(50), allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "pending_payment",
        "confirmed",
        "processing",
        "packed",
        "ready_for_dispatch",
        "assigned_to_delivery",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "cancelled",
        "delivery_failed",
        "returned",
      ),
      allowNull: false,
      defaultValue: "confirmed",
    },
    deliveryStatus: {
      type: DataTypes.ENUM(
        "not_assigned",
        "assigned",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "failed",
      ),
      allowNull: false,
      defaultValue: "not_assigned",
    },
    paymentMethod: {
      type: DataTypes.ENUM("cod", "razorpay"),
      allowNull: false,
      defaultValue: "cod",
    },
    paymentStatus: {
      type: DataTypes.ENUM(
        "pending",
        "paid",
        "failed",
        "refunded",
        "partially_refunded",
      ),
      allowNull: false,
      defaultValue: "pending",
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    taxAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    deliveryFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    couponId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    couponCode: { type: DataTypes.STRING(40), allowNull: true },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    commissionRate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    commissionAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    taxBreakdown: { type: DataTypes.JSON, allowNull: true },
    shippingSnapshot: { type: DataTypes.JSON, allowNull: true },
    shippingAddress: DataTypes.JSON,
    notes: DataTypes.TEXT,
  },
  T("orders"),
);

const OrderItem = sequelize.define(
  "OrderItem",
  {
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    productVariantId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sellerListingId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    productName: { type: DataTypes.STRING(200), allowNull: false },
    variantName: { type: DataTypes.STRING(150), allowNull: false },
    sku: DataTypes.STRING(80),
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    unitPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    totalPrice: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    taxableValue: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    taxAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    taxSnapshot: { type: DataTypes.JSON, allowNull: true },
    weightKg: { type: DataTypes.DECIMAL(10, 3), allowNull: true },
  },
  T("order_items"),
);

const OrderStatusHistory = sequelize.define(
  "OrderStatusHistory",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    previousStatus: DataTypes.STRING(50),
    newStatus: { type: DataTypes.STRING(50), allowNull: false },
    notes: DataTypes.STRING(500),
    changedBy: DataTypes.INTEGER.UNSIGNED,
  },
  T("order_status_history", { updatedAt: false }),
);

const DeliveryAssignment = sequelize.define(
  "DeliveryAssignment",
  {
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    deliveryUserId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "assigned",
        "picked_up",
        "out_for_delivery",
        "delivered",
        "failed",
      ),
      allowNull: false,
      defaultValue: "assigned",
    },
    assignedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    pickedUpAt: DataTypes.DATE,
    deliveredAt: DataTypes.DATE,
    notes: DataTypes.STRING(500),
    proofImagePath: DataTypes.STRING(500),
  },
  T("delivery_assignments"),
);

const Payment = sequelize.define(
  "Payment",
  {
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    paymentMethod: {
      type: DataTypes.ENUM("cod", "razorpay"),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
      allowNull: false,
      defaultValue: "pending",
    },
    razorpayOrderId: DataTypes.STRING(100),
    razorpayPaymentId: DataTypes.STRING(100),
    razorpaySignature: DataTypes.STRING(255),
    codCollectedAmount: DataTypes.DECIMAL(10, 2),
    codCollectedBy: DataTypes.INTEGER.UNSIGNED,
    codCollectedAt: DataTypes.DATE,
    codReconciled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    codReconciledAt: DataTypes.DATE,
    codReconciledBy: DataTypes.INTEGER.UNSIGNED,
    meta: DataTypes.JSON,
  },
  T("payments"),
);

const Coupon = sequelize.define(
  "Coupon",
  {
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    code: { type: DataTypes.STRING(40), allowNull: false },
    discountType: {
      type: DataTypes.ENUM("percentage", "flat"),
      allowNull: false,
    },
    discountValue: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    maxDiscountAmount: DataTypes.DECIMAL(10, 2),
    minimumOrderAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    totalUsageLimit: DataTypes.INTEGER.UNSIGNED,
    perCustomerUsageLimit: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    },
    usedCount: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    expiryDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: {
      type: DataTypes.ENUM("active", "inactive"),
      allowNull: false,
      defaultValue: "active",
    },
  },
  T("coupons", {
    indexes: [
      { unique: true, name: "uq_coupons_shop_code", fields: ["shop_id", "code"] },
      { name: "ix_coupons_shop_status_expiry", fields: ["shop_id", "status", "expiry_date"] },
    ],
  }),
);

const CouponRedemption = sequelize.define(
  "CouponRedemption",
  {
    couponId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    discountAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM("reserved", "redeemed", "released"),
      allowNull: false,
      defaultValue: "reserved",
    },
    redeemedAt: DataTypes.DATE,
  },
  T("coupon_redemptions", {
    indexes: [
      { unique: true, name: "uq_coupon_redemptions_order", fields: ["order_id"] },
      { name: "ix_coupon_redemptions_customer_status", fields: ["coupon_id", "customer_id", "status"] },
      { name: "ix_coupon_redemptions_coupon_status", fields: ["coupon_id", "status"] },
    ],
  }),
);

const Return = sequelize.define(
  "Return",
  {
    orderId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    shopId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    customerId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reason: { type: DataTypes.STRING(500), allowNull: false },
    status: {
      type: DataTypes.ENUM(
        "requested",
        "approved",
        "rejected",
        "received",
        "refund_processing",
        "refunded",
      ),
      allowNull: false,
      defaultValue: "requested",
    },
    approvedAt: DataTypes.DATE,
    approvedBy: DataTypes.INTEGER.UNSIGNED,
    rejectedAt: DataTypes.DATE,
    rejectedBy: DataTypes.INTEGER.UNSIGNED,
    rejectionReason: DataTypes.STRING(500),
    receivedAt: DataTypes.DATE,
    receivedBy: DataTypes.INTEGER.UNSIGNED,
    refundProcessingAt: DataTypes.DATE,
    refundedAt: DataTypes.DATE,
    refundedBy: DataTypes.INTEGER.UNSIGNED,
    refundReference: DataTypes.STRING(255),
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0,
    },
    processedBy: DataTypes.INTEGER.UNSIGNED,
    notes: DataTypes.TEXT,
  },
  T("returns"),
);

const ReturnItem = sequelize.define(
  "ReturnItem",
  {
    returnId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    orderItemId: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    reason: DataTypes.STRING(255),
  },
  T("return_items"),
);

// Associations
Shop.belongsTo(ShopCategory, { as: "category", foreignKey: "categoryId" });
ShopCategory.hasMany(Shop, { as: "shops", foreignKey: "categoryId" });

ShopMembership.belongsTo(User, { as: "user", foreignKey: "userId" });
ShopMembership.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
User.hasMany(ShopMembership, { as: "memberships", foreignKey: "userId" });
Shop.hasMany(ShopMembership, { as: "memberships", foreignKey: "shopId" });
Shop.hasOne(ShopMembership, {
  as: "ownerMembership",
  foreignKey: "shopId",
  scope: { role: "shop_owner" },
});

ShopRole.belongsTo(Shop, {
  as: "shop",
  foreignKey: "shopId",
});

Shop.hasMany(ShopRole, {
  as: "employeeRoles",
  foreignKey: "shopId",
});

WholesalerShopAccess.belongsTo(Wholesaler, {
  as: "wholesaler",
  foreignKey: "wholesalerId",
});
WholesalerShopAccess.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
Wholesaler.hasMany(WholesalerShopAccess, {
  as: "grants",
  foreignKey: "wholesalerId",
});
Shop.hasMany(WholesalerShopAccess, { as: "grants", foreignKey: "shopId" });

AuthToken.belongsTo(User, { as: "user", foreignKey: "userId" });
AuditLog.belongsTo(User, { as: "actor", foreignKey: "actorUserId" });
CommissionSetting.belongsTo(User, { as: "updater", foreignKey: "updatedBy" });

// Catalog submission associations
Category.belongsTo(Shop, {
  as: "submittedByShop",
  foreignKey: "submittedByShopId",
});
Shop.hasMany(Category, {
  as: "catalogCategorySubmissions",
  foreignKey: "submittedByShopId",
});

Subcategory.belongsTo(Shop, {
  as: "submittedByShop",
  foreignKey: "submittedByShopId",
});
Shop.hasMany(Subcategory, {
  as: "catalogSubcategorySubmissions",
  foreignKey: "submittedByShopId",
});

Brand.belongsTo(Shop, {
  as: "submittedByShop",
  foreignKey: "submittedByShopId",
});
Shop.hasMany(Brand, {
  as: "catalogBrandSubmissions",
  foreignKey: "submittedByShopId",
});

// Category and subcategory
Category.hasMany(Subcategory, {
  as: "subcategories",
  foreignKey: "categoryId",
});
Subcategory.belongsTo(Category, {
  as: "category",
  foreignKey: "categoryId",
});

// Products
Product.belongsTo(Category, {
  as: "category",
  foreignKey: "categoryId",
});
Product.belongsTo(Subcategory, {
  as: "subcategory",
  foreignKey: "subcategoryId",
});
Product.belongsTo(Brand, {
  as: "brand",
  foreignKey: "brandId",
});
Product.hasMany(ProductVariant, {
  as: "variants",
  foreignKey: "productId",
});
Product.hasMany(ProductImage, {
  as: "images",
  foreignKey: "productId",
});

// Product variants
ProductVariant.belongsTo(Product, {
  as: "product",
  foreignKey: "productId",
});
ProductVariant.hasMany(ProductVariantValue, {
  as: "variantValues",
  foreignKey: "productVariantId",
});
ProductVariantValue.belongsTo(ProductVariant, {
  as: "variant",
  foreignKey: "productVariantId",
});
ProductVariantValue.belongsTo(Attribute, {
  as: "attribute",
  foreignKey: "attributeId",
});
ProductVariantValue.belongsTo(AttributeValue, {
  as: "attributeValue",
  foreignKey: "attributeValueId",
});

// Attributes
Attribute.belongsTo(Shop, {
  as: "submittedByShop",
  foreignKey: "submittedByShopId",
});
Shop.hasMany(Attribute, {
  as: "catalogAttributeSubmissions",
  foreignKey: "submittedByShopId",
});
Attribute.hasMany(AttributeValue, {
  as: "values",
  foreignKey: "attributeId",
});
AttributeValue.belongsTo(Attribute, {
  as: "attribute",
  foreignKey: "attributeId",
});

// Listings & Inventory
SellerListing.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
SellerListing.belongsTo(Product, { as: "product", foreignKey: "productId" });
SellerListing.belongsTo(ProductVariant, {
  as: "variant",
  foreignKey: "productVariantId",
});
ProductVariant.hasMany(SellerListing, {
  as: "sellerListings",
  foreignKey: "productVariantId",
});
Product.hasMany(SellerListing, {
  as: "sellerListings",
  foreignKey: "productId",
});
Shop.hasMany(SellerListing, {
  as: "sellerListings",
  foreignKey: "shopId",
});

Inventory.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
Inventory.belongsTo(Product, { as: "product", foreignKey: "productId" });
Inventory.belongsTo(ProductVariant, {
  as: "variant",
  foreignKey: "productVariantId",
});
ProductVariant.hasMany(Inventory, {
  as: "inventoryRows",
  foreignKey: "productVariantId",
});
Shop.hasMany(Inventory, { as: "inventoryRows", foreignKey: "shopId" });

InventoryMovement.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
InventoryMovement.belongsTo(Product, {
  as: "product",
  foreignKey: "productId",
});
InventoryMovement.belongsTo(ProductVariant, {
  as: "variant",
  foreignKey: "productVariantId",
});
InventoryMovement.belongsTo(User, { as: "creator", foreignKey: "createdBy" });

// Purchase Orders & Wholesale
PurchaseOrder.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
PurchaseOrder.belongsTo(Wholesaler, {
  as: "wholesaler",
  foreignKey: "wholesalerId",
});
PurchaseOrder.belongsTo(User, { as: "creator", foreignKey: "createdBy" });
PurchaseOrder.hasMany(PurchaseOrderItem, {
  as: "items",
  foreignKey: "purchaseOrderId",
});
PurchaseOrder.hasMany(GoodsReceipt, {
  as: "receipts",
  foreignKey: "purchaseOrderId",
});
PurchaseOrder.hasMany(UploadedDocument, {
  as: "documents",
  foreignKey: "purchaseOrderId",
});
PurchaseOrder.hasMany(WholesalePayment, {
  as: "payments",
  foreignKey: "purchaseOrderId",
});

PurchaseOrderItem.belongsTo(PurchaseOrder, {
  as: "purchaseOrder",
  foreignKey: "purchaseOrderId",
});
PurchaseOrderItem.belongsTo(Product, {
  as: "product",
  foreignKey: "productId",
});
PurchaseOrderItem.belongsTo(ProductVariant, {
  as: "variant",
  foreignKey: "productVariantId",
});

GoodsReceipt.belongsTo(PurchaseOrder, {
  as: "purchaseOrder",
  foreignKey: "purchaseOrderId",
});
GoodsReceipt.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
GoodsReceipt.belongsTo(User, { as: "receiver", foreignKey: "receivedBy" });
GoodsReceipt.hasMany(GoodsReceiptItem, {
  as: "items",
  foreignKey: "goodsReceiptId",
});
GoodsReceiptItem.belongsTo(GoodsReceipt, {
  as: "goodsReceipt",
  foreignKey: "goodsReceiptId",
});
GoodsReceiptItem.belongsTo(PurchaseOrderItem, {
  as: "orderItem",
  foreignKey: "purchaseOrderItemId",
});

UploadedDocument.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
UploadedDocument.belongsTo(Wholesaler, {
  as: "wholesaler",
  foreignKey: "wholesalerId",
});
UploadedDocument.belongsTo(PurchaseOrder, {
  as: "purchaseOrder",
  foreignKey: "purchaseOrderId",
});
UploadedDocument.belongsTo(User, { as: "uploader", foreignKey: "uploadedBy" });

WholesalePayment.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
WholesalePayment.belongsTo(Wholesaler, {
  as: "wholesaler",
  foreignKey: "wholesalerId",
});
WholesalePayment.belongsTo(PurchaseOrder, {
  as: "purchaseOrder",
  foreignKey: "purchaseOrderId",
});
WholesalePayment.belongsTo(User, { as: "creator", foreignKey: "createdBy" });

// Employee Associations
EmployeeProfile.belongsTo(User, { as: "user", foreignKey: "userId" });
EmployeeProfile.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
AttendanceRecord.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
AttendanceRecord.belongsTo(User, { as: "user", foreignKey: "userId" });
AttendanceRecord.belongsTo(User, { as: "recorder", foreignKey: "recordedBy" });
SalaryPayment.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
SalaryPayment.belongsTo(User, { as: "user", foreignKey: "userId" });
SalaryPayment.belongsTo(User, { as: "payer", foreignKey: "paidBy" });
EmployeeSalary.belongsTo(User, { as: "user", foreignKey: "userId" });
EmployeeSalary.belongsTo(User, { as: "creator", foreignKey: "createdBy" });
EmployeeSalary.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
PayrollRun.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
PayrollRun.belongsTo(User, { as: "generator", foreignKey: "generatedBy" });
PayrollRun.belongsTo(User, { as: "finalizer", foreignKey: "finalizedBy" });
PayrollRun.hasMany(PayrollItem, { as: "items", foreignKey: "payrollRunId" });
PayrollItem.belongsTo(PayrollRun, { as: "run", foreignKey: "payrollRunId" });
PayrollItem.belongsTo(User, { as: "user", foreignKey: "userId" });
PayrollItem.belongsTo(User, { as: "payer", foreignKey: "paidBy" });
PayrollItem.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });

// Customer, Carts, Wishlists, Addresses
CustomerAddress.belongsTo(User, { as: "user", foreignKey: "userId" });
Cart.belongsTo(User, { as: "user", foreignKey: "userId" });
Cart.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
Cart.hasMany(CartItem, { as: "items", foreignKey: "cartId" });
CartItem.belongsTo(Cart, { as: "cart", foreignKey: "cartId" });
CartItem.belongsTo(Product, { as: "product", foreignKey: "productId" });
CartItem.belongsTo(ProductVariant, {
  as: "variant",
  foreignKey: "productVariantId",
});
CartItem.belongsTo(SellerListing, {
  as: "sellerListing",
  foreignKey: "sellerListingId",
});
Wishlist.belongsTo(User, { as: "user", foreignKey: "userId" });
Wishlist.belongsTo(Product, { as: "product", foreignKey: "productId" });

// Product review associations
ProductReview.belongsTo(User, {
  as: "customer",
  foreignKey: "customerId",
});
ProductReview.belongsTo(Product, {
  as: "product",
  foreignKey: "productId",
});
ProductReview.belongsTo(Order, {
  as: "order",
  foreignKey: "orderId",
});
Product.hasMany(ProductReview, {
  as: "reviews",
  foreignKey: "productId",
});
User.hasMany(ProductReview, {
  as: "productReviews",
  foreignKey: "customerId",
});
Order.hasMany(ProductReview, {
  as: "productReviews",
  foreignKey: "orderId",
});

// Orders, Deliveries, Payments, Returns
Order.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
Order.belongsTo(User, { as: "customer", foreignKey: "customerId" });
Order.belongsTo(Coupon, { as: "coupon", foreignKey: "couponId" });
Order.hasMany(OrderItem, { as: "items", foreignKey: "orderId" });
Order.hasMany(OrderStatusHistory, {
  as: "statusHistory",
  foreignKey: "orderId",
});
Order.hasOne(DeliveryAssignment, { as: "delivery", foreignKey: "orderId" });
Order.hasMany(Payment, { as: "payments", foreignKey: "orderId" });
Order.hasMany(Return, { as: "returns", foreignKey: "orderId" });

OrderItem.belongsTo(Order, { as: "order", foreignKey: "orderId" });
OrderItem.belongsTo(Product, { as: "product", foreignKey: "productId" });
OrderItem.belongsTo(ProductVariant, {
  as: "variant",
  foreignKey: "productVariantId",
});
OrderItem.belongsTo(SellerListing, {
  as: "sellerListing",
  foreignKey: "sellerListingId",
});

OrderStatusHistory.belongsTo(Order, { as: "order", foreignKey: "orderId" });
OrderStatusHistory.belongsTo(User, { as: "changer", foreignKey: "changedBy" });

DeliveryAssignment.belongsTo(Order, { as: "order", foreignKey: "orderId" });
DeliveryAssignment.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
DeliveryAssignment.belongsTo(User, {
  as: "deliveryUser",
  foreignKey: "deliveryUserId",
});

Payment.belongsTo(Order, { as: "order", foreignKey: "orderId" });
Payment.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
Payment.belongsTo(User, { as: "collector", foreignKey: "codCollectedBy" });
Payment.belongsTo(User, { as: "reconciler", foreignKey: "codReconciledBy" });

Coupon.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
Coupon.hasMany(CouponRedemption, { as: "redemptions", foreignKey: "couponId" });
CouponRedemption.belongsTo(Coupon, { as: "coupon", foreignKey: "couponId" });
CouponRedemption.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
CouponRedemption.belongsTo(User, { as: "customer", foreignKey: "customerId" });
CouponRedemption.belongsTo(Order, { as: "order", foreignKey: "orderId" });
Shop.hasMany(Coupon, { as: "coupons", foreignKey: "shopId" });
Order.hasOne(CouponRedemption, { as: "couponRedemption", foreignKey: "orderId" });

Return.belongsTo(Order, { as: "order", foreignKey: "orderId" });
Return.belongsTo(Shop, { as: "shop", foreignKey: "shopId" });
Return.belongsTo(User, { as: "customer", foreignKey: "customerId" });
Return.belongsTo(User, { as: "processor", foreignKey: "processedBy" });
Return.belongsTo(User, { as: "approver", foreignKey: "approvedBy" });
Return.belongsTo(User, { as: "rejector", foreignKey: "rejectedBy" });
Return.belongsTo(User, { as: "receiver", foreignKey: "receivedBy" });
Return.belongsTo(User, { as: "refundProcessor", foreignKey: "refundedBy" });
Return.hasMany(ReturnItem, { as: "items", foreignKey: "returnId" });
ReturnItem.belongsTo(Return, { as: "return", foreignKey: "returnId" });
ReturnItem.belongsTo(OrderItem, { as: "orderItem", foreignKey: "orderItemId" });

module.exports = {
  sequelize,
  User,
  ShopCategory,
  Shop,
  ShopMembership,
  ShopRole,
  Wholesaler,
  WholesalerShopAccess,
  AuthToken,
  AuditLog,
  CommissionSetting,
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
  InventoryMovement,
  PurchaseOrder,
  PurchaseOrderItem,
  GoodsReceipt,
  GoodsReceiptItem,
  UploadedDocument,
  WholesalePayment,
  EmployeeProfile,
  AttendanceRecord,
  SalaryPayment,
  EmployeeSalary,
  PayrollRun,
  PayrollItem,
  CustomerAddress,
  Cart,
  CartItem,
  Wishlist,
  ProductReview,
  Order,
  OrderItem,
  OrderStatusHistory,
  DeliveryAssignment,
  Payment,
  Coupon,
  CouponRedemption,
  Return,
  ReturnItem,
};
