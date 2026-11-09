import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from "../../components/ui.jsx";

const dash = "—";
const blank = {
  shopId: "",
  name: "",
  email: "",
  phone: "",
  role: "sales_associate",
  status: "active",
  designation: "",
  employeeCode: "",
  address: "",
  joinedDate: new Date().toISOString().slice(0, 10),
  salaryType: "monthly",
  baseSalary: "0",
  password: "",
};
const roles = [
  "shop_manager",
  "sales_associate",
  "delivery_associate",
  "cashier",
  "support",
];

export default function ManageEmployees() {
  const [shops, setShops] = useState([]);
  const [shopId, setShopId] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/admin/shops?page=1&pageSize=100")
      .then((data) => setShops(data.items || []))
      .catch((e) => setError(e.message));
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (shopId) params.set("shopId", shopId);
      if (query.trim()) params.set("q", query.trim());
      const response = await api.get(
        `/admin/employees${params.size ? `?${params}` : ""}`,
      );
      setItems(response.items || []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [shopId, query]);
  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  const shown = useMemo(
    () => items.filter((item) => !statusFilter || item.status === statusFilter),
    [items, statusFilter],
  );
  const startCreate = () => {
    setEditingId(null);
    setForm({ ...blank, shopId: shopId || String(shops[0]?.id || "") });
    setError("");
    setModal(true);
  };
  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      ...blank,
      shopId: String(item.shop?.id || ""),
      name: item.name,
      email: item.email,
      phone: item.phone || "",
      role: item.role,
      status: item.status,
      designation: item.profile?.designation || "",
      employeeCode: item.profile?.employeeCode || "",
      address: item.profile?.address || "",
      joinedDate: String(item.profile?.joinedDate || "").slice(0, 10),
      salaryType: item.profile?.salaryType || "monthly",
      baseSalary: String(item.profile?.baseSalary || "0"),
      password: "",
    });
    setError("");
    setModal(true);
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const body = { ...form, baseSalary: Number(form.baseSalary) };
      if (editingId) {
        delete body.shopId;
        delete body.password;
        delete body.salaryType;
        delete body.baseSalary;
        await api.patch(`/admin/employees/${editingId}`, body);
        setNotice("Employee updated.");
      } else {
        await api.post("/admin/employees", body);
        setNotice("Employee created.");
      }
      setModal(false);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  const remove = async (item) => {
    if (
      !window.confirm(
        `Delete ${item.name}? Employees with attendance or payroll history can only be deactivated.`,
      )
    )
      return;
    setError("");
    try {
      await api.delete(`/admin/employees/${item.id}`);
      setNotice(`${item.name} deleted.`);
      await load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <PageHeader
        title="Manage Employees"
        subtitle="Create and manage employee accounts across shops."
        actions={
          <Button type="button" onClick={startCreate}>
            Create Employee
          </Button>
        }
      />
      {error && <Alert>{error}</Alert>}
      {notice && <Alert kind="success">{notice}</Alert>}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="w-64">
          <Select
            aria-label="Filter employees by shop"
            value={shopId}
            onChange={(e) => setShopId(e.target.value)}
          >
            <option value="">All shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-80 max-w-full">
          <Input
            aria-label="Search employees"
            placeholder="Search name, email, or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>
      {loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Shop</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Designation</th>
                <th className="px-4 py-3">Salary</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((employee) => {
                const profile = employee.profile;
                return (
                  <tr key={employee.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-xs text-slate-500">
                        {employee.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">{employee.phone || dash}</td>
                    <td className="px-4 py-3">{employee.shop?.name || dash}</td>
                    <td className="px-4 py-3">
                      {employee.role.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={employee.status === "active" ? "green" : "amber"}
                      >
                        {employee.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {profile?.designation || dash}
                    </td>
                    <td className="px-4 py-3">
                      {profile
                        ? `${profile.salaryType} · ${Number(profile.baseSalary).toLocaleString()}`
                        : dash}
                    </td>
                    <td className="px-4 py-3">{profile?.joinedDate || dash}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => startEdit(employee)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => remove(employee)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {shown.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No employees found for this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      )}
      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !saving) setModal(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-title"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl"
          >
            {/* <h2 id="employee-title" className="mb-4 text-lg font-semibold">
              {editingId ? "Edit employee" : "Create employee"}
            </h2> */}
            <div className="mb-5 flex items-center justify-between border-b pb-3">
  <h2 id="employee-title" className="text-lg font-semibold">
    {editingId ? 'Edit employee' : 'Create employee'}
  </h2>

  <button
    type="button"
    onClick={() => !saving && setModal(false)}
    disabled={saving}
    aria-label="Close employee form"
    title="Close"
    className="flex h-9 w-9 items-center justify-center rounded-full text-2xl text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
  >
    ×
  </button>
</div>
            <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
              {!editingId && (
                <Field label="Shop" required>
                  <Select
                    required
                    value={form.shopId}
                    onChange={(e) =>
                      setForm({ ...form, shopId: e.target.value })
                    }
                  >
                    <option value="">Select shop</option>
                    {shops.map((shop) => (
                      <option key={shop.id} value={shop.id}>
                        {shop.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field label="Name" required>
                <Input
                  required
                  minLength={2}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="Email" required>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>
              <Field label="Role" required>
                <Select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role.replace(/_/g, " ")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
              <Field label="Designation">
                <Input
                  value={form.designation}
                  onChange={(e) =>
                    setForm({ ...form, designation: e.target.value })
                  }
                />
              </Field>
              <Field label="Employee code">
                <Input
                  value={form.employeeCode}
                  onChange={(e) =>
                    setForm({ ...form, employeeCode: e.target.value })
                  }
                />
              </Field>
              <Field label="Joining date">
                <Input
                  type="date"
                  value={form.joinedDate}
                  onChange={(e) =>
                    setForm({ ...form, joinedDate: e.target.value })
                  }
                />
              </Field>
              <Field label="Address">
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </Field>
              {!editingId && (
                <>
                  <Field label="Salary type">
                    <Select
                      value={form.salaryType}
                      onChange={(e) =>
                        setForm({ ...form, salaryType: e.target.value })
                      }
                    >
                      <option value="monthly">Monthly</option>
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                    </Select>
                  </Field>
                  <Field label="Base salary">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.baseSalary}
                      onChange={(e) =>
                        setForm({ ...form, baseSalary: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Initial password" required>
                    <Input
                      type="password"
                      required
                      minLength={8}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
              <div className="col-span-full flex justify-end gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => setModal(false)}
                >
                  Cancel
                </Button>
                <Button loading={saving}>
                  {saving
                    ? "Saving…"
                    : editingId
                      ? "Save changes"
                      : "Create employee"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
