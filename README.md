# Multivendor Wholesale & Retail Platform

React + Vite + Tailwind client, Node/Express API, MySQL via Sequelize. The full specification is in [`docs/SPEC.md`](docs/SPEC.md).

## What is implemented (spec milestones 1–4)

| Area | Status |
| --- | --- |
| Project setup, Sequelize migration, Super Admin seeder | Done |
| Secure sessions (MySQL-backed store), bcrypt, login rate limit, CSRF header guard | Done |
| Forgot / reset password, owner account-setup tokens (hashed, single use, expiring) | Done |
| **Create Shop + owner in ONE transaction**, invitation email, resend invite | Done |
| Shop list/search, suspend/activate (takes effect immediately), shop categories | Done |
| Wholesalers + Shop–Wholesaler access (checked on every shop request) | Done |
| Audit logs | Done |
| Role-based **top navigation only** (dropdowns, hamburger on small screens) | Done |
| Shop owner dashboard + "Manage Wholesalers" (authorized wholesalers only) | Done |
| Integration tests: transaction rollback, tenant isolation, role checks, invite flow | Done (11 tests) |

**Not built yet** (menu items route to a "Not built yet" page): catalog & dynamic variants, purchase orders / bills / receipts / inventory, employees / attendance / payroll, customer storefront, cart & checkout, COD + Razorpay, delivery workflow, returns / refunds, commission, reports. Build them in the order given in spec section 21; the auth, tenant scoping (`requireShopAccess`), validation, audit and transaction patterns used here are meant to be reused.

## Run it

Requirements: Node 20+, MySQL 8 (or MariaDB 10.6+).

```bash
# 1. database
mysql -u root -p -e "CREATE DATABASE multivendor_platform CHARACTER SET utf8mb4;"

# 2. server
cd server
cp .env.example .env        # then edit DB_*, SESSION_SECRET, SUPER_ADMIN_*
npm install
npm run migrate
npm run seed                # creates the Super Admin + default shop categories
npm run dev                 # http://localhost:4000

# 3. client (new terminal)
cd client
npm install
npm run dev                 # http://localhost:5173  (proxies /api to :4000)
```

Sign in at http://localhost:5173 with the `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `server/.env`.

### Try the main workflow
1. **Shops → Create Shop**: fill shop + owner details in the single form and submit.
2. With no SMTP configured (`SMTP_USER` empty), the owner's setup link is **printed in the server console**. Open it, set a password.
3. Sign in as the owner: you land on that shop's dashboard.
4. As Super Admin: **Wholesalers** → add some, then **Shop–Wholesaler Access** → grant per shop. The owner's *Manage Wholesalers* page shows only their own grants.

For real emails set `SMTP_*` and `MAIL_FROM` (Gmail needs an app password).

### Tests
```bash
cd server
# create DB_NAME_TEST, then:
NODE_ENV=test npm run migrate
npm test
```

## Key design decisions
- **Account policy:** if the owner email already exists, creation is rejected with a generic message (no account details disclosed).
- **Owner credentials:** invitation flow by default; an optional initial password is bcrypt-hashed and never returned.
- **Duplicate protection:** unique indexes on user email and normalized shop name (race-safe), plus a submit lock in the form.
- **Tenant scope** comes only from the caller's `shop_memberships` row; a client-sent `shopId` is ignored. Unauthorized wholesaler IDs return 404.
- **Migrations, not `sync()`**: schema lives in `server/src/migrations`. The `sessions` table is created by `express-mysql-session`.
- **Production:** set `NODE_ENV=production`, serve over HTTPS (cookies become `Secure`), use a strong `SESSION_SECRET`, and build the client with `npm run build`.
