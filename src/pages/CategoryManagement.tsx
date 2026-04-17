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
  Package,
  TrendingUp,
  IndianRupee,
  Clock,
  Star,
} from "lucide-react";
import {
  fetchGoodsTypes,
  createGoodsType,
  updateGoodsType,
  toggleGoodsType,
  deleteGoodsType,
  fetchVehicleTypes,
  type GoodsTypeItem,
  type VehicleTypeItem,
} from "../services/api";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

interface FormData {
  name: string;
  code: string;
  category: "BUSINESS" | "PERSONAL";
  description: string;
  icon: string;
  allowedVehicleTypes: string[];
  sortOrder: number | string;
}

const initialFormData: FormData = {
  name: "",
  code: "",
  category: "PERSONAL",
  description: "",
  icon: "",
  allowedVehicleTypes: [],
  sortOrder: 0,
};

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<GoodsTypeItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
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
      const [catRes, vtRes] = await Promise.all([
        fetchGoodsTypes({
          page: p,
          limit: l,
          status: filterStatus !== "all" ? filterStatus : undefined,
        }),
        fetchVehicleTypes(),
      ]);
      setCategories(catRes.data?.goodsTypes || catRes.goodsTypes || []);
      if (catRes.data?.pagination) {
        setPaginationMeta({
          total: catRes.data.pagination.total || 0,
          pages: catRes.data.pagination.pages || 0,
        });
      }
      setVehicleTypes(vtRes.data?.vehicleTypes || vtRes.vehicleTypes || []);
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  const prevFilterRef = React.useRef(filterStatus);
  useEffect(() => {
    const filterChanged = prevFilterRef.current !== filterStatus;
    prevFilterRef.current = filterStatus;
    if (filterChanged && page !== 1) {
      setPage(1);
    } else {
      loadData(page, limit);
    }
  }, [page, limit, filterStatus, loadData]);

  const handleAdd = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleEdit = (cat: GoodsTypeItem) => {
    setFormData({
      name: cat.name,
      code: cat.code,
      category: cat.category,
      description: cat.description || "",
      icon: cat.icon || "",
      allowedVehicleTypes: cat.allowedVehicleTypes?.map((v) => v._id) || [],
      sortOrder: cat.sortOrder || 0,
    });
    setIsEditing(true);
    setEditingId(cat._id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading("submit");
      const payload = { ...formData, sortOrder: Number(formData.sortOrder) || 0 };
      if (isEditing && editingId) {
        await updateGoodsType(editingId, payload as any);
        showNotification("success", "Category updated successfully");
      } else {
        await createGoodsType(payload as any);
        showNotification("success", "Category created successfully");
      }
      setIsModalOpen(false);
      loadData(page, limit);
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to save category");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setActionLoading(id);
      await toggleGoodsType(id);
      loadData(page, limit);
      showNotification("success", "Status updated");
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to toggle");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this category?")) return;
    try {
      setActionLoading(id);
      await deleteGoodsType(id);
      loadData(page, limit);
      showNotification("success", "Category deleted");
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVehicleToggle = (vtId: string) => {
    setFormData((prev) => ({
      ...prev,
      allowedVehicleTypes: prev.allowedVehicleTypes.includes(vtId)
        ? prev.allowedVehicleTypes.filter((id) => id !== vtId)
        : [...prev.allowedVehicleTypes, vtId],
    }));
  };

  const totalCategories = paginationMeta.total;
  const activeCategories = categories.filter((c) => c.isActive && !c.isDeleted).length;

  // Deterministic mock metrics per category (swap with backend aggregates when ready)
  const categoryMetrics = React.useMemo(() => {
    return categories.map((c) => {
      const seed =
        (c._id || c.code || "").split("").reduce((a, ch) => a + ch.charCodeAt(0), 0) ||
        1;
      const basePrice = 80 + (seed % 320);
      const avgOrder = basePrice * (2 + (seed % 4));
      const usage = 80 + (seed % 900);
      const etaMin = 15 + (seed % 40);
      const pricingLogic =
        seed % 3 === 0 ? "Per-km" : seed % 3 === 1 ? "Flat + Per-km" : "Slab-based";
      return { id: c._id, basePrice, avgOrder, usage, etaMin, pricingLogic };
    });
  }, [categories]);

  const mostUsed = categoryMetrics.reduce(
    (max, m) => (m.usage > max.usage ? m : max),
    { id: "", usage: 0, basePrice: 0, avgOrder: 0, etaMin: 0, pricingLogic: "" },
  );
  const mostUsedCategory = categories.find((c) => c._id === mostUsed.id);
  const totalUsage = categoryMetrics.reduce((s, m) => s + m.usage, 0) || 1;
  const totalRevenue = categoryMetrics.reduce(
    (s, m) => s + m.usage * m.avgOrder,
    0,
  );
  const avgOrderValue = totalRevenue / totalUsage;

  // Server-side: data is already filtered and paginated
  const paginatedCategories = categories;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

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
          <h1 className="text-2xl font-bold text-gray-800">Delivery Categories</h1>
          <p className="mt-1 text-gray-600">Manage goods categories that customers see during booking.</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Category
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Categories</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{totalCategories}</h3>
              <p className="mt-1 text-xs text-blue-600">{activeCategories} active</p>
            </div>
            <div className="flex items-center justify-center bg-blue-50 w-11 h-11 rounded-xl">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{activeCategories}</h3>
              <p className="mt-1 text-xs text-green-600">Visible to users</p>
            </div>
            <div className="flex items-center justify-center bg-green-50 w-11 h-11 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Most Used</p>
              <h3 className="mt-1 text-lg font-bold text-gray-800 truncate">
                {mostUsedCategory?.name || "—"}
              </h3>
              <p className="mt-1 text-xs text-amber-600">
                {mostUsed.usage.toLocaleString("en-IN")} orders
              </p>
            </div>
            <div className="flex items-center justify-center bg-amber-50 w-11 h-11 rounded-xl">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-purple-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Avg Order Value</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">
                ₹{Math.round(avgOrderValue).toLocaleString("en-IN")}
              </h3>
              <p className="mt-1 text-xs text-purple-600">Across categories</p>
            </div>
            <div className="flex items-center justify-center bg-purple-50 w-11 h-11 rounded-xl">
              <IndianRupee className="w-5 h-5 text-purple-600" />
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
        <button onClick={() => loadData(page, limit)} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
          <RotateCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Loading / Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : (
        <>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedCategories.map((cat) => {
            const metrics = categoryMetrics.find((m) => m.id === cat._id) || {
              basePrice: 0,
              avgOrder: 0,
              usage: 0,
              etaMin: 0,
              pricingLogic: "Flat",
            };
            const revContribPct = totalRevenue
              ? (metrics.usage * metrics.avgOrder * 100) / totalRevenue
              : 0;
            return (
            <div key={cat._id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${cat.isActive ? "border-gray-100" : "border-yellow-200 bg-yellow-50"}`}>
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 text-2xl bg-blue-100 rounded-lg">
                      {cat.icon || "📦"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{cat.name}</h3>
                      <p className="text-xs text-gray-500">{cat.code} · {cat.category}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${cat.isActive ? "text-green-700 bg-green-100" : "text-yellow-700 bg-yellow-100"}`}>
                    {cat.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              {/* Card Body */}
              <div className="p-4 space-y-3">
                {cat.description && <p className="text-sm text-gray-600 line-clamp-2">{cat.description}</p>}

                {/* Pricing Intelligence */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Base Price</p>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-0.5">
                      <IndianRupee className="w-3 h-3" />
                      {metrics.basePrice}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Avg Order</p>
                    <p className="text-sm font-bold text-gray-800 flex items-center gap-0.5">
                      <IndianRupee className="w-3 h-3" />
                      {metrics.avgOrder}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Pricing Logic</p>
                    <p className="text-sm font-medium text-gray-800">{metrics.pricingLogic}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">ETA</p>
                    <p className="text-sm font-medium text-gray-800 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-500" />
                      {metrics.etaMin} min
                    </p>
                  </div>
                </div>

                {/* Revenue Contribution */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Revenue Contribution
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        revContribPct >= 25
                          ? "text-green-600"
                          : revContribPct >= 10
                            ? "text-amber-600"
                            : "text-gray-500"
                      }`}
                    >
                      {revContribPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 overflow-hidden bg-gray-100 rounded-full">
                    <div
                      className={`h-full rounded-full ${
                        revContribPct >= 25
                          ? "bg-green-500"
                          : revContribPct >= 10
                            ? "bg-amber-500"
                            : "bg-gray-400"
                      }`}
                      style={{ width: `${Math.min(revContribPct * 3, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {metrics.usage.toLocaleString("en-IN")} orders · Sort #{cat.sortOrder}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-gray-500">Allowed Vehicles</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cat.allowedVehicleTypes && cat.allowedVehicleTypes.length > 0 ? (
                      cat.allowedVehicleTypes.map((vt) => (
                        <span key={vt._id} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{vt.name}</span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">All vehicles</span>
                    )}
                  </div>
                </div>
              </div>
              {/* Card Footer */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                {actionLoading === cat._id ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <button onClick={() => handleToggle(cat._id)} className={`p-2 rounded-lg transition-colors ${cat.isActive ? "text-green-600 bg-green-100 hover:bg-green-200" : "text-gray-400 bg-gray-100 hover:bg-gray-200"}`} title={cat.isActive ? "Deactivate" : "Activate"}>
                      {cat.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleEdit(cat)} className="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200" title="Edit"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(cat._id)} className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemLabel="categories"
          pageSize={limit}
          onPageSizeChange={(size) => { setLimit(size as PageSize); setPage(1); }}
        />
        </>)}

      {/* Empty */}
      {!loading && paginatedCategories.length === 0 && (
        <div className="py-16 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No categories found</h3>
          <p className="mt-1 text-gray-500">Add your first delivery category to get started.</p>
          <button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Category
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="flex flex-col w-full max-w-2xl overflow-hidden bg-white shadow-xl rounded-xl max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? "Edit Category" : "Add New Category"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* Name & Code */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Furniture" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Code *</label>
                  <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. FURNITURE" />
                </div>
              </div>

              {/* Category & Sort */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Category Type</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as any })} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="PERSONAL">Personal</option>
                    <option value="BUSINESS">Business</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Sort Order</label>
                  <input type="number" min="0" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Short description" />
              </div>

              {/* Icon */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Icon (emoji or URL)</label>
                <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="📦 or https://..." />
              </div>

              {/* Allowed Vehicle Types */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Allowed Vehicle Types</h3>
                <p className="mb-2 text-xs text-gray-500">Select which vehicles can carry this category. Leave empty to allow all.</p>
                <div className="grid grid-cols-2 gap-2">
                  {vehicleTypes.filter((vt) => !vt.isDeleted && vt.isActive).map((vt) => (
                    <label key={vt._id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50">
                      <input type="checkbox" checked={formData.allowedVehicleTypes.includes(vt._id)} onChange={() => handleVehicleToggle(vt._id)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      <span className="text-sm text-gray-700">{vt.name}</span>
                      <span className="ml-auto text-xs text-gray-400">{vt.maxWeightKg}kg</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={actionLoading === "submit"} className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditing ? "Update" : "Create"} Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
