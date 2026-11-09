import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import { Alert, Button, Card, Input, Spinner } from '../../components/ui.jsx';

const SECTIONS = [
  ['deliveries', 'My Deliveries'],
  ['pending', 'Pending Deliveries'],
  ['out', 'Out for Delivery'],
  ['delivered', 'Delivered Orders'],
  ['failed', 'Failed Deliveries'],
  ['history', 'Delivery History'],
  ['profile', 'My Profile'],
  ['attendance', 'My Attendance'],
];

const STATUS_LABELS = {
  assigned: 'Pending acceptance',
  picked_up: 'Accepted',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  failed: 'Failed',
};

const FAILURE_REASONS = [
  ['customer_unavailable', 'Customer unavailable'],
  ['customer_refused', 'Customer refused delivery'],
  ['incorrect_address', 'Incorrect or incomplete address'],
  ['customer_unreachable', 'Customer unreachable'],
  ['other', 'Other'],
];

const dateTime = (value) => value ? new Date(value).toLocaleString() : '—';

const addressText = (address) => {
  if (!address) return 'Address not available';
  return [
    address.recipientName,
    address.streetAddress,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
  ].filter(Boolean).join(', ');
};

function StatusBadge({ status }) {
  const style = {
    assigned: 'bg-sky-100 text-sky-800',
    picked_up: 'bg-indigo-100 text-indigo-800',
    out_for_delivery: 'bg-amber-100 text-amber-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-rose-100 text-rose-800',
  }[status] || 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>
      {STATUS_LABELS[status] || status?.replace(/_/g, ' ') || 'Unknown'}
    </span>
  );
}

export default function DeliveryAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [section, setSection] = useState('deliveries');
  const [history, setHistory] = useState([]);
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [details, setDetails] = useState(null);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [failureDescription, setFailureDescription] = useState('');
  const [proof, setProof] = useState(null);
  const [collectionAction, setCollectionAction] = useState(null);
  const [collectionAmount, setCollectionAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/delivery/assignments');
      setAssignments(response.items || []);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load your deliveries.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  useEffect(() => {
    if (section === 'deliveries' || section === 'pending' || section === 'out' ||
        section === 'delivered' || section === 'failed') return;
    let active = true;
    setSectionLoading(true);
    setError('');
    const requests = {
      history: () => api.get('/delivery/history').then((response) => {
        if (active) setHistory(response.items || []);
      }),
      profile: () => api.get('/delivery/profile').then((response) => {
        if (active) setProfile(response);
      }),
      attendance: () => api.get('/delivery/attendance').then((response) => {
        if (active) setAttendance(response.items || []);
      }),
    };
    requests[section]()
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load this section.');
      })
      .finally(() => { if (active) setSectionLoading(false); });
    return () => { active = false; };
  }, [section]);

  const counts = useMemo(() => ({
    total: assignments.length,
    pending: assignments.filter((item) => item.status === 'assigned').length,
    out: assignments.filter((item) => ['picked_up', 'out_for_delivery'].includes(item.status)).length,
    delivered: assignments.filter((item) => item.status === 'delivered').length,
    failed: assignments.filter((item) => item.status === 'failed').length,
  }), [assignments]);

  const visibleAssignments = useMemo(() => {
    const search = query.trim().toLowerCase();
    return assignments.filter((item) => {
      const customer = item.order?.customer?.name || '';
      const orderNumber = item.order?.orderNumber || '';
      const matchesSearch = !search ||
        orderNumber.toLowerCase().includes(search) ||
        customer.toLowerCase().includes(search);
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const matchesDate = !dateFilter ||
        String(item.assignedAt || '').slice(0, 10) === dateFilter;
      const matchesSection =
        section === 'pending' ? item.status === 'assigned' :
          section === 'out' ? ['picked_up', 'out_for_delivery'].includes(item.status) :
            section === 'delivered' ? item.status === 'delivered' :
              section === 'failed' ? item.status === 'failed' : true;
      return matchesSearch && matchesStatus && matchesDate && matchesSection;
    });
  }, [assignments, dateFilter, query, section, statusFilter]);

  const openAction = (item, status) => {
    setAction({ item, status });
    setNotes('');
    setFailureReason('');
    setFailureDescription('');
    setProof(null);
    setError('');
  };

  const submitAction = async (event) => {
    event.preventDefault();
    if (!action || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      let payload;
      if (action.status === 'delivered' && proof) {
        payload = new FormData();
        payload.set('status', action.status);
        if (notes.trim()) payload.set('notes', notes.trim());
        payload.set('proof', proof);
      } else {
        payload = {
          status: action.status,
          ...(notes.trim() ? { notes: notes.trim() } : {}),
          ...(action.status === 'failed' ? {
            failureReason,
            ...(failureDescription.trim() ? { failureDescription: failureDescription.trim() } : {}),
          } : {}),
        };
      }
      await api.patch(`/delivery/assignments/${action.item.id}/status`, payload);
      setSuccess(`Order ${action.item.order?.orderNumber || ''}: ${STATUS_LABELS[action.status]}.`);
      setAction(null);
      await Promise.all([loadAssignments(), api.get('/delivery/history').then((response) => setHistory(response.items || []))]);
    } catch (requestError) {
      setError(requestError.message || 'Unable to update delivery status.');
    } finally {
      setSaving(false);
    }
  };

  const openCodCollection = (item) => {
    const payment = item.order?.payments?.find((record) => record.paymentMethod === 'cod');
    setCollectionAction(item);
    setCollectionAmount(String(payment?.amount ?? item.order?.totalAmount ?? ''));
    setError('');
    setSuccess('');
  };

  const submitCodCollection = async (event) => {
    event.preventDefault();
    if (!collectionAction || saving) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await api.post(`/delivery/assignments/${collectionAction.id}/cod-collection`, {
        amount: Number(collectionAmount),
      });
      setSuccess(`COD cash recorded for order ${collectionAction.order?.orderNumber || ''}.`);
      setCollectionAction(null);
      await loadAssignments();
    } catch (requestError) {
      setError(requestError.message || 'Unable to record COD cash collection.');
    } finally {
      setSaving(false);
    }
  };

  const loadDetails = async (assignment) => {
    setError('');
    try {
      const response = await api.get(`/delivery/assignments/${assignment.id}`);
      setDetails(response.item);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load delivery details.');
    }
  };

  const actionButtons = (item) => (
    <>
      {item.status === 'assigned' && (
        <Button type="button" onClick={() => openAction(item, 'picked_up')}>Accept delivery</Button>
      )}
      {item.status === 'picked_up' && (
        <Button type="button" onClick={() => openAction(item, 'out_for_delivery')}>Mark out for delivery</Button>
      )}
      {item.status === 'out_for_delivery' && (
        <>
          <Button type="button" onClick={() => openAction(item, 'delivered')}>Mark delivered</Button>
          <Button type="button" variant="secondary" onClick={() => openAction(item, 'failed')}>Mark failed</Button>
        </>
      )}
    </>
  );

  const sectionName = SECTIONS.find(([key]) => key === section)?.[1];

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-900 p-6 text-white shadow-sm sm:p-8">
        <p className="text-sm font-medium text-indigo-200">Delivery partner portal</p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">My delivery workspace</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Track assigned orders, manage delivery progress and review your activity.
        </p>
      </header>

      {error && <Alert kind="error">{error}</Alert>}
      {success && <Alert kind="success">{success}</Alert>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total assigned', counts.total],
          ['Pending acceptance', counts.pending],
          ['In progress', counts.out],
          ['Delivered', counts.delivered],
          ['Failed', counts.failed],
        ].map(([label, count]) => (
          <Card key={label}>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{count}</p>
          </Card>
        ))}
      </section>

      <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-2" aria-label="Delivery sections">
        {SECTIONS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSection(key)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${section === key ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {['deliveries', 'pending', 'out', 'delivered', 'failed'].includes(section) && (
        <Card>
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="delivery-search">Search order or customer</label>
              <Input id="delivery-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number or customer name" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="delivery-status">Status</label>
              <select id="delivery-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                <option value="">All statuses</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="delivery-date">Assigned date</label>
              <Input id="delivery-date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            </div>
          </div>

          {loading ? <Spinner /> : visibleAssignments.length === 0 ? (
            <div className="rounded-lg bg-slate-50 py-10 text-center text-sm text-slate-500">
              No deliveries found in {sectionName}.
            </div>
          ) : (
            <div className="space-y-3">
              {visibleAssignments.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-200 p-4 hover:border-indigo-200">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-slate-900">Order {item.order?.orderNumber || `#${item.orderId}`}</h2>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{item.order?.customer?.name || 'Customer'} · {item.order?.customer?.phone || 'No phone provided'}</p>
                      <p className="mt-1 max-w-3xl text-sm text-slate-500">{addressText(item.order?.shippingAddress)}</p>
                    </div>
                    <div className="text-sm text-slate-500">
                      <p>Order: {dateTime(item.order?.createdAt)}</p>
                      <p>Assigned: {dateTime(item.assignedAt)}</p>
                      {item.pickedUpAt && <p>Accepted: {dateTime(item.pickedUpAt)}</p>}
                      {item.deliveredAt && <p>Completed: {dateTime(item.deliveredAt)}</p>}
                    </div>
                  </div>
                  {item.status === 'failed' && item.notes && (
                    <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800"><strong>Failure:</strong> {item.notes}</p>
                  )}
                  {item.status === 'delivered' && item.proofImagePath && (
                    <a className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline" href={item.proofImagePath} target="_blank" rel="noreferrer">View delivery proof</a>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <Button type="button" variant="secondary" onClick={() => loadDetails(item)}>View details</Button>
                    {actionButtons(item)}
                    {item.status === 'delivered' &&
                      item.order?.paymentMethod === 'cod' &&
                      !item.order?.payments?.some((payment) => payment.codCollectedAt) && (
                        <Button type="button" onClick={() => openCodCollection(item)}>Record COD cash</Button>
                      )}
                    {item.order?.payments?.some((payment) => payment.codCollectedAt) && (
                      <span className="self-center text-sm font-medium text-emerald-700">
                        COD cash recorded · ₹{Number(item.order.payments.find((payment) => payment.codCollectedAt).codCollectedAmount).toFixed(2)}
                      </span>
                    )}
                    {item.status === 'failed' && (
                      <Button type="button" variant="secondary" onClick={() => { setSection('history'); }}>
                        Delivery history
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      )}

      {section === 'history' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Delivery history</h2>
          {sectionLoading ? <Spinner /> : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No delivery history is available.</p>
          ) : (
            <ol className="space-y-4">
              {history.map((event) => (
                <li key={event.id} className="border-l-2 border-indigo-200 pl-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-sm text-slate-900">{event.order?.orderNumber || `Order #${event.orderId}`}</strong>
                    <StatusBadge status={event.newStatus === 'delivery_failed' ? 'failed' : event.newStatus} />
                    <span className="text-xs text-slate-500">{dateTime(event.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{event.previousStatus || '—'} → {event.newStatus}</p>
                  {event.notes && <p className="mt-1 text-sm text-slate-500">{event.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </Card>
      )}

      {section === 'profile' && (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900">My profile</h2>
          {sectionLoading ? <Spinner /> : profile && (
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              {[
                ['Name', profile.user?.name],
                ['Email', profile.user?.email],
                ['Phone', profile.user?.phone],
                ['Designation', profile.profile?.designation],
                ['Employee code', profile.profile?.employeeCode],
                ['Joined', profile.profile?.joinedDate],
                ['Address', profile.profile?.address],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-slate-50 p-3">
                  <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
                  <dd className="mt-1 text-sm text-slate-900">{value || '—'}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-4 text-xs text-slate-500">Profile updates are managed through the existing employee record workflow.</p>
        </Card>
      )}

      {section === 'attendance' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">My attendance</h2>
          {sectionLoading ? <Spinner /> : attendance.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No attendance records are available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>{['Date', 'Status', 'Check in', 'Check out', 'Working hours'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.map((record) => (
                    <tr key={record.id}>
                      <td className="px-3 py-3">{record.date}</td>
                      <td className="px-3 py-3 capitalize">{record.status?.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3">{record.checkIn || '—'}</td>
                      <td className="px-3 py-3">{record.checkOut || '—'}</td>
                      <td className="px-3 py-3">{record.workingHours ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {details && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Delivery details">
          <Card className="max-h-[90vh] w-full max-w-2xl overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Order {details.order?.orderNumber}</h2>
                <p className="mt-1 text-sm text-slate-500">Delivery details and read-only order information</p>
              </div>
              <button type="button" onClick={() => setDetails(null)} className="rounded px-2 text-2xl text-slate-500 hover:bg-slate-100" aria-label="Close details">×</button>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <p className="text-sm"><strong>Customer:</strong> {details.order?.customer?.name || '—'} · {details.order?.customer?.phone || '—'}</p>
              <p className="text-sm"><strong>Status:</strong> <StatusBadge status={details.status} /></p>
              <p className="text-sm sm:col-span-2"><strong>Address:</strong> {addressText(details.order?.shippingAddress)}</p>
              <p className="text-sm"><strong>Payment:</strong> {details.order?.paymentMethod || '—'} / {details.order?.paymentStatus || '—'}</p>
              <p className="text-sm"><strong>Order total:</strong> ₹{Number(details.order?.totalAmount || 0).toFixed(2)}</p>
              {details.order?.paymentMethod === 'cod' && (
                <p className="text-sm">
                  <strong>COD cash:</strong>{' '}
                  {details.order?.payments?.some((payment) => payment.codCollectedAt)
                    ? `₹${Number(details.order.payments.find((payment) => payment.codCollectedAt).codCollectedAmount).toFixed(2)} recorded`
                    : 'Awaiting collection'}
                </p>
              )}
              {details.notes && <p className="text-sm sm:col-span-2"><strong>Delivery notes / failure reason:</strong> {details.notes}</p>}
            </div>
            <h3 className="mt-5 font-semibold text-slate-900">Items</h3>
            <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
              {(details.order?.items || []).map((item) => (
                <div key={item.id} className="flex justify-between gap-3 p-3 text-sm">
                  <span>{item.productName} {item.variantName ? `(${item.variantName})` : ''} · Qty {item.quantity}</span>
                  <span className="font-medium">₹{Number(item.totalPrice || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {details.proofImagePath && <a className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline" href={details.proofImagePath} target="_blank" rel="noreferrer">Open delivery proof</a>}
            <h3 className="mt-5 font-semibold text-slate-900">Timeline</h3>
            <ol className="mt-2 space-y-3">
              {(details.order?.statusHistory || []).map((event) => (
                <li key={event.id} className="border-l-2 border-slate-200 pl-3 text-sm">
                  <p className="font-medium text-slate-800">{event.previousStatus || '—'} → {event.newStatus}</p>
                  <p className="text-xs text-slate-500">{dateTime(event.createdAt)} {event.notes ? `· ${event.notes}` : ''}</p>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">{actionButtons(details)}</div>
          </Card>
        </div>
      )}

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Confirm delivery update">
          <Card className="w-full max-w-lg">
            <h2 className="text-lg font-semibold text-slate-900">
              {action.status === 'picked_up' ? 'Accept delivery' :
                action.status === 'out_for_delivery' ? 'Start delivery' :
                  action.status === 'delivered' ? 'Confirm delivery' : 'Report failed delivery'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">Order {action.item.order?.orderNumber}</p>
            <form onSubmit={submitAction} className="mt-4 space-y-4">
              {action.status === 'failed' && (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    Failure reason
                    <select required value={failureReason} onChange={(event) => setFailureReason(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2">
                      <option value="">Select a reason</option>
                      {FAILURE_REASONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  {failureReason === 'other' && (
                    <label className="block text-sm font-medium text-slate-700">
                      Describe the issue
                      <Input required maxLength={400} value={failureDescription} onChange={(event) => setFailureDescription(event.target.value)} />
                    </label>
                  )}
                  {collectionAction && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Record cash on delivery collection">
                      <Card className="w-full max-w-lg">
                        <h2 className="text-lg font-semibold text-slate-900">Record COD cash collected</h2>
                        <p className="mt-1 text-sm text-slate-500">Order {collectionAction.order?.orderNumber}</p>
                        <form onSubmit={submitCodCollection} className="mt-4 space-y-4">
                          <p className="text-sm text-slate-600">
                            Amount due: ₹{Number(collectionAction.order?.payments?.find((payment) => payment.paymentMethod === 'cod')?.amount ?? collectionAction.order?.totalAmount ?? 0).toFixed(2)}
                          </p>
                          <label className="block text-sm font-medium text-slate-700">
                            Cash actually received (₹)
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              required
                              value={collectionAmount}
                              onChange={(event) => setCollectionAmount(event.target.value)}
                            />
                          </label>
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="secondary" disabled={saving} onClick={() => setCollectionAction(null)}>Cancel</Button>
                            <Button type="submit" disabled={saving || !Number.isFinite(Number(collectionAmount)) || Number(collectionAmount) <= 0}>
                              {saving ? 'Saving…' : 'Save cash collection'}
                            </Button>
                          </div>
                        </form>
                      </Card>
                    </div>
                  )}
                </>
              )}
              {action.status === 'delivered' && (
                <label className="block text-sm font-medium text-slate-700">
                  Delivery proof image (optional, JPEG/PNG/WEBP/GIF; up to 5 MB)
                  <Input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => setProof(event.target.files?.[0] || null)} />
                </label>
              )}
              <label className="block text-sm font-medium text-slate-700">
                Notes
                <Input maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional delivery note" />
              </label>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" disabled={saving} onClick={() => setAction(null)}>Cancel</Button>
                <Button type="submit" disabled={saving || (action.status === 'failed' && (!failureReason || (failureReason === 'other' && !failureDescription.trim())))}>{saving ? 'Saving…' : 'Confirm'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
