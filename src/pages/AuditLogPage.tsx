import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  AlertTriangle,
  Download,
  Undo2,
  Eye,
  List as ListIcon,
  Clock,
  Monitor,
  Globe,
  X,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { PAGE_SIZE_OPTIONS, type PageSize } from "../hooks/usePagination";
import {
  fetchAuditLogs,
  fetchAuditStats,
  revertAuditLog,
  type AuditLogEntry,
  type AuditStats,
  type AuditImpactLevel,
} from "../services/api";

const MODULE_ICONS: Record<string, React.ElementType> = {
  auth: Shield,
  users: User,
  drivers: Truck,
  bookings: FileText,
  payments: CreditCard,
  settings: Settings,
  reports: FileText,
  orders: FileText,
  config: Settings,
};

const MODULE_TONES: Record<string, string> = {
  auth: "bg-purple-50 text-purple-700 border-purple-200",
  users: "bg-blue-50 text-blue-700 border-blue-200",
  drivers: "bg-emerald-50 text-emerald-700 border-emerald-200",
  bookings: "bg-indigo-50 text-indigo-700 border-indigo-200",
  orders: "bg-indigo-50 text-indigo-700 border-indigo-200",
  payments: "bg-amber-50 text-amber-700 border-amber-200",
  settings: "bg-gray-50 text-gray-700 border-gray-200",
  config: "bg-gray-50 text-gray-700 border-gray-200",
  reports: "bg-cyan-50 text-cyan-700 border-cyan-200",
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

type ImpactLevel = AuditImpactLevel;

const impactFromAction = (action: string): ImpactLevel => {
  switch ((action || "").toUpperCase()) {
    case "DELETE":
    case "BLOCK":
    case "CONFIG_CHANGE":
    case "REFUND":
      return "CRITICAL";
    case "UPDATE":
    case "REJECT":
    case "APPROVE":
    case "UNBLOCK":
      return "HIGH";
    case "CREATE":
    case "VERIFY":
    case "EXPORT":
      return "MEDIUM";
    default:
      return "LOW";
  }
};

const impactTone: Record<ImpactLevel, string> = {
  CRITICAL: "bg-red-50 text-red-700 border-red-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
  LOW: "bg-green-50 text-green-700 border-green-200",
};

const impactDot: Record<ImpactLevel, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-yellow-500",
  LOW: "bg-green-500",
};

interface SuspiciousFlag {
  reason: string;
}

const detectSuspicious = (log: AuditLogEntry, all: AuditLogEntry[]): SuspiciousFlag | null => {
  const action = (log.action || "").toUpperCase();
  // Off-hours destructive action (outside 07:00-22:00 local)
  const hour = new Date(log.createdAt).getHours();
  if ((action === "DELETE" || action === "BLOCK" || action === "CONFIG_CHANGE") && (hour < 7 || hour >= 22)) {
    return { reason: "Destructive action performed outside business hours" };
  }
  // Burst of same action by same admin within 5 mins
  const t = new Date(log.createdAt).getTime();
  const burst = all.filter(
    (l) =>
      l._id !== log._id &&
      l.adminId === log.adminId &&
      l.action === log.action &&
      Math.abs(new Date(l.createdAt).getTime() - t) < 5 * 60 * 1000,
  );
  if (burst.length >= 3) {
    return { reason: `${burst.length + 1}× ${log.action} in < 5 minutes by same admin` };
  }
  // New IP for admin (first time we see this pair in window)
  const sameAdmin = all.filter((l) => l.adminId === log.adminId);
  const ips = new Set(sameAdmin.map((l) => l.ipAddress).filter(Boolean));
  if (ips.size > 2 && log.ipAddress) {
    return { reason: "Admin logged from multiple IPs recently" };
  }
  return null;
};

const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [impactFilter, setImpactFilter] = useState<"" | ImpactLevel>("");
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [reverting, setReverting] = useState(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetchAuditLogs({
          page,
          limit,
          search: search || undefined,
          module: moduleFilter || undefined,
          action: actionFilter || undefined,
          impactLevel: impactFilter || undefined,
        }),
        fetchAuditStats(),
      ]);
      setLogs(logsRes.data?.logs || []);
      setTotalPages(logsRes.data?.pagination?.pages || 1);
      setStats(statsRes.data);
    } catch (err) {
      console.error("Audit logs error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, search, moduleFilter, actionFilter, impactFilter, limit]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const formatTimeShort = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  const filteredLogs = useMemo(() => logs, [logs]);

  // Health metrics
  const health = useMemo(() => {
    const critical = logs.filter(
      (l) => (l.impactLevel || impactFromAction(l.action)) === "CRITICAL",
    ).length;
    const suspicious = logs.filter((l) => detectSuspicious(l, logs)).length;
    return {
      actionsToday: stats?.totalToday ?? logs.length,
      critical: stats?.criticalToday ?? critical,
      suspicious,
      recentExports: stats?.recentExports?.length ?? logs.filter((l) => l.action === "EXPORT").length,
    };
  }, [logs, stats]);

  const handleExport = (format: "csv" | "pdf") => {
    const rows = filteredLogs.map((l) => ({
      time: formatTime(l.createdAt),
      admin: l.adminName,
      email: l.adminEmail,
      action: l.action,
      module: l.module,
      description: l.description,
      ip: l.ipAddress,
      impact: impactFromAction(l.action),
    }));
    if (format === "csv") {
      const header = Object.keys(rows[0] || {}).join(",");
      const body = rows.map((r) => Object.values(r).map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const blob = new Blob([header + "\n" + body], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      window.print();
    }
  };

  const handleRevert = async (log: AuditLogEntry) => {
    if (log.revertedAt) {
      alert("This entry has already been reverted.");
      return;
    }
    if (
      !confirm(
        `Revert action "${log.action}" on ${log.module}? A compensating audit entry will be created.`,
      )
    ) {
      return;
    }
    const reason = prompt("Reason for revert (optional)") || undefined;
    setReverting(true);
    try {
      const res = await revertAuditLog(log._id, reason);
      if (res?.success === false || res?.data?.success === false) {
        alert(res?.message || res?.data?.message || "Revert failed");
      } else {
        alert("Compensating audit entry created.");
        loadLogs();
      }
    } catch (err) {
      alert((err as Error).message || "Revert failed");
    } finally {
      setReverting(false);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <History className="w-7 h-7 text-movezy-500" />
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Full accountability trail — impact level, before/after state, user trace and suspicious activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "table" ? "bg-white text-movezy-600 shadow-sm" : "text-gray-500"
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              Table
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === "timeline" ? "bg-white text-movezy-600 shadow-sm" : "text-gray-500"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Timeline
            </button>
          </div>
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <FileText className="w-3.5 h-3.5" />
            PDF
          </button>
          <button onClick={loadLogs} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Health Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Actions Today</p>
              <p className="mt-1 text-2xl font-bold text-blue-600">{health.actionsToday}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-red-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Critical Events</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{health.critical}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-red-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-purple-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suspicious</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">{health.suspicious}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Exports</p>
              <p className="mt-1 text-2xl font-bold text-amber-600">{health.recentExports}</p>
            </div>
            <div className="flex items-center justify-center w-10 h-10 bg-amber-50 rounded-lg">
              <Download className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

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
        <select
          value={impactFilter}
          onChange={(e) => setImpactFilter(e.target.value as "" | ImpactLevel)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-movezy-500"
        >
          <option value="">All Impact</option>
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as ImpactLevel[]).map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
      </div>

      {/* Logs Body */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-movezy-600" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <History className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">No audit logs found</p>
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Time</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Impact</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Admin</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Module</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Trace</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const ModIcon = MODULE_ICONS[log.module] || FileText;
                  const tone = MODULE_TONES[log.module] || "bg-gray-50 text-gray-700 border-gray-200";
                  const impact = log.impactLevel || impactFromAction(log.action);
                  const suspicious = detectSuspicious(log, logs);
                  return (
                    <tr
                      key={log._id}
                      className={`border-b border-gray-50 hover:bg-gray-50 ${suspicious ? "bg-purple-50/30" : ""}`}
                    >
                      <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{formatTime(log.createdAt)}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${impactTone[impact]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${impactDot[impact]}`} />
                          {impact}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-800 text-xs">{log.adminName}</p>
                        <p className="text-[11px] text-gray-400">{log.adminEmail}</p>
                        {log.adminRole && (
                          <p className="text-[10px] text-gray-500 mt-0.5">Role: {log.adminRole}</p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${tone}`}>
                          <ModIcon className="w-3 h-3" />
                          {log.module}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600 max-w-xs truncate">
                        {log.description}
                        {suspicious && (
                          <div className="flex items-center gap-1 mt-1">
                            <ShieldAlert className="w-3 h-3 text-purple-600" />
                            <span className="text-[10px] font-semibold text-purple-700">{suspicious.reason}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5 text-[10px] text-gray-500">
                          <span className="flex items-center gap-1 font-mono">
                            <Globe className="w-3 h-3" />
                            {log.ipAddress || "—"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Monitor className="w-3 h-3" />
                            {log.device || log.userAgent?.split(" ")[0] || "Web"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-movezy-600"
                            title="View before/after"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {["UPDATE", "DELETE", "BLOCK", "CONFIG_CHANGE", "CHANGE_ROLE", "CHANGE_STATUS"].includes(log.action) && !log.revertedAt && (
                            <button
                              onClick={() => handleRevert(log)}
                              disabled={reverting}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 disabled:opacity-40"
                              title="Revert action"
                            >
                              <Undo2 className="w-4 h-4" />
                            </button>
                          )}
                          {log.revertedAt && (
                            <span className="text-[10px] font-medium text-gray-400 px-1.5" title="Already reverted">
                              reverted
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {filteredLogs.map((log) => {
              const ModIcon = MODULE_ICONS[log.module] || FileText;
              const impact = log.impactLevel || impactFromAction(log.action);
              const suspicious = detectSuspicious(log, logs);
              return (
                <div key={log._id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${impactDot[impact]}`} />
                    <div className="flex-1 w-px bg-gray-200 mt-1" />
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeShort(log.createdAt)}
                      <span>·</span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${impactTone[impact]}`}>
                        {impact}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${MODULE_TONES[log.module] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                        <ModIcon className="w-3 h-3" />
                        {log.module}
                      </span>
                      {suspicious && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200">
                          <ShieldAlert className="w-3 h-3" />
                          Suspicious
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium mr-2 ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-700"}`}>
                        {log.action}
                      </span>
                      {log.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      by <span className="font-medium text-gray-700">{log.adminName}</span>
                      {log.adminRole && <span> · {log.adminRole}</span>}
                      {log.ipAddress && <span> · {log.ipAddress}</span>}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-[11px] font-medium text-movezy-600 hover:text-movezy-700"
                      >
                        View before / after
                      </button>
                      {["UPDATE", "DELETE", "BLOCK", "CONFIG_CHANGE", "CHANGE_ROLE", "CHANGE_STATUS"].includes(log.action) && !log.revertedAt && (
                        <button
                          onClick={() => handleRevert(log)}
                          disabled={reverting}
                          className="text-[11px] font-medium text-amber-600 hover:text-amber-700 disabled:opacity-50"
                        >
                          Revert
                        </button>
                      )}
                      {log.revertedAt && (
                        <span className="text-[11px] font-medium text-gray-400">Already reverted</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filteredLogs.length > 0 && (
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

      {/* Before / After Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-movezy-500" />
                  Change Detail
                </h3>
                <p className="text-xs text-gray-500 mt-1">{selectedLog.description}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Trace */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Admin</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedLog.adminName}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Role</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedLog.adminRole || "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Device</p>
                <p className="text-sm font-medium text-gray-800 mt-0.5">{selectedLog.device || selectedLog.userAgent?.split(" ")[0] || "Web"}</p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">IP</p>
                <p className="text-sm font-mono text-gray-800 mt-0.5">{selectedLog.ipAddress || "—"}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide mb-2">Before</p>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
{JSON.stringify(
  selectedLog.before ??
    (selectedLog.changes?.length
      ? Object.fromEntries(selectedLog.changes.map((c) => [c.field, c.oldValue]))
      : { info: "No prior state recorded" }),
  null,
  2,
)}
                </pre>
              </div>
              <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-2">After</p>
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-words">
{JSON.stringify(
  selectedLog.after ??
    (selectedLog.changes?.length
      ? Object.fromEntries(selectedLog.changes.map((c) => [c.field, c.newValue]))
      : (selectedLog.metadata ?? { info: "No post state recorded" })),
  null,
  2,
)}
                </pre>
              </div>
            </div>

            {selectedLog.revertedAt && (
              <div className="mt-4 p-3 text-xs text-gray-600 bg-gray-100 rounded-lg">
                This entry was reverted on {formatTime(selectedLog.revertedAt as string)}.
              </div>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setSelectedLog(null)} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">Close</button>
              {["UPDATE", "DELETE", "BLOCK", "CONFIG_CHANGE", "CHANGE_ROLE", "CHANGE_STATUS"].includes(selectedLog.action) && !selectedLog.revertedAt && (
                <button
                  disabled={reverting}
                  onClick={() => {
                    const l = selectedLog;
                    setSelectedLog(null);
                    handleRevert(l);
                  }}
                  className="flex items-center gap-1 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
                >
                  <Undo2 className="w-4 h-4" />
                  {reverting ? "Reverting..." : "Revert Action"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;
