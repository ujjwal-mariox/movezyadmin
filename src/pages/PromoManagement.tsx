// src/pages/PromoManagement.tsx
import React, { useState, useEffect } from "react";
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
import type { PromoCode } from "../types/admin";

const PromoManagement: React.FC = () => {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "EXPIRED"
  >("ALL");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    discountType: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    discountValue: 10,
    minOrderAmount: 0,
    maxDiscount: 0,
    usageLimit: 0,
    perUserLimit: 1,
    startDate: "",
    endDate: "",
  });

  // Mock data
  const mockPromos: PromoCode[] = [
    {
      _id: "1",
      code: "WELCOME20",
      description: "Welcome offer for new users",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minOrderAmount: 200,
      maxDiscount: 100,
      usageLimit: 1000,
      usedCount: 456,
      perUserLimit: 1,
      startDate: "2024-01-01",
      endDate: "2024-12-31",
      isActive: true,
      applicableVehicles: [],
      applicableServiceTypes: [],
      createdAt: "2024-01-01T00:00:00Z",
    },
    {
      _id: "2",
      code: "FLAT100",
      description: "Flat ₹100 off on orders above ₹500",
      discountType: "FIXED",
      discountValue: 100,
      minOrderAmount: 500,
      usageLimit: 500,
      usedCount: 234,
      perUserLimit: 2,
      startDate: "2024-01-15",
      endDate: "2024-03-15",
      isActive: true,
      applicableVehicles: [],
      applicableServiceTypes: [],
      createdAt: "2024-01-15T00:00:00Z",
    },
    {
      _id: "3",
      code: "WEEKEND30",
      description: "Weekend special - 30% off",
      discountType: "PERCENTAGE",
      discountValue: 30,
      minOrderAmount: 300,
      maxDiscount: 200,
      usageLimit: 200,
      usedCount: 200,
      perUserLimit: 1,
      startDate: "2024-01-20",
      endDate: "2024-01-21",
      isActive: false,
      applicableVehicles: [],
      applicableServiceTypes: [],
      createdAt: "2024-01-20T00:00:00Z",
    },
    {
      _id: "4",
      code: "TEMPO50",
      description: "50% off on Tempo bookings",
      discountType: "PERCENTAGE",
      discountValue: 50,
      minOrderAmount: 400,
      maxDiscount: 300,
      usageLimit: 100,
      usedCount: 45,
      perUserLimit: 1,
      startDate: "2024-02-01",
      endDate: "2024-02-29",
      isActive: true,
      applicableVehicles: ["Tempo"],
      applicableServiceTypes: [],
      createdAt: "2024-02-01T00:00:00Z",
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setPromos(mockPromos);
      setLoading(false);
    }, 500);
  }, []);

  const filteredPromos = promos.filter((promo) => {
    const matchesSearch =
      promo.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      promo.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const now = new Date();
    const endDate = new Date(promo.endDate);
    const isExpired = endDate < now || !promo.isActive;

    if (statusFilter === "ACTIVE") return matchesSearch && !isExpired;
    if (statusFilter === "EXPIRED") return matchesSearch && isExpired;
    return matchesSearch;
  });

  const stats = {
    total: promos.length,
    active: promos.filter(
      (p) => p.isActive && new Date(p.endDate) >= new Date(),
    ).length,
    totalUsed: promos.reduce((sum, p) => sum + p.usedCount, 0),
    totalSavings: promos.reduce((sum, p) => {
      if (p.discountType === "FIXED") {
        return sum + p.discountValue * p.usedCount;
      }
      return sum + (p.maxDiscount || 50) * p.usedCount;
    }, 0),
  };

  const handleCreate = () => {
    // In production, call API
    const newPromo: PromoCode = {
      _id: Date.now().toString(),
      ...formData,
      usedCount: 0,
      isActive: true,
      applicableVehicles: [],
      applicableServiceTypes: [],
      createdAt: new Date().toISOString(),
    };
    setPromos([newPromo, ...promos]);
    setShowCreateModal(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this promo code?")) {
      setPromos(promos.filter((p) => p._id !== id));
    }
  };

  const handleToggleActive = (id: string) => {
    setPromos(
      promos.map((p) => (p._id === id ? { ...p, isActive: !p.isActive } : p)),
    );
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
      minOrderAmount: 0,
      maxDiscount: 0,
      usageLimit: 0,
      perUserLimit: 1,
      startDate: "",
      endDate: "",
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
        ) : filteredPromos.length === 0 ? (
          <div className="py-12 text-center text-gray-500 col-span-full">
            No promo codes found
          </div>
        ) : (
          filteredPromos.map((promo) => {
            const isExpired =
              new Date(promo.endDate) < new Date() || !promo.isActive;
            const usagePercent = promo.usageLimit
              ? (promo.usedCount / promo.usageLimit) * 100
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
                        {formatCurrency(promo.minOrderAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Valid:</span>
                      <span className="font-medium">
                        {formatDate(promo.startDate)} -{" "}
                        {formatDate(promo.endDate)}
                      </span>
                    </div>
                    {promo.usageLimit && (
                      <div>
                        <div className="flex items-center justify-between mb-1 text-gray-600">
                          <span>Usage:</span>
                          <span className="font-medium">
                            {promo.usedCount} / {promo.usageLimit}
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
                    )}
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
                          minOrderAmount: promo.minOrderAmount,
                          maxDiscount: promo.maxDiscount || 0,
                          usageLimit: promo.usageLimit || 0,
                          perUserLimit: promo.perUserLimit,
                          startDate: promo.startDate,
                          endDate: promo.endDate,
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
                        discountValue: Number(e.target.value),
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
                    value={formData.minOrderAmount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minOrderAmount: Number(e.target.value),
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
                          maxDiscount: Number(e.target.value),
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
                    value={formData.usageLimit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        usageLimit: Number(e.target.value),
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
                        perUserLimit: Number(e.target.value),
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
                    value={formData.startDate}
                    onChange={(e) =>
                      setFormData({ ...formData, startDate: e.target.value })
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
                    value={formData.endDate}
                    onChange={(e) =>
                      setFormData({ ...formData, endDate: e.target.value })
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
                  !formData.code || !formData.startDate || !formData.endDate
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
