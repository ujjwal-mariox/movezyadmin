// src/pages/SOSDashboard.tsx
import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  Shield,
  CheckCircle,
  User,
  Car,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Bell,
} from "lucide-react";
import type { SOSAlert } from "../types/admin";

const SOSDashboard: React.FC = () => {
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlert | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [filter, setFilter] = useState<
    "ALL" | "ACTIVE" | "RESPONDED" | "RESOLVED"
  >("ALL");

  // Mock data
  const mockAlerts: SOSAlert[] = [
    {
      _id: "1",
      userId: "user1",
      bookingId: "booking1",
      triggeredBy: "USER",
      location: {
        lat: 28.6139,
        lng: 77.209,
        address: "Connaught Place, New Delhi",
      },
      status: "ACTIVE",
      policeNotified: false,
      contactsNotified: 2,
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      user: {
        name: "Rahul Sharma",
        phone: "+91 98765 43210",
      },
      driver: {
        name: "Amit Kumar",
        phone: "+91 98765 43220",
      },
      booking: {
        bookingNumber: "MZY-2024-001234",
      },
    },
    {
      _id: "2",
      driverId: "driver1",
      bookingId: "booking2",
      triggeredBy: "DRIVER",
      location: {
        lat: 28.5355,
        lng: 77.391,
        address: "Sector 18, Noida",
      },
      status: "RESPONDED",
      respondedBy: "admin1",
      respondedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      policeNotified: true,
      contactsNotified: 3,
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      user: {
        name: "Priya Patel",
        phone: "+91 98765 43211",
      },
      driver: {
        name: "Vijay Singh",
        phone: "+91 98765 43221",
      },
      booking: {
        bookingNumber: "MZY-2024-001235",
      },
    },
    {
      _id: "3",
      userId: "user2",
      triggeredBy: "USER",
      location: {
        lat: 28.4595,
        lng: 77.0266,
        address: "DLF Cyber City, Gurugram",
      },
      status: "RESOLVED",
      respondedBy: "admin1",
      respondedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      resolution: "False alarm - User accidentally triggered SOS",
      policeNotified: false,
      contactsNotified: 1,
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      user: {
        name: "Arjun Reddy",
        phone: "+91 98765 43212",
      },
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setAlerts(mockAlerts);
      setLoading(false);
    }, 500);
  }, []);

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === "ALL") return true;
    return alert.status === filter;
  });

  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length;
  const respondedCount = alerts.filter((a) => a.status === "RESPONDED").length;

  const handleRespond = async (alert: SOSAlert) => {
    setAlerts(
      alerts.map((a) =>
        a._id === alert._id
          ? {
              ...a,
              status: "RESPONDED" as const,
              respondedAt: new Date().toISOString(),
            }
          : a,
      ),
    );
  };

  const handleResolve = async () => {
    if (!selectedAlert || !resolution) return;
    setAlerts(
      alerts.map((a) =>
        a._id === selectedAlert._id
          ? {
              ...a,
              status: "RESOLVED" as const,
              resolvedAt: new Date().toISOString(),
              resolution,
            }
          : a,
      ),
    );
    setShowResolveModal(false);
    setSelectedAlert(null);
    setResolution("");
  };

  const handleNotifyPolice = async (alert: SOSAlert) => {
    setAlerts(
      alerts.map((a) =>
        a._id === alert._id ? { ...a, policeNotified: true } : a,
      ),
    );
  };

  const getTimeAgo = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-red-100 text-red-800 animate-pulse";
      case "RESPONDED":
        return "bg-yellow-100 text-yellow-800";
      case "RESOLVED":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            SOS Emergency Dashboard
          </h2>
          <p className="text-sm text-gray-500">
            Monitor and respond to emergency alerts
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

      {/* Alert Banner */}
      {activeCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <Bell className="w-6 h-6 text-red-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800">
              {activeCount} Active Emergency Alert{activeCount > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-red-600">Immediate attention required</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div
          className={`bg-white rounded-2xl shadow-sm p-6 border cursor-pointer transition-all ${
            filter === "ALL"
              ? "border-movezy-500 ring-2 ring-movezy-200"
              : "border-gray-100"
          }`}
          onClick={() => setFilter("ALL")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Alerts</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {alerts.length}
              </p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm p-6 border cursor-pointer transition-all ${
            filter === "ACTIVE"
              ? "border-red-500 ring-2 ring-red-200"
              : "border-gray-100"
          }`}
          onClick={() => setFilter("ACTIVE")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {activeCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center animate-pulse">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm p-6 border cursor-pointer transition-all ${
            filter === "RESPONDED"
              ? "border-yellow-500 ring-2 ring-yellow-200"
              : "border-gray-100"
          }`}
          onClick={() => setFilter("RESPONDED")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Responded</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {respondedCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-sm p-6 border cursor-pointer transition-all ${
            filter === "RESOLVED"
              ? "border-green-500 ring-2 ring-green-200"
              : "border-gray-100"
          }`}
          onClick={() => setFilter("RESOLVED")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Resolved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {alerts.filter((a) => a.status === "RESOLVED").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500">
            Loading...
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500">
            No alerts found
          </div>
        ) : (
          filteredAlerts.map((alert) => (
            <div
              key={alert._id}
              className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${
                alert.status === "ACTIVE" ? "border-red-200" : "border-gray-100"
              }`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        alert.status === "ACTIVE"
                          ? "bg-red-100 animate-pulse"
                          : alert.status === "RESPONDED"
                            ? "bg-yellow-100"
                            : "bg-green-100"
                      }`}
                    >
                      {alert.triggeredBy === "USER" ? (
                        <User
                          className={`w-6 h-6 ${
                            alert.status === "ACTIVE"
                              ? "text-red-600"
                              : alert.status === "RESPONDED"
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        />
                      ) : (
                        <Car
                          className={`w-6 h-6 ${
                            alert.status === "ACTIVE"
                              ? "text-red-600"
                              : alert.status === "RESPONDED"
                                ? "text-yellow-600"
                                : "text-green-600"
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(alert.status)}`}
                        >
                          {alert.status}
                        </span>
                        <span className="text-sm text-gray-500">
                          Triggered by {alert.triggeredBy}
                        </span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(alert.createdAt)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {alert.user && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {alert.user.name} ({alert.user.phone})
                            </span>
                          </div>
                        )}
                        {alert.driver && (
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-600">
                              {alert.driver.name} ({alert.driver.phone})
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {alert.location.address}
                          </span>
                          <a
                            href={`https://maps.google.com/?q=${alert.location.lat},${alert.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-movezy-600 hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                        {alert.booking && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">
                              Booking:
                            </span>
                            <span className="text-sm font-mono text-gray-700">
                              {alert.booking.bookingNumber}
                            </span>
                          </div>
                        )}
                      </div>
                      {alert.resolution && (
                        <div className="mt-3 p-3 bg-green-50 rounded-lg">
                          <p className="text-sm text-green-800">
                            <strong>Resolution:</strong> {alert.resolution}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {alert.status === "ACTIVE" && (
                      <>
                        <button
                          onClick={() => handleRespond(alert)}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-medium"
                        >
                          <MessageSquare className="w-4 h-4" />
                          Respond
                        </button>
                        {!alert.policeNotified && (
                          <button
                            onClick={() => handleNotifyPolice(alert)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                          >
                            <Shield className="w-4 h-4" />
                            Notify Police
                          </button>
                        )}
                      </>
                    )}
                    {alert.status === "RESPONDED" && (
                      <button
                        onClick={() => {
                          setSelectedAlert(alert);
                          setShowResolveModal(true);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Resolve
                      </button>
                    )}
                    {(alert.user?.phone || alert.driver?.phone) && (
                      <a
                        href={`tel:${alert.triggeredBy === "USER" ? alert.user?.phone : alert.driver?.phone}`}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                      >
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                    )}
                  </div>
                </div>
                {alert.policeNotified && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
                    <Shield className="w-4 h-4" />
                    Police has been notified
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Resolve SOS Alert
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                placeholder="Describe how the situation was resolved..."
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setSelectedAlert(null);
                  setResolution("");
                }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolution}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50"
              >
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SOSDashboard;
