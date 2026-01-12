import React, { useState } from "react";
import { Plus, Edit2, Trash2, X, Save, Eye, Search, MapPin, Weight, Info } from "lucide-react";

const initialVehicles = [
  {
    id: 1,
    name: "Bike",
    minRange: "0 km",
    maxRange: "20 km",
    capacity: "Up to 20 kg",
    useCase: "Documents, food, small parcels",
    status: "Active",
  },
  {
    id: 2,
    name: "Tempo",
    minRange: "21 km",
    maxRange: "100 km",
    capacity: "Up to 500 kg",
    useCase: "Household items, medium loads",
    status: "Active",
  },
  {
    id: 3,
    name: "Truck",
    minRange: "100+ km",
    maxRange: "Unlimited",
    capacity: "Up to 2000 kg",
    useCase: "Heavy goods, relocation",
    status: "Active",
  },
];

const VehicleManagement = () => {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<any>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewVehicle, setViewVehicle] = useState<any>(null);

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this vehicle?")) {
      setVehicles(vehicles.filter((v) => v.id !== id));
    }
  };

  const handleEdit = (vehicle: any) => {
    setCurrentVehicle(vehicle);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleView = (vehicle: any) => {
    setViewVehicle(vehicle);
    setIsViewModalOpen(true);
  };

  const handleAdd = () => {
    setCurrentVehicle({
      name: "",
      minRange: "",
      maxRange: "",
      capacity: "",
      useCase: "",
      status: "Active",
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing) {
      setVehicles(
        vehicles.map((v) => (v.id === currentVehicle.id ? currentVehicle : v))
      );
    } else {
      setVehicles([...vehicles, { ...currentVehicle, id: Date.now() }]);
    }
    setIsModalOpen(false);
  };

  const filteredVehicles = vehicles.filter((vehicle) =>
    vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vehicle.useCase.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Vehicle Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage vehicle types, distance ranges, and load capacities.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search vehicles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Vehicle
          </button>
        </div>
      </div>

      {/* Vehicle Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Vehicle Type</th>
              <th className="px-4 py-3 text-left">Min Distance</th>
              <th className="px-4 py-3 text-left">Max Distance</th>
              <th className="px-4 py-3 text-left">Capacity</th>
              <th className="px-4 py-3 text-left">Use Case</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredVehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-t hover:bg-gray-50 transition">
                <td className="px-4 py-3 font-medium text-gray-800">
                  {vehicle.name}
                </td>
                <td className="px-4 py-3">{vehicle.minRange}</td>
                <td className="px-4 py-3">{vehicle.maxRange}</td>
                <td className="px-4 py-3">{vehicle.capacity}</td>
                <td className="px-4 py-3">{vehicle.useCase}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      vehicle.status === "Active"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center gap-3">
                  <button
                    onClick={() => handleView(vehicle)}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
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
                  Vehicle Name
                </label>
                <input
                  type="text"
                  required
                  value={currentVehicle.name}
                  onChange={(e) =>
                    setCurrentVehicle({ ...currentVehicle, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Bike"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Range
                  </label>
                  <input
                    type="text"
                    required
                    value={currentVehicle.minRange}
                    onChange={(e) =>
                      setCurrentVehicle({
                        ...currentVehicle,
                        minRange: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 0 km"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Range
                  </label>
                  <input
                    type="text"
                    required
                    value={currentVehicle.maxRange}
                    onChange={(e) =>
                      setCurrentVehicle({
                        ...currentVehicle,
                        maxRange: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 20 km"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Capacity
                </label>
                <input
                  type="text"
                  required
                  value={currentVehicle.capacity}
                  onChange={(e) =>
                    setCurrentVehicle({
                      ...currentVehicle,
                      capacity: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Up to 20 kg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Use Case
                </label>
                <input
                  type="text"
                  required
                  value={currentVehicle.useCase}
                  onChange={(e) =>
                    setCurrentVehicle({
                      ...currentVehicle,
                      useCase: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Documents, food"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={currentVehicle.status}
                  onChange={(e) =>
                    setCurrentVehicle({
                      ...currentVehicle,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
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

      {/* View Details Modal */}
      {isViewModalOpen && viewVehicle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  {viewVehicle.name} Details
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Comprehensive vehicle information
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Info className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Status</p>
                    <p className="font-bold text-blue-900">{viewVehicle.status}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">Distance Range</span>
                  </div>
                  <p className="font-bold text-gray-800">{viewVehicle.minRange} - {viewVehicle.maxRange}</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-gray-500">
                    <Weight className="w-4 h-4" />
                    <span className="text-sm font-medium">Load Capacity</span>
                  </div>
                  <p className="font-bold text-gray-800">{viewVehicle.capacity}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider">Recommended Use Case</h3>
                <p className="text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 leading-relaxed">
                  {viewVehicle.useCase}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;