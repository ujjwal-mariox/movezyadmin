// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Package,
  Truck,
  DollarSign,
  Clock,
  TrendingUp,
  Users,
  AlertTriangle,
  Activity,
  Zap,
  XCircle,
  ChevronRight,
  Shield,
  Eye,
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
import { useNavigate } from "react-router-dom";
import StatCard from "../components/Dashboard/StatCard";
import RecentOrders from "../components/Dashboard/RecentOrders";
import type { Order } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const getToken = () => localStorage.getItem("adminToken");

const fetchApi = async (endpoint: string, signal?: AbortSignal) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) return null;
  return res.json();
};

interface Alert {
  type: string;
  severity: "critical" | "warning" | "info";
  message: string;
  count: number;
  link: string;
}

interface LiveStats {
  totalOrders: number;
  liveOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  activeDrivers: number;
  totalDrivers: number;
  activeSOS: number;
  totalUsers: number;
  failureRate: number;
  driverUtilization: number;
}

interface TimelineEvent {
  _id: string;
  adminName: string;
  action: string;
  module: string;
  description: string;
  createdAt: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [, setLoading] = useState(true);
  const [alertsDismissed, setAlertsDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadDashboardData = useCallback(async () => {
    // Abort any in-flight request before starting a new one
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [statsRes, alertsRes, timelineRes] = await Promise.all([
        fetchApi("/admin/dashboard/live-stats", controller.signal),
        fetchApi("/admin/dashboard/alerts", controller.signal),
        fetchApi("/admin/dashboard/event-timeline?limit=10", controller.signal),
      ]);
      if (statsRes?.data) setLiveStats(statsRes.data);
      const rawAlerts = alertsRes?.data?.alerts ?? alertsRes?.data ?? [];
      setAlerts(Array.isArray(rawAlerts) ? rawAlerts : []);
      const rawTimeline = timelineRes?.data?.events ?? timelineRes?.data ?? [];
      setTimeline(Array.isArray(rawTimeline) ? rawTimeline : []);
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 60000); // Auto-refresh every 60s
    return () => {
      clearInterval(interval);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDashboardData]);

  const s = liveStats || {
    totalOrders: 0, liveOrders: 0, pendingOrders: 0, todayRevenue: 0,
    activeDrivers: 0, totalDrivers: 0, activeSOS: 0, totalUsers: 0,
    failureRate: 0, driverUtilization: 0,
  };

  const stats = [
    { label: "Total Orders", value: s.totalOrders.toLocaleString(), change: "+12.5%", icon: Package, color: "blue" as const, path: "/admin/orders" },
    { label: "Live Orders", value: s.liveOrders.toLocaleString(), change: `${s.pendingOrders} pending`, icon: Zap, color: "orange" as const, path: "/admin/orders" },
    { label: "Active Drivers", value: `${s.activeDrivers}/${s.totalDrivers}`, change: `${s.driverUtilization.toFixed(0)}% utilization`, icon: Truck, color: "green" as const, path: "/admin/tracking" },
    { label: "Today Revenue", value: `₹${s.todayRevenue.toLocaleString()}`, change: "+18.3%", icon: DollarSign, color: "orange" as const, path: "/admin/finance" },
    { label: "Failure Rate", value: `${s.failureRate.toFixed(1)}%`, change: s.failureRate > 10 ? "High" : "Normal", icon: XCircle, color: s.failureRate > 10 ? "red" as const : "purple" as const, path: "/admin/orders" },
    { label: "Active SOS", value: s.activeSOS.toLocaleString(), change: s.activeSOS > 0 ? "Action needed" : "All clear", icon: AlertTriangle, color: s.activeSOS > 0 ? "red" as const : "green" as const, path: "/admin/sos" },
    { label: "Total Users", value: s.totalUsers.toLocaleString(), change: "+5.2%", icon: Users, color: "blue" as const, path: "/admin/app-users" },
    { label: "Pending Orders", value: s.pendingOrders.toLocaleString(), change: "-8.1%", icon: Clock, color: "purple" as const, path: "/admin/orders" },
  ];

  // Mock revenue data (will be replaced when finance API provides daily data)
  const revenueData = [
    { name: "Mon", value: 12400 },
    { name: "Tue", value: 15300 },
    { name: "Wed", value: 18200 },
    { name: "Thu", value: 16800 },
    { name: "Fri", value: 21500 },
    { name: "Sat", value: 24900 },
    { name: "Sun", value: 28500 },
  ];

  const recentOrders: Order[] = [
    { id: "ORD001", customerName: "Rahul Sharma", rider: "Amit Kumar", status: "Delivered", amount: 450, date: "2024-07-26" },
    { id: "ORD002", customerName: "Priya Patel", rider: "Vijay Singh", status: "In Transit", amount: 680, date: "2024-07-26" },
    { id: "ORD003", customerName: "Arjun Reddy", rider: "Ravi Verma", status: "Pending", amount: 320, date: "2024-07-25" },
    { id: "ORD004", customerName: "Sneha Desai", rider: "Suresh Yadav", status: "Delivered", amount: 890, date: "2024-07-25" },
    { id: "ORD005", customerName: "Vikram Singh", rider: "Manoj Tiwari", status: "In Transit", amount: 1250, date: "2024-07-24" },
    { id: "ORD006", customerName: "Anjali Mehta", rider: "Sandeep Das", status: "Cancelled", amount: 500, date: "2024-07-23" },
  ];

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning" || a.severity === "info");
  const hasAlerts = alerts.length > 0 && !alertsDismissed;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "unassigned_orders": return Package;
      case "active_sos": return AlertTriangle;
      case "expiring_documents": return Shield;
      case "cancellation_spike": return XCircle;
      case "idle_drivers": return Clock;
      default: return Activity;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Real-time Alert Strip */}
      {hasAlerts && (
        <div className="space-y-2">
          {criticalAlerts.map((alert, i) => {
            const Icon = getAlertIcon(alert.type);
            return (
              <div key={i} className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Icon className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-red-800">{alert.message}</p>
                    <p className="text-xs text-red-600">{alert.count} item(s) require attention</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(alert.link)} className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </div>
              </div>
            );
          })}
          {warningAlerts.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                {warningAlerts.map((alert, i) => (
                  <button key={i} onClick={() => navigate(alert.link)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-800 hover:bg-amber-100 transition-colors">
                    {React.createElement(getAlertIcon(alert.type), { className: "w-3.5 h-3.5" })}
                    {alert.message} ({alert.count})
                  </button>
                ))}
              </div>
              <button onClick={() => setAlertsDismissed(true)} className="text-amber-400 hover:text-amber-600">
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Live Stats Grid — 8 KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard
            key={index}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
            onClick={() => navigate(stat.path)}
          />
        ))}
      </div>

      {/* Charts + Event Timeline Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Revenue Overview</h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-600 font-semibold">+18.3%</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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

        {/* Event Timeline */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Event Timeline</h3>
            <button onClick={() => navigate("/admin/audit-logs")} className="text-xs text-movezy-600 hover:underline flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3 max-h-56 overflow-y-auto">
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No recent events</p>
            ) : (
              timeline.map((event) => (
                <div key={event._id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-0">
                  <div className="w-2 h-2 mt-2 rounded-full bg-movezy-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{event.adminName}</span>{" "}
                      <span className="text-gray-500">{event.action.replace(/_/g, " ")}</span>
                    </p>
                    <p className="text-xs text-gray-400">{event.description}</p>
                    <p className="text-[11px] text-gray-300 mt-0.5">{getTimeAgo(event.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <RecentOrders orders={recentOrders} />
    </div>
  );
};

export default Dashboard;
