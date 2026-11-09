const { User, Shop, ShopMembership, ShopRole } = require('../models');
const { AppError, wrap } = require('../utils/errors');
const {
  effectivePermissionsForMembership,
  permissionGranted,
  requiredPermissionForRequest,
} = require('../services/permissions');

// Basic CSRF defence: cookies are SameSite=Lax, CORS is locked to CLIENT_ORIGIN, and every
// state-changing request must carry a custom header that cross-site forms cannot set.
function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'XMLHttpRequest') {
    return next(new AppError(403, 'Missing request header'));
  }
  next();
}

// Loads the user from the session on every request (so suspensions take effect immediately).
const attachUser = wrap(async (req, res, next) => {
  if (!req.session || !req.session.userId) return next();
  const user = await User.findByPk(req.session.userId);
  if (!user || user.status !== 'active') {
    await new Promise((resolve) => req.session.destroy(resolve));
    return next();
  }

  if (user.role === 'shop_user') {
    const memberships = await ShopMembership.findAll({
      where: { userId: user.id, status: 'active' },
      include: [{ model: Shop, as: 'shop' }],
      limit: 2,
    });
    if (
      memberships.length !== 1 ||
      !memberships[0].shop
    ) {
      await new Promise((resolve, reject) =>
        req.session.destroy((error) => (error ? reject(error) : resolve())),
      );
      return next();
    }
    req.shopMembership = memberships[0];
    req.shop = memberships[0].shop;
  }

  req.user = user;
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) return next(new AppError(401, 'Authentication required'));
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'super_admin') return next(new AppError(403, 'Forbidden'));
  next();
}

/**
 * Resolves the caller's shop from THEIR membership (never from client input) and
 * optionally restricts by shop-level role. Sets req.shop and req.membership.
 */
const requireShopAccess = (allowedRoles) =>
  wrap(async (req, res, next) => {
    if (!req.user || req.user.role !== 'shop_user') throw new AppError(403, 'Forbidden');
    const membership =
      req.shopMembership ||
      (await ShopMembership.findOne({
        where: {
          userId: req.user.id,
          status: 'active',
        },
        include: [{ model: Shop, as: 'shop' }],
      }));
    if (!membership || !membership.shop) throw new AppError(403, 'No shop is assigned to this account');
    if (membership.shop.status !== 'active') throw new AppError(403, 'This shop is currently suspended');

    let customRole = null;
    if (membership.role !== 'shop_owner') {
      customRole = await ShopRole.findOne({
        where: {
          shopId: membership.shopId,
          code: membership.role,
          isActive: true,
        },
      });
    }

    const permissions = effectivePermissionsForMembership(membership, customRole);
    if (membership.role !== 'shop_owner') {
      const requiredPermission = requiredPermissionForRequest(
        req.path,
        req.method,
        req.body,
      );
      const requiredPermissions = Array.isArray(requiredPermission)
        ? requiredPermission
        : requiredPermission
          ? [requiredPermission]
          : [];
      if (
        requiredPermissions.length === 0 ||
        !requiredPermissions.every((permission) =>
          permissionGranted(permissions, permission),
        )
      ) {
        throw new AppError(403, 'You do not have permission to access this module.');
      }
    } else if (allowedRoles && !allowedRoles.includes(membership.role)) {
      throw new AppError(403, 'Forbidden');
    }

    req.shop = membership.shop;
    req.membership = membership;
    req.permissions = permissions;
    next();
  });

module.exports = { csrfGuard, attachUser, requireAuth, requireSuperAdmin, requireShopAccess };
