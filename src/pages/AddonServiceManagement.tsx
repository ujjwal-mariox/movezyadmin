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
  Wrench,
  IndianRupee,
  Zap,
  MapPin,
  Truck,
  Layers,
} from "lucide-react";
import {
  fetchAddonServices,
  createAddonService,
  updateAddonService,
  toggleAddonService,
  deleteAddonService,
  fetchVehicleTypes,
  type AddonServiceItem,
  type VehicleTypeItem,
} from "../services/api";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useDialog } from "../components/Layout/Dialog";

interface FormData {
  name: string;
  code: string;
  description: string;
  icon: string;
  priceType: "FIXED" | "PER_FLOOR" | "PER_KG" | "PERCENTAGE" | "CONDITIONAL";
  price: number | string;
  applicableVehicleTypes: string[];
  sortOrder: number | string;
  autoApply: boolean;
  orderStage: "PICKUP" | "DELIVERY" | "BOTH";
}

const initialFormData: FormData = {
  name: "",
  code: "",
  description: "",
  icon: "",
  priceType: "FIXED",
  price: 0,
  applicableVehicleTypes: [],
  sortOrder: 0,
  autoApply: false,
  orderStage: "BOTH",
};

const AddonServiceManagement: React.FC = () => {
  const dialog = useDialog();
  const [addons, setAddons] = useState<AddonServiceItem[]>([]);
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
      const [addonRes, vtRes] = await Promise.all([
        fetchAddonServices({
          page: p,
          limit: l,
          status: filterStatus !== "all" ? filterStatus : undefined,
        }),
        fetchVehicleTypes(),
      ]);
      setAddons(addonRes.data?.addonServices || addonRes.data?.addons || addonRes.addonServices || []);
      if (addonRes.data?.pagination) {
        setPaginationMeta({
          total: addonRes.data.pagination.total || 0,
          pages: addonRes.data.pagination.pages || 0,
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

  const handleEdit = (addon: AddonServiceItem) => {
    setFormData({
      name: addon.name,
      code: addon.code,
      description: addon.description || "",
      icon: addon.icon || "",
      priceType: addon.priceType,
      price: addon.price,
      applicableVehicleTypes: addon.applicableVehicleTypes?.map((v) => v._id) || [],
      sortOrder: addon.sortOrder || 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      autoApply: (addon as any).autoApply ?? false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      orderStage: ((addon as any).orderStage as "PICKUP" | "DELIVERY" | "BOTH") ?? "BOTH",
    });
    setIsEditing(true);
    setEditingId(addon._id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading("submit");
      const payload = { ...formData, price: Number(formData.price) || 0, sortOrder: Number(formData.sortOrder) || 0 };
      if (isEditing && editingId) {
        await updateAddonService(editingId, payload as any);
        showNotification("success", "Add-on updated successfully");
      } else {
        await createAddonService(payload as any);
        showNotification("success", "Add-on created successfully");
      }
      setIsModalOpen(false);
      loadData(page, limit);
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to save");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setActionLoading(id);
      await toggleAddonService(id);
      loadData(page, limit);
      showNotification("success", "Status updated");
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to toggle");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({ title: "Delete service?", message: "This add-on service will be permanently removed.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    try {
      setActionLoading(id);
      await deleteAddonService(id);
      loadData(page, limit);
      showNotification("success", "Add-on deleted");
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVehicleToggle = (vtId: string) => {
    setFormData((prev) => ({
      ...prev,
      applicableVehicleTypes: prev.applicableVehicleTypes.includes(vtId)
        ? prev.applicableVehicleTypes.filter((id) => id !== vtId)
        : [...prev.applicableVehicleTypes, vtId],
    }));
  };

  const priceTypeLabel = (pt: string) => {
    switch (pt) {
      case "PER_FLOOR": return "/floor";
      case "PER_KG": return "/kg";
      case "PERCENTAGE": return "%";
      case "CONDITIONAL": return "(conditional)";
      default: return "flat";
    }
  };

  const totalAddons = paginationMeta.total;
  const activeAddons = addons.filter((a) => a.isActive).length;

  // Server-side: data is already filtered and paginated
  const paginatedAddons = addons;
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
          <h1 className="text-2xl font-bold text-gray-800">Add-on Services</h1>
          <p className="mt-1 text-gray-600">Manage extra services like loading/unloading, helpers, packaging, etc.</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Service
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-3">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Services</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{totalAddons}</h3>
              <p className="mt-1 text-xs text-blue-600">Attachable extras</p>
            </div>
            <div className="flex items-center justify-center bg-blue-50 w-11 h-11 rounded-xl">
              <Wrench className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{activeAddons}</h3>
              <p className="mt-1 text-xs text-green-600">Offered to users</p>
            </div>
            <div className="flex items-center justify-center bg-green-50 w-11 h-11 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-amber-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Inactive</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{totalAddons - activeAddons}</h3>
              <p className="mt-1 text-xs text-amber-600">Paused</p>
            </div>
            <div className="flex items-center justify-center bg-amber-50 w-11 h-11 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600" />
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
          {paginatedAddons.map((addon) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const autoApply = (addon as any).autoApply ?? false;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const orderStage = ((addon as any).orderStage as string) ?? "BOTH";
            return (
            <div key={addon._id} className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-all ${addon.isActive ? "border-gray-100" : "border-yellow-200 bg-yellow-50"}`}>
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-12 h-12 text-2xl bg-purple-100 rounded-lg">
                      {addon.icon || "🔧"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{addon.name}</h3>
                      <p className="text-xs text-gray-500">{addon.code}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${addon.isActive ? "text-green-700 bg-green-100" : "text-yellow-700 bg-yellow-100"}`}>
                    {addon.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {addon.description && <p className="text-sm text-gray-600 line-clamp-2">{addon.description}</p>}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Price</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1">
                    <IndianRupee className="w-3 h-3" />{addon.price} <span className="text-xs text-gray-400">{priceTypeLabel(addon.priceType)}</span>
                  </span>
                </div>

                {/* Rules pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      autoApply
                        ? "bg-movezy-50 text-movezy-700 border border-movezy-200"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <Zap className="w-3 h-3" />
                    {autoApply ? "Auto Apply" : "Manual"}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-100">
                    <MapPin className="w-3 h-3" />
                    {orderStage === "PICKUP"
                      ? "At Pickup"
                      : orderStage === "DELIVERY"
                        ? "At Delivery"
                        : "Both Stages"}
                  </span>
                </div>

                <p className="text-[10px] text-gray-400">Sort #{addon.sortOrder}</p>

                <div>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    Applicable Vehicles
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {addon.applicableVehicleTypes && addon.applicableVehicleTypes.length > 0 ? (
                      addon.applicableVehicleTypes.map((vt) => (
                        <span key={vt._id} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">{vt.name}</span>
                      ))
                    ) : (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">All vehicles</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                {actionLoading === addon._id ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : (
                  <>
                    <button onClick={() => handleToggle(addon._id)} className={`p-2 rounded-lg transition-colors ${addon.isActive ? "text-green-600 bg-green-100 hover:bg-green-200" : "text-gray-400 bg-gray-100 hover:bg-gray-200"}`} title={addon.isActive ? "Deactivate" : "Activate"}>
                      {addon.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => handleEdit(addon)} className="p-2 text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200" title="Edit"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(addon._id)} className="p-2 text-red-600 bg-red-100 rounded-lg hover:bg-red-200" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
          itemLabel="services"
          pageSize={limit}
          onPageSizeChange={(size) => { setLimit(size as PageSize); setPage(1); }}
        />
        </>
      )}

      {/* Empty */}
      {!loading && paginatedAddons.length === 0 && (
        <div className="py-16 text-center">
          <Wrench className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">No add-on services found</h3>
          <p className="mt-1 text-gray-500">Create your first add-on service.</p>
          <button onClick={handleAdd} className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add Service
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="flex flex-col w-full max-w-2xl overflow-hidden bg-white shadow-xl rounded-xl max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">{isEditing ? "Edit Add-on Service" : "Add New Service"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Loading/Unloading" />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">Code *</label>
                  <input type="text" required value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. LOADING" />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Description</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Service description" />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Icon (emoji or URL)</label>
                <input type="text" value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="🔧 or https://..." />
              </div>

              {/* Price */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Pricing</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Price Type</label>
                    <select value={formData.priceType} onChange={(e) => setFormData({ ...formData, priceType: e.target.value as FormData["priceType"] })} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="FIXED">Flat (Fixed)</option>
                      <option value="PERCENTAGE">Percentage of Order</option>
                      <option value="CONDITIONAL">Conditional</option>
                      <option value="PER_FLOOR">Per Floor</option>
                      <option value="PER_KG">Per Kg</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Price (₹) *</label>
                    <input type="number" required min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Sort Order</label>
                    <input type="number" min="0" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Auto Apply & Stage */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Zap className="w-4 h-4 text-amber-500" /> Automation & Order Stage
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-amber-50">
                    <input
                      type="checkbox"
                      checked={formData.autoApply}
                      onChange={(e) =>
                        setFormData({ ...formData, autoApply: e.target.checked })
                      }
                      className="w-4 h-4 mt-0.5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-800">Auto Apply Rule</p>
                      <p className="text-xs text-gray-500">
                        Add to order automatically when conditions match
                      </p>
                    </div>
                  </label>
                  <div>
                    <label className="flex items-center gap-1 mb-1 text-sm font-medium text-gray-700">
                      <Layers className="w-3.5 h-3.5" /> Attach To
                    </label>
                    <select
                      value={formData.orderStage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          orderStage: e.target.value as FormData["orderStage"],
                        })
                      }
                      className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BOTH">Both Stages</option>
                      <option value="PICKUP">Pickup Only</option>
                      <option value="DELIVERY">Delivery Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Vehicle Types */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">Applicable Vehicle Types</h3>
                <p className="mb-2 text-xs text-gray-500">Leave empty to apply to all vehicles.</p>
                <div className="grid grid-cols-2 gap-2">
                  {vehicleTypes.filter((vt) => !vt.isDeleted && vt.isActive).map((vt) => (
                    <label key={vt._id} className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-purple-50">
                      <input type="checkbox" checked={formData.applicableVehicleTypes.includes(vt._id)} onChange={() => handleVehicleToggle(vt._id)} className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
                      <span className="text-sm text-gray-700">{vt.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100">Cancel</button>
                <button type="submit" disabled={actionLoading === "submit"} className="flex items-center gap-2 px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {actionLoading === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditing ? "Update" : "Create"} Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddonServiceManagement;
