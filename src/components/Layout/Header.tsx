import React, { useEffect, useRef, useState } from "react";
import { Menu, Bell, AlertTriangle, CheckCheck, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";
import { SECTION_LABELS, timeAgo, useAdminAlerts } from "./AdminAlerts";
import { useAuth } from "../../auth/useAuth";

interface HeaderProps {
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setIsMobileMenuOpen }) => {
  const navigate = useNavigate();
  const { canAccessModule } = useAuth();
  const { alerts, counts, total, sections, loading, markRead } = useAdminAlerts();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = filter ? alerts.filter((a) => a.section === filter) : alerts;
  // Chips only for sections that have something to show.
  const chipSections = sections.filter(
    (s) => (counts[s] || 0) > 0 || alerts.some((a) => a.section === s),
  );
  const badge = total > 99 ? "99+" : String(total);

  return (
    // z-[35]: above the pages' sticky toolbars (z-30) so the alerts dropdown
    // is not covered, below the mobile menu overlay (z-40).
    <header className="relative bg-white shadow-sm z-[35]">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-800"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Global Search Trigger */}
          <GlobalSearch />

          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setOpen((v) => !v)}
              className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              title="Notifications"
              aria-label={total > 0 ? `Notifications, ${total} unread` : "Notifications"}
              aria-expanded={open}
            >
              <Bell className="w-5 h-5" />
              {total > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold leading-[18px] text-white text-center ${
                    (counts.sos || 0) > 0 ? "bg-red-600" : "bg-movezy-600"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-[380px] max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Notifications</p>
                    <p className="text-xs text-gray-500">
                      {total > 0 ? `${total} unread` : "You're all caught up"}
                    </p>
                  </div>
                  {total > 0 && (
                    <button
                      onClick={() => void markRead({ all: true })}
                      className="flex items-center gap-1 text-xs font-medium text-movezy-600 hover:text-movezy-700"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Which section each alert is for; counts match the sidebar. */}
                {chipSections.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 px-4 py-2 border-b border-gray-100">
                    {[null, ...chipSections].map((s) => {
                      const active = filter === s;
                      const n = s ? counts[s] || 0 : total;
                      return (
                        <button
                          key={s || "all"}
                          onClick={() => setFilter(s)}
                          className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                            active
                              ? "bg-movezy-600 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {s ? SECTION_LABELS[s] || s : "All"}
                          {n > 0 && <span className="ml-1 opacity-80">{n}</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="max-h-[420px] overflow-y-auto">
                  {loading && shown.length === 0 ? (
                    <p className="px-4 py-8 text-sm text-center text-gray-400">Loading…</p>
                  ) : shown.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Bell className="w-8 h-8 mx-auto text-gray-300" />
                      <p className="mt-2 text-sm text-gray-500">No notifications yet</p>
                      <p className="text-xs text-gray-400">
                        New bookings, SOS, tickets and requests will show here.
                      </p>
                    </div>
                  ) : (
                    shown.map((a) => (
                      <button
                        key={a._id}
                        onClick={() => {
                          setOpen(false);
                          if (!a.read) void markRead({ ids: [a._id] });
                          navigate(a.link || `/admin/${a.section}`);
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                          a.read ? "" : "bg-movezy-50/60"
                        }`}
                      >
                        <span
                          className={`mt-0.5 shrink-0 rounded-lg p-1.5 ${
                            a.severity === "critical"
                              ? "bg-red-100 text-red-600"
                              : a.severity === "warning"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-movezy-100 text-movezy-600"
                          }`}
                        >
                          {a.severity === "info" ? (
                            <Bell className="w-3.5 h-3.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                              {SECTION_LABELS[a.section] || a.section}
                            </span>
                            <span className="text-[11px] text-gray-400 shrink-0">{timeAgo(a.at)}</span>
                          </span>
                          <span className={`block text-sm truncate ${a.read ? "text-gray-700" : "font-semibold text-gray-900"}`}>
                            {a.title}
                          </span>
                          {a.message && (
                            <span className="block text-xs text-gray-500 truncate">{a.message}</span>
                          )}
                        </span>
                        {!a.read && <span className="mt-2 w-2 h-2 shrink-0 rounded-full bg-movezy-500" />}
                      </button>
                    ))
                  )}
                </div>

                {/* The bell used to open the push sender; keep a way there. */}
                {canAccessModule("notifications") && (
                  <button
                    onClick={() => {
                      setOpen(false);
                      navigate("/admin/notifications");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Send a push notification to users or drivers
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
