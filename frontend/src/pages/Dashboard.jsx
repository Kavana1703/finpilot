import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from "recharts";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { getDashboardSummary } from "../api/dashboard";

const COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#fbbf24", "#f59e0b", "#ef4444"];

function Card({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const now = new Date();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getDashboardSummary(now.getMonth() + 1, now.getFullYear()));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const monthLabel = now.toLocaleString("default", { month: "long", year: "numeric" });
  const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <Layout>
      <h1 className="text-2xl font-semibold text-gray-900">
        Welcome back, {user?.name?.split(" ")[0]} 👋
      </h1>
      <p className="mt-1 text-gray-500">Here's how {monthLabel} looks so far.</p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {loading || !summary ? (
        <p className="mt-6 text-gray-400">Loading...</p>
      ) : (
        <>
          {/* Notifications */}
          {summary.notifications.length > 0 && (
            <div className="mt-4 space-y-2">
              {summary.notifications.map((n, i) => (
                <div key={i} className="rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  {n}
                </div>
              ))}
            </div>
          )}

          {/* Top cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="Monthly Income" value={inr(summary.total_income)} />
            <Card label="Monthly Expenses" value={inr(summary.total_expenses)} />
            <Card
              label="Current Balance"
              value={inr(summary.current_balance)}
              sub={summary.current_balance >= 0 ? "You're saving this month" : "Spending exceeds income"}
            />
            <Card
              label="Budget Remaining"
              value={inr(summary.budget_remaining)}
              sub={`of ${inr(summary.monthly_budget_total)} budgeted`}
            />
            <Card label="Subscriptions" value={inr(summary.subscriptions_monthly_total)} sub="per month" />
            <Card
              label="Predicted Spending"
              value={inr(summary.predicted_month_end_spending)}
              sub="by end of month"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Category breakdown pie */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-1">
              <p className="mb-2 font-medium text-gray-900">Spending by Category</p>
              {summary.spending_by_category.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">No expenses yet this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={summary.spending_by_category}
                      dataKey="amount"
                      nameKey="category_name"
                      innerRadius={50}
                      outerRadius={80}
                    >
                      {summary.spending_by_category.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => inr(v)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="mt-2 space-y-1">
                {summary.spending_by_category.slice(0, 5).map((c, i) => (
                  <div key={c.category_id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-gray-600">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {c.category_name}
                    </span>
                    <span className="text-gray-500">{inr(c.amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent transactions */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-1">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-gray-900">Recent Transactions</p>
                <Link to="/expenses" className="text-xs text-brand-600 hover:underline">View all</Link>
              </div>
              {summary.recent_transactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">No transactions yet.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {summary.recent_transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                      <div>
                        <p className="text-gray-800">{t.description || t.category_name || "—"}</p>
                        <p className="text-xs text-gray-400">{t.date}</p>
                      </div>
                      <span className={t.type === "income" ? "text-brand-600" : "text-red-500"}>
                        {t.type === "income" ? "+" : "-"}{inr(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming subscriptions */}
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gray-100 lg:col-span-1">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-medium text-gray-900">Upcoming Subscriptions</p>
                <Link to="/subscriptions" className="text-xs text-brand-600 hover:underline">View all</Link>
              </div>
              {summary.upcoming_subscriptions.length === 0 ? (
                <p className="py-10 text-center text-sm text-gray-400">Nothing renewing in the next 7 days.</p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {summary.upcoming_subscriptions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                      <p className="text-gray-800">{s.name}</p>
                      <div className="text-right">
                        <p className="text-gray-700">{inr(s.amount)}</p>
                        <p className="text-xs text-gray-400">
                          {s.days_until_renewal === 0 ? "today" : `in ${s.days_until_renewal}d`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-center">
            <Link to="/analytics" className="text-sm text-brand-600 hover:underline">
              See full analytics & trends →
            </Link>
          </div>
        </>
      )}
    </Layout>
  );
}
