// const crypto = require('crypto');
// const { AuthToken } = require('../models');
// const env = require('../config/env');

// const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

// /**
//  * Creates a single-use token. Only the SHA-256 hash is stored; the raw token is
//  * returned once so it can be emailed. Previous unused tokens of the same type are voided.
//  */
// async function issueToken(userId, type, ttlMs, transaction) {
//   await AuthToken.update(
//     { usedAt: new Date() },
//     { where: { userId, type, usedAt: null }, transaction },
//   );
//   const raw = crypto.randomBytes(32).toString('hex');
//   await AuthToken.create(
//     { userId, type, tokenHash: sha256(raw), expiresAt: new Date(Date.now() + ttlMs) },
//     { transaction },
//   );
//   return raw;
// }

// async function findValidToken(raw, transaction) {
//   if (typeof raw !== 'string' || raw.length < 32) return null;
//   const token = await AuthToken.findOne({ where: { tokenHash: sha256(raw) }, transaction });
//   if (!token || token.usedAt || token.expiresAt < new Date()) return null;
//   return token;
// }

// const setupLink = (raw) => `${env.clientOrigin}/set-password?mode=setup&token=${raw}`;
// const resetLink = (raw) => `${env.clientOrigin}/set-password?mode=reset&token=${raw}`;

// module.exports = { issueToken, findValidToken, setupLink, resetLink, SETUP_TTL: 7 * 24 * 3600 * 1000, RESET_TTL: 60 * 60 * 1000 };

const crypto = require('crypto');
const { AuthToken } = require('../models');
const env = require('../config/env');

const sha256 = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

/**
 * Creates a single-use random token.
 * Used by account setup and password reset.
 */
async function issueToken(userId, type, ttlMs, transaction) {
  await AuthToken.update(
    { usedAt: new Date() },
    {
      where: { userId, type, usedAt: null },
      transaction,
    },
  );

  const raw = crypto.randomBytes(32).toString('hex');

  await AuthToken.create(
    {
      userId,
      type,
      tokenHash: sha256(raw),
      expiresAt: new Date(Date.now() + ttlMs),
    },
    { transaction },
  );

  return raw;
}

/**
 * Creates a six-digit email verification OTP.
 * Only its SHA-256 hash is stored in the database.
 */
async function issueEmailOtp(userId) {
  await AuthToken.update(
    { usedAt: new Date() },
    {
      where: {
        userId,
        type: 'email_verification',
        usedAt: null,
      },
    },
  );

  const otp = crypto.randomInt(100000, 1000000).toString();

  await AuthToken.create({
    userId,
    type: 'email_verification',
    tokenHash: sha256(otp),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    attempts: 0,
  });

  return otp;
}

/**
 * Finds the latest valid email OTP.
 */
async function findValidEmailOtp(userId) {
  return AuthToken.findOne({
    where: {
      userId,
      type: 'email_verification',
      usedAt: null,
      expiresAt: {
        [require('sequelize').Op.gt]: new Date(),
      },
    },
    order: [['createdAt', 'DESC']],
  });
}

/**
 * Validates the OTP and counts incorrect attempts.
 */
async function verifyEmailOtp(userId, otp) {
  if (!/^\d{6}$/.test(String(otp || ''))) {
    return false;
  }

  const token = await findValidEmailOtp(userId);

  if (!token || token.attempts >= 5) {
    if (token && token.attempts >= 5) {
      await token.update({ usedAt: new Date() });
    }

    return false;
  }

  const submittedHash = sha256(String(otp));

  const matches = crypto.timingSafeEqual(
    Buffer.from(token.tokenHash, 'hex'),
    Buffer.from(submittedHash, 'hex'),
  );

  if (!matches) {
    const nextAttempts = token.attempts + 1;

    await token.update({
      attempts: nextAttempts,
      ...(nextAttempts >= 5 ? { usedAt: new Date() } : {}),
    });

    return false;
  }

  await token.update({ usedAt: new Date() });

  return true;
}

async function findValidToken(raw, transaction) {
  if (typeof raw !== 'string' || raw.length < 32) {
    return null;
  }

  const token = await AuthToken.findOne({
    where: { tokenHash: sha256(raw) },
    transaction,
  });

  if (!token || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }

  return token;
}

const setupLink = (raw) =>
  `${env.clientOrigin}/set-password?mode=setup&token=${raw}`;

const resetLink = (raw) =>
  `${env.clientOrigin}/set-password?mode=reset&token=${raw}`;

module.exports = {
  issueToken,
  findValidToken,
  issueEmailOtp,
  findValidEmailOtp,
  verifyEmailOtp,
  setupLink,
  resetLink,
  SETUP_TTL: 7 * 24 * 3600 * 1000,
  RESET_TTL: 60 * 60 * 1000,
};