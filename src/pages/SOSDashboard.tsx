// src/pages/SOSDashboard.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import {
  AlertTriangle,
  Phone,
  MapPin,
  Shield,
  CheckCircle,
  User,
  Car,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  ArrowUpRight,
  Timer,
  X,
  Loader2,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  fetchSOSAlerts,
  fetchSOSStats,
  respondToSOSAlert,
  resolveSOSAlert,
  notifyPoliceForSOS,
  type SOSAlertRow,
  type SOSStatsResponse,
} from "../services/api";
import { useDialog } from "../components/Layout/Dialog";

type FilterKey = "ALL" | "ACTIVE" | "RESPONDED" | "RESOLVED";

const sosIcon = (status: string) => {
  const color =
    status === "ACTIVE" ? "#EF4444" : status === "RESPONDED" ? "#F59E0B" : "#10B981";
  return L.divIcon({
    className: "sos-marker",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:${color};opacity:0.2;animation:${status === "ACTIVE" ? "sosPulse 1.5s infinite" : "none"};"></div>
      <div style="position:relative;width:26px;height:26px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:bold;">!</div>
      </div>
      <style>@keyframes sosPulse{0%{transform:scale(0.9);opacity:0.5}70%{transform:scale(2);opacity:0}100%{opacity:0}}</style>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

const FlyTo: React.FC<{ target: [number, number] | null }> = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 14, { duration: 0.8 });
  }, [target, map]);
  return null;
};

const personName = (
  p: SOSAlertRow["userId"] | SOSAlertRow["driverId"],
): string => {
  if (!p || typeof p === "string") return "Unknown";
  return p.fullName || p.name || "Unknown";
};

const personPhone = (
  p: SOSAlertRow["userId"] | SOSAlertRow["driverId"],
): string | undefined => {
  if (!p || typeof p === "string") return undefined;
  return p.mobileNumber;
};

const bookingNumber = (b: SOSAlertRow["bookingId"]): string | undefined => {
  if (!b || typeof b === "string") return undefined;
  return b.bookingNumber || b.orderId;
};

const coordsOf = (alert: SOSAlertRow): [number, number] | null => {
  const coords = alert.location?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lng, lat] = coords;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return [lat, lng];
};

const SOSDashboard: React.FC = () => {
  const dialog = useDialog();
  const [alerts, setAlerts] = useState<SOSAlertRow[]>([]);
  const [stats, setStats] = useState<SOSStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<SOSAlertRow | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState("");
  const [resolveAsFalseAlarm, setResolveAsFalseAlarm] = useState(false);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [now, setNow] = useState(Date.now());
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [resolveSaving, setResolveSaving] = useState(false);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, statsRes] = await Promise.all([
        fetchSOSAlerts({ limit: 100 }),
        fetchSOSStats(),
      ]);

      if (alertsRes?.success === false) {
        setError(alertsRes.message || "Failed to load SOS alerts");
      }
      const list: SOSAlertRow[] =
        alertsRes?.data?.alerts || alertsRes?.alerts || [];
      setAlerts(list);
      setStats(statsRes?.data || statsRes || null);

      const firstActive = list.find((a) => a.status === "ACTIVE");
      if (firstActive) {
        setSelectedAlert(firstActive);
        const c = coordsOf(firstActive);
        if (c) setFlyTarget(c);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load SOS alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Live SOS alerts. A panic press is safety-critical and this page previously
  // loaded once and never refreshed — a new alert only appeared if someone
  // happened to reload. The backend emits `sos:new` to the "admin" room, which
  // admin sockets now join.
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return;

    // Socket origin = API URL minus the /v1/api path.
    const apiUrl = import.meta.env.VITE_API_URL || "";
    const origin = apiUrl.replace(/\/v1\/api\/?$/, "");

    let socket: Socket | null = null;
    try {
      socket = io(origin, {
        transports: ["websocket", "polling"],
        auth: { token },
        forceNew: true,
        reconnection: true,
      });

      socket.on("sos:new", () => {
        // Refetch rather than splice the payload in: `load` already selects and
        // flies to the newest ACTIVE alert, which is the behaviour we want.
        void load();
      });
      socket.on("connect_error", (err) =>
        console.warn("[SOS] socket connect error:", err?.message),
      );
    } catch (e) {
      console.warn("[SOS] socket init failed", e);
    }

    return () => {
      socket?.off("sos:new");
      socket?.disconnect();
    };
  }, [load]);

  useEffect(() => {
    timerRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const filteredAlerts = useMemo(
    () => alerts.filter((a) => (filter === "ALL" ? true : a.status === filter)),
    [alerts, filter],
  );

  const activeCount = stats?.activeCount ?? alerts.filter((a) => a.status === "ACTIVE").length;
  const respondedCount = alerts.filter((a) => a.status === "RESPONDED").length;
  const resolvedCount =
    stats?.resolvedCount ??
    alerts.filter((a) => a.status === "RESOLVED").length;
  const totalCount = stats?.totalCount ?? alerts.length;

  const activeAlerts = alerts.filter((a) => a.status === "ACTIVE");

  const handleRespond = async (alert: SOSAlertRow) => {
    setActioningId(alert._id);
    try {
      const res = await respondToSOSAlert(alert._id);
      if (res?.success === false) {
        await dialog.alert({ title: "Action failed", message: res.message || "Failed to respond", tone: "danger" });
      } else {
        const updated: SOSAlertRow | undefined = res?.data;
        setAlerts((list) =>
          list.map((a) =>
            a._id === alert._id
              ? updated || { ...a, status: "RESPONDED", respondedAt: new Date().toISOString() }
              : a,
          ),
        );
        if (selectedAlert?._id === alert._id) {
          setSelectedAlert(
            updated || {
              ...alert,
              status: "RESPONDED",
              respondedAt: new Date().toISOString(),
            },
          );
        }
      }
    } catch (e) {
      await dialog.alert({ title: "Action failed", message: e instanceof Error ? e.message : "Failed to respond", tone: "danger" });
    } finally {
      setActioningId(null);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert || !resolution.trim()) return;
    setResolveSaving(true);
    try {
      const res = await resolveSOSAlert(selectedAlert._id, {
        resolutionNotes: resolution.trim(),
        isFalseAlarm: resolveAsFalseAlarm,
      });
      if (res?.success === false) {
        await dialog.alert({ title: "Action failed", message: res.message || "Failed to resolve", tone: "danger" });
      } else {
        const updated: SOSAlertRow | undefined = res?.data;
        setAlerts((list) =>
          list.map((a) =>
            a._id === selectedAlert._id
              ? updated || {
                  ...a,
                  status: resolveAsFalseAlarm ? "FALSE_ALARM" : "RESOLVED",
                  resolvedAt: new Date().toISOString(),
                  resolutionNotes: resolution,
                }
              : a,
          ),
        );
        setShowResolveModal(false);
        setResolution("");
        setResolveAsFalseAlarm(false);
      }
    } catch (e) {
      await dialog.alert({ title: "Action failed", message: e instanceof Error ? e.message : "Failed to resolve", tone: "danger" });
    } finally {
      setResolveSaving(false);
    }
  };

  // The platform has NO emergency-services integration: the endpoint only
  // timestamps the operator's own action. This was labelled "Notify Police" and
  // then displayed "Police has been notified.", so in a live emergency an
  // operator could believe help was dispatched when nobody had been called.
  const handleNotifyPolice = async (alert: SOSAlertRow) => {
    const confirmed = await dialog.confirm({
      title: "Have you contacted the police?",
      message:
        "Movezy does not contact emergency services automatically. Only confirm " +
        "once you have called them yourself \u2014 this records the time and your " +
        "name against this alert.",
      tone: "danger",
      confirmLabel: "Yes, I have called",
    });
    if (!confirmed) return;

    setActioningId(alert._id);
    try {
      const res = await notifyPoliceForSOS(alert._id);
      if (res?.success === false) {
        await dialog.alert({ title: "Action failed", message: res.message || "Failed to record the police call", tone: "danger" });
      } else {
        const updated: SOSAlertRow | undefined = res?.data;
        setAlerts((list) =>
          list.map((a) =>
            a._id === alert._id
              ? updated || { ...a, policeNotified: true }
              : a,
          ),
        );
      }
    } catch (e) {
      await dialog.alert({ title: "Action failed", message: e instanceof Error ? e.message : "Failed to record the police call", tone: "danger" });
    } finally {
      setActioningId(null);
    }
  };

  const fmtElapsed = (iso?: string) => {
    if (!iso) return "—";
    const diff = Math.floor((now - new Date(iso).getTime()) / 1000);
    if (diff < 0) return "0s";
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const defaultCenter: [number, number] = useMemo(() => {
    for (const a of alerts) {
      const c = coordsOf(a);
      if (c) return c;
    }
    return [28.6139, 77.209];
  }, [alerts]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            SOS Emergency Dashboard
          </h1>
          <p className="text-xs text-gray-500">
            Monitor and respond to emergency alerts in real time.
          </p>
        </div>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          {activeAlerts.map((alert) => {
            const triggered = alert.triggeredBy === "USER" ? alert.userId : alert.driverId;
            return (
              <div
                key={alert._id}
                className="relative w-full bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl p-4 md:p-5 shadow-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-500/30 animate-pulse" aria-hidden />
                <div className="relative flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base leading-tight">
                          ACTIVE SOS · {personName(triggered)}
                        </p>
                        <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Timer className="w-3 h-3" /> {fmtElapsed(alert.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-white/90 flex items-center gap-1.5 mt-0.5 truncate">
                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />{" "}
                        {alert.address || "Location shared"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {personPhone(triggered) && (
                      <a
                        href={`tel:${personPhone(triggered)}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white text-red-600 text-sm font-semibold rounded-lg hover:bg-gray-100"
                      >
                        <Phone className="w-4 h-4" /> Call
                      </a>
                    )}
                    {!alert.policeNotified && (
                      <button
                        onClick={() => void handleNotifyPolice(alert)}
                        disabled={actioningId === alert._id}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-800 text-white text-sm font-semibold rounded-lg hover:bg-red-900 disabled:opacity-50"
                      >
                        <Shield className="w-4 h-4" /> Log police call
                      </button>
                    )}
                    <button
                      onClick={() => void handleRespond(alert)}
                      disabled={actioningId === alert._id}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/20 text-white text-sm font-semibold rounded-lg hover:bg-white/30 disabled:opacity-50"
                    >
                      <MessageSquare className="w-4 h-4" /> Respond
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAlert(alert);
                        const c = coordsOf(alert);
                        if (c) setFlyTarget(c);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/10 text-white text-sm font-semibold rounded-lg hover:bg-white/20"
                    >
                      <ArrowUpRight className="w-4 h-4" /> Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <FilterStat
          label="Total"
          count={totalCount}
          tone="neutral"
          active={filter === "ALL"}
          onClick={() => setFilter("ALL")}
        />
        <FilterStat
          label="Active"
          count={activeCount}
          tone="danger"
          pulse={activeCount > 0}
          active={filter === "ACTIVE"}
          onClick={() => setFilter("ACTIVE")}
        />
        <FilterStat
          label="Responded"
          count={respondedCount}
          tone="warning"
          active={filter === "RESPONDED"}
          onClick={() => setFilter("RESPONDED")}
        />
        <FilterStat
          label="Resolved"
          count={resolvedCount}
          tone="success"
          active={filter === "RESOLVED"}
          onClick={() => setFilter("RESOLVED")}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <div className="lg:col-span-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-red-500" /> Incident Map
            </h3>
            <span className="text-xs text-gray-500">
              {filteredAlerts.length} incidents
            </span>
          </div>
          <div className="h-[480px]">
            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ height: "100%", width: "100%" }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OSM"
              />
              <FlyTo target={flyTarget} />
              {filteredAlerts.map((a) => {
                const c = coordsOf(a);
                if (!c) return null;
                const triggered = a.triggeredBy === "USER" ? a.userId : a.driverId;
                return (
                  <Marker
                    key={a._id}
                    position={c}
                    icon={sosIcon(a.status)}
                    eventHandlers={{ click: () => setSelectedAlert(a) }}
                  >
                    <Popup>
                      <div className="text-sm min-w-[180px]">
                        <p className="font-semibold text-red-600">{a.status}</p>
                        <p className="text-gray-700">{personName(triggered)}</p>
                        <p className="text-xs text-gray-500">
                          {a.address || "Location shared"}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
          <div className="p-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm">Live Feed</h3>
            <span className="text-xs text-gray-500">
              {filter === "ALL" ? "All" : filter.toLowerCase()} ·{" "}
              {filteredAlerts.length}
            </span>
          </div>
          <div className="flex-1 max-h-[480px] overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-6 text-center text-sm text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                Loading…
              </div>
            ) : filteredAlerts.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-400">
                No alerts in this view.
              </div>
            ) : (
              filteredAlerts.map((a) => {
                const isSelected = selectedAlert?._id === a._id;
                const isActive = a.status === "ACTIVE";
                const triggered = a.triggeredBy === "USER" ? a.userId : a.driverId;
                const phone = personPhone(triggered);
                return (
                  <button
                    key={a._id}
                    onClick={() => {
                      setSelectedAlert(a);
                      const c = coordsOf(a);
                      if (c) setFlyTarget(c);
                    }}
                    className={`w-full text-left p-3 transition hover:bg-gray-50 ${
                      isSelected ? "bg-red-50/60" : ""
                    } ${isActive ? "border-l-4 border-l-red-500" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                          a.status === "ACTIVE"
                            ? "bg-red-100 text-red-600"
                            : a.status === "RESPONDED"
                              ? "bg-amber-100 text-amber-600"
                              : "bg-green-100 text-green-600"
                        }`}
                      >
                        {a.triggeredBy === "USER" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Car className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 truncate">
                            {personName(triggered)}
                          </p>
                          <span
                            className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded ${
                              a.status === "ACTIVE"
                                ? "bg-red-600 text-white"
                                : a.status === "RESPONDED"
                                  ? "bg-amber-500 text-white"
                                  : "bg-green-500 text-white"
                            }`}
                          >
                            <Timer className="w-3 h-3" />{" "}
                            {fmtElapsed(a.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{" "}
                          {a.address || "Location shared"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {phone && (
                            <a
                              href={`tel:${phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-semibold rounded"
                            >
                              <Phone className="w-3 h-3" /> Call
                            </a>
                          )}
                          {!a.policeNotified && a.status === "ACTIVE" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleNotifyPolice(a);
                              }}
                              disabled={actioningId === a._id}
                              className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-semibold rounded disabled:opacity-50"
                            >
                              <Shield className="w-3 h-3" /> Police
                            </button>
                          )}
                          {a.status === "ACTIVE" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleRespond(a);
                              }}
                              disabled={actioningId === a._id}
                              className="flex items-center gap-1 px-2 py-1 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[11px] font-semibold rounded disabled:opacity-50"
                            >
                              <ArrowUpRight className="w-3 h-3" /> Respond
                            </button>
                          )}
                          {a.status === "RESPONDED" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAlert(a);
                                setShowResolveModal(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-[11px] font-semibold rounded"
                            >
                              <CheckCircle className="w-3 h-3" /> Resolve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {selectedAlert && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">
                  Incident{" "}
                  {bookingNumber(selectedAlert.bookingId) || selectedAlert._id}
                </h3>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    selectedAlert.status === "ACTIVE"
                      ? "bg-red-100 text-red-700"
                      : selectedAlert.status === "RESPONDED"
                        ? "bg-amber-100 text-amber-700"
                        : selectedAlert.status === "FALSE_ALARM"
                          ? "bg-gray-100 text-gray-700"
                          : "bg-green-100 text-green-700"
                  }`}
                >
                  {selectedAlert.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Triggered by {selectedAlert.triggeredBy} ·{" "}
                {fmtElapsed(selectedAlert.createdAt)} ago
              </p>
            </div>
            {(() => {
              const c = coordsOf(selectedAlert);
              if (!c) return null;
              return (
                <a
                  href={`https://maps.google.com/?q=${c[0]},${c[1]}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-movezy-600 text-sm hover:underline flex items-center gap-1"
                >
                  Open in Maps <ExternalLink className="w-3 h-3" />
                </a>
              );
            })()}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {selectedAlert.userId && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Customer</p>
                  <p className="text-sm font-medium text-gray-900">
                    {personName(selectedAlert.userId)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {personPhone(selectedAlert.userId) || "—"}
                  </p>
                </div>
              </div>
            )}
            {selectedAlert.driverId && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Car className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Driver</p>
                  <p className="text-sm font-medium text-gray-900">
                    {personName(selectedAlert.driverId)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {personPhone(selectedAlert.driverId) || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {selectedAlert.policeNotified && (
            <div className="mt-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
              <Shield className="w-4 h-4" /> Police call logged by an operator.
            </div>
          )}

          {selectedAlert.resolutionNotes && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg text-sm text-green-800">
              <strong>Resolution:</strong> {selectedAlert.resolutionNotes}
            </div>
          )}

          {selectedAlert.status === "RESPONDED" && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowResolveModal(true)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" /> Mark as Resolved
              </button>
            </div>
          )}
        </div>
      )}

      {showResolveModal && selectedAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-md w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">
                Resolve SOS Alert
              </h3>
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolution("");
                  setResolveAsFalseAlarm(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Resolution notes
            </label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-movezy-500 focus:outline-none text-sm"
              placeholder="Describe how the situation was resolved…"
            />
            <label className="flex items-center gap-2 mt-3 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={resolveAsFalseAlarm}
                onChange={(e) => setResolveAsFalseAlarm(e.target.checked)}
              />
              Mark as false alarm
            </label>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowResolveModal(false);
                  setResolution("");
                  setResolveAsFalseAlarm(false);
                }}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleResolve()}
                disabled={!resolution.trim() || resolveSaving}
                className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resolveSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Resolve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FilterStat: React.FC<{
  label: string;
  count: number;
  tone: "neutral" | "danger" | "warning" | "success";
  pulse?: boolean;
  active?: boolean;
  onClick: () => void;
}> = ({ label, count, tone, pulse, active, onClick }) => {
  const colors = {
    neutral: { border: "border-gray-300", text: "text-gray-900", bg: "bg-gray-100" },
    danger: { border: "border-red-500", text: "text-red-600", bg: "bg-red-100" },
    warning: { border: "border-amber-500", text: "text-amber-600", bg: "bg-amber-100" },
    success: { border: "border-green-500", text: "text-green-600", bg: "bg-green-100" },
  }[tone];
  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm p-4 border transition text-left ${
        active
          ? `${colors.border} ring-2 ring-offset-1 ring-${
              tone === "danger"
                ? "red"
                : tone === "warning"
                  ? "amber"
                  : tone === "success"
                    ? "green"
                    : "gray"
            }-200`
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${colors.text}`}>{count}</p>
        </div>
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors.bg} ${
            pulse ? "animate-pulse" : ""
          }`}
        >
          {tone === "danger" ? (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          ) : tone === "warning" ? (
            <MessageSquare className="w-4 h-4 text-amber-600" />
          ) : tone === "success" ? (
            <CheckCircle className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-gray-600" />
          )}
        </div>
      </div>
    </button>
  );
};

export default SOSDashboard;
