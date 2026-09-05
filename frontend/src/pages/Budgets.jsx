import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { getCategories } from "../api/categories";
import { getBudgets, createBudget, updateBudget, deleteBudget } from "../api/budgets";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_STYLES = {
  within_budget: { bar: "bg-brand-500", badge: "bg-brand-50 text-brand-700", label: "On track" },
  near_limit: { bar: "bg-amber-500", badge: "bg-amber-50 text-amber-700", label: "Near limit" },
  exceeded: { bar: "bg-red-500", badge: "bg-red-50 text-red-700", label: "Exceeded" },
};

export default function Budgets() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ category_id: "", amount: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [cats, buds] = await Promise.all([
        getCategories("expense"),
        getBudgets(month, year),
      ]);
      setCategories(cats);
      setBudgets(buds);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load budgets");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await createBudget({
        category_id: form.category_id,
        amount: parseFloat(form.amount),
        month,
        year,
      });
      setForm({ category_id: "", amount: "" });
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save budget");
    }
  }

  async function handleAmountEdit(budget) {
    const next = prompt(`New monthly amount for ${budget.category_name}:`, budget.amount);
    if (next === null) return;
    const amount = parseFloat(next);
    if (Number.isNaN(amount) || amount <= 0) return;
    await updateBudget(budget.id, amount);
    loadData();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this budget?")) return;
    await deleteBudget(id);
    loadData();
  }

  const usedCategoryIds = new Set(budgets.map((b) => b.category_id));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id));

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">🎯 Budgets</h1>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            + Add Budget
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Category</label>
            <select
              required
              value={form.category_id}
              onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Select category</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Monthly limit (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <button type="submit" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
            Save
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
        </form>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : budgets.length === 0 ? (
          <p className="text-gray-400">No budgets set for {MONTH_NAMES[month - 1]} {year} yet.</p>
        ) : (
          budgets.map((b) => {
            const style = STATUS_STYLES[b.status];
            const pct = Math.min(b.percent_used, 100);
            return (
              <div key={b.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{b.category_name}</p>
                    <p className="text-xs text-gray-500">
                      ₹{b.spent.toLocaleString("en-IN")} of ₹{b.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${style.badge}`}>
                    {style.label}
                  </span>
                </div>

                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full ${style.bar}`} style={{ width: `${pct}%` }} />
                </div>

                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>{b.percent_used}% used</span>
                  <span>
                    {b.status === "exceeded"
                      ? `Over by ₹${Math.abs(b.remaining).toLocaleString("en-IN")}`
                      : `₹${b.remaining.toLocaleString("en-IN")} left`}
                  </span>
                </div>

                <div className="mt-3 flex gap-3 text-xs">
                  <button onClick={() => handleAmountEdit(b)} className="text-brand-600 hover:underline">
                    Edit limit
                  </button>
                  <button onClick={() => handleDelete(b.id)} className="text-red-600 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
