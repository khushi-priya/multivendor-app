const bcrypt = require('bcryptjs');
const env = require('../config/env');
const { sequelize, User, Shop, ShopCategory, ShopMembership } = require('../models');
const { AppError } = require('../utils/errors');
const { audit } = require('../utils/audit');
const { sendMail } = require('../utils/mailer');
const { issueToken, setupLink, SETUP_TTL } = require('./tokens');

const EMAIL_CONFLICT = 'This owner email cannot be used. Please use a different email address.';

const makeNameKey = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');

const shopIncludes = () => [
  { model: ShopCategory, as: 'category', attributes: ['id', 'name'] },
  {
    model: ShopMembership,
    as: 'ownerMembership',
    required: false,
    include: [{ model: User, as: 'user', attributes: ['id', 'name', 'firstName', 'lastName', 'email', 'phone', 'status'] }],
  },
];

function serializeShop(s) {
  const owner = s.ownerMembership && s.ownerMembership.user;
  return {
    id: s.id,
    name: s.name,
    address: s.address,
    gstNumber: s.gstNumber,
    city: s.city,
    district: s.district,
    state: s.state,
    pinCode: s.pinCode,
    contactPhone: s.contactPhone,
    contactEmail: s.contactEmail,
    status: s.status,
    category: s.category ? { id: s.category.id, name: s.category.name } : null,
    owner: owner
      ? {
          id: owner.id,
          name: owner.name,
          firstName: owner.firstName,
          lastName: owner.lastName,
          email: owner.email,
          phone: owner.phone,
          status: owner.status,
        }
      : null,
    createdAt: s.createdAt,
  };
}

// Translate MySQL duplicate-key errors into friendly, non-sensitive API errors.
function mapUniqueError(err) {
  if (err && err.name === 'SequelizeUniqueConstraintError') {
    const msg = String((err.parent && err.parent.sqlMessage) || err.message);
    if (msg.includes('uq_users_email')) return new AppError(409, EMAIL_CONFLICT);
    if (msg.includes('uq_shops_name_key')) {
      return new AppError(409, 'A shop with this name already exists.', { 'shop.name': ['A shop with this name already exists.'] });
    }
    return new AppError(409, 'A record with these details already exists.');
  }
  return err;
}

async function sendOwnerInvite(user, shopName, rawToken) {
  const link = setupLink(rawToken);
  const text =
    `Hello ${user.name},\n\n` +
    `A shop "${shopName}" has been created for you on the platform. ` +
    `Use the link below to set your password and sign in. The link expires in 7 days and can be used once.\n\n${link}\n`;
  const html =
    `<p>Hello ${escapeHtml(user.name)},</p>` +
    `<p>A shop "<b>${escapeHtml(shopName)}</b>" has been created for you on the platform.</p>` +
    `<p><a href="${link}">Set your password and sign in</a></p>` +
    `<p>The link expires in 7 days and can be used once.</p>`;
  const r = await sendMail({ to: user.email, subject: `Set up your account for ${shopName}`, text, html });
  return r.sent ? 'sent' : 'not_sent_dev';
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Creates the shop, its owner account, the owner membership and an audit entry
 * in ONE transaction. Any failure rolls everything back.
 *
 * Account policy: if the owner email already belongs to any user, the request is
 * rejected with a generic message (no account details are disclosed).
 */
async function createShopWithOwner({ shop, owner }, actor, ip) {
  const category = await ShopCategory.findByPk(shop.categoryId);
  if (!category) {
    throw new AppError(422, 'Validation failed', { 'shop.categoryId': ['Select a valid shop category'] });
  }
  const existing = await User.unscoped().findOne({ where: { email: owner.email }, attributes: ['id'] });
  if (existing) throw new AppError(409, EMAIL_CONFLICT, { 'owner.email': [EMAIL_CONFLICT] });

  const hasInitialPassword = Boolean(owner.initialPassword);
  const passwordHash = hasInitialPassword ? await bcrypt.hash(owner.initialPassword, env.bcryptRounds) : null;

  let rawToken = null;
  let created;
  try {
    created = await sequelize.transaction(async (t) => {
      const newShop = await Shop.create(
        {
          name: shop.name,
          nameKey: makeNameKey(shop.name),
          categoryId: shop.categoryId,
          address: shop.address,
          gstNumber: shop.gstNumber || null,
          city: shop.city || null,
          district: shop.district || null,
          state: shop.state || null,
          pinCode: shop.pinCode || null,
          contactPhone: shop.contactPhone || null,
          contactEmail: shop.contactEmail || null,
          status: shop.status || 'active',
          createdBy: actor.id,
        },
        { transaction: t },
      );
      const firstName = owner.firstName || '';
      const lastName = owner.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim() || owner.name || 'Owner';
      const user = await User.create(
        {
          name: fullName,
          firstName: firstName || null,
          lastName: lastName || null,
          email: owner.email,
          phone: owner.phone,
          role: 'shop_user',
          status: hasInitialPassword ? 'active' : 'invited',
          passwordHash,
          emailVerifiedAt: hasInitialPassword ? new Date() : null,
        },
        { transaction: t },
      );
      await ShopMembership.create({ userId: user.id, shopId: newShop.id, role: 'shop_owner' }, { transaction: t });
      if (!hasInitialPassword) rawToken = await issueToken(user.id, 'account_setup', SETUP_TTL, t);
      await audit(
        {
          actorId: actor.id,
          action: 'shop.created',
          entityType: 'shop',
          entityId: newShop.id,
          shopId: newShop.id,
          meta: { name: newShop.name, ownerUserId: user.id, ownerEmail: user.email, invited: !hasInitialPassword },
          ip,
        },
        t,
      );
      return { shopId: newShop.id, user };
    });
  } catch (err) {
    throw mapUniqueError(err);
  }

  // Email is sent only after the commit; a mail failure must not undo the creation.
  let emailStatus = 'not_required';
  if (rawToken) {
    try {
      emailStatus = await sendOwnerInvite(created.user, shop.name, rawToken);
    } catch (e) {
      console.error(`[mail] Invitation email failed: ${e.message}`);
      emailStatus = 'failed';
    }
  }

  const full = await Shop.findByPk(created.shopId, { include: shopIncludes() });
  return { shop: serializeShop(full), emailStatus };
}

async function resendOwnerInvite(shopId, actor, ip) {
  const shop = await Shop.findByPk(shopId, { include: shopIncludes() });
  if (!shop) throw new AppError(404, 'Shop not found');
  const owner = shop.ownerMembership && shop.ownerMembership.user;
  if (!owner) throw new AppError(404, 'This shop has no owner');
  if (owner.status !== 'invited') throw new AppError(409, 'The owner has already set up their account');
  const rawToken = await issueToken(owner.id, 'account_setup', SETUP_TTL);
  const emailStatus = await sendOwnerInvite(owner, shop.name, rawToken);
  await audit({ actorId: actor.id, action: 'shop.owner_invite_resent', entityType: 'shop', entityId: shop.id, shopId: shop.id, ip });
  return { emailStatus };
}

module.exports = { createShopWithOwner, resendOwnerInvite, serializeShop, shopIncludes, makeNameKey, mapUniqueError, EMAIL_CONFLICT };
