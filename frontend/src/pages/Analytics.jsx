import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from "recharts";
import Layout from "../components/Layout";
import { getAnalyticsOverview } from "../api/analytics";

const COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#fbbf24", "#f59e0b", "#ef4444"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Analytics() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await getAnalyticsOverview(month, year));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">📈 Analytics</h1>
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
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading || !data ? (
        <p className="mt-6 text-gray-400">Loading...</p>
      ) : (
        <>
          {/* Summary strip */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">Highest Category</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {data.highest_category ? data.highest_category.category_name : "—"}
              </p>
              {data.highest_category && (
                <p className="text-xs text-gray-400">{inr(data.highest_category.amount)}</p>
              )}
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">Income vs Expenses</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {inr(data.income_vs_expenses.income)} / {inr(data.income_vs_expenses.expenses)}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">Month-over-Month</p>
              <p className={`mt-1 text-xl font-semibold ${
                data.month_over_month_change_percent > 0 ? "text-red-500" : "text-brand-600"
              }`}>
                {data.month_over_month_change_percent === null
                  ? "—"
                  : `${data.month_over_month_change_percent > 0 ? "+" : ""}${data.month_over_month_change_percent}%`}
              </p>
              <p className="text-xs text-gray-400">vs last month's spending</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="text-sm text-gray-500">🔮 Predicted Month-End</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {inr(data.prediction.predicted_month_end_spending)}
              </p>
              <p className="text-xs text-gray-400">
                {inr(data.prediction.average_daily_spending)}/day avg over {data.prediction.days_elapsed} days
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Category pie */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="mb-3 font-medium text-gray-900">Category Breakdown</p>
              {data.category_breakdown.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400">No expenses this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={data.category_breakdown}
                      dataKey="amount"
                      nameKey="category_name"
                      outerRadius={90}
                      label={(entry) => entry.category_name}
                    >
                      {data.category_breakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category bar */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
              <p className="mb-3 font-medium text-gray-900">Spending by Category (₹)</p>
              {data.category_breakdown.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400">No expenses this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data.category_breakdown} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="category_name" type="category" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => inr(v)} />
                    <Bar dataKey="amount" fill="#059669" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Monthly trend (income vs expenses, last 6 months) */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
              <p className="mb-3 font-medium text-gray-900">Income vs Expenses — Last 6 Months</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly_trend}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => inr(v)} />
                  <Legend />
                  <Bar dataKey="income" fill="#10b981" name="Income" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" name="Expenses" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Daily spending line */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-2">
              <p className="mb-3 font-medium text-gray-900">Daily Spending This Month</p>
              {data.daily_spending.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-400">No expenses recorded yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.daily_spending}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => inr(v)} />
                    <Line type="monotone" dataKey="amount" stroke="#059669" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
