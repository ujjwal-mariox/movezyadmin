import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import { AlertTriangle, Bell, X } from "lucide-react";

/**
 * Admin alerts (client feedback, 2026-11-12): new bookings, SOS, support
 * replies, partners waiting for verification, payout requests, enquiries.
 *
 * One provider feeds both the header bell and the sidebar counts. The server
 * only returns (and only pushes) the sections the signed-in admin's role can
 * open, so role-based visibility needs nothing here beyond showing what comes
 * back. Opening a section's page marks that section's alerts read for this
 * admin.
 */

export interface AdminAlert {
  _id: string;
  section: string;
  type: string;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  link: string;
  at: string;
  read: boolean;
}

export const SECTION_LABELS: Record<string, string> = {
  orders: "Orders",
  sos: "SOS",
  support: "Support",
  "website-enquiries": "Website enquiries",
  riders: "Drivers",
  compliance: "Documents",
  payouts: "Payouts",
  enterprises: "Enterprise",
};

interface AlertsState {
  alerts: AdminAlert[];
  counts: Record<string, number>;
  total: number;
  sections: string[];
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (opts: { ids?: string[]; section?: string; all?: boolean }) => Promise<void>;
}

const AlertsContext = createContext<AlertsState | null>(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const POLL_MS = 60_000;

/** Plain fetch: a lapsed token must not pop a dialog every poll. */
const call = async (path: string, init: RequestInit = {}) => {
  const token = localStorage.getItem("adminToken");
  if (!token) return null;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  return body?.data ?? null;
};

export const AdminAlertsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sections, setSections] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<AdminAlert | null>(null);
  const toastTimer = useRef<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    try {
      const [list, c] = await Promise.all([
        call("/admin/alerts?limit=40"),
        call("/admin/alerts/counts"),
      ]);
      if (list) setAlerts(list.alerts || []);
      if (c) {
        setCounts(c.counts || {});
        setSections(c.sections || []);
      }
    } catch {
      // Offline or server restarting: the next poll catches up.
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(
    async (opts: { ids?: string[]; section?: string; all?: boolean }) => {
      // Update the view first so the badge clears immediately.
      setAlerts((prev) =>
        prev.map((a) =>
          opts.all ||
          (opts.section && a.section === opts.section) ||
          (opts.ids && opts.ids.includes(a._id))
            ? { ...a, read: true }
            : a,
        ),
      );
      setCounts((prev) => {
        if (opts.all) return Object.fromEntries(Object.keys(prev).map((k) => [k, 0]));
        if (opts.section) return { ...prev, [opts.section]: 0 };
        return prev;
      });
      await call("/admin/alerts/read", {
        method: "PUT",
        body: JSON.stringify(opts),
      }).catch(() => null);
      if (opts.ids) void refresh();
    },
    [refresh],
  );

  // First load + fallback poll (the socket is the live channel).
  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(t);
  }, [refresh]);

  // Live: the server pushes only to the rooms of sections this role can open.
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;
    const origin = API_URL.replace(/\/v1\/api\/?$/, "");
    let socket: Socket | null = null;
    try {
      socket = io(origin, {
        transports: ["websocket", "polling"],
        auth: { token },
        forceNew: true,
        reconnection: true,
      });
      socket.on("admin:alert", (a: AdminAlert) => {
        setAlerts((prev) => [a, ...prev.filter((x) => x._id !== a._id)].slice(0, 40));
        setCounts((prev) => ({ ...prev, [a.section]: (prev[a.section] || 0) + 1 }));
        setToast(a);
        if (toastTimer.current) window.clearTimeout(toastTimer.current);
        toastTimer.current = window.setTimeout(
          () => setToast(null),
          a.severity === "critical" ? 15_000 : 6_000,
        );
        // A folded repeat replaces an existing row; recount from the server.
        window.setTimeout(() => void refresh(), 1500);
      });
    } catch (e) {
      console.warn("[alerts] socket init failed", e);
    }
    return () => {
      socket?.off("admin:alert");
      socket?.disconnect();
    };
  }, [refresh]);

  // Opening a section's page reads its alerts.
  const openSection = location.pathname.match(/^\/admin\/([a-z-]+)/)?.[1];
  const openCount = openSection ? counts[openSection] || 0 : 0;
  useEffect(() => {
    if (openSection && openCount > 0) void markRead({ section: openSection });
  }, [openSection, openCount, markRead]);

  const total = useMemo(
    () => Object.values(counts).reduce((a, b) => a + b, 0),
    [counts],
  );

  const value = useMemo(
    () => ({ alerts, counts, total, sections, loading, refresh, markRead }),
    [alerts, counts, total, sections, loading, refresh, markRead],
  );

  return (
    <AlertsContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] w-80 max-w-[calc(100vw-2rem)]">
          <div
            role="status"
            className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg ${
              toast.severity === "critical" ? "border-red-300" : "border-gray-200"
            }`}
          >
            <div
              className={`mt-0.5 rounded-lg p-1.5 ${
                toast.severity === "critical"
                  ? "bg-red-100 text-red-600"
                  : toast.severity === "warning"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-movezy-100 text-movezy-600"
              }`}
            >
              {toast.severity === "info" ? (
                <Bell className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
            </div>
            <button
              className="min-w-0 flex-1 text-left"
              onClick={() => {
                setToast(null);
                void markRead({ ids: [toast._id] });
                navigate(toast.link);
              }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                {SECTION_LABELS[toast.section] || toast.section}
              </p>
              <p className="text-sm font-semibold text-gray-800">{toast.title}</p>
              {toast.message && (
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">{toast.message}</p>
              )}
            </button>
            <button
              onClick={() => setToast(null)}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </AlertsContext.Provider>
  );
};

export const useAdminAlerts = (): AlertsState => {
  const ctx = useContext(AlertsContext);
  if (!ctx) {
    return {
      alerts: [],
      counts: {},
      total: 0,
      sections: [],
      loading: false,
      refresh: async () => {},
      markRead: async () => {},
    };
  }
  return ctx;
};

/** "just now", "5 min ago", "3 h ago", "12 Nov". */
export const timeAgo = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
