"use strict";

const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  {
    key: "orders",
    label: "Order Management",
    actions: ["view", "create", "update", "delete", "approve", "assign"],
  },
  {
    key: "products",
    label: "Product Management",
    actions: ["view", "create", "update", "delete"],
  },
  {
    key: "categories",
    label: "Category Management",
    actions: ["view", "create", "update", "delete", "approve"],
  },
  {
    key: "inventory",
    label: "Inventory / Stock",
    actions: ["view", "create", "update", "delete"],
  },
  {
    key: "customers",
    label: "Customer Management",
    actions: ["view", "create", "update", "delete"],
  },
  {
    key: "employees",
    label: "Employee Management",
    actions: ["view", "create", "update", "delete", "manage", "assign"],
  },
  {
    key: "wholesalers",
    label: "Wholesaler Management",
    actions: ["view", "create", "update", "delete", "manage"],
  },
  {
    key: "payments",
    label: "Payments",
    actions: ["view", "collect", "reconcile", "refund"],
  },
  {
    key: "delivery",
    label: "Delivery Management",
    actions: ["view", "update", "assign"],
  },
  { key: "reports", label: "Reports", actions: ["view"] },
  {
    key: "coupons",
    label: "Coupon Management",
    actions: ["view", "create", "update", "delete"],
  },
  { key: "shop_settings", label: "Shop Settings", actions: ["manage"] },
  {
    key: "commission_settings",
    label: "Commission Settings",
    actions: ["manage"],
  },
];

const PERMISSION_KEYS = new Set(
  PERMISSION_MODULES.flatMap((module) =>
    module.actions.map((action) => `${module.key}.${action}`),
  ),
);

const VIEW_GRANTED_ACTIONS = {
  orders: ["create", "update", "delete"],
  products: ["create", "update", "delete"],
  categories: ["create", "update", "delete"],
  inventory: ["create", "update", "delete"],
  customers: ["create", "update", "delete"],
  wholesalers: ["create", "update", "delete", "manage"],
  delivery: ["update"],
  coupons: ["create", "update", "delete"],
};

const DEFAULT_ROLE_PERMISSIONS = {
  shop_manager: [
    "dashboard.view",
    "orders.view",
    "orders.create",
    "orders.update",
    "products.view",
    "products.update",
    "categories.view",
    "inventory.view",
    "inventory.create",
    "inventory.update",
    "customers.view",
    "reports.view",
  ],
  sales_associate: [
    "dashboard.view",
    "orders.view",
    "orders.create",
    "products.view",
    "categories.view",
    "inventory.view",
    "customers.view",
    "customers.create",
    "customers.update",
  ],
  delivery_associate: [
    "dashboard.view",
    "delivery.view",
    "delivery.update",
  ],
  cashier: [
    "dashboard.view",
    "orders.view",
    "orders.create",
    "payments.view",
    "payments.collect",
  ],
  support: [
    "dashboard.view",
    "customers.view",
    "customers.update",
  ],
};

const normalizePermissions = (permissions) => {
  if (!Array.isArray(permissions)) return [];
  return [...new Set(permissions.filter((permission) =>
    typeof permission === "string" && PERMISSION_KEYS.has(permission),
  ))];
};

function defaultPermissionsForRole(role, customRole = null) {
  if (role === "shop_owner") return [...PERMISSION_KEYS];
  if (customRole) {
    return customRole.permissions == null
      ? ["dashboard.view"]
      : normalizePermissions(customRole.permissions);
  }
  return [...(DEFAULT_ROLE_PERMISSIONS[role] || ["dashboard.view"])];
}

function effectivePermissionsForMembership(membership, customRole = null) {
  if (!membership || membership.status !== "active") return [];
  if (membership.role === "shop_owner") return [...PERMISSION_KEYS];
  if (membership.permissions !== null && membership.permissions !== undefined) {
    return normalizePermissions(membership.permissions);
  }
  if (customRole) return normalizePermissions(customRole.permissions);
  if (!DEFAULT_ROLE_PERMISSIONS[membership.role]) return [];
  return defaultPermissionsForRole(membership.role, customRole);
}

function permissionGranted(permissions, requiredPermission) {
  if (!Array.isArray(permissions) || typeof requiredPermission !== "string") {
    return false;
  }
  if (permissions.includes(requiredPermission)) return true;
  const [module, action] = requiredPermission.split(".");
  if (permissions.includes(`${module}.manage`)) return true;
  return (
    permissions.includes(`${module}.view`) &&
    (VIEW_GRANTED_ACTIONS[module] || []).includes(action)
  );
}

function actionForMethod(method) {
  if (method === "GET" || method === "HEAD") return "view";
  if (method === "POST") return "create";
  if (method === "DELETE") return "delete";
  return "update";
}

function requiredPermissionForRequest(path, method, body = {}) {
  const route = String(path || "").replace(/\/+$/, "") || "/";
  const verb = String(method || "GET").toUpperCase();
  const action = actionForMethod(verb);

  if (route === "/dashboard") return "dashboard.view";
  if (route === "/owner-dashboard") return null;

  if (route.startsWith("/employee-roles")) return "employees.manage";
  if (route.startsWith("/employees")) {
    if (verb === "GET") return "employees.view";
    if (verb === "POST") {
      const required = ["employees.create", "employees.assign"];
      if (body.permissions !== undefined) required.push("employees.manage");
      return required;
    }
    if (verb === "PATCH") {
      const required = [];
      if (body.status !== undefined) required.push("employees.manage");
      if (body.role !== undefined) required.push("employees.assign");
      if (body.permissions !== undefined) required.push("employees.manage");
      if (required.length) return [...new Set(required)];
      return "employees.update";
    }
    return "employees.manage";
  }
  if (
    route.startsWith("/attendance") ||
    route.startsWith("/salary") ||
    route.startsWith("/payroll")
  ) {
    return "employees.manage";
  }

  if (
    route.startsWith("/catalog/categories") ||
    route.startsWith("/catalog/subcategories")
  ) {
    return `categories.${action}`;
  }
  if (route.startsWith("/catalog/")) return `products.${action}`;
  if (route.startsWith("/inventory")) return `inventory.${action}`;
  if (route.startsWith("/customers")) return `customers.${action}`;
  if (
    route.startsWith("/wholesalers") ||
    route.startsWith("/wholesale-orders") ||
    route.startsWith("/bills") ||
    route.startsWith("/wholesale-payments")
  ) {
    return verb === "GET" ? "wholesalers.view" : `wholesalers.${action}`;
  }
  if (route.startsWith("/orders")) {
    if (route.includes("/assign-delivery") || route.includes("/delivery-associates")) {
      return "orders.assign";
    }
    return `orders.${action}`;
  }
  if (route.startsWith("/returns")) {
    if (verb === "GET") return "orders.view";
    return ["refund_processing", "refunded"].includes(body.status)
      ? "payments.refund"
      : "orders.approve";
  }
  if (route.startsWith("/refunds")) {
    return verb === "GET" ? "orders.view" : "payments.refund";
  }
  if (route.startsWith("/payments")) {
    if (route.includes("/reconcile")) return "payments.reconcile";
    if (verb === "POST") return "payments.collect";
    return `payments.${action}`;
  }
  if (route.startsWith("/delivery")) {
    return verb === "GET" ? "delivery.view" : "delivery.update";
  }
  if (route.startsWith("/reports")) return "reports.view";
  if (route.startsWith("/settings")) return "shop_settings.manage";

  return null;
}

module.exports = {
  PERMISSION_MODULES,
  PERMISSION_KEYS,
  DEFAULT_ROLE_PERMISSIONS,
  normalizePermissions,
  defaultPermissionsForRole,
  effectivePermissionsForMembership,
  permissionGranted,
  requiredPermissionForRequest,
};
