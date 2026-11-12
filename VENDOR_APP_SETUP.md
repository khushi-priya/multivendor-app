# Vendor App --- Local Setup Guide

This guide explains how to run the existing multivendor application on
another Windows or macOS/Linux machine.

> **Assumed project layout:** `client/` contains the React + Vite
> frontend and `server/` contains the Node + Express backend. If your
> repository uses different folder names, use the corresponding folders.

## 1. Prerequisites

Install Git, Node.js LTS with npm, and MySQL Server 8.x (or the version
used by the project). A code editor such as VS Code is recommended.

Verify Node and npm:

``` bash
node --version
npm --version
```

Make sure the MySQL service is running.

## 2. Get the project code

If the project is in Git:

``` bash
git clone YOUR_REPOSITORY_URL
cd vendor-app
```

If you received a ZIP, extract it and open a terminal in the extracted
project folder.

## 3. Create the MySQL database

Run this in MySQL:

``` sql
CREATE DATABASE vendor_app
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

The previously configured machine used MySQL port `3307`. A fresh MySQL
installation often uses `3306`. Set `DB_PORT` to the actual port on the
new machine.

Use that machine's own database credentials. A dedicated database user
is preferable to using `root`.

## 4. Backend environment

Create `server/.env`:

``` dotenv
NODE_ENV=development
PORT=5000
CLIENT_ORIGIN=http://localhost:5173

DB_HOST=localhost
DB_PORT=3307
DB_NAME=vendor_app
DB_USER=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD

SESSION_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET

SUPER_ADMIN_NAME=Super Admin
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=CHANGE_THIS_PASSWORD

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=YOUR_EMAIL
SMTP_PASSWORD=YOUR_GMAIL_APP_PASSWORD
MAIL_FROM=YOUR_EMAIL

RAZORPAY_KEY_ID=YOUR_RAZORPAY_TEST_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_RAZORPAY_TEST_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET=YOUR_RAZORPAY_TEST_WEBHOOK_SECRET
```

**Important:** This is a template. Confirm exact variable names in
`server/src/config/`, the database/session configuration and
email/payment services. Existing code may use names such as
`DB_USERNAME`, `SMTP_PASS` or `EMAIL_FROM`. Do not rename code or
variables blindly.

-   Change `DB_PORT` to the port MySQL actually uses on this machine.
-   Generate a long, random `SESSION_SECRET`; do not reuse a production
    secret.
-   The Super Admin variables are used by the known initial Super Admin
    seeder.
-   SMTP and Razorpay values are only needed when those integrations are
    configured. Use Razorpay test credentials locally.
-   Do not commit populated `.env` files.

## 5. Frontend environment

Create `client/.env`:

``` dotenv
VITE_API_URL=/api/v1
VITE_RAZORPAY_KEY_ID=YOUR_RAZORPAY_TEST_KEY_ID
```

This assumes the existing Vite proxy forwards `/api` to
`http://localhost:5000`. Check `client/vite.config.js` and
`client/src/services/api.js`:

-   If `api.js` already uses `/api/v1` directly, the `VITE_API_URL`
    variable may not be needed.
-   If `api.js` reads `import.meta.env.VITE_API_URL`, use the format
    expected by that file.
-   Only the Razorpay **public key ID** may be exposed to the frontend.
    Never put the Razorpay secret, webhook secret, database password or
    session secret in `client/.env`.

Vite exposes `VITE_` variables to browser code, so treat every such
value as public.

## 6. Install dependencies

From the project root, install backend dependencies:

``` bash
cd server
npm install
```

Then install frontend dependencies:

``` bash
cd ../client
npm install
```

If the repository has a valid `package-lock.json`, `npm ci` can be used
instead for a reproducible install. Keep the existing lockfiles.

## 7. Run database migrations

Inspect `server/package.json` and `server/src/migrations/` to identify
the migration command provided by this repository. Run that command
before starting the application.

Do not guess a migration command if it is not present in `package.json`.
The project uses Sequelize migrations; do not use
`sequelize.sync({ alter: true })` as a substitute.

## 8. Seed the initial Super Admin

The known seeder command is:

``` bash
cd server
npx sequelize-cli db:seed:all --config src/config/sequelize-cli.cjs --seeders-path src/seeders
```

Run it after MySQL is running, the database exists, and the backend
environment variables are configured.

The seeder requires `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL` and
`SUPER_ADMIN_PASSWORD`. Check whether seeders are safe to rerun before
executing them on a database that already contains data.

Shop owner accounts are created through the Super Admin's Create Shop
workflow; do not create duplicate owner accounts manually unless the
project explicitly requires it.

## 9. Start the backend

In one terminal:

``` bash
cd server
npm run dev
```

The previously configured backend ran at `http://localhost:5000`.

Test the health endpoint in PowerShell:

``` powershell
Invoke-WebRequest http://localhost:5000/api/v1/health
```

Or open `http://localhost:5000/api/v1/health` in a browser.

If `npm run dev` is not defined, inspect the `scripts` section of
`server/package.json` and use the script that actually exists.

## 10. Start the frontend

Open another terminal:

``` bash
cd client
npm run dev
```

The previously configured Vite frontend ran at `http://localhost:5173`.
Open the URL printed by Vite.

If `npm run dev` is not defined, inspect `client/package.json`.

## 11. First-run checklist

-   [ ] MySQL service is running.
-   [ ] Database `vendor_app` exists.
-   [ ] Backend `.env` uses the correct local MySQL host, port, database
    and credentials.
-   [ ] Backend and frontend dependencies are installed.
-   [ ] Database migrations completed successfully.
-   [ ] Initial Super Admin seeder completed successfully.
-   [ ] Backend starts without session-secret or database errors.
-   [ ] `GET /api/v1/health` responds successfully.
-   [ ] Frontend loads in the browser.
-   [ ] Frontend API requests reach the backend.
-   [ ] Super Admin can log in.
-   [ ] Super Admin can create a shop and its owner.
-   [ ] Shop owner can log in and only see their own shop's data.
-   [ ] A second shop can be created and tenant isolation is verified.

## 12. Common problems

### Database connection refused

Check that MySQL is running and that host, port, database name, username
and password match the local installation.

### `SESSION_SECRET` missing

Add a strong `SESSION_SECRET` to `server/.env` and restart the backend.

### Port 5000 already in use

Stop the process using port `5000`, or choose another backend port and
update the Vite proxy and API configuration to match.

### CORS or session-cookie errors

Make sure the browser's frontend origin matches `CLIENT_ORIGIN` exactly,
including scheme and port. Check the existing CORS, credentials, cookie
and CSRF configuration. Restart the backend after changing environment
values.

### Frontend `.env` changes are not applied

Stop and restart the Vite development server after editing `.env`.

### Migration or seeder errors

Read the complete terminal error and verify database connection,
migration state and seeder requirements. Do not work around schema
errors by enabling Sequelize `alter` synchronization.

## 13. Keep secrets out of Git

Add these patterns to the repository `.gitignore`:

``` gitignore
.env
.env.*
!.env.example
```

Commit safe templates such as `.env.example`, not populated `.env`
files.

Before pushing, check:

``` bash
git status
```

If a real password or API secret was committed, rotate that credential.
Removing it from the latest working tree alone does not make it safe
again.

## 14. Development URLs

  Service                URL
  ---------------------- ---------------------------------------
  Frontend               `http://localhost:5173`
  Backend                `http://localhost:5000`
  Backend health check   `http://localhost:5000/api/v1/health`

These are the previously used development ports. A new machine may use
another MySQL port or another available application port. Keep the
`.env`, Vite proxy and application configuration consistent.
