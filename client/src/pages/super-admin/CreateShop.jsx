


import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api.js';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Textarea,
  fieldError,
} from '../../components/ui.jsx';

const emptyForm = {
  shopName: '',
  categoryId: '',
  address: '',
  gstNumber: '',
  city: '',
  district: '',
  state: '',
  pinCode: '',
  contactPhone: '',
  contactEmail: '',
  status: 'active',

  // Commission settings
  commissionEnabled: true,
  commissionPercentage: '0',

  // Owner details
  ownerFirstName: '',
  ownerLastName: '',
  ownerEmail: '',
  ownerPhone: '',
  usePassword: false,
  initialPassword: '',
};

const EMAIL_NOTES = {
  sent: 'An invitation email was sent to the owner.',
  not_sent_dev:
    'No SMTP server is configured, so no email was sent. The setup link was printed in the server console.',
  failed:
    'The shop and owner were created, but the invitation email failed to send. Use "Resend invite" on the shops list.',
  not_required: 'The owner can sign in with the password you set.',
};

function SectionHeader({ icon, title, description, color }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
          color === 'indigo'
            ? 'bg-indigo-50 text-indigo-700'
            : 'bg-blue-50 text-blue-700'
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {description}
        </p>
      </div>
    </div>
  );
}

export default function CreateShop() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [details, setDetails] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submitting = useRef(false);

  useEffect(() => {
    let mounted = true;

    api
      .get('/admin/shop-categories')
      .then((data) => {
        if (mounted) {
          setCategories(
            Array.isArray(data?.items) ? data.items : []
          );
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(
            err.message || 'Unable to load shop categories.'
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const set = (key) => (event) => {
    const value =
      event?.target?.type === 'checkbox'
        ? event.target.checked
        : event?.target
          ? event.target.value
          : event;

    setForm((current) => ({
      ...current,
      [key]: value,
    }));

    setDetails((current) => ({
      ...current,
      [key]: undefined,
    }));

    if (key === 'commissionPercentage' || key === 'commissionEnabled') {
      setError('');
    }
  };

  const err = (key) => fieldError(details, key);

  const onSubmit = async (event) => {
    event.preventDefault();

    if (submitting.current) return;

    // Commission validation
    if (
      form.commissionEnabled &&
      (
        form.commissionPercentage === '' ||
        !Number.isFinite(Number(form.commissionPercentage)) ||
        Number(form.commissionPercentage) < 0 ||
        Number(form.commissionPercentage) > 100
      )
    ) {
      setError(
        'Commission percentage must be between 0 and 100.'
      );
      return;
    }

    submitting.current = true;
    setBusy(true);
    setError('');
    setDetails({});

    try {
      const body = {
        shop: {
          name: form.shopName.trim(),
          categoryId: form.categoryId,
          address: form.address.trim(),
          gstNumber: form.gstNumber.trim() || undefined,
          city: form.city.trim() || undefined,
          district: form.district.trim() || undefined,
          state: form.state.trim() || undefined,
          pinCode: form.pinCode.trim() || undefined,
          contactPhone: form.contactPhone.trim(),
          contactEmail: form.contactEmail.trim() || undefined,
          status: form.status,

          // Commission settings
          commissionEnabled: form.commissionEnabled,
          commissionPercentage: form.commissionEnabled
            ? Number(form.commissionPercentage)
            : 0,
        },

        owner: {
          firstName: form.ownerFirstName.trim(),
          lastName: form.ownerLastName.trim(),
          email: form.ownerEmail.trim(),
          phone: form.ownerPhone.trim(),
          initialPassword: form.usePassword
            ? form.initialPassword
            : '',
        },
      };

      setResult(await api.post('/admin/shops', body));
    } catch (err) {
      setError(err.message || 'Unable to create shop.');
      setDetails(err.details || {});
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="w-full space-y-4">
        <PageHeader title="Shop created" />

        <Card className="w-full space-y-4 rounded-xl border border-slate-200 p-5 shadow-sm">
          <Alert kind="success">
            <b>{result.shop.name}</b> was created together with its
            owner <b>{result.shop.owner.name}</b> (
            {result.shop.owner.email}).
          </Alert>

          <Alert
            kind={
              result.emailStatus === 'failed' ? 'warn' : 'info'
            }
          >
            {EMAIL_NOTES[result.emailStatus] ||
              'The shop and owner were created successfully.'}
          </Alert>

          <div className="flex flex-wrap gap-2">
            <Link to="/admin/shops">
              <Button>View all shops</Button>
            </Link>

            <Link to="/shop/login">
              <Button variant="secondary">
                Shop Owner Login
              </Button>
            </Link>

            <Button
              variant="secondary"
              onClick={() => {
                setResult(null);
                setForm(emptyForm);
                setDetails({});
                setError('');
              }}
            >
              Create another
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const commission = Number(form.commissionPercentage || 0);

  const validCommission =
    Number.isFinite(commission) &&
    commission >= 0 &&
    commission <= 100;

  const commissionAmount = validCommission
    ? (1000 * commission) / 100
    : 0;

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Create Shop"
        subtitle="Enter shop information first, then add the shop owner's details."
      />

      <form onSubmit={onSubmit} className="w-full space-y-4" noValidate>
        {error && <Alert>{error}</Alert>}

        <div className="flex w-full flex-col gap-4">

          {/* SHOP DETAILS */}
          <Card className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader
              icon="🏪"
              title="Shop Details"
              description="Enter the shop's information, address and contact details."
              color="blue"
            />

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">

              <Field
                label="Shop name"
                required
                error={err('shop.name')}
              >
                <Input
                  value={form.shopName}
                  onChange={set('shopName')}
                  placeholder="Enter shop name"
                  required
                />
              </Field>

              <Field
                label="Shop category"
                required
                error={err('shop.categoryId')}
              >
                <Select
                  value={form.categoryId}
                  onChange={set('categoryId')}
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="GST number"
                error={err('shop.gstNumber')}
              >
                <Input
                  value={form.gstNumber}
                  onChange={set('gstNumber')}
                  maxLength={15}
                  placeholder="GSTIN (optional)"
                />
              </Field>

              <Field
                label="Shop contact phone"
                error={err('shop.contactPhone')}
              >
                <Input
                  value={form.contactPhone}
                  onChange={set('contactPhone')}
                  placeholder="Enter shop phone number"
                  inputMode="tel"
                />
              </Field>

              <Field
                label="Shop contact email"
                error={err('shop.contactEmail')}
              >
                <Input
                  type="email"
                  value={form.contactEmail}
                  onChange={set('contactEmail')}
                  placeholder="Shop email (optional)"
                />
              </Field>

              <Field label="Shop status">
                <Select
                  value={form.status}
                  onChange={set('status')}
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </Select>
              </Field>

              <div className="sm:col-span-2 xl:col-span-3">
                <Field
                  label="Shop address"
                  required
                  error={err('shop.address')}
                >
                  <Textarea
                    value={form.address}
                    onChange={set('address')}
                    placeholder="Enter complete shop address"
                    rows={2}
                    required
                  />
                </Field>
              </div>

              <Field label="City" error={err('shop.city')}>
                <Input
                  value={form.city}
                  onChange={set('city')}
                  maxLength={100}
                  placeholder="Enter city"
                />
              </Field>

              <Field
                label="District"
                error={err('shop.district')}
              >
                <Input
                  value={form.district}
                  onChange={set('district')}
                  maxLength={100}
                  placeholder="Enter district"
                />
              </Field>

              <Field label="State" error={err('shop.state')}>
                <Input
                  value={form.state}
                  onChange={set('state')}
                  maxLength={100}
                  placeholder="Enter state"
                />
              </Field>

              <Field
                label="PIN code"
                error={err('shop.pinCode')}
              >
                <Input
                  value={form.pinCode}
                  onChange={set('pinCode')}
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter PIN code"
                />
              </Field>
   <Field
  label="Commission (%)"
  required
  error={err('commissionPercentage')}
>
  <Input
    type="number"
    value={form.commissionPercentage}
    onChange={set('commissionPercentage')}
    placeholder="Enter commission percentage"
    min="0"
    max="100"
    step="0.01"
    required
  />
  <p className="mt-1 text-xs text-slate-500">
    Enter commission between 0% and 100%.
  </p>
</Field>
            </div>
</Card> 
            {/* COMMISSION SETTINGS */}
            {/* <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-4">

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Commission Settings
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Configure the platform commission for this shop.
                  </p>
                </div>

                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.commissionEnabled}
                    onChange={set('commissionEnabled')}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Enable Commission
                  </span>
                </label>
              </div>

              {form.commissionEnabled ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

                  <Field
                    label="Commission Percentage (%)"
                    required
                    error={err('commissionPercentage')}
                  >
                    <Input
                      type="number"
                      value={form.commissionPercentage}
                      onChange={set('commissionPercentage')}
                      placeholder="Enter commission percentage"
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />

                    <p className="mt-1 text-xs text-slate-500">
                      Enter a percentage between 0 and 100.
                    </p>
                  </Field>

                  <div className="rounded-lg border border-indigo-100 bg-white p-3">
                    <p className="text-xs text-slate-500">
                      Commission Preview
                    </p>

                    <p className="mt-1 text-xl font-bold text-indigo-700">
                      {validCommission ? `${commission}%` : 'Invalid'}
                    </p>

                    <div className="mt-2 flex justify-between text-xs">
                      <span className="text-slate-500">
                        Example order: ₹1,000
                      </span>

                      <span className="font-semibold text-slate-800">
                        ₹{commissionAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>

                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Commission is disabled for this shop. The platform
                  commission will be saved as 0%.
                </p>
              )}
            </div>
// 
          </Card> }

          {/* OWNER DETAILS */}
          <Card className="w-full space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <SectionHeader
              icon="👤"
              title="Owner Details"
              description="Create the account for the person who will manage this shop."
              color="indigo"
            />

            <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">

              <Field
                label="First name"
                required
                error={err('owner.firstName')}
              >
                <Input
                  value={form.ownerFirstName}
                  onChange={set('ownerFirstName')}
                  placeholder="Enter first name"
                  required
                />
              </Field>

              <Field
                label="Last name"
                required
                error={err('owner.lastName')}
              >
                <Input
                  value={form.ownerLastName}
                  onChange={set('ownerLastName')}
                  placeholder="Enter last name"
                  required
                />
              </Field>

              <Field
                label="Owner's email"
                required
                error={err('owner.email')}
              >
                <Input
                  type="email"
                  value={form.ownerEmail}
                  onChange={set('ownerEmail')}
                  placeholder="owner@example.com"
                  required
                />
                <p className="mt-1 text-xs text-slate-500">
                  Used for the owner's login and invitation.
                </p>
              </Field>

              <Field
                label="Owner's phone"
                required
                error={err('owner.phone')}
              >
                <Input
                  value={form.ownerPhone}
                  onChange={set('ownerPhone')}
                  placeholder="Enter phone number"
                  inputMode="tel"
                  required
                />
              </Field>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 md:col-span-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
                    checked={form.usePassword}
                    onChange={set('usePassword')}
                  />

                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      Set an initial password
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                      Set a password now instead of sending an invitation email.
                    </span>
                  </span>
                </label>
              </div>

              {form.usePassword ? (
                <div className="md:col-span-2">
                  <Field
                    label="Initial password"
                    required
                    hint="Share the password securely with the owner."
                    error={err('owner.initialPassword')}
                  >
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={form.initialPassword}
                      onChange={set('initialPassword')}
                      placeholder="Enter initial password"
                      required
                    />
                  </Field>
                </div>
              ) : (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-sm leading-6 text-slate-600 md:col-span-2">
                  The owner will receive an email with a secure,
                  single-use link to set their password.
                </div>
              )}

            </div>
          </Card>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex w-full flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:justify-end">
          <Link to="/admin/shops">
            <Button variant="secondary">Cancel</Button>
          </Link>

          <Button type="submit" loading={busy}>
            Create Shop and Owner
          </Button>
        </div>

      </form>
    </div>
  );
}
