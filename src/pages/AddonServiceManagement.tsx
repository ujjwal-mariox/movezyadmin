import React, { useState, useEffect } from "react";
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

interface FormData {
  name: string;
  code: string;
  description: string;
  icon: string;
  priceType: "FIXED" | "PER_FLOOR" | "PER_KG";
  price: number;
  applicableVehicleTypes: string[];
  sortOrder: number;
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
};

const AddonServiceManagement: React.FC = () => {
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

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [addonRes, vtRes] = await Promise.all([fetchAddonServices(), fetchVehicleTypes()]);
      setAddons(addonRes.data?.addonServices || addonRes.data?.addons || addonRes.addonServices || []);
      setVehicleTypes(vtRes.data?.vehicleTypes || vtRes.vehicleTypes || []);
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

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
    });
    setIsEditing(true);
    setEditingId(addon._id);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading("submit");
      if (isEditing && editingId) {
        await updateAddonService(editingId, formData as any);
        showNotification("success", "Add-on updated successfully");
      } else {
        await createAddonService(formData as any);
        showNotification("success", "Add-on created successfully");
      }
      setIsModalOpen(false);
      loadData();
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
      loadData();
      showNotification("success", "Status updated");
    } catch (error: unknown) {
      showNotification("error", error instanceof Error ? error.message : "Failed to toggle");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this add-on service?")) return;
    try {
      setActionLoading(id);
      await deleteAddonService(id);
      loadData();
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
      default: return "fixed";
    }
  };

  const totalAddons = addons.length;
  const activeAddons = addons.filter((a) => a.isActive).length;

  const filtered = addons.filter((a) => {
    if (filterStatus === "active") return a.isActive;
    if (filterStatus === "inactive") return !a.isActive;
    return true;
  });

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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-3">
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-500">Total Services</p><h3 className="mt-1 text-3xl font-bold text-gray-900">{totalAddons}</h3></div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl"><Wrench className="w-6 h-6 text-blue-600" /></div>
          </div>
        </div>
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-500">Active</p><h3 className="mt-1 text-3xl font-bold text-gray-900">{activeAddons}</h3></div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl"><CheckCircle className="w-6 h-6 text-green-600" /></div>
          </div>
        </div>
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-gray-500">Inactive</p><h3 className="mt-1 text-3xl font-bold text-gray-900">{totalAddons - activeAddons}</h3></div>
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-xl"><AlertCircle className="w-6 h-6 text-yellow-600" /></div>
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
        <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
          <RotateCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Loading / Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-blue-600 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((addon) => (
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Sort Order</span>
                  <span className="font-medium text-gray-900">{addon.sortOrder}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Applicable Vehicles</span>
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
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
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
                    <select value={formData.priceType} onChange={(e) => setFormData({ ...formData, priceType: e.target.value as any })} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="FIXED">Fixed</option>
                      <option value="PER_FLOOR">Per Floor</option>
                      <option value="PER_KG">Per Kg</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Price (₹) *</label>
                    <input type="number" required min="0" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">Sort Order</label>
                    <input type="number" min="0" value={formData.sortOrder} onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
