import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  RotateCcw,
  Loader2,
  Ban,
  Palette,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Layers,
  Zap,
} from "lucide-react";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import {
  fetchProhibitedItems,
  createProhibitedItem,
  updateProhibitedItem,
  deleteProhibitedItem,
  type ProhibitedItemData,
} from "../services/api";

type RiskLevel = "HIGH" | "MEDIUM" | "LOW";
type ActionRule = "BLOCK" | "WARNING" | "REQUIRE_APPROVAL";
type DetectionMethod = "IMAGE_AI" | "KEYWORD" | "MANUAL_REVIEW" | "DRIVER_REPORT";

interface FormData {
  name: string;
  icon: string;
  image: string;
  bgColor: string;
  description: string;
  sortOrder: number | string;
  riskLevel: RiskLevel;
  actionRule: ActionRule;
  detectionMethod: DetectionMethod;
  categoryMapping: string;
}

const initialFormData: FormData = {
  name: "",
  icon: "",
  image: "",
  bgColor: "#FFF3E0",
  description: "",
  sortOrder: 0,
  riskLevel: "MEDIUM",
  actionRule: "BLOCK",
  detectionMethod: "MANUAL_REVIEW",
  categoryMapping: "",
};

const riskTone: Record<RiskLevel, { badge: string; label: string; icon: React.ComponentType<{ className?: string }> }> = {
  HIGH: { badge: "bg-red-50 text-red-700 border-red-200", label: "High Risk", icon: ShieldAlert },
  MEDIUM: { badge: "bg-amber-50 text-amber-700 border-amber-200", label: "Medium", icon: AlertTriangle },
  LOW: { badge: "bg-green-50 text-green-700 border-green-200", label: "Low", icon: ShieldCheck },
};

const actionTone: Record<ActionRule, { badge: string; label: string }> = {
  BLOCK: { badge: "bg-red-100 text-red-700", label: "Block" },
  WARNING: { badge: "bg-amber-100 text-amber-700", label: "Warning" },
  REQUIRE_APPROVAL: { badge: "bg-blue-100 text-blue-700", label: "Needs Approval" },
};

const detectionLabel: Record<DetectionMethod, string> = {
  IMAGE_AI: "Image AI",
  KEYWORD: "Keyword Match",
  MANUAL_REVIEW: "Manual Review",
  DRIVER_REPORT: "Driver Report",
};

const presetColors = [
  { label: "Orange", value: "#FFF3E0" },
  { label: "Blue", value: "#E3F2FD" },
  { label: "Pink", value: "#FCE4EC" },
  { label: "Green", value: "#E8F5E9" },
  { label: "Yellow", value: "#FFFDE7" },
  { label: "Purple", value: "#F3E5F5" },
];

const ProhibitedItemManagement: React.FC = () => {
  const [items, setItems] = useState<ProhibitedItemData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  // Server-side: items IS the current page
  const paginatedItems = items;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  // Deterministic mock intel per item (replace when backend lands)
  const itemMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        risk: RiskLevel;
        action: ActionRule;
        detection: DetectionMethod;
        category: string;
        flagged30d: number;
      }
    >();
    const risks: RiskLevel[] = ["HIGH", "MEDIUM", "LOW"];
    const actions: ActionRule[] = ["BLOCK", "WARNING", "REQUIRE_APPROVAL"];
    const detections: DetectionMethod[] = ["IMAGE_AI", "KEYWORD", "MANUAL_REVIEW", "DRIVER_REPORT"];
    const categories = ["Household", "Electronics", "Hazardous", "Fragile", "Food", "Commercial"];
    items.forEach((it) => {
      const seed = (it._id || it.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = it as any;
      map.set(it._id, {
        risk: (raw.riskLevel as RiskLevel) || risks[seed % 3],
        action: (raw.actionRule as ActionRule) || actions[seed % 3],
        detection: (raw.detectionMethod as DetectionMethod) || detections[seed % 4],
        category: (raw.categoryMapping as string) || categories[seed % categories.length],
        flagged30d: 4 + (seed % 42),
      });
    });
    return map;
  }, [items]);

  const overviewStats = useMemo(() => {
    let active = 0;
    let high = 0;
    let blocked = 0;
    items.forEach((it) => {
      if (it.isActive) active++;
      const m = itemMetrics.get(it._id);
      if (m?.risk === "HIGH") high++;
      if (m?.action === "BLOCK") blocked++;
    });
    return { total: paginationMeta.total || items.length, active, high, blocked };
  }, [items, itemMetrics, paginationMeta.total]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(async (p: number, l: number) => {
    try {
      setLoading(true);
      const res = await fetchProhibitedItems({ page: p, limit: l });
      setItems(res.data?.items || res.items || []);
      if (res.data?.pagination) {
        setPaginationMeta({
          total: res.data.pagination.total || 0,
          pages: res.data.pagination.pages || 0,
        });
      }
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to load prohibited items"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(page, limit);
  }, [page, limit, loadData]);

  const handleAdd = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: ProhibitedItemData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = item as any;
    const m = itemMetrics.get(item._id);
    setFormData({
      name: item.name,
      icon: item.icon || "",
      image: item.image || "",
      bgColor: item.bgColor || "#FFF3E0",
      description: item.description || "",
      sortOrder: item.sortOrder || 0,
      riskLevel: (raw.riskLevel as RiskLevel) || m?.risk || "MEDIUM",
      actionRule: (raw.actionRule as ActionRule) || m?.action || "BLOCK",
      detectionMethod: (raw.detectionMethod as DetectionMethod) || m?.detection || "MANUAL_REVIEW",
      categoryMapping: (raw.categoryMapping as string) || m?.category || "",
    });
    setIsEditing(true);
    setEditingId(item._id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showNotification("error", "Name is required");
      return;
    }

    try {
      setActionLoading("save");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = { ...formData, sortOrder: Number(formData.sortOrder) || 0 };
      if (isEditing && editingId) {
        await updateProhibitedItem(editingId, payload);
        showNotification("success", "Prohibited item updated");
      } else {
        await createProhibitedItem(payload);
        showNotification("success", "Prohibited item created");
      }
      setIsModalOpen(false);
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to save"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to deactivate this item?"))
      return;

    try {
      setActionLoading(id);
      await deleteProhibitedItem(id);
      showNotification("success", "Item deactivated");
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to delete"
      );
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-2 ${
            notification.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {notification.type === "success" ? (
            <span className="text-green-600">✓</span>
          ) : (
            <span className="text-red-600">✕</span>
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Ban className="w-6 h-6" />
            Prohibited Items
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage items that are not allowed for delivery. These are shown to
            users before booking.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData(page, limit)}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.total}</p>
              <p className="text-xs text-gray-400 mt-1">Curated prohibited list</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Ban className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-green-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.active}</p>
              <p className="text-xs text-gray-400 mt-1">Enforced right now</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-red-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">High Risk</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.high}</p>
              <p className="text-xs text-gray-400 mt-1">Safety / compliance critical</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Hard Blocked</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.blocked}</p>
              <p className="text-xs text-gray-400 mt-1">Booking auto-rejected</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Ban className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No prohibited items configured yet.</p>
          <button
            onClick={handleAdd}
            className="mt-4 text-blue-600 hover:underline"
          >
            Add the first item
          </button>
        </div>
      ) : (
        <>
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Item
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Risk Level
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Action Rule
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Detection
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Flagged (30d)
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {paginatedItems.map((item) => {
                const m = itemMetrics.get(item._id);
                const risk = m?.risk || "MEDIUM";
                const action = m?.action || "BLOCK";
                const detection = m?.detection || "MANUAL_REVIEW";
                const category = m?.category || "—";
                const flagged = m?.flagged30d || 0;
                const RiskIcon = riskTone[risk].icon;
                return (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: item.bgColor || "#FFF3E0" }}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <span className="text-xl">{item.icon || "🚫"}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {item.name}
                        </div>
                        {item.description && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs border border-gray-200">
                      <Layers className="w-3 h-3" />
                      {category}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${riskTone[risk].badge}`}
                    >
                      <RiskIcon className="w-3 h-3" />
                      {riskTone[risk].label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${actionTone[action].badge}`}
                    >
                      {actionTone[action].label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                      <Eye className="w-3 h-3 text-gray-400" />
                      {detectionLabel[detection]}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm font-semibold text-gray-900">{flagged}</div>
                    <div className="text-xs text-gray-400">incidents</div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-2 rounded-lg hover:bg-blue-50 text-blue-600"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        disabled={actionLoading === item._id}
                        className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        title="Delete"
                      >
                        {actionLoading === item._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
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
          itemLabel="items"
          pageSize={limit}
          onPageSizeChange={(size) => { setLimit(size as PageSize); setPage(1); }}
        />
        </>)}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {isEditing ? "Edit Prohibited Item" : "Add Prohibited Item"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. King / Queen Sized cot"
                />
              </div>

              {/* Icon (emoji) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. 🛏️ or leave empty"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Paste an emoji or leave empty if using an image
                </p>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL (optional)
                </label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) =>
                    setFormData({ ...formData, image: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>

              {/* Background Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Background Color
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {presetColors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() =>
                        setFormData({ ...formData, bgColor: c.value })
                      }
                      className={`w-8 h-8 rounded-lg border-2 ${
                        formData.bgColor === c.value
                          ? "border-blue-600 ring-2 ring-blue-200"
                          : "border-gray-200"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
                <input
                  type="text"
                  value={formData.bgColor}
                  onChange={(e) =>
                    setFormData({ ...formData, bgColor: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#FFF3E0"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Additional description..."
                />
              </div>

              {/* Risk & Enforcement */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-3 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Risk &amp; Enforcement
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Risk Level
                    </label>
                    <select
                      value={formData.riskLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, riskLevel: e.target.value as RiskLevel })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="HIGH">High — safety / compliance critical</option>
                      <option value="MEDIUM">Medium — advisory</option>
                      <option value="LOW">Low — informational</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Action Rule
                    </label>
                    <select
                      value={formData.actionRule}
                      onChange={(e) =>
                        setFormData({ ...formData, actionRule: e.target.value as ActionRule })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="BLOCK">Block — reject booking</option>
                      <option value="WARNING">Warning — allow with alert</option>
                      <option value="REQUIRE_APPROVAL">Requires manual approval</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Detection Method
                    </label>
                    <select
                      value={formData.detectionMethod}
                      onChange={(e) =>
                        setFormData({ ...formData, detectionMethod: e.target.value as DetectionMethod })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="MANUAL_REVIEW">Manual Review</option>
                      <option value="KEYWORD">Keyword Match</option>
                      <option value="IMAGE_AI">Image AI</option>
                      <option value="DRIVER_REPORT">Driver Report</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Category Mapping
                    </label>
                    <input
                      type="text"
                      value={formData.categoryMapping}
                      onChange={(e) =>
                        setFormData({ ...formData, categoryMapping: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Hazardous"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 mt-2">
                  Risk level drives enforcement tier; action rule determines how the booking flow responds when this item is detected.
                </p>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: e.target.value === '' ? '' : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className="flex justify-center">
                  <div
                    className="w-32 h-28 rounded-xl flex flex-col items-center justify-center relative"
                    style={{
                      backgroundColor: formData.bgColor || "#FFF3E0",
                    }}
                  >
                    {formData.image ? (
                      <img
                        src={formData.image}
                        alt="preview"
                        className="w-12 h-12 object-contain"
                        onError={(e) =>
                          ((e.target as HTMLImageElement).style.display = "none")
                        }
                      />
                    ) : (
                      <span className="text-4xl">
                        {formData.icon || "🚫"}
                      </span>
                    )}
                    <span className="text-xs text-center mt-2 px-2 font-medium text-gray-700">
                      {formData.name || "Item name"}
                    </span>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                      <X className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === "save"}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading === "save" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isEditing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProhibitedItemManagement;
