


import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api.js';
import {
  Alert,
  Button,
  Card,
  Input,
  Spinner,
} from '../../components/ui.jsx';

export function ShopCategories() {
  const [items, setItems] = useState(null);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);

  // Separate errors for each operation
  const [pageError, setPageError] = useState('');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    try {
      setPageError('');

      const data = await api.get('/admin/shop-categories');
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setPageError(
        err.response?.data?.error ||
        err.message ||
        'Unable to load shop categories.'
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving && deletingId === null) {
        closeAddModal();
        setEditing(null);
        setDeleting(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saving, deletingId]);

  const getErrorMessage = (err, fallback) => {
    return (
      err.response?.data?.details?.name?.[0] ||
      err.response?.data?.error ||
      err.details?.name?.[0] ||
      err.message ||
      fallback
    );
  };

  const openAddModal = () => {
    setName('');
    setAddError('');
    setNotice('');
    setShowAddModal(true);
  };

  const closeAddModal = () => {
    if (saving) return;

    setShowAddModal(false);
    setName('');
    setAddError('');
  };

  const add = async (event) => {
    event.preventDefault();

    const categoryName = name.trim();

    if (!categoryName) {
      setAddError('Please enter a category name.');
      return;
    }

    setAddError('');
    setNotice('');
    setSaving(true);

    try {
      await api.post('/admin/shop-categories', {
        name: categoryName,
      });

      setShowAddModal(false);
      setName('');
      setNotice('Shop category created successfully.');

      await load();
    } catch (err) {
      setAddError(
        getErrorMessage(err, 'Unable to create shop category.')
      );
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (category) => {
    setEditing({
      id: category.id,
      name: category.name || '',
    });

    setEditError('');
    setNotice('');
  };

  const save = async (event) => {
    event.preventDefault();

    if (!editing) return;

    const categoryName = editing.name.trim();

    if (!categoryName) {
      setEditError('Please enter a category name.');
      return;
    }

    setEditError('');
    setNotice('');
    setSaving(true);

    try {
      await api.patch(`/admin/shop-categories/${editing.id}`, {
        name: categoryName,
      });

      setEditing(null);
      setNotice('Shop category updated successfully.');

      await load();
    } catch (err) {
      setEditError(
        getErrorMessage(err, 'Unable to update shop category.')
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!deleting) return;

    setDeleteError('');
    setNotice('');
    setDeletingId(deleting.id);

    try {
      await api.delete(`/admin/shop-categories/${deleting.id}`);

      setDeleting(null);
      setNotice('Shop category deleted successfully.');

      await load();
    } catch (err) {
      setDeleteError(
        getErrorMessage(
          err,
          'Unable to delete category. It may be assigned to a shop.'
        )
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Filter categories by name
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return items || [];

    return (items || []).filter((category) =>
      String(category.name || '').toLowerCase().includes(query)
    );
  }, [items, search]);

  const total = items?.length ?? 0;

  return (
    <div className="w-full space-y-5">

      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">

        <h1 className="text-xl font-semibold text-slate-900">
          Shop Categories
        </h1>

        <Button type="button" onClick={openAddModal}>
          + Add Category
        </Button>

      </div>

      {/* PAGE-LEVEL ERRORS */}
      {pageError && (
        <Alert>{pageError}</Alert>
      )}

      {/* SUCCESS NOTIFICATION */}
      {notice && (
        <Alert kind="success">{notice}</Alert>
      )}

      {/* CATEGORY LIST */}
      <Card className="overflow-hidden rounded-xl border border-slate-200 bg-white p-0 shadow-sm">

        {/* ALL CATEGORIES HEADING + SEARCH */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">

          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              All categories
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {items === null
                ? 'Loading categories...'
                : `${filteredItems.length} of ${total} ${
                    total === 1 ? 'category' : 'categories'
                  }`}
            </p>
          </div>

          {/* SEARCH INPUT */}
          <div className="w-full sm:w-56">
            <Input
              placeholder="Search categories..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

        </div>

        {/* LOADING */}
        {items === null ? (
          <div className="flex justify-center p-10">
            <Spinner />
          </div>

        ) : filteredItems.length === 0 ? (

          /* EMPTY STATE */
          <div className="px-4 py-10 text-center">

            <p className="text-sm font-semibold text-slate-800">
              {search.trim()
                ? 'No matching categories found'
                : 'No categories yet'}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {search.trim()
                ? 'Try searching with a different category name.'
                : 'Click Add Category to create your first category.'}
            </p>

          </div>

        ) : (

          /* CATEGORY ITEMS */
          <div className="divide-y divide-slate-100">

            {filteredItems.map((category) => (

              <div
                key={category.id}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 font-semibold text-indigo-700">
                    {String(category.name || '?')
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="min-w-0">

                    <p className="break-words text-sm font-medium text-slate-800">
                      {category.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Category ID: {category.id}
                    </p>

                  </div>

                </div>

                <div className="flex gap-2">

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => openEditModal(category)}
                  >
                    Edit
                  </Button>

                  <Button
                    type="button"
                    variant="danger"
                    disabled={deletingId !== null}
                    onClick={() => {
                      setDeleting(category);
                      setDeleteError('');
                      setNotice('');
                    }}
                  >
                    Delete
                  </Button>

                </div>

              </div>

            ))}

          </div>
        )}

      </Card>

      {/* ADD CATEGORY MODAL */}
      {showAddModal && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeAddModal();
            }
          }}
        >

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-category-title"
            className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >

            <div className="mb-5 flex items-start justify-between gap-3">

              <div>

                <h2
                  id="add-category-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Add Shop Category
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Enter a name for the new category.
                </p>

              </div>

              <button
                type="button"
                onClick={closeAddModal}
                disabled={saving}
                aria-label="Close popup"
                className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>

            </div>

            <form onSubmit={add} className="space-y-5">

              {addError && (
                <Alert>{addError}</Alert>
              )}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Category Name <span className="text-red-500">*</span>
                </label>

                <Input
                  placeholder="e.g. Electronics, Clothing, Grocery"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (addError) setAddError('');
                  }}
                  maxLength={100}
                  required
                  disabled={saving}
                />

              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeAddModal}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  loading={saving}
                  disabled={saving || !name.trim()}
                >
                  {saving ? 'Adding...' : 'Create Category'}
                </Button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* EDIT CATEGORY MODAL */}
      {editing && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-category-title"
            className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >

            <h2
              id="edit-category-title"
              className="text-lg font-semibold text-slate-900"
            >
              Edit Category
            </h2>

            <p className="mb-5 mt-1 text-sm text-slate-500">
              Update the category name.
            </p>

            <form onSubmit={save} className="space-y-5">

              {editError && (
                <Alert>{editError}</Alert>
              )}

              <div>

                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Category Name
                </label>

                <Input
                  value={editing.name}
                  onChange={(event) => {
                    setEditing({
                      ...editing,
                      name: event.target.value,
                    });

                    if (editError) setEditError('');
                  }}
                  maxLength={100}
                  required
                  disabled={saving}
                />

              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!saving) {
                      setEditing(null);
                      setEditError('');
                    }
                  }}
                  disabled={saving}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  loading={saving}
                  disabled={saving || !editing.name.trim()}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>

              </div>

            </form>

          </div>

        </div>

      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleting && (

        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px]">

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
            className="my-auto w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6"
          >

            <h2
              id="delete-category-title"
              className="text-lg font-semibold text-slate-900"
            >
              Delete Category?
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">

              Are you sure you want to delete{' '}

              <span className="font-semibold text-slate-900">
                {deleting.name}
              </span>
              ?

            </p>

            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
              A category assigned to a shop may not be deletable.
            </p>

            {deleteError && (
              <div className="mt-4">
                <Alert>{deleteError}</Alert>
              </div>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleting(null);
                  setDeleteError('');
                }}
                disabled={deletingId !== null}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="danger"
                loading={deletingId === deleting.id}
                disabled={deletingId !== null}
                onClick={remove}
              >
                Delete Category
              </Button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}

export default ShopCategories;
