import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import {
  getSubscriptions,
  createSubscription,
  cancelSubscription,
  deleteSubscription,
} from "../api/subscriptions";

const emptyForm = {
  name: "",
  amount: "",
  frequency: "monthly",
  next_payment_date: new Date().toISOString().slice(0, 10),
};

export default function Subscriptions() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showCancelled, setShowCancelled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getSubscriptions());
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await createSubscription({
        name: form.name,
        amount: parseFloat(form.amount),
        frequency: form.frequency,
        next_payment_date: form.next_payment_date,
      });
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save subscription");
    }
  }

  async function handleCancel(id) {
    if (!confirm("Mark this subscription as cancelled?")) return;
    await cancelSubscription(id);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this subscription permanently?")) return;
    await deleteSubscription(id);
    load();
  }

  if (loading || !summary) {
    return (
      <Layout>
        <p className="text-gray-400">Loading...</p>
      </Layout>
    );
  }

  const visibleSubs = summary.subscriptions.filter((s) =>
    showCancelled ? true : s.status === "active"
  );

  return (
    <Layout>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">🔄 Subscriptions</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          + Add Subscription
        </button>
      </div>

      {/* Totals */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Monthly total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            ₹{summary.monthly_total.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Yearly total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            ₹{summary.yearly_total.toLocaleString("en-IN")}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Active</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.active_count}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Cancelled</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{summary.cancelled_count}</p>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Name</label>
            <input
              required
              placeholder="Netflix"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Frequency</label>
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Next payment</label>
            <input
              type="date"
              required
              value={form.next_payment_date}
              onChange={(e) => setForm({ ...form, next_payment_date: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
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

      <div className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          id="showCancelled"
          checked={showCancelled}
          onChange={(e) => setShowCancelled(e.target.checked)}
        />
        <label htmlFor="showCancelled" className="text-gray-600">Show cancelled subscriptions</label>
      </div>

      <div className="mt-3 space-y-3">
        {visibleSubs.length === 0 ? (
          <p className="text-gray-400">No subscriptions to show.</p>
        ) : (
          visibleSubs.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100"
            >
              <div>
                <p className="font-medium text-gray-900">
                  {s.name}{" "}
                  {s.status === "cancelled" && (
                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      Cancelled
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  ₹{s.amount.toLocaleString("en-IN")} / {s.frequency}
                  {s.status === "active" && (
                    <>
                      {" · "}
                      {s.days_until_renewal < 0
                        ? "renewal overdue"
                        : s.days_until_renewal === 0
                        ? "renews today"
                        : `renews in ${s.days_until_renewal} day${s.days_until_renewal === 1 ? "" : "s"}`}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <p className="text-sm font-medium text-gray-700">
                  ₹{s.monthly_equivalent.toLocaleString("en-IN")}/mo
                </p>
                {s.status === "active" && (
                  <button onClick={() => handleCancel(s.id)} className="text-xs text-amber-600 hover:underline">
                    Cancel
                  </button>
                )}
                <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}
