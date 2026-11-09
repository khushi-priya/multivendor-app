# Multivendor Wholesale & Retail Platform

## 1. Project Overview

Build a new, standalone multivendor wholesale and retail platform using:

-   **Frontend:** React.js, JavaScript, Vite, Tailwind CSS
-   **Backend:** Node.js, Express.js
-   **Database / ORM:** MySQL and Sequelize
-   **Authentication:** Secure server-side sessions, password hashing,
    email verification and password reset
-   **Payments:** Cash on Delivery (COD) and Razorpay
-   **Email:** Gmail SMTP or another configurable SMTP provider
-   **File uploads:** Validated uploads for bills, invoices, product
    images and other authorized documents

This README is the project specification and implementation guide. It
does not imply that the application has already been implemented.

## 2. Critical Requirement: Create the Shop and Its Owner Together

**When the Super Admin creates a shop, the shop owner account must be
created in the same operation. There must not be a separate
owner-registration step.**

### Required workflow

1.  The Super Admin opens **Shops → Create Shop** from the top
    navigation.
2.  One form collects both shop details and owner details.
3.  When the form is submitted, the backend creates the shop, creates
    the owner's user account, and assigns that account to the newly
    created shop.
4.  The backend performs these database operations in a single Sequelize
    transaction. If any required step fails, all changes are rolled
    back.
5.  After successful creation, the Super Admin sees a confirmation and
    the shop appears in the shop list.
6.  The owner receives a secure account-setup invitation by email,
    preferably, and sets their own password. If the application instead
    accepts an initial password in the form, it must be securely hashed
    before storage and never returned in API responses.
7.  The owner logs in and is directed to the dashboard of the shop they
    own.

Do not create the shop first and ask the owner to register separately.
Do not let the owner select an arbitrary shop during registration.

### Create Shop form

**Shop details** - Shop name - Shop category - Shop address - Optional
shop contact details and status

**Owner details** - Owner's full name - Owner's email address - Owner's
phone number - Optional initial password, only if the secure invitation
flow is not used

Validate required fields, email and phone formats, unique account email,
and duplicate shop rules. Clearly report validation errors. Protect
against duplicate submissions.

### Suggested data relationship

-   `shops`: shop identity and business details
-   `users`: owner identity and authentication details
-   `shop_memberships`: connects a user to a shop and stores the user's
    shop-specific role, such as `shop_owner`

The shop creation service should: 1. Validate and normalize the request.
2. Verify the email is not already assigned in a way that conflicts with
the account policy. 3. Start a Sequelize transaction. 4. Create the
shop. 5. Create or appropriately handle the owner user account. 6.
Create the owner's `shop_memberships` record with role `shop_owner` and
the new shop ID. 7. Create an audit log entry where appropriate. 8.
Commit the transaction and return a safe response.

If an email already belongs to an existing user, do not silently create
a duplicate account or expose private account information. Define a
secure policy, such as inviting the existing account to join the shop
after authorization, or rejecting the request with a clear,
non-sensitive message.

## 3. User Roles

### Super Admin

The Super Admin controls platform-wide operations:

-   Secure login and dashboard
-   Create, view, edit, suspend and activate shops
-   Create the shop owner account automatically during shop creation
-   Manage shop categories
-   Manage wholesalers and wholesaler-to-shop access
-   Configure the platform commission percentage
-   View platform-wide order activity and reports
-   Review audit logs and platform settings
-   Control which wholesalers each shop is authorized to access

### Shop Owner

Each shop owner can manage only their assigned shop and authorized
wholesaler relationships:

-   Shop dashboard
-   Manage authorized wholesalers
-   Book wholesale orders
-   View purchase orders, uploaded bills and payment history
-   Manage categories, subcategories, brands, dynamic variants and
    products
-   Manage retail inventory, stock movements and purchase receipts
-   Manage employees, roles, attendance and salaries
-   Manage customers, retail orders, payments, deliveries, returns and
    refunds
-   View shop reports, profile and shop settings

### Shop Employees

Shop owners can create employee accounts assigned to their own shop.
Suggested roles:

-   **Shop Manager:** Manage permitted catalog, stock and order
    operations
-   **Sales Associate:** Assist with customer purchases and sales
-   **Delivery Associate:** View assigned deliveries and update delivery
    progress
-   **Cashier:** Record permitted cash/COD collection and reconcile
    transactions
-   **Customer Support Representative:** Handle permitted customer
    queries, returns and support tasks

Employee permissions must be enforced by the backend, not only by hiding
UI options.

### Customer

Customers can:

-   Register, log in and log out
-   Verify email where required
-   Request a password reset and set a new password
-   Browse and search products
-   Filter and sort products
-   View product details and available options
-   Add products to cart and wishlist
-   Checkout and choose COD or Razorpay
-   View payment confirmation and order history
-   Track delivery status
-   Request eligible returns/refunds
-   Reorder and review eligible products
-   Manage profile, addresses and payment history

## 4. UI Requirement: Top Navigation Only

**Do not create a left sidebar.** Use a responsive top navigation/header
with dropdown menus. On small screens, collapse the navigation into a
top menu or hamburger menu.

Navigation should depend on the logged-in user's role.

### Super Admin top navigation

-   Dashboard
-   Shops
    -   All Shops
    -   Create Shop
    -   Shop Categories
-   Wholesalers
-   Shop--Wholesaler Access
-   Commission Settings
-   Orders / Platform Activity
-   Reports
-   Audit Logs
-   Profile / Logout

### Shop Owner top navigation

-   Dashboard
-   Wholesalers
    -   Manage Wholesalers
    -   Book Wholesale Order
    -   Purchase Orders
    -   Upload Bills
    -   Payment History
-   Catalog
    -   Categories
    -   Subcategories
    -   Brands
    -   Variants / Attributes
    -   Products
-   Inventory
-   Orders
    -   Retail Orders
    -   Returns
    -   Refunds
-   Payments
-   Delivery
-   Employees
    -   Employee Management
    -   Attendance
    -   Salary / Payroll
-   Customers
-   Reports
-   Shop Settings / Profile
-   Logout

### Customer top navigation

-   Home
-   Categories
-   Products
-   Wishlist
-   Cart
-   My Orders
-   My Payments
-   My Profile
-   Login / Register or Logout, depending on session

Do not display menu items that the user is not authorized to access.
Direct URL access must still be protected by backend authorization.

## 5. Tenant Isolation and Wholesaler Access

Each shop must be isolated from every other shop. A shop owner, manager
or employee must never be able to access another shop's private
products, inventory, orders, customers, bills, employees, attendance,
salary, payment records or reports.

Example:

-   Wholesaler A, Wholesaler B and Wholesaler C operate on the platform.
-   Shop A is authorized to work with Wholesaler A and Wholesaler B.
-   Shop B is authorized to work with Wholesaler B and Wholesaler C.
-   Shop A must not access Wholesaler C's restricted data.
-   Shop B must not access Wholesaler A's restricted data.
-   Both shops may place separate orders with Wholesaler B, but each
    shop can view only its own orders, bills, payments and inventory
    records.

Use a relationship table such as `wholesaler_shop_access` to record
which shops are authorized to access which wholesalers. Check this
permission on every relevant backend request. Never rely only on
frontend filters.

## 6. Wholesale Management

Shop owners should be able to:

-   View and manage their authorized wholesalers
-   See permitted wholesaler catalog items, prices, availability and
    terms
-   Create wholesale purchase orders
-   Add items and quantities
-   Track order approval, dispatch and receipt
-   Upload and view bills/invoices securely
-   Track due amounts, payments and payment history
-   Record discrepancies or damaged/missing items during receipt

Uploaded bills must be private to authorized users. Validate file type
and size, generate safe file names, and avoid exposing private files
through public static URLs.

## 7. Catalog, Products and Dynamic Variants

Provide management for:

-   Categories
-   Subcategories
-   Brands
-   Product attributes and variants
-   Products and product images
-   Seller-specific listings, prices and availability

Variants must be dynamic, not hardcoded to only size or color. Different
product categories may need attributes such as color, size, weight,
volume, material, storage capacity, pack size or other category-specific
properties.

Suggested separation:

-   **Product:** Shared product definition and descriptive information
-   **Product attributes / variants:** Configurable option definitions
    and variant combinations
-   **Seller listing:** Which wholesaler or shop sells the product, with
    its own price, SKU and availability
-   **Inventory:** Stock quantity and stock movements for the specific
    seller/shop/location

Do not assume that a product's catalog definition, a wholesaler's price
and a retailer's stock are the same record.

## 8. Inventory and Purchase Receipts

Maintain separate wholesale availability and retail shop inventory.

Recommended flow:

1.  Shop creates a wholesale purchase order.
2.  Wholesaler confirms and fulfills it.
3.  Shop records receipt of goods.
4.  Authorized staff validate received quantities and discrepancies.
5.  Only confirmed received quantities increase retail shop stock.
6.  Inventory movements record receipts, sales, returns, adjustments and
    other stock changes.
7.  Stock deductions during checkout/order confirmation must be
    transaction-safe to avoid overselling.

Keep an audit trail of who made stock adjustments and why.

## 9. Employee Management, Attendance and Salary

Shop owners and authorized managers should be able to:

-   Create and update employee records
-   Assign a shop-specific role
-   Activate or deactivate employees
-   Record attendance, absence, leave and working hours
-   Define salary details and pay periods
-   Record salary payments and payment dates
-   View attendance and payroll reports

Salary and attendance records are sensitive. Restrict access to the
owner and explicitly authorized roles. Do not expose one shop's employee
records to another shop.

## 10. Customer Storefront and Orders

Customer features should include:

-   Registration, login and logout
-   Forgot password, reset password and confirm new password
-   Email verification if required
-   Product discovery, category/subcategory browsing, search, filtering
    and sorting
-   Product detail page with dynamic variant selection
-   Cart quantity increase/decrease and remove item
-   Wishlist add/remove
-   Address selection and checkout
-   COD and Razorpay payment options
-   Order confirmation page with accurate payment status
-   My Orders with item details, status history and delivery tracking
-   Eligible return/refund requests
-   Reorder and product reviews, subject to business rules
-   Profile, addresses and payment history

Calculate prices, discounts, taxes, delivery fees and totals on the
server. Never trust totals submitted by the browser.

## 11. Order and Delivery Lifecycle

Use explicit, validated order and delivery states. For example:

`pending_payment → confirmed → processing → packed → ready_for_dispatch → assigned_to_delivery → picked_up → out_for_delivery → delivered`

Other states may include `cancelled`, `delivery_failed`,
`return_requested`, `returned`, `refund_pending` and `refunded`, subject
to defined transition rules.

### Delivery Associate workflow

1.  A shop manager or authorized process assigns an order to a delivery
    associate.
2.  The associate sees only deliveries assigned to them and permitted
    shop information.
3.  The associate updates the delivery through allowed states, such as
    picked up, out for delivery, delivery attempted and delivered.
4.  Each update is saved to the backend with the actor, timestamp and
    optional note/proof.
5.  The shop order page and the customer's order-tracking page display
    the latest saved status and status history.
6.  Invalid or out-of-order status changes are rejected by the backend.
7.  Where appropriate, notify the customer and shop when the delivery
    status changes.

Do not implement delivery status as frontend-only state. Refreshing the
page must preserve the latest status. Use polling, server-sent events or
WebSockets if near-real-time updates are required; the backend remains
the source of truth.

### Delivery and payment are different

-   Marking an order **delivered** records the physical delivery
    outcome.
-   Marking a payment **paid** records the financial outcome.
-   These must be separate fields/workflows.

For COD, record whether cash was collected, by whom, when and for what
amount. Provide a reconciliation process for cash handed over to the
shop. A delivery marked delivered must not automatically count as a
reconciled payment unless the required collection and reconciliation
rules are satisfied.

## 12. Payments: COD and Razorpay

### Cash on Delivery (COD)

-   Allow COD only when enabled for the relevant order/location and
    business rules.
-   Track order status separately from payment status.
-   Record collection amount, collector, collection time and
    reconciliation status.
-   Handle failed delivery, cancellation, partial collection and refunds
    according to documented policies.

### Razorpay

Implement a real server-side Razorpay integration; do not fake
successful payments.

Required flow:

1.  Backend validates the order and recalculates the payable amount.
2.  Backend creates a Razorpay order using secret credentials stored
    only on the server.
3.  Frontend opens Razorpay Checkout using the returned public key and
    order details.
4.  Backend verifies the payment signature.
5.  Payment status is confirmed using trusted server-side verification
    and/or verified webhooks.
6.  Store payment attempts and provider event identifiers to support
    idempotency and reconciliation.
7.  Update the order/payment records in a database transaction where
    appropriate.
8.  Show success only after the backend confirms the payment outcome.

Handle failed, cancelled, pending, duplicate and delayed webhook events
safely. Never expose the Razorpay secret key to the frontend. Use test
credentials in development and production credentials only after
appropriate deployment checks.

## 13. Platform Commission

The Super Admin must be able to configure the platform commission
percentage for eligible orders.

Requirements:

-   Provide commission settings in the Super Admin top navigation.
-   Define the commission basis clearly (for example, eligible item
    subtotal excluding delivery fees, taxes or refunded amounts
    according to policy).
-   Store the applicable percentage and calculated amount as a snapshot
    on each order/commission record when the order is finalized for
    commission calculation.
-   Later commission-setting changes must not silently alter historical
    order commission records.
-   Define what happens for cancelled orders, partial refunds, full
    refunds, COD orders and payment reversals.
-   Keep a traceable record of commission calculations and adjustments.
-   If seller settlements are implemented, reconcile commission,
    refunds, payment gateway fees and payouts transparently.

## 14. Suggested Database Entities

Adapt the schema as the design becomes concrete. Likely entities
include:

-   `users`
-   `shops`
-   `shop_memberships`
-   `shop_categories`
-   `wholesalers`
-   `wholesaler_shop_access`
-   `categories`
-   `subcategories`
-   `brands`
-   `attributes`
-   `attribute_values`
-   `category_attributes`
-   `products`
-   `product_variants`
-   `product_variant_values`
-   `product_images`
-   `seller_listings`
-   `inventory`
-   `inventory_movements`
-   `purchase_orders`
-   `purchase_order_items`
-   `goods_receipts`
-   `goods_receipt_items`
-   `customers`
-   `customer_addresses`
-   `carts`
-   `cart_items`
-   `wishlists`
-   `wishlist_items`
-   `orders`
-   `order_items`
-   `order_status_history`
-   `deliveries`
-   `returns`
-   `return_items`
-   `payments`
-   `payment_events`
-   `refunds`
-   `commission_settings`
-   `order_commissions`
-   `settlements` (if seller payouts are in scope)
-   `employees` or shop memberships with employee profiles
-   `attendance_records`
-   `salary_records`
-   `salary_payments`
-   `invoices`
-   `uploaded_documents`
-   `email_verification_tokens`
-   `password_reset_tokens`
-   `sessions`
-   `notifications`
-   `audit_logs`

Use foreign keys, indexes, unique constraints, timestamps and
appropriate deletion policies. Avoid physically deleting financial
records that need an audit trail.

## 15. Suggested API Structure

Use a consistent prefix such as `/api/v1`.

### Authentication

-   `POST /auth/login`
-   `POST /auth/logout`
-   `GET /auth/me`
-   `POST /auth/forgot-password`
-   `POST /auth/reset-password`
-   Email verification endpoints as required

### Super Admin

-   `GET /admin/shops`
-   `POST /admin/shops` --- creates the shop **and its owner account in
    one transaction**
-   `GET /admin/shops/:shopId`
-   `PATCH /admin/shops/:shopId`
-   Shop category management endpoints
-   Wholesaler and shop-access management endpoints
-   Commission settings endpoints
-   Platform reports and audit-log endpoints

### Shop operations

-   Shop-scoped catalog and inventory endpoints
-   Authorized wholesaler listing and purchase-order endpoints
-   Bill upload and payment-history endpoints
-   Employee, attendance and salary endpoints
-   Retail order, return, refund and report endpoints

### Customer

-   Product discovery and product detail endpoints
-   Cart and wishlist endpoints
-   Checkout and order creation endpoints
-   Razorpay order creation and payment verification endpoints
-   Customer order history and tracking endpoints
-   Return, reorder, review, profile and address endpoints

### Delivery

-   `GET /delivery/assignments`
-   `GET /delivery/assignments/:deliveryId`
-   `PATCH /delivery/assignments/:deliveryId/status`

The backend must derive user identity and authorized shop scope from the
authenticated session. Do not trust a client-provided `shopId`, `role`,
`price`, `total` or delivery assignment without validating authorization
and business rules.

## 16. Security and Reliability

-   Hash passwords with bcrypt or an appropriate modern password-hashing
    algorithm.
-   Use secure session cookies, suitable SameSite settings, HTTPS in
    production and CSRF protection where applicable.
-   Store sessions in a production-suitable shared store, not process
    memory.
-   Apply login rate limiting and safe password-reset tokens.
-   Validate and sanitize inputs on the server.
-   Apply role-based and shop-scoped authorization to every protected
    endpoint.
-   Use database transactions for shop-plus-owner creation, order
    placement, stock updates and financial operations.
-   Use Sequelize migrations for schema changes; do not rely on
    `sync({ alter: true })` as a production migration strategy.
-   Keep secrets in environment variables or a secrets manager; never
    commit `.env`.
-   Validate uploaded file types, sizes and content; store sensitive
    documents privately.
-   Use idempotency and verified webhooks for payment events.
-   Add audit logs for sensitive admin, inventory, delivery and
    financial actions.
-   Avoid logging passwords, session IDs, payment secrets or sensitive
    personal information.
-   Add automated tests for tenant isolation and role permissions.

## 17. Suggested Project Structure

``` text
multivendor-platform/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── layouts/
│   │   ├── navigation/
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   ├── super-admin/
│   │   │   ├── shop/
│   │   │   ├── customer/
│   │   │   └── delivery/
│   │   ├── services/
│   │   ├── context/
│   │   ├── hooks/
│   │   └── utils/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── migrations/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── jobs/
│   │   ├── utils/
│   │   └── app.js
│   └── package.json
├── .env.example
└── README.md
```

## 18. Environment Variables

Create separate `.env` files for client and server as appropriate.
Example server configuration:

``` env
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=3306
DB_NAME=multivendor_platform
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password

SESSION_SECRET=replace_with_a_long_random_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_email_app_password
MAIL_FROM=your_email

RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret

UPLOAD_DIR=private_uploads
```

Use the actual port and credentials configured on the local machine.
Never commit real secrets. A Vite client variable such as
`VITE_RAZORPAY_KEY_ID` may contain a public key if needed, but must
never contain the Razorpay secret.

## 19. Development Setup

The exact commands depend on the package scripts and dependencies
selected during implementation. A typical workflow is:

1.  Install Node.js and MySQL.
2.  Create the MySQL database.
3.  Configure server and client environment variables.
4.  Install dependencies in `server` and `client`.
5.  Run Sequelize migrations.
6.  Seed only the initial Super Admin account and any essential
    reference data.
7.  Start the Express server and Vite client.
8.  Log in as Super Admin and create a test shop through the combined
    shop-and-owner form.
9.  Use the owner account setup flow, then log in as that owner and test
    the shop dashboard.
10. Test the full workflow with two shops and
    overlapping/non-overlapping wholesalers.

**Important:** Seed the initial Super Admin. Shop owner accounts should
be created by the Super Admin's Create Shop workflow, not by a separate
owner-registration seeder or public registration form.

## 20. Acceptance Checklist

### Shop creation and ownership

-   [ ] Super Admin can create a shop and owner from one form.
-   [ ] Shop and owner are created in one database transaction.
-   [ ] If owner creation fails, the shop creation is rolled back.
-   [ ] Owner receives a secure setup invitation or follows the chosen
    secure credential flow.
-   [ ] Owner is assigned the `shop_owner` role and the correct shop
    membership.
-   [ ] Owner can log in and is directed to the correct shop dashboard.
-   [ ] No separate shop-owner registration step is required.

### Isolation and permissions

-   [ ] Shop A cannot access Shop B's private data by changing an ID in
    a request.
-   [ ] Each shop can access only its authorized wholesalers.
-   [ ] Shared wholesalers keep each shop's orders, bills and stock
    separate.
-   [ ] Employees can perform only actions permitted by their roles.

### Business workflows

-   [ ] Dynamic product variants work across different categories.
-   [ ] Purchase receipts update shop inventory correctly.
-   [ ] Cart quantities can increase, decrease and remove items.
-   [ ] Orders and stock updates remain consistent under concurrent
    requests.
-   [ ] COD collection and reconciliation are tracked separately from
    delivery.
-   [ ] Razorpay payments are verified server-side and webhooks are
    handled idempotently.
-   [ ] Delivery status changes persist and appear on both shop and
    customer pages.
-   [ ] Returns, refunds and commission adjustments follow documented
    rules.
-   [ ] Attendance and salary records are shop-scoped and
    permission-protected.

### UI

-   [ ] Navigation is in the top header; there is no left sidebar.
-   [ ] Menus change by role and are responsive on mobile.
-   [ ] Protected routes and API endpoints reject unauthorized access.

## 21. Recommended Implementation Order

1.  Project setup, database connection, migrations and initial Super
    Admin seeder.
2.  Authentication, sessions and role/permission middleware.
3.  **Super Admin → Create Shop form → transactional shop and owner
    creation → secure owner setup/login → isolated shop dashboard.**
4.  Shop-scoped authorization tests and wholesaler access management.
5.  Catalog, categories, brands, dynamic attributes and products.
6.  Wholesale purchase orders, bill uploads, receipts and inventory.
7.  Employees, attendance and salary management.
8.  Customer storefront, cart, wishlist and checkout.
9.  COD and Razorpay payment workflows.
10. Retail order processing, delivery assignments and persistent
    tracking.
11. Returns, refunds, commission records, reports and audit logs.
12. Security review, automated tests and deployment preparation.

Build each milestone end-to-end, including validation, authorization,
error handling and tests. Do not mark a feature complete until the
frontend, backend and database behavior work together.
