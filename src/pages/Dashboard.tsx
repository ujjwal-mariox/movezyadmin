// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchActionCenter,
  type ActionCenterPending,
  type ActionCenterDelayed,
  type ActionCenterAtRisk,
} from "../services/api";
import {
  Package,
  Truck,
  DollarSign,
  AlertTriangle,
  Activity,
  XCircle,
  ChevronRight,
  MapPin,
  RefreshCw,
  ExternalLink,
  PlayCircle,
  PauseCircle,
  Zap,
  Clock,
  Phone,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Filter,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useNavigate } from "react-router-dom";

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

// Driver markers for map
const createDriverIcon = (status: string) => {
  const color =
    status === "delayed"
      ? "#EF4444"
      : status === "on_trip"
      ? "#3B82F6"
      : status === "available"
      ? "#10B981"
      : "#9CA3AF";
  return L.divIcon({
    className: "custom-driver-marker",
    html: `<div style="background-color: ${color}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const MapBoundsManager: React.FC<{ points: [number, number][] }> = ({ points }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    }
  }, [points, map]);
  return null;
};

const FlyTo: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 0.8 });
  }, [target, map]);
  return null;
};

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
  delayedOrders?: number;
  failedOrders?: number;
  completedOrders?: number;
  idleDrivers?: number;
}

interface TimelineEvent {
  _id: string;
  adminName: string;
  action: string;
  module: string;
  description: string;
  createdAt: string;
}

interface DriverLocation {
  _id: string;
  fullName: string;
  status: string;
  location: { lat: number; lng: number };
  currentBookingId?: string;
}

const REFRESH_INTERVALS = [10, 20, 30, 60];
const CITY_OPTIONS = ["All cities", "Bangalore", "Mumbai", "Delhi", "Chennai", "Hyderabad"];
const TIME_RANGES = ["Today", "Last 24h", "This week", "This month"];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [pendingOrders, setPendingOrders] = useState<ActionCenterPending[]>([]);
  const [delayedOrders, setDelayedOrders] = useState<ActionCenterDelayed[]>([]);
  const [atRiskOrders, setAtRiskOrders] = useState<ActionCenterAtRisk[]>([]);
  const [, setLoading] = useState(true);

  // Sticky filters
  const [city, setCity] = useState("All cities");
  const [timeRange, setTimeRange] = useState("Today");

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(20);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Automation toggles
  const [autoAssign, setAutoAssign] = useState(true);
  const [smartDelay, setSmartDelay] = useState(true);

  // Smart list
  const [activeTab, setActiveTab] = useState<"delayed" | "unassigned" | "nearby">("delayed");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [statsRes, timelineRes, driversRes, actionRes] = await Promise.all([
        fetchApi("/admin/dashboard/live-stats", controller.signal),
        fetchApi("/admin/dashboard/event-timeline?limit=10", controller.signal),
        fetchApi("/admin/tracking/drivers?status=online", controller.signal),
        fetchActionCenter(controller.signal).catch(() => null),
      ]);
      if (statsRes?.data) setLiveStats(statsRes.data);
      const rawTimeline = timelineRes?.data?.events ?? timelineRes?.data ?? [];
      setTimeline(Array.isArray(rawTimeline) ? rawTimeline : []);
      const rawDrivers = driversRes?.data?.drivers ?? driversRes?.data ?? [];
      setDrivers(Array.isArray(rawDrivers) ? rawDrivers : []);
      const action = actionRes?.data ?? actionRes;
      setPendingOrders(Array.isArray(action?.pendingAssignments) ? action.pendingAssignments : []);
      setDelayedOrders(Array.isArray(action?.delayedOrders) ? action.delayedOrders : []);
      setAtRiskOrders(Array.isArray(action?.atRisk) ? action.atRisk : []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      if (err?.name !== "AbortError") console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [loadDashboardData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(loadDashboardData, refreshInterval * 1000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshInterval, loadDashboardData]);

  const s = liveStats || {
    totalOrders: 0,
    liveOrders: 0,
    pendingOrders: 0,
    todayRevenue: 0,
    activeDrivers: 0,
    totalDrivers: 0,
    activeSOS: 0,
    totalUsers: 0,
    failureRate: 0,
    driverUtilization: 0,
  };

  const delayedCount = s.delayedOrders ?? 0;
  const failedCount = s.failedOrders ?? 0;
  const completedCount = s.completedOrders ?? Math.max(s.totalOrders - s.liveOrders - s.pendingOrders - failedCount, 0);
  const idleDrivers = s.idleDrivers ?? Math.max(s.activeDrivers - Math.round(s.activeDrivers * (s.driverUtilization / 100)), 0);
  const activeOnTrip = Math.max(s.activeDrivers - idleDrivers, 0);

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  // Chart data
  const orderBreakdown = [
    { name: "Completed", value: completedCount, color: "#10B981" },
    { name: "Pending", value: s.pendingOrders, color: "#F59E0B" },
    { name: "Failed", value: failedCount, color: "#EF4444" },
  ];
  const driverBreakdown = [
    { name: "Active", value: activeOnTrip, color: "#10B981" },
    { name: "Idle", value: idleDrivers, color: "#9CA3AF" },
  ];

  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const driverPoints: [number, number][] = drivers
    .filter((d) => d.location?.lat && d.location?.lng)
    .map((d) => [d.location.lat, d.location.lng] as [number, number]);

  // Critical KPI cards
  const kpis = [
    {
      label: "Active Orders",
      value: s.liveOrders,
      hint: `+12% vs yesterday`,
      trend: "up" as const,
      icon: Package,
      tone: "neutral" as const,
      path: "/admin/orders?status=in_progress",
    },
    {
      label: "Delayed Orders",
      value: delayedCount,
      hint: delayedCount > 0 ? `${delayedCount} need attention` : "All on time",
      trend: "down" as const,
      icon: Clock,
      tone: "danger" as const,
      path: "/admin/orders?status=delayed",
    },
    {
      label: "Failed Orders",
      value: failedCount,
      hint: `${s.failureRate.toFixed(1)}% failure rate`,
      trend: "down" as const,
      icon: XCircle,
      tone: "danger" as const,
      path: "/admin/orders?status=cancelled",
    },
    {
      label: "Available Drivers",
      value: s.activeDrivers,
      hint: `${s.totalDrivers} total · ${s.driverUtilization.toFixed(0)}% utilized`,
      trend: "up" as const,
      icon: Truck,
      tone: "success" as const,
      path: "/admin/tracking",
    },
    {
      label: "Revenue Today",
      value: `₹${s.todayRevenue.toLocaleString()}`,
      hint: "+18.3% vs yesterday",
      trend: "up" as const,
      icon: DollarSign,
      tone: "neutral" as const,
      path: "/admin/finance",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Sticky filter bar */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur border-b border-gray-200 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Operations</h1>
          <span className="text-xs text-gray-500 hidden md:inline">
            Updated {formatTimeAgo(lastRefreshed.toISOString())} ago
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="text-sm bg-transparent focus:outline-none text-gray-700"
            >
              {CITY_OPTIONS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none text-gray-700"
          >
            {TIME_RANGES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <button
              onClick={() => setAutoRefresh((v) => !v)}
              className={`flex items-center gap-1.5 text-sm font-medium ${
                autoRefresh ? "text-green-600" : "text-gray-500"
              }`}
              title={autoRefresh ? "Auto-refresh on" : "Auto-refresh off"}
            >
              {autoRefresh ? (
                <PauseCircle className="w-4 h-4" />
              ) : (
                <PlayCircle className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Auto</span>
            </button>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefresh}
              className="text-sm bg-transparent focus:outline-none disabled:opacity-50 text-gray-700"
            >
              {REFRESH_INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {i}s
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={loadDashboardData}
            className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
            title="Refresh now"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SECTION 1 — CRITICAL CONTROL STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          const isDanger = k.tone === "danger";
          const isSuccess = k.tone === "success";
          const borderCls = isDanger
            ? "border-l-4 border-red-500"
            : isSuccess
            ? "border-l-4 border-green-500"
            : "border-l-4 border-movezy-500";
          const iconBg = isDanger ? "bg-red-50 text-red-600" : isSuccess ? "bg-green-50 text-green-600" : "bg-movezy-50 text-movezy-600";
          const valueCls = isDanger ? "text-red-600" : "text-gray-900";

          return (
            <button
              key={k.label}
              onClick={() => navigate(k.path)}
              className={`group text-left bg-white rounded-xl shadow-sm hover:shadow-md transition p-5 ${borderCls}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {k.trend === "up" ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div className={`text-3xl font-bold leading-tight mb-1 ${valueCls}`}>{k.value}</div>
              <div className="text-sm text-gray-600 font-medium">{k.label}</div>
              <div className={`text-xs mt-1 ${isDanger ? "text-red-500" : "text-gray-400"}`}>{k.hint}</div>
            </button>
          );
        })}
      </div>

      {/* SECTION 2 — ACTION CENTER */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Action Center</h2>
            <p className="text-xs text-gray-500">Queues that need human or automated intervention.</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer">
              <Zap className={`w-4 h-4 ${autoAssign ? "text-movezy-600" : "text-gray-400"}`} />
              <span className="text-sm text-gray-700">Auto-assign</span>
              <span
                role="switch"
                aria-checked={autoAssign}
                onClick={() => setAutoAssign((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  autoAssign ? "bg-movezy-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    autoAssign ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
            <label className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer">
              <Activity className={`w-4 h-4 ${smartDelay ? "text-movezy-600" : "text-gray-400"}`} />
              <span className="text-sm text-gray-700">Smart delay</span>
              <span
                role="switch"
                aria-checked={smartDelay}
                onClick={() => setSmartDelay((v) => !v)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
                  smartDelay ? "bg-movezy-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    smartDelay ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending Assignments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Pending Assignments</h3>
                  <p className="text-xs text-gray-500">{pendingOrders.length} waiting for driver</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                {pendingOrders.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {pendingOrders.map((o) => (
                <div key={o._id} className="p-3 hover:bg-gray-50 transition flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{o.bookingNumber || o._id.slice(-6)}</span>
                      <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {formatTimeAgo(o.waitingSince)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{o.pickupAddress}</p>
                  </div>
                  <button
                    className="px-3 py-1.5 bg-movezy-600 hover:bg-movezy-700 text-white text-xs font-semibold rounded-lg flex-shrink-0"
                    onClick={() => navigate(`/admin/orders/${o._id}`)}
                  >
                    Assign Now
                  </button>
                </div>
              ))}
              {pendingOrders.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">All orders assigned.</div>
              )}
            </div>
          </div>

          {/* Delayed Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 !border-l-red-500">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Delayed Orders</h3>
                  <p className="text-xs text-gray-500">{delayedOrders.length} past ETA</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {delayedOrders.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {delayedOrders.map((o) => (
                <div key={o._id} className="p-3 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold text-gray-900">{o.bookingNumber || o._id.slice(-6)}</span>
                    <span className="text-xs font-bold text-red-600">+{o.delayMinutes}m late</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Driver: {o.driverName || "—"}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/admin/orders/${o._id}`)}
                      className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md"
                    >
                      Reassign
                    </button>
                    {o.driverPhone && (
                      <a
                        href={`tel:${o.driverPhone}`}
                        className="flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-md"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
              {delayedOrders.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">No delays right now.</div>
              )}
            </div>
          </div>

          {/* At Risk */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-yellow-50 text-yellow-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">At Risk Deliveries</h3>
                  <p className="text-xs text-gray-500">Predicted to fail</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                {atRiskOrders.length}
              </span>
            </div>
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {atRiskOrders.map((o) => (
                <div key={o._id} className="p-3 hover:bg-gray-50 transition flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{o.bookingNumber || o._id.slice(-6)}</span>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded ${
                          o.severity === "high"
                            ? "bg-red-50 text-red-700"
                            : "bg-yellow-50 text-yellow-700"
                        }`}
                      >
                        {o.severity}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{o.risk}</p>
                  </div>
                  <button
                    className="px-3 py-1.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-lg"
                    onClick={() => navigate(`/admin/orders/${o._id}`)}
                  >
                    Review
                  </button>
                </div>
              ))}
              {atRiskOrders.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">No at-risk deliveries.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3 — LIVE OPERATIONS */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Live Operations</h2>
            <p className="text-xs text-gray-500">Drivers, orders, and hotspots in real time.</p>
          </div>
          <button
            onClick={() => navigate("/admin/tracking")}
            className="flex items-center gap-1 text-sm text-movezy-600 hover:underline"
          >
            Full map <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
          {/* Map — 70% */}
          <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-gray-600">Drivers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-gray-600">Orders</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-gray-600">Delays</span>
              </div>
              <div className="ml-auto flex items-center gap-1 text-gray-500">
                <MapPin className="w-3.5 h-3.5" /> {city}
              </div>
            </div>
            <div className="h-[420px]">
              <MapContainer
                center={defaultCenter}
                zoom={11}
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {driverPoints.length > 0 && <MapBoundsManager points={driverPoints} />}
                <FlyTo target={flyTarget} />
                {drivers.map(
                  (d) =>
                    d.location?.lat &&
                    d.location?.lng && (
                      <Marker
                        key={d._id}
                        position={[d.location.lat, d.location.lng]}
                        icon={createDriverIcon(d.status)}
                      >
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">{d.fullName}</p>
                            <p className="text-gray-500 capitalize">{d.status.replace(/_/g, " ")}</p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                )}
                {delayedOrders.map(
                  (o) =>
                    o.lat != null &&
                    o.lng != null && (
                      <Marker key={o._id} position={[o.lat, o.lng]} icon={createDriverIcon("delayed")}>
                        <Popup>
                          <div className="text-sm">
                            <p className="font-semibold">{o.bookingNumber || o._id.slice(-6)}</p>
                            <p className="text-red-600">+{o.delayMinutes}m delay</p>
                          </div>
                        </Popup>
                      </Marker>
                    )
                )}
              </MapContainer>
            </div>
          </div>

          {/* Smart list — 30% */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="flex border-b border-gray-100">
              {[
                { key: "delayed", label: "Delayed", count: delayedOrders.length },
                { key: "unassigned", label: "Unassigned", count: pendingOrders.length },
                { key: "nearby", label: "Nearby", count: drivers.length },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`flex-1 px-3 py-2.5 text-xs font-semibold transition ${
                    activeTab === t.key
                      ? "text-movezy-600 border-b-2 border-movezy-500 bg-movezy-50/40"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t.label}
                  <span className="ml-1 text-[10px] text-gray-400">({t.count})</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100 max-h-[420px]">
              {activeTab === "delayed" &&
                delayedOrders.map((o) => (
                  <button
                    key={o._id}
                    onClick={() =>
                      o.lat != null && o.lng != null && setFlyTarget([o.lat, o.lng])
                    }
                    className="w-full text-left p-3 hover:bg-red-50/60 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{o.bookingNumber || o._id.slice(-6)}</span>
                      <span className="text-xs font-bold text-red-600">+{o.delayMinutes}m</span>
                    </div>
                    <p className="text-xs text-gray-500">{o.driverName || "—"}</p>
                    <div className="flex gap-1.5 mt-2">
                      <span className="text-[11px] text-gray-600 underline">Reassign</span>
                      <span className="text-[11px] text-gray-300">·</span>
                      <span className="text-[11px] text-gray-600 underline">Call</span>
                    </div>
                  </button>
                ))}

              {activeTab === "unassigned" &&
                pendingOrders.map((o) => (
                  <button
                    key={o._id}
                    onClick={() =>
                      o.pickupLat != null &&
                      o.pickupLng != null &&
                      setFlyTarget([o.pickupLat, o.pickupLng])
                    }
                    className="w-full text-left p-3 hover:bg-amber-50/60 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900">{o.bookingNumber || o._id.slice(-6)}</span>
                      <span className="text-xs text-amber-700">{formatTimeAgo(o.waitingSince)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{o.pickupAddress}</p>
                  </button>
                ))}

              {activeTab === "nearby" &&
                drivers.slice(0, 20).map((d) => (
                  <button
                    key={d._id}
                    onClick={() =>
                      d.location?.lat &&
                      d.location?.lng &&
                      setFlyTarget([d.location.lat, d.location.lng])
                    }
                    className="w-full text-left p-3 hover:bg-green-50/60 transition"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-gray-900 truncate">{d.fullName}</span>
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded capitalize ${
                          d.status === "available"
                            ? "bg-green-50 text-green-700"
                            : d.status === "on_trip"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {d.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </button>
                ))}

              {((activeTab === "delayed" && delayedOrders.length === 0) ||
                (activeTab === "unassigned" && pendingOrders.length === 0) ||
                (activeTab === "nearby" && drivers.length === 0)) && (
                <div className="p-6 text-center text-sm text-gray-400">Nothing here right now.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4 — PERFORMANCE SNAPSHOT */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Performance Snapshot</h2>
          <span className="text-xs text-gray-500">{timeRange}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Orders</h3>
              <span className="text-xs text-gray-400">Completed vs Failed vs Pending</span>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orderBreakdown} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#9CA3AF" }} />
                  <Tooltip cursor={{ fill: "#F9FAFB" }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {orderBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Driver Performance</h3>
              <span className="text-xs text-gray-400">Active vs Idle</span>
            </div>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={driverBreakdown}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={42}
                    outerRadius={64}
                    paddingAngle={2}
                  >
                    {driverBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 5 — RECENT ACTIVITY */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-sm">Recent Activity</h2>
            <p className="text-xs text-gray-500">Last 10 critical events</p>
          </div>
          <button
            onClick={() => navigate("/admin/audit-logs")}
            className="flex items-center gap-1 text-xs text-movezy-600 hover:underline"
          >
            View all <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No recent events</p>
          ) : (
            timeline.slice(0, 10).map((event) => {
              const actionLower = event.action.toLowerCase();
              const Icon = actionLower.includes("fail") || actionLower.includes("cancel")
                ? XCircle
                : actionLower.includes("assign")
                ? UserPlus
                : actionLower.includes("payment") || actionLower.includes("paid")
                ? CheckCircle2
                : actionLower.includes("delay") || actionLower.includes("sos")
                ? AlertCircle
                : Activity;
              const tone = actionLower.includes("fail") || actionLower.includes("cancel") || actionLower.includes("sos")
                ? "text-red-600 bg-red-50"
                : actionLower.includes("payment") || actionLower.includes("paid") || actionLower.includes("complete")
                ? "text-green-600 bg-green-50"
                : actionLower.includes("delay")
                ? "text-yellow-600 bg-yellow-50"
                : "text-gray-600 bg-gray-100";

              return (
                <div key={event._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tone}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">
                      <span className="font-medium">{event.adminName}</span>{" "}
                      <span className="text-gray-500">{event.action.replace(/_/g, " ")}</span>
                      {event.description && (
                        <span className="text-gray-400"> — {event.description}</span>
                      )}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatTimeAgo(event.createdAt)}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
