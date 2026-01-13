// src/components/Riders/RiderTable.tsx
import React, { useState } from "react";
import { Eye, Edit, Trash2, Search, MapPin, Star, Filter } from "lucide-react";
import type { Rider } from "../../types";

interface RiderTableProps {
  riders: Rider[];
  onStatusToggle: (id: number) => void;
}

const RiderTable: React.FC<RiderTableProps> = ({ riders, onStatusToggle }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Online" | "Offline" | "Busy">("All");

  const filteredRiders = riders.filter((rider) => {
    const matchesSearch =
      rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.phone.includes(searchTerm) ||
      rider.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || rider.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getVehicleIcon = (vehicle: Rider["vehicle"]): string => {
    const icons: Record<Rider["vehicle"], string> = {
      Bike: "🏍️",
      Tempo: "🚛",
      Pickup: "🚙",
      Truck: "🚚",
    };
    return icons[vehicle];
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search riders by name, phone or vehicle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 transition-all"
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 bg-white appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="All">All Status</option>
            <option value="Online">Online</option>
            <option value="Offline">Offline</option>
            <option value="Busy">Busy</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                ID
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                Rider
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                Phone
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                Vehicle
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                Completed
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                Rating
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                Status
              </th>
              <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRiders.map((rider) => (
              <tr
                key={rider.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <td className="py-4 px-6 text-sm text-gray-600">#{rider.id}</td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-movezy-100 rounded-full flex items-center justify-center">
                      <span className="text-movezy-600 font-semibold text-sm">
                        {rider.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {rider.name}
                      </div>
                      {rider.currentLocation && (
                        <div className="text-xs text-gray-500 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {rider.currentLocation}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-600">
                  {rider.phone}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {getVehicleIcon(rider.vehicle)}
                    </span>
                    <span className="text-sm text-gray-600">
                      {rider.vehicle}
                    </span>
                  </div>
                </td>
                <td className="py-4 px-6 text-sm text-gray-600">
                  {rider.completedOrders}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-semibold text-gray-800">
                      {rider.rating}
                    </span>
                    <span className="text-xs text-gray-500">/5</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={rider.accountStatus === "Active"}
                        onChange={() => onStatusToggle(rider.id)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                    <span className="text-sm text-gray-600">{rider.accountStatus}</span>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-2 text-gray-400 hover:text-movezy-600 hover:bg-movezy-50 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* No Results */}
      {filteredRiders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No riders found matching your criteria.
        </div>
      )}

      {/* Pagination Footer */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Showing {filteredRiders.length} of {riders.length} riders
        </div>
        <div className="flex space-x-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Previous
          </button>
          <button className="px-4 py-2 bg-movezy-500 text-white rounded-lg text-sm font-medium hover:bg-movezy-600">
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiderTable;
