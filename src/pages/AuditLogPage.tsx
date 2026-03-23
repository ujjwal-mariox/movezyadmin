import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  Shield,
  User,
  Settings,
  Truck,
  CreditCard,
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PAGE_SIZE_OPTIONS, type PageSize } from "../hooks/usePagination";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const getToken = () => localStorage.getItem("adminToken");

const fetchApi = async (endpoint: string) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
};

const MODULE_ICONS: Record<string, React.ElementType> = {
  auth: Shield,
  users: User,
  drivers: Truck,
  payments: CreditCard,
  settings: Settings,
  reports: FileText,
};

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-700",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  BLOCK: "bg-red-100 text-red-700",
  UNBLOCK: "bg-green-100 text-green-700",
  APPROVE: "bg-emerald-100 text-emerald-700",
  REJECT: "bg-red-100 text-red-700",
  LOGIN: "bg-purple-100 text-purple-700",
  LOGOUT: "bg-gray-100 text-gray-700",
  EXPORT: "bg-orange-100 text-orange-700",
  REFUND: "bg-yellow-100 text-yellow-700",
  VERIFY: "bg-teal-100 text-teal-700",
  CONFIG_CHANGE: "bg-indigo-100 text-indigo-700",
};

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (moduleFilter) params.set("module", moduleFilter);
      if (actionFilter) params.set("action", actionFilter);

      const [logsRes, statsRes] = await Promise.all([
        fetchApi(`/admin/audit-logs?${params}`),
        fetchApi("/admin/audit-logs/stats"),
      ]);
      setLogs(logsRes.data?.logs || []);
      setTotalPages(logsRes.data?.pagination?.pages || 1);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Audit logs error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, moduleFilter, actionFilter, limit]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-1">Complete accountability trail for all admin actions</p>
        </div>
        <button onClick={loadLogs} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg self-start">
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Actions Today</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.totalToday || 0}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Top Module (7d)</p>
            <p className="text-lg font-bold text-gray-800 mt-1">{stats.byModule?.[0]?._id || "—"}</p>
            <p className="text-xs text-gray-400">{stats.byModule?.[0]?.count || 0} actions</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Top Action (7d)</p>
            <p className="text-lg font-bold text-gray-800 mt-1">{stats.byAction?.[0]?._id || "—"}</p>
            <p className="text-xs text-gray-400">{stats.byAction?.[0]?.count || 0} times</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
            <p className="text-xs text-gray-500 font-medium">Recent Exports</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{stats.recentExports?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by description, admin name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-movezy-500 text-sm"
          />
        </div>
        <select
          value={moduleFilter}
          onChange={(e) => { setModuleFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-movezy-500"
        >
          <option value="">All Modules</option>
          {["auth", "users", "drivers", "bookings", "payments", "promos", "enterprises", "sos", "support", "staff", "roles", "settings", "vehicles", "notifications", "automation"].map((m) => (
            <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>
          ))}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-movezy-500"
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_COLORS).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-movezy-600" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <History className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Admin</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Module</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log: any) => {
                  const ModIcon = MODULE_ICONS[log.module] || FileText;
                  return (
                    <tr key={log._id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800 text-xs">{log.adminName}</p>
                        <p className="text-[11px] text-gray-400">{log.adminEmail}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <ModIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-xs text-gray-600">{log.module}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate">{log.description}</td>
                      <td className="py-3 px-4 text-xs text-gray-400 font-mono">{log.ipAddress || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-4">
              <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500">Show</label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value) as PageSize);
                    setPage(1);
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs"
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;
