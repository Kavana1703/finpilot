import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";
import GlobalSearch from "./GlobalSearch";

const links = [
  { to: "/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/income", label: "Income", icon: "💵" },
  { to: "/expenses", label: "Expenses", icon: "💸" },
  { to: "/budgets", label: "Budgets", icon: "🎯" },
  { to: "/subscriptions", label: "Subscriptions", icon: "🔄" },
  { to: "/bills", label: "Bill Splitter", icon: "👥" },
  { to: "/analytics", label: "Analytics", icon: "📈" },
  { to: "/reports", label: "Reports", icon: "📄" },
];

// A compact subset shown in the mobile bottom bar — the full list still
// lives in the slide-out menu behind the hamburger icon.
const MOBILE_QUICK_LINKS = links.slice(0, 4);

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 flex-col border-r border-gray-200 bg-white p-4 md:flex">
        <h1 className="mb-6 px-2 text-xl font-semibold text-gray-900">💰 FinPilot</h1>
        <nav className="flex-1 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <span>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-gray-200 pt-4">
          <p className="truncate px-2 text-sm text-gray-500">{user?.email}</p>
          <button
            onClick={logout}
            className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Mobile slide-out menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 space-y-1 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-lg font-semibold text-gray-900">💰 FinPilot</h1>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-500">✕</button>
            </div>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                <span>{link.icon}</span>
                {link.label}
              </NavLink>
            ))}
            <button
              onClick={logout}
              className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          </aside>
        </div>
      )}

      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-6">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Open menu"
          >
            ☰
          </button>
          <div className="hidden flex-1 md:block">
            <GlobalSearch />
          </div>
          <NotificationBell />
        </header>

        <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex border-t border-gray-200 bg-white md:hidden">
          {MOBILE_QUICK_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                  isActive ? "text-brand-600" : "text-gray-500"
                }`
              }
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
