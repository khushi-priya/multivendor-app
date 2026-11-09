import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';
import { hasPermission } from '../../../services/permissions.js';

export default function ShopBills() {
  const { user } = useAuth();
  const canUpload =
    user?.shop?.role === 'shop_owner' ||
    hasPermission(user?.permissions, 'wholesalers.create');
  const [searchParams] = useSearchParams();
  const requestedWholesalerId = searchParams.get('wholesalerId') || '';
  const [documents, setDocuments] = useState([]);
  const [wholesalers, setWholesalers] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Upload Form State
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('bill');
  const [wholesalerId, setWholesalerId] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [billNumber, setBillNumber] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [docRes, wRes, poRes] = await Promise.all([
        api.get('/shop/bills'),
        api.get('/shop/wholesalers'),
        api.get('/shop/wholesale-orders'),
      ]);
      setDocuments(docRes.items || []);
      setWholesalers(wRes.items || []);
      setPurchaseOrders(poRes.items || []);
      if ((wRes.items || []).some((item) => String(item.id) === requestedWholesalerId)) {
        setWholesalerId(requestedWholesalerId);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [requestedWholesalerId]);

  const visibleDocuments = requestedWholesalerId
    ? documents.filter((item) => String(item.wholesalerId) === requestedWholesalerId)
    : documents;
  const visiblePurchaseOrders = purchaseOrders.filter(
    (item) => !wholesalerId || String(item.wholesalerId) === String(wholesalerId),
  );

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a document file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('documentType', documentType);
      if (wholesalerId) fd.append('wholesalerId', wholesalerId);
      if (purchaseOrderId) fd.append('purchaseOrderId', purchaseOrderId);
      const billMetadata = [billNumber && `Bill: ${billNumber}`, billDate && `Date: ${billDate}`, billAmount && `Amount: ₹${billAmount}`]
        .filter(Boolean)
        .join(' | ');
      const documentNotes = [billMetadata, notes].filter(Boolean).join(' · ');
      if (documentNotes) fd.append('notes', documentNotes);

      await api.upload('/shop/bills', fd);
      setSuccess('Document uploaded securely.');
      setFile(null);
      setNotes('');
      setBillNumber('');
      setBillDate('');
      setBillAmount('');
      setPurchaseOrderId('');
      // reset file input
      e.target.reset();
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Purchase Bills & Invoices</h1>
        <p className="mt-1 text-sm text-slate-600">
          Secure private uploads for wholesaler invoices, delivery challans, and receipts. All files are encrypted and
          accessible only by authorized staff of your shop.
        </p>
      </div>

      {requestedWholesalerId && (
        <Link to="/shop/wholesalers" className="inline-block text-sm font-medium text-indigo-600 hover:underline">
          ← Back to Wholesalers
        </Link>
      )}

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {canUpload && (
      <Card title="Upload New Invoice / Document">
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Document Type *</label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
              >
                <option value="bill">Wholesale Bill</option>
                <option value="invoice">Tax Invoice</option>
                <option value="receipt">Payment Receipt</option>
                <option value="delivery_proof">Delivery Proof</option>
                <option value="other">Other Document</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Related Wholesaler</label>
              <select
                value={wholesalerId}
                onChange={(e) => setWholesalerId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
              >
                <option value="">Select wholesaler (optional)...</option>
                {wholesalers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Related Purchase Order</label>
              <select
                value={purchaseOrderId}
                onChange={(e) => setPurchaseOrderId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2 text-sm shadow-sm"
              >
                <option value="">Select purchase order (optional)...</option>
                {visiblePurchaseOrders.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.orderNumber} (₹{po.totalAmount})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(documentType === 'bill' || documentType === 'invoice') && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">Bill / Invoice Number *</label>
                <Input required value={billNumber} onChange={(e) => setBillNumber(e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Bill Date *</label>
                <Input required type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Bill Amount (₹) *</label>
                <Input required type="number" min="0.01" step="0.01" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">Select File (PDF, JPEG, PNG, WEBP max 10MB) *</label>
              <input
                type="file"
                required
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => setFile(e.target.files[0])}
                className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:rounded-md file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Notes / Remarks</label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Invoice #INV-9823 received with shipment"
              />
            </div>
          </div>

          <div>
            <Button type="submit" disabled={uploading}>
              {uploading ? 'Uploading Securely...' : 'Upload Document'}
            </Button>
          </div>
        </form>
      </Card>
      )}

      {/* Uploaded Documents List */}
      {loading ? (
        <Spinner />
      ) : visibleDocuments.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            No bills or documents uploaded yet for this shop.
          </div>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Document</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Wholesaler / PO</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {visibleDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{doc.originalFilename}</div>
                    {doc.notes && <div className="text-xs text-slate-500">{doc.notes}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase text-slate-700">
                      {doc.documentType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <div>{doc.wholesaler?.name || '—'}</div>
                    {doc.purchaseOrder && (
                      <div className="font-mono text-indigo-600">{doc.purchaseOrder.orderNumber}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{formatBytes(doc.fileSize)}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`/api/v1/shop/bills/${doc.id}/download`}
                      download={doc.originalFilename}
                      className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                    >
                      Download File
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
