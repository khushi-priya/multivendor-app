

import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Card, Spinner } from '../../../components/ui.jsx';

const formatCurrency = (value) =>
  `₹${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const getInitials = (name) =>
  String(name || 'Customer')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export default function ShopCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    api
      .get('/shop/customers')
      .then((res) => {
        if (active) {
          setCustomers(Array.isArray(res.items) ? res.items : []);
        }
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load customers.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) =>
      [
        customer.name,
        customer.email,
        customer.phone,
      ].some((value) => String(value || '').toLowerCase().includes(query))
    );
  }, [customers, search]);

  const totalOrders = customers.reduce(
    (total, customer) => total + Number(customer.orderCount || 0),
    0
  );

  const totalRevenue = customers.reduce(
    (total, customer) => total + Number(customer.totalSpent || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Customer Base
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Understand your buyers, their purchase activity and lifetime value.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Shop customer records
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {/* Summary Cards */}
      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Customers
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {customers.length}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Buyers who ordered from your shop
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl">
                👥
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Orders Placed
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">
                  {totalOrders.toLocaleString('en-IN')}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Total orders from these customers
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-xl">
                📦
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Lifetime Revenue
                </p>
                <h2 className="mt-2 text-2xl font-bold text-emerald-700">
                  {formatCurrency(totalRevenue)}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Combined customer purchase value
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-xl">
                ₹
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Customer List */}
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Your Customers
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {loading
                ? 'Loading customer records...'
                : `${filteredCustomers.length} of ${customers.length} customers`}
            </p>
          </div>

          <div className="relative w-full sm:max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email or phone..."
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : customers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
              <div className="text-4xl">👥</div>
              <h3 className="mt-3 font-semibold text-slate-800">
                No customers yet
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Customers will appear here after they place orders from your shop.
              </p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-medium text-slate-700">
                No matching customers found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Try another name, email or phone number.
              </p>
              <button
                type="button"
                onClick={() => setSearch('')}
                className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-700"
              >
                Clear search
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4">Customer</th>
                      <th className="px-5 py-4">Contact</th>
                      <th className="px-5 py-4">Orders</th>
                      <th className="px-5 py-4">Lifetime Spend</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredCustomers.map((customer, index) => (
                      <tr
                        key={customer.id || index}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                              {getInitials(customer.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">
                                {customer.name || 'Customer'}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                Customer #{customer.id || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-slate-700">
                            {customer.email || '—'}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {customer.phone || 'No phone provided'}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                            {Number(customer.orderCount || 0)} orders
                          </span>
                        </td>

                        <td className="px-5 py-4 font-bold text-emerald-700">
                          {formatCurrency(customer.totalSpent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Customer Cards */}
              <div className="space-y-3 md:hidden">
                {filteredCustomers.map((customer, index) => (
                  <div
                    key={customer.id || index}
                    className="rounded-xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                        {getInitials(customer.name)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-slate-900">
                          {customer.name || 'Customer'}
                        </h3>
                        <p className="mt-1 break-all text-xs text-slate-500">
                          {customer.email || 'No email provided'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {customer.phone || 'No phone provided'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <p className="text-xs text-slate-500">Orders</p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {Number(customer.orderCount || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Lifetime Spend</p>
                        <p className="mt-1 font-bold text-emerald-700">
                          {formatCurrency(customer.totalSpent)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

