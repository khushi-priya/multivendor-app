// Configuration for sequelize-cli (migrations). Uses the same env vars as the app.
const env = require('./env');

const base = {
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  host: env.db.host,
  port: env.db.port,
  dialect: 'mysql',
};

module.exports = { development: base, test: base, production: base };
