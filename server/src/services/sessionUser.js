const { Shop, ShopMembership, ShopRole } = require('../models');
const { effectivePermissionsForMembership } = require('./permissions');
const { AppError } = require('../utils/errors');

// Safe, minimal user payload returned to the client. Never includes the password hash.
async function sessionUser(user, membership = null) {
  const out = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    shop: null,
  };
  if (user.role === 'shop_user') {
    let activeMembership = membership;
    if (!activeMembership) {
      const activeMemberships = await ShopMembership.findAll({
        where: { userId: user.id, status: 'active' },
        include: [{ model: Shop, as: 'shop', attributes: ['id', 'name', 'status'] }],
        limit: 2,
      });
      if (activeMemberships.length !== 1) {
        throw new AppError(401, 'An active shop membership is required.');
      }
      [activeMembership] = activeMemberships;
    }
    if (
      !activeMembership.shop ||
      activeMembership.shop.status !== 'active'
    ) {
      throw new AppError(403, 'This shop is currently suspended.');
    }

    const customRole = activeMembership.role === 'shop_owner'
        ? null
        : await ShopRole.findOne({
            where: {
              shopId: activeMembership.shopId,
              code: activeMembership.role,
              isActive: true,
            },
          });
    out.membershipId = activeMembership.id;
    out.shopId = activeMembership.shopId;
    out.employeeRole = activeMembership.role;
    out.shop = {
      id: activeMembership.shop.id,
      name: activeMembership.shop.name,
      status: activeMembership.shop.status,
      role: activeMembership.role,
    };
    out.permissions = effectivePermissionsForMembership(
      activeMembership,
      customRole,
    );
  }
  return out;
}

module.exports = { sessionUser };
