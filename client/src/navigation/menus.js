

// Role-based sidebar navigation.
// Only menus for the signed-in role are returned.
import { hasPermission } from '../services/permissions.js';

// const superAdmin = [
//   { label: 'Dashboard', to: '/admin', end: true },
//   {
//     label: 'Shops',
//     children: [
//       { label: 'Shop Categories', to: '/admin/shop-categories' },

//       { label: 'All Shops', to: '/admin/shops' },
//       { label: 'Manage Employees', to: '/admin/employees' },
//       { label: 'Orders', to: '/admin/orders' },
      

//       { label: 'Reports', to: '/admin/reports' },
//       { label: 'Wholesalers', to: '/admin/wholesalers' },
//     ],
//   },
//   {
//     label: 'Catalog',
//     children: [
//       { label: 'Manage Categories', to: '/admin/catalog/categories' },
//       { label: 'Manage Subcategories', to: '/admin/catalog/subcategories' },
//       { label: 'Manage Brands', to: '/admin/catalog/brands' },
//       { label: 'Manage Variants', to: '/admin/catalog/attributes' },
//       { label: 'Manage Products', to: '/admin/catalog/products' },
//     ],
//   },
//   // { label: 'Wholesalers', to: '/admin/wholesalers' },
//   //{ label: 'Shop–Wholesaler Access', to: '/admin/access' },
//   { label: 'Audit Logs', to: '/admin/audit-logs' },
// ];

const superAdmin = [
  { label: 'Dashboard', to: '/admin', end: true },

  // Super Admin can browse the customer-facing storefront
  { label: 'Customer Store', to: '/customer', end: true },

  {
    label: 'Shops',
    children: [
      { label: 'Shop Categories', to: '/admin/shop-categories' },
      { label: 'All Shops', to: '/admin/shops' },
      { label: 'Manage Employees', to: '/admin/employees' },
      { label: 'Orders', to: '/admin/orders' },
      { label: 'Reports', to: '/admin/reports' },
      { label: 'Wholesalers', to: '/admin/wholesalers' },
    ],
  },

  {
    label: 'Catalog',
    children: [
      { label: 'Manage Categories', to: '/admin/catalog/categories' },
      { label: 'Manage Subcategories', to: '/admin/catalog/subcategories' },
      { label: 'Manage Brands', to: '/admin/catalog/brands' },
      { label: 'Manage Variants', to: '/admin/catalog/attributes' },
      { label: 'Manage Products', to: '/admin/catalog/products' },
    ],
  },

  { label: 'Audit Logs', to: '/admin/audit-logs' },
];

// const wholesalerMenu = {
//   label: 'Wholesaler Dashboard',
//   children: [
//     {
//       label: 'Manage Wholesaler Dashboard',
//       to: '/shop/wholesalers',
//     },
//   ],
// };

const wholesalerMenu = {
  label: 'Wholesaler Dashboard',
  permission: 'wholesalers.view',
  children: [
    {
      label: 'Manage Wholesalers',
      to: '/shop/wholesalers',
      end: true,
    },
  ],
};

// SHOP OWNER
const shopOwner = [
  { label: 'Dashboard', to: '/shop/dashboard', end: true, permission: 'dashboard.view' },

  wholesalerMenu,

  {
    label: 'Catalog',
    children: [
      { label: 'Categories', to: '/shop/catalog/categories', permission: 'categories.view' },
      { label: 'Subcategories', to: '/shop/catalog/subcategories', permission: 'categories.view' },
      { label: 'Brands', to: '/shop/catalog/brands', permission: 'products.view' },
      { label: 'Variants / Attributes', to: '/shop/catalog/attributes', permission: 'products.view' },
      { label: 'Products', to: '/shop/catalog/products', permission: 'products.view' },
    ],
  },

  {
    label: 'Employees',
    children: [
      { label: 'Employee Management', to: '/shop/employees', permission: 'employees.view' },
      { label: 'Attendance', to: '/shop/attendance', permission: 'employees.manage' },
      { label: 'Salary', to: '/shop/salary', permission: 'employees.manage' },
      { label: 'Payroll', to: '/shop/payroll', permission: 'employees.manage' },
    ],
  },
  { label: 'Roles & Permissions', to: '/shop/roles-permissions' },

  { label: 'Orders', to: '/shop/orders', permission: 'orders.view' },
  // { label: 'Coupons', to: '/shop/coupons' },
  { label: 'Returns & Refunds', to: '/shop/returns', permission: 'returns.view' },

  { label: 'Payments', to: '/shop/payments', permission: 'payments.view' },

  // Correct Shop Owner delivery management URL
  { label: 'Delivery Management', to: '/shop/delivery-management', permission: 'delivery.view' },

  { label: 'Reports', to: '/shop/reports', permission: 'reports.view' },
  { label: 'Settings', to: '/shop/settings', permission: 'shop_settings.manage' },
  { label: 'Inventory', to: '/shop/inventory', permission: 'inventory.view' },
  { label: 'Coupons', to: '/shop/coupons' },
  { label: 'Customer Store', to: '/customer' },
];

function filterShopMenu(items, permissions) {
  return items.reduce((visible, item) => {
    if (
      item.permission &&
      !hasPermission(permissions, item.permission)
    ) return visible;
    if (item.children) {
      const children = filterShopMenu(item.children, permissions);
      if (children.length) visible.push({ ...item, children });
      return visible;
    }
    visible.push(item);
    return visible;
  }, []);
}

// SHOP MANAGER
const shopManager = [
  { label: 'Dashboard', to: '/shop', end: true },

  wholesalerMenu,

  {
    label: 'Catalog',
    children: [
      { label: 'Categories', to: '/shop/catalog/categories' },
      { label: 'Subcategories', to: '/shop/catalog/subcategories' },
      { label: 'Brands', to: '/shop/catalog/brands' },
      { label: 'Variants / Attributes', to: '/shop/catalog/attributes' },
      { label: 'Products', to: '/shop/catalog/products' },
    ],
  },

  { label: 'Attendance', to: '/shop/attendance' },
  { label: 'Orders', to: '/shop/orders' },
  { label: 'Payments', to: '/shop/payments' },

  // Correct Shop Manager delivery management URL
  { label: 'Delivery Management', to: '/shop/delivery-management' },

  { label: 'Reports', to: '/shop/reports' },
];

// DELIVERY ASSOCIATE
const deliveryAssociate = [
  { label: 'Dashboard', to: '/shop/delivery', end: true },
  { label: 'My Delivery Assignments', to: '/shop/delivery' },
];

// CASHIER
const cashier = [
  { label: 'Dashboard', to: '/shop', end: true },
  { label: 'Orders', to: '/shop/orders' },
  { label: 'Payments', to: '/shop/payments' },
];

// SALES ASSOCIATE
const salesAssociate = [
  { label: 'Dashboard', to: '/shop', end: true },
  { label: 'Products', to: '/shop/catalog/products' },
];

// CUSTOMER
const customer = [
  { label: 'Categories', to: '/categories' },
  { label: 'Products', to: '/products' },
  { label: 'Wishlist', to: '/wishlist' },
  { label: 'My Orders', to: '/my-orders' },
  { label: 'My Payments', to: '/my-payments' },
  { label: 'Profile', to: '/profile' },
];

// GUEST
const guest = [
  { label: 'Home', to: '/customer' },
  { label: 'Categories', to: '/categories' },
  { label: 'Products', to: '/products' },
  { label: 'Sign In', to: '/login' },
];

// SELECT MENU BY USER ROLE
export function menuFor(user) {
  if (!user) return guest;

  if (user.role === 'super_admin') {
    return superAdmin;
  }

  if (user.role === 'shop_user') {
    const role = user.shop?.role;

    if (role === 'shop_owner') return shopOwner;
    const employeeMenu = shopOwner.filter(
      (item) =>
        item.to !== '/customer' &&
        item.to !== '/shop/roles-permissions' &&
        item.to !== '',
    ).map((item) =>
      role === 'delivery_associate' && item.to === '/shop/dashboard'
        ? { ...item, to: '/shop/delivery' }
        : item,
    );
    if (
      role !== 'delivery_associate' &&
      (user.permissions || []).includes('delivery.view')
    ) {
      employeeMenu.push({
        label: 'My Delivery Assignments',
        to: '/shop/delivery',
        permission: 'delivery.view',
      });
    }
    return filterShopMenu(employeeMenu, user.permissions || []);
  }

  if (user.role === 'customer') {
    return customer;
  }

  return guest;
}

// DISPLAY ROLE LABEL
export const roleLabel = (user) => {
  if (!user) return 'Guest';

  if (user.role === 'super_admin') {
    return 'Super Admin';
  }

  if (user.role === 'shop_user') {
    const role = user.shop?.role;

    return (role || 'shop user')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  return 'Customer';
};
