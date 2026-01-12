// src/pages/CustomerManagement.tsx
import React from "react";
import { UserPlus, Download, Filter } from "lucide-react";
import CustomerTable from "../components/Customers/CustomerTable";
import type { Customer } from "../types";

const CustomerManagement: React.FC = () => {
  const customers: Customer[] = [
    {
      id: 1,
      name: "Rahul Sharma",
      email: "rahul@example.com",
      phone: "+91 98765 43210",
      orders: 15,
      status: "Active",
      totalSpent: "₹6,750",
      joinedDate: "2024-01-15",
    },
    {
      id: 2,
      name: "Priya Patel",
      email: "priya@example.com",
      phone: "+91 98765 43211",
      orders: 8,
      status: "Active",
      totalSpent: "₹3,200",
      joinedDate: "2024-02-20",
    },
    {
      id: 3,
      name: "Arjun Reddy",
      email: "arjun@example.com",
      phone: "+91 98765 43212",
      orders: 23,
      status: "Active",
      totalSpent: "₹11,500",
      joinedDate: "2023-12-10",
    },
    {
      id: 4,
      name: "Sneha Desai",
      email: "sneha@example.com",
      phone: "+91 98765 43213",
      orders: 12,
      status: "Inactive",
      totalSpent: "₹5,400",
      joinedDate: "2024-01-05",
    },
    {
      id: 5,
      name: "Vikram Singh",
      email: "vikram@example.com",
      phone: "+91 98765 43214",
      orders: 19,
      status: "Active",
      totalSpent: "₹9,250",
      joinedDate: "2023-11-22",
    },
    {
      id: 6,
      name: "Anjali Mehta",
      email: "anjali@example.com",
      phone: "+91 98765 43215",
      orders: 7,
      status: "Active",
      totalSpent: "₹2,800",
      joinedDate: "2024-03-01",
    },
    {
      id: 7,
      name: "Rohan Kumar",
      email: "rohan@example.com",
      phone: "+91 98765 43216",
      orders: 31,
      status: "Active",
      totalSpent: "₹15,650",
      joinedDate: "2023-10-15",
    },
    {
      id: 8,
      name: "Neha Gupta",
      email: "neha@example.com",
      phone: "+91 98765 43217",
      orders: 5,
      status: "Inactive",
      totalSpent: "₹1,950",
      joinedDate: "2024-02-28",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Customer Management
          </h2>
          <p className="text-gray-600">Manage and view all your customers</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filter</span>
          </button>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
          </button>
          <button className="flex items-center space-x-2 px-6 py-2 bg-gradient-to-r from-movezy-500 to-movezy-600 text-white rounded-lg hover:shadow-lg transition-shadow">
            <UserPlus className="w-4 h-4" />
            <span className="font-medium">Add Customer</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Customers</p>
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">👥</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">{customers.length}</p>
          <p className="text-xs text-green-600 mt-1">+12 this month</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Active Customers</p>
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {customers.filter((c) => c.status === "Active").length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(
              (customers.filter((c) => c.status === "Active").length /
                customers.length) *
                100
            )}
            % of total
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Orders</p>
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-orange-600 text-xl">📦</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {customers.reduce((sum, c) => sum + c.orders, 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">From all customers</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Avg. Orders</p>
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">📊</span>
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {Math.round(
              customers.reduce((sum, c) => sum + c.orders, 0) / customers.length
            )}
          </p>
          <p className="text-xs text-gray-500 mt-1">Per customer</p>
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable customers={customers} />
    </div>
  );
};

export default CustomerManagement;
