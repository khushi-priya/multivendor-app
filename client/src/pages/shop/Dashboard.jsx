

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { hasPermission } from '../../services/permissions.js';
import {
  Alert,
  Card,
  PageHeader,
  Spinner,
} from '../../components/ui.jsx';

const money = (value) =>
  value == null
    ? '—'
    : `₹${Number(value).toLocaleString('en-IN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '—';

const statusLabel = (status = 'unknown') =>
  status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

function StatCard({ title, value, description, icon }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {value ?? '—'}
          </p>
          {description && (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </Card>
  );
}

function QuickAction({ title, description, to, icon }) {
  return (
    <Link
      to={to}
      className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}

export default function ShopDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get('/shop/dashboard')
      .then((response) => {
        if (active) setData(response);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load dashboard');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) return <Spinner label="Loading shop dashboard…" />;

  const {
    shop = {},
    stats = {},
    salesOverview = {},
    recentOrders = [],
    lowStockAlerts = [],
    returnOverview = {},
    partialErrors = [],
  } = data || {};
  const countOrUnavailable = (value) =>
    value ?? (error || partialErrors.length ? '—' : 0);
  const can = (permission) =>
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, permission);
  const quickActions = [
    can('orders.view') && {
      title: 'Manage Orders',
      description: 'View and manage customer orders',
      to: '/shop/orders',
      icon: '📋',
    },
    can('products.view') && {
      title: 'Manage Products',
      description: 'View your shop product catalogue',
      to: '/shop/catalog/products',
      icon: '🛍️',
    },
    can('employees.view') && {
      title: 'Manage Employees',
      description: 'Manage your shop employees',
      to: '/shop/employees',
      icon: '👨‍💼',
    },
    can('inventory.view') && {
      title: 'Manage Inventory',
      description: 'Check product stock and inventory',
      to: '/shop/inventory',
      icon: '📊',
    },
    can('wholesalers.view') && {
      title: 'Manage Wholesalers',
      description: 'Wholesale orders, bills and payments',
      to: '/shop/wholesalers',
      icon: '🏭',
    },
    can('delivery.view') && {
      title: 'Delivery Management',
      description: 'Monitor assigned deliveries',
      to: '/shop/delivery-management',
      icon: '🚛',
    },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      {(error || partialErrors.length > 0) && (
        <Alert>
          {error || 'Some dashboard information could not be loaded.'}
          {' Dashboard figures may be incomplete.'}
        </Alert>
      )}
      <PageHeader
        title={shop.name || 'Shop Dashboard'}
        subtitle={`${shop.category || 'Shop'} · ${shop.status || 'Status unavailable'}`}
      />

      {/* Main Statistics */}
      {[
        'orders.view',
        'payments.view',
        'orders.approve',
        'inventory.view',
        'employees.view',
        'wholesalers.view',
      ].some(can) && <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Shop Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {can('orders.view') && <StatCard
            title="Total Orders"
            value={countOrUnavailable(stats.totalOrders)}
            description="Orders received by your shop"
            icon="📦"
          />}

          {can('orders.view') && <StatCard
            title="Pending Orders"
            value={countOrUnavailable(stats.pendingOrders)}
            description="Orders awaiting processing"
            icon="⏳"
          />}

          {can('orders.view') && <StatCard
            title="Delivered Orders"
            value={countOrUnavailable(stats.deliveredOrders)}
            description="Successfully delivered"
            icon="🚚"
          />}

          {can('payments.view') && <StatCard
            title="Total Revenue"
            value={money(stats.totalRevenue)}
            description="Revenue recorded by your shop"
            icon="💰"
          />}

          {can('orders.approve') && <StatCard
            title="Return Requests"
            value={countOrUnavailable(stats.pendingReturns)}
            description="Returns awaiting your action"
            icon="↩️"
          />}

          {can('orders.approve') && <StatCard
            title="Pending Refunds"
            value={countOrUnavailable(stats.pendingRefunds)}
            description="Refunds awaiting completion"
            icon="💳"
          />}

          {can('inventory.view') && <StatCard
            title="Low Stock Products"
            value={countOrUnavailable(stats.lowStockProducts)}
            description="Products that need restocking"
            icon="⚠️"
          />}

          {can('employees.view') && <StatCard
            title="Active Employees"
            value={countOrUnavailable(stats.activeEmployees)}
            description="Employees in your shop"
            icon="👥"
          />}

          {can('wholesalers.view') && <StatCard
            title="Authorized Wholesalers"
            value={countOrUnavailable(stats.authorizedWholesalers)}
            description="Active wholesale partners"
            icon="🏭"
          />}
        </div>
      </section>
      }

      {can('payments.view') && <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">Sales Overview</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="Today" value={money(salesOverview.today)} description="Collected sales today" icon="📅" />
          <StatCard title="Last 7 days" value={money(salesOverview.last7Days)} description="Collected sales in the past week" icon="📈" />
          <StatCard title="This month" value={money(salesOverview.thisMonth)} description="Collected sales this month" icon="🗓️" />
        </div>
      </section>
      }

      {can('orders.view') && <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-slate-800">Recent Orders</h2>
          <Link to="/shop/orders" className="text-sm font-medium text-indigo-600 hover:underline">
            Manage orders →
          </Link>
        </div>
        <Card className="overflow-x-auto">
          {recentOrders.length ? (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Order</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Amount</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 pr-4 font-medium text-slate-800">{order.orderNumber}</td>
                    <td className="py-3 pr-4 text-slate-600">{order.customer?.name || 'Customer'}</td>
                    <td className="py-3 pr-4 text-slate-600">{money(order.totalAmount)}</td>
                    <td className="py-3 pr-4 text-slate-600">{statusLabel(order.status)}</td>
                    <td className="py-3 text-slate-600">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500">
              {error ? 'Order information is unavailable.' : 'No orders have been placed yet.'}
            </p>
          )}
        </Card>
      </section>
      }

      {(can('inventory.view') || can('orders.approve')) && <section className="grid gap-6 xl:grid-cols-2">
        {can('inventory.view') && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Low Stock Alerts</h2>
          <Card>
            {lowStockAlerts.length ? (
              <ul className="divide-y divide-slate-100">
                {lowStockAlerts.map((item) => (
                  <li key={item.id} className="flex flex-wrap justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <span className="font-medium text-slate-800">
                      {item.product?.name || 'Product'}{item.variant?.variantName ? ` · ${item.variant.variantName}` : ''}
                    </span>
                    <span className="text-sm text-slate-600">
                      {item.quantity} left (alert at {item.lowStockThreshold})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">
                {error ? 'Inventory information is unavailable.' : 'No low-stock products.'}
              </p>
            )}
            <Link to="/shop/inventory" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
              Manage inventory →
            </Link>
          </Card>
        </div>
        )}

        {can('orders.approve') && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-slate-800">Returns &amp; Refunds</h2>
          <Card>
            <h3 className="font-medium text-slate-800">Return requests</h3>
            {returnOverview.pendingRequests?.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {returnOverview.pendingRequests.map((item) => (
                  <li key={item.id}>
                    {item.order?.orderNumber || `Order ${item.orderId}`} · {item.customer?.name || 'Customer'} · requested {formatDate(item.createdAt)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                {error ? 'Return information is unavailable.' : 'No pending return requests.'}
              </p>
            )}
            <h3 className="mt-5 font-medium text-slate-800">Refunds awaiting completion</h3>
            {returnOverview.pendingRefunds?.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-600">
                {returnOverview.pendingRefunds.map((item) => (
                  <li key={item.id}>
                    {item.order?.orderNumber || `Order ${item.orderId}`} · {statusLabel(item.status)} · {money(item.refundAmount)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                {error ? 'Refund information is unavailable.' : 'No refunds awaiting completion.'}
              </p>
            )}
            <Link to="/shop/orders" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">
              Review orders →
            </Link>
          </Card>
        </div>
        )}
      </section>
      }

      {/* Quick Actions */}
      {quickActions.length > 0 && <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Quick Actions
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <QuickAction key={action.to} {...action} />
          ))}
        </div>
      </section>
      }

      {/* Wholesaler Overview */}
      {can('wholesalers.view') && <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Wholesaler Overview
        </h2>

        <Card>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-3xl font-semibold text-slate-900">
                {stats.authorizedWholesalers ?? 0}
              </p>
              <h3 className="mt-1 font-semibold text-slate-800">
                Authorized Wholesalers
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Manage your authorized wholesalers, purchase orders,
                uploaded bills and payment history.
              </p>
            </div>

            <Link
              to="/shop/wholesalers"
              className="inline-flex w-fit items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Open Wholesaler Dashboard →
            </Link>
          </div>
        </Card>
      </section>
      }

      {/* Shop Details */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Shop Information
        </h2>

        <Card>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Shop Name</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {shop.name || '—'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Category</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {shop.category || '—'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Address</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {shop.address || '—'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Phone</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {shop.contactPhone || '—'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Email</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {shop.contactEmail || '—'}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Shop Status</dt>
              <dd className="mt-1 font-medium text-slate-800">
                {shop.status || '—'}
              </dd>
            </div>
          </dl>
        </Card>
      </section>
    </div>
  );
}
