import React, { useState } from "react";
import { Plus, Edit2, Trash2, X, Save, Filter, Truck, Activity, AlertCircle, CheckCircle } from "lucide-react";

interface Vehicle {
  id: number;
  vehicle: string;
  range: number;
  status: "Active" | "Inactive" | "Available" | "In Transit" | "Maintenance";
  payloadCapacity: number;
  fuelCapacity?: string;
  mileage?: string;
}

const initialVehicles: Vehicle[] = [
  {
    id: 1,
    vehicle: "2 Wheeler",
    range: 60,
    status: "Active",
    payloadCapacity: 30,
  },
  {
    id: 2,
    vehicle: "3 Wheeler",
    range: 120,
    status: "Active",
    payloadCapacity: 500,
  },
  {
    id: 3,
    vehicle: "4 Wheeler (Truck)",
    range: 400,
    status: "Inactive",
    payloadCapacity: 4000,
  },
  {
    id: 4,
    vehicle: "4 Wheeler (EV)",
    range: 180,
    status: "Active",
    payloadCapacity: 1000,
  },
];

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<Partial<Vehicle>>({});

  // Filters
  const [filterType, setFilterType] = useState("All Vehicle Types");
  const [minRange, setMinRange] = useState("");
  const [minPayload, setMinPayload] = useState("");

  // Stats calculation
  const totalVehicles = vehicles.length;
  const availableVehicles = vehicles.filter(v => v.status === "Available").length;
  const inTransitVehicles = vehicles.filter(v => v.status === "In Transit").length;
  const maintenanceVehicles = vehicles.filter(v => v.status === "Maintenance").length;

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      setVehicles(vehicles.filter((v) => v.id !== id));
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setCurrentVehicle(vehicle);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setCurrentVehicle({
      vehicle: "2 Wheeler",
      range: 0,
      status: "Active",
      payloadCapacity: 0,
      fuelCapacity: "",
      mileage: "",
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      setVehicles(
        vehicles.map((v) => (v.id === currentVehicle.id ? (currentVehicle as Vehicle) : v))
      );
    } else {
      setVehicles([...vehicles, { ...currentVehicle, id: Date.now() } as Vehicle]);
    }
    setIsModalOpen(false);
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesType = filterType === "All Vehicle Types" || vehicle.vehicle === filterType;
    const matchesRange = minRange === "" || vehicle.range >= Number(minRange);
    const matchesPayload = minPayload === "" || vehicle.payloadCapacity >= Number(minPayload);
    return matchesType && matchesRange && matchesPayload;
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Vehicle Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage fleet, range, and status.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Fleet</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalVehicles}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Available</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{availableVehicles}</h3>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">In Transit</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{inTransitVehicles}</h3>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Maintenance</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{maintenanceVehicles}</h3>
            </div>
            <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <select
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option>All Vehicle Types</option>
            <option>2 Wheeler</option>
            <option>3 Wheeler</option>
            <option>4 Wheeler (Pickup)</option>
            <option>4 Wheeler (Truck)</option>
            <option>4 Wheeler (EV)</option>
          </select>
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        <input
          type="number"
          placeholder="Minimum Range (km)"
          className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={minRange}
          onChange={(e) => setMinRange(e.target.value)}
        />

        <input
          type="number"
          placeholder="Payload Capacity (kg)"
          className="border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={minPayload}
          onChange={(e) => setMinPayload(e.target.value)}
        />

        <button
          className="bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          onClick={() => {
            /* Already reactive */
          }}
        >
          <Filter className="w-4 h-4" />
          Apply Filters
        </button>
      </div>

      {/* Vehicle Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Vehicle</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Fuel / Battery</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Mileage</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Range (km)</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Payload (kg)</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
              <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{vehicle.vehicle}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{vehicle.fuelCapacity}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{vehicle.mileage}</td>
                <td className="px-6 py-4 text-sm font-semibold text-blue-600">{vehicle.range} km</td>
                <td className="px-6 py-4 text-sm text-gray-600">{vehicle.payloadCapacity} kg</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    vehicle.status === "Available" ? "bg-green-100 text-green-700" :
                    vehicle.status === "In Transit" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {vehicle.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button
                    onClick={() => handleEdit(vehicle)}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(vehicle.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredVehicles.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No vehicles found matching your filters.
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-800">
                {isEditing ? "Edit Vehicle" : "Add New Vehicle"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle
                </label>
                <select
                  value={currentVehicle.vehicle}
                  onChange={(e) => setCurrentVehicle({ ...currentVehicle, vehicle: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Bike">Bike</option>
                  <option value="Tempo">Tempo</option>
                  <option value="Pickup">Pickup</option>
                  <option value="Truck">Truck</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={currentVehicle.status}
                    onChange={(e) => setCurrentVehicle({ ...currentVehicle, status: e.target.value as any })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option>Available</option>
                    <option>In Transit</option>
                    <option>Maintenance</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fuel/Battery</label>
                  <input
                    type="text"
                    required
                    value={currentVehicle.fuelCapacity || ""}
                    onChange={(e) => setCurrentVehicle({ ...currentVehicle, fuelCapacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 60 L"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mileage</label>
                  <input
                    type="text"
                    required
                    value={currentVehicle.mileage || ""}
                    onChange={(e) => setCurrentVehicle({ ...currentVehicle, mileage: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 14 km/L"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Range (km)</label>
                  <input
                    type="number"
                    required
                    value={currentVehicle.range}
                    onChange={(e) => setCurrentVehicle({ ...currentVehicle, range: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 800"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payload (kg)</label>
                  <input
                    type="number"
                    required
                    value={currentVehicle.payloadCapacity}
                    onChange={(e) => setCurrentVehicle({ ...currentVehicle, payloadCapacity: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Vehicle
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