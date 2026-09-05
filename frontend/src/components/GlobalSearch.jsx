import { useEffect, useRef, useState } from "react";
import { listTransactions } from "../api/transactions";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleChange(e) {
    const value = e.target.value;
    setQuery(value);

    clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await listTransactions("/transactions", { search: value, page_size: 8 });
        setResults(res.items);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

  return (
    <div className="relative w-full max-w-xs" ref={ref}>
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => query && setOpen(true)}
        placeholder="Search transactions... (e.g. Amazon)"
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      {open && (
        <div className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-xl bg-white p-2 shadow-lg ring-1 ring-gray-100">
          {loading ? (
            <p className="px-2 py-3 text-center text-sm text-gray-400">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-3 text-center text-sm text-gray-400">No matches for "{query}"</p>
          ) : (
            results.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-gray-50">
                <div>
                  <p className="text-gray-800">{t.description || t.category_name || "—"}</p>
                  <p className="text-xs text-gray-400">{t.date} · {t.category_name || "Uncategorized"}</p>
                </div>
                <span className={t.type === "income" ? "text-brand-600" : "text-red-500"}>
                  {t.type === "income" ? "+" : "-"}{inr(t.amount)}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
