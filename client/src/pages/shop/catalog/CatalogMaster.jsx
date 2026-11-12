


import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';
import { Alert, Button, Card, Spinner } from '../../../components/ui.jsx';
import { catalogActions } from '../../../utils/catalogActions.js';
import { hasPermission } from '../../../services/permissions.js';

const CONFIG = {
  categories: {
    title: 'Categories',
    singular: 'Category',
    plural: 'categories',
    type: 'category',
  },
  subcategories: {
    title: 'Subcategories',
    singular: 'Subcategory',
    plural: 'subcategories',
    type: 'subcategory',
  },
  brands: {
    title: 'Brands',
    singular: 'Brand',
    plural: 'brands',
    type: 'brand',
  },
  attributes: {
    title: 'Variants / Attributes',
    singular: 'Variant / Attribute',
    plural: 'attributes',
    type: 'attribute',
  },
  products: {
    title: 'Products',
    singular: 'Product',
    plural: 'products',
    type: 'product',
  },
};

const PAGE_SIZE = 8;

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-100';

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? response;
}

function getRows(response) {
  const result = unwrap(response);

  if (Array.isArray(result)) return result;

  return (
    result?.items ??
    result?.rows ??
    result?.records ??
    result?.data ??
    []
  );
}

function getError(error) {
  return (
    error?.response?.data?.details?.name?.[0] ||
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.data?.error ||
    error?.data?.message ||
    error?.details?.name?.[0] ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

function getId(item) {
  return item?.id ?? item?._id;
}

function getName(item) {
  return item?.name ?? item?.title ?? 'Untitled';
}

// Handles boolean and string status values.
function isActive(item) {
  if (typeof item?.isActive === 'boolean') return item.isActive;
  if (typeof item?.active === 'boolean') return item.active;
  if (typeof item?.is_active === 'boolean') return item.is_active;

  const status = String(item?.status ?? '').toLowerCase();

  if (
    status === 'inactive' ||
    status === 'suspended' ||
    status === 'disabled'
  ) {
    return false;
  }

  return true;
}

function isPending(item) {
  const status = String(
    item?.submissionStatus ??
      item?.approvalStatus ??
      item?.reviewStatus ??
      item?.status ??
      '',
  ).toLowerCase();

  return [
    'pending',
    'pending_approval',
    'submitted',
    'awaiting_approval',
  ].includes(status);
}

function approvalStatus(item) {
  return String(
    item?.submissionStatus ??
      item?.approvalStatus ??
      item?.reviewStatus ??
      '',
  ).toLowerCase();
}

// Reusable modal
function Modal({
  title,
  onClose,
  children,
  wide = false,
  busy = false,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busy) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, busy]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`my-auto max-h-[90vh] w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-2xl ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-md px-3 py-1 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-40"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ item }) {
  const state = approvalStatus(item);

  if (isPending(item) || state === 'rejected') {
    return (
      <span
        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
          state === 'rejected'
            ? 'bg-rose-100 text-rose-800'
            : 'bg-amber-100 text-amber-800'
        }`}
      >
        {state === 'rejected' ? 'Rejected' : 'Pending'}
      </span>
    );
  }

  if (state === 'approved') {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
        Approved · {isActive(item) ? 'Active' : 'Inactive'}
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
        isActive(item)
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-200 text-gray-700'
      }`}
    >
      {isActive(item) ? 'Active' : 'Inactive'}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function resolveSection(pathname) {
  const path = pathname.toLowerCase();

  if (
    path.includes('subcategory') ||
    path.includes('subcategories')
  ) {
    return 'subcategories';
  }

  if (path.includes('brand')) return 'brands';

  if (
    path.includes('attribute') ||
    path.includes('variant')
  ) {
    return 'attributes';
  }

  if (path.includes('product')) return 'products';

  return 'categories';
}

export default function CatalogMaster({ section: sectionProp }) {
  const location = useLocation();
  const { user } = useAuth();

  const section =
    sectionProp && CONFIG[sectionProp]
      ? sectionProp
      : resolveSection(location.pathname);

  const config = CONFIG[section];

  const admin = user?.role === 'super_admin';

  const base = admin
    ? '/admin/catalog'
    : '/shop/catalog';

  const endpoint = `${base}/${config.plural}`;

  const permissionModule =
    section === 'categories' ||
    section === 'subcategories'
      ? 'categories'
      : 'products';

  const can = (action) =>
    admin ||
    user?.shop?.role === 'shop_owner' ||
    hasPermission(
      user?.permissions,
      `${permissionModule}.${action}`,
    );

  const canCreate = can('create');
  const canUpdate = can('update');
  const canDelete = can('delete');

  // Super Admin status toggle is enabled for these sections.
  const adminToggleSections = [
    'categories',
    'subcategories',
    'brands',
  ];

  const adminCanToggle =
    admin && adminToggleSections.includes(section);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formError, setFormError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [reviewingId, setReviewingId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    categoryId: '',
    brandId: '',
    subcategoryId: '',
    price: '',
    stock: '',
    values: '',
    image: null,
  });

  const resetForm = useCallback(() => {
    setForm({
      name: '',
      description: '',
      categoryId: '',
      brandId: '',
      subcategoryId: '',
      price: '',
      stock: '',
      values: '',
      image: null,
    });

    setEditing(null);
    setShowForm(false);
    setFormError('');
  }, []);

  // Load catalog records
  const loadItems = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(endpoint);
      setItems(getRows(response));
    } catch (err) {
      setItems([]);
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  // Load categories for dropdowns
  const loadCategories = useCallback(async () => {
    try {
      const response = await api.get(`${base}/categories`);
      setCategories(getRows(response));
    } catch {
      setCategories([]);
    }
  }, [base]);

  // Load pending catalog approvals
  const loadPending = useCallback(async () => {
    if (!admin) {
      setPendingItems([]);
      return;
    }

    try {
      const response = await api.get('/admin/catalog/pending');
      const rows = getRows(response);

      const aliases = {
        category: ['category', 'categories'],
        subcategory: ['subcategory', 'subcategories'],
        brand: ['brand', 'brands'],
        attribute: [
          'attribute',
          'attributes',
          'variant',
          'variants',
        ],
        product: ['product', 'products'],
      };

      setPendingItems(
        rows.filter((item) => {
          const rawType =
            item?.type ??
            item?.catalogType ??
            item?.entityType ??
            item?.resource;

          if (!rawType) return false;

          return (aliases[config.type] || []).includes(
            String(rawType).toLowerCase(),
          );
        }),
      );
    } catch {
      setPendingItems([]);
    }
  }, [admin, config.type]);

  useEffect(() => {
    setPage(1);
    setSearch('');
    setShowForm(false);
    setEditing(null);
    setFormError('');
    setDeleteError('');

    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (
      section === 'subcategories' ||
      section === 'products'
    ) {
      loadCategories();
    }
  }, [section, loadCategories]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // Search
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => {
      const categoryName =
        item?.category?.name ??
        categories.find(
          (category) =>
            String(getId(category)) ===
            String(item?.categoryId),
        )?.name ??
        '';

      return [
        item?.name,
        item?.title,
        item?.description,
        item?.values,
        item?.sku,
        item?.status,
        categoryName,
      ].some((value) =>
        String(value ?? '').toLowerCase().includes(query),
      );
    });
  }, [items, search, categories]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredItems.length / PAGE_SIZE),
  );

  const visibleItems = useMemo(
    () =>
      filteredItems.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE,
      ),
    [filteredItems, page],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function openCreate() {
    setError('');
    setSuccess('');
    setFormError('');
    setDeleteError('');
    setEditing(null);

    setForm({
      name: '',
      description: '',
      categoryId: '',
      brandId: '',
      subcategoryId: '',
      price: '',
      stock: '',
      values: '',
      image: null,
    });

    setShowForm(true);
  }

  function edit(item) {
    setError('');
    setSuccess('');
    setFormError('');
    setDeleteError('');
    setEditing(item);

    const values = Array.isArray(item?.values)
      ? item.values
          .map((value) =>
            typeof value === 'object'
              ? value?.value ?? value?.name
              : value,
          )
          .filter(Boolean)
          .join(', ')
      : item?.values ?? '';

    setForm({
      name: item?.name ?? item?.title ?? '',
      description: item?.description ?? '',
      categoryId:
        item?.categoryId ?? item?.category?.id ?? '',
      brandId:
        item?.brandId ?? item?.brand?.id ?? '',
      subcategoryId:
        item?.subcategoryId ?? item?.subcategory?.id ?? '',
      price: item?.price ?? '',
      stock: item?.stock ?? item?.quantity ?? '',
      values,
      image: null,
    });

    setShowForm(true);
  }

  // Shop ownership and role checks remain in place.
  function canManage(item) {
    return catalogActions(item, {
      isAdmin: admin,
      shopId: user?.shop?.id,
      supportsActive: section !== 'attributes',
    }).editEnabled;
  }

  function actionReason(item) {
    return catalogActions(item, {
      isAdmin: admin,
      shopId: user?.shop?.id,
      supportsActive: section !== 'attributes',
    }).reason;
  }

  // CREATE / UPDATE
  async function save(event) {
    event.preventDefault();

    setFormError('');
    setSuccess('');

    if (!form.name.trim()) {
      setFormError(
        `Please enter a ${config.singular.toLowerCase()} name.`,
      );
      return;
    }

    if (
      section === 'subcategories' &&
      !form.categoryId
    ) {
      setFormError('Please select a parent category.');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
      };

      if (section === 'subcategories') {
        payload.categoryId = form.categoryId;
      }

      if (section === 'attributes') {
        payload.code = form.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_|_$/g, '');

        payload.values = form.values
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean)
          .filter(
            (value, index, all) =>
              all.findIndex(
                (entry) =>
                  entry.toLowerCase() ===
                  value.toLowerCase(),
              ) === index,
          );
      }

      if (section === 'products') {
        payload.categoryId = form.categoryId || null;
        payload.subcategoryId =
          form.subcategoryId || null;
        payload.brandId = form.brandId || null;

        if (form.price !== '') {
          payload.price = Number(form.price);
        }

        if (form.stock !== '') {
          payload.stock = Number(form.stock);
        }
      }

      let savedItem;

      if (editing) {
        const response = await api.patch(
          `${endpoint}/${getId(editing)}`,
          payload,
        );

        savedItem = unwrap(response);
      } else {
        const response = await api.post(
          endpoint,
          payload,
        );

        savedItem = unwrap(response);
      }

      const savedId =
        getId(savedItem) ?? getId(editing);

      if (form.image && savedId) {
        const data = new FormData();
        data.append('image', form.image);

        await api.post(
          `${endpoint}/${savedId}/image`,
          data,
        );
      }

      const wasEditing = Boolean(editing);

      resetForm();

      setSuccess(
        wasEditing
          ? `${config.singular} updated successfully.`
          : `${config.singular} created successfully.`,
      );

      await Promise.all([
        loadItems(),
        loadPending(),
      ]);
    } catch (err) {
      setFormError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  // ACTIVATE / DEACTIVATE
  async function toggleStatus(item) {
    const id = getId(item);

    if (!id) {
      setError(
        'Unable to update status: record ID is missing.',
      );
      return;
    }

    const actions = catalogActions(item, {
      isAdmin: admin,
      shopId: user?.shop?.id,
      supportsActive: section !== 'attributes',
    });

    // Super Admin can toggle categories, subcategories and brands.
    // Other users must pass the existing catalog permission checks.
    if (!adminCanToggle && !actions.statusEnabled) {
      setError(
        actions.reason ||
          'You do not have permission to change this status.',
      );
      return;
    }

    if (updatingStatusId !== null) return;

    const nextActive = !isActive(item);

    setUpdatingStatusId(id);
    setError('');
    setSuccess('');

    try {
      await api.patch(`${endpoint}/${id}`, {
        isActive: nextActive,
      });

      // Update the UI immediately.
      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          String(getId(currentItem)) === String(id)
            ? {
                ...currentItem,
                isActive: nextActive,
                active: nextActive,
                is_active: nextActive,
              }
            : currentItem,
        ),
      );

      setSuccess(
        `${getName(item)} is now ${
          nextActive ? 'active' : 'inactive'
        }.`,
      );

      // Reload the backend data to confirm the saved value.
      await loadItems();
    } catch (err) {
      setError(getError(err));
      await loadItems();
    } finally {
      setUpdatingStatusId(null);
    }
  }

  // DELETE
  async function remove() {
    if (!deleting) return;

    setSaving(true);
    setDeleteError('');
    setSuccess('');

    try {
      await api.delete(
        `${endpoint}/${getId(deleting)}`,
      );

      setDeleting(null);

      setSuccess(
        `${config.singular} deleted successfully.`,
      );

      await Promise.all([
        loadItems(),
        loadPending(),
      ]);
    } catch (err) {
      setDeleteError(getError(err));
    } finally {
      setSaving(false);
    }
  }

  // SUPER ADMIN APPROVAL
  async function review(item, decision) {
    if (!admin) return;

    const id = getId(item);

    if (!id) {
      setError('This pending record has no ID.');
      return;
    }

    let reason;

    if (decision === 'reject') {
      reason = window.prompt(
        'Enter a reason for rejection:',
      );

      if (reason === null) return;

      if (!reason.trim()) {
        setError(
          'Please enter a rejection reason.',
        );
        return;
      }
    }

    setReviewingId(id);
    setError('');
    setSuccess('');

    try {
      const path = config.plural;

      const url =
        `/admin/catalog/${path}/${id}/${decision}`;

      if (decision === 'reject') {
        await api.post(url, {
          reason: reason.trim(),
        });
      } else {
        await api.post(url);
      }

      setSuccess(
        decision === 'approve'
          ? 'Catalog record approved.'
          : 'Catalog record rejected.',
      );

      await Promise.all([
        loadPending(),
        loadItems(),
      ]);
    } catch (err) {
      setError(getError(err));
    } finally {
      setReviewingId(null);
    }
  }

  const imageUrl = (item) =>
    item?.imageUrl ??
    item?.image_url ??
    item?.image ??
    '';

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {config.title}
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage {config.title.toLowerCase()} for your catalog.
          </p>
        </div>

        {canCreate && (
          <Button onClick={openCreate}>
            + Add {config.singular}
          </Button>
        )}
      </div>

      {/* PAGE-LEVEL ERROR */}
      {error && (
        <Alert
          variant="error"
          onClose={() => setError('')}
        >
          {error}
        </Alert>
      )}

      {/* SUCCESS NOTIFICATION */}
      {success && (
        <Alert
          kind="success"
          onClose={() => setSuccess('')}
        >
          {success}
        </Alert>
      )}

      {/* MAIN CONTENT */}
      <Card>
        <div className="space-y-4 p-4 sm:p-5">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {config.title}
              </h2>

              <p className="text-sm text-gray-500">
                Total records: {filteredItems.length}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {admin && (
                <button
                  type="button"
                  onClick={() => setShowPendingModal(true)}
                  className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Pending Approval ({pendingItems.length})
                </button>
              )}

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={`Search ${config.title.toLowerCase()}...`}
                className={`${inputClass} sm:w-64`}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-4 py-12 text-center">
              <p className="font-medium text-gray-700">
                No {config.title.toLowerCase()} found
              </p>

              {canCreate && (
                <p className="mt-1 text-sm text-gray-500">
                  Use the Add {config.singular} button to create one.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">
                        Name
                      </th>

                      {section === 'subcategories' && (
                        <th className="px-4 py-3">
                          Category
                        </th>
                      )}

                      {section === 'products' && (
                        <>
                          <th className="px-4 py-3">
                            Price
                          </th>

                          <th className="px-4 py-3">
                            Stock
                          </th>
                        </>
                      )}

                      <th className="px-4 py-3">
                        Description / Values
                      </th>

                      <th className="px-4 py-3 text-center">
                        Status
                      </th>

                      <th className="px-4 py-3 text-center">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {visibleItems.map((item) => {
                      const categoryName =
                        item?.category?.name ??
                        categories.find(
                          (category) =>
                            String(getId(category)) ===
                            String(item?.categoryId),
                        )?.name ??
                        '';

                      const values = Array.isArray(
                        item?.values,
                      )
                        ? item.values
                            .map((value) =>
                              typeof value === 'object'
                                ? value?.value ?? value?.name
                                : value,
                            )
                            .filter(Boolean)
                            .join(', ')
                        : item?.values ??
                          item?.description ??
                          '';

                      const actions = catalogActions(item, {
                        isAdmin: admin,
                        shopId: user?.shop?.id,
                        supportsActive:
                          section !== 'attributes',
                      });

                      const id = getId(item);

                      const showStatusToggle =
                        adminCanToggle ||
                        (
                          !admin &&
                          actions.statusEnabled &&
                          canUpdate
                        );

                      const isUpdating =
                        String(updatingStatusId) ===
                        String(id);

                      return (
                        <tr
                          key={id}
                          className="hover:bg-gray-50"
                        >
                          {/* NAME */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              {imageUrl(item) ? (
                                <img
                                  src={imageUrl(item)}
                                  alt={getName(item)}
                                  className="h-10 w-10 rounded-lg border object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 font-semibold text-gray-500">
                                  {getName(item)
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>
                              )}

                              <div>
                                <p className="font-medium text-gray-900">
                                  {getName(item)}
                                </p>

                                <p className="text-xs text-gray-500">
                                  ID: {id ?? ''}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* CATEGORY */}
                          {section === 'subcategories' && (
                            <td className="px-4 py-4 text-gray-700">
                              {categoryName}
                            </td>
                          )}

                          {/* PRODUCT PRICE AND STOCK */}
                          {section === 'products' && (
                            <>
                              <td className="px-4 py-4">
                                {item?.price ?? '—'}
                              </td>

                              <td className="px-4 py-4">
                                {item?.stock ??
                                  item?.quantity ??
                                  ''}
                              </td>
                            </>
                          )}

                          {/* DESCRIPTION / VALUES */}
                          <td className="max-w-xs px-4 py-4 text-gray-600">
                            <span className="line-clamp-2">
                              {values}
                            </span>
                          </td>

                          {/* STATUS WITH TOGGLE */}
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-center gap-2">
                              <StatusBadge item={item} />

                              {showStatusToggle && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleStatus(item)
                                  }
                                  disabled={
                                    updatingStatusId !== null
                                  }
                                  aria-label={`Change ${getName(item)} status`}
                                  aria-pressed={isActive(item)}
                                  title={
                                    isActive(item)
                                      ? 'Deactivate'
                                      : 'Activate'
                                  }
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                                    isActive(item)
                                      ? 'bg-green-600'
                                      : 'bg-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                      isActive(item)
                                        ? 'translate-x-6'
                                        : 'translate-x-1'
                                    }`}
                                  />
                                </button>
                              )}

                              {isUpdating && (
                                <span className="text-xs text-gray-500">
                                  Updating...
                                </span>
                              )}
                            </div>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-4 py-4">
                            {(admin ||
                              (
                                isPending(item) &&
                                (canUpdate || canDelete)
                              )) && (
                              <div className="flex flex-wrap justify-center gap-2">
                                {(admin || canUpdate) && (
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={() => {
                                      if (
                                        admin ||
                                        canManage(item)
                                      ) {
                                        edit(item);
                                      } else {
                                        setError(
                                          actionReason(item),
                                        );
                                      }
                                    }}
                                  >
                                    Edit
                                  </Button>
                                )}

                                {(admin || canDelete) && (
                                  <Button
                                    type="button"
                                    variant="danger"
                                    onClick={() => {
                                      if (
                                        admin ||
                                        canManage(item)
                                      ) {
                                        setDeleting(item);
                                        setDeleteError('');
                                        setSuccess('');
                                      } else {
                                        setError(
                                          actionReason(item),
                                        );
                                      }
                                    }}
                                  >
                                    Delete
                                  </Button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(
                    page * PAGE_SIZE,
                    filteredItems.length,
                  )}{' '}
                  of {filteredItems.length}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.max(1, current - 1),
                      )
                    }
                    disabled={page <= 1}
                    className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setPage((current) =>
                        Math.min(
                          totalPages,
                          current + 1,
                        ),
                      )
                    }
                    disabled={page >= totalPages}
                    className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <Modal
          title={`${editing ? 'Edit' : 'Add'} ${config.singular}`}
          onClose={resetForm}
          busy={saving}
        >
          <form onSubmit={save} className="space-y-4">

            {formError && (
              <Alert>{formError}</Alert>
            )}

            {/* NAME */}
          {/* PARENT CATEGORY - SHOW FIRST */}
{section === 'subcategories' && (
  <Field label="Parent Category *">
    <select
      required
      value={form.categoryId}
      onChange={(event) => {
        setForm((current) => ({
          ...current,
          categoryId: event.target.value,
        }));

        if (formError) {
          setFormError('');
        }
      }}
      className={inputClass}
      disabled={saving}
    >
      <option value="">Select parent category</option>

      {categories.map((category) => (
        <option
          key={getId(category)}
          value={getId(category)}
        >
          {getName(category)}
        </option>
      ))}
    </select>
  </Field>
)}

{/* NAME - SHOW BELOW PARENT CATEGORY */}
<Field label="Name *">
  <input
    required
    value={form.name}
    onChange={(event) => {
      setForm((current) => ({
        ...current,
        name: event.target.value,
      }));

      if (formError) {
        setFormError('');
      }
    }}
    className={inputClass}
    disabled={saving}
    maxLength={100}
    placeholder="Enter subcategory name"
  />
</Field>
            

            {/* PRODUCT FIELDS */}
            {section === 'products' && (
              <>
                <Field label="Category">
                  <select
                    value={form.categoryId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                    className={inputClass}
                    disabled={saving}
                  >
                    <option value="">
                      Select category
                    </option>

                    {categories.map((category) => (
                      <option
                        key={getId(category)}
                        value={getId(category)}
                      >
                        {getName(category)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Price">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        price: event.target.value,
                      }))
                    }
                    className={inputClass}
                    disabled={saving}
                  />
                </Field>

                <Field label="Stock">
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        stock: event.target.value,
                      }))
                    }
                    className={inputClass}
                    disabled={saving}
                  />
                </Field>
              </>
            )}

            {/* ATTRIBUTE VALUES */}
            {section === 'attributes' && (
              <Field label="Values (comma-separated)">
                <textarea
                  rows={3}
                  value={form.values}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      values: event.target.value,
                    }))
                  }
                  className={inputClass}
                  placeholder="Small, Medium, Large"
                  disabled={saving}
                />
              </Field>
            )}

            {/* DESCRIPTION */}
            <Field label="Description">
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className={inputClass}
                disabled={saving}
              />
            </Field>

            {/* IMAGE */}
            <Field label="Image (optional)">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    image:
                      event.target.files?.[0] ?? null,
                  }))
                }
                className={inputClass}
                disabled={saving}
              />

              {editing &&
                imageUrl(editing) &&
                !form.image && (
                  <img
                    src={imageUrl(editing)}
                    alt={`Current ${config.singular.toLowerCase()} image`}
                    className="mt-2 h-16 w-16 rounded-lg border object-cover"
                  />
                )}
            </Field>

            {/* FORM ACTIONS */}
            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                loading={saving}
                disabled={
                  saving || !form.name.trim()
                }
              >
                {saving
                  ? 'Saving...'
                  : editing
                    ? 'Save Changes'
                    : `Create ${config.singular}`}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleting && (
        <Modal
          title={`Delete ${config.singular}`}
          onClose={() => {
            setDeleting(null);
            setDeleteError('');
          }}
          busy={saving}
        >
          <div className="space-y-4">
            <p className="text-sm leading-6 text-gray-600">
              Are you sure you want to delete{' '}
              <strong className="text-gray-900">
                {getName(deleting)}
              </strong>
              ? This action cannot be undone.
            </p>

            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              Deleting this record may affect related catalog data.
            </div>

            {deleteError && (
              <Alert>{deleteError}</Alert>
            )}

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleting(null);
                  setDeleteError('');
                }}
                disabled={saving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="danger"
                loading={saving}
                disabled={saving}
                onClick={remove}
              >
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* SUPER ADMIN APPROVAL MODAL */}
      {showPendingModal && admin && (
        <Modal
          title={`Pending ${config.title} (${pendingItems.length})`}
          onClose={() => setShowPendingModal(false)}
          wide
          busy={reviewingId !== null}
        >
          {pendingItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No pending {config.title.toLowerCase()} for approval.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => {
                const id = getId(item);

                return (
                  <div
                    key={id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold">
                        {getName(item)}
                      </p>

                      <p className="text-sm text-gray-500">
                        Shop:{' '}
                        {item?.shop?.name ??
                          item?.shopName ??
                          item?.submittedByShop?.name ??
                          'Not specified'}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {item?.description ||
                          'No description provided'}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          review(item, 'approve')
                        }
                        disabled={reviewingId === id}
                      >
                        {reviewingId === id
                          ? 'Please wait...'
                          : 'Approve'}
                      </Button>

                      <Button
                        variant="danger"
                        onClick={() =>
                          review(item, 'reject')
                        }
                        disabled={reviewingId === id}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

