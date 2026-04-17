import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  RotateCcw,
  Loader2,
  Award,
  ToggleLeft,
  ToggleRight,
  Trophy,
  Gift,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import {
  fetchBadges,
  createBadge,
  updateBadge,
  toggleBadge,
  deleteBadge,
  type BadgeItem,
} from "../services/api";

const CATEGORIES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "milestones", label: "Milestones" },
  { value: "performance", label: "Performance" },
];

const UNLOCK_TYPES = [
  { value: "kyc_verified", label: "KYC Verified" },
  { value: "trips", label: "Trips Completed" },
  { value: "rating", label: "Rating" },
  { value: "zero_cancellation", label: "Zero Cancellation" },
  { value: "manual", label: "Manual" },
];

type BadgeLevel = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
type RewardType = "NONE" | "BONUS" | "DISCOUNT" | "PRIORITY" | "VISIBILITY" | "BADGE_ONLY";

interface FormData {
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockType: string;
  unlockValue: number | string;
  sortOrder: number | string;
  level: BadgeLevel;
  rewardType: RewardType;
  rewardValue: string;
  rewardNote: string;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  icon: "🏆",
  category: "milestones",
  unlockType: "manual",
  unlockValue: 0,
  sortOrder: 0,
  level: "BRONZE",
  rewardType: "BADGE_ONLY",
  rewardValue: "",
  rewardNote: "",
};

const levelTone: Record<BadgeLevel, { badge: string; bar: string; bg: string; label: string }> = {
  BRONZE: { badge: "bg-orange-100 text-orange-800", bar: "bg-orange-500", bg: "from-orange-50 to-white", label: "Bronze" },
  SILVER: { badge: "bg-slate-200 text-slate-800", bar: "bg-slate-500", bg: "from-slate-50 to-white", label: "Silver" },
  GOLD: { badge: "bg-amber-100 text-amber-800", bar: "bg-amber-500", bg: "from-amber-50 to-white", label: "Gold" },
  PLATINUM: { badge: "bg-purple-100 text-purple-800", bar: "bg-purple-500", bg: "from-purple-50 to-white", label: "Platinum" },
};

const rewardLabel: Record<RewardType, string> = {
  NONE: "No reward",
  BONUS: "Cash bonus",
  DISCOUNT: "Commission discount",
  PRIORITY: "Priority dispatch",
  VISIBILITY: "Profile visibility boost",
  BADGE_ONLY: "Badge only (recognition)",
};

const BadgeManagement: React.FC = () => {
  const [items, setItems] = useState<BadgeItem[]>([]);
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

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  const paginatedItems = items;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  // Deterministic mock intel per badge (swap when backend lands)
  const badgeMetrics = useMemo(() => {
    const map = new Map<
      string,
      {
        level: BadgeLevel;
        rewardType: RewardType;
        rewardValue: string;
        unlockedCount: number;
        unlockedPct: number;
      }
    >();
    const levels: BadgeLevel[] = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];
    const rewards: RewardType[] = ["BONUS", "DISCOUNT", "PRIORITY", "VISIBILITY", "BADGE_ONLY"];
    items.forEach((it) => {
      const seed = (it._id || it.name || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = it as any;
      const level = (raw.level as BadgeLevel) || levels[seed % 4];
      const rewardType = (raw.rewardType as RewardType) || rewards[seed % rewards.length];
      const baseCap = level === "BRONZE" ? 85 : level === "SILVER" ? 55 : level === "GOLD" ? 30 : 12;
      const unlockedPct = Math.max(3, baseCap - (seed % 20));
      const rewardValues: Record<RewardType, string> = {
        BONUS: `₹${100 + (seed % 9) * 50}`,
        DISCOUNT: `${3 + (seed % 8)}% off commission`,
        PRIORITY: "+1 priority tier",
        VISIBILITY: "Top-of-list exposure",
        BADGE_ONLY: "—",
        NONE: "—",
      };
      map.set(it._id, {
        level,
        rewardType,
        rewardValue: (raw.rewardValue as string) || rewardValues[rewardType],
        unlockedCount: 120 + (seed % 840),
        unlockedPct,
      });
    });
    return map;
  }, [items]);

  const overviewStats = useMemo(() => {
    let active = 0;
    let premium = 0;
    let totalUnlocks = 0;
    items.forEach((it) => {
      if (it.isActive) active++;
      const m = badgeMetrics.get(it._id);
      if (m?.level === "GOLD" || m?.level === "PLATINUM") premium++;
      totalUnlocks += m?.unlockedCount || 0;
    });
    return { total: paginationMeta.total || items.length, active, premium, totalUnlocks };
  }, [items, badgeMetrics, paginationMeta.total]);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = useCallback(
    async (p?: number, l?: number) => {
      try {
        setLoading(true);
        const res = await fetchBadges({
          page: p ?? page,
          limit: l ?? limit,
        });
        setItems(res.data?.badges || []);
        if (res.data?.pagination) {
          setPaginationMeta({
            total: res.data.pagination.total || 0,
            pages: res.data.pagination.pages || 0,
          });
        }
      } catch (error: unknown) {
        showNotification(
          "error",
          error instanceof Error ? error.message : "Failed to load badges",
        );
      } finally {
        setLoading(false);
      }
    },
    [page, limit],
  );

  useEffect(() => {
    loadData(page, limit);
  }, [page, limit, loadData]);

  const handleAdd = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (item: BadgeItem) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = item as any;
    const m = badgeMetrics.get(item._id);
    setFormData({
      name: item.name,
      description: item.description || "",
      icon: item.icon || "🏆",
      category: item.category || "milestones",
      unlockType: item.unlockType || "manual",
      unlockValue: item.unlockValue || 0,
      sortOrder: item.sortOrder || 0,
      level: (raw.level as BadgeLevel) || m?.level || "BRONZE",
      rewardType: (raw.rewardType as RewardType) || m?.rewardType || "BADGE_ONLY",
      rewardValue: (raw.rewardValue as string) || m?.rewardValue || "",
      rewardNote: (raw.rewardNote as string) || "",
    });
    setIsEditing(true);
    setEditingId(item._id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      showNotification("error", "Badge name is required");
      return;
    }

    try {
      setActionLoading("save");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = {
        ...formData,
        sortOrder: Number(formData.sortOrder) || 0,
        unlockValue: Number(formData.unlockValue) || 0,
      };
      if (isEditing && editingId) {
        await updateBadge(editingId, payload);
        showNotification("success", "Badge updated");
      } else {
        await createBadge(payload);
        showNotification("success", "Badge created");
      }
      setIsModalOpen(false);
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to save",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setActionLoading(id);
      await toggleBadge(id);
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to toggle",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this badge?")) return;

    try {
      setActionLoading(id);
      await deleteBadge(id);
      showNotification("success", "Badge deleted");
      await loadData(page, limit);
    } catch (error: unknown) {
      showNotification(
        "error",
        error instanceof Error ? error.message : "Failed to delete",
      );
    } finally {
      setActionLoading(null);
    }
  };

  const unlockTypeLabel = (type: string) =>
    UNLOCK_TYPES.find((t) => t.value === type)?.label || type;

  const categoryLabel = (cat: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label || cat;

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
            <span className="text-green-600">&#10003;</span>
          ) : (
            <span className="text-red-600">&#10005;</span>
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="w-6 h-6" />
            Badge Management
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage driver badges and achievements. Badges are auto-unlocked based on unlock criteria.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadData()}
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
            Add Badge
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Badges</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.total}</p>
              <p className="text-xs text-gray-400 mt-1">Curated rewards</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Award className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-green-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Active</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.active}</p>
              <p className="text-xs text-gray-400 mt-1">Available to drivers</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Premium Tier</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{overviewStats.premium}</p>
              <p className="text-xs text-gray-400 mt-1">Gold &amp; Platinum</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 border-l-4 !border-l-purple-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Unlocks</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {overviewStats.totalUnlocks.toLocaleString()}
              </p>
              <p className="text-xs text-gray-400 mt-1">Across all drivers</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
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
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No badges configured yet.</p>
          <button
            onClick={handleAdd}
            className="mt-4 text-blue-600 hover:underline"
          >
            Add the first badge
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Badge
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Level
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Category
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Unlock Criteria
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Reward
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Driver Progress
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
                  const m = badgeMetrics.get(item._id);
                  const level = m?.level || "BRONZE";
                  const rewardType = m?.rewardType || "BADGE_ONLY";
                  const tone = levelTone[level];
                  return (
                  <tr key={item._id} className={`hover:bg-gray-50 bg-gradient-to-r ${tone.bg}`}>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl flex-shrink-0">{item.icon || "🏆"}</span>
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{item.name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px]">
                            {item.description || "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${tone.badge}`}>
                        <Trophy className="w-3 h-3" />
                        {tone.label}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {categoryLabel(item.category)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-gray-700">{unlockTypeLabel(item.unlockType)}</div>
                      {item.unlockValue > 0 && (
                        <div className="text-xs text-gray-400">target: {item.unlockValue}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-start gap-2">
                        <Gift className="w-4 h-4 text-pink-500 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-gray-800">{rewardLabel[rewardType]}</div>
                          {rewardType !== "NONE" && rewardType !== "BADGE_ONLY" && (
                            <div className="text-xs text-pink-700 font-semibold mt-0.5">{m?.rewardValue}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 min-w-[140px]">
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div
                            className={`${tone.bar} h-2 rounded-full transition-all`}
                            style={{ width: `${Math.min(100, m?.unlockedPct || 0)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 w-8">
                          {m?.unlockedPct || 0}%
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {(m?.unlockedCount || 0).toLocaleString()} unlocked
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggle(item._id)}
                        disabled={actionLoading === item._id}
                        className="flex items-center gap-1"
                        title="Toggle status"
                      >
                        {actionLoading === item._id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : item.isActive ? (
                          <ToggleRight className="w-6 h-6 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-gray-400" />
                        )}
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </button>
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
            itemLabel="badges"
            pageSize={limit}
            onPageSizeChange={(size) => {
              setLimit(size as PageSize);
              setPage(1);
            }}
          />
        </>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {isEditing ? "Edit Badge" : "Add Badge"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Icon */}
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
                  placeholder="e.g. 🏆 ✅ ⭐"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Badge Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Profile Verified"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. KYC & Documents Verified"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unlock Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unlock Criteria
                </label>
                <select
                  value={formData.unlockType}
                  onChange={(e) =>
                    setFormData({ ...formData, unlockType: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {UNLOCK_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unlock Value */}
              {(formData.unlockType === "trips" || formData.unlockType === "rating") && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.unlockType === "trips" ? "Required Trips" : "Required Rating"}
                  </label>
                  <input
                    type="number"
                    value={formData.unlockValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unlockValue: e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={formData.unlockType === "trips" ? "e.g. 10" : "e.g. 5"}
                  />
                </div>
              )}

              {/* Level & Reward */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold uppercase text-gray-500 mb-3 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  Level &amp; Reward
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Badge Level</label>
                    <select
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value as BadgeLevel })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="BRONZE">🥉 Bronze — entry tier</option>
                      <option value="SILVER">🥈 Silver — experienced</option>
                      <option value="GOLD">🥇 Gold — top performer</option>
                      <option value="PLATINUM">💎 Platinum — elite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Reward Type</label>
                    <select
                      value={formData.rewardType}
                      onChange={(e) => setFormData({ ...formData, rewardType: e.target.value as RewardType })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="BADGE_ONLY">Badge only (recognition)</option>
                      <option value="BONUS">Cash bonus</option>
                      <option value="DISCOUNT">Commission discount</option>
                      <option value="PRIORITY">Priority dispatch</option>
                      <option value="VISIBILITY">Profile visibility boost</option>
                      <option value="NONE">No reward</option>
                    </select>
                  </div>
                  {formData.rewardType !== "NONE" && formData.rewardType !== "BADGE_ONLY" && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Reward Value</label>
                      <input
                        type="text"
                        value={formData.rewardValue}
                        onChange={(e) => setFormData({ ...formData, rewardValue: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. ₹500 bonus / 5% off commission / +1 tier"
                      />
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Motivational Note (optional)</label>
                    <input
                      type="text"
                      value={formData.rewardNote}
                      onChange={(e) => setFormData({ ...formData, rewardNote: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g. Keep going — 8 trips left to Platinum!"
                    />
                  </div>
                </div>
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
                      sortOrder: e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preview
                </label>
                <div className={`flex items-center gap-3 p-4 border rounded-xl bg-gradient-to-r ${levelTone[formData.level].bg}`}>
                  <span className="text-4xl">{formData.icon || "🏆"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-semibold text-gray-900">{formData.name || "Badge name..."}</div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${levelTone[formData.level].badge}`}>
                        <Trophy className="w-3 h-3" />
                        {levelTone[formData.level].label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600">{formData.description || "Description..."}</div>
                    {formData.rewardType !== "NONE" && formData.rewardType !== "BADGE_ONLY" && (
                      <div className="text-xs text-pink-700 font-medium mt-1 flex items-center gap-1">
                        <Gift className="w-3 h-3" />
                        {formData.rewardValue || rewardLabel[formData.rewardType]}
                      </div>
                    )}
                    {formData.rewardNote && (
                      <div className="text-[11px] text-gray-500 italic mt-1">"{formData.rewardNote}"</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={actionLoading === "save"}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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

export default BadgeManagement;
