// src/pages/RiderManagement.tsx
import React from "react";
import { UserPlus, Download, MapPin, Bike, PieChart, Truck, Star, Package, Activity } from "lucide-react";
import RiderTable from "../components/Riders/RiderTable";
import type { Rider } from "../types";

const RiderManagement: React.FC = () => {
  const riders: Rider[] = [
    {
      id: 1,
      name: "Amit Kumar",
      phone: "+91 98765 43220",
      vehicle: "Bike",
      status: "Online",
      completedOrders: 245,
      rating: 4.8,
      earnings: "₹48,500",
      joinedDate: "2023-08-15",
      vehicleNumber: "DL-01-AB-1234",
      currentLocation: "Connaught Place, Delhi",
      accountStatus: "Active",
    },
    {
      id: 2,
      name: "Vijay Singh",
      phone: "+91 98765 43221",
      vehicle: "Tempo",
      status: "Online",
      completedOrders: 189,
      rating: 4.6,
      earnings: "₹62,300",
      joinedDate: "2023-09-20",
      vehicleNumber: "DL-02-CD-5678",
      currentLocation: "Nehru Place, Delhi",
      accountStatus: "Active",
    },
    {
      id: 3,
      name: "Ravi Verma",
      phone: "+91 98765 43222",
      vehicle: "Pickup",
      status: "Offline",
      completedOrders: 312,
      rating: 4.9,
      earnings: "₹78,000",
      joinedDate: "2023-07-10",
      vehicleNumber: "DL-03-EF-9012",
      currentLocation: "Dwarka, Delhi",
      accountStatus: "Inactive",
    },
    {
      id: 4,
      name: "Suresh Yadav",
      phone: "+91 98765 43223",
      vehicle: "Bike",
      status: "Online",
      completedOrders: 156,
      rating: 4.5,
      earnings: "₹35,200",
      joinedDate: "2023-10-05",
      vehicleNumber: "DL-04-GH-3456",
      currentLocation: "Karol Bagh, Delhi",
      accountStatus: "Active",
    },
    {
      id: 5,
      name: "Manoj Tiwari",
      phone: "+91 98765 43224",
      vehicle: "Truck",
      status: "Offline",
      completedOrders: 98,
      rating: 4.7,
      earnings: "₹85,600",
      joinedDate: "2023-11-12",
      vehicleNumber: "DL-05-IJ-7890",
      currentLocation: "Rohini, Delhi",
      accountStatus: "Inactive",
    },
    {
      id: 6,
      name: "Rajesh Kumar",
      phone: "+91 98765 43225",
      vehicle: "Bike",
      status: "Busy",
      completedOrders: 203,
      rating: 4.8,
      earnings: "₹42,100",
      joinedDate: "2023-08-28",
      vehicleNumber: "DL-06-KL-2345",
      currentLocation: "Lajpat Nagar, Delhi",
      accountStatus: "Active",
    },
    {
      id: 7,
      name: "Santosh Singh",
      phone: "+91 98765 43226",
      vehicle: "Tempo",
      status: "Online",
      completedOrders: 167,
      rating: 4.6,
      earnings: "₹55,800",
      joinedDate: "2023-09-14",
      vehicleNumber: "DL-07-MN-6789",
      currentLocation: "Saket, Delhi",
      accountStatus: "Active",
    },
    {
      id: 8,
      name: "Deepak Sharma",
      phone: "+91 98765 43227",
      vehicle: "Pickup",
      status: "Online",
      completedOrders: 278,
      rating: 4.9,
      earnings: "₹72,400",
      joinedDate: "2023-07-22",
      vehicleNumber: "DL-08-OP-0123",
      currentLocation: "Noida Sector 18",
      accountStatus: "Active",
    },
  ];

  const onlineRiders = riders.filter((r) => r.status === "Online").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Delivery Partners</h2>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm">
            <MapPin className="w-4 h-4" />
            <span className="text-sm font-medium">Track Live</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
          </button>
          <button className="flex items-center space-x-2 px-6 py-2.5 bg-gradient-to-r from-movezy-600 to-movezy-700 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 shadow-md font-medium">
            <UserPlus className="w-4 h-4" />
            <span className="font-medium">Add Rider</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">Total Riders</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{riders.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
              <Truck className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '100%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-green-600 transition-colors">Online Now</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{onlineRiders}</h3>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${(onlineRiders / riders.length) * 100}%` }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-yellow-600 transition-colors">Avg. Rating</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{(riders.reduce((sum, r) => sum + r.rating, 0) / riders.length).toFixed(1)}</h3>
            </div>
            <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center group-hover:bg-yellow-100 transition-colors">
              <Star className="w-6 h-6 text-yellow-600 fill-current" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-yellow-500 h-1.5 rounded-full" style={{ width: '90%' }}></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-all duration-300 group">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-orange-600 transition-colors">Total Deliveries</p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">{riders.reduce((sum, r) => sum + r.completedOrders, 0).toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center group-hover:bg-orange-100 transition-colors">
              <Package className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
          </div>
        </div>
      </div>

      {/* Vehicle Distribution */}
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            <PieChart className="w-6 h-6 text-indigo-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">
            Fleet Distribution
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(["Bike", "Tempo", "Pickup", "Truck"] as const).map((vehicle) => {
            const count = riders.filter((r) => r.vehicle === vehicle).length;
            const percentage = Math.round((count / riders.length) * 100);
            return (
              <div
                key={vehicle}
                className="text-center p-3 bg-gray-50 rounded-xl hover:shadow-md transition-all duration-300 group border border-gray-100"
              >
                <div className="w-10 h-10 mx-auto bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform duration-300">
                  {vehicle === "Bike" && <Bike className="w-5 h-5 text-blue-600" />}
                  {vehicle === "Tempo" && <Truck className="w-5 h-5 text-orange-500" />}
                  {vehicle === "Pickup" && <Truck className="w-5 h-5 text-green-600" />}
                  {vehicle === "Truck" && <Truck className="w-5 h-5 text-purple-600" />}
                </div>
                <p className="text-xl font-bold text-gray-800 mb-1">{count}</p>
                <p className="text-xs font-medium text-gray-600 mb-2">{vehicle}</p>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      vehicle === "Bike" ? "bg-blue-600" :
                      vehicle === "Tempo" ? "bg-orange-500" :
                      vehicle === "Pickup" ? "bg-green-600" : "bg-purple-600"
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-2 font-medium">
                  {percentage}% of fleet
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rider Table */}
      <RiderTable riders={riders} />
    </div>
  );
};

export default RiderManagement;
