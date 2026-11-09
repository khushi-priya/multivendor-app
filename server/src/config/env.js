require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';
const isTest = nodeEnv === 'test';

const sessionSecret = process.env.SESSION_SECRET || (isProd ? '' : 'dev-only-secret-change-me-dev-only-secret');
if (sessionSecret.length < 32) {
  throw new Error('SESSION_SECRET must be set to a random string of at least 32 characters.');
}

module.exports = {
  nodeEnv,
  isProd,
  isTest,
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  sessionSecret,
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || (isTest ? 4 : 12)),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    name: isTest ? process.env.DB_NAME_TEST || 'multivendor_platform_test' : process.env.DB_NAME || 'multivendor_platform',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@localhost',
  },
};
