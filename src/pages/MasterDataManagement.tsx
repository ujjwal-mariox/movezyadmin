import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  ToggleLeft,
  ToggleRight,
  Loader2,
  MapPin,
  Car,
  Fuel,
} from "lucide-react";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { masterDataApi } from "../services/admin-api";

type Tab = "cities" | "bodyTypes" | "fuelTypes";

interface CityItem {
  _id: string;
  name: string;
  state: string;
  isActive: boolean;
  sortOrder: number;
}

interface NameItem {
  _id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
}

const MasterDataManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("cities");

  // Cities
  const [cities, setCities] = useState<CityItem[]>([]);
  const [cityForm, setCityForm] = useState({ name: "", state: "", sortOrder: "0" });

  // Body types
  const [bodyTypes, setBodyTypes] = useState<NameItem[]>([]);
  const [bodyTypeForm, setBodyTypeForm] = useState({ name: "", sortOrder: "0" });

  // Fuel types
  const [fuelTypes, setFuelTypes] = useState<NameItem[]>([]);
  const [fuelTypeForm, setFuelTypeForm] = useState({ name: "", sortOrder: "0" });

  // Common state
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // ── Load data ──
  const loadData = useCallback(
    async (p: number, l: number) => {
      try {
        setLoading(true);
        if (activeTab === "cities") {
          const res = await masterDataApi.getCities({ page: p, limit: l });
          setCities(res.data?.cities || []);
          if (res.data?.pagination) setPaginationMeta({ total: res.data.pagination.total, pages: res.data.pagination.pages });
        } else if (activeTab === "bodyTypes") {
          const res = await masterDataApi.getBodyTypes({ page: p, limit: l });
          setBodyTypes(res.data?.bodyTypes || []);
          if (res.data?.pagination) setPaginationMeta({ total: res.data.pagination.total, pages: res.data.pagination.pages });
        } else {
          const res = await masterDataApi.getFuelTypes({ page: p, limit: l });
          setFuelTypes(res.data?.fuelTypes || []);
          if (res.data?.pagination) setPaginationMeta({ total: res.data.pagination.total, pages: res.data.pagination.pages });
        }
      } catch (err: unknown) {
        showNotification("error", err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [activeTab],
  );

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    loadData(page, limit);
  }, [page, limit, loadData]);

  // ── Handlers ──
  const handleAdd = () => {
    setIsEditing(false);
    setEditingId(null);
    if (activeTab === "cities") setCityForm({ name: "", state: "", sortOrder: "0" });
    else if (activeTab === "bodyTypes") setBodyTypeForm({ name: "", sortOrder: "0" });
    else setFuelTypeForm({ name: "", sortOrder: "0" });
    setIsModalOpen(true);
  };

  const handleEdit = (item: CityItem | NameItem) => {
    setIsEditing(true);
    setEditingId(item._id);
    if (activeTab === "cities") {
      const city = item as CityItem;
      setCityForm({ name: city.name, state: city.state, sortOrder: String(city.sortOrder) });
    } else if (activeTab === "bodyTypes") {
      setBodyTypeForm({ name: item.name, sortOrder: String(item.sortOrder) });
    } else {
      setFuelTypeForm({ name: item.name, sortOrder: String(item.sortOrder) });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setActionLoading("submit");
      if (activeTab === "cities") {
        if (!cityForm.name || !cityForm.state) { showNotification("error", "Name and state are required"); return; }
        const payload = { ...cityForm, sortOrder: Number(cityForm.sortOrder) || 0 };
        if (isEditing && editingId) await masterDataApi.updateCity(editingId, payload);
        else await masterDataApi.createCity(payload);
      } else if (activeTab === "bodyTypes") {
        if (!bodyTypeForm.name) { showNotification("error", "Name is required"); return; }
        const payload = { ...bodyTypeForm, sortOrder: Number(bodyTypeForm.sortOrder) || 0 };
        if (isEditing && editingId) await masterDataApi.updateBodyType(editingId, payload);
        else await masterDataApi.createBodyType(payload);
      } else {
        if (!fuelTypeForm.name) { showNotification("error", "Name is required"); return; }
        const payload = { ...fuelTypeForm, sortOrder: Number(fuelTypeForm.sortOrder) || 0 };
        if (isEditing && editingId) await masterDataApi.updateFuelType(editingId, payload);
        else await masterDataApi.createFuelType(payload);
      }
      showNotification("success", isEditing ? "Updated successfully" : "Created successfully");
      setIsModalOpen(false);
      loadData(page, limit);
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Operation failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (item: CityItem | NameItem) => {
    try {
      setActionLoading(item._id);
      const update = { isActive: !item.isActive };
      if (activeTab === "cities") await masterDataApi.updateCity(item._id, update);
      else if (activeTab === "bodyTypes") await masterDataApi.updateBodyType(item._id, update);
      else await masterDataApi.updateFuelType(item._id, update);
      showNotification("success", `${item.isActive ? "Deactivated" : "Activated"} successfully`);
      loadData(page, limit);
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Toggle failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      setActionLoading(id);
      if (activeTab === "cities") await masterDataApi.deleteCity(id);
      else if (activeTab === "bodyTypes") await masterDataApi.deleteBodyType(id);
      else await masterDataApi.deleteFuelType(id);
      showNotification("success", "Deleted successfully");
      loadData(page, limit);
    } catch (err: unknown) {
      showNotification("error", err instanceof Error ? err.message : "Delete failed");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Tabs config ──
  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "cities", label: "Cities", icon: MapPin },
    { key: "bodyTypes", label: "Body Types", icon: Car },
    { key: "fuelTypes", label: "Fuel Types", icon: Fuel },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white ${notification.type === "success" ? "bg-green-500" : "bg-red-500"}`}>
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">System Configuration</h1>
          <p className="text-sm text-gray-500">Core reference data — cities, vehicle body types, and fuel types used across the platform</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg bg-movezy-500 hover:bg-movezy-600">
          <Plus className="w-4 h-4" />
          Add {activeTab === "cities" ? "City" : activeTab === "bodyTypes" ? "Body Type" : "Fuel Type"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 border-b border-gray-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-movezy-500 text-movezy-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-movezy-500" />
        </div>
      ) : (
        <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Name</th>
                {activeTab === "cities" && (
                  <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">State</th>
                )}
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Sort Order</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-left text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold tracking-wider text-right text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {activeTab === "cities" &&
                cities.map((city) => (
                  <tr key={city._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{city.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{city.state}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{city.sortOrder}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggle(city)} disabled={actionLoading === city._id}>
                        {city.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full"><ToggleRight className="w-3 h-3" /> Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full"><ToggleLeft className="w-3 h-3" /> Inactive</span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(city)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(city._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}

              {activeTab === "bodyTypes" &&
                bodyTypes.map((bt) => (
                  <tr key={bt._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{bt.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{bt.sortOrder}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggle(bt)} disabled={actionLoading === bt._id}>
                        {bt.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full"><ToggleRight className="w-3 h-3" /> Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full"><ToggleLeft className="w-3 h-3" /> Inactive</span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(bt)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(bt._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}

              {activeTab === "fuelTypes" &&
                fuelTypes.map((ft) => (
                  <tr key={ft._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{ft.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ft.sortOrder}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggle(ft)} disabled={actionLoading === ft._id}>
                        {ft.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full"><ToggleRight className="w-3 h-3" /> Active</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium text-gray-500 bg-gray-100 rounded-full"><ToggleLeft className="w-3 h-3" /> Inactive</span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleEdit(ft)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(ft._id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && ((activeTab === "cities" && !cities.length) || (activeTab === "bodyTypes" && !bodyTypes.length) || (activeTab === "fuelTypes" && !fuelTypes.length)) && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    No items found. Click "Add" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="px-6 py-3 border-t border-gray-100">
            <Pagination
              currentPage={page}
              totalPages={paginationMeta.pages}
              totalItems={paginationMeta.total}
              startIndex={paginationMeta.total === 0 ? 0 : (page - 1) * limit + 1}
              endIndex={Math.min(page * limit, paginationMeta.total)}
              pageSize={limit}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setLimit(size as PageSize);
                setPage(1);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md p-6 mx-4 bg-white rounded-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">
                {isEditing ? "Edit" : "Add"}{" "}
                {activeTab === "cities" ? "City" : activeTab === "bodyTypes" ? "Body Type" : "Fuel Type"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-movezy-500 focus:border-movezy-500"
                  value={activeTab === "cities" ? cityForm.name : activeTab === "bodyTypes" ? bodyTypeForm.name : fuelTypeForm.name}
                  onChange={(e) => {
                    if (activeTab === "cities") setCityForm({ ...cityForm, name: e.target.value });
                    else if (activeTab === "bodyTypes") setBodyTypeForm({ ...bodyTypeForm, name: e.target.value });
                    else setFuelTypeForm({ ...fuelTypeForm, name: e.target.value });
                  }}
                  placeholder={activeTab === "cities" ? "e.g. Delhi NCR" : activeTab === "bodyTypes" ? "e.g. Sedan" : "e.g. Petrol"}
                />
              </div>

              {/* State (cities only) */}
              {activeTab === "cities" && (
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">State *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-movezy-500 focus:border-movezy-500"
                    value={cityForm.state}
                    onChange={(e) => setCityForm({ ...cityForm, state: e.target.value })}
                    placeholder="e.g. Delhi"
                  />
                </div>
              )}

              {/* Sort Order */}
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">Sort Order</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-movezy-500 focus:border-movezy-500"
                  value={activeTab === "cities" ? cityForm.sortOrder : activeTab === "bodyTypes" ? bodyTypeForm.sortOrder : fuelTypeForm.sortOrder}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (activeTab === "cities") setCityForm({ ...cityForm, sortOrder: val });
                    else if (activeTab === "bodyTypes") setBodyTypeForm({ ...bodyTypeForm, sortOrder: val });
                    else setFuelTypeForm({ ...fuelTypeForm, sortOrder: val });
                  }}
                />
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={actionLoading === "submit"}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg bg-movezy-500 hover:bg-movezy-600 disabled:opacity-50"
              >
                {actionLoading === "submit" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isEditing ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterDataManagement;
