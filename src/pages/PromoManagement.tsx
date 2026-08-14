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
import {
  fetchUserDiscounts,
  createUserDiscount,
  updateUserDiscount,
  deleteUserDiscount,
  type UserDiscountItem,
} from "../services/api";
import {
  fetchOnboardingCoupons,
  createOnboardingCoupon,
  updateOnboardingCoupon,
  deleteOnboardingCoupon,
  type OnboardingCouponItem,
} from "../services/api";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useDialog } from "../components/Layout/Dialog";

const PromoManagement: React.FC = () => {
  const dialog = useDialog();
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [queryTotals, setQueryTotals] = useState<{
    totalDiscount: number;
    totalRevenue: number;
    totalRedemptions: number;
  } | null>(null);
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
  }>({
    code: "",
    description: "",
    discountType: "PERCENTAGE",
    discountValue: 10,
    minOrderValue: 0,
    maxDiscount: 0,
    // Blank, matching the field's "blank = unlimited" hint; it is sent as -1.
    maxUsage: "",
    perUserLimit: 1,
    validFrom: "",
    validTo: "",
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
      // Cross-page totals for the same filtered query. Null when an older
      // backend does not send them, so the cards fall back to per-page sums and
      // say so, rather than printing a page total under a platform-wide label.
      setQueryTotals(res.data?.totals ?? null);
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
    // Discount given = the server's Σ PromoUsage.discountAmount per promo
    // (promo.controller.ts getAllPromos attaches realDiscount). The old estimate
    // multiplied redemptions by maxDiscount — or by a hardcoded ₹50 when
    // maxDiscount was 0 — and therefore contradicted the row beneath it.
    const totalDiscount = promos.reduce((sum, p) => sum + (p.realDiscount ?? 0), 0);

    // Redemptions and discount now come from a cross-page aggregate over the
    // same filtered query when the backend sends one; the per-page sums remain
    // as the fallback. Active/expired counts stay per-page — they are counts of
    // the rows on screen and there is no cross-page equivalent to swap in.
    return {
      active,
      expired,
      totalRedemptions: queryTotals?.totalRedemptions ?? totalRedemptions,
      totalDiscount: queryTotals?.totalDiscount ?? totalDiscount,
      isPlatformWide: queryTotals !== null,
    };
  }, [promos, queryTotals]);

  // "0 = unlimited" is only true because the CREATE handler maps a falsy
  // maxUsage to -1 (promo.controller.ts createPromo). The UPDATE handler writes
  // req.body straight through, so a literal 0 used to persist — and redemption
  // checks `maxUsage !== -1 && usedCount >= maxUsage`, i.e. 0 >= 0, which made
  // the promo permanently unredeemable. Send the -1 sentinel the schema and the
  // validator actually mean by "unlimited".
  const normalizeMaxUsage = (value: number | string) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : -1;
  };

  // perUserLimit 0 is the same trap: validatePromoCode rejects on
  // `userUsageCount >= perUserLimit`, so 0 means "nobody may ever use it".
  // createPromo already coerces falsy to 1; match that on update.
  const normalizePerUserLimit = (value: number | string) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : 1;
  };

  const handleSave = async () => {
    try {
      if (editingPromo) {
        await updatePromo(editingPromo._id, {
          description: formData.description,
          discountType: formData.discountType,
          discountValue: Number(formData.discountValue) || 0,
          minOrderValue: Number(formData.minOrderValue) || 0,
          maxDiscount: Number(formData.maxDiscount) || 0,
          maxUsage: normalizeMaxUsage(formData.maxUsage),
          perUserLimit: normalizePerUserLimit(formData.perUserLimit),
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
          maxUsage: normalizeMaxUsage(formData.maxUsage),
          perUserLimit: normalizePerUserLimit(formData.perUserLimit),
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
      await dialog.alert({
        title: "Save failed",
        message: (err as Error).message || "Failed to save promo code",
        tone: "danger",
      });
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({ title: "Delete promo code?", message: "This promo code will be permanently removed.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    try {
      await deletePromoApi(id);
      loadPromos(page, limit);
    } catch (err) {
      console.error("Failed to delete promo", err);
      await dialog.alert({
        title: "Delete failed",
        message: (err as Error).message || "Failed to delete promo code",
        tone: "danger",
      });
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
    const ok = await dialog.confirm({ title: `Delete ${selectedIds.size} promo${selectedIds.size > 1 ? "s" : ""}?`, message: "These promo codes will be permanently removed.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
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
      // -1 is the stored "unlimited" sentinel and 0 is a cap nobody sets on
      // purpose; both show as blank, which the field documents as unlimited.
      maxUsage: promo.maxUsage > 0 ? promo.maxUsage : "",
      perUserLimit: promo.perUserLimit,
      validFrom: promo.validFrom ? promo.validFrom.split("T")[0] : "",
      validTo: promo.validTo ? promo.validTo.split("T")[0] : "",
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
            Campaigns and redemptions
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

      {/* Performance Strip. Redemptions and Discount Given are cross-page
          aggregates over the same filtered query (getAllPromos `totals`), so
          they no longer change meaning when an admin pages. Active/Expired are
          still counts of the rows on screen — there is no cross-page equivalent
          — and remain labelled that way. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Active Codes</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">{stats.active}</p>
              <p className="mt-1 text-xs text-green-600">Live campaigns (this page)</p>
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
              <p className="mt-1 text-xs text-blue-600">
                {stats.isPlatformWide ? "All codes matching this filter" : "Codes on this page"}
              </p>
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
              <p className="mt-1 text-xs text-orange-600">
                {stats.isPlatformWide ? "All codes matching this filter" : "Discount recorded, this page"}
              </p>
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
              {/* Counts end-dated OR manually deactivated codes — nothing
                  auto-disables them, so don't say "auto-disabled". */}
              <p className="mt-1 text-xs text-red-600">Expired or off (this page)</p>
            </div>
            <div className="flex items-center justify-center w-11 h-11 bg-red-50 rounded-xl">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </div>
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
                {/* Σ finalFare of the bookings that used the code — gross fare
                    including the customer's GST, not platform revenue. */}
                <th className="px-3 py-3 text-xs font-semibold text-left text-gray-600 uppercase">Booking Value</th>
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
                  // -1 (or a missing value) is the schema's "unlimited". A stored
                  // 0 is NOT unlimited — redemption checks `usedCount >= maxUsage`,
                  // so a 0 cap blocks every redemption. Rendering it as ∞ hid that.
                  const isUnlimited =
                    promo.maxUsage === undefined ||
                    promo.maxUsage === null ||
                    promo.maxUsage < 0;
                  const max = isUnlimited ? 0 : promo.maxUsage;
                  const capReached = !isUnlimited && used >= max;
                  const redemptionRate = max > 0 ? (used / max) * 100 : 0;
                  // Money figures come from the server only (getAllPromos attaches
                  // realDiscount = Σ PromoUsage.discountAmount, realRevenue = Σ
                  // finalFare of the linked bookings). No client-side estimate:
                  // the previous maxDiscount-or-₹50 fallback invented spend.
                  const discount = promo.realDiscount ?? 0;
                  const revenue = promo.realRevenue ?? 0;
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
                        <div className="flex flex-col gap-1 w-[140px]">
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span className="font-medium">{used}</span>
                            <span className="text-gray-500">
                              / {isUnlimited ? "Unlimited" : max}
                            </span>
                          </div>
                          {!isUnlimited && max === 0 && (
                            <span className="text-[10px] font-medium text-red-600">
                              Cap is 0 — cannot be redeemed
                            </span>
                          )}
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
                        {/* A code whose usage cap is spent is rejected at
                            redemption ("Promo code usage limit reached"), so it
                            must not read Active just because the dates are in
                            range and isActive is true. */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            isExpired
                              ? "bg-gray-100 text-gray-600"
                              : capReached
                                ? "bg-amber-100 text-amber-800"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isExpired
                                ? "bg-gray-400"
                                : capReached
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            }`}
                          />
                          {isExpired
                            ? "Inactive"
                            : capReached
                              ? "Limit reached"
                              : "Active"}
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
                  Pricing rules and schedule
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
                    min={0}
                    placeholder="Blank = unlimited"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Leave blank (or 0) for unlimited redemptions.
                  </p>
                </div>
                <div>
                  <label className="block mb-1 text-xs font-semibold text-gray-600 uppercase">
                    Per User
                  </label>
                  <input
                    type="number"
                    min={1}
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

      <UserDiscountsSection />

      <OnboardingCouponsSection />
    </div>
  );
};

/**
 * Driver onboarding-fee coupons — separate from customer promo codes, which
 * the onboarding payment never reads. A PERCENT 100 (or FLAT >= fee) coupon
 * waives the fee entirely: the driver app skips Razorpay for a zero payable.
 * Usage counts at successful payment, not at apply.
 */
const OnboardingCouponsSection: React.FC = () => {
  const [rows, setRows] = React.useState<OnboardingCouponItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [discountType, setDiscountType] = React.useState<"PERCENT" | "FLAT">("PERCENT");
  const [value, setValue] = React.useState("50");
  const [maxUses, setMaxUses] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchOnboardingCoupons();
      setRows(res?.data?.coupons || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);
  React.useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setNotice(null);
    if (!code.trim() || !from || !to) {
      setNotice("Code and both dates are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await createOnboardingCoupon({
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discountType,
        value: Number(value) || 0,
        maxUses: maxUses.trim() ? Number(maxUses) : undefined,
        validFrom: from,
        validTo: to,
      });
      if (res?.success === false) throw new Error(res?.message || "Create failed");
      setShowForm(false);
      setCode(""); setDescription("");
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r: OnboardingCouponItem) => {
    setBusy(true);
    try { await updateOnboardingCoupon(r._id, { isActive: !r.isActive }); load(); }
    finally { setBusy(false); }
  };
  const remove = async (r: OnboardingCouponItem) => {
    if (!window.confirm(`Delete coupon ${r.code}?`)) return;
    setBusy(true);
    try { await deleteOnboardingCoupon(r._id); load(); }
    finally { setBusy(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-800">Driver Onboarding Coupons</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Discount codes drivers enter against the joining fee. A 100% coupon waives the
            fee entirely (no Razorpay step). One redemption per driver; uses count only on
            successful payment.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? "Close" : "New Coupon"}
        </button>
      </div>

      {notice && <p className="mt-3 text-xs font-medium text-red-600">{notice}</p>}

      {showForm && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border border-gray-100 rounded-xl p-4">
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CODE (e.g. FREEDRIVE)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono" />
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="flex gap-3">
            <select value={discountType} onChange={(e) => setDiscountType(e.target.value as "PERCENT" | "FLAT")}
              className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
              <option value="PERCENT">% off</option>
              <option value="FLAT">₹ off</option>
            </select>
            <input value={value} onChange={(e) => setValue(e.target.value)} type="number" min={1}
              max={discountType === "PERCENT" ? 100 : undefined}
              placeholder={discountType === "PERCENT" ? "1–100" : "₹"}
              className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <input value={maxUses} onChange={(e) => setMaxUses(e.target.value)} type="number" min={1}
            placeholder="Max uses (blank = unlimited)" className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={from} onChange={(e) => setFrom(e.target.value)} type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={to} onChange={(e) => setTo(e.target.value)} type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="md:col-span-2">
            <button onClick={submit} disabled={busy}
              className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {busy ? "Saving..." : "Create Coupon"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No onboarding coupons yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Code</th>
                  <th className="py-2 pr-4 font-medium">Discount</th>
                  <th className="py-2 pr-4 font-medium">Uses</th>
                  <th className="py-2 pr-4 font-medium">Window</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const expired = new Date(r.validTo) < new Date();
                  const exhausted = r.maxUses !== -1 && r.usedCount >= r.maxUses;
                  return (
                    <tr key={r._id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-mono font-semibold text-gray-800">{r.code}</td>
                      <td className="py-2.5 pr-4">
                        {r.discountType === "PERCENT" ? `${r.value}%` : `₹${r.value}`}
                        {r.discountType === "PERCENT" && r.value === 100 && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-purple-100 text-purple-700 rounded">FULL WAIVER</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {r.usedCount}{r.maxUses !== -1 ? ` / ${r.maxUses}` : " / ∞"}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">{fmt(r.validFrom)} – {fmt(r.validTo)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          expired || exhausted ? "bg-gray-100 text-gray-600"
                          : r.isActive ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {expired ? "Expired" : exhausted ? "Exhausted" : r.isActive ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => toggle(r)} disabled={busy}
                          className="px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md disabled:opacity-50">
                          {r.isActive ? "Pause" : "Activate"}
                        </button>
                        <button onClick={() => remove(r)} disabled={busy}
                          className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Automatic customer discounts — the strikethrough pricing the apps render.
 * Lives on the Coupons page because both are money-off configuration under the
 * same PROMOS_* permissions. Unlike a promo code there is nothing to type at
 * checkout: an active campaign applies to every priced request its audience
 * makes, so the card states the audience loudly.
 */
const UserDiscountsSection: React.FC = () => {
  const [rows, setRows] = React.useState<UserDiscountItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [name, setName] = React.useState("");
  const [percent, setPercent] = React.useState("10");
  const [maxCap, setMaxCap] = React.useState("0");
  const [audience, setAudience] = React.useState<"ALL" | "USERS">("ALL");
  const [mobiles, setMobiles] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserDiscounts();
      setRows(res?.data?.discounts || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { load(); }, [load]);

  const submit = async () => {
    setNotice(null);
    if (!name.trim() || !from || !to) {
      setNotice("Name and both dates are required.");
      return;
    }
    setBusy(true);
    try {
      const res = await createUserDiscount({
        name: name.trim(),
        percent: Number(percent) || 0,
        maxDiscountAmount: Number(maxCap) || 0,
        appliesTo: audience,
        userMobileNumbers: audience === "USERS"
          ? mobiles.split(/[\\n,]/).map((m) => m.trim()).filter(Boolean)
          : undefined,
        validFrom: from,
        validTo: to,
      });
      if (res?.success === false) throw new Error(res?.message || "Create failed");
      const unresolved: string[] = res?.data?.unresolvedMobileNumbers || [];
      setNotice(unresolved.length
        ? `Created — but no customer matches: ${unresolved.join(", ")}`
        : "Discount created.");
      setShowForm(false);
      setName(""); setMobiles("");
      load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (r: UserDiscountItem) => {
    setBusy(true);
    try {
      await updateUserDiscount(r._id, { isActive: !r.isActive });
      load();
    } finally { setBusy(false); }
  };

  const remove = async (r: UserDiscountItem) => {
    if (!window.confirm(`Delete discount "${r.name}"?`)) return;
    setBusy(true);
    try {
      await deleteUserDiscount(r._id);
      load();
    } finally { setBusy(false); }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-800">Customer Discounts</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Applied automatically at pricing — the apps show the original price struck
            through. No code to enter. Targets everyone, or specific customers by mobile number.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          {showForm ? "Close" : "New Discount"}
        </button>
      </div>

      {notice && <p className="mt-3 text-xs font-medium text-amber-700">{notice}</p>}

      {showForm && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border border-gray-100 rounded-xl p-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Campaign name"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="flex gap-3">
            <input value={percent} onChange={(e) => setPercent(e.target.value)} type="number" min={1} max={90}
              placeholder="% off" className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            <input value={maxCap} onChange={(e) => setMaxCap(e.target.value)} type="number" min={0}
              placeholder="Max ₹ (0 = uncapped)" className="w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <select value={audience} onChange={(e) => setAudience(e.target.value as "ALL" | "USERS")}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white">
            <option value="ALL">All customers</option>
            <option value="USERS">Specific customers</option>
          </select>
          {audience === "USERS" ? (
            <textarea value={mobiles} onChange={(e) => setMobiles(e.target.value)}
              placeholder="Mobile numbers, comma or line separated"
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-h-[42px]" />
          ) : <div />}
          <input value={from} onChange={(e) => setFrom(e.target.value)} type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <input value={to} onChange={(e) => setTo(e.target.value)} type="date"
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <div className="md:col-span-2">
            <button onClick={submit} disabled={busy}
              className="px-5 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
              {busy ? "Saving..." : "Create Discount"}
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No customer discounts configured.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Name</th>
                  <th className="py-2 pr-4 font-medium">Discount</th>
                  <th className="py-2 pr-4 font-medium">Audience</th>
                  <th className="py-2 pr-4 font-medium">Window</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const expired = new Date(r.validTo) < new Date();
                  return (
                    <tr key={r._id} className="border-b border-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-800">{r.name}</td>
                      <td className="py-2.5 pr-4">
                        {r.percent}%{r.maxDiscountAmount > 0 ? ` (max ₹${r.maxDiscountAmount})` : ""}
                      </td>
                      <td className="py-2.5 pr-4">
                        {r.appliesTo === "ALL"
                          ? "All customers"
                          : `${r.userIds.length} customer${r.userIds.length === 1 ? "" : "s"}`}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-600">{fmt(r.validFrom)} – {fmt(r.validTo)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          expired ? "bg-gray-100 text-gray-600"
                          : r.isActive ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-700"
                        }`}>
                          {expired ? "Expired" : r.isActive ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => toggle(r)} disabled={busy}
                          className="px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-md disabled:opacity-50">
                          {r.isActive ? "Pause" : "Activate"}
                        </button>
                        <button onClick={() => remove(r)} disabled={busy}
                          className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50">
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default PromoManagement;
