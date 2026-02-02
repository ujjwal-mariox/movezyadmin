import React, { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Ban,
  Building2,
  Calendar,
  Camera,
  Car,
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Download,
  Edit2,
  Eye,
  EyeOff,
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
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import { driversApi } from "../services/admin-api";

// ==================== TYPES ====================
type DriverStatus =
  | "draft"
  | "documents_uploaded"
  | "vehicle_added"
  | "under_verification"
  | "approved"
  | "rejected"
  | "suspended";

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
  vehicleTypeId: {
    _id: string;
    name: string;
    icon?: string;
    maxWeightKg?: number;
  };
  registrationNumber: string;
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
  gender?: string;
  dob?: string;
  bloodGroup?: string;
  languages?: string[];
  city: string;
  state: string;
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

// ==================== STATUS CONFIG ====================
const statusConfig: Record<
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

// ==================== COMPONENT ====================
const DriverManagement: React.FC = () => {
  // State
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DriverStatus | "all">("all");
  const [onlineFilter, setOnlineFilter] = useState<
    "all" | "online" | "offline"
  >("all");
  const [toast, setToast] = useState<ToastState | null>(null);

  // Modal states
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [driverKYC, setDriverKYC] = useState<DriverKYC | null>(null);
  const [driverVehicles, setDriverVehicles] = useState<DriverVehicle[]>([]);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [suspensionReason, setSuspensionReason] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

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
  }, [search, statusFilter, onlineFilter, page, limit, showToast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // Get driver details
  const openDriverDetail = async (driver: Driver) => {
    setSelectedDriver(driver);
    setActiveTab("overview");
    setDetailModalOpen(true);

    try {
      const [docResponse, vehicleResponse] = await Promise.all([
        driversApi
          .getDocuments(driver._id)
          .catch(() => ({ data: { documents: null } })),
        driversApi
          .getVehicles(driver._id)
          .catch(() => ({ data: { vehicles: [] } })),
      ]);
      setDriverKYC(docResponse.data?.documents || null);
      setDriverVehicles(vehicleResponse.data?.vehicles || []);
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
        reason: suspensionReason,
      });
      showToast({ type: "success", message: "Driver suspended successfully" });
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
      await driversApi.updateStatus(driver._id, { status: "approved" });
      showToast({
        type: "success",
        message: "Driver reactivated successfully",
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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Driver Management
          </h1>
          <p className="text-gray-500 mt-1">
            Manage driver onboarding, verification & status
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
          <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors bg-white shadow-sm">
            <Download className="w-4 h-4" />
            <span className="text-sm font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {totalDrivers}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {getStatCount("approved")}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {getStatCount("under_verification") +
                  getStatCount("documents_uploaded")}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Online Now</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {stats?.onlineDrivers || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Suspended</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">
                {getStatCount("suspended")}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <Ban className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {getStatCount("rejected")}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

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
                setStatusFilter(e.target.value as DriverStatus | "all");
                setPage(0);
              }}
              className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="documents_uploaded">Docs Uploaded</option>
              <option value="vehicle_added">Vehicle Added</option>
              <option value="under_verification">Under Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
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
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">
                    Location
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                    Trips
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-gray-600">
                    Rating
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
                  const statusInfo = statusConfig[driver.status];
                  const StatusIcon = statusInfo.icon;

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

                      {/* Location */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {driver.city || "-"}, {driver.state || "-"}
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusInfo.bgColor}`}
                        >
                          <StatusIcon
                            className={`w-3.5 h-3.5 ${statusInfo.color}`}
                          />
                          <span
                            className={`text-xs font-medium ${statusInfo.color}`}
                          >
                            {statusInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* Online Status */}
                      <td className="px-6 py-4 text-center">
                        {driver.status === "approved" && (
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
                        )}
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

                          {[
                            "documents_uploaded",
                            "vehicle_added",
                            "under_verification",
                          ].includes(driver.status) && (
                            <button
                              onClick={() => openVerifyModal(driver)}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                              title="Verify Driver"
                            >
                              <ShieldCheck className="w-4 h-4 text-green-600" />
                            </button>
                          )}

                          {driver.status === "approved" && (
                            <button
                              onClick={() => openSuspendModal(driver)}
                              className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="Suspend Driver"
                            >
                              <Ban className="w-4 h-4 text-orange-600" />
                            </button>
                          )}

                          {driver.status === "suspended" && (
                            <button
                              onClick={() => handleReactivate(driver)}
                              className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                              title="Reactivate Driver"
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

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing {page * limit + 1} -{" "}
              {Math.min((page + 1) * limit, pagination.total)} of{" "}
              {pagination.total}
            </p>
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
        )}
      </div>

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
                        statusConfig[selectedDriver.status].bgColor
                      } ${statusConfig[selectedDriver.status].color}`}
                    >
                      {statusConfig[selectedDriver.status].label}
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
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Full Name</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.fullName || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Email</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.email || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Gender</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.gender || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Date of Birth
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {formatDate(selectedDriver.dob)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Blood Group
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.bloodGroup || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Languages</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.languages?.join(", ") || "-"}
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
                          {selectedDriver.city || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">State</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDriver.state || "-"}
                        </span>
                      </div>
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
                      <div className="bg-white rounded-lg p-3 text-center col-span-2">
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(selectedDriver.totalEarnings || 0)}
                        </p>
                        <p className="text-xs text-gray-500">Total Earnings</p>
                      </div>
                    </div>
                  </div>

                  {/* Status Info */}
                  <div className="bg-gray-50 rounded-xl p-5">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Account Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Status</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            statusConfig[selectedDriver.status].bgColor
                          } ${statusConfig[selectedDriver.status].color}`}
                        >
                          {statusConfig[selectedDriver.status].label}
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
                  {/* RC Document */}
                  {driverKYC?.vehicleRc && (
                    <div className="bg-gray-50 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                          <FileCheck className="w-4 h-4" /> Vehicle RC
                        </h3>
                        <span className="text-sm font-mono text-gray-600">
                          {driverKYC.vehicleRc.vehicleNumber}
                        </span>
                      </div>
                      <img
                        src={driverKYC.vehicleRc.image}
                        alt="Vehicle RC"
                        className="w-full max-w-md h-48 object-cover rounded-lg cursor-pointer hover:opacity-90"
                        onClick={() =>
                          setImagePreview(driverKYC.vehicleRc?.image || null)
                        }
                      />
                    </div>
                  )}

                  {/* Vehicle Images */}
                  {driverKYC?.vehicleImages &&
                    driverKYC.vehicleImages.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                          <Car className="w-4 h-4" /> Vehicle Photos
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {driverKYC.vehicleImages.map((img, idx) => (
                            <img
                              key={idx}
                              src={img}
                              alt={`Vehicle ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-90"
                              onClick={() => setImagePreview(img)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Vehicle Details */}
                  {driverKYC &&
                    (driverKYC.city ||
                      driverKYC.bodyType ||
                      driverKYC.fuelType) && (
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-4">
                          <Truck className="w-4 h-4" /> Vehicle Details
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-gray-500">City</p>
                            <p className="text-sm font-medium text-gray-900">
                              {driverKYC.city || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Body Type</p>
                            <p className="text-sm font-medium text-gray-900">
                              {driverKYC.bodyType || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Fuel Type</p>
                            <p className="text-sm font-medium text-gray-900">
                              {driverKYC.fuelType || "-"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

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
                            className="flex items-center justify-between bg-white rounded-lg p-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Truck className="w-5 h-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">
                                  {vehicle.vehicleTypeId?.name ||
                                    "Unknown Type"}
                                </p>
                                <p className="text-sm text-gray-500 font-mono">
                                  {vehicle.registrationNumber}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
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

              {/* Bookings Tab */}
              {activeTab === "bookings" && (
                <div className="text-center py-10">
                  <Truck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">
                    Booking history will be shown here
                  </p>
                  <p className="text-sm text-gray-400 mt-1">Coming soon...</p>
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
                Suspend Driver
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
                  Suspending {selectedDriver.fullName}
                </p>
                <p className="text-sm text-gray-500">
                  This will prevent the driver from accepting rides
                </p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suspension Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={suspensionReason}
                onChange={(e) => setSuspensionReason(e.target.value)}
                placeholder="Enter reason for suspension..."
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
                Suspend Driver
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
