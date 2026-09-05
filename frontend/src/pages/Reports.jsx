import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import { getReportSummary, downloadReportPdf, downloadReportCsv } from "../api/reports";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_LABELS = {
  within_budget: "Within Budget",
  near_limit: "Near Limit",
  exceeded: "Exceeded",
};

export default function Reports() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState("");
  const [error, setError] = useState("");

  const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setReport(await getReportSummary(month, year));
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDownload(type) {
    setDownloading(type);
    try {
      if (type === "pdf") await downloadReportPdf(month, year);
      else await downloadReportCsv(month, year);
    } catch (err) {
      setError("Download failed");
    } finally {
      setDownloading("");
    }
  }

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">📄 Financial Reports</h1>
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

      {loading || !report ? (
        <p className="mt-6 text-gray-400">Loading...</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={() => handleDownload("pdf")}
              disabled={downloading === "pdf"}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {downloading === "pdf" ? "Preparing PDF..." : "⬇ Download PDF"}
            </button>
            <button
              onClick={() => handleDownload("csv")}
              disabled={downloading === "csv"}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {downloading === "csv" ? "Preparing CSV..." : "⬇ Download CSV"}
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{report.label} Financial Report</h2>

            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Income</p>
                <p className="text-lg font-medium text-gray-900">{inr(report.total_income)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-lg font-medium text-gray-900">{inr(report.total_expenses)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Savings</p>
                <p className={`text-lg font-medium ${report.savings >= 0 ? "text-brand-600" : "text-red-500"}`}>
                  {inr(report.savings)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Highest Category</p>
                <p className="text-lg font-medium text-gray-900">
                  {report.highest_category ? report.highest_category.category_name : "—"}
                </p>
                {report.highest_category && (
                  <p className="text-xs text-gray-400">{inr(report.highest_category.amount)}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Subscriptions</p>
                <p className="text-lg font-medium text-gray-900">{inr(report.subscriptions_monthly_total)}</p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-gray-900">Spending by Category</p>
              {report.category_breakdown.length === 0 ? (
                <p className="text-sm text-gray-400">No expenses recorded.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {report.category_breakdown.map((c) => (
                      <tr key={c.category_id}>
                        <td className="py-2 text-gray-700">{c.category_name}</td>
                        <td className="py-2 text-right text-gray-700">{inr(c.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Budget status */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-gray-900">Budget Status</p>
              {report.budgets.length === 0 ? (
                <p className="text-sm text-gray-400">No budgets set this month.</p>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-gray-500">
                    <tr>
                      <th className="py-1">Category</th>
                      <th className="py-1 text-right">Budget</th>
                      <th className="py-1 text-right">Spent</th>
                      <th className="py-1 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.budgets.map((b, i) => (
                      <tr key={i}>
                        <td className="py-2 text-gray-700">{b.category_name}</td>
                        <td className="py-2 text-right text-gray-700">{inr(b.budget_amount)}</td>
                        <td className="py-2 text-right text-gray-700">{inr(b.spent)}</td>
                        <td className={`py-2 text-right font-medium ${
                          b.status === "exceeded" ? "text-red-600" : b.status === "near_limit" ? "text-amber-600" : "text-brand-600"
                        }`}>
                          {STATUS_LABELS[b.status]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
