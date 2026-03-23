// src/pages/PromoManagement.tsx
import React, { useState, useEffect, useCallback } from "react";
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
  Users,
  TrendingUp,
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

const PromoManagement: React.FC = () => {
  const [promos, setPromos] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "EXPIRED"
  >("ALL");
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, totalPages: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeItem | null>(null);

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
    maxUsage: 0,
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
    } catch (err) {
      console.error("Failed to load promos", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  // When filters change, reset to first page; otherwise load current page
  const prevFiltersRef = React.useRef({ searchQuery, statusFilter });
  useEffect(() => {
    const filtersChanged =
      prevFiltersRef.current.searchQuery !== searchQuery ||
      prevFiltersRef.current.statusFilter !== statusFilter;
    prevFiltersRef.current = { searchQuery, statusFilter };

    if (filtersChanged && page !== 0) {
      setPage(0); // will re-trigger this effect with page=0
    } else {
      loadPromos(page, limit);
    }
  }, [page, limit, searchQuery, statusFilter, loadPromos]);

  // Server-side pagination: promos IS already the current page
  const paginatedPromos = promos;
  const currentPage = page + 1; // convert 0-based to 1-based for UI
  const totalPages = paginationMeta.totalPages;
  const totalItems = paginationMeta.total;
  const startIndex = totalItems === 0 ? 0 : page * limit + 1;
  const endIndex = Math.min((page + 1) * limit, totalItems);

  const stats = {
    total: paginationMeta.total,
    active: promos.filter(
      (p) => p.isActive && new Date(p.validTo) >= new Date(),
    ).length,
    totalUsed: promos.reduce((sum, p) => sum + (p.usedCount || 0), 0),
    totalSavings: promos.reduce((sum, p) => {
      if (p.discountType === "FIXED") {
        return sum + p.discountValue * (p.usedCount || 0);
      }
      return sum + (p.maxDiscount || 50) * (p.usedCount || 0);
    }, 0),
  };

  const handleCreate = async () => {
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
        } as any);
      }
      setShowCreateModal(false);
      resetForm();
      loadPromos(page, limit);
    } catch (err) {
      console.error("Failed to save promo", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this promo code?")) {
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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert("Promo code copied!");
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
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
            Create and manage promotional codes
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600"
        >
          <Plus className="w-5 h-5" />
          Create Promo Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Promos</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {stats.total}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
              <Tag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Promos</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {stats.active}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Used</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">
                {stats.totalUsed}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Savings</p>
              <p className="mt-1 text-2xl font-bold text-orange-600">
                {formatCurrency(stats.totalSavings)}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-xl">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Search promo codes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
            />
          </div>
          <div className="flex gap-2">
            {["ALL", "ACTIVE", "EXPIRED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
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

      {/* Promo Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="py-12 text-center text-gray-500 col-span-full">
            Loading...
          </div>
        ) : paginatedPromos.length === 0 ? (
          <div className="py-12 text-center text-gray-500 col-span-full">
            No promo codes found
          </div>
        ) : (
          paginatedPromos.map((promo) => {
            const isExpired =
              new Date(promo.validTo) < new Date() || !promo.isActive;
            const usagePercent = promo.maxUsage
              ? ((promo.usedCount || 0) / promo.maxUsage) * 100
              : 0;

            return (
              <div
                key={promo._id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                  isExpired ? "border-gray-200 opacity-75" : "border-gray-100"
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-lg font-bold text-gray-800">
                          {promo.code}
                        </span>
                        <button
                          onClick={() => copyCode(promo.code)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        {promo.description}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        isExpired
                          ? "bg-gray-100 text-gray-600"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {isExpired ? "Inactive" : "Active"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1">
                      {promo.discountType === "PERCENTAGE" ? (
                        <>
                          <Percent className="w-5 h-5 text-movezy-500" />
                          <span className="text-2xl font-bold text-movezy-600">
                            {promo.discountValue}%
                          </span>
                        </>
                      ) : (
                        <>
                          <IndianRupee className="w-5 h-5 text-movezy-500" />
                          <span className="text-2xl font-bold text-movezy-600">
                            {promo.discountValue}
                          </span>
                        </>
                      )}
                    </div>
                    {promo.maxDiscount &&
                      promo.discountType === "PERCENTAGE" && (
                        <span className="text-sm text-gray-500">
                          Max: {formatCurrency(promo.maxDiscount)}
                        </span>
                      )}
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Min Order:</span>
                      <span className="font-medium">
                        {formatCurrency(promo.minOrderValue || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Valid:</span>
                      <span className="font-medium">
                        {formatDate(promo.validFrom)} -{" "}
                        {formatDate(promo.validTo)}
                      </span>
                    </div>
                    {promo.maxUsage ? (
                      <div>
                        <div className="flex items-center justify-between mb-1 text-gray-600">
                          <span>Usage:</span>
                          <span className="font-medium">
                            {promo.usedCount || 0} / {promo.maxUsage}
                          </span>
                        </div>
                        <div className="w-full h-2 overflow-hidden bg-gray-100 rounded-full">
                          <div
                            className={`h-full rounded-full ${
                              usagePercent >= 100
                                ? "bg-red-500"
                                : usagePercent >= 80
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(usagePercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => handleToggleActive(promo._id)}
                    className={`text-sm font-medium ${
                      promo.isActive
                        ? "text-red-600 hover:text-red-700"
                        : "text-green-600 hover:text-green-700"
                    }`}
                  >
                    {promo.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
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
                        });
                        setShowCreateModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(promo._id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-6 text-lg font-bold text-gray-800">
              {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
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
                <label className="block mb-1 text-sm font-medium text-gray-700">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
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
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Discount Value{" "}
                    {formData.discountType === "PERCENTAGE" ? "(%)" : "(₹)"}
                  </label>
                  <input
                    type="number"
                    value={formData.discountValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountValue: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Min Order (₹)
                  </label>
                  <input
                    type="number"
                    value={formData.minOrderValue}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderValue: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
                {formData.discountType === "PERCENTAGE" && (
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Max Discount (₹)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxDiscount: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Usage Limit
                  </label>
                  <input
                    type="number"
                    value={formData.maxUsage}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxUsage: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    placeholder="0 for unlimited"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Per User Limit
                  </label>
                  <input
                    type="number"
                    value={formData.perUserLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        perUserLimit: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
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
                  <label className="block mb-1 text-sm font-medium text-gray-700">
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

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={
                  !formData.code || !formData.validFrom || !formData.validTo
                }
                className="flex-1 px-4 py-2.5 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600 disabled:opacity-50"
              >
                {editingPromo ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoManagement;
