import { useEffect, useRef, useState } from "react";
import {
  getNotifications,
  generateNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../api/notifications";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    // Generate fresh notifications once per app load, then load the list.
    generateNotifications()
      .then((data) => {
        setItems(data.items);
        setUnreadCount(data.unread_count);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function refresh() {
    const data = await getNotifications();
    setItems(data.items);
    setUnreadCount(data.unread_count);
  }

  async function handleRead(id) {
    await markNotificationRead(id);
    refresh();
  }

  async function handleReadAll() {
    await markAllNotificationsRead();
    refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-gray-100">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-900">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={handleReadAll} className="text-xs text-brand-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 space-y-1 overflow-y-auto">
            {items.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">You're all caught up.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.is_read && handleRead(n.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    n.is_read ? "text-gray-400" : "bg-brand-50 text-gray-800"
                  }`}
                >
                  {n.message}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
