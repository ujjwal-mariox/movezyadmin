// src/pages/DriverTracking.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Truck,
  User,
  Phone,
  Clock,
  Zap,
  Circle,
  Package,
  MessageSquare,
  ClipboardList,
  ExternalLink,
  Pause,
  Play,
  Settings,
  Eye,
  AlertTriangle,
} from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import type { DriverLocation } from "../types/admin";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const getToken = () => localStorage.getItem("adminToken");

const DriverTracking: React.FC = () => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ONLINE" | "OFFLINE" | "BUSY"
  >("ALL");
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(
    null,
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(15); // seconds
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [useClustering, setUseClustering] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapData, setHeatmapData] = useState<Array<[number, number, number]>>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<Array<{ _id: string; trackingId: string; pickup: string }>>([]);

  // Fetch drivers from API
  const fetchDrivers = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/tracking/drivers?status=online`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const driversData = data.data?.drivers || data.data || [];
        // Transform API response to match DriverLocation interface
        const transformed = driversData.map((d: any) => ({
          driverId: d._id || d.driverId,
          driverName: d.fullName || d.driverName || d.name,
          phone: d.mobileNumber || d.phone,
          lat: d.location?.lat || d.lat,
          lng: d.location?.lng || d.lng,
          heading: d.heading || 0,
          speed: d.speed || 0,
          status: d.isOnline ? (d.currentBookingId || d.hasActiveBooking ? "BUSY" : "ONLINE") : "OFFLINE",
          currentBookingId: d.currentBookingId,
          vehicleType: d.vehicleType || "Unknown",
          vehicleNumber: d.vehicleNumber || "-",
          lastUpdated: d.lastLocationUpdate || d.lastUpdated || d.updatedAt || new Date().toISOString(),
          deviceInfo: d.deviceInfo || null,
        }));
        setDrivers(transformed);
      }
    } catch (err) {
      console.error("Failed to fetch drivers:", err);
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, []);

  // Fetch pending orders for assignment
  const fetchPendingOrders = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/bookings?status=SEARCHING&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const bookings = data.data?.bookings || [];
        setPendingOrders(
          bookings.map((o: any) => ({
            _id: o._id,
            trackingId: o.bookingNumber || String(o._id).slice(-8),
            pickup: o.pickup?.address || "Unknown pickup",
          })),
        );
      }
    } catch (err) {
      console.error("Failed to fetch pending orders:", err);
    }
  }, []);

  // Fetch demand zones for heatmap
  const fetchDemandZones = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/admin/tracking/demand-zones?hours=24`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.data?.heatmapData) {
          setHeatmapData(data.data.heatmapData);
        }
      }
    } catch (err) {
      console.error("Failed to fetch demand zones:", err);
    }
  }, []);

  // Fetch demand zones when heatmap is enabled
  useEffect(() => {
    if (showHeatmap) {
      fetchDemandZones();
    }
  }, [showHeatmap, fetchDemandZones]);

  // Auto-refresh effect
  useEffect(() => {
    fetchDrivers();
    if (!autoRefresh) return;
    const interval = setInterval(fetchDrivers, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchDrivers, autoRefresh, refreshInterval]);

  const filteredDrivers = drivers.filter((driver) => {
    const matchesSearch =
      driver.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.includes(searchQuery);
    const matchesStatus =
      statusFilter === "ALL" || driver.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: drivers.length,
    online: drivers.filter((d) => d.status === "ONLINE").length,
    busy: drivers.filter((d) => d.status === "BUSY").length,
    offline: drivers.filter((d) => d.status === "OFFLINE").length,
  };

  // Leaflet map ref
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const heatmapLayerRef = useRef<L.Layer | null>(null);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current).setView([28.6139, 77.209], 11);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update heatmap layer when data changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Remove existing heatmap layer
    if (heatmapLayerRef.current) {
      mapRef.current.removeLayer(heatmapLayerRef.current);
      heatmapLayerRef.current = null;
    }
    
    // Add heatmap circles if enabled and data exists
    if (showHeatmap && heatmapData.length > 0) {
      const heatGroup = L.layerGroup();
      
      heatmapData.forEach(([lat, lng, intensity]) => {
        if (lat && lng) {
          // Create gradient circle for demand zone
          const maxIntensity = Math.max(...heatmapData.map(h => h[2] || 1));
          const normalizedIntensity = (intensity || 1) / maxIntensity;
          const radius = 200 + (normalizedIntensity * 800);
          const opacity = 0.2 + (normalizedIntensity * 0.4);
          
          L.circle([lat, lng], {
            radius: radius,
            color: "transparent",
            fillColor: intensity > 5 ? "#ef4444" : intensity > 2 ? "#f97316" : "#fbbf24",
            fillOpacity: opacity,
            interactive: false,
          }).addTo(heatGroup);
        }
      });
      
      heatGroup.addTo(mapRef.current);
      heatmapLayerRef.current = heatGroup;
    }
  }, [showHeatmap, heatmapData]);

  // Create driver icon with color coding
  const createDriverIcon = useCallback((status: string, speed: number = 0) => {
    const color = status === "ONLINE" ? "#22c55e" : status === "BUSY" ? "#eab308" : "#9ca3af";
    const isMoving = speed > 5;
    return L.divIcon({
      html: `<div style="background:${color};width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);${isMoving ? 'animation:pulse 1.5s infinite;' : ''}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
      </div>
      <style>@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}</style>`,
      className: "",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  }, []);

  // Update markers when drivers/filter change
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Remove old markers/cluster
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (clusterRef.current) {
      mapRef.current.removeLayer(clusterRef.current);
      clusterRef.current = null;
    }

    // Create cluster group if clustering enabled
    if (useClustering && filteredDrivers.length > 10) {
      clusterRef.current = L.markerClusterGroup({
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => {
          const count = cluster.getChildCount();
          const size = count < 10 ? "small" : count < 50 ? "medium" : "large";
          return L.divIcon({
            html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
            className: "",
            iconSize: [40, 40],
          });
        },
      });
    }

    filteredDrivers.forEach((driver) => {
      if (!driver.lat || !driver.lng) return;
      const icon = createDriverIcon(driver.status, driver.speed);

      const marker = L.marker([driver.lat, driver.lng], { icon });
      marker.bindPopup(`
        <div style="min-width:180px">
          <b>${driver.driverName}</b><br/>
          <span style="font-size:12px">${driver.vehicleType} • ${driver.vehicleNumber}</span><br/>
          <span style="color:${driver.status === "ONLINE" ? "#22c55e" : driver.status === "BUSY" ? "#eab308" : "#9ca3af"};font-weight:500">${driver.status}</span>
          ${driver.speed ? ` • ${driver.speed} km/h` : ""}
          ${driver.currentBookingId ? `<br/><a href="/admin/orders/${driver.currentBookingId}" style="color:#f97316;font-size:11px">View Order →</a>` : ""}
        </div>
      `);

      marker.on("click", () => setSelectedDriver(driver));

      if (clusterRef.current) {
        clusterRef.current.addLayer(marker);
      } else {
        marker.addTo(mapRef.current!);
      }
      markersRef.current.push(marker);
    });

    if (clusterRef.current) {
      mapRef.current.addLayer(clusterRef.current);
    }

    // Fit bounds if there are drivers
    if (filteredDrivers.length > 0) {
      const validDrivers = filteredDrivers.filter((d) => d.lat && d.lng);
      if (validDrivers.length > 0) {
        const bounds = L.latLngBounds(validDrivers.map((d) => [d.lat, d.lng]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      }
    }
  }, [filteredDrivers, useClustering, createDriverIcon]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "text-green-500";
      case "BUSY":
        return "text-yellow-500";
      case "OFFLINE":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "ONLINE":
        return "bg-green-100 text-green-800";
      case "BUSY":
        return "bg-yellow-100 text-yellow-800";
      case "OFFLINE":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Add CSS for cluster icons */}
      <style>{`
        .cluster-icon {
          background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,.3);
        }
        .cluster-small { width: 36px; height: 36px; font-size: 12px; }
        .cluster-medium { width: 44px; height: 44px; font-size: 14px; }
        .cluster-large { width: 52px; height: 52px; font-size: 16px; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-movezy-500" />
            Live Driver Tracking
          </h2>
          <p className="text-sm text-gray-500 flex items-center gap-2">
            Monitor driver locations in real-time
            <span className="text-xs text-gray-400">
              • Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              autoRefresh
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {autoRefresh ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            {autoRefresh ? `Auto (${refreshInterval}s)` : "Paused"}
          </button>
          
          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
            >
              <Settings className="w-4 h-4" />
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
                <h4 className="font-medium text-gray-800 mb-3">Settings</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-600">Refresh Interval</label>
                    <select
                      value={refreshInterval}
                      onChange={(e) => setRefreshInterval(Number(e.target.value))}
                      className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      <option value={5}>5 seconds</option>
                      <option value={10}>10 seconds</option>
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>1 minute</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">Cluster Markers</label>
                    <button
                      onClick={() => setUseClustering(!useClustering)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        useClustering ? "bg-movezy-500" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                          useClustering ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-600">Demand Heatmap</label>
                    <button
                      onClick={() => setShowHeatmap(!showHeatmap)}
                      className={`w-10 h-6 rounded-full transition-colors ${
                        showHeatmap ? "bg-orange-500" : "bg-gray-300"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                          showHeatmap ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            onClick={fetchDrivers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          className={`bg-white rounded-2xl shadow-sm p-4 border cursor-pointer transition-all ${
            statusFilter === "ALL"
              ? "border-movezy-500 ring-2 ring-movezy-200"
              : "border-gray-100"
          }`}
          onClick={() => setStatusFilter("ALL")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Drivers</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm p-4 border cursor-pointer transition-all ${
            statusFilter === "ONLINE"
              ? "border-green-500 ring-2 ring-green-200"
              : "border-gray-100"
          }`}
          onClick={() => setStatusFilter("ONLINE")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Circle className="w-5 h-5 text-green-600 fill-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {stats.online}
              </p>
              <p className="text-xs text-gray-500">Online</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm p-4 border cursor-pointer transition-all ${
            statusFilter === "BUSY"
              ? "border-yellow-500 ring-2 ring-yellow-200"
              : "border-gray-100"
          }`}
          onClick={() => setStatusFilter("BUSY")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.busy}</p>
              <p className="text-xs text-gray-500">On Trip</p>
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm p-4 border cursor-pointer transition-all ${
            statusFilter === "OFFLINE"
              ? "border-gray-500 ring-2 ring-gray-200"
              : "border-gray-100"
          }`}
          onClick={() => setStatusFilter("OFFLINE")}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
              <Circle className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">
                {stats.offline}
              </p>
              <p className="text-xs text-gray-500">Offline</p>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence strip */}
      {(() => {
        const highDemand = heatmapData.filter(([, , i]) => i > 5).length;
        const shortageZones = Math.max(
          0,
          heatmapData.filter(([, , i]) => i > 2).length -
            drivers.filter((d) => d.status === "ONLINE").length
        );
        return (
          <div className="flex flex-wrap gap-2">
            {highDemand > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold">
                <Zap className="w-3.5 h-3.5" /> High-demand areas: {highDemand}
              </span>
            )}
            {shortageZones > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Driver shortage zones: {shortageZones}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-semibold">
              <Circle className="w-2 h-2 fill-green-500 text-green-500" /> Online: {stats.online}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-700 border border-yellow-200 text-xs font-semibold">
              <Circle className="w-2 h-2 fill-yellow-500 text-yellow-500" /> Idle/Busy: {stats.busy}
            </span>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        {/* Map Placeholder */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Live Map</h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-green-500" /> Active</span>
              <span className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Idle/Busy</span>
              <span className="flex items-center gap-1 text-gray-600"><span className="w-2 h-2 rounded-full bg-red-500" /> Delayed</span>
            </div>
          </div>
          <div className="h-[500px] relative" ref={mapContainerRef} />
        </div>

        {/* Driver List */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search drivers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-movezy-500"
              />
            </div>
          </div>
          <div className="max-h-[450px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredDrivers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No drivers found
              </div>
            ) : (
              filteredDrivers.map((driver) => (
                <div
                  key={driver.driverId}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedDriver?.driverId === driver.driverId
                      ? "bg-movezy-50"
                      : ""
                  }`}
                  onClick={() => setSelectedDriver(driver)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        driver.status === "ONLINE"
                          ? "bg-green-100"
                          : driver.status === "BUSY"
                            ? "bg-yellow-100"
                            : "bg-gray-100"
                      }`}
                    >
                      <User
                        className={`w-5 h-5 ${getStatusColor(driver.status)}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-800 truncate">
                          {driver.driverName}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBg(driver.status)}`}
                        >
                          {driver.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {driver.vehicleType} • {driver.vehicleNumber}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(driver.lastUpdated)}
                        </span>
                        {driver.speed !== undefined && driver.speed > 0 && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {driver.speed} km/h
                          </span>
                        )}
                      </div>
                      {driver.currentBookingId && (
                        <p className="text-xs text-movezy-600 mt-1">
                          On booking: {driver.currentBookingId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Selected Driver Details */}
      {selectedDriver && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  selectedDriver.status === "ONLINE"
                    ? "bg-green-100"
                    : selectedDriver.status === "BUSY"
                      ? "bg-yellow-100"
                      : "bg-gray-100"
                }`}
              >
                <User
                  className={`w-8 h-8 ${getStatusColor(selectedDriver.status)}`}
                />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {selectedDriver.driverName}
                </h3>
                <p className="text-gray-500">
                  {selectedDriver.vehicleType} • {selectedDriver.vehicleNumber}
                </p>
              </div>
            </div>
            {/* Direct Action Buttons */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${selectedDriver.phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
              <a
                href={`sms:${selectedDriver.phone}`}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                SMS
              </a>
              {selectedDriver.status === "ONLINE" && (
                <button
                  onClick={() => {
                    fetchPendingOrders();
                    setAssignModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600 transition-colors"
                >
                  <ClipboardList className="w-4 h-4" />
                  Assign Order
                </button>
              )}
              <button
                onClick={() => navigate(`/admin/drivers?id=${selectedDriver.driverId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Eye className="w-4 h-4" />
                Profile
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium mt-1 ${getStatusBg(selectedDriver.status)}`}
              >
                {selectedDriver.status}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Speed</p>
              <p className="font-medium text-gray-800 mt-1">
                {selectedDriver.speed || 0} km/h
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Heading</p>
              <p className="font-medium text-gray-800 mt-1 flex items-center gap-1">
                <Navigation
                  className="w-4 h-4"
                  style={{
                    transform: `rotate(${selectedDriver.heading || 0}deg)`,
                  }}
                />
                {selectedDriver.heading || 0}°
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="font-medium text-gray-800 mt-1">
                {getTimeAgo(selectedDriver.lastUpdated)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium text-gray-800 mt-1">{selectedDriver.phone}</p>
            </div>
            {selectedDriver.deviceInfo?.batteryLevel !== undefined && (
              <div>
                <p className="text-sm text-gray-500">Battery</p>
                <p className={`font-medium mt-1 flex items-center gap-1 ${
                  selectedDriver.deviceInfo.batteryLevel < 20 ? "text-red-600" :
                  selectedDriver.deviceInfo.batteryLevel < 50 ? "text-yellow-600" : "text-green-600"
                }`}>
                  <Zap className="w-4 h-4" />
                  {selectedDriver.deviceInfo.batteryLevel}%
                  {selectedDriver.deviceInfo.isCharging && " ⚡"}
                </p>
              </div>
            )}
            {selectedDriver.deviceInfo?.appVersion && (
              <div>
                <p className="text-sm text-gray-500">App Version</p>
                <p className="font-medium text-gray-800 mt-1">
                  v{selectedDriver.deviceInfo.appVersion}
                </p>
              </div>
            )}
          </div>
          {selectedDriver.currentBookingId && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl flex items-center justify-between">
              <p className="text-sm text-yellow-800">
                <strong>Active Booking:</strong>{" "}
                {selectedDriver.currentBookingId}
              </p>
              <button
                onClick={() => navigate(`/admin/orders/${selectedDriver.currentBookingId}`)}
                className="text-sm text-movezy-600 hover:underline flex items-center gap-1"
              >
                View Order <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Assign Order Modal */}
      {assignModalOpen && selectedDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Assign Order to {selectedDriver.driverName}</h3>
              <p className="text-sm text-gray-500 mt-1">Select a pending order to assign</p>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto">
              {pendingOrders.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No pending orders available</p>
              ) : (
                <div className="space-y-2">
                  {pendingOrders.map((order) => (
                    <button
                      key={order._id}
                      onClick={async () => {
                        try {
                          const token = getToken();
                          const res = await fetch(
                            `${API_URL}/admin/bookings/${order._id}/assign-driver`,
                            {
                              method: "PUT",
                              headers: {
                                Authorization: `Bearer ${token}`,
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({ driverId: selectedDriver.driverId }),
                            },
                          );
                          const body = await res.json().catch(() => ({}));
                          if (!res.ok || body?.success === false) {
                            window.alert(body?.message || "Failed to assign order");
                            return;
                          }
                          setAssignModalOpen(false);
                          fetchDrivers();
                        } catch (err) {
                          console.error("Failed to assign order:", err);
                        }
                      }}
                      className="w-full p-3 text-left border border-gray-200 rounded-xl hover:border-movezy-500 hover:bg-movezy-50 transition-colors"
                    >
                      <p className="font-medium text-gray-800">#{order.trackingId}</p>
                      <p className="text-sm text-gray-500 truncate">{order.pickup}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setAssignModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverTracking;
