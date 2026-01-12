// src/pages/Dashboard.tsx
import React from "react";
import {
  Package,
  Truck,
  DollarSign,
  Clock,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import StatCard from "../components/Dashboard/StatCard";
import RecentOrders from "../components/Dashboard/RecentOrders";
import type { Order } from "../types";

const Dashboard: React.FC = () => {
  const stats = [
    {
      label: "Total Orders",
      value: "2,543",
      change: "+12.5%",
      icon: Package,
      color: "blue" as const,
    },
    {
      label: "Active Riders",
      value: "145",
      change: "+5.2%",
      icon: Truck,
      color: "green" as const,
    },
    {
      label: "Total Revenue",
      value: "₹1,24,500",
      change: "+18.3%",
      icon: DollarSign,
      color: "orange" as const,
    },
    {
      label: "Pending Orders",
      value: "23",
      change: "-8.1%",
      icon: Clock,
      color: "purple" as const,
    },
  ];

  const recentOrders: Order[] = [
    {
      id: "ORD001",
      customerName: "Rahul Sharma",
      rider: "Amit Kumar",
      status: "Delivered",
      amount: 450,
      date: "2024-07-26",
    },
    {
      id: "ORD002",
      customerName: "Priya Patel",
      rider: "Vijay Singh",
      status: "In Transit",
      amount: 680,
      date: "2024-07-26",
    },
    {
      id: "ORD003",
      customerName: "Arjun Reddy",
      rider: "Ravi Verma",
      status: "Pending",
      amount: 320,
      date: "2024-07-25",
    },
    {
      id: "ORD004",
      customerName: "Sneha Desai",
      rider: "Suresh Yadav",
      status: "Delivered",
      amount: 890,
      date: "2024-07-25",
    },
    {
      id: "ORD005",
      customerName: "Vikram Singh",
      rider: "Manoj Tiwari",
      status: "In Transit",
      amount: 1250,
      date: "2024-07-24",
    },
    {
      id: "ORD006",
      customerName: "Anjali Mehta",
      rider: "Sandeep Das",
      status: "Cancelled",
      amount: 500,
      date: "2024-07-23",
    },
  ];

  const revenueData = [
    { name: "Mon", value: 12400 },
    { name: "Tue", value: 15300 },
    { name: "Wed", value: 18200 },
    { name: "Thu", value: 16800 },
    { name: "Fri", value: 21500 },
    { name: "Sat", value: 24900 },
    { name: "Sun", value: 28500 },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              Revenue Overview
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-semibold">+18.3%</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={revenueData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#1F2937' }}
                  formatter={(value: any) => [`₹${(value || 0).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Riders */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            Top Riders This Week
          </h3>
          <div className="space-y-3">
            {[
              { name: "Amit Kumar", orders: 45, rating: 4.9 },
              { name: "Ravi Verma", orders: 42, rating: 4.8 },
              { name: "Vijay Singh", orders: 38, rating: 4.7 },
              { name: "Suresh Yadav", orders: 35, rating: 4.6 },
            ].map((rider, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-movezy-100 rounded-full flex items-center justify-center">
                    <span className="text-movezy-600 font-semibold">
                      {rider.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {rider.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {rider.orders} deliveries
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-yellow-500">★</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {rider.rating}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={recentOrders} />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700">
              New Customers
            </h4>
          </div>
          <p className="text-2xl font-bold text-gray-800">156</p>
          <p className="text-sm text-gray-600 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700">New Riders</h4>
          </div>
          <p className="text-2xl font-bold text-gray-800">12</p>
          <p className="text-sm text-gray-600 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <h4 className="text-sm font-semibold text-gray-700">
              Avg. Order Value
            </h4>
          </div>
          <p className="text-2xl font-bold text-gray-800">₹485</p>
          <p className="text-sm text-gray-600 mt-1">Last 30 days</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
