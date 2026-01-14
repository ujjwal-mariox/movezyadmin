// src/components/Riders/RiderTable.tsx
import React, { useState } from "react";
import { Eye, Edit, Trash2, Search, MapPin, Star, Filter, X, FileText, CreditCard, Calendar, User, Phone, Truck } from "lucide-react";
import type { Rider } from "../../types";

interface RiderTableProps {
  riders: Rider[];
  onStatusToggle: (id: number) => void;
}

const RiderTable: React.FC<RiderTableProps> = ({ riders, onStatusToggle }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Online" | "Offline" | "Busy">("All");
  const [vehicleFilter, setVehicleFilter] = useState("All");
  const [approvalFilter, setApprovalFilter] = useState("All");
  const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
  const [largePhoto, setLargePhoto] = useState<string | null>(null);

  const filteredRiders = riders.filter((rider) => {
    const matchesSearch =
      rider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rider.phone.includes(searchTerm) ||
      rider.vehicle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All" || rider.status === statusFilter;
    const matchesVehicle = vehicleFilter === "All" || rider.vehicle === vehicleFilter;
    const matchesApproval = approvalFilter === "All" || rider.approvalStatus === approvalFilter;
    return matchesSearch && matchesStatus && matchesVehicle && matchesApproval;
  });

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
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 bg-white appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="All">All Vehicles</option>
            <option value="2 Wheeler">2 Wheeler</option>
            <option value="3 Wheeler">3 Wheeler</option>
            <option value="4 Wheeler">4 Wheeler</option>
          </select>
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 bg-white appearance-none cursor-pointer min-w-[150px]"
          >
            <option value="All">All Approvals</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Blocked">Blocked</option>
            <option value="Rejected">Rejected</option>
          </select>
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
                Approval
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
                    {rider.profilePhoto ? (
                      <img 
                        src={rider.profilePhoto} 
                        alt={rider.name}
                        className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLargePhoto(rider.profilePhoto || null);
                        }}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-movezy-100 rounded-full flex items-center justify-center">
                        <span className="text-movezy-600 font-semibold text-sm">
                          {rider.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
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
                <td className="py-4 px-6 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
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
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    rider.approvalStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                    rider.approvalStatus === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    rider.approvalStatus === 'Blocked' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {rider.approvalStatus}
                  </span>
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
                      onClick={() => setSelectedRider(rider)}
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

      {/* Rider Details Modal */}
      {selectedRider && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedRider.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedRider.name)}&background=random`} 
                  alt={selectedRider.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLargePhoto(selectedRider.profilePhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedRider.name)}&background=random`)}
                />
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selectedRider.name}</h2>
                  <p className="text-sm text-gray-500">ID: #{selectedRider.id}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRider(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Personal Information</h3>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <p className="font-medium text-gray-900">{selectedRider.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Joined Date</p>
                    <p className="font-medium text-gray-900">{selectedRider.joinedDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <User className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Account Status</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${selectedRider.accountStatus === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {selectedRider.accountStatus}
                    </span>
                  </div>
                </div>
              </div>

              {/* Vehicle & Documents */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Vehicle & Documents</h3>
                
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Truck className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Vehicle Details</p>
                    <p className="font-medium text-gray-900">{selectedRider.vehicle} • {selectedRider.vehicleNumber}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <CreditCard className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Driving License</p>
                    <p className="font-medium text-gray-900 font-mono">{selectedRider.drivingLicense || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">RC Number</p>
                    <p className="font-medium text-gray-900 font-mono">{selectedRider.rcNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="col-span-1 md:col-span-2 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedRider.completedOrders}</p>
                  <p className="text-xs text-gray-500">Orders</p>
                </div>
                <div className="text-center border-l border-r border-gray-100">
                  <p className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                    {selectedRider.rating} <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  </p>
                  <p className="text-xs text-gray-500">Rating</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedRider.earnings}</p>
                  <p className="text-xs text-gray-500">Earnings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Large Photo Modal */}
      {largePhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4 backdrop-blur-sm" onClick={() => setLargePhoto(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button 
              onClick={() => setLargePhoto(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={largePhoto} 
              alt="Large view" 
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default RiderTable;
