import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';

export default function BookOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedWholesalerId = searchParams.get('wholesalerId') || '';
  const [wholesalers, setWholesalers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedWholesalerId, setSelectedWholesalerId] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.get('/shop/wholesalers'), api.get('/shop/catalog/products')])
      .then(([wRes, pRes]) => {
        const activeWholesalers = (wRes.items || []).filter((item) => item.status === 'active');
        setWholesalers(activeWholesalers);
        const requestedWholesaler = activeWholesalers.find(
          (item) => String(item.id) === requestedWholesalerId,
        );
        if (requestedWholesaler) setSelectedWholesalerId(String(requestedWholesaler.id));
        else if (activeWholesalers.length > 0) setSelectedWholesalerId(String(activeWholesalers[0].id));

        // Flatten variants
        const variantList = [];
        (pRes.items || []).forEach((prod) => {
          (prod.variants || []).forEach((v) => {
            variantList.push({
              productId: prod.id,
              productName: prod.name,
              productVariantId: v.id,
              variantName: v.variantName,
              sku: v.sku,
              wholesalePrice: Number(v.wholesalePrice || v.price),
            });
          });
        });
        setProducts(variantList);

        if (variantList.length > 0) {
          setItems([
            {
              productId: variantList[0].productId,
              productVariantId: variantList[0].productVariantId,
              quantity: 10,
              unitPrice: variantList[0].wholesalePrice,
            },
          ]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [requestedWholesalerId]);

  const addItemRow = () => {
    if (products.length === 0) return;
    setItems([
      ...items,
      {
        productId: products[0].productId,
        productVariantId: products[0].productVariantId,
        quantity: 5,
        unitPrice: products[0].wholesalePrice,
      },
    ]);
  };

  const updateItemRow = (index, field, value) => {
    const updated = [...items];
    if (field === 'productVariantId') {
      const match = products.find((p) => p.productVariantId === Number(value));
      if (match) {
        updated[index].productId = match.productId;
        updated[index].productVariantId = match.productVariantId;
        updated[index].unitPrice = match.wholesalePrice;
      }
    } else {
      updated[index][field] = value;
    }
    setItems(updated);
  };

  const removeItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, it) => sum + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedWholesalerId) {
      setError('Please select an authorized wholesaler.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const payload = {
        wholesalerId: Number(selectedWholesalerId),
        notes,
        items: items.map((it) => ({
          productId: Number(it.productId),
          productVariantId: Number(it.productVariantId),
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
        })),
      };

      await api.post('/shop/wholesale-orders', payload);
      navigate(`/shop/wholesalers/purchase-orders?wholesalerId=${encodeURIComponent(selectedWholesalerId)}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Book Wholesale Purchase Order</h1>
        <p className="mt-1 text-sm text-slate-600">
          Place wholesale purchase orders with wholesalers authorized for your shop.
        </p>
      </div>

      <Link to="/shop/wholesalers" className="inline-block text-sm font-medium text-indigo-600 hover:underline">
        ← Back to Wholesalers
      </Link>

      {error && <Alert variant="error">{error}</Alert>}

      {wholesalers.length === 0 ? (
        <Card>
          <div className="py-8 text-center text-sm text-slate-500">
            You do not have any authorized wholesalers assigned yet. Please contact the Platform Admin.
          </div>
        </Card>
      ) : (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Select Authorized Wholesaler *</label>
              <select
                required
                value={selectedWholesalerId}
                onChange={(e) => setSelectedWholesalerId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                {wholesalers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} {w.contactEmail ? `(${w.contactEmail})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Purchase Order Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or shipping instructions"
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm"
              />
            </div>

            {/* Order Items */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">Order Items</h2>
                <Button type="button" variant="secondary" onClick={addItemRow}>
                  + Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((it, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                    <div className="flex-1 min-w-48">
                      <label className="block font-medium text-slate-600 mb-1">Product Variant</label>
                      <select
                        value={it.productVariantId}
                        onChange={(e) => updateItemRow(i, 'productVariantId', e.target.value)}
                        className="w-full rounded-md border border-slate-300 bg-white p-2 text-xs"
                      >
                        {products.map((p) => (
                          <option key={p.productVariantId} value={p.productVariantId}>
                            {p.productName} — {p.variantName} (₹{p.wholesalePrice})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <label className="block font-medium text-slate-600 mb-1">Quantity</label>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={it.quantity}
                        onChange={(e) => updateItemRow(i, 'quantity', e.target.value)}
                      />
                    </div>

                    <div className="w-28">
                      <label className="block font-medium text-slate-600 mb-1">Unit Price (₹)</label>
                      <Input
                        type="number"
                        step="0.01"
                        required
                        value={it.unitPrice}
                        onChange={(e) => updateItemRow(i, 'unitPrice', e.target.value)}
                      />
                    </div>

                    <div className="w-28 text-right font-semibold text-slate-800 pt-5">
                      ₹{(Number(it.quantity || 0) * Number(it.unitPrice || 0)).toFixed(2)}
                    </div>

                    {items.length > 1 && (
                      <div className="pt-5">
                        <button
                          type="button"
                          onClick={() => removeItemRow(i)}
                          className="rounded p-1 text-rose-600 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end text-lg font-bold text-slate-900 border-t pt-3">
                <span>Estimated Total: ₹{calculateTotal().toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="secondary" onClick={() => navigate('/shop/wholesalers/purchase-orders')}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || items.length === 0}>
                {saving ? 'Submitting...' : 'Submit Purchase Order'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
