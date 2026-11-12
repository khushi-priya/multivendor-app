

import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth, homePath } from '../context/AuthContext.jsx';
import { Spinner } from './ui.jsx';
import { menuFor } from '../navigation/menus.js';
import { hasPermission } from '../services/permissions.js';

export default function ProtectedRoute({ roles, shopRoles, permission, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const permissions = user?.permissions || [];
  const permissionGranted = permission && hasPermission(permissions, permission);

  // Wait until authentication is checked
  if (loading) {
    return <Spinner />;
  }

  // User is not logged in
  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Check main user role
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePath(user)} replace />;
  }

  // Check shop membership role
  if (shopRoles && !shopRoles.includes(user.shop?.role)) {
    return <Navigate to={homePath(user)} replace />;
  }

  if (
    permission &&
    user.shop?.role !== 'shop_owner' &&
    !permissionGranted
  ) {
    const firstAllowedPath = (items) => {
      for (const item of items) {
        if (item.to) return item.to;
        const nestedPath = item.children && firstAllowedPath(item.children);
        if (nestedPath) return nestedPath;
      }
      return null;
    };
    const safePath = firstAllowedPath(menuFor(user));

    return (
      <main className="mx-auto max-w-xl p-6">
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-lg font-semibold text-amber-900">Access denied</h1>
          <p className="mt-2 text-sm text-amber-800">
            Your account does not have permission to access this page.
          </p>
          {safePath ? (
            <Link
              to={safePath}
              className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline"
            >
              Open an available module
            </Link>
          ) : (
            <p className="mt-4 text-sm text-amber-800">
              No modules are currently assigned. Contact your shop owner.
            </p>
          )}
        </section>
      </main>
    );
  }

  return children || <Outlet />;
}
