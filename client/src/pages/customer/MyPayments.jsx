
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import { Alert, Card, Spinner } from '../../components/ui.jsx';

const paymentStatusBadges = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  failed: 'bg-rose-100 text-rose-800',
  refunded: 'bg-slate-200 text-slate-800',
};

export default function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showDateFilter, setShowDateFilter] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [appliedFromDate, setAppliedFromDate] = useState('');
  const [appliedToDate, setAppliedToDate] = useState('');

  const dateFilterRef = useRef(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  // Close calendar when clicking outside it.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dateFilterRef.current &&
        !dateFilterRef.current.contains(event.target)
      ) {
        setShowDateFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get('/customer/payments');
      setPayments(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load payments history');
    } finally {
      setLoading(false);
    }
  };

  // Filter payments using the selected date range.
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (!payment.createdAt) return false;

      const paymentDate = new Date(payment.createdAt);

      if (Number.isNaN(paymentDate.getTime())) return false;

      // Get local date in YYYY-MM-DD format.
      const year = paymentDate.getFullYear();
      const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
      const day = String(paymentDate.getDate()).padStart(2, '0');

      const paymentDateString = `${year}-${month}-${day}`;

      if (appliedFromDate && paymentDateString < appliedFromDate) {
        return false;
      }

      if (appliedToDate && paymentDateString > appliedToDate) {
        return false;
      }

      return true;
    });
  }, [payments, appliedFromDate, appliedToDate]);

  // Apply selected date range.
  const applyDateFilter = () => {
    if (fromDate && toDate && fromDate > toDate) {
      setError('From Date cannot be later than To Date.');
      return;
    }

    setError(null);
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
    setShowDateFilter(false);
  };

  // Clear selected and applied dates.
  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
    setAppliedFromDate('');
    setAppliedToDate('');
    setError(null);
    setShowDateFilter(false);
  };

  // Close form without clearing the selected or applied dates.
  const closeDateFilter = () => {
    setFromDate(appliedFromDate);
    setToDate(appliedToDate);
    setShowDateFilter(false);
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Payment History
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            View all transactions, COD settlements, and online payment receipts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* Calendar Filter */}
          <div className="relative" ref={dateFilterRef}>
            <button
              type="button"
              onClick={() => {
                if (!showDateFilter) {
                  setFromDate(appliedFromDate);
                  setToDate(appliedToDate);
                }

                setShowDateFilter((prev) => !prev);
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                appliedFromDate || appliedToDate
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M16 3v4M8 3v4M3 10h18" />
              </svg>

              Filter by Date

              {(appliedFromDate || appliedToDate) && (
                <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] text-slate-800">
                  Active
                </span>
              )}
            </button>

            {/* Calendar Form */}
            {showDateFilter && (
              <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl">

                {/* Form Heading and Cross Button */}
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Filter Payment History
                  </h3>

                  <button
                    type="button"
                    onClick={closeDateFilter}
                    aria-label="Close date filter"
                    title="Close"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                  >
                    ×
                  </button>
                </div>

                {/* From Date */}
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      From Date
                    </label>

                    <input
                      type="date"
                      value={fromDate}
                      max={toDate || undefined}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                    />
                  </div>

                  {/* To Date */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">
                      To Date
                    </label>

                    <input
                      type="date"
                      value={toDate}
                      min={fromDate || undefined}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                    />
                  </div>
                </div>

                {/* Clear and Apply Buttons */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={clearDateFilter}
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={applyDateFilter}
                    className="flex-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          <Link
            to="/my-orders"
            className="text-xs font-semibold text-slate-700 transition hover:text-slate-900"
          >
            View My Orders →
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && <Alert kind="error">{error}</Alert>}

      {/* Empty Payment History */}
      {payments.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mb-3 text-4xl">💳</div>

          <h3 className="mb-1 text-base font-semibold text-slate-900">
            No payment transactions yet
          </h3>

          <p className="mb-4 text-xs text-slate-500">
            Completed order payments will appear here with proof of transaction.
          </p>

          <Link
            to="/products"
            className="inline-block rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            Start Shopping
          </Link>
        </Card>
      ) : filteredPayments.length === 0 ? (
        /* No Results for Selected Dates */
        <Card className="p-10 text-center">
          <div className="mb-3 text-3xl">📅</div>

          <h3 className="text-base font-semibold text-slate-900">
            No payments found for this date range
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Try selecting a different date range or clear the filter.
          </p>

          <button
            type="button"
            onClick={clearDateFilter}
            className="mt-4 rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Clear Date Filter
          </button>
        </Card>
      ) : (
        <>
          {/* Filter Results Information */}
          {(appliedFromDate || appliedToDate) && (
            <p className="text-xs text-slate-500">
              Showing {filteredPayments.length} of {payments.length} transactions
              {appliedFromDate && ` · From ${appliedFromDate}`}
              {appliedToDate && ` · To ${appliedToDate}`}
            </p>
          )}

          {/* Payments Table */}
          <Card className="overflow-hidden border border-slate-200 bg-white p-0 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Tx ID / Date</th>
                    <th className="px-4 py-3">Order Number</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Reference / RZP ID</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredPayments.map((p) => {
                    const txDate = new Date(p.createdAt).toLocaleDateString(
                      'en-IN',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    );

                    return (
                      <tr
                        key={p.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono font-semibold text-slate-900">
                            #{p.id}
                          </span>

                          <span className="block text-[11px] text-slate-400">
                            {txDate}
                          </span>
                        </td>

                        <td className="px-4 py-3 font-mono font-medium text-slate-800">
                          {p.order?.orderNumber || '—'}
                        </td>

                        <td className="px-4 py-3 font-semibold uppercase text-slate-700">
                          {p.paymentMethod}
                        </td>

                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {p.razorpayPaymentId || p.razorpayOrderId || '—'}
                        </td>

                        <td className="px-4 py-3 text-right font-bold text-slate-900">
                          ₹{Number(p.amount).toFixed(2)}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              paymentStatusBadges[p.status] ||
                              'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {p.paymentMethod === 'cod' && p.status === 'pending'
                              ? 'Due on delivery'
                              : p.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
