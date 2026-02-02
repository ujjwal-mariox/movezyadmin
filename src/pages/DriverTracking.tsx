// src/pages/DriverTracking.tsx
import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import type { DriverLocation } from "../types/admin";

const DriverTracking: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ONLINE" | "OFFLINE" | "BUSY"
  >("ALL");
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(
    null,
  );

  // Mock data
  const mockDrivers: DriverLocation[] = [
    {
      driverId: "1",
      driverName: "Amit Kumar",
      phone: "+91 98765 43220",
      lat: 28.6139,
      lng: 77.209,
      heading: 45,
      speed: 35,
      status: "BUSY",
      currentBookingId: "booking123",
      vehicleType: "Tata Ace",
      vehicleNumber: "DL-01-AB-1234",
      lastUpdated: new Date(Date.now() - 30000).toISOString(),
    },
    {
      driverId: "2",
      driverName: "Vijay Singh",
      phone: "+91 98765 43221",
      lat: 28.5355,
      lng: 77.391,
      heading: 180,
      speed: 0,
      status: "ONLINE",
      vehicleType: "Pickup 8ft",
      vehicleNumber: "DL-02-CD-5678",
      lastUpdated: new Date(Date.now() - 60000).toISOString(),
    },
    {
      driverId: "3",
      driverName: "Ravi Verma",
      phone: "+91 98765 43222",
      lat: 28.4595,
      lng: 77.0266,
      heading: 90,
      speed: 42,
      status: "BUSY",
      currentBookingId: "booking456",
      vehicleType: "3 Wheeler",
      vehicleNumber: "DL-03-EF-9012",
      lastUpdated: new Date(Date.now() - 15000).toISOString(),
    },
    {
      driverId: "4",
      driverName: "Suresh Yadav",
      phone: "+91 98765 43223",
      lat: 28.6304,
      lng: 77.2177,
      status: "OFFLINE",
      vehicleType: "Bike",
      vehicleNumber: "DL-04-GH-3456",
      lastUpdated: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      driverId: "5",
      driverName: "Manoj Tiwari",
      phone: "+91 98765 43224",
      lat: 28.5672,
      lng: 77.3211,
      heading: 270,
      speed: 28,
      status: "ONLINE",
      vehicleType: "Truck",
      vehicleNumber: "DL-05-IJ-7890",
      lastUpdated: new Date(Date.now() - 45000).toISOString(),
    },
    {
      driverId: "6",
      driverName: "Rajesh Kumar",
      phone: "+91 98765 43225",
      lat: 28.6892,
      lng: 77.1234,
      heading: 0,
      speed: 0,
      status: "ONLINE",
      vehicleType: "Tata Ace",
      vehicleNumber: "DL-06-KL-2345",
      lastUpdated: new Date(Date.now() - 120000).toISOString(),
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setDrivers(mockDrivers);
      setLoading(false);
    }, 500);
  }, []);

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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-movezy-500" />
            Live Driver Tracking
          </h2>
          <p className="text-sm text-gray-500">
            Monitor driver locations in real-time
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Placeholder */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Live Map</h3>
          </div>
          <div className="h-[500px] bg-gray-100 flex items-center justify-center relative">
            {/* Map placeholder - in production, integrate with Google Maps or Mapbox */}
            <div className="text-center">
              <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Map Integration Required</p>
              <p className="text-sm text-gray-400">
                Integrate Google Maps or Mapbox for live tracking
              </p>
            </div>

            {/* Driver markers overlay (mock visualization) */}
            <div className="absolute inset-0 pointer-events-none">
              {filteredDrivers.map((driver, index) => (
                <div
                  key={driver.driverId}
                  className="absolute"
                  style={{
                    left: `${20 + (index % 4) * 20}%`,
                    top: `${20 + Math.floor(index / 4) * 25}%`,
                  }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                      driver.status === "ONLINE"
                        ? "bg-green-500"
                        : driver.status === "BUSY"
                          ? "bg-yellow-500"
                          : "bg-gray-400"
                    }`}
                  >
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Driver List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
            <a
              href={`tel:${selectedDriver.phone}`}
              className="flex items-center gap-2 px-4 py-2 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600"
            >
              <Phone className="w-4 h-4" />
              Call Driver
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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
          </div>
          {selectedDriver.currentBookingId && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-xl">
              <p className="text-sm text-yellow-800">
                <strong>Active Booking:</strong>{" "}
                {selectedDriver.currentBookingId}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverTracking;
