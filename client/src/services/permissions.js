const VIEW_GRANTED_ACTIONS = {
  orders: ['create', 'update', 'delete'],
  products: ['create', 'update', 'delete'],
  categories: ['create', 'update', 'delete'],
  inventory: ['create', 'update', 'delete'],
  customers: ['create', 'update', 'delete'],
  wholesalers: ['create', 'update', 'delete', 'manage'],
  delivery: ['update'],
  coupons: ['create', 'update', 'delete'],
};

export function hasPermission(permissions, requiredPermission) {
  if (!Array.isArray(permissions) || typeof requiredPermission !== 'string') {
    return false;
  }
  if (permissions.includes(requiredPermission)) return true;

  const [module, action] = requiredPermission.split('.');
  if (permissions.includes(`${module}.manage`)) return true;
  return (
    permissions.includes(`${module}.view`) &&
    (VIEW_GRANTED_ACTIONS[module] || []).includes(action)
  );
}
