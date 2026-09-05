import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { getCategories } from "../api/categories";
import {
  listTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../api/transactions";

const emptyForm = {
  amount: "",
  category_id: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  payment_method: "",
};

/**
 * Shared list + add/edit/delete UI for a single transaction type.
 * Income.jsx and Expenses.jsx just render <TransactionManager type="income" .../>
 * with different labels/colors — same component, same backend shape.
 */
export default function TransactionManager({ type, title, icon, accentClass }) {
  const basePath = type === "income" ? "/income" : "/expenses";

  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const loadCategories = useCallback(async () => {
    const cats = await getCategories(type);
    setCategories(cats);
  }, [type]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await listTransactions(basePath, {
        search: search || undefined,
        category_id: categoryFilter || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
        page,
        page_size: pageSize,
      });
      setItems(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [basePath, search, categoryFilter, sortBy, sortDir, page]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const payload = {
      type,
      amount: parseFloat(form.amount),
      category_id: form.category_id || null,
      description: form.description || null,
      date: form.date,
      payment_method: form.payment_method || null,
    };
    try {
      if (editingId) {
        await updateTransaction(basePath, editingId, payload);
      } else {
        await createTransaction(basePath, payload);
      }
      resetForm();
      loadTransactions();
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed");
    }
  }

  function startEdit(item) {
    setForm({
      amount: item.amount,
      category_id: item.category_id || "",
      description: item.description || "",
      date: item.date,
      payment_method: item.payment_method || "",
    });
    setEditingId(item.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this entry?")) return;
    await deleteTransaction(basePath, id);
    loadTransactions();
  }

  function toggleSort(field) {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            {icon} {title}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{total} entries</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${accentClass}`}
        >
          + Add {type === "income" ? "Income" : "Expense"}
        </button>
      </div>

      {/* Search & filter bar */}
      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search description..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => {
            setPage(1);
            setCategoryFilter(e.target.value);
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Add / edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 sm:grid-cols-2 lg:grid-cols-5"
        >
          <input
            type="number"
            step="0.01"
            required
            placeholder="Amount (₹)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Category (optional)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            placeholder="Payment method"
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />

          <div className="col-span-full flex gap-2">
            <button type="submit" className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${accentClass}`}>
              {editingId ? "Save changes" : "Add"}
            </button>
            <button type="button" onClick={resetForm} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {/* Table */}
      <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("date")}>
                Date {sortBy === "date" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Payment</th>
              <th className="cursor-pointer px-4 py-3" onClick={() => toggleSort("amount")}>
                Amount {sortBy === "amount" && (sortDir === "asc" ? "↑" : "↓")}
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Loading...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No entries yet.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{item.date}</td>
                  <td className="px-4 py-3">{item.category_name || "—"}</td>
                  <td className="px-4 py-3">{item.description || "—"}</td>
                  <td className="px-4 py-3">{item.payment_method || "—"}</td>
                  <td className="px-4 py-3 font-medium">₹{item.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(item)} className="mr-3 text-brand-600 hover:underline">Edit</button>
                    <button onClick={() => handleDelete(item.id)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-gray-500">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-gray-300 px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </Layout>
  );
}
