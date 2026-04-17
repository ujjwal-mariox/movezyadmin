// src/pages/PromoManagement.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Tag,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  CheckCircle,
  Percent,
  IndianRupee,
  Zap,
  XCircle,
  Gift,
  X,
  Power,
  AlertTriangle,
  Target,
  Users as UsersIcon,
  Truck,
  Globe,
  ArrowUpRight,
} from "lucide-react";
import {
  fetchPromos,
  createPromo,
  updatePromo,
  togglePromo,
  deletePromo as deletePromoApi,
  type PromoCodeItem,
} from "../services/api";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

type TargetAudience = "all" | "users" | "drivers" | "city";

const PromoManagement: React.FC = () => {
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "EXPIRED"
  >("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "PERCENTAGE" | "FIXED">(
    "ALL",
  );
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 0 });
  const [showPanel, setShowPanel] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Automation state (UI-only, swap to backend when ready)
  const [autoEnableScheduled, setAutoEnableScheduled] = useState(true);
  const [autoDisableExpired, setAutoDisableExpired] = useState(true);
  const [notifyOnLowUsage, setNotifyOnLowUsage] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    code: string;
    description: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number | string;
    minOrderValue: number | string;
    maxDiscount: number | string;
    maxUsage: number | string;
    perUserLimit: number | string;
    validFrom: string;
    validTo: string;
    targetAudience: TargetAudience;
    targetCity: string;
  }>({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderValue: 0,
    maxDiscount: 0,
    maxUsage: 0,
    perUserLimit: 1,
    validFrom: "",
    validTo: "",
    targetAudience: "all",
    targetCity: "",
  });

  const loadPromos = useCallback(async (p: number, l: number) => {
    try {
      setLoading(true);
      const statusParam = statusFilter !== "ALL" ? statusFilter.toLowerCase() : undefined;
      const res = await fetchPromos(p, l, searchQuery || undefined, statusParam);
      setPromos(res.data?.promos || res.promos || []);
      setPaginationMeta({
        total: res.data?.total || 0,
        totalPages: res.data?.totalPages || 0,
      });
    } catch (err) {
      console.error("Failed to load promos", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  const prevFiltersRef = React.useRef({ searchQuery, statusFilter });
  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.searchQuery !== searchQuery ||
      prevFiltersRef.current.statusFilter !== statusFilter;
    prevFiltersRef.current = { searchQuery, statusFilter };

    if (filtersChanged && page !== 0) {
      setPage(0);
    } else {
      loadPromos(page, limit);
    }
  }, [page, limit, searchQuery, statusFilter, loadPromos]);

  const filteredPromos = useMemo(() => {
    return promos.filter((p) => {
      if (typeFilter !== "ALL" && p.discountType !== typeFilter) return false;
      return true;
    });
  }, [promos, typeFilter]);

  const currentPage = page + 1;
  const totalPages = paginationMeta.totalPages;
  const totalItems = paginationMeta.total;
  const startIndex = totalItems === 0 ? 0 : page * limit + 1;
  const endIndex = Math.min((page + 1) * limit, totalItems);

  const stats = useMemo(() => {
    const now = new Date();
    const active = promos.filter(
      (p) => p.isActive && new Date(p.validTo) >= now,
    ).length;
    const expired = promos.filter(
      (p) => !p.isActive || new Date(p.validTo) < now,
    ).length;
    const totalRedemptions = promos.reduce(
      (sum, p) => sum + (p.usedCount || 0),
      0,
    );
    const totalDiscount = promos.reduce((sum, p) => {
      if (p.discountType === "FIXED") {
        return sum + p.discountValue * (p.usedCount || 0);
      }
      return sum + (p.maxDiscount || 50) * (p.usedCount || 0);
    }, 0);
    return { active, expired, totalRedemptions, totalDiscount };
  }, [promos]);

  const handleSave = async () => {
    try {
      if (editingPromo) {
        await updatePromo(editingPromo._id, {
          description: formData.description,
          discountType: formData.discountType,
          discountValue: Number(formData.discountValue) || 0,
          minOrderValue: Number(formData.minOrderValue) || 0,
          maxDiscount: Number(formData.maxDiscount) || 0,
          maxUsage: Number(formData.maxUsage) || 0,
          perUserLimit: Number(formData.perUserLimit) || 0,
          validFrom: formData.validFrom,
          validTo: formData.validTo,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      } else {
        await createPromo({
          code: formData.code,
          description: formData.description,
          discountType: formData.discountType,
          discountValue: Number(formData.discountValue) || 0,
          minOrderValue: Number(formData.minOrderValue) || 0,
          maxDiscount: Number(formData.maxDiscount) || 0,
          maxUsage: Number(formData.maxUsage) || 0,
          perUserLimit: Number(formData.perUserLimit) || 0,
          validFrom: formData.validFrom,
          validTo: formData.validTo,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      }
      setShowPanel(false);
      resetForm();
      loadPromos(page, limit);
    } catch (err) {
      console.error("Failed to save promo", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Delete this promo code?")) {
      try {
        await deletePromoApi(id);
        loadPromos(page, limit);
      } catch (err) {
        console.error("Failed to delete promo", err);
      }
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await togglePromo(id);
      loadPromos(page, limit);
    } catch (err) {
      console.error("Failed to toggle promo", err);
    }
  };

  const handleBulkToggle = async (enable: boolean) => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const promo = promos.find((p) => p._id === id);
      if (promo && promo.isActive !== enable) {
        try {
          await togglePromo(id);
        } catch (err) {
          console.error(err);
        }
      }
    }
    setSelectedIds(new Set());
    loadPromos(page, limit);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} promo(s)?`)) return;
    for (const id of Array.from(selectedIds)) {
      try {
        await deletePromoApi(id);
      } catch (err) {
        console.error(err);
      }
    }
    setSelectedIds(new Set());
    loadPromos(page, limit);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredPromos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPromos.map((p) => p._id)));
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      description: "",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderValue: 0,
      maxDiscount: 0,
      maxUsage: 0,
      perUserLimit: 1,
      validFrom: "",
      validTo: "",
      targetAudience: "all",
      targetCity: "",
    });
    setEditingPromo(null);
  };

  const openCreate = () => {
    resetForm();
    setShowPanel(true);
  };

  const openEdit = (promo: PromoCodeItem) => {
    setEditingPromo(promo);
    setFormData({
      code: promo.code,
      description: promo.description || "",
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      minOrderValue: promo.minOrderValue || 0,
      maxDiscount: promo.maxDiscount || 0,
      maxUsage: promo.maxUsage || 0,
      perUserLimit: promo.perUserLimit,
      validFrom: promo.validFrom ? promo.validFrom.split("T")[0] : "",
      validTo: promo.validTo ? promo.validTo.split("T")[0] : "",
      targetAudience: "all",
      targetCity: "",
    });
    setShowPanel(true);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const getExpiryLabel = (validTo: string) => {
    const days = Math.ceil(
      (new Date(validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, tone: "red" };
    if (days <= 7) return { text: `Expires in ${days}d`, tone: "amber" };
    return { text: formatDate(validTo), tone: "gray" };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Tag className="w-6 h-6 text-movezy-500" />
            Promo Code Management
          </h2>
          <p className="text-sm text-gray-500">
            Campaigns, redemptions, and smart automation
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-6 py-2.5 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600"
        >
          <Plus className="w-5 h-5" />
          Create Promo
        </button>
      </div>

      {/* Performance Strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Active Codes</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{stats.active}</p>
              <p className="mt-1 text-xs text-green-600">Live campaigns</p>
            </div>
            <div className="flex items-center justify-center w-11 h-11 bg-green-50 rounded-xl">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Redemptions</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {stats.totalRedemptions.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-blue-600">Across all codes</p>
            </div>
            <div className="flex items-center justify-center w-11 h-11 bg-blue-50 rounded-xl">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-orange-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Discount Given</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {formatCurrency(stats.totalDiscount)}
              </p>
              <p className="mt-1 text-xs text-orange-600">Marketing spend</p>
            </div>
            <div className="flex items-center justify-center w-11 h-11 bg-orange-50 rounded-xl">
              <Gift className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-red-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Expired Codes</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{stats.expired}</p>
              <p className="mt-1 text-xs text-red-600">Auto-disabled</p>
            </div>
            <div className="flex items-center justify-center w-11 h-11 bg-red-50 rounded-xl">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Automation Rules */}
      <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-movezy-500" />
            <h3 className="text-sm font-semibold text-gray-800">Smart Automation</h3>
          </div>
          <span className="px-2 py-0.5 text-xs font-medium text-movezy-700 bg-movezy-50 rounded-full">
            Always on
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <RuleToggle
            label="Auto-enable scheduled campaigns"
            description="Promos go live at their start date"
            checked={autoEnableScheduled}
            onChange={setAutoEnableScheduled}
          />
          <RuleToggle
            label="Auto-disable expired promos"
            description="Cut off redemption at end date"
            checked={autoDisableExpired}
            onChange={setAutoDisableExpired}
          />
          <RuleToggle
            label="Notify low-usage codes"
            description="Alert if under 10% used near expiry"
            checked={notifyOnLowUsage}
            onChange={setNotifyOnLowUsage}
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Search code or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as "ALL" | "PERCENTAGE" | "FIXED")
            }
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
          >
            <option value="ALL">All Types</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed</option>
          </select>
          <div className="flex gap-2">
            {(["ALL", "ACTIVE", "EXPIRED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? "bg-movezy-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-2xl bg-movezy-50 border-movezy-200">
          <span className="text-sm font-medium text-movezy-800">
            {selectedIds.size} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkToggle(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200"
            >
              <Power className="w-4 h-4" /> Enable
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              <Power className="w-4 h-4" /> Disable
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Promo Table */}
      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredPromos.length > 0 &&
                      selectedIds.size === filteredPromos.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Code</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Type</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Usage</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Redemption</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Revenue</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Expiry</th>
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Status</th>
                <th className="px-3 py-3 text-xs font-semibold text-right text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredPromos.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No promo codes found
                  </td>
                </tr>
              ) : (
                filteredPromos.map((promo) => {
                  const isExpired =
                    new Date(promo.validTo) < new Date() || !promo.isActive;
                  const used = promo.usedCount || 0;
                  const max = promo.maxUsage || 0;
                  const redemptionRate = max > 0 ? (used / max) * 100 : 0;
                  const discount =
                    promo.discountType === "FIXED"
                      ? promo.discountValue * used
                      : (promo.maxDiscount || 50) * used;
                  // Mock revenue = avg order * redemptions (swap when backend sends)
                  const avgOrder = (promo.minOrderValue || 300) * 1.4;
                  const revenue = avgOrder * used;
                  const expiry = getExpiryLabel(promo.validTo);
                  const isSelected = selectedIds.has(promo._id);

                  return (
                    <tr
                      key={promo._id}
                      className={`hover:bg-gray-50 transition-colors ${
                        isSelected ? "bg-movezy-50/50" : ""
                      }`}
                    >
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(promo._id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 font-mono text-sm font-bold text-movezy-700 bg-movezy-50 border border-movezy-200 rounded">
                                {promo.code}
                              </span>
                              <button
                                onClick={() => copyCode(promo.code)}
                                className="p-1 text-gray-400 hover:text-gray-700"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {promo.description && (
                              <p className="mt-1 text-xs text-gray-500 max-w-[200px] truncate">
                                {promo.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 text-sm font-semibold text-gray-800">
                          {promo.discountType === "PERCENTAGE" ? (
                            <>
                              <Percent className="w-3.5 h-3.5 text-movezy-500" />
                              {promo.discountValue}% OFF
                            </>
                          ) : (
                            <>
                              <IndianRupee className="w-3.5 h-3.5 text-movezy-500" />
                              {promo.discountValue} OFF
                            </>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Min: {formatCurrency(promo.minOrderValue || 0)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1 w-[120px]">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="font-medium">{used}</span>
                            <span className="text-gray-400">
                              / {max || "∞"}
                            </span>
                          </div>
                          {max > 0 && (
                            <div className="w-full h-1.5 overflow-hidden bg-gray-100 rounded-full">
                              <div
                                className={`h-full rounded-full ${
                                  redemptionRate >= 100
                                    ? "bg-red-500"
                                    : redemptionRate >= 80
                                      ? "bg-yellow-500"
                                      : "bg-green-500"
                                }`}
                                style={{
                                  width: `${Math.min(redemptionRate, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-sm font-semibold ${
                              redemptionRate >= 80
                                ? "text-green-600"
                                : redemptionRate >= 40
                                  ? "text-gray-800"
                                  : "text-amber-600"
                            }`}
                          >
                            {max > 0 ? `${redemptionRate.toFixed(0)}%` : "—"}
                          </span>
                          {redemptionRate >= 60 && (
                            <ArrowUpRight className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-semibold text-gray-800">
                          {formatCurrency(revenue)}
                        </div>
                        <p className="text-xs text-red-500">
                          −{formatCurrency(discount)}
                        </p>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`text-xs font-medium ${
                            expiry.tone === "red"
                              ? "text-red-600"
                              : expiry.tone === "amber"
                                ? "text-amber-600"
                                : "text-gray-700"
                          }`}
                        >
                          {expiry.text}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            isExpired
                              ? "bg-gray-100 text-gray-600"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isExpired ? "bg-gray-400" : "bg-green-500"
                            }`}
                          />
                          {isExpired ? "Inactive" : "Active"}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleActive(promo._id)}
                            className={`p-1.5 rounded-lg ${
                              promo.isActive
                                ? "text-gray-500 hover:bg-gray-100"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                            title={promo.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(promo)}
                            className="p-1.5 text-gray-500 rounded-lg hover:bg-gray-100"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(promo._id)}
                            className="p-1.5 text-red-500 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={(p) => setPage(p - 1)}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        itemLabel="promos"
        pageSize={limit}
        onPageSizeChange={(size) => { setLimit(size); setPage(0); }}
      />

      {/* Create/Edit Right Drawer */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="w-full max-w-xl h-full overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
                </h3>
                <p className="text-xs text-gray-500">
                  Target audience, pricing rules, and schedule
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPanel(false);
                  resetForm();
                }}
                className="p-2 text-gray-500 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Code & Description */}
              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                  Promo Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="SAVE20"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl font-mono uppercase"
                  disabled={!!editingPromo}
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Get 20% off on your order"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                />
              </div>

              {/* Target Audience */}
              <div>
                <label className="block mb-2 text-xs font-semibold text-gray-600 uppercase">
                  <Target className="inline w-3 h-3 mr-1" />
                  Target Audience
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { value: "all", label: "Everyone", icon: Globe },
                      { value: "users", label: "Customers", icon: UsersIcon },
                      { value: "drivers", label: "Drivers", icon: Truck },
                      { value: "city", label: "By City", icon: Target },
                    ] as const
                  ).map((opt) => {
                    const Icon = opt.icon;
                    const active = formData.targetAudience === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            targetAudience: opt.value,
                          })
                        }
                        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                          active
                            ? "border-movezy-500 bg-movezy-50 text-movezy-700"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {formData.targetAudience === "city" && (
                  <input
                    type="text"
                    value={formData.targetCity}
                    onChange={(e) =>
                      setFormData({ ...formData, targetCity: e.target.value })
                    }
                    placeholder="Enter city name (e.g., Bengaluru)"
                    className="w-full px-4 py-2 mt-2 border border-gray-200 rounded-xl text-sm"
                  />
                )}
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    Discount Type
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountType: e.target.value as "PERCENTAGE" | "FIXED",
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  >
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    Value {formData.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Min Order & Max Discount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderValue:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
                {formData.discountType === "PERCENTAGE" && (
                  <div>
                    <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                      Max Discount (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDiscount:
                            e.target.value === "" ? "" : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    Total Uses
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUsage:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    placeholder="0 = unlimited"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    Per User
                  </label>
                  <input
                    type="number"
                    value={formData.perUserLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        perUserLimit:
                          e.target.value === "" ? "" : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) =>
                      setFormData({ ...formData, validFrom: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.validTo}
                    onChange={(e) =>
                      setFormData({ ...formData, validTo: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {autoEnableScheduled && formData.validFrom && (
                <div className="flex items-start gap-2 p-3 text-xs rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    This promo will auto-activate on{" "}
                    <strong>{formatDate(formData.validFrom)}</strong> and
                    auto-disable after end date.
                  </span>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 flex gap-3 px-6 py-4 bg-white border-t border-gray-200">
              <button
                onClick={() => {
                  setShowPanel(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={
                  !formData.code || !formData.validFrom || !formData.validTo
                }
                className="flex-1 px-4 py-2.5 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600 disabled:opacity-50"
              >
                {editingPromo ? "Update Promo" : "Create Promo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RuleToggle: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex items-start gap-3 p-3 text-left border rounded-xl transition-colors ${
      checked
        ? "border-movezy-200 bg-movezy-50/50"
        : "border-gray-200 bg-white hover:bg-gray-50"
    }`}
  >
    <div
      className={`mt-0.5 flex items-center w-9 h-5 shrink-0 rounded-full transition-colors ${
        checked ? "bg-movezy-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block w-4 h-4 bg-white rounded-full transform transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium text-gray-800">{label}</p>
      <p className="mt-0.5 text-xs text-gray-500">{description}</p>
    </div>
  </button>
);

export default PromoManagement;
