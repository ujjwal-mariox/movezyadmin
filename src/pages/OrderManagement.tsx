import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search,
  Phone,
  X,
  Star,
  UserPlus,
  XCircle,
  Filter,
  ChevronDown,
  Activity,
  MessageSquare,
  MapPin,
  CircleDot,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  fetchAdminBookings,
  cancelAdminBooking,
  assignAdminDriver,
  fetchAvailableDrivers,
  type BookingRow,
  type BookingStatus,
  type BookingPaymentStatus,
  type DriverOption,
} from "../services/api";
import { useDialog } from "../components/Layout/Dialog";

const STATUS_LABEL: Record<BookingStatus, string> = {
  DRAFT: "Draft",
  SEARCHING: "Searching",
  ASSIGNED: "Assigned",
  DRIVER_ARRIVED: "Driver arrived",
  PICKED: "Picked",
  IN_PROGRESS: "In transit",
  COMPLETED: "Delivered",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<BookingStatus, { dot: string; pill: string }> = {
  DRAFT: { dot: "bg-gray-400", pill: "bg-gray-100 text-gray-700" },
  SEARCHING: { dot: "bg-yellow-500", pill: "bg-yellow-50 text-yellow-700" },
  ASSIGNED: { dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700" },
  DRIVER_ARRIVED: { dot: "bg-blue-500", pill: "bg-blue-50 text-blue-700" },
  PICKED: { dot: "bg-indigo-500", pill: "bg-indigo-50 text-indigo-700" },
  IN_PROGRESS: { dot: "bg-blue-600", pill: "bg-blue-50 text-blue-700" },
  COMPLETED: { dot: "bg-green-500", pill: "bg-green-50 text-green-700" },
  CANCELLED: { dot: "bg-gray-700", pill: "bg-gray-100 text-gray-700" },
};

const PAYMENT_COLORS: Record<BookingPaymentStatus, string> = {
  PENDING: "bg-yellow-50 text-yellow-700",
  PAID: "bg-green-50 text-green-700",
  FAILED: "bg-red-50 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
  PARTIALLY_REFUNDED: "bg-gray-100 text-gray-700",
};

const ACTIVE_STATUSES: BookingStatus[] = [
  "SEARCHING",
  "ASSIGNED",
  "DRIVER_ARRIVED",
  "PICKED",
  "IN_PROGRESS",
];

const formatTimeAgo = (iso?: string) => {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const personName = (
  p: { fullName?: string } | string | undefined,
): string | undefined => {
  if (!p) return undefined;
  if (typeof p === "string") return undefined;
  return p.fullName;
};

const personPhone = (
  p: { mobileNumber?: string } | string | undefined,
): string | undefined => {
  if (!p) return undefined;
  if (typeof p === "string") return undefined;
  return p.mobileNumber;
};

const personId = (
  p: { _id: string } | string | undefined,
): string | undefined => {
  if (!p) return undefined;
  if (typeof p === "string") return p;
  return p._id;
};

// booking.estimatedDropTime is written when the driver marks the goods picked up
// (pickedAt + durationMin, the drop leg's road duration). Bookings not yet picked
// up have no estimate, so they return 0 here — not late rather than falsely late.
const computeDelayMinutes = (o: BookingRow): number => {
  if (!ACTIVE_STATUSES.includes(o.status)) return 0;
  if (!o.estimatedDropTime) return 0;
  const d = Math.floor(
    (Date.now() - new Date(o.estimatedDropTime).getTime()) / 60000,
  );
  return d > 0 ? d : 0;
};

/// Operational thresholds for the row flags. Kept together so ops can be told
/// one number rather than hunting them in the markup.
const FLAG_THRESHOLDS = {
  unassignedMins: 10,
  delayedMins: 15,
  /// "High value" is relative to typical order size on this platform, not a
  /// customer tier — no tier field exists on the user model.
  highValueRupees: 2000,
};

const computeWaitingMinutes = (o: BookingRow): number => {
  if (o.status !== "SEARCHING") return 0;
  return Math.max(Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000), 0);
};

// A fare increase taken mid-trip (add-stop) leaves paymentStatus PAID and records
// the uncollected difference on the booking as pendingCashTopUp, cleared by the
// driver's cash-collected call. Without this the admin showed the raised fare as
// fully PAID.
const cashDue = (o: BookingRow): number => {
  const v = o.pendingCashTopUp;
  return typeof v === "number" && v > 0 ? v : 0;
};

// The assign modal used to show only name/phone/vehicle, so an offline driver —
// or one already mid-trip on another booking — looked identical to a free one.
type AssignableDriver = DriverOption;

const driverConcerns = (d: AssignableDriver): string[] => {
  const out: string[] = [];
  if (d.isOnline === false) out.push("currently offline");
  if (d.isActive === false) out.push("deactivated");
  if (d.currentBookingId) out.push("already assigned to another booking");
  return out;
};

const isDriverFree = (d: AssignableDriver) => driverConcerns(d).length === 0;

const OrderManagement: React.FC = () => {
  const dialog = useDialog();
  const [orders, setOrders] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Dashboard cards deep-link here (?status=CANCELLED&dateFrom=...). Filters
  // used to start blank regardless of the URL, so every dashboard link was a
  // silent no-op.
  const [urlParams] = useSearchParams();
  // ?bookingId= selects that booking on arrival, so the dashboard's row CTAs
  // ("Assign Now", "Reassign", "Review") land on the order the admin clicked
  // instead of dropping them on an unfiltered list to hunt for it.
  const [selectedId, setSelectedId] = useState<string>(
    urlParams.get("bookingId") || "",
  );
  const VALID_STATUSES: (BookingStatus | "")[] = ["DRAFT", "SEARCHING", "ASSIGNED", "DRIVER_ARRIVED", "PICKED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
  const urlStatus = (urlParams.get("status") || "").toUpperCase();
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">(
    VALID_STATUSES.includes(urlStatus as BookingStatus) ? (urlStatus as BookingStatus) : "",
  );
  const [paymentFilter, setPaymentFilter] = useState<BookingPaymentStatus | "">("");
  const [serviceFilter, setServiceFilter] = useState<"" | "WITHIN_CITY" | "OUTSTATION">("");
  const [dateFrom, setDateFrom] = useState(urlParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Assign-driver modal
  const [assignModal, setAssignModal] = useState<BookingRow | null>(null);
  const [drivers, setDrivers] = useState<AssignableDriver[]>([]);
  const [driverSearch, setDriverSearch] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminBookings({
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        serviceType: serviceFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search: search || undefined,
        page,
        limit: 20,
      });
      const payload = res?.data ?? res ?? {};
      const list: BookingRow[] = Array.isArray(payload.bookings) ? payload.bookings : [];
      setOrders(list);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.totalPages ?? 1);
      if (list.length && !list.some((b) => b._id === selectedId)) {
        setSelectedId(list[0]._id);
      }
    } catch (err) {
      console.error("Orders load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, paymentFilter, serviceFilter, dateFrom, dateTo, search, page, selectedId]);

  useEffect(() => {
    const id = setTimeout(() => {
      loadOrders();
    }, 250);
    return () => clearTimeout(id);
  }, [loadOrders]);

  const selected = useMemo(
    () => orders.find((o) => o._id === selectedId) || orders[0] || null,
    [orders, selectedId],
  );

  const insights = useMemo(() => {
    const active = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
    const delivered = orders.filter((o) => o.status === "COMPLETED");
    const avgDeliveryMin = delivered.length
      ? Math.round(
          delivered.reduce((acc, o) => {
            if (!o.completedAt) return acc;
            return acc + (new Date(o.completedAt).getTime() - new Date(o.createdAt).getTime()) / 60000;
          }, 0) / delivered.length,
        )
      : 0;
    const cancelled = orders.filter((o) => o.status === "CANCELLED").length;
    const failureRate = orders.length ? (cancelled / orders.length) * 100 : 0;
    const delayed = orders.filter((o) => computeDelayMinutes(o) > 0).length;
    return { active, avgDeliveryMin, failureRate, delayed };
  }, [orders]);

  /// Operational priority score. Deliberately simple and inspectable rather
  /// than a hidden model: minutes waiting unassigned dominate, lateness next,
  /// order value last as a tie-breaker. "Customer type" from the spec is not
  /// included — no customer tier exists on the user model, and inventing one
  /// would make the ranking unexplainable to the ops team using it.
  const priorityScore = useCallback((o: BookingRow): number => {
    const waiting = computeWaitingMinutes(o);
    const delay = computeDelayMinutes(o);
    const value = Number(o.finalFare ?? 0);
    return waiting * 10 + delay * 6 + Math.min(value / 100, 30);
  }, []);

  const [sortByPriority, setSortByPriority] = useState(false);

  /// The rows actually rendered. Sorting is client-side over the loaded page,
  /// which is what the insight tiles already scope themselves to.
  const visibleOrders = useMemo(() => {
    if (!sortByPriority) return orders;
    return [...orders].sort((a, b) => priorityScore(b) - priorityScore(a));
  }, [orders, sortByPriority, priorityScore]);

  /// Saved filters for the ops team — one click into the two views they live
  /// in. "Unassigned" is SEARCHING; "Delayed" has no status of its own, so it
  /// filters to active orders and turns on priority sort to float the worst to
  /// the top (the list API cannot express "past ETA").
  const applySavedFilter = (which: "delayed" | "unassigned") => {
    setPaymentFilter("");
    setServiceFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(0);
    if (which === "unassigned") {
      setStatusFilter("SEARCHING");
      setSortByPriority(true);
    } else {
      setStatusFilter("IN_PROGRESS");
      setSortByPriority(true);
    }
  };

  const clearFilters = () => {
    setSortByPriority(false);
    setStatusFilter("");
    setPaymentFilter("");
    setServiceFilter("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(0);
  };

  const openAssignDialog = async (order: BookingRow) => {
    setAssignModal(order);
    setDriverSearch("");
    setLoadingDrivers(true);
    try {
      const res = await fetchAvailableDrivers({ limit: 50 });
      const list = (res?.data?.drivers ?? res?.data ?? []) as AssignableDriver[];
      // The endpoint is only filtered by status=approved — no isOnline/isActive
      // params are sent — so the list mixes free, offline, deactivated and
      // mid-trip drivers. Surface the free ones first and label the rest.
      setDrivers(
        Array.isArray(list)
          ? [...list].sort((a, b) => Number(isDriverFree(b)) - Number(isDriverFree(a)))
          : [],
      );
    } finally {
      setLoadingDrivers(false);
    }
  };

  const submitAssign = async (driver: AssignableDriver) => {
    if (!assignModal) return;
    const bookingLabel = assignModal.bookingNumber || assignModal._id.slice(-6).toUpperCase();
    const driverLabel = driver.fullName || driver.mobileNumber || "this driver";
    const concerns = driverConcerns(driver);
    // Assign used to fire on a single click. The backend only checks that the
    // booking is SEARCHING and then overwrites driver.currentBookingId
    // (admin/booking.controller.ts:405-432), so assigning a driver who is already
    // on a trip silently repoints them at the new booking.
    const ok = await dialog.confirm({
      title: `Assign ${driverLabel}?`,
      message: concerns.length
        ? `${driverLabel} is ${concerns.join(" and ")}. Assigning ${bookingLabel} anyway makes this booking the driver's active job — any booking they are already carrying keeps them as its driver but stops being tracked as their current trip. Continue?`
        : `Assign booking ${bookingLabel} to ${driverLabel}?`,
      tone: concerns.length ? "danger" : "warning",
      confirmLabel: "Assign",
      cancelLabel: "Back",
    });
    if (!ok) return;
    setAssigning(true);
    try {
      const res = await assignAdminDriver(assignModal._id, driver._id);
      if (res?.success === false) {
        await dialog.alert({ title: "Assign failed", message: res.message || "Assign failed", tone: "danger" });
      } else {
        setAssignModal(null);
        loadOrders();
      }
    } catch (err: any) {
      await dialog.alert({ title: "Assign failed", message: err?.message || "Assign failed", tone: "danger" });
    } finally {
      setAssigning(false);
    }
  };

  const handleCancel = async (order: BookingRow) => {
    const reason = await dialog.prompt({
      title: `Cancel booking ${order.bookingNumber || order._id}?`,
      // The route now carries requireCommentAndAudit("booking:cancel"), so the
      // reason is server-enforced (min 10 characters), an AuditLog row is
      // written against the acting admin, and the booking records
      // cancelledBy = "ADMIN" rather than "SYSTEM".
      message:
        "Please enter a reason for cancellation (at least 10 characters). It is saved on the booking, sent to the customer and driver apps, and recorded in Audit Logs against your account.",
      placeholder: "e.g. Customer requested cancellation",
      tone: "danger",
      required: true,
      multiline: true,
      confirmLabel: "Cancel booking",
      cancelLabel: "Keep booking",
    });
    if (!reason) return;
    // Match the server's minimum so a short reason is caught here rather than
    // coming back as a bare 400.
    if (reason.trim().length < 10) {
      await dialog.alert({
        title: "Reason too short",
        message: "The cancellation reason must be at least 10 characters.",
        tone: "danger",
      });
      return;
    }
    try {
      const res = await cancelAdminBooking(order._id, { reason });
      if (res?.success === false) {
        await dialog.alert({ title: "Cancel failed", message: res.message || "Cancel failed", tone: "danger" });
      } else {
        loadOrders();
      }
    } catch (err: any) {
      await dialog.alert({ title: "Cancel failed", message: err?.message || "Cancel failed", tone: "danger" });
    }
  };

  const filteredDrivers = drivers.filter((d) =>
    !driverSearch
      ? true
      : `${d.fullName || ""} ${d.mobileNumber || ""} ${d.vehicleNumber || ""}`
          .toLowerCase()
          .includes(driverSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-xs text-gray-500">
            Page {page + 1} of {totalPages} · {total} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadOrders()}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-3 h-3 transition ${showFilters ? "rotate-180" : ""}`} />
          </button>
        </div>
      </div>

      {/* The backend now writes estimatedDropTime at pickup (pickedAt +
          durationMin), so this tile measures something real. It stays scoped to
          the loaded page, like its neighbours. Orders not yet picked up have no
          estimate and are simply not counted, rather than counted as on time. */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Active orders (this page)</p>
          <p className="text-2xl font-bold text-gray-900">{insights.active}</p>
        </div>
        <div className={`bg-white rounded-xl shadow-sm border p-4 ${insights.delayed > 0 ? "border-red-300" : "border-gray-200"}`}>
          <p className="text-xs text-gray-500 mb-1">Delayed orders (this page)</p>
          <p className={`text-2xl font-bold ${insights.delayed > 0 ? "text-red-600" : "text-gray-900"}`}>
            {insights.delayed}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Avg delivery time (this page)</p>
          <p className="text-2xl font-bold text-gray-900">{insights.avgDeliveryMin}m</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Failure rate (this page)</p>
          <p className={`text-2xl font-bold ${insights.failureRate > 10 ? "text-red-600" : "text-gray-900"}`}>
            {insights.failureRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Search booking number or address…"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-movezy-500 focus:outline-none"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as BookingStatus | "");
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All status</option>
              {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => {
                setPaymentFilter(e.target.value as BookingPaymentStatus | "");
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All payments</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="PARTIALLY_REFUNDED">Partially refunded</option>
            </select>
            <select
              value={serviceFilter}
              onChange={(e) => {
                setServiceFilter(e.target.value as "" | "WITHIN_CITY" | "OUTSTATION");
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            >
              <option value="">All services</option>
              <option value="WITHIN_CITY">Within city</option>
              <option value="OUTSTATION">Outstation</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
            />
            {(search || statusFilter || paymentFilter || serviceFilter || dateFrom || dateTo || sortByPriority) && (
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear
              </button>
            )}
          </div>

          {/* Saved filters — the two views ops actually live in, one click. */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
              Saved
            </span>
            <button
              onClick={() => applySavedFilter("unassigned")}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Unassigned orders
            </button>
            <button
              onClick={() => applySavedFilter("delayed")}
              className="px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Delayed orders
            </button>
            <button
              onClick={() => setSortByPriority((v) => !v)}
              title="Rank by minutes waiting, then lateness, then order value"
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${
                sortByPriority
                  ? "bg-movezy-50 border-movezy-300 text-movezy-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Priority sort {sortByPriority ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      )}

      {/* Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        {/* Table */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Pickup → Drop</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Driver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">ETA</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading orders…
                    </td>
                  </tr>
                )}
                {!loading && orders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                      No orders match your filters.
                    </td>
                  </tr>
                )}
                {!loading &&
                  visibleOrders.map((o) => {
                    const isSelected = o._id === selected?._id;
                    const waiting = computeWaitingMinutes(o);
                    const delay = computeDelayMinutes(o);
                    return (
                      <tr
                        key={o._id}
                        onClick={() => setSelectedId(o._id)}
                        className={`cursor-pointer transition ${
                          isSelected ? "bg-movezy-50/60" : "hover:bg-gray-50"
                        }`}
                      >
                        <td className="px-4 py-3 align-top">
                          <div className="font-semibold text-gray-900">
                            {o.bookingNumber || o._id.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">
                            {formatTimeAgo(o.createdAt)}
                          </div>
                          {/* Smart flags — every one derived from a real field,
                              so no flag can appear without something behind it.
                              "Repeat customer issue" is deliberately absent: it
                              would need per-customer complaint history, which no
                              endpoint on this page returns. */}
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {computeWaitingMinutes(o) > FLAG_THRESHOLDS.unassignedMins && (
                              <span
                                title={`Unassigned for ${computeWaitingMinutes(o)} minutes`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700"
                              >
                                UNASSIGNED {computeWaitingMinutes(o)}m
                              </span>
                            )}
                            {computeDelayMinutes(o) > FLAG_THRESHOLDS.delayedMins && (
                              <span
                                title={`Past its estimated drop time by ${computeDelayMinutes(o)} minutes`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700"
                              >
                                DELAYED
                              </span>
                            )}
                            {(o.finalFare ?? 0) >= FLAG_THRESHOLDS.highValueRupees && (
                              <span
                                title={`High value order (₹${o.finalFare})`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800"
                              >
                                ★ HIGH VALUE
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm font-medium text-gray-800 truncate max-w-[140px]">
                            {personName(o.userId) || "—"}
                          </div>
                          <div className="text-[11px] text-gray-400">{personPhone(o.userId) || ""}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-1.5 text-xs text-gray-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{o.pickup?.address || "—"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-700 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            <span className="truncate max-w-[160px]">{o.drop?.address || "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[o.status].pill}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[o.status].dot}`} />
                            {STATUS_LABEL[o.status]}
                          </span>
                          {(waiting > 10 || delay > 10) && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {waiting > 10 && (
                                <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                                  Waiting {waiting}m
                                </span>
                              )}
                              {delay > 10 && (
                                <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                                  Delay {delay}m
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {personName(o.driverId) ? (
                            <div>
                              <div className="text-sm text-gray-800 truncate max-w-[140px]">
                                {personName(o.driverId)}
                              </div>
                              <div className="text-[11px] text-gray-400">{personPhone(o.driverId)}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {(() => {
                            const delay = computeDelayMinutes(o);
                            if (delay > 0) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                                  +{delay}m late
                                </span>
                              );
                            }
                            if (!o.estimatedDropTime) {
                              // No estimate exists until pickup, so say nothing
                              // rather than implying an on-time promise.
                              return <span className="text-xs text-gray-400">—</span>;
                            }
                            const mins = Math.round(
                              (new Date(o.estimatedDropTime).getTime() - Date.now()) / 60000,
                            );
                            return ACTIVE_STATUSES.includes(o.status) ? (
                              <span className="text-xs text-gray-700">
                                {mins > 0 ? `in ${mins}m` : "due now"}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[o.paymentStatus]}`}
                          >
                            {o.paymentStatus}
                          </span>
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            ₹{(o.finalFare ?? 0).toLocaleString()} · {o.paymentMethod || "—"}
                          </div>
                          {cashDue(o) > 0 && (
                            <div
                              className="mt-1 inline-block text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded"
                              title="Fare raised mid-trip; this amount is still to be collected in cash by the driver"
                            >
                              ₹{cashDue(o).toLocaleString()} cash due
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-right">
                          <div
                            className="flex items-center gap-1 justify-end flex-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {o.status === "SEARCHING" && (
                              <button
                                onClick={() => openAssignDialog(o)}
                                className="p-1.5 rounded-md bg-movezy-600 hover:bg-movezy-700 text-white"
                                title="Assign driver"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {personPhone(o.driverId) && (
                              <a
                                href={`tel:${personPhone(o.driverId)}`}
                                className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
                                title="Call driver"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {!["COMPLETED", "CANCELLED"].includes(o.status) && (
                              <button
                                onClick={() => handleCancel(o)}
                                className="p-1.5 rounded-md border border-gray-200 hover:bg-red-50 text-red-600"
                                title="Cancel"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-3 border-t border-gray-100 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Prev
              </button>
              <span className="text-gray-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page + 1 >= totalPages}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-md disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <aside className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {selected ? (
            <OrderDetailPanel
              order={selected}
              onAssign={() => openAssignDialog(selected)}
              onCancel={() => handleCancel(selected)}
              onClose={() => setSelectedId("")}
            />
          ) : (
            <div className="p-10 text-center text-gray-400 text-sm">
              Select an order to see details.
            </div>
          )}
        </aside>
      </div>

      {/* Assign driver modal */}
      {assignModal && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setAssignModal(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-100 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Assign driver</h3>
                <p className="text-xs text-gray-500">
                  Booking {assignModal.bookingNumber || assignModal._id.slice(-6)}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Approved drivers, availability first — offline, deactivated and
                  mid-trip drivers are listed too and are labelled.
                </p>
              </div>
              <button
                onClick={() => setAssignModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  placeholder="Search driver by name, phone, vehicle…"
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-movezy-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingDrivers ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading drivers…
                </div>
              ) : filteredDrivers.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">No drivers found.</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredDrivers.map((d) => (
                    <div
                      key={d._id}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">{d.fullName || "—"}</div>
                        <div className="text-xs text-gray-500">
                          {d.mobileNumber || "—"}
                          {d.vehicleNumber ? ` · ${d.vehicleNumber}` : ""}
                        </div>
                        {/* Availability comes straight off the driver document; nothing
                            here is derived or assumed. Only render a state the payload
                            actually reported. */}
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {d.isOnline === true && (
                            <span className="text-[10px] font-semibold bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                              Online
                            </span>
                          )}
                          {d.isOnline === false && (
                            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              Offline
                            </span>
                          )}
                          {d.isActive === false && (
                            <span className="text-[10px] font-semibold bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                              Deactivated
                            </span>
                          )}
                          {d.currentBookingId && (
                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                              On another booking
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        disabled={assigning}
                        onClick={() => submitAssign(d)}
                        className="px-3 py-1.5 bg-movezy-600 hover:bg-movezy-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60"
                      >
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ───────────────── Detail panel ─────────────────
const OrderDetailPanel: React.FC<{
  order: BookingRow;
  onAssign: () => void;
  onCancel: () => void;
  onClose: () => void;
}> = ({ order, onAssign, onCancel, onClose }) => {
  const status = order.status;
  const customerName = personName(order.userId) || "—";
  const customerPhone = personPhone(order.userId);
  const driverName = personName(order.driverId);
  const driverPhone = personPhone(order.driverId);

  const timeline = [
    { label: "Created", at: order.createdAt, done: true },
    { label: "Assigned", at: order.assignedAt, done: !!order.assignedAt },
    { label: "Driver arrived", at: order.driverArrivedAt, done: !!order.driverArrivedAt },
    { label: "Picked", at: order.pickedAt, done: !!order.pickedAt },
    { label: "Delivered", at: order.completedAt, done: !!order.completedAt },
    order.cancelledAt ? { label: "Cancelled", at: order.cancelledAt, done: true } : null,
  ].filter(Boolean) as { label: string; at?: string; done: boolean }[];

  return (
    <div className="h-full flex flex-col max-h-[calc(100vh-140px)]">
      <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-gray-900 mb-1">
            {order.bookingNumber || order._id.slice(-6).toUpperCase()}
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status].pill}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[status].dot}`} />
              {STATUS_LABEL[status]}
            </span>
            <span className="text-xs text-gray-400">{formatTimeAgo(order.createdAt)}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <section className="p-4 border-b border-gray-100">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Customer
          </h4>
          <p className="font-semibold text-gray-900">{customerName}</p>
          {customerPhone && <p className="text-xs text-gray-500">{customerPhone}</p>}
          {customerPhone && (
            <div className="mt-2 flex gap-2">
              <a
                href={`tel:${customerPhone}`}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-50"
              >
                <Phone className="w-3 h-3" /> Call
              </a>
              <a
                href={`sms:${customerPhone}`}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-50"
              >
                <MessageSquare className="w-3 h-3" /> Message
              </a>
            </div>
          )}
        </section>

        <section className="p-4 border-b border-gray-100">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Driver
          </h4>
          {driverName ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{driverName}</p>
                  {order.rating != null && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {order.rating}
                    </div>
                  )}
                </div>
                {driverPhone && (
                  <a
                    href={`tel:${driverPhone}`}
                    className="p-2 rounded-md border border-gray-200 hover:bg-gray-50 text-gray-700"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
              {order.liveLocation?.lat != null && (
                <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Last seen{" "}
                  {formatTimeAgo(order.liveLocation.updatedAt)}
                </p>
              )}
            </>
          ) : (
            <button
              onClick={onAssign}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-movezy-600 hover:bg-movezy-700 text-white rounded-md text-sm font-semibold"
            >
              <UserPlus className="w-4 h-4" /> Assign driver
            </button>
          )}
        </section>

        <section className="p-4 border-b border-gray-100">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Route
          </h4>
          <div className="relative pl-5 space-y-3">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />
            <div className="relative">
              <span className="absolute -left-5 top-0.5 w-3 h-3 rounded-full bg-green-500 ring-4 ring-green-100" />
              <p className="text-[10px] uppercase text-gray-400 tracking-wider">Pickup</p>
              <p className="text-sm text-gray-800">{order.pickup?.address || "—"}</p>
            </div>
            <div className="relative">
              <span className="absolute -left-5 top-0.5 w-3 h-3 rounded-full bg-red-500 ring-4 ring-red-100" />
              <p className="text-[10px] uppercase text-gray-400 tracking-wider">Dropoff</p>
              <p className="text-sm text-gray-800">{order.drop?.address || "—"}</p>
            </div>
          </div>
          {order.distanceKm != null && (
            <p className="mt-3 text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {order.distanceKm} km
              {order.durationMin != null ? ` · ~${order.durationMin}m` : ""}
            </p>
          )}
        </section>

        <section className="p-4 border-b border-gray-100">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Timeline
          </h4>
          <ol className="relative space-y-3">
            {timeline.map((t) => (
              <li key={t.label} className="flex items-start gap-2.5">
                <span
                  className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                    t.done ? "bg-green-500" : "bg-gray-200"
                  }`}
                >
                  {t.done ? (
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  ) : (
                    <CircleDot className="w-2 h-2 text-gray-400" />
                  )}
                </span>
                <div className="flex-1">
                  <p className={`text-sm ${t.done ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                    {t.label}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {t.at ? formatTimeAgo(t.at) : "Pending"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="p-4 border-b border-gray-100">
          <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Payment
          </h4>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-gray-900">
                ₹{(order.finalFare ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">{order.paymentMethod || "—"}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PAYMENT_COLORS[order.paymentStatus]}`}>
                {order.paymentStatus}
              </span>
              {cashDue(order) > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                  CASH DUE
                </span>
              )}
            </div>
          </div>
          {/* Without this the panel showed a mid-trip fare increase as fully PAID.
              Amounts are the server's own fields — finalFare already includes the
              increase and pendingCashTopUp is the part still uncollected; nothing
              is recomputed here. */}
          {cashDue(order) > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800">
                ₹{cashDue(order).toLocaleString()} still to be collected in cash
              </p>
              <p className="mt-1 text-[11px] text-amber-700">
                The fare was raised mid-trip (stop added). The total above includes the
                increase, but the {order.paymentStatus} status covers only the amount
                already paid — the driver collects the difference in cash and it clears
                when they confirm collection.
              </p>
            </div>
          )}
        </section>

        {order.cancellationReason && (
          <section className="p-4">
            <h4 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Cancellation
            </h4>
            <p className="text-sm text-gray-700">{order.cancellationReason}</p>
          </section>
        )}
      </div>

      <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
        {order.status === "SEARCHING" && (
          <button
            onClick={onAssign}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-movezy-600 hover:bg-movezy-700 text-white rounded-md text-sm font-semibold"
          >
            <UserPlus className="w-4 h-4" /> Assign
          </button>
        )}
        {!["COMPLETED", "CANCELLED"].includes(order.status) && (
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1 px-3 py-2 border border-red-200 bg-red-50 rounded-md text-sm text-red-700 hover:bg-red-100"
          >
            <XCircle className="w-4 h-4" /> Cancel
          </button>
        )}
      </div>
    </div>
  );
};

// Suppress unused-imports lint by referencing the helper (future extension).
void personId;

export default OrderManagement;
