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
  Truck,
  Activity,
  Upload,
  Home,
  MapPin,
  Package,
  Droplets,
  ShieldAlert,
} from "lucide-react";
import { vehicleTypesApi } from "../services/admin-api";
import { type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useDialog } from "../components/Layout/Dialog";

interface VehicleType {
  _id: string;
  name: string;
  description?: string;
  maxWeightKg: number;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minDistanceKm: number;
  minRangeKm: number;
  maxRangeKm: number;
  allowIntraCity: boolean;
  allowInterCity: boolean;
  image?: string;
  icon?: string;
  sortOrder?: number;
  showOnHomeScreen: boolean;
  isActive: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface FormData {
  name: string;
  description: string;
  maxWeightKg: number | string;
  baseFare: number | string;
  perKmRate: number | string;
  perMinuteRate: number | string;
  minDistanceKm: number | string;
  minRangeKm: number | string;
  maxRangeKm: number | string;
  allowIntraCity: boolean;
  allowInterCity: boolean;
  showOnHomeScreen: boolean;
  image: string;
  sortOrder: number | string;
}

const initialFormData: FormData = {
  name: "",
  description: "",
  maxWeightKg: 0,
  baseFare: 0,
  perKmRate: 0,
  perMinuteRate: 0,
  minDistanceKm: 1,
  minRangeKm: 1,
  maxRangeKm: 100,
  allowIntraCity: true,
  allowInterCity: false,
  showOnHomeScreen: true,
  image: "",
  sortOrder: 0,
};

const VehicleManagement: React.FC = () => {
  const dialog = useDialog();
  // Data state
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive" | "deleted"
  >("all");

  // Server-side pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });

  // Notification state
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadVehicleTypes = useCallback(async (p: number, l: number) => {
    try {
      setLoading(true);
      const response = await vehicleTypesApi.getAll({
        page: p,
        limit: l,
        status: filterStatus !== "all" ? filterStatus : undefined,
      });
      setVehicleTypes(response.data.vehicleTypes || []);
      if (response.data.pagination) {
        setPaginationMeta({
          total: response.data.pagination.total || 0,
          pages: response.data.pagination.pages || 0,
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load vehicle types";
      showNotification("error", message);
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // Single useEffect: reset page on filter change, otherwise fetch
  const prevFilterRef = React.useRef(filterStatus);
  useEffect(() => {
    const filterChanged = prevFilterRef.current !== filterStatus;
    prevFilterRef.current = filterStatus;
    if (filterChanged && page !== 1) {
      setPage(1);
    } else {
      loadVehicleTypes(page, limit);
    }
  }, [page, limit, filterStatus, loadVehicleTypes]);

  const handleAdd = () => {
    setFormData(initialFormData);
    setIsEditing(false);
    setEditingId(null);
    setImageFile(null);
    setImagePreview(null);
    setIsModalOpen(true);
  };

  const handleEdit = (vehicleType: VehicleType) => {
    setFormData({
      name: vehicleType.name,
      description: vehicleType.description || "",
      maxWeightKg: vehicleType.maxWeightKg,
      baseFare: vehicleType.baseFare,
      perKmRate: vehicleType.perKmRate,
      perMinuteRate: vehicleType.perMinuteRate,
      minDistanceKm: vehicleType.minDistanceKm || 1,
      minRangeKm: vehicleType.minRangeKm || 1,
      maxRangeKm: vehicleType.maxRangeKm || 100,
      allowIntraCity: vehicleType.allowIntraCity ?? true,
      allowInterCity: vehicleType.allowInterCity ?? false,
      showOnHomeScreen: vehicleType.showOnHomeScreen ?? true,
      image: vehicleType.image || "",
      sortOrder: vehicleType.sortOrder || 0,
    });
    setIsEditing(true);
    setEditingId(vehicleType._id);
    setImageFile(null);
    setImagePreview(vehicleType.image || null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading("submit");
      const payload = {
        ...formData,
        sortOrder: Number(formData.sortOrder) || 0,
        maxWeightKg: Number(formData.maxWeightKg) || 0,
        baseFare: Number(formData.baseFare) || 0,
        perKmRate: Number(formData.perKmRate) || 0,
        perMinuteRate: Number(formData.perMinuteRate) || 0,
        minDistanceKm: Number(formData.minDistanceKm) || 0,
        minRangeKm: Number(formData.minRangeKm) || 0,
        maxRangeKm: Number(formData.maxRangeKm) || 0,
      };

      if (isEditing && editingId) {
        await vehicleTypesApi.update(editingId, payload, imageFile || undefined);
        showNotification("success", "Vehicle type updated successfully");
      } else {
        await vehicleTypesApi.create(payload, imageFile || undefined);
        showNotification("success", "Vehicle type created successfully");
      }

      setIsModalOpen(false);
      loadVehicleTypes(page, limit);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save vehicle type";
      showNotification("error", message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setActionLoading(id);
      await vehicleTypesApi.toggle(id);
      loadVehicleTypes(page, limit);
      showNotification("success", "Status updated successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to toggle status";
      showNotification("error", message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({ title: "Delete vehicle type?", message: "This vehicle type will be permanently removed.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;

    try {
      setActionLoading(id);
      await vehicleTypesApi.delete(id);
      loadVehicleTypes(page, limit);
      showNotification("success", "Vehicle type deleted successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to delete vehicle type";
      showNotification("error", message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      setActionLoading(id);
      await vehicleTypesApi.restore(id);
      loadVehicleTypes(page, limit);
      showNotification("success", "Vehicle type restored successfully");
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to restore vehicle type";
      showNotification("error", message);
    } finally {
      setActionLoading(null);
    }
  };

  // Compute stats from pagination metadata
  const totalVehicles = paginationMeta.total;
  const activeVehicles = vehicleTypes.filter(
    (vt) => vt.isActive && !vt.isDeleted,
  ).length;
  const inactiveVehicles = vehicleTypes.filter(
    (vt) => !vt.isActive && !vt.isDeleted,
  ).length;
  const intercityVehicles = vehicleTypes.filter(
    (vt) => vt.allowInterCity && !vt.isDeleted,
  ).length;

  // Server-side: vehicleTypes IS the current page (already filtered)
  const paginatedVehicleTypes = vehicleTypes;
  const totalItems = paginationMeta.total;
  const totalPages = paginationMeta.pages;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Vehicle Management
          </h1>
          <p className="mt-1 text-gray-600">
            Manage vehicle types for users and drivers to select during booking.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle Type
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-blue-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Fleet</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{totalVehicles}</h3>
              <p className="mt-1 text-xs text-blue-600">Vehicle types</p>
            </div>
            <div className="flex items-center justify-center bg-blue-50 w-11 h-11 rounded-xl">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-green-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Active</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{activeVehicles}</h3>
              <p className="mt-1 text-xs text-green-600">Accepting orders</p>
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
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{inactiveVehicles}</h3>
              <p className="mt-1 text-xs text-amber-600">Paused</p>
            </div>
            <div className="flex items-center justify-center bg-amber-50 w-11 h-11 rounded-xl">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 border-l-4 !border-l-purple-500 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Intercity Ready</p>
              <h3 className="mt-1 text-2xl font-bold text-gray-800">{intercityVehicles}</h3>
              <p className="mt-1 text-xs text-purple-600">Long-haul enabled</p>
            </div>
            <div className="flex items-center justify-center bg-purple-50 w-11 h-11 rounded-xl">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 mb-6 bg-white border border-gray-100 shadow-sm rounded-xl">
        <div className="relative flex-1 max-w-xs">
          <select
            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(
                e.target.value as "all" | "active" | "inactive" | "deleted",
              )
            }
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="deleted">Deleted</option>
          </select>
          <Filter className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 pointer-events-none right-3 top-1/2" />
        </div>

        <button
          onClick={() => loadVehicleTypes(page, limit)}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <RotateCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : (
        /* Vehicle Types Grid */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedVehicleTypes.map((vt) => {
            // Load types inferred from weight capacity
            const supports = {
              fragile: vt.maxWeightKg <= 50,
              heavy: vt.maxWeightKg >= 100,
              liquid: vt.maxWeightKg >= 30 && vt.maxWeightKg <= 500,
            };
            return (
            <div
              key={vt._id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                vt.isDeleted
                  ? "border-red-200 bg-red-50"
                  : vt.isActive
                    ? "border-gray-100"
                    : "border-yellow-200 bg-yellow-50"
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {vt.image ? (
                      <img
                        src={vt.image}
                        alt={vt.name}
                        className="object-cover w-12 h-12 rounded-lg"
                      />
                    ) : (
                      <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                        <Truck className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">{vt.name}</h3>
                      {vt.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {vt.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    {vt.isDeleted ? (
                      <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-full">
                        Deleted
                      </span>
                    ) : vt.isActive ? (
                      <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Fare Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Base Fare</span>
                  <span className="font-medium text-gray-900">
                    ₹{vt.baseFare}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Per Km / Per Min</span>
                  <span className="font-medium text-gray-900">
                    ₹{vt.perKmRate} / ₹{vt.perMinuteRate}
                  </span>
                </div>

                {/* Range Info */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Booking Range</span>
                  <span className="font-medium text-blue-600">
                    {vt.minRangeKm || 1} - {vt.maxRangeKm || 100} km
                  </span>
                </div>

                {/* Max Weight */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Max Weight</span>
                  <span className="font-medium text-gray-900">
                    {vt.maxWeightKg} kg
                  </span>
                </div>

                {/* Service Area */}
                <div className="flex gap-1.5 pt-2 flex-wrap">
                  {vt.showOnHomeScreen && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      Home
                    </span>
                  )}
                  {vt.allowIntraCity && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Intra-city
                    </span>
                  )}
                  {vt.allowInterCity && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Inter-city
                    </span>
                  )}
                  {!vt.allowIntraCity && !vt.allowInterCity && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                      No service area
                    </span>
                  )}
                </div>

                {/* Load Types */}
                <div className="flex gap-1.5 pt-1 flex-wrap">
                  {supports.fragile && (
                    <span className="px-2 py-0.5 bg-pink-50 text-pink-700 text-xs rounded-full flex items-center gap-1 border border-pink-100">
                      <ShieldAlert className="w-3 h-3" />
                      Fragile
                    </span>
                  )}
                  {supports.heavy && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1 border border-gray-200">
                      <Package className="w-3 h-3" />
                      Heavy
                    </span>
                  )}
                  {supports.liquid && (
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full flex items-center gap-1 border border-blue-100">
                      <Droplets className="w-3 h-3" />
                      Liquid
                    </span>
                  )}
                </div>
              </div>

              {/* Card Footer - Actions */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                {actionLoading === vt._id ? (
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                ) : vt.isDeleted ? (
                  <button
                    onClick={() => handleRestore(vt._id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restore
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggle(vt._id)}
                      className={`p-2 rounded-lg transition-colors ${
                        vt.isActive
                          ? "text-green-600 bg-green-100 hover:bg-green-200"
                          : "text-gray-400 bg-gray-100 hover:bg-gray-200"
                      }`}
                      title={vt.isActive ? "Deactivate" : "Activate"}
                    >
                      {vt.isActive ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(vt)}
                      className="p-2 text-blue-600 transition-colors bg-blue-100 rounded-lg hover:bg-blue-200"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vt._id)}
                      className="p-2 text-red-600 transition-colors bg-red-100 rounded-lg hover:bg-red-200"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {!loading && paginatedVehicleTypes.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemLabel="vehicle types"
          pageSize={limit}
          onPageSizeChange={(size) => { setLimit(size as PageSize); setPage(1); }}
        />
      )}

      {/* Empty State */}
      {!loading && paginatedVehicleTypes.length === 0 && (
        <div className="py-16 text-center">
          <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900">
            No vehicle types found
          </h3>
          <p className="mt-1 text-gray-500">
            {filterStatus !== "all"
              ? "Try changing the filter or add a new vehicle type."
              : "Get started by adding your first vehicle type."}
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle Type
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="flex flex-col w-full max-w-2xl overflow-hidden bg-white shadow-xl rounded-xl max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Vehicle Type" : "Add New Vehicle Type"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 transition-colors hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 p-6 space-y-4 overflow-y-auto"
            >
              {/* Name & Description */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2 Wheeler, Auto, Mini Truck"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
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
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Short description for users"
                />
              </div>

              {/* Weight & Image */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Max Weight (kg) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.maxWeightKg}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxWeightKg: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 20 for bike, 500 for truck"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Vehicle Image
                  </label>
                  <div className="flex items-center gap-4">
                    {(imagePreview || formData.image) && (
                      <img
                        src={imagePreview || formData.image}
                        alt="Vehicle"
                        className="object-contain w-16 h-16 border rounded-lg"
                      />
                    )}
                    <label className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg cursor-pointer hover:bg-blue-50">
                      <Upload className="w-4 h-4" />
                      {imageFile ? imageFile.name : "Choose Image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setImageFile(file);
                            setImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Fare Section */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Fare Configuration
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Base Fare (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.baseFare}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          baseFare: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Per Km (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.perKmRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          perKmRate: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Per Minute (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.perMinuteRate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          perMinuteRate: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>

              {/* Range Section */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Booking Range Limits
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Min Distance (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minDistanceKm}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minDistanceKm: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Min Range (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.minRangeKm}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minRangeKm: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block mb-1 text-sm font-medium text-gray-700">
                      Max Range (km)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maxRangeKm}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxRangeKm: e.target.value === '' ? '' : Number(e.target.value),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100"
                    />
                  </div>
                </div>
              </div>

              {/* Service Area Section */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Service Area Settings
                </h3>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowIntraCity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowIntraCity: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Allow Intra-city (Within city)
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.allowInterCity}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          allowInterCity: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Allow Inter-city (Outside city)
                    </span>
                  </label>
                </div>
              </div>

              {/* Home Screen Visibility */}
              <div className="pt-4 border-t border-gray-100">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Home Screen Visibility
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.showOnHomeScreen}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        showOnHomeScreen: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    Show on Home Screen
                  </span>
                  <span className="text-xs text-gray-400">
                    — Only vehicles with this enabled will appear on the user app home screen
                  </span>
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 transition-colors rounded-lg hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === "submit"}
                  className="flex items-center gap-2 px-6 py-2 text-white transition-colors bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === "submit" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isEditing ? "Update" : "Create"} Vehicle Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;
