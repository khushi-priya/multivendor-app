const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const env = require('./config/env');
const routes = require('./routes');
const { csrfGuard, attachUser } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();
  if (env.isProd) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(
    express.json({
      limit: '5mb',
      verify: (req, res, buf) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));
  if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'));

  // Public static uploads for product images
  app.use('/uploads', express.static(path.resolve(__dirname, '../public/uploads')));

  // Sessions live in MySQL (shared store), not process memory. The `sessions` table is auto-created.
  const store = new MySQLStore({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    createDatabaseTable: true,
    clearExpired: true,
    checkExpirationInterval: 15 * 60 * 1000,
    expiration: 8 * 3600 * 1000,
  });
  app.locals.sessionStore = store;

  app.use(
    session({
      name: 'mv.sid',
      secret: env.sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: { httpOnly: true, sameSite: 'lax', secure: env.isProd, maxAge: 8 * 3600 * 1000 },
    }),
  );

  app.get('/health', (req, res) => res.json({ ok: true }));

  // Webhooks from third-party services bypass standard CSRF guard
  app.use('/api/v1/webhooks', require('./routes/webhook.routes'));

  // Main application routes guarded by CSRF & Session Auth
  app.use('/api/v1', csrfGuard, attachUser, routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
