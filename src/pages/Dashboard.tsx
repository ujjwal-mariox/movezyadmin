// src/pages/Dashboard.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchActionCenter,
  type ActionCenterPending,
  type ActionCenterDelayed,
  type ActionCenterAtRisk,
} from "../services/api";
import { driversApi, dashboardApi, enhancedFinanceApi } from "../services/admin-api";
import { fetchAppSettings, upsertAppSetting } from "../services/api";
import { dialog } from "../components/Layout/Dialog";
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
  Bell,
  FileWarning,
  CreditCard,
  History,
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

// Failures used to resolve to null, which the page rendered as zeros and
// "All orders assigned." — an expired session or a 403 was indistinguishable
// from a quiet day. Throw instead so the caller can surface it.
const fetchApi = async (endpoint: string, signal?: AbortSignal) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) {
    throw new Error(
      res.status === 401
        ? "Session expired — sign in again"
        : res.status === 403
        ? "Your role can't view this data"
        : `Request failed (${res.status})`
    );
  }
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

// Mirrors GET /admin/dashboard/live-stats (FinanceController.getLiveStats).
// Every required field below is returned by that endpoint today.
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
  cancelledToday?: number;
  // Same-day / on-trip counts the "Today" charts need. getLiveStats measures
  // and returns these; they stay optional so an older backend still renders the
  // explicit "unavailable" state instead of a wrong chart. They must never be
  // re-derived client-side: the previous code subtracted all-time totals from a
  // same-day count and from a %-online figure, which produced completed/idle
  // numbers nothing had ever measured.
  completedToday?: number;
  pendingToday?: number;
  driversOnTrip?: number;
  /// Online, approved, and NOT already carrying a booking — the count that can
  /// actually be dispatched. `activeDrivers` includes drivers mid-trip.
  availableDrivers?: number;
  // Same slice of yesterday, for the KPI trend text. Optional so an older
  // backend simply renders no trend rather than a fabricated one.
  yesterdayRevenue?: number;
  yesterdayCancelled?: number;
  yesterdayOrders?: number;
  todayOrders?: number;
}

interface LoadErrors {
  stats?: string;
  timeline?: string;
  drivers?: string;
  action?: string;
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

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // All-time / net figures for the second stats row. getStats aggregates
  // total revenue in the backend but nothing ever called it; net revenue was
  // only visible on Finance & Insights.
  const [totals, setTotals] = useState<{
    totalRevenue: number | null;
    netRevenue: number | null;
    commission: number | null;
    expenses: number | null;
    openTickets: number | null;
    pendingVerification: number | null;
  }>({ totalRevenue: null, netRevenue: null, commission: null, expenses: null, openTickets: null, pendingVerification: null });

  useEffect(() => {
    (async () => {
      try {
        const [statsRes, finRes] = await Promise.all([
          dashboardApi.getStats().catch(() => null),
          enhancedFinanceApi.getEnhancedOverview({ period: "month" }).catch(() => null),
        ]);
        const d = (statsRes as any)?.data;
        const f = (finRes as any)?.data?.summary;
        setTotals({
          totalRevenue: typeof d?.revenue?.total === "number" ? d.revenue.total : null,
          netRevenue: typeof f?.netRevenue === "number" ? f.netRevenue : null,
          commission: typeof f?.totalCommission === "number" ? f.totalCommission : null,
          expenses: typeof f?.totalExpenses === "number" ? f.totalExpenses : null,
          openTickets: typeof d?.support?.openTickets === "number"
            ? d.support.openTickets
            : typeof d?.openTickets === "number" ? d.openTickets : null,
          pendingVerification: typeof d?.drivers?.pendingVerification === "number"
            ? d.drivers.pendingVerification
            : typeof d?.pendingVerification === "number" ? d.pendingVerification : null,
        });
      } catch {
        /* cards render em-dashes when a figure is unavailable */
      }
    })();
  }, []);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [drivers, setDrivers] = useState<DriverLocation[]>([]);
  const [pendingOrders, setPendingOrders] = useState<ActionCenterPending[]>([]);
  const [delayedOrders, setDelayedOrders] = useState<ActionCenterDelayed[]>([]);
  const [atRiskOrders, setAtRiskOrders] = useState<ActionCenterAtRisk[]>([]);
  // The loading flag was discarded (`const [, setLoading]`), so the first paint
  // showed zeros before anything had been fetched.
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadErrors, setLoadErrors] = useState<LoadErrors>({});

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(20);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Auto-assign action (real endpoint: POST /admin/bookings/auto-assign)
  const [autoAssigning, setAutoAssigning] = useState(false);
  const handleRunAutoAssignRef = React.useRef<(() => void) | null>(null);
  // Auto-assign ON/OFF. When ON, the sweep runs on every auto-refresh tick
  // instead of waiting for someone to press the button.
  //
  // Scope, stated plainly: this runs from the dashboard, so it works while an
  // ops console is OPEN. New bookings are already dispatched automatically by
  // the server the moment they are created — this sweep is the retry pass for
  // orders nobody accepted. The switch is now SERVER state
  // (auto_assign_scheduler_enabled): the job scheduler runs the same sweep on
  // its own timer, so it works with no console open.
  const [autoAssignOn, setAutoAssignOn] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetchAppSettings();
        const items = res?.data?.settings ?? res?.settings ?? [];
        const row = Array.isArray(items)
          ? items.find((i: any) => i.key === "auto_assign_scheduler_enabled")
          : null;
        setAutoAssignOn(row ? row.value === true || row.value === "true" : false);
      } catch {
        setAutoAssignOn(null); // unknown — never show a false OFF
      }
    })();
  }, []);

  // Smart list
  const [activeTab, setActiveTab] = useState<"delayed" | "unassigned" | "nearby">("delayed");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  // Event timeline filter
  const [eventFilter, setEventFilter] = useState<"all" | "orders" | "refunds" | "sos">("all");

  const abortRef = useRef<AbortController | null>(null);

  const loadDashboardData = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Settled per call: one failing endpoint must not blank the other three,
    // and each failure has to be reported rather than swallowed into zeros.
    const [statsRes, timelineRes, driversRes, actionRes] = await Promise.allSettled([
      fetchApi("/admin/dashboard/live-stats", controller.signal),
      fetchApi("/admin/dashboard/event-timeline?limit=10", controller.signal),
      fetchApi("/admin/tracking/drivers?status=online", controller.signal),
      fetchActionCenter(controller.signal),
    ]);

    // A newer refresh aborted this one; that call owns the next state update.
    if (controller.signal.aborted) return;

    const failureText = (r: PromiseSettledResult<unknown>, fallback: string) => {
      if (r.status !== "rejected") return fallback;
      const e = r.reason;
      return e instanceof Error && e.message ? e.message : fallback;
    };

    const nextErrors: LoadErrors = {};

    // --- live stats ---
    const statsBody = statsRes.status === "fulfilled" ? (statsRes.value as any) : null;
    const statsData = statsBody?.data;
    // getLiveStats answers with {} when the db handle is missing, so require a
    // known numeric field before trusting the payload.
    if (statsData && typeof statsData.liveOrders === "number") {
      setLiveStats(statsData as LiveStats);
    } else {
      setLiveStats(null);
      nextErrors.stats = failureText(statsRes, "Live stats unavailable");
    }

    // --- event timeline ---
    if (timelineRes.status === "fulfilled") {
      const rawTimeline =
        (timelineRes.value as any)?.data?.events ?? (timelineRes.value as any)?.data ?? [];
      setTimeline(Array.isArray(rawTimeline) ? rawTimeline : []);
    } else {
      setTimeline([]);
      nextErrors.timeline = failureText(timelineRes, "Event timeline unavailable");
    }

    // --- driver locations ---
    if (driversRes.status === "fulfilled") {
      const rawDrivers =
        (driversRes.value as any)?.data?.drivers ?? (driversRes.value as any)?.data ?? [];
      // /admin/tracking/drivers returns driverId/name/isAvailable/hasActiveBooking;
      // there is no `status` field — it is derived from the two booleans here so
      // every consumer below can rely on _id/fullName/status being present.
      setDrivers(
        Array.isArray(rawDrivers)
          ? rawDrivers.map((d: any) => ({
              _id: String(d.driverId ?? d._id ?? ""),
              fullName: d.name ?? d.fullName ?? "Unknown driver",
              status:
                d.status ??
                (d.hasActiveBooking
                  ? "on_trip"
                  : d.isAvailable
                  ? "available"
                  : "offline"),
              location: d.location,
              currentBookingId: d.currentBookingId,
            }))
          : []
      );
    } else {
      setDrivers([]);
      nextErrors.drivers = failureText(driversRes, "Driver locations unavailable");
    }

    // --- action centre ---
    // fetchActionCenter (services/api.ts) returns res.json() without an ok
    // check, so a 401 resolves to {success:false,message:...}. Treat anything
    // that isn't the expected payload as a failure instead of empty queues.
    const actionBody = actionRes.status === "fulfilled" ? (actionRes.value as any) : null;
    const action = actionBody?.data ?? actionBody;
    if (actionBody?.success !== false && Array.isArray(action?.pendingAssignments)) {
      setPendingOrders(action.pendingAssignments);
      setDelayedOrders(Array.isArray(action.delayedOrders) ? action.delayedOrders : []);
      setAtRiskOrders(Array.isArray(action.atRisk) ? action.atRisk : []);
    } else {
      setPendingOrders([]);
      setDelayedOrders([]);
      setAtRiskOrders([]);
      nextErrors.action =
        actionRes.status === "rejected"
          ? failureText(actionRes, "Action center unavailable")
          : actionBody?.message || "Action center unavailable";
    }

    setLoadErrors(nextErrors);
    setLastRefreshed(new Date());
    setInitialLoading(false);
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

  // Assign the nearest available driver to every SEARCHING booking, then
  // refresh the action-center queues with the result.
  const handleRunAutoAssign = useCallback(async () => {
    if (autoAssigning) return;
    setAutoAssigning(true);
    try {
      const res = await driversApi.autoAssign();
      const assigned = res?.data?.assigned ?? 0;
      const evaluated = res?.data?.evaluated ?? 0;
      await loadDashboardData();
      await dialog.alert({
        title: "Auto-assign complete",
        message:
          evaluated === 0
            ? "No unassigned orders to auto-assign right now."
            : assigned > 0
              ? `Assigned ${assigned} of ${evaluated} searching order(s) to the nearest available drivers.`
              : `No available online drivers found for ${evaluated} searching order(s).`,
        tone: evaluated === 0 || assigned > 0 ? "success" : "warning",
      });
    } catch (e) {
      await dialog.alert({
        title: "Auto-assign failed",
        message: e instanceof Error ? e.message : "Auto-assign failed",
        tone: "danger",
      });
    } finally {
      setAutoAssigning(false);
    }
  }, [autoAssigning, loadDashboardData]);

  useEffect(() => {
    handleRunAutoAssignRef.current = handleRunAutoAssign;
  }, [handleRunAutoAssign]);

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

  // Stats are either present or not: with no payload the KPI strip shows "—"
  // rather than a full set of confident zeros.
  const statsLoaded = liveStats !== null;
  const NO_VALUE = "—";

  // A failed action-center fetch must not render as an empty, reassuring queue.
  const actionFailed = Boolean(loadErrors.action);
  const QUEUE_ERROR = "Couldn't load this queue.";

  const failedSections = (
    [
      loadErrors.stats ? "live stats" : null,
      loadErrors.timeline ? "event timeline" : null,
      loadErrors.drivers ? "driver map" : null,
      loadErrors.action ? "action center" : null,
    ] as Array<string | null>
  ).filter((x): x is string => x !== null);

  /// "+12% vs yesterday" style micro-text, from real same-slice-of-yesterday
  /// figures. Returns "" when the backend sent no basis, so an older backend
  /// renders no trend rather than an invented one. A 0 -> n change has no
  /// percentage, so it reports the movement in absolute terms instead of
  /// dividing by zero.
  const trendText = (today?: number, yesterday?: number): string => {
    if (today === undefined || yesterday === undefined) return "";
    if (yesterday === 0) {
      if (today === 0) return "same as yesterday";
      return `+${today} vs yesterday`;
    }
    const pct = ((today - yesterday) / yesterday) * 100;
    if (Math.abs(pct) < 1) return "same as yesterday";
    return `${pct > 0 ? "+" : ""}${pct.toFixed(0)}% vs yesterday`;
  };

  const delayedCount = s.delayedOrders ?? 0;
  // "Failed" doesn't exist as a booking status — cancelled-today is the real
  // signal, and failureRate has always been derived from it.
  const failedCount = s.cancelledToday ?? 0;

  // ============ REAL-TIME ALERT STRIP ============
  // Thresholds for operational risk conditions
  const ALERT_THRESHOLDS = {
    unassignedMins: 10,
    codFloatingHigh: 50000,
    docExpiryDays: 7,
  };

  const minsSince = (iso?: string) => (iso ? (Date.now() - new Date(iso).getTime()) / 60000 : 0);

  const alerts: Array<{ id: string; level: "red" | "amber"; icon: React.ElementType; message: string; path?: string }> = [];

  const stuckOrders = pendingOrders.filter((o) => minsSince(o.waitingSince) > ALERT_THRESHOLDS.unassignedMins).length;
  if (stuckOrders > 0) {
    alerts.push({
      id: "unassigned",
      level: "red",
      icon: Clock,
      message: `${stuckOrders} order${stuckOrders > 1 ? "s" : ""} unassigned > ${ALERT_THRESHOLDS.unassignedMins} mins`,
      path: "/admin/orders?status=SEARCHING",
    });
  }
  // An "N drivers idle > 60 mins" alert used to sit here. Nothing measured
  // elapsed idle time: the count was activeDrivers minus activeDrivers ×
  // (driverUtilization / 100), i.e. a restatement of the %-online figure, and
  // the "> 60 mins" threshold was only ever interpolated into the sentence.
  // GET /admin/dashboard/alerts does compute a real idle signal (online with no
  // trip in 7+ days) — that endpoint, not arithmetic here, is what an idle
  // alert must come from.
  if (s.activeSOS > 0) {
    alerts.push({
      id: "sos",
      level: "red",
      icon: AlertTriangle,
      message: `${s.activeSOS} active SOS case${s.activeSOS > 1 ? "s" : ""} pending acknowledgement`,
      path: "/admin/sos",
    });
  }
  if (s.failureRate > 10) {
    // failureRate is todayCancelled / todayTotal (getLiveStats). It is not a
    // comparison against the previous 24h, so the message no longer claims one.
    alerts.push({
      id: "failure-rate",
      level: "red",
      icon: XCircle,
      message: `${s.failureRate.toFixed(1)}% of today's orders cancelled`,
      path: `/admin/orders?status=CANCELLED&dateFrom=${new Date().toISOString().slice(0, 10)}`,
    });
  }
  // Placeholders for backend-fed signals (enterprise credit, COD outstanding, doc expiry)
  // These render when the backend includes them in liveStats
  const anyExt = liveStats as any;
  if (anyExt?.enterpriseCreditExceeded > 0) {
    alerts.push({
      id: "credit",
      level: "amber",
      icon: CreditCard,
      message: `${anyExt.enterpriseCreditExceeded} enterprise${anyExt.enterpriseCreditExceeded > 1 ? "s" : ""} exceeded credit limit`,
      path: "/admin/finance?tab=dso",
    });
  }
  if (anyExt?.highCODDrivers > 0) {
    alerts.push({
      id: "cod",
      level: "amber",
      icon: CreditCard,
      message: `${anyExt.highCODDrivers} drivers with floating COD > ₹${ALERT_THRESHOLDS.codFloatingHigh.toLocaleString()}`,
      path: "/admin/finance?tab=cod",
    });
  }
  if (anyExt?.docsExpiringSoon > 0) {
    alerts.push({
      id: "docs",
      level: "amber",
      icon: FileWarning,
      message: `${anyExt.docsExpiringSoon} driver document${anyExt.docsExpiringSoon > 1 ? "s" : ""} expiring within ${ALERT_THRESHOLDS.docExpiryDays} days`,
      path: "/admin/compliance",
    });
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  // Chart data — both cards sit under a "Today" heading, so every series must be
  // same-day. Completed used to be (all-time total − live − pending − cancelled
  // today), which plotted a lifetime figure against today's cancellations, and
  // Pending was the all-time SEARCHING count. Only genuinely same-day fields are
  // charted now; while the API doesn't send them the card says so.
  const orderBreakdown =
    typeof s.completedToday === "number" &&
    typeof s.pendingToday === "number" &&
    typeof s.cancelledToday === "number"
      ? [
          { name: "Completed", value: s.completedToday, color: "#10B981" },
          { name: "Pending", value: s.pendingToday, color: "#F59E0B" },
          { name: "Cancelled", value: s.cancelledToday, color: "#EF4444" },
        ]
      : null;

  // Active = drivers actually on a trip. driverUtilization is % online, not trip
  // occupancy, so it can't stand in for this split.
  const driverBreakdown =
    typeof s.driversOnTrip === "number"
      ? [
          { name: "On trip", value: s.driversOnTrip, color: "#10B981" },
          {
            name: "Idle",
            value: Math.max(s.activeDrivers - s.driversOnTrip, 0),
            color: "#9CA3AF",
          },
        ]
      : null;

  const defaultCenter: [number, number] = [12.9716, 77.5946];
  const driverPoints: [number, number][] = drivers
    .filter((d) => d.location?.lat && d.location?.lng)
    .map((d) => [d.location.lat, d.location.lng] as [number, number]);

  // Critical KPI cards.
  // Each card used to carry a hardcoded `trend: "up" | "down"` rendered as a
  // coloured arrow — a green rise on Revenue Today even on a day revenue
  // collapsed. No prior-period figure is fetched anywhere on this page and
  // getLiveStats returns none, so the arrows are gone rather than invented.
  const kpis: Array<{
    label: string;
    value: string | number;
    hint: string;
    icon: React.ElementType;
    tone: "neutral" | "danger" | "success";
    path: string;
  }> = [
    {
      label: "Active Orders",
      value: statsLoaded ? s.liveOrders : NO_VALUE,
      hint: statsLoaded ? trendText(s.todayOrders, s.yesterdayOrders) : "",
      icon: Package,
      tone: "neutral" as const,
      path: "/admin/orders?status=IN_PROGRESS",
    },
    {
      label: "Delayed Orders",
      value: statsLoaded ? delayedCount : NO_VALUE,
      hint: !statsLoaded
        ? ""
        : delayedCount > 0
        ? `${delayedCount} need attention`
        : "All on time",
      icon: Clock,
      tone: "danger" as const,
      // "delayed" is not a booking status the orders list can filter by; the
      // live tracking board is where delayed trips are actually visible.
      path: "/admin/tracking",
    },
    {
      // The spec calls this "Failed Orders". Cancelled IS the failure signal
      // in this data — no separate FAILED booking status exists — so the label
      // follows the spec while the number stays the one that is measured.
      label: "Failed Orders",
      value: statsLoaded ? failedCount : NO_VALUE,
      hint: statsLoaded
        ? `${s.failureRate.toFixed(1)}% of today · ${trendText(failedCount, s.yesterdayCancelled)}`
        : "",
      icon: XCircle,
      tone: "danger" as const,
      path: "/admin/orders?status=cancelled",
    },
    {
      // Genuinely available = online AND not already on a trip. The card used
      // to show `activeDrivers` (everyone online, mid-trip included) and was
      // therefore labelled "Online Drivers" to avoid overstating capacity. The
      // server now computes the free count, so the spec's "Available Drivers"
      // label is accurate rather than a rename of the wrong number.
      label: "Available Drivers",
      value: statsLoaded
        ? (s.availableDrivers ?? Math.max(s.activeDrivers - (s.driversOnTrip ?? 0), 0))
        : NO_VALUE,
      hint: statsLoaded
        ? `${s.activeDrivers} online · ${s.driversOnTrip ?? 0} on trip`
        : "",
      icon: Truck,
      tone: "success" as const,
      path: "/admin/tracking",
    },
    {
      label: "Revenue Today",
      value: statsLoaded ? `₹${s.todayRevenue.toLocaleString()}` : NO_VALUE,
      hint: statsLoaded ? trendText(s.todayRevenue, s.yesterdayRevenue) : "",
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
          {/* "Updated just now" would otherwise appear even when every request
              in that refresh failed. */}
          <span
            className={`text-xs hidden md:inline ${
              failedSections.length > 0 ? "text-red-600" : "text-gray-500"
            }`}
          >
            {failedSections.length > 0
              ? `Tried ${formatTimeAgo(lastRefreshed.toISOString())} ago · some data failed`
              : `Updated ${formatTimeAgo(lastRefreshed.toISOString())} ago`}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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

      {/* LOAD FAILURE BANNER — a dead API used to look like an idle operation,
          so every failed section is now named explicitly. */}
      {failedSections.length > 0 && (
        <div className="flex items-start justify-between gap-3 px-4 py-3 rounded-lg border border-red-200 bg-red-50">
          <div className="flex items-start gap-2.5 min-w-0">
            <span className="inline-flex w-7 h-7 rounded-full items-center justify-center flex-shrink-0 bg-red-500 text-white">
              <AlertCircle className="w-3.5 h-3.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">
                Couldn't load live data — {failedSections.join(", ")}
              </p>
              <p className="text-xs text-red-700 mt-0.5">
                {Array.from(new Set(Object.values(loadErrors))).join(" · ")}
              </p>
            </div>
          </div>
          <button
            onClick={loadDashboardData}
            className="flex-shrink-0 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* REAL-TIME ALERT STRIP */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => {
            const Icon = a.icon;
            const isRed = a.level === "red";
            return (
              <button
                key={a.id}
                onClick={() => a.path && navigate(a.path)}
                className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${
                  isRed
                    ? "bg-red-50 border-red-200 hover:bg-red-100"
                    : "bg-amber-50 border-amber-200 hover:bg-amber-100"
                } transition text-left`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`inline-flex w-7 h-7 rounded-full items-center justify-center flex-shrink-0 ${
                      isRed ? "bg-red-500 text-white" : "bg-amber-500 text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span
                    className={`text-sm font-medium ${
                      isRed ? "text-red-800" : "text-amber-800"
                    }`}
                  >
                    {a.message}
                  </span>
                </div>
                {a.path && (
                  <ChevronRight
                    className={`w-4 h-4 flex-shrink-0 ${
                      isRed ? "text-red-500" : "text-amber-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* SECTION 1 — CRITICAL CONTROL STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {initialLoading
          ? // First paint: a skeleton, not zeros.
            [0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-gray-200 animate-pulse"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 mb-3" />
                <div className="h-8 w-20 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            ))
          : kpis.map((k) => {
              const Icon = k.icon;
              const isDanger = k.tone === "danger";
              const isSuccess = k.tone === "success";
              const borderCls = isDanger
                ? "border-l-[6px] border-red-500"
                : isSuccess
                ? "border-l-4 border-green-500"
                : "border-l-4 border-movezy-500";
              const iconBg = isDanger
                ? "bg-red-50 text-red-600"
                : isSuccess
                ? "bg-green-50 text-green-600"
                : "bg-movezy-50 text-movezy-600";
              const hasValue = k.value !== NO_VALUE;
              const valueCls = !hasValue
                ? "text-gray-300"
                : isDanger
                ? "text-red-600"
                : "text-gray-900";

              return (
                <button
                  key={k.label}
                  onClick={() => navigate(k.path)}
                  className={`group text-left rounded-xl shadow-sm hover:shadow-md transition p-6 ${borderCls} ${
                    isDanger ? "bg-red-50/60" : "bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className={`text-[32px] font-bold leading-none mb-1.5 ${valueCls}`}>{k.value}</div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 font-semibold">{k.label}</div>
                  {k.hint && (
                    <div className={`text-xs mt-1.5 ${isDanger ? "text-red-600 font-medium" : "text-gray-500"}`}>
                      {k.hint}
                    </div>
                  )}
                </button>
              );
            })}
      </div>

      {/* SECTION 1b — TOTALS (all-time / month) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          {
            label: "Total Revenue (Gross)",
            value: totals.totalRevenue !== null ? `₹${totals.totalRevenue.toLocaleString("en-IN")}` : NO_VALUE,
            hint: "All-time customer payments incl. GST",
            path: "/admin/finance",
          },
          {
            label: "Net Revenue (Month)",
            value: totals.netRevenue !== null ? `₹${totals.netRevenue.toLocaleString("en-IN")}` : NO_VALUE,
            hint: "After refunds · details in Finance & Insights",
            path: "/admin/finance",
          },
          {
            // The platform's actual income for the window — gross/net above are
            // customer payments, most of which is passed through to drivers.
            label: "Commission (Month)",
            value: totals.commission !== null ? `₹${totals.commission.toLocaleString("en-IN")}` : NO_VALUE,
            hint: "Platform earnings this month",
            path: "/admin/finance",
          },
          {
            label: "Expenses (Month)",
            value: totals.expenses !== null ? `₹${totals.expenses.toLocaleString("en-IN")}` : NO_VALUE,
            hint: "Operating expenses incl. driver payouts",
            path: "/admin/finance?tab=expenses",
          },
          {
            label: "Open Tickets",
            value: totals.openTickets !== null ? totals.openTickets : NO_VALUE,
            hint: "Open + in-progress support tickets",
            // No status filter: the card counts OPEN + IN_PROGRESS and the
            // list can only filter one status at a time, so filtering to OPEN
            // showed fewer rows than the number the admin just clicked.
            path: "/admin/support",
          },
          {
            label: "Pending Driver Verifications",
            value: totals.pendingVerification !== null ? totals.pendingVerification : NO_VALUE,
            hint: "Documents awaiting review",
            path: "/admin/riders?status=document_not_complete",
          },
        ].map((c) => (
          <button
            key={c.label}
            onClick={() => navigate(c.path)}
            className="group text-left bg-white rounded-xl shadow-sm hover:shadow-md transition p-4"
          >
            <div className={`text-2xl font-bold leading-tight mb-0.5 ${c.value === NO_VALUE ? "text-gray-300" : "text-gray-900"}`}>
              {c.value}
            </div>
            <div className="text-sm text-gray-600 font-medium">{c.label}</div>
            <div className="text-xs mt-0.5 text-gray-400">{c.hint}</div>
          </button>
        ))}
      </div>

      {/* SECTION 2 — ACTION CENTER */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Action Center</h2>
            <p className="text-xs text-gray-500">Queues that need human or automated intervention.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                if (autoAssignOn === null) return;
                const next = !autoAssignOn;
                try {
                  await upsertAppSetting({
                    key: "auto_assign_scheduler_enabled",
                    value: next,
                    type: "BOOLEAN",
                    category: "scheduler",
                    description: "Unattended auto-assign sweep (job scheduler)",
                  });
                  setAutoAssignOn(next);
                } catch {
                  // Failed write — leave the shown state untouched.
                }
              }}
              title={
                autoAssignOn === null
                  ? "State unknown (settings unreadable)"
                  : autoAssignOn
                    ? "The server runs the auto-assign sweep on its own schedule — no console needs to be open"
                    : "Unattended auto-assign is off; the button still runs a one-shot sweep"
              }
              className={`flex items-center gap-2 text-sm font-semibold rounded-lg px-3 py-1.5 border ${
                autoAssignOn
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-white border-gray-300 text-gray-600"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  autoAssignOn ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              Auto-assign {autoAssignOn === null ? "?" : autoAssignOn ? "ON" : "OFF"}
            </button>
            <button
              onClick={handleRunAutoAssign}
              disabled={autoAssigning}
              className="flex items-center gap-2 bg-movezy-600 hover:bg-movezy-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg px-3 py-1.5"
            >
              <Zap className="w-4 h-4" />
              {autoAssigning ? "Assigning..." : "Run now"}
            </button>
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
                  <p className="text-xs text-gray-500">
                    {actionFailed ? "Unavailable" : `${pendingOrders.length} waiting for driver`}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                {actionFailed ? NO_VALUE : pendingOrders.length}
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
                    onClick={() => navigate(`/admin/orders?bookingId=${o._id}`)}
                  >
                    Assign Now
                  </button>
                </div>
              ))}
              {pendingOrders.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">
                  {actionFailed ? QUEUE_ERROR : "All orders assigned."}
                </div>
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
                  <p className="text-xs text-gray-500">
                    {actionFailed ? "Unavailable" : `${delayedOrders.length} past ETA`}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                {actionFailed ? NO_VALUE : delayedOrders.length}
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
                      onClick={() => navigate(`/admin/orders?bookingId=${o._id}`)}
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
                <div className="p-6 text-center text-sm text-gray-400">
                  {actionFailed ? QUEUE_ERROR : "No delays right now."}
                </div>
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
                  {/* getActionCenter flags active trips whose liveLocation is
                      older than 5 minutes — it is a stale-GPS queue, not a
                      failure prediction. */}
                  <p className="text-xs text-gray-500">
                    {actionFailed ? "Unavailable" : "Driver location stale 5+ mins"}
                  </p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                {actionFailed ? NO_VALUE : atRiskOrders.length}
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
                    onClick={() => navigate("/admin/orders")}
                  >
                    Review
                  </button>
                </div>
              ))}
              {atRiskOrders.length === 0 && (
                <div className="p-6 text-center text-sm text-gray-400">
                  {actionFailed ? QUEUE_ERROR : "No at-risk deliveries."}
                </div>
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
                <MapPin className="w-3.5 h-3.5" /> All cities
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
                {
                  key: "delayed",
                  label: "Delayed",
                  count: actionFailed ? NO_VALUE : delayedOrders.length,
                },
                {
                  key: "unassigned",
                  label: "Unassigned",
                  count: actionFailed ? NO_VALUE : pendingOrders.length,
                },
                {
                  key: "nearby",
                  label: "Nearby",
                  count: loadErrors.drivers ? NO_VALUE : drivers.length,
                },
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
                    {/* These were underlined spans that looked like links but
                        only re-centred the map. Reassign now actually opens the
                        booking; Call is gone — no driver phone number is on
                        this payload and there was nothing to dial. */}
                    <div className="flex gap-1.5 mt-2">
                      <span
                        role="link"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/admin/orders?bookingId=${o._id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.stopPropagation();
                            navigate(`/admin/orders?bookingId=${o._id}`);
                          }
                        }}
                        className="text-[11px] text-movezy-700 underline cursor-pointer hover:text-movezy-900"
                      >
                        Reassign
                      </span>
                      {/* Real tel: link — the same delayedOrders rows carry
                          driverPhone (booking.controller delayedOrders), which
                          the Action Center card already dials. Rendered only
                          when a number is actually present. */}
                      {o.driverPhone && (
                        <>
                          <span className="text-[11px] text-gray-300">·</span>
                          <a
                            href={`tel:${o.driverPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-movezy-700 underline hover:text-movezy-900"
                          >
                            Call
                          </a>
                        </>
                      )}
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
                <div className="p-6 text-center text-sm text-gray-400">
                  {activeTab === "nearby"
                    ? loadErrors.drivers
                      ? "Couldn't load drivers."
                      : "Nothing here right now."
                    : actionFailed
                    ? QUEUE_ERROR
                    : "Nothing here right now."}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3.5 — LIVE EVENT TIMELINE FEED */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-movezy-500" /> Live Event Timeline
            </h2>
            <p className="text-xs text-gray-500">Real-time stream of operational events.</p>
          </div>
          <div className="flex bg-white border border-gray-200 rounded-lg p-0.5">
            {([
              { key: "all", label: "All" },
              { key: "orders", label: "Orders" },
              { key: "refunds", label: "Refunds" },
              { key: "sos", label: "SOS" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setEventFilter(f.key)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                  eventFilter === f.key
                    ? "bg-movezy-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          {(() => {
            const filtered = timeline.filter((ev) => {
              if (eventFilter === "all") return true;
              const mod = (ev.module || "").toLowerCase();
              const act = (ev.action || "").toLowerCase();
              if (eventFilter === "orders") return mod.includes("order") || mod.includes("booking") || act.includes("assign") || act.includes("created") || act.includes("reassign");
              if (eventFilter === "refunds") return mod.includes("refund") || act.includes("refund");
              if (eventFilter === "sos") return mod.includes("sos") || act.includes("sos");
              return true;
            });

            if (filtered.length === 0) {
              return (
                <div className="p-8 text-center text-sm text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  {loadErrors.timeline
                    ? "Couldn't load the event feed."
                    : "No events to show for this filter."}
                </div>
              );
            }

            const eventVisuals = (ev: TimelineEvent) => {
              const mod = (ev.module || "").toLowerCase();
              const act = (ev.action || "").toLowerCase();
              if (mod.includes("sos") || act.includes("sos")) return { Icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" };
              if (mod.includes("refund") || act.includes("refund")) return { Icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" };
              if (act.includes("reassign")) return { Icon: UserPlus, color: "text-orange-600", bg: "bg-orange-50" };
              if (act.includes("created") || mod.includes("booking") || mod.includes("order")) return { Icon: Package, color: "text-blue-600", bg: "bg-blue-50" };
              return { Icon: Activity, color: "text-gray-600", bg: "bg-gray-50" };
            };

            return (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {filtered.map((ev) => {
                  const { Icon, color, bg } = eventVisuals(ev);
                  return (
                    <div key={ev._id} className="p-3 hover:bg-gray-50 transition flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg} ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{ev.action}</span>
                          <span className="text-[10px] uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{ev.module}</span>
                        </div>
                        {ev.description && <p className="text-xs text-gray-600 mt-0.5">{ev.description}</p>}
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>by {ev.adminName || "System"}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(ev.createdAt)} ago</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* SECTION 4 — PERFORMANCE SNAPSHOT */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Performance Snapshot</h2>
          <span className="text-xs text-gray-500">Today</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Orders</h3>
              <span className="text-xs text-gray-400">Completed vs Pending vs Cancelled</span>
            </div>
            <div className="h-40">
              {orderBreakdown ? (
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
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <p className="text-sm text-gray-400">
                    {loadErrors.stats
                      ? "Couldn't load today's order breakdown."
                      : "Today's order breakdown isn't available."}
                  </p>
                  {!loadErrors.stats && (
                    <p className="text-xs text-gray-400 mt-1">
                      Live stats don't include same-day completed and pending counts.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 text-sm">Driver Performance</h3>
              <span className="text-xs text-gray-400">On trip vs Idle</span>
            </div>
            <div className="h-40">
              {driverBreakdown ? (
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
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <p className="text-sm text-gray-400">
                    {loadErrors.stats
                      ? "Couldn't load the driver split."
                      : "On-trip vs idle split isn't available."}
                  </p>
                  {!loadErrors.stats && (
                    <p className="text-xs text-gray-400 mt-1">
                      Live stats don't include a count of drivers currently on a trip.
                    </p>
                  )}
                </div>
              )}
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
            <p className="text-sm text-gray-400 text-center py-6">
              {loadErrors.timeline ? "Couldn't load recent activity." : "No recent events"}
            </p>
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
