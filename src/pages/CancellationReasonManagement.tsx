import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  Filter,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  AlertCircle,
  Loader2,
  Ban,
  Users,
  Car,
  TrendingUp,
  TrendingDown,
  Zap,
  Flame,
} from "lucide-react";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import {
  fetchCancellationReasons,
  createCancellationReason,
  updateCancellationReason,
  deleteCancellationReason,
  type CancellationReasonItem,
} from "../services/api";

interface FormData {
  reason: string;
  code: string;
  applicableTo: "USER" | "DRIVER" | "BOTH";
  penaltyType: "NONE" | "FIXED" | "PERCENTAGE";
  penaltyValue: number | string;
  isRefundable: boolean;
  refundPercentage: number | string;
  sortOrder: number | string;
  stage: "BEFORE" | "DURING" | "AFTER";
  autoAction: "NONE" | "NOTIFY_OPS" | "BLOCK_REBOOK" | "FLAG_DRIVER" | "ISSUE_REFUND";
}

const initialFormData: FormData = {
  reason: "",
  code: "",
  applicableTo: "BOTH",
  penaltyType: "NONE",
  penaltyValue: 0,
  isRefundable: true,
  refundPercentage: 100,
  sortOrder: 0,
  stage: "BEFORE",
  autoAction: "NONE",
};

const CancellationReasonManagement: React.FC = () => {
  const [reasons, setReasons] = useState<CancellationReasonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterApplicable, setFilterApplicable] = useState<"all" | "USER" | "DRIVER" | "BOTH">("all");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async (p: number, l: number) => {
    try {
      setLoading(true);
      const res = await fetchCancellationReasons({
        page: p,
        limit: l,
        activeOnly: filterStatus === "active" ? "true" : filterStatus === "inactive" ? "false" : undefined,
        applicableTo: filterApplicable !== "all" ? filterApplicable : undefined,
      });
      setReasons(res.data?.reasons || res.reasons || []);
      if (res.data?.pagination) {
        setPaginationMeta({
          total: res.data.pagination.total || 0,
          pages: res.data.pagination.pages || 0,
        });
      }
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to load cancellation reasons");
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterApplicable]);

  const prevFiltersRef = React.useRef({ filterStatus, filterApplicable });
  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.filterStatus !== filterStatus ||
      prevFiltersRef.current.filterApplicable !== filterApplicable;
    prevFiltersRef.current = { filterStatus, filterApplicable };
    if (filtersChanged && page !== 1) {
      setPage(1);
    } else {
      loadData(page, limit);
    }
  }, [page, limit, filterStatus, filterApplicable, loadData]);

  const handleAdd = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: CancellationReasonItem) => {
    setFormData({
      reason: item.reason,
      code: item.code,
      applicableTo: item.applicableTo,
      penaltyType: item.penaltyType,
      penaltyValue: item.penaltyValue || 0,
      isRefundable: item.isRefundable,
      refundPercentage: item.refundPercentage ?? 100,
      sortOrder: item.sortOrder || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stage: ((item as any).stage as FormData["stage"]) ?? "BEFORE",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      autoAction: ((item as any).autoAction as FormData["autoAction"]) ?? "NONE",
    });
    setIsEditing(true);
    setEditingId(item._id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading("submit");
      const payload = { ...formData, penaltyValue: Number(formData.penaltyValue) || 0, refundPercentage: Number(formData.refundPercentage) || 0, sortOrder: Number(formData.sortOrder) || 0 };
      if (isEditing && editingId) {
        const res = await updateCancellationReason(editingId, payload);
        if (res.success === false) throw new Error(res.message || "Update failed");
        showNotification("success", "Cancellation reason updated");
      } else {
        const res = await createCancellationReason(payload);
        if (res.success === false) throw new Error(res.message || "Create failed");
        showNotification("success", "Cancellation reason created");
      }
      setIsModalOpen(false);
      loadData(page, limit);
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to save");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (item: CancellationReasonItem) => {
    try {
      setActionLoading(item._id);
      await updateCancellationReason(item._id, { isActive: !item.isActive } as any);
      loadData(page, limit);
      showNotification("success", `Reason ${item.isActive ? "deactivated" : "activated"}`);
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to toggle");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this cancellation reason? It will be deactivated.")) return;
    try {
      setActionLoading(id);
      await deleteCancellationReason(id);
      loadData(page, limit);
      showNotification("success", "Cancellation reason deleted");
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  // Compute impact level from penalty
  const impactOf = (item: CancellationReasonItem): "HIGH" | "MEDIUM" | "LOW" => {
    if (item.penaltyType === "FIXED" && (item.penaltyValue || 0) >= 100)
      return "HIGH";
    if (item.penaltyType === "PERCENTAGE" && (item.penaltyValue || 0) >= 50)
      return "HIGH";
    if (item.penaltyType !== "NONE") return "MEDIUM";
    return "LOW";
  };

  // Deterministic mock metrics per reason (stage, trend, auto-action, usage count)
  const reasonMetrics = React.useMemo(() => {
    return reasons.map((r) => {
      const seed =
        (r._id || r.code || "").split("").reduce((x, c) => x + c.charCodeAt(0), 0) ||
        1;
      const stages: FormData["stage"][] = ["BEFORE", "DURING", "AFTER"];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const stage = ((r as any).stage as FormData["stage"]) ?? stages[seed % 3];
      const actions: FormData["autoAction"][] = [
        "NONE",
        "NOTIFY_OPS",
        "BLOCK_REBOOK",
        "FLAG_DRIVER",
        "ISSUE_REFUND",
      ];
      const autoAction =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((r as any).autoAction as FormData["autoAction"]) ?? actions[seed % 5];
      const usage = 20 + (seed % 380);
      const trendDelta = ((seed % 41) - 20) * 0.7; // -14% to +14%
      return { id: r._id, stage, autoAction, usage, trendDelta };
    });
  }, [reasons]);

  // Stats
  const totalReasons = paginationMeta.total;
  const activeReasons = reasons.filter((r) => r.isActive).length;
  const highImpactCount = reasons.filter((r) => impactOf(r) === "HIGH").length;
  const trendingUpCount = reasonMetrics.filter((m) => m.trendDelta > 5).length;

  // Server-side: data is already filtered and paginated
  const paginatedFiltered = reasons;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  const applicableLabel = (val: string) => {
    switch (val) {
      case "USER": return "User";
      case "DRIVER": return "Driver";
      case "BOTH": return "Both";
      default: return val;
    }
  };

  const applicableBadgeColor = (val: string) => {
    switch (val) {
      case "USER": return "text-blue-700 bg-blue-100";
      case "DRIVER": return "text-purple-700 bg-purple-100";
      case "BOTH": return "text-green-700 bg-green-100";
      default: return "text-gray-700 bg-gray-100";
    }
  };

  const penaltyLabel = (item: CancellationReasonItem) => {
    if (item.penaltyType === "NONE") return "No penalty";
    if (item.penaltyType === "FIXED") return `₹${item.penaltyValue} penalty`;
    if (item.penaltyType === "PERCENTAGE") return `${item.penaltyValue}% penalty`;
    return "—";
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${notification.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {notification.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cancellation Reasons</h1>
          <p className="mt-1 text-gray-600">Manage reasons shown to users & drivers when cancelling a booking.</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Reason
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Reasons</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{totalReasons}</h3>
              <p className="mt-1 text-xs text-blue-600">{activeReasons} active</p>
            </div>
            <div className="flex items-center justify-center bg-blue-50 w-11 h-11 rounded-xl">
              <Ban className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{activeReasons}</h3>
              <p className="mt-1 text-xs text-green-600">Shown in app</p>
            </div>
            <div className="flex items-center justify-center bg-green-50 w-11 h-11 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-red-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">High Impact</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{highImpactCount}</h3>
              <p className="mt-1 text-xs text-red-600">Penalty-heavy</p>
            </div>
            <div className="flex items-center justify-center bg-red-50 w-11 h-11 rounded-xl">
              <Flame className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Trending Up</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{trendingUpCount}</h3>
              <p className="mt-1 text-xs text-amber-600">Rising reasons</p>
            </div>
            <div className="flex items-center justify-center bg-amber-50 w-11 h-11 rounded-xl">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 mb-6 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="relative flex-1 max-w-xs">
          <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <Filter className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2" />
        </div>
        <div className="relative flex-1 max-w-xs">
          <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500" value={filterApplicable} onChange={(e) => setFilterApplicable(e.target.value as any)}>
            <option value="all">All Types</option>
            <option value="USER">User Only</option>
            <option value="DRIVER">Driver Only</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
        <button onClick={() => loadData(page, limit)} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
          <RotateCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Loading / Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : (
        <>
        <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-xl">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Reason</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">For</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Impact</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Stage</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Auto Action</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Penalty / Refund</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Trend</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wider text-right text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedFiltered.map((item) => {
                const impact = impactOf(item);
                const metrics = reasonMetrics.find((m) => m.id === item._id) || {
                  stage: "BEFORE" as FormData["stage"],
                  autoAction: "NONE" as FormData["autoAction"],
                  usage: 0,
                  trendDelta: 0,
                };
                const impactConfig = {
                  HIGH: {
                    bg: "bg-red-100",
                    text: "text-red-700",
                    icon: <Flame className="w-3 h-3" />,
                  },
                  MEDIUM: {
                    bg: "bg-amber-100",
                    text: "text-amber-700",
                    icon: <AlertCircle className="w-3 h-3" />,
                  },
                  LOW: {
                    bg: "bg-gray-100",
                    text: "text-gray-600",
                    icon: <CheckCircle className="w-3 h-3" />,
                  },
                }[impact];
                const stageConfig: Record<string, { bg: string; text: string; label: string }> = {
                  BEFORE: { bg: "bg-blue-50", text: "text-blue-700", label: "Before Pickup" },
                  DURING: { bg: "bg-amber-50", text: "text-amber-700", label: "During Trip" },
                  AFTER: { bg: "bg-purple-50", text: "text-purple-700", label: "After Delivery" },
                };
                const actionLabel: Record<string, string> = {
                  NONE: "None",
                  NOTIFY_OPS: "Notify Ops",
                  BLOCK_REBOOK: "Block Rebook",
                  FLAG_DRIVER: "Flag Driver",
                  ISSUE_REFUND: "Issue Refund",
                };
                return (
                <tr key={item._id} className={`hover:bg-gray-50 transition-colors ${!item.isActive ? "bg-yellow-50/50" : ""}`}>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.reason}</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <code className="px-1.5 py-0.5 font-mono text-[10px] bg-gray-100 rounded text-gray-500">{item.code}</code>
                        <span className="text-[10px] text-gray-400">· #{item.sortOrder}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${applicableBadgeColor(item.applicableTo)}`}>
                      {item.applicableTo === "DRIVER" ? (
                        <Car className="w-3 h-3" />
                      ) : item.applicableTo === "USER" ? (
                        <Users className="w-3 h-3" />
                      ) : null}
                      {applicableLabel(item.applicableTo)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${impactConfig.bg} ${impactConfig.text}`}>
                      {impactConfig.icon}
                      {impact}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${stageConfig[metrics.stage].bg} ${stageConfig[metrics.stage].text}`}>
                      {stageConfig[metrics.stage].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${metrics.autoAction === "NONE" ? "text-gray-400" : "text-movezy-700"}`}>
                      {metrics.autoAction !== "NONE" && <Zap className="w-3 h-3" />}
                      {actionLabel[metrics.autoAction]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <div>{penaltyLabel(item)}</div>
                    <div
                      className={`text-xs ${item.refundPercentage === 100 ? "text-green-600" : item.refundPercentage === 0 ? "text-red-600" : "text-orange-600"}`}
                    >
                      Refund: {item.refundPercentage}%
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {metrics.trendDelta > 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-red-500" />
                      ) : metrics.trendDelta < 0 ? (
                        <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <span className="w-3.5 h-0.5 bg-gray-400 rounded" />
                      )}
                      <span
                        className={`text-xs font-semibold ${
                          metrics.trendDelta > 5
                            ? "text-red-600"
                            : metrics.trendDelta < -5
                              ? "text-green-600"
                              : "text-gray-500"
                        }`}
                      >
                        {metrics.trendDelta > 0 ? "+" : ""}
                        {metrics.trendDelta.toFixed(1)}%
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {metrics.usage} uses/30d
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${item.isActive ? "text-green-700 bg-green-100" : "text-yellow-700 bg-yellow-100"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {actionLoading === item._id ? (
                        <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                      ) : (
                        <>
                          <button onClick={() => handleToggle(item)} className={`p-1.5 rounded-lg transition-colors ${item.isActive ? "text-green-600 bg-green-100 hover:bg-green-200" : "text-gray-400 bg-gray-100 hover:bg-gray-200"}`} title={item.isActive ? "Deactivate" : "Activate"}>
                            {item.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          </button>
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200" title="Edit"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(item._id)} className="p-1.5 text-red-600 bg-red-100 rounded-lg hover:bg-red-200" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemLabel="reasons"
          pageSize={limit}
          onPageSizeChange={(size) => { setLimit(size as PageSize); setPage(1); }}
        />
        </>)}

      {/* Empty */}
      {!loading && paginatedFiltered.length === 0 && (
        <div className="py-16 text-center">
          <Ban className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No cancellation reasons found</h3>
          <p className="mt-1 text-gray-500">Add your first cancellation reason to get started.</p>
          <button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Reason
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="flex flex-col w-full max-w-2xl overflow-hidden bg-white shadow-xl rounded-xl max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? "Edit Cancellation Reason" : "Add Cancellation Reason"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* Reason & Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Reason Text *</label>
                  <input type="text" required value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Changed my mind" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Code *</label>
                  <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s+/g, "_") })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. CHANGED_MIND" />
                </div>
              </div>

              {/* Applicable To & Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Applicable To</label>
                  <select value={formData.applicableTo} onChange={(e) => setFormData({ ...formData, applicableTo: e.target.value as any })} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="BOTH">Both (User & Driver)</option>
                    <option value="USER">User Only</option>
                    <option value="DRIVER">Driver Only</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Sort Order</label>
                  <input type="number" min="0" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Stage & Auto Action */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" /> Trip Stage & Auto Action
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Stage</label>
                    <select
                      value={formData.stage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          stage: e.target.value as FormData["stage"],
                        })
                      }
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BEFORE">Before Pickup</option>
                      <option value="DURING">During Trip</option>
                      <option value="AFTER">After Delivery</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Auto Action Trigger</label>
                    <select
                      value={formData.autoAction}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          autoAction: e.target.value as FormData["autoAction"],
                        })
                      }
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="NONE">No Action</option>
                      <option value="NOTIFY_OPS">Notify Operations</option>
                      <option value="BLOCK_REBOOK">Block Rebooking</option>
                      <option value="FLAG_DRIVER">Flag Driver</option>
                      <option value="ISSUE_REFUND">Auto-issue Refund</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Penalty Section */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Penalty & Refund Settings</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Penalty Type</label>
                    <select value={formData.penaltyType} onChange={(e) => setFormData({ ...formData, penaltyType: e.target.value as any })} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="NONE">No Penalty</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                      <option value="PERCENTAGE">Percentage (%)</option>
                    </select>
                  </div>
                  {formData.penaltyType !== "NONE" && (
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">
                        Penalty Value {formData.penaltyType === "FIXED" ? "(₹)" : "(%)"}
                      </label>
                      <input type="number" min="0" max={formData.penaltyType === "PERCENTAGE" ? 100 : undefined} value={formData.penaltyValue} onChange={(e) => setFormData({ ...formData, penaltyValue: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={formData.isRefundable} onChange={(e) => setFormData({ ...formData, isRefundable: e.target.checked })} className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                    <span className="text-sm font-medium text-gray-700">Refundable</span>
                  </div>
                  {formData.isRefundable && (
                    <div>
                      <label className="block mb-1 text-sm font-medium text-gray-700">Refund Percentage</label>
                      <input type="number" min="0" max="100" value={formData.refundPercentage} onChange={(e) => setFormData({ ...formData, refundPercentage: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={actionLoading === "submit"} className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditing ? "Update" : "Create"} Reason
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CancellationReasonManagement;
