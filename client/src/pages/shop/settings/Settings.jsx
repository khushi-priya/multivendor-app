import { useEffect, useState } from 'react';
import { api } from '../../../services/api.js';
import { Alert, Button, Card, Input, Spinner } from '../../../components/ui.jsx';

export default function ShopSettings() {
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [shippingSettings, setShippingSettings] = useState({
    baseFee: '25.00',
    baseWeightKg: 1,
    additionalWeightRate: '10.00',
    additionalWeightStepKg: 1,
    zones: [{ name: 'All pincodes', pincodes: ['*'], surcharge: '0.00', available: true }],
  });
  const [shippingSaving, setShippingSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/shop/settings'),
      api.get('/shop/settings/shipping'),
    ])
      .then(([res, shippingResponse]) => {
        if (res.shop) {
          setShop(res.shop);
          setContactEmail(res.shop.contactEmail || '');
          setContactPhone(res.shop.contactPhone || '');
          setAddress(res.shop.address || '');
          setState(res.shop.state || '');
          setPinCode(res.shop.pinCode || '');
        }
        setShippingSettings(shippingResponse.settings);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await api.patch('/shop/settings', {
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        address,
        state: state || undefined,
        pinCode: pinCode || undefined,
      });
      setShop(res.shop);
      setSuccess('Shop profile details updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleShippingSubmit = async (event) => {
    event.preventDefault();
    setShippingSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await api.patch('/shop/settings/shipping', shippingSettings);
      setShippingSettings(response.settings);
      setSuccess('Delivery charges and service zones saved.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to save delivery settings.');
    } finally {
      setShippingSaving(false);
    }
  };

  const updateZone = (index, key, value) => {
    setShippingSettings((current) => ({
      ...current,
      zones: current.zones.map((zone, zoneIndex) =>
        zoneIndex === index ? { ...zone, [key]: value } : zone,
      ),
    }));
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Shop Settings & Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Update your store contact information and operating address.</p>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      {shop && (
        <Card>
          <div className="mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-slate-900">{shop.name}</h2>
            <div className="mt-1 flex gap-3 text-xs text-slate-500">
              <span>Category: <strong>{shop.category?.name || 'General'}</strong></span>
              <span>&bull;</span>
              <span>Status: <strong className="text-emerald-700 capitalize">{shop.status}</strong></span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Contact Email</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="store@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Contact Phone</label>
              <Input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                placeholder="10-digit mobile number"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Store Address *</label>
              <textarea
                rows={3}
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 p-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Dispatch State
                <Input
                  className="mt-1"
                  required
                  value={state}
                  onChange={(event) => setState(event.target.value)}
                  placeholder="State used for GST"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Dispatch Pincode
                <Input
                  className="mt-1"
                  value={pinCode}
                  onChange={(event) => setPinCode(event.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit pincode"
                />
              </label>
            </div>

            <div className="pt-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Shop Profile'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {shop && (
        <Card>
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Delivery Charges &amp; Zones</h2>
            <p className="mt-1 text-sm text-slate-600">
              Base charge ₹{Number(shippingSettings.baseFee).toFixed(2)} includes the first {shippingSettings.baseWeightKg} kg. Additional slabs are ₹{Number(shippingSettings.additionalWeightRate).toFixed(2)} per {shippingSettings.additionalWeightStepKg} kg. Charges are quoted by the server before checkout.
            </p>
          </div>
          <form onSubmit={handleShippingSubmit} className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['baseFee', 'Base delivery charge (₹)', '0.01'],
                ['baseWeightKg', 'Base weight allowance (kg)', '0.001'],
                ['additionalWeightRate', 'Charge per additional weight slab (₹)', '0.01'],
                ['additionalWeightStepKg', 'Weight per additional slab (kg)', '0.001'],
              ].map(([field, label, step]) => (
                <label key={field} className="block text-sm font-medium text-slate-700">
                  {label}
                  <Input
                    className="mt-1"
                    type="number"
                    min={field.includes('Weight') || field.includes('weight') ? '0.001' : '0'}
                    step={step}
                    required
                    value={shippingSettings[field]}
                    onChange={(event) =>
                      setShippingSettings((current) => ({
                        ...current,
                        [field]: Number(event.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">Delivery zones</h3>
                  <p className="text-xs text-slate-500">Enter exact 6-digit pincodes. Use * only as a fallback zone.</p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    setShippingSettings((current) => ({
                      ...current,
                      zones: [...current.zones, {
                        name: '',
                        pincodes: [],
                        surcharge: '0.00',
                        available: true,
                      }],
                    }))
                  }
                >
                  Add Zone
                </Button>
              </div>
              {shippingSettings.zones.map((zone, index) => (
                <div key={`${zone.name}-${index}`} className="grid gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Zone name
                    <Input className="mt-1" required value={zone.name} onChange={(event) => updateZone(index, 'name', event.target.value)} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Pincodes (comma separated)
                    <Input
                      className="mt-1"
                      required
                      value={(zone.pincodes || []).join(', ')}
                      onChange={(event) => updateZone(index, 'pincodes', event.target.value.split(',').map((code) => code.trim()).filter(Boolean))}
                      placeholder="400001, 400002 or *"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Zone surcharge (₹)
                    <Input className="mt-1" type="number" min="0" step="0.01" required value={zone.surcharge} onChange={(event) => updateZone(index, 'surcharge', event.target.value)} />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Maximum parcel weight (kg, optional)
                    <Input
                      className="mt-1"
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={zone.maxWeightKg ?? ''}
                      onChange={(event) => updateZone(index, 'maxWeightKg', event.target.value ? Number(event.target.value) : undefined)}
                      placeholder="No zone weight limit"
                    />
                  </label>
                  <div className="flex items-end justify-between gap-3">
                    <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
                      <input type="checkbox" checked={zone.available !== false} onChange={(event) => updateZone(index, 'available', event.target.checked)} />
                      Delivery available
                    </label>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={shippingSettings.zones.length <= 1}
                      onClick={() => setShippingSettings((current) => ({
                        ...current,
                        zones: current.zones.filter((_, zoneIndex) => zoneIndex !== index),
                      }))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button type="submit" disabled={shippingSaving}>
              {shippingSaving ? 'Saving…' : 'Save Delivery Settings'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
