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
  Truck,
  Activity,
  Upload,
  Home,
} from "lucide-react";
import { vehicleTypesApi } from "../services/admin-api";

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
  maxWeightKg: number;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  minDistanceKm: number;
  minRangeKm: number;
  maxRangeKm: number;
  allowIntraCity: boolean;
  allowInterCity: boolean;
  showOnHomeScreen: boolean;
  image: string;
  sortOrder: number;
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

  // Notification state
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadVehicleTypes = async () => {
    try {
      setLoading(true);
      const response = await vehicleTypesApi.getAll();
      setVehicleTypes(response.data.vehicleTypes || []);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to load vehicle types";
      showNotification("error", message);
    } finally {
      setLoading(false);
    }
  };

  // Load data
  useEffect(() => {
    loadVehicleTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      if (isEditing && editingId) {
        await vehicleTypesApi.update(editingId, formData, imageFile || undefined);
        showNotification("success", "Vehicle type updated successfully");
      } else {
        await vehicleTypesApi.create(formData, imageFile || undefined);
        showNotification("success", "Vehicle type created successfully");
      }

      setIsModalOpen(false);
      loadVehicleTypes();
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
      loadVehicleTypes();
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
    if (!window.confirm("Are you sure you want to delete this vehicle type?")) {
      return;
    }

    try {
      setActionLoading(id);
      await vehicleTypesApi.delete(id);
      loadVehicleTypes();
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
      loadVehicleTypes();
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

  // Compute stats
  const totalVehicles = vehicleTypes.filter((vt) => !vt.isDeleted).length;
  const activeVehicles = vehicleTypes.filter(
    (vt) => vt.isActive && !vt.isDeleted,
  ).length;
  const inactiveVehicles = vehicleTypes.filter(
    (vt) => !vt.isActive && !vt.isDeleted,
  ).length;
  const intercityVehicles = vehicleTypes.filter(
    (vt) => vt.allowInterCity && !vt.isDeleted,
  ).length;

  // Filter vehicle types
  const filteredVehicleTypes = vehicleTypes.filter((vt) => {
    if (filterStatus === "active") return vt.isActive && !vt.isDeleted;
    if (filterStatus === "inactive") return !vt.isActive && !vt.isDeleted;
    if (filterStatus === "deleted") return vt.isDeleted;
    return true;
  });

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
      <div className="grid grid-cols-1 gap-6 mb-6 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Fleet</p>
              <h3 className="mt-1 text-3xl font-bold text-gray-900">
                {totalVehicles}
              </h3>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-xl">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <h3 className="mt-1 text-3xl font-bold text-gray-900">
                {activeVehicles}
              </h3>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-xl">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Inactive</p>
              <h3 className="mt-1 text-3xl font-bold text-gray-900">
                {inactiveVehicles}
              </h3>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-xl">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Intercity Allowed
              </p>
              <h3 className="mt-1 text-3xl font-bold text-gray-900">
                {intercityVehicles}
              </h3>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-red-50 rounded-xl">
              <Activity className="w-6 h-6 text-red-600" />
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
          onClick={loadVehicleTypes}
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
          {filteredVehicleTypes.map((vt) => (
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
                <div className="flex gap-2 pt-2 flex-wrap">
                  {vt.showOnHomeScreen && (
                    <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full flex items-center gap-1">
                      <Home className="w-3 h-3" />
                      Home Screen
                    </span>
                  )}
                  {vt.allowIntraCity && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      Intra-city
                    </span>
                  )}
                  {vt.allowInterCity && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                      Inter-city
                    </span>
                  )}
                  {!vt.allowIntraCity && !vt.allowInterCity && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                      No service area set
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
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredVehicleTypes.length === 0 && (
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
                        sortOrder: Number(e.target.value),
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
                        maxWeightKg: Number(e.target.value),
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
                          baseFare: Number(e.target.value),
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
                          perKmRate: Number(e.target.value),
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
                          perMinuteRate: Number(e.target.value),
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
                          minDistanceKm: Number(e.target.value),
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
                          minRangeKm: Number(e.target.value),
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
                          maxRangeKm: Number(e.target.value),
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
