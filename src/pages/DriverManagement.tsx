import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Ban,
  Building2,
  Camera,
  Car,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  IdCard,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCcw,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
  Truck,
  Undo2,
  User,
  Users,
  X,
  XCircle,
  Wallet,
  CalendarDays,
  ArrowRightLeft,
  CircleDot,
  TrendingUp,
  TrendingDown,
  Timer,
} from "lucide-react";
import { driversApi, enhancedDriverApi } from "../services/admin-api";
import { PAGE_SIZE_OPTIONS, type PageSize } from "../hooks/usePagination";

// ==================== TYPES ====================
type DriverStatus =
  | "draft"
  | "documents_uploaded"
  | "vehicle_added"
  | "under_verification"
  | "approved"
  | "rejected"
  | "suspended";

type ApprovalFilter = "all" | "approved" | "document_not_complete" | "blocked";
type AccountFilter = "all" | "active" | "inactive" | "deleted";

interface DriverBankDetails {
  accountHolderName?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
  isVerified?: boolean;
}

interface DriverAddress {
  _id?: string;
  type: "current" | "permanent";
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

interface DriverKYC {
  _id?: string;
  driverId: string;
  aadhaar?: {
    number: string;
    frontImage: string;
    backImage: string;
  };
  pan?: {
    number: string;
    frontImage: string;
    backImage?: string;
  };
  drivingLicense?: {
    number: string;
    frontImage: string;
    backImage: string;
    expiryDate: string;
  };
  selfie?: string;
  vehicleRc?: {
    image: string;
    vehicleNumber: string;
  };
  vehicleImages?: string[];
  city?: string;
  bodyType?: string;
  fuelType?: string;
  isVerified?: boolean;
  verifiedAt?: string;
}

interface DriverVehicle {
  _id: string;
  vehicleTypeId?: {
    _id: string;
    name: string;
    icon?: string;
    maxWeightKg?: number;
  } | null;
  vehicleNumber?: string;
  registrationNumber: string;
  vehicleType?: string;
  vehicleBodyType?: string;
  fuelType?: string;
  city?: string;
  rcFrontImage?: string;
  rcBackImage?: string;
  vehicleImages?: string[];
  assignedDriverName?: string;
  assignedDriverPhone?: string;
  assignedDriverLicenseFrontImage?: string;
  assignedDriverLicenseBackImage?: string;
  onboardingFeePaid?: boolean;
  verificationStatus?: "pending" | "under_verification" | "approved" | "rejected";
  rejectionReason?: string;
  isPrimary?: boolean;
  isOnline: boolean;
  isActive: boolean;
}

interface Driver {
  _id: string;
  fullName: string;
  email?: string;
  mobileNumber: string;
  countryCode: string;
  profilePhoto?: string;
  // Removed: gender / dob / bloodGroup / languages. They exist on the Driver
  // schema but the only writers are PUT /driver/app/profile and
  // POST /driver/personal-info, and neither is called by anything — the driver
  // app has no edit-profile screen and the admin has no driver edit form. They
  // were rendered as permanently blank rows.
  city: string;
  // Removed: state. Driver.state is created as "" and no client ever writes it
  // (only the two dead profile endpoints above accept it).
  status: DriverStatus;
  rejectionReason?: string;
  suspensionReason?: string;
  isActive: boolean;
  isOnline: boolean;
  isDeleted: boolean;
  rating?: number;
  totalRides?: number;
  bankDetails?: DriverBankDetails;
  addresses?: DriverAddress[];
  referralCode?: string;
  onboardingFeePaid?: boolean;
  completedTrips?: number;
  totalEarnings?: number;
  createdAt: string;
  updatedAt: string;
}

interface DriverStats {
  byStatus: { _id: DriverStatus; count: number }[];
  onlineDrivers: number;
  activeDrivers: number;
  inactiveDrivers: number;
  unassignedOrders?: number;
}

interface PendingAssignment {
  _id: string;
  bookingNumber?: string;
  pickupAddress?: string;
  customerName?: string;
  waitingSince?: string;
}

interface ToastState {
  type: "success" | "error" | "warning";
  message: string;
}

type TabType = "overview" | "documents" | "vehicle" | "bank" | "bookings";

// ==================== HELPERS ====================
const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const maskNumber = (number: string, visibleDigits = 4) => {
  if (!number) return "-";
  const masked = number.slice(0, -visibleDigits).replace(/./g, "•");
  return masked + number.slice(-visibleDigits);
};

type DocState = "uploaded" | "expiring" | "expired" | "missing";

/**
 * Document status derived from the driver's real KYC record.
 *
 * This used to come from GET /admin/drivers/:id/enhanced, but that helper only
 * builds entries for documents that carry an expiryDate — and the only KYC path
 * with one is drivingLicense. So the panel either showed a single Driving
 * License chip, or fell back to a hard-coded list that labelled Aadhaar/PAN/RC
 * "missing" even when the driver had uploaded them. Presence is read straight
 * off the KYC images instead; only the licence has an expiry to grade against.
 *
 * "uploaded" means the image is on file — not that an admin has approved it.
 */
const buildDocumentStatus = (
  kyc: DriverKYC | null,
): { type: string; status: DocState; expiresAt?: string }[] => {
  const presence = (url?: string): DocState => (url ? "uploaded" : "missing");

  const dl = kyc?.drivingLicense;
  let dlStatus: DocState = presence(dl?.frontImage);
  if (dlStatus === "uploaded" && dl?.expiryDate) {
    const expiry = new Date(dl.expiryDate).getTime();
    if (!Number.isNaN(expiry)) {
      const daysLeft = (expiry - Date.now()) / 86400000;
      if (daysLeft < 0) dlStatus = "expired";
      else if (daysLeft <= 30) dlStatus = "expiring";
    }
  }

  return [
    {
      type: "Driving License",
      status: dlStatus,
      expiresAt: dl?.expiryDate,
    },
    { type: "Aadhaar Card", status: presence(kyc?.aadhaar?.frontImage) },
    { type: "PAN Card", status: presence(kyc?.pan?.frontImage) },
    { type: "Vehicle RC", status: presence(kyc?.vehicleRc?.image) },
    { type: "Selfie", status: presence(kyc?.selfie) },
  ];
};

// ==================== STATUS CONFIG ====================
// @ts-expect-error statusConfig kept for future use
const _statusConfig: Record<
  DriverStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  draft: {
    label: "Draft",
    color: "text-gray-600",
    bgColor: "bg-gray-100",
    icon: FileText,
  },
  documents_uploaded: {
    label: "Docs Uploaded",
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    icon: FileCheck,
  },
  vehicle_added: {
    label: "Vehicle Added",
    color: "text-indigo-600",
    bgColor: "bg-indigo-100",
    icon: Car,
  },
  under_verification: {
    label: "Under Review",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle,
  },
  rejected: {
    label: "Rejected",
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: XCircle,
  },
  suspended: {
    label: "Suspended",
    color: "text-orange-600",
    bgColor: "bg-orange-100",
    icon: Ban,
  },
};

const approvalConfig = {
  approved: {
    label: "Approved",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: CheckCircle,
  },
  document_not_complete: {
    label: "Document Not Complete",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
    icon: FileText,
  },
  blocked: {
    label: "Blocked",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: Ban,
  },
} as const;

const accountStatusConfig = {
  active: {
    label: "Active",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  inactive: {
    label: "Inactive",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
} as const;

const getApprovalState = (driver: Driver) => {
  if (driver.status === "approved") return "approved" as const;
  if (driver.status === "suspended") return "blocked" as const;
  return "document_not_complete" as const;
};

const isVerificationPending = (status: DriverStatus) =>
  ["draft", "documents_uploaded", "vehicle_added", "under_verification"].includes(
    status,
  );

// ==================== COMPONENT ====================
const DriverManagement: React.FC = () => {
  // State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [limit, setLimit] = useState<PageSize>(10);
  const [search, setSearch] = useState("");
  // Deep-linkable (?status=document_not_complete) so dashboard stats can land
  // on the filtered list instead of dying at the unfiltered page.
  const [urlParams] = useSearchParams();
  const urlApproval = urlParams.get("status") as ApprovalFilter | null;
  const [statusFilter, setStatusFilter] = useState<ApprovalFilter>(
    urlApproval && ["all", "approved", "document_not_complete", "blocked"].includes(urlApproval)
      ? urlApproval
      : "all",
  );
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [onlineFilter, setOnlineFilter] = useState<
    "all" | "online" | "offline"
  >("all");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");

  // Modal states
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverKYC, setDriverKYC] = useState<DriverKYC | null>(null);
  const [driverVehicles, setDriverVehicles] = useState<DriverVehicle[]>([]);
  // Real booking history for the driver-detail Bookings tab.
  const [driverBookings, setDriverBookings] = useState<any[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Manual-assign modal: pick a SEARCHING booking to assign to a chosen driver.
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignDriver, setAssignDriver] = useState<Driver | null>(null);
  const [pendingBookings, setPendingBookings] = useState<PendingAssignment[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Enhanced driver data.
  // Removed: reassignmentCount (Booking.reassignedFrom is not a schema path and
  // nothing ever writes it, so the count was always 0), appVersion /
  // batteryLevel / lastSeenAt (Driver.deviceInfo is never written — the driver
  // app has no device_info_plus / battery_plus dependency and reports only
  // lat/lng over the socket), documentStatus (the /enhanced helper only reads
  // expiry dates, so it could never describe Aadhaar/PAN/RC — the panel now
  // derives from the real KYC record), and acceptanceRate / lateDeliveryRate
  // (never assigned, never rendered).
  const [enhancedData, setEnhancedData] = useState<{
    codBalance: number;
    weeklyEarnings: number;
    weeklyBreakdown: { day: string; amount: number }[];
    completionRate?: number;
    cancellationRate?: number;
    avgRating30d?: number;
    totalTrips30d?: number;
    daysSinceLastTrip?: number;
  } | null>(null);

  // Driver intelligence thresholds
  const COD_FLOAT_THRESHOLD = 5000;

  // Show toast
  const showToast = useCallback((payload: ToastState) => {
    setToast(payload);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await driversApi.getStats();
      setStats(response.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  }, []);

  // Load drivers
  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await driversApi.getAll({
        search: search || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        isActive:
          accountFilter === "all" || accountFilter === "deleted"
            ? undefined
            : accountFilter === "active",
        // Surfaces soft-deleted drivers so Restore is reachable.
        deleted: accountFilter === "deleted" ? true : undefined,
        isOnline:
          onlineFilter === "all" ? undefined : onlineFilter === "online",
        page,
        limit,
      });
      setDrivers(response.data.drivers);
      setPagination({
        total: response.data.total,
        totalPages: response.data.totalPages,
      });
    } catch (err) {
      console.error("Failed to load drivers", err);
      showToast({ type: "error", message: "Failed to load drivers" });
    } finally {
      setLoading(false);
    }
  }, [
    search,
    statusFilter,
    accountFilter,
    onlineFilter,
    page,
    limit,
    showToast,
  ]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Open one driver's detail straight from a URL (?driverId=...). Driver
  // detail is a drawer inside this page, so before this nothing — dashboard
  // included — could link to "detailed driver information"; the best any link
  // could do was drop the admin on the unfiltered list.
  const deepLinkedDriverId = urlParams.get("driverId");
  const deepLinkHandled = React.useRef<string | null>(null);
  useEffect(() => {
    if (!deepLinkedDriverId) return;
    if (deepLinkHandled.current === deepLinkedDriverId) return;
    const match = drivers.find((d) => d._id === deepLinkedDriverId);
    if (match) {
      deepLinkHandled.current = deepLinkedDriverId;
      openDriverDetail(match);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepLinkedDriverId, drivers]);

  // Get driver details
  const openDriverDetail = async (driver: Driver) => {
    setSelectedDriver(driver);
    setActiveTab("overview");
    setDetailModalOpen(true);
    setEnhancedData(null);
    setDriverBookings([]);

    // Load the driver's real booking history (for the Bookings tab), and
    // derive days-since-last-trip from it — no endpoint returns that directly.
    setBookingsLoading(true);
    driversApi
      .getBookings(driver._id, { limit: 20 })
      .then((res: any) => {
        const bookings = res?.data?.bookings || [];
        setDriverBookings(bookings);
        const lastCompleted = bookings.find(
          (b: any) => b.status === "COMPLETED" && (b.completedAt || b.createdAt),
        );
        if (lastCompleted) {
          const at = new Date(lastCompleted.completedAt || lastCompleted.createdAt).getTime();
          const days = Math.max(0, Math.floor((Date.now() - at) / 86400000));
          setEnhancedData((prev: any) => ({ ...(prev || {}), daysSinceLastTrip: days }));
        }
      })
      .catch(() => setDriverBookings([]))
      .finally(() => setBookingsLoading(false));

    try {
      // One call to /enhanced carries everything the panels show. The old code
      // hit four separate endpoints and read keys none of them returned, so
      // every figure rendered 0 or "—" for every driver.
      const [docResponse, vehicleResponse, enhancedResponse] = await Promise.all([
        driversApi
          .getDocuments(driver._id)
          .catch(() => ({ data: { documents: null } })),
        driversApi
          .getVehicles(driver._id)
          .catch(() => ({ data: { vehicles: [] } })),
        enhancedDriverApi
          .getEnhancedDetails(driver._id)
          .catch(() => ({ data: null })),
      ]);
      setDriverKYC(docResponse.data?.documents || null);
      setDriverVehicles(vehicleResponse.data?.vehicles || []);

      const enh = (enhancedResponse as any)?.data;
      if (enh) {
        const weekly = enh.weeklyEarnings || []; // [0] = most recent week
        const perf = enh.performanceMetrics || {};
        const totalTrips30 = Number(perf.totalTrips || 0);
        const cancelled30 = Number(perf.cancelledTrips || 0);
        setEnhancedData((prev: any) => ({
          ...(prev || {}),
          codBalance: Number(enh.codBalance?.floatingCash || 0),
          weeklyEarnings: Number(weekly[0]?.totalEarnings || 0),
          weeklyBreakdown: weekly
            .slice()
            .reverse() // oldest → newest, so the chart reads left to right
            .map((w: any) => ({
              day: new Date(w.weekStart).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
              }),
              amount: Number(w.totalEarnings || 0),
            })),
          completionRate: Number(perf.completionRate || 0),
          cancellationRate:
            totalTrips30 > 0 ? (cancelled30 / totalTrips30) * 100 : 0,
          avgRating30d: Number(perf.avgRating || 0),
          totalTrips30d: totalTrips30,
        }));
      }
    } catch (err) {
      console.error("Failed to load driver details", err);
    }
  };

  // Open verify modal
  const openVerifyModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setRejectionReason("");
    setVerifyModalOpen(true);
  };

  // Verify driver
  const handleVerify = async (action: "approve" | "reject") => {
    if (!selectedDriver) return;
    if (action === "reject" && !rejectionReason.trim()) {
      showToast({ type: "error", message: "Please provide rejection reason" });
      return;
    }

    setActionLoading(true);
    try {
      await driversApi.verify(selectedDriver._id, {
        action,
        rejectionReason: action === "reject" ? rejectionReason : undefined,
      });
      showToast({
        type: "success",
        message: `Driver ${action === "approve" ? "approved" : "rejected"} successfully`,
      });
      setVerifyModalOpen(false);
      loadDrivers();
      fetchStats();
    } catch (err: any) {
      showToast({ type: "error", message: err.message || "Action failed" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open suspend modal
  const openSuspendModal = (driver: Driver) => {
    setSelectedDriver(driver);
    setSuspensionReason("");
    setSuspendModalOpen(true);
  };

  // Suspend driver
  const handleSuspend = async () => {
    if (!selectedDriver || !suspensionReason.trim()) {
      showToast({ type: "error", message: "Please provide suspension reason" });
      return;
    }

    setActionLoading(true);
    try {
      await driversApi.updateStatus(selectedDriver._id, {
        status: "suspended",
        isActive: false,
        reason: suspensionReason,
      });
      showToast({ type: "success", message: "Driver blocked successfully" });
      setSuspendModalOpen(false);
      loadDrivers();
      fetchStats();
    } catch (err: any) {
      showToast({ type: "error", message: err.message || "Suspension failed" });
    } finally {
      setActionLoading(false);
    }
  };

  // Reactivate driver
  const handleReactivate = async (driver: Driver) => {
    setActionLoading(true);
    try {
      await driversApi.updateStatus(driver._id, {
        status: "approved",
        isActive: true,
      });
      showToast({
        type: "success",
        message: "Driver activated successfully",
      });
      loadDrivers();
      fetchStats();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "Reactivation failed",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccountStatusChange = async (
    driver: Driver,
    isActive: boolean,
  ) => {
    setActionLoading(true);
    try {
      await driversApi.updateStatus(driver._id, { isActive });
      showToast({
        type: "success",
        message: `Driver marked as ${isActive ? "active" : "inactive"}`,
      });
      loadDrivers();
      fetchStats();
    } catch (err: any) {
      showToast({
        type: "error",
        message: err.message || "Status update failed",
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete driver
  const handleDelete = async () => {
    if (!selectedDriver) return;

    setActionLoading(true);
    try {
      await driversApi.delete(selectedDriver._id);
      showToast({ type: "success", message: "Driver deleted successfully" });
      setDeleteModalOpen(false);
      loadDrivers();
      fetchStats();
    } catch (err: any) {
      showToast({ type: "error", message: err.message || "Delete failed" });
    } finally {
      setActionLoading(false);
    }
  };

  // Restore driver
  const handleRestore = async (driver: Driver) => {
    setActionLoading(true);
    try {
      await driversApi.restore(driver._id);
      showToast({ type: "success", message: "Driver restored successfully" });
      loadDrivers();
      fetchStats();
    } catch (err: any) {
      showToast({ type: "error", message: err.message || "Restore failed" });
    } finally {
      setActionLoading(false);
    }
  };

  // Get stat count
  const getStatCount = (status: DriverStatus) => {
    return stats?.byStatus.find((s) => s._id === status)?.count || 0;
  };

  const totalDrivers =
    stats?.byStatus.reduce((sum, s) => sum + s.count, 0) || 0;
  const documentNotCompleteCount =
    getStatCount("draft") +
    getStatCount("documents_uploaded") +
    getStatCount("vehicle_added") +
    getStatCount("under_verification") +
    getStatCount("rejected");

  // Derived live counters for the status strip & smart panels
  const onlineCount = stats?.onlineDrivers || 0;
  const activeApprovedCount = Math.max(
    onlineCount - 0,
    drivers.filter((d) => d.status === "approved" && d.isOnline && d.isActive)
      .length,
  );
  const busyCount = drivers.filter(
    (d) => d.isOnline && (d.completedTrips || 0) > 0 && (d.rating || 0) > 0,
  ).length;
  const offlineCount = Math.max(
    0,
    (stats?.activeDrivers || 0) - onlineCount,
  );
  const underperformingCount = drivers.filter(
    (d) => (d.rating || 0) > 0 && (d.rating || 0) < 3.5,
  ).length;

  // Idle drivers = online but not yet handling trips (proxy heuristic)
  const idleDrivers = drivers.filter(
    (d) => d.isOnline && d.status === "approved" && (d.completedTrips || 0) === 0,
  );
  // Available drivers for assignment
  const availableDrivers = drivers.filter(
    (d) => d.isOnline && d.status === "approved" && d.isActive,
  );

  // Real unassigned orders count (SEARCHING bookings) from /admin/drivers/stats.
  const unassignedOrdersCount = stats?.unassignedOrders ?? 0;
  const assignmentGap = unassignedOrdersCount - availableDrivers.length;

  // Top/low performers from loaded page (sorted by rating)
  const performers = [...drivers]
    .filter((d) => (d.rating || 0) > 0)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const topPerformers = performers.slice(0, 3);
  const lowPerformers = performers.slice(-3).reverse();

  // Smart suggestion: if there's an online/idle driver and unassigned orders, surface it
  const smartSuggestion =
    idleDrivers.length > 0 && unassignedOrdersCount > 0
      ? {
          driver: idleDrivers[0],
          pendingOrders: Math.min(unassignedOrdersCount, 3),
        }
      : null;

  const [autoAssigning, setAutoAssigning] = useState(false);

  // Auto-assign the nearest available driver to every SEARCHING booking.
  const handleAutoAssign = async () => {
    if (autoAssigning) return;
    setAutoAssigning(true);
    try {
      const res = await driversApi.autoAssign();
      const assigned = res?.data?.assigned ?? 0;
      const evaluated = res?.data?.evaluated ?? 0;
      showToast({
        type: assigned > 0 ? "success" : "warning",
        message:
          evaluated === 0
            ? "No unassigned orders to auto-assign right now."
            : assigned > 0
              ? `Auto-assigned ${assigned} of ${evaluated} order(s) to the nearest available drivers.`
              : `No available online drivers found for ${evaluated} searching order(s).`,
      });
      fetchStats();
      loadDrivers();
    } catch (e: any) {
      showToast({ type: "error", message: e?.message || "Auto-assign failed" });
    } finally {
      setAutoAssigning(false);
    }
  };

  // "Rebalance" uses the same nearest-driver pass over all searching orders.
  const handleRebalance = () => handleAutoAssign();

  // Manual assign: open the picker for a specific driver and load pending orders.
  const openAssignModal = useCallback(
    async (driver: Driver) => {
      setAssignDriver(driver);
      setAssignModalOpen(true);
      setPendingLoading(true);
      try {
        const res = await driversApi.getPendingAssignments();
        setPendingBookings(res?.data?.pendingAssignments || []);
      } catch (err) {
        console.error("Failed to load pending orders", err);
        setPendingBookings([]);
      } finally {
        setPendingLoading(false);
      }
    },
    [],
  );

  const handleAssignToBooking = useCallback(
    async (bookingId: string) => {
      if (!assignDriver) return;
      setAssigningId(bookingId);
      try {
        const res = await driversApi.assignToBooking(bookingId, assignDriver._id);
        if (res?.success) {
          showToast({
            type: "success",
            message: `Assigned ${assignDriver.fullName} to the order.`,
          });
          setAssignModalOpen(false);
          setAssignDriver(null);
          setPendingBookings([]);
          fetchStats();
          loadDrivers();
        } else {
          showToast({
            type: "error",
            message: res?.message || "Failed to assign driver.",
          });
        }
      } catch (err) {
        showToast({
          type: "error",
          message:
            err instanceof Error ? err.message : "Failed to assign driver.",
        });
      } finally {
        setAssigningId(null);
      }
    },
    [assignDriver, showToast, fetchStats, loadDrivers],
  );

  // Vehicles awaiting approval across ALL drivers. The driver-level pending
  // count misses an approved driver's added vehicle entirely — this queue is
  // how those get seen.
  const [pendingVehicles, setPendingVehicles] = useState<any[]>([]);
  const [pendingVehiclesOpen, setPendingVehiclesOpen] = useState(false);
  const loadPendingVehicles = useCallback(async () => {
    try {
      const res = await driversApi.getPendingVehicles();
      setPendingVehicles(res.data?.vehicles || []);
    } catch {
      setPendingVehicles([]);
    }
  }, []);
  useEffect(() => { loadPendingVehicles(); }, [loadPendingVehicles]);

  // Approve/reject straight from the queue — no need to open the driver.
  const handleQueueVerify = useCallback(
    async (driverId: string, vehicleId: string, action: "approve" | "reject") => {
      let rejectionReason: string | undefined;
      if (action === "reject") {
        rejectionReason = window.prompt("Reason for rejecting this vehicle:")?.trim() || undefined;
        if (!rejectionReason) {
          showToast({ type: "error", message: "Rejection reason is required" });
          return;
        }
      }
      try {
        await driversApi.verifyVehicle(driverId, vehicleId, { action, rejectionReason });
        showToast({
          type: "success",
          message: action === "approve" ? "Vehicle approved" : "Vehicle rejected",
        });
        loadPendingVehicles();
      } catch (err: any) {
        showToast({ type: "error", message: err.message || "Action failed" });
      }
    },
    [showToast, loadPendingVehicles],
  );

  // Per-vehicle approve/reject. Refreshes just the vehicle list on success —
  // the rest of the drawer's data is untouched by this action.
  const handleVerifyVehicle = useCallback(
    async (vehicleId: string, action: "approve" | "reject") => {
      if (!selectedDriver) return;
      let rejectionReason: string | undefined;
      if (action === "reject") {
        rejectionReason =
          window.prompt("Reason for rejecting this vehicle:")?.trim() ||
          undefined;
        if (!rejectionReason) {
          showToast({ type: "error", message: "Rejection reason is required" });
          return;
        }
      }
      try {
        await driversApi.verifyVehicle(selectedDriver._id, vehicleId, {
          action,
          rejectionReason,
        });
        showToast({
          type: "success",
          message: action === "approve" ? "Vehicle approved" : "Vehicle rejected",
        });
        const res = await driversApi
          .getVehicles(selectedDriver._id)
          .catch(() => ({ data: { vehicles: [] } }));
        setDriverVehicles(res.data?.vehicles || []);
      } catch (err: any) {
        showToast({ type: "error", message: err.message || "Action failed" });
      }
    },
    [selectedDriver, showToast],
  );


  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
            toast.type === "success"
              ? "bg-green-50 text-green-800 border border-green-200"
              : toast.type === "warning"
                ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
                : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : toast.type === "warning" ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Vehicles awaiting approval — across all drivers */}
      {pendingVehicles.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl">
          <button
            onClick={() => setPendingVehiclesOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-sm font-semibold text-amber-800">
              {pendingVehicles.length} vehicle{pendingVehicles.length === 1 ? "" : "s"} awaiting approval
            </span>
            <span className="text-xs font-medium text-amber-700">
              {pendingVehiclesOpen ? "Hide" : "Review"}
            </span>
          </button>
          {pendingVehiclesOpen && (
            <div className="px-4 pb-3 space-y-2">
              {pendingVehicles.map((v: any) => (
                <div key={v._id} className="flex flex-wrap items-center gap-3 bg-white rounded-lg px-3 py-2.5">
                  <div className="flex-1 min-w-[180px]">
                    <p className="text-sm font-medium text-gray-900 font-mono">{v.vehicleNumber}</p>
                    <p className="text-xs text-gray-500">
                      {v.driverId?.fullName || "Unknown driver"}
                      {v.driverId?.mobileNumber ? ` · ${v.driverId.mobileNumber}` : ""}
                      {v.driverId?.status === "approved" ? " · driver approved" : ""}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    v.onboardingFeePaid ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  }`}>
                    {v.onboardingFeePaid ? "Fee paid" : "Fee pending"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                    {(v.verificationStatus || "pending").replace("_", " ")}
                  </span>
                  <div className="whitespace-nowrap">
                    <button
                      onClick={() => handleQueueVerify(v.driverId?._id || v.driverId, v._id, "approve")}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleQueueVerify(v.driverId?._id || v.driverId, v._id, "reject")}
                      className="ml-2 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Driver Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage approval, account status, and online availability
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              loadDrivers();
              fetchStats();
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm"
          >
            <RefreshCcw className="w-4 h-4" />
            <span className="text-sm font-medium">Refresh</span>
          </button>
          <button
            onClick={() => {
              // CSV of the currently loaded page — honest scope, no fake
              // full-fleet export (no such endpoint exists).
              if (!drivers.length) return;
              const esc = (v: unknown) =>
                `"${String(v ?? "").replace(/"/g, '""')}"`;
              // No City column: the list endpoint returns Driver.city, which is
              // never written, so it exported as blank for every row.
              const header = [
                "Name",
                "Phone",
                "Email",
                "Status",
                "Online",
                "Trips",
                "Rating",
                "Joined",
              ].join(",");
              const rows = drivers.map((d: any) =>
                [
                  esc(d.fullName),
                  esc(`${d.countryCode || ""} ${d.mobileNumber || ""}`.trim()),
                  esc(d.email),
                  esc(d.status),
                  esc(d.isOnline ? "online" : "offline"),
                  esc(d.completedTrips ?? 0),
                  esc(d.rating ?? 0),
                  esc(d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : ""),
                ].join(","),
              );
              const blob = new Blob([[header, ...rows].join("\n")], {
                type: "text/csv;charset=utf-8",
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `drivers-page-${page + 1}.csv`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm"
            title="Download the current page as CSV"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export page</span>
          </button>
        </div>
      </div>

      {/* Driver Status Strip (Real-time) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Total Drivers
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {totalDrivers}
              </p>
              <p className="text-xs text-gray-400 mt-1">Across all regions</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active
              </p>
              <p className="text-3xl font-bold text-green-600 mt-1">
                {activeApprovedCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">Online & available</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-yellow-500 rounded-full" />
                Busy
              </p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {busyCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">On active trips</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Truck className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-gray-400">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full" />
                Offline
              </p>
              <p className="text-3xl font-bold text-gray-700 mt-1">
                {offlineCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">Not available now</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 !border-l-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600 flex items-center gap-1.5">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Underperforming
              </p>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {underperformingCount}
              </p>
              <p className="text-xs text-red-400 mt-1">Rating &lt; 3.5</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Unassigned vs Available */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-orange-500" />
                Unassigned vs Available
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Match pending orders with free drivers
              </p>
            </div>
            {assignmentGap > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
                Shortage: {assignmentGap}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                Balanced
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-red-50 rounded-xl p-3 border border-red-100">
              <p className="text-[11px] uppercase text-red-600 font-semibold">
                Unassigned Orders
              </p>
              <p className="text-2xl font-bold text-red-700 mt-0.5">
                {unassignedOrdersCount}
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 border border-green-100">
              <p className="text-[11px] uppercase text-green-600 font-semibold">
                Available Drivers
              </p>
              <p className="text-2xl font-bold text-green-700 mt-0.5">
                {availableDrivers.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleAutoAssign}
            disabled={unassignedOrdersCount === 0 || availableDrivers.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 text-white font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <CircleDot className="w-4 h-4" />
            Auto Assign Now
          </button>
        </div>

        {/* Idle drivers */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-500" />
                Idle Drivers Alert
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Online but no active assignments
              </p>
            </div>
            {idleDrivers.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 text-xs font-semibold">
                {idleDrivers.length} idle
              </span>
            )}
          </div>
          <div className="space-y-1.5 mb-4 max-h-24 overflow-y-auto">
            {idleDrivers.slice(0, 3).map((d) => (
              <div
                key={d._id}
                className="flex items-center justify-between text-xs px-3 py-1.5 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full" />
                  <span className="font-medium text-gray-700">
                    {d.fullName}
                  </span>
                </div>
                <span className="text-gray-500">{d.city || "—"}</span>
              </div>
            ))}
            {idleDrivers.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                No idle drivers right now.
              </p>
            )}
          </div>
          <button
            onClick={handleRebalance}
            disabled={idleDrivers.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-yellow-500 text-white font-semibold hover:bg-yellow-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Push Orders / Rebalance
          </button>
        </div>
      </div>

      {/* Smart suggestion */}
      {smartSuggestion && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Award className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-900">
                Smart Suggestion
              </p>
              <p className="text-sm text-gray-700">
                <span className="font-semibold">
                  {smartSuggestion.driver.fullName}
                </span>{" "}
                is idle and available for{" "}
                <span className="font-semibold">
                  {smartSuggestion.pendingOrders} pending order
                  {smartSuggestion.pendingOrders === 1 ? "" : "s"}
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => openAssignModal(smartSuggestion.driver)}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            Assign Now
          </button>
        </div>
      )}

      {/* Secondary stats row (approval / document / online) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("approved")}
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Approved</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {getStatCount("approved")}
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-green-500" />
          </div>
        </div>
        <div
          onClick={() => setStatusFilter("document_not_complete")}
          className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 cursor-pointer hover:shadow-md transition"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Docs Pending</p>
              <p className="text-xl font-bold text-yellow-600 mt-1">
                {documentNotCompleteCount}
              </p>
            </div>
            <FileText className="w-5 h-5 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Inactive</p>
              <p className="text-xl font-bold text-orange-600 mt-1">
                {stats?.inactiveDrivers || 0}
              </p>
            </div>
            <Clock className="w-5 h-5 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase">Online Now</p>
              <p className="text-xl font-bold text-red-600 mt-1">
                {stats?.onlineDrivers || 0}
              </p>
            </div>
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      {/* Performance Panel */}
      {(topPerformers.length > 0 || lowPerformers.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <Award className="w-4 h-4 text-green-600" />
                Top Performers
              </p>
              <span className="text-xs text-gray-500">This week</span>
            </div>
            <div className="space-y-2">
              {topPerformers.map((d) => (
                <button
                  key={d._id}
                  onClick={() => openDriverDetail(d)}
                  className="w-full flex items-center justify-between text-sm px-3 py-2 bg-green-50 border border-green-100 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {d.profilePhoto ? (
                      <img
                        src={d.profilePhoto}
                        alt={d.fullName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-green-200 flex items-center justify-center text-green-800 font-semibold text-xs">
                        {d.fullName?.charAt(0) || "D"}
                      </div>
                    )}
                    <span className="font-medium text-gray-800">
                      {d.fullName}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-green-700 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-green-600 text-green-600" />
                    {(d.rating || 0).toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Needs Attention
              </p>
              <span className="text-xs text-red-500 font-medium">
                Low performers
              </span>
            </div>
            <div className="space-y-2">
              {lowPerformers.map((d) => (
                <button
                  key={d._id}
                  onClick={() => openDriverDetail(d)}
                  className="w-full flex items-center justify-between text-sm px-3 py-2 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    {d.profilePhoto ? (
                      <img
                        src={d.profilePhoto}
                        alt={d.fullName}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-red-200 flex items-center justify-center text-red-800 font-semibold text-xs">
                        {d.fullName?.charAt(0) || "D"}
                      </div>
                    )}
                    <span className="font-medium text-gray-800">
                      {d.fullName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-red-700 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-red-600 text-red-600" />
                      {(d.rating || 0).toFixed(1)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                      Attention
                    </span>
                  </div>
                </button>
              ))}
              {lowPerformers.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  No underperformers — great work!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as ApprovalFilter);
                setPage(0);
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white"
            >
              <option value="all">All Approvals</option>
              <option value="approved">Approved</option>
              <option value="document_not_complete">
                Document Not Complete
              </option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={accountFilter}
              onChange={(e) => {
                setAccountFilter(e.target.value as AccountFilter);
                setPage(0);
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white"
            >
              <option value="all">All Account Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="deleted">Deleted (restorable)</option>
            </select>
          </div>

          {/* Online Filter */}
          <select
            value={onlineFilter}
            onChange={(e) => {
              setOnlineFilter(e.target.value as "all" | "online" | "offline");
              setPage(0);
            }}
            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white"
          >
            <option value="all">All Drivers</option>
            <option value="online">Online Only</option>
            <option value="offline">Offline Only</option>
          </select>

          {/* View Mode Toggle */}
          <div className="inline-flex items-center bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode("card")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === "card"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Table View
            </button>
          </div>
        </div>
      </div>

      {/* Drivers Grid / Table */}
      {viewMode === "card" && !loading && drivers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {drivers.map((driver) => {
            const approvalState = getApprovalState(driver);
            const approvalInfo = approvalConfig[approvalState];
            const liveDot = driver.isOnline
              ? (driver.completedTrips || 0) > 0
                ? "bg-yellow-500"
                : "bg-green-500"
              : "bg-gray-400";
            const liveLabel = driver.isOnline
              ? (driver.completedTrips || 0) > 0
                ? "Busy"
                : "Online"
              : "Offline";
            return (
              <div
                key={driver._id}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  {driver.profilePhoto ? (
                    <img
                      src={driver.profilePhoto}
                      alt={driver.fullName}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-600 font-bold text-lg">
                        {driver.fullName?.charAt(0) || "D"}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {driver.fullName || "No Name"}
                      </p>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          driver.isOnline
                            ? (driver.completedTrips || 0) > 0
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${liveDot}`} />
                        {liveLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {driver.countryCode} {driver.mobileNumber}
                    </p>
                    {/* Removed: the "city, state" line. Both live on the Driver
                        document, which is created with empty strings and is
                        never updated by any client, so this always rendered
                        "—, —". The city the driver actually picks during the RC
                        step lands on DriverKyc/Vehicle, which the list endpoint
                        does not join — it is shown in the detail modal. */}
                  </div>
                </div>

                {/* Performance row */}
                <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                  <div className="bg-gray-50 rounded-lg py-2">
                    <p className="text-[10px] uppercase text-gray-500">Trips</p>
                    <p className="text-sm font-bold text-gray-800">
                      {driver.completedTrips || 0}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg py-2">
                    <p className="text-[10px] uppercase text-yellow-600">
                      Rating
                    </p>
                    <p className="text-sm font-bold text-yellow-700">
                      {(driver.rating || 0).toFixed(1)}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg py-2 ${approvalInfo.bgColor}`}
                  >
                    <p
                      className={`text-[10px] uppercase ${approvalInfo.color}`}
                    >
                      Status
                    </p>
                    <p
                      className={`text-[11px] font-bold truncate px-1 ${approvalInfo.color}`}
                    >
                      {approvalInfo.label}
                    </p>
                  </div>
                </div>

                {/* Inline actions */}
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => openDriverDetail(driver)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Details
                  </button>
                  {driver.status === "approved" && driver.isActive && (
                    <button
                      onClick={() => openAssignModal(driver)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors"
                    >
                      <CircleDot className="w-3.5 h-3.5" />
                      Assign
                    </button>
                  )}
                  <a
                    href={`tel:${driver.countryCode}${driver.mobileNumber}`}
                    className="p-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                    title="Call"
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </a>
                  {driver.status === "approved" ? (
                    <button
                      onClick={() => openSuspendModal(driver)}
                      className="p-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                      title="Block"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    isVerificationPending(driver.status) && (
                      <button
                        onClick={() => openVerifyModal(driver)}
                        className="p-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                        title="Verify"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drivers Table */}
      <div
        className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${
          viewMode === "card" && !loading && drivers.length > 0 ? "hidden" : ""
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
          </div>
        ) : drivers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Users className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No drivers found</p>
            <p className="text-sm">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Driver
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Contact
                  </th>
                  {/* Removed: the "Location" column — see the card view above;
                      Driver.city / Driver.state are never written, so every row
                      read "-, -". */}
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                    Trips
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                    Rating
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Approval
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                    Online
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((driver) => {
                  const approvalState = getApprovalState(driver);
                  const approvalInfo = approvalConfig[approvalState];
                  const ApprovalIcon = approvalInfo.icon;
                  const accountInfo =
                    accountStatusConfig[
                      driver.isActive ? "active" : "inactive"
                    ];

                  return (
                    <tr
                      key={driver._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      {/* Driver Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {driver.profilePhoto ? (
                            <img
                              src={driver.profilePhoto}
                              alt={driver.fullName}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                              <span className="text-orange-600 font-semibold">
                                {driver.fullName?.charAt(0) || "D"}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">
                              {driver.fullName || "No Name"}
                            </p>
                            <p className="text-xs text-gray-500">
                              Joined {formatDate(driver.createdAt)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-sm text-gray-700">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            {driver.countryCode} {driver.mobileNumber}
                          </div>
                          {driver.email && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              {driver.email}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Trips */}
                      <td className="px-6 py-4 text-center">
                        <span className="font-medium text-gray-900">
                          {driver.completedTrips || 0}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-lg">
                          <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium text-yellow-700">
                            {driver.rating?.toFixed(1) || "0.0"}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${approvalInfo.bgColor}`}
                        >
                          <ApprovalIcon
                            className={`w-3.5 h-3.5 ${approvalInfo.color}`}
                          />
                          <span
                            className={`text-xs font-medium ${approvalInfo.color}`}
                          >
                            {approvalInfo.label}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${accountInfo.bgColor}`}
                        >
                          <span
                            className={`text-xs font-medium ${accountInfo.color}`}
                          >
                            {accountInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* Online Status */}
                      <td className="px-6 py-4 text-center">
                        <div
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${
                            driver.isOnline ? "bg-green-100" : "bg-gray-100"
                          }`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              driver.isOnline ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              driver.isOnline
                                ? "text-green-700"
                                : "text-gray-600"
                            }`}
                          >
                            {driver.isOnline ? "Online" : "Offline"}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDriverDetail(driver)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4 text-gray-600" />
                          </button>

                          {isVerificationPending(driver.status) && (
                            <button
                              onClick={() => openVerifyModal(driver)}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                              title="Verify Driver"
                            >
                              <ShieldCheck className="w-4 h-4 text-green-600" />
                            </button>
                          )}

                          {driver.status !== "suspended" && driver.isActive && (
                            <button
                              onClick={() =>
                                handleAccountStatusChange(driver, false)
                              }
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Mark Inactive"
                            >
                              <Clock className="w-4 h-4 text-gray-600" />
                            </button>
                          )}

                          {driver.status !== "suspended" && !driver.isActive && (
                            <button
                              onClick={() =>
                                handleAccountStatusChange(driver, true)
                              }
                              className="p-2 hover:bg-emerald-100 rounded-lg transition-colors"
                              title="Mark Active"
                            >
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </button>
                          )}

                          {driver.status === "approved" && (
                            <button
                              onClick={() => openSuspendModal(driver)}
                              className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Block Driver"
                            >
                              <Ban className="w-4 h-4 text-orange-600" />
                            </button>
                          )}

                          {driver.status === "suspended" && (
                            <button
                              onClick={() => handleReactivate(driver)}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                              title="Activate Driver"
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                          )}

                          {driver.isDeleted ? (
                            <button
                              onClick={() => handleRestore(driver)}
                              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                              title="Restore Driver"
                            >
                              <Undo2 className="w-4 h-4 text-blue-600" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedDriver(driver);
                                setDeleteModalOpen(true);
                              }}
                              className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                              title="Delete Driver"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
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
        )}
      </div>

      {/* Pagination (shared by card + table view) */}
      {pagination.total > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600">
                Showing {page * limit + 1} -{" "}
                {Math.min((page + 1) * limit, pagination.total)} of{" "}
                {pagination.total}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show</label>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value) as PageSize);
                    setPage(0);
                  }}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm"
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-600">
                Page {page + 1} of {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages - 1, p + 1))
                }
                disabled={page >= pagination.totalPages - 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Driver Detail Modal */}
      {detailModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {selectedDriver.profilePhoto ? (
                  <img
                    src={selectedDriver.profilePhoto}
                    alt={selectedDriver.fullName}
                    className="w-14 h-14 rounded-full object-cover cursor-pointer"
                    onClick={() =>
                      setImagePreview(selectedDriver.profilePhoto || null)
                    }
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                    <span className="text-orange-600 text-xl font-bold">
                      {selectedDriver.fullName?.charAt(0) || "D"}
                    </span>
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {selectedDriver.fullName}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500">
                      {selectedDriver.countryCode} {selectedDriver.mobileNumber}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        approvalConfig[getApprovalState(selectedDriver)].bgColor
                      } ${approvalConfig[getApprovalState(selectedDriver)].color}`}
                    >
                      {approvalConfig[getApprovalState(selectedDriver)].label}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        accountStatusConfig[
                          selectedDriver.isActive ? "active" : "inactive"
                        ].bgColor
                      } ${
                        accountStatusConfig[
                          selectedDriver.isActive ? "active" : "inactive"
                        ].color
                      }`}
                    >
                      {
                        accountStatusConfig[
                          selectedDriver.isActive ? "active" : "inactive"
                        ].label
                      }
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {(
                [
                  "overview",
                  "documents",
                  "vehicle",
                  "bank",
                  "bookings",
                ] as TabType[]
              ).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? "border-orange-500 text-orange-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Overview Tab */}
              {activeTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Personal Info */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <User className="w-4 h-4" /> Personal Information
                    </h3>
                    {/* Only fields onboarding actually captures. Email, Gender,
                        Date of Birth, Blood Group and Languages were removed:
                        the driver app has no screen that collects any of them
                        (the owner-details step submits a name, three ID photos
                        and a selfie), so every one of those rows was a
                        permanent blank. */}
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Full Name</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.fullName || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Mobile</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {selectedDriver.countryCode} {selectedDriver.mobileNumber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Location Info */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Location
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">City</span>
                        <span className="text-sm font-medium text-gray-900">
                          {/* The city IS collected — in the RC step, which
                              writes DriverKyc.city (and Vehicle.city). Nothing
                              copies it onto the Driver document, which is
                              created with city: "" and never updated, so
                              reading selectedDriver.city alone always showed
                              "-". Fall back to the KYC record. */}
                          {selectedDriver.city || driverKYC?.city || "-"}
                        </span>
                      </div>
                      {/* Removed: State. Nothing in onboarding or the profile
                          API ever sets Driver.state. */}
                    </div>

                    {selectedDriver.addresses &&
                      selectedDriver.addresses.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <p className="text-xs font-medium text-gray-500 mb-2">
                            Addresses
                          </p>
                          {selectedDriver.addresses.map((addr, idx) => (
                            <div
                              key={idx}
                              className="text-sm text-gray-700 mb-2"
                            >
                              <span className="text-xs font-medium text-gray-500 uppercase">
                                {addr.type}:
                              </span>{" "}
                              {addr.addressLine1}, {addr.city}, {addr.state} -{" "}
                              {addr.pincode}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {/* Performance Stats */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4" /> Performance
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedDriver.completedTrips || 0}
                        </p>
                        <p className="text-xs text-gray-500">Total Trips</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                          <span className="text-2xl font-bold text-gray-900">
                            {selectedDriver.rating?.toFixed(1) || "0.0"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">Rating</p>
                      </div>
                      {/* `totalEarnings` is now Σ driverEarnings of the driver's
                          COMPLETED bookings (getAllDrivers in
                          admin/driver.controller.ts) — subtotal − commission,
                          frozen per booking at completion, the same figure
                          Finance → Payouts settles against. It used to sum
                          finalFare, which includes the customer's GST and the
                          platform's commission, so this tile disagreed with
                          Payouts by roughly a third. The gross is still
                          available on the same response as
                          `grossFareCollected`. */}
                      <div className="bg-white rounded-lg p-3 text-center col-span-2">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(selectedDriver.totalEarnings || 0)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Driver Earnings (net)
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          After commission, excl. customer GST — the basis
                          Finance → Payouts pays from
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Financial Metrics */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Wallet className="w-4 h-4" /> Financial Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {(() => {
                        const cod = enhancedData?.codBalance || 0;
                        const over = cod > COD_FLOAT_THRESHOLD;
                        return (
                          <div
                            className={`rounded-lg p-3 text-center border ${
                              over
                                ? "bg-red-50 border-red-200 ring-1 ring-red-300"
                                : "bg-white border-transparent"
                            }`}
                          >
                            <p className={`text-2xl font-bold ${over ? "text-red-600" : "text-orange-600"}`}>
                              {formatCurrency(cod)}
                            </p>
                            <p className="text-xs text-gray-500">
                              Floating COD
                              {over && (
                                <span className="ml-1 inline-flex items-center gap-0.5 text-red-600 font-semibold">
                                  <AlertTriangle className="w-3 h-3" /> Over threshold
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Threshold {formatCurrency(COD_FLOAT_THRESHOLD)}
                            </p>
                          </div>
                        );
                      })()}
                      {/* Same basis as the tile above: getWeeklyEarnings
                          (enhanced-driver.controller.ts) now sums the frozen
                          driverEarnings the payout system settles against, not
                          gross finalFare. */}
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(enhancedData?.weeklyEarnings || 0)}
                        </p>
                        <p className="text-xs text-gray-500">Earnings (7d)</p>
                        <p className="text-[10px] text-gray-400">
                          After commission, excl. GST
                        </p>
                      </div>
                      {/* Removed: "Reassignments (30d)". The backend counts
                          bookings by Booking.reassignedFrom, which is not a
                          path on the Booking schema and is never written by any
                          reassign/dispatch code — the tile was hard-zero for
                          every driver. */}
                    </div>
                    {/* Weekly Earnings Breakdown */}
                    {enhancedData?.weeklyBreakdown && enhancedData.weeklyBreakdown.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        {/* Bars are the same driverEarnings series as the tile
                            above — net weekly earnings, matching Payouts. */}
                        <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> Weekly Breakdown —
                          net earnings
                        </p>
                        <div className="flex justify-between gap-1">
                          {enhancedData.weeklyBreakdown.map((d, i) => (
                            <div key={i} className="flex-1 text-center">
                              <div className="h-16 flex items-end justify-center">
                                <div
                                  className="w-full bg-blue-500 rounded-t"
                                  style={{
                                    height: `${Math.max(10, (d.amount / Math.max(...enhancedData.weeklyBreakdown.map(x => x.amount), 1)) * 100)}%`,
                                  }}
                                />
                              </div>
                              <p className="text-[10px] text-gray-500 mt-1">{d.day}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Performance Metrics — auto-calculated KPIs */}
                  <div className="bg-gray-50 rounded-xl p-5 col-span-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4" /> Performance Metrics
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {(() => {
                        const comp = enhancedData?.completionRate;
                        const compDanger = comp != null && comp < 70;
                        return (
                          <div className={`rounded-lg p-3 text-center border ${compDanger ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
                            <div className="flex items-center justify-center gap-1">
                              <TrendingUp className={`w-4 h-4 ${compDanger ? "text-red-500" : "text-green-500"}`} />
                              <span className={`text-2xl font-bold ${compDanger ? "text-red-600" : "text-green-600"}`}>
                                {comp != null ? `${Number(comp).toFixed(0)}%` : "—"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Completion Rate (30d)</p>
                          </div>
                        );
                      })()}
                      {(() => {
                        const can = enhancedData?.cancellationRate;
                        const canDanger = can != null && can > 20;
                        return (
                          <div className={`rounded-lg p-3 text-center border ${canDanger ? "bg-red-50 border-red-200" : "bg-white border-gray-100"}`}>
                            <div className="flex items-center justify-center gap-1">
                              <TrendingDown className={`w-4 h-4 ${canDanger ? "text-red-500" : "text-gray-400"}`} />
                              <span className={`text-2xl font-bold ${canDanger ? "text-red-600" : "text-gray-700"}`}>
                                {can != null ? `${can.toFixed(1)}%` : "—"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Cancellation Rate</p>
                            {canDanger && <p className="text-[10px] text-red-600 font-medium">Auto-flag &gt; 20%</p>}
                          </div>
                        );
                      })()}
                      {(() => {
                        const rating = enhancedData?.avgRating30d;
                        const trips = enhancedData?.totalTrips30d ?? 0;
                        const low = rating != null && rating > 0 && rating < 4;
                        return (
                          <div className={`rounded-lg p-3 text-center border ${low ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-100"}`}>
                            <div className="flex items-center justify-center gap-1">
                              <Award className={`w-4 h-4 ${low ? "text-yellow-600" : "text-gray-400"}`} />
                              <span className={`text-2xl font-bold ${low ? "text-yellow-700" : "text-gray-700"}`}>
                                {rating ? Number(rating).toFixed(2) : "—"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Avg Rating (30d · {trips} trips)</p>
                          </div>
                        );
                      })()}
                      {(() => {
                        const days = enhancedData?.daysSinceLastTrip;
                        const stale = days != null && days > 7;
                        return (
                          <div className={`rounded-lg p-3 text-center border ${stale ? "bg-yellow-50 border-yellow-200" : "bg-white border-gray-100"}`}>
                            <div className="flex items-center justify-center gap-1">
                              <Timer className={`w-4 h-4 ${stale ? "text-yellow-600" : "text-gray-400"}`} />
                              <span className={`text-2xl font-bold ${stale ? "text-yellow-700" : "text-gray-700"}`}>
                                {days != null ? days : "—"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Days Since Last Trip</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Removed: the whole "Device Intelligence" panel (App
                      Version, Battery, Last Seen). It read Driver.deviceInfo,
                      which no endpoint, socket handler or job ever writes — the
                      driver app doesn't even depend on device_info_plus /
                      battery_plus, and its only background telemetry is a
                      lat/lng socket emit. All three tiles were permanently "—". */}

                  {/* Traffic Light Document Status */}
                  <div className="bg-gray-50 rounded-xl p-5 col-span-2">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <FileCheck className="w-4 h-4" /> Document Status
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {buildDocumentStatus(driverKYC).map((doc, i) => (
                        <div
                          key={i}
                          className={`p-3 rounded-lg border flex items-center gap-2 ${
                            doc.status === "uploaded"
                              ? "bg-green-50 border-green-200"
                              : doc.status === "expiring"
                              ? "bg-yellow-50 border-yellow-200"
                              : doc.status === "expired"
                              ? "bg-red-50 border-red-200"
                              : "bg-gray-100 border-gray-200"
                          }`}
                        >
                          <CircleDot
                            className={`w-4 h-4 ${
                              doc.status === "uploaded"
                                ? "text-green-500"
                                : doc.status === "expiring"
                                ? "text-yellow-500"
                                : doc.status === "expired"
                                ? "text-red-500"
                                : "text-gray-400"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">
                              {doc.type}
                            </p>
                            <p
                              className={`text-[10px] capitalize ${
                                doc.status === "uploaded"
                                  ? "text-green-600"
                                  : doc.status === "expiring"
                                  ? "text-yellow-600"
                                  : doc.status === "expired"
                                  ? "text-red-600"
                                  : "text-gray-500"
                              }`}
                            >
                              {doc.status}
                              {doc.expiresAt &&
                                (doc.status === "expiring" ||
                                  doc.status === "expired") && (
                                  <span className="ml-1">
                                    ({new Date(doc.expiresAt).toLocaleDateString()})
                                  </span>
                                )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex justify-center gap-4 text-[10px]">
                      <span className="flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-green-500" /> Uploaded
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-yellow-500" /> Expiring Soon
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-red-500" /> Expired
                      </span>
                      <span className="flex items-center gap-1">
                        <CircleDot className="w-3 h-3 text-gray-400" /> Missing
                      </span>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Account Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Approval</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            approvalConfig[getApprovalState(selectedDriver)]
                              .bgColor
                          } ${
                            approvalConfig[getApprovalState(selectedDriver)]
                              .color
                          }`}
                        >
                          {approvalConfig[getApprovalState(selectedDriver)].label}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Account Status
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            accountStatusConfig[
                              selectedDriver.isActive ? "active" : "inactive"
                            ].bgColor
                          } ${
                            accountStatusConfig[
                              selectedDriver.isActive ? "active" : "inactive"
                            ].color
                          }`}
                        >
                          {
                            accountStatusConfig[
                              selectedDriver.isActive ? "active" : "inactive"
                            ].label
                          }
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Online Status
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            selectedDriver.isOnline
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {selectedDriver.isOnline ? "Online" : "Offline"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Onboarding Fee
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            selectedDriver.onboardingFeePaid
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {selectedDriver.onboardingFeePaid
                            ? "Paid"
                            : "Pending"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Referral Code
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.referralCode || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Joined</span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(selectedDriver.createdAt)}
                        </span>
                      </div>
                      {selectedDriver.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-xs font-medium text-red-600">
                            Rejection Reason:
                          </p>
                          <p className="text-sm text-red-700 mt-1">
                            {selectedDriver.rejectionReason}
                          </p>
                        </div>
                      )}
                      {selectedDriver.suspensionReason && (
                        <div className="mt-3 p-3 bg-orange-50 rounded-lg">
                          <p className="text-xs font-medium text-orange-600">
                            Suspension Reason:
                          </p>
                          <p className="text-sm text-orange-700 mt-1">
                            {selectedDriver.suspensionReason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab */}
              {activeTab === "documents" && (
                <div className="space-y-6">
                  {!driverKYC ? (
                    <div className="text-center py-10">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No documents uploaded yet</p>
                    </div>
                  ) : (
                    <>
                      {/* Aadhaar */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <IdCard className="w-4 h-4" /> Aadhaar Card
                          </h3>
                          {driverKYC.aadhaar?.number && (
                            <span className="text-sm font-mono text-gray-600">
                              {maskNumber(driverKYC.aadhaar.number)}
                            </span>
                          )}
                        </div>
                        {driverKYC.aadhaar ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-2">
                                Front
                              </p>
                              <img
                                src={driverKYC.aadhaar.frontImage}
                                alt="Aadhaar Front"
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() =>
                                  setImagePreview(
                                    driverKYC.aadhaar?.frontImage || null,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-2">Back</p>
                              <img
                                src={driverKYC.aadhaar.backImage}
                                alt="Aadhaar Back"
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() =>
                                  setImagePreview(
                                    driverKYC.aadhaar?.backImage || null,
                                  )
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Not uploaded</p>
                        )}
                      </div>

                      {/* PAN */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <CreditCard className="w-4 h-4" /> PAN Card
                          </h3>
                          {driverKYC.pan?.number && (
                            <span className="text-sm font-mono text-gray-600">
                              {driverKYC.pan.number}
                            </span>
                          )}
                        </div>
                        {driverKYC.pan ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-2">
                                Front
                              </p>
                              <img
                                src={driverKYC.pan.frontImage}
                                alt="PAN Front"
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() =>
                                  setImagePreview(
                                    driverKYC.pan?.frontImage || null,
                                  )
                                }
                              />
                            </div>
                            {driverKYC.pan.backImage && (
                              <div>
                                <p className="text-xs text-gray-500 mb-2">
                                  Back
                                </p>
                                <img
                                  src={driverKYC.pan.backImage}
                                  alt="PAN Back"
                                  className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                  onClick={() =>
                                    setImagePreview(
                                      driverKYC.pan?.backImage || null,
                                    )
                                  }
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Not uploaded</p>
                        )}
                      </div>

                      {/* Driving License */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <IdCard className="w-4 h-4" /> Driving License
                          </h3>
                          <div className="flex items-center gap-3">
                            {driverKYC.drivingLicense?.number && (
                              <span className="text-sm font-mono text-gray-600">
                                {driverKYC.drivingLicense.number}
                              </span>
                            )}
                            {driverKYC.drivingLicense?.expiryDate && (
                              <span className="text-xs text-gray-500">
                                Expires:{" "}
                                {formatDate(
                                  driverKYC.drivingLicense.expiryDate,
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        {driverKYC.drivingLicense ? (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs text-gray-500 mb-2">
                                Front
                              </p>
                              <img
                                src={driverKYC.drivingLicense.frontImage}
                                alt="DL Front"
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() =>
                                  setImagePreview(
                                    driverKYC.drivingLicense?.frontImage ||
                                      null,
                                  )
                                }
                              />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 mb-2">Back</p>
                              <img
                                src={driverKYC.drivingLicense.backImage}
                                alt="DL Back"
                                className="w-full h-40 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                onClick={() =>
                                  setImagePreview(
                                    driverKYC.drivingLicense?.backImage || null,
                                  )
                                }
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">Not uploaded</p>
                        )}
                      </div>

                      {/* Selfie */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                          <Camera className="w-4 h-4" /> Selfie Verification
                        </h3>
                        {driverKYC.selfie ? (
                          <img
                            src={driverKYC.selfie}
                            alt="Selfie"
                            className="w-40 h-40 object-cover rounded-lg cursor-pointer hover:opacity-90"
                            onClick={() =>
                              setImagePreview(driverKYC.selfie || null)
                            }
                          />
                        ) : (
                          <p className="text-sm text-gray-500">Not uploaded</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Vehicle Tab */}
              {activeTab === "vehicle" && (
                <div className="space-y-6">
                  {/* Registered Vehicles */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                      <Truck className="w-4 h-4" /> Registered Vehicles
                    </h3>
                    {driverVehicles.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No vehicles registered
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {driverVehicles.map((vehicle) => (
                          <div
                            key={vehicle._id}
                            className="bg-white rounded-lg p-4 space-y-3"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                  <Truck className="w-5 h-5 text-orange-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {vehicle.vehicleTypeId?.name ||
                                      vehicle.vehicleType ||
                                      "Unknown Type"}
                                    {vehicle.isPrimary && (
                                      <span className="ml-2 text-xs font-normal text-orange-600">
                                        (Primary)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-500 font-mono">
                                    {vehicle.registrationNumber}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {vehicle.verificationStatus && (
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                                      vehicle.verificationStatus === "approved"
                                        ? "bg-green-100 text-green-700"
                                        : vehicle.verificationStatus === "rejected"
                                        ? "bg-red-100 text-red-700"
                                        : "bg-yellow-100 text-yellow-700"
                                    }`}
                                  >
                                    {vehicle.verificationStatus.replace("_", " ")}
                                  </span>
                                )}
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    vehicle.onboardingFeePaid
                                      ? "bg-green-100 text-green-700"
                                      : "bg-orange-100 text-orange-700"
                                  }`}
                                >
                                  {vehicle.onboardingFeePaid ? "Fee Paid" : "Fee Pending"}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    vehicle.isActive
                                      ? "bg-green-100 text-green-700"
                                      : "bg-gray-100 text-gray-600"
                                  }`}
                                >
                                  {vehicle.isActive ? "Active" : "Inactive"}
                                </span>
                                {vehicle.isOnline && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    Online
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Per-vehicle approval — the ONLY path for a 2nd
                                vehicle once the driver is already approved. */}
                            {vehicle.verificationStatus !== "approved" && (
                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  onClick={() =>
                                    handleVerifyVehicle(vehicle._id, "approve")
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700"
                                >
                                  Approve Vehicle
                                </button>
                                {vehicle.verificationStatus !== "rejected" && (
                                  <button
                                    onClick={() =>
                                      handleVerifyVehicle(vehicle._id, "reject")
                                    }
                                    className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                                  >
                                    Reject
                                  </button>
                                )}
                                {vehicle.rejectionReason && (
                                  <span className="text-xs text-red-600">
                                    {vehicle.rejectionReason}
                                  </span>
                                )}
                              </div>
                            )}

                            {(vehicle.assignedDriverName ||
                              vehicle.assignedDriverPhone) && (
                              <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Assigned Driver
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {vehicle.assignedDriverName || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">
                                    Driver Mobile
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 font-mono">
                                    {vehicle.assignedDriverPhone || "-"}
                                  </p>
                                </div>
                              </div>
                            )}

                            {(vehicle.vehicleBodyType ||
                              vehicle.fuelType ||
                              vehicle.city) && (
                              <div className="border-t border-gray-100 pt-3 grid grid-cols-3 gap-3">
                                <div>
                                  <p className="text-xs text-gray-500">City</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {vehicle.city || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Body Type</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {vehicle.vehicleBodyType || "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Fuel Type</p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {vehicle.fuelType || "-"}
                                  </p>
                                </div>
                              </div>
                            )}

                            {(vehicle.rcFrontImage || vehicle.rcBackImage) && (
                              <div className="border-t border-gray-100 pt-3">
                                <p className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-2">
                                  <FileCheck className="w-3.5 h-3.5" /> Vehicle RC
                                </p>
                                <div className="grid grid-cols-2 gap-3">
                                  {vehicle.rcFrontImage && (
                                    <div>
                                      <p className="text-[11px] text-gray-500 mb-1">Front</p>
                                      <img
                                        src={vehicle.rcFrontImage}
                                        alt={`RC Front ${vehicle.registrationNumber}`}
                                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                        onClick={() =>
                                          setImagePreview(vehicle.rcFrontImage || null)
                                        }
                                      />
                                    </div>
                                  )}
                                  {vehicle.rcBackImage && (
                                    <div>
                                      <p className="text-[11px] text-gray-500 mb-1">Back</p>
                                      <img
                                        src={vehicle.rcBackImage}
                                        alt={`RC Back ${vehicle.registrationNumber}`}
                                        className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                        onClick={() =>
                                          setImagePreview(vehicle.rcBackImage || null)
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {vehicle.vehicleImages &&
                              vehicle.vehicleImages.length > 0 && (
                                <div className="border-t border-gray-100 pt-3">
                                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-2">
                                    <Car className="w-3.5 h-3.5" /> Vehicle Photos
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {vehicle.vehicleImages.map((img, idx) => (
                                      <img
                                        key={idx}
                                        src={img}
                                        alt={`${vehicle.registrationNumber} ${idx + 1}`}
                                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-90"
                                        onClick={() => setImagePreview(img)}
                                      />
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bank Tab */}
              {activeTab === "bank" && (
                <div className="bg-gray-50 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Bank Account Details
                    </h3>
                    {selectedDriver.bankDetails?.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <Check className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>
                  {selectedDriver.bankDetails ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">
                            Account Holder Name
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedDriver.bankDetails.accountHolderName ||
                              "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Bank Name</p>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedDriver.bankDetails.bankName || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            Account Number
                          </p>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {maskNumber(
                              selectedDriver.bankDetails.accountNumber || "",
                              4,
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">IFSC Code</p>
                          <p className="text-sm font-medium text-gray-900 font-mono">
                            {selectedDriver.bankDetails.ifscCode || "-"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">
                      No bank details added
                    </p>
                  )}
                </div>
              )}

              {/* Bookings Tab — real booking history */}
              {activeTab === "bookings" && (
                <div>
                  {bookingsLoading ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : driverBookings.length === 0 ? (
                    <div className="text-center py-10">
                      <Truck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-500">No bookings for this driver yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-600">
                          <tr>
                            <th className="text-left px-3 py-2 font-medium">Order</th>
                            <th className="text-left px-3 py-2 font-medium">Customer</th>
                            <th className="text-left px-3 py-2 font-medium">Date</th>
                            <th className="text-right px-3 py-2 font-medium">Fare</th>
                            <th className="text-center px-3 py-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {driverBookings.map((b: any) => {
                            const cust =
                              b.userId && typeof b.userId === "object"
                                ? b.userId.fullName || b.userId.mobileNumber
                                : "—";
                            const fare = b.finalFare ?? b.fare ?? 0;
                            return (
                              <tr key={b._id} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-900">
                                  {b.orderId || b.bookingNumber || String(b._id).slice(-6).toUpperCase()}
                                </td>
                                <td className="px-3 py-2 text-gray-600">{cust}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-IN") : "—"}
                                </td>
                                <td className="px-3 py-2 text-right font-medium">
                                  ₹{Number(fare).toLocaleString("en-IN")}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                    {b.status || "—"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Verify Modal */}
      {verifyModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Verify Driver</h2>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
              {selectedDriver.profilePhoto ? (
                <img
                  src={selectedDriver.profilePhoto}
                  alt={selectedDriver.fullName}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-600 font-semibold">
                    {selectedDriver.fullName?.charAt(0) || "D"}
                  </span>
                </div>
              )}
              <div>
                <p className="font-medium text-gray-900">
                  {selectedDriver.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedDriver.countryCode} {selectedDriver.mobileNumber}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason (required if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleVerify("reject")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Reject
              </button>
              <button
                onClick={() => handleVerify("approve")}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Block Driver
              </h2>
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6 p-4 bg-orange-50 rounded-xl">
              <Ban className="w-8 h-8 text-orange-600" />
              <div>
                <p className="font-medium text-gray-900">
                  Blocking {selectedDriver.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  This will make the driver inactive and force them offline
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blocking Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter reason for blocking..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSuspendModalOpen(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspend}
                disabled={actionLoading || !suspensionReason.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Ban className="w-4 h-4" />
                )}
                Block Driver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModalOpen && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Delete Driver</h2>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-6 p-4 bg-red-50 rounded-xl">
              <Trash2 className="w-8 h-8 text-red-600" />
              <div>
                <p className="font-medium text-gray-900">Are you sure?</p>
                <p className="text-sm text-gray-500">
                  This will delete {selectedDriver.fullName}'s account
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Assign Modal — pick a pending order for this driver */}
      {assignModalOpen && assignDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Assign an Order</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  To {assignDriver.fullName} · {assignDriver.mobileNumber}
                </p>
              </div>
              <button
                onClick={() => {
                  setAssignModalOpen(false);
                  setAssignDriver(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              {pendingLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                </div>
              ) : pendingBookings.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  No orders are currently searching for a driver.
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingBookings.map((b) => (
                    <div
                      key={b._id}
                      className="flex items-center justify-between gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {b.bookingNumber || `Order ${b._id.slice(-6).toUpperCase()}`}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {b.customerName ? `${b.customerName} · ` : ""}
                          {b.pickupAddress || "Pickup pending"}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAssignToBooking(b._id)}
                        disabled={assigningId !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex-shrink-0"
                      >
                        {assigningId === b._id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CircleDot className="w-3.5 h-3.5" />
                        )}
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

      {/* Image Preview Modal */}
      {imagePreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setImagePreview(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setImagePreview(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:bg-white/20 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={imagePreview}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagement;
