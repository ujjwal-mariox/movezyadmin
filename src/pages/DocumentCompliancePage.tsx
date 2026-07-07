import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Download,
  Eye,
  Ban,
  Bell,
  Send,
  FileWarning,
  Shield,
  Zap,
  ChevronRight,
  Filter,
  X,
  Sparkles,
} from "lucide-react";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useDialog } from "../components/Layout/Dialog";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const getToken = () => localStorage.getItem("adminToken");

const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
};

type DocStatus = "valid" | "expiring" | "expired" | "missing" | "pending";

interface DocumentEntry {
  type: string;
  label: string;
  status: DocStatus;
  expiryDate?: string;
  uploadedAt?: string;
  url?: string;
  verifiedAt?: string;
}

interface DriverDoc {
  driverId: string;
  driverName: string;
  phone: string;
  avatar?: string;
  documents: DocumentEntry[];
  overallStatus: DocStatus;
  complianceScore: number;
}

const STATUS_CONFIG: Record<
  DocStatus,
  { color: string; bg: string; border: string; icon: React.ElementType; label: string; dot: string }
> = {
  valid: {
    color: "text-green-700",
    bg: "bg-green-100",
    border: "border-green-200",
    icon: CheckCircle,
    label: "Verified",
    dot: "bg-green-500",
  },
  expiring: {
    color: "text-amber-700",
    bg: "bg-amber-100",
    border: "border-amber-200",
    icon: Clock,
    label: "Expiring Soon",
    dot: "bg-amber-500",
  },
  expired: {
    color: "text-red-700",
    bg: "bg-red-100",
    border: "border-red-200",
    icon: XCircle,
    label: "Expired",
    dot: "bg-red-500",
  },
  missing: {
    color: "text-gray-500",
    bg: "bg-gray-100",
    border: "border-gray-200",
    icon: AlertTriangle,
    label: "Missing",
    dot: "bg-gray-400",
  },
  pending: {
    color: "text-blue-700",
    bg: "bg-blue-100",
    border: "border-blue-200",
    icon: FileWarning,
    label: "Pending Review",
    dot: "bg-blue-500",
  },
};

// Only the document types the driver KYC/onboarding flow actually captures.
// insurance/permit/fitness/puc were never collected anywhere, so including
// them capped every driver at 50% compliance. Keep this list in sync with
// what the backend emits in `driver.documents` (buildDriverDocuments).
const DOC_TYPES = [
  { key: "driving_license", label: "Driving License" },
  { key: "rc_book", label: "RC Book" },
  { key: "aadhar", label: "Aadhar Card" },
  { key: "pan", label: "PAN Card" },
];

const DAYS_THRESHOLD = 30;
const URGENT_THRESHOLD = 7;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const classifyDocStatus = (doc: any): DocStatus => {
  if (!doc || !doc.url) return "missing";
  if (doc.verificationStatus === "pending" || doc.isVerified === false) return "pending";
  if (!doc.expiryDate) return "valid";
  const expiry = new Date(doc.expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= DAYS_THRESHOLD) return "expiring";
  return "valid";
};

const getOverallStatus = (docs: DocumentEntry[]): DocStatus => {
  if (docs.some((d) => d.status === "expired")) return "expired";
  if (docs.some((d) => d.status === "missing")) return "missing";
  if (docs.some((d) => d.status === "pending")) return "pending";
  if (docs.some((d) => d.status === "expiring")) return "expiring";
  return "valid";
};

const computeScore = (docs: DocumentEntry[]): number => {
  if (docs.length === 0) return 0;
  const weight: Record<DocStatus, number> = {
    valid: 1,
    expiring: 0.6,
    pending: 0.5,
    expired: 0,
    missing: 0,
  };
  const total = docs.reduce((sum, d) => sum + weight[d.status], 0);
  return Math.round((total / docs.length) * 100);
};

const daysUntil = (iso?: string): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

const friendlyDate = (iso?: string): string => {
  if (!iso) return "—";
  const days = daysUntil(iso);
  if (days === null) return iso;
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  if (days <= 7) return `Expires in ${days}d`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const DocumentCompliancePage: React.FC = () => {
  const dialog = useDialog();
  const [drivers, setDrivers] = useState<DriverDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [expiryWindow, setExpiryWindow] = useState<"all" | "7d" | "30d" | "overdue">(
    "all",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileDriver, setProfileDriver] = useState<DriverDoc | null>(null);

  // Automation rules state (client-side; persist to backend later)
  const [rules, setRules] = useState({
    notifyBeforeDays: 3,
    blockIfExpiredDays: 2,
    autoApproveVerified: false,
    notifyBefore: true,
    autoBlock: true,
  });

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchApi("/admin/drivers?limit=200");
      const driversData = response.data?.drivers || response.data || [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const driverDocs: DriverDoc[] = driversData.map((driver: any) => {
        const documents: DocumentEntry[] = DOC_TYPES.map((dt) => {
          const doc =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            driver.documents?.find((d: any) => d.type === dt.key || d.documentType === dt.key);
          const status = classifyDocStatus(doc);
          return {
            type: dt.key,
            label: dt.label,
            status,
            expiryDate: doc?.expiryDate,
            uploadedAt: doc?.uploadedAt || doc?.createdAt,
            verifiedAt: doc?.verifiedAt,
            url: doc?.url || doc?.frontImage || doc?.backImage,
          };
        });

        return {
          driverId: driver._id,
          driverName:
            `${driver.firstName || ""} ${driver.lastName || ""}`.trim() ||
            driver.name ||
            driver.fullName ||
            "Unknown",
          phone: driver.phone || driver.mobileNumber || "",
          avatar: driver.profileImage || driver.avatar || driver.profilePhoto,
          documents,
          overallStatus: getOverallStatus(documents),
          complianceScore: computeScore(documents),
        };
      });

      setDrivers(driverDocs);
    } catch (err) {
      console.error("Load drivers error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrivers();
  }, [loadDrivers]);

  // ─── Derived counts ───
  const counts = useMemo(() => {
    let totalDocs = 0;
    let verified = 0;
    let expiring = 0;
    let expired = 0;
    let pending = 0;
    let missing = 0;
    drivers.forEach((d) => {
      d.documents.forEach((doc) => {
        totalDocs++;
        if (doc.status === "valid") verified++;
        else if (doc.status === "expiring") expiring++;
        else if (doc.status === "expired") expired++;
        else if (doc.status === "pending") pending++;
        else if (doc.status === "missing") missing++;
      });
    });
    return { totalDocs, verified, expiring, expired, pending, missing };
  }, [drivers]);

  // ─── Urgent action lists ───
  const urgentExpiring = useMemo(() => {
    const rows: { driver: DriverDoc; doc: DocumentEntry; days: number }[] = [];
    drivers.forEach((d) => {
      d.documents.forEach((doc) => {
        const days = daysUntil(doc.expiryDate);
        if (doc.status === "expiring" && days !== null && days <= URGENT_THRESHOLD && days >= 0) {
          rows.push({ driver: d, doc, days });
        }
      });
    });
    return rows.sort((a, b) => a.days - b.days).slice(0, 5);
  }, [drivers]);

  const urgentExpired = useMemo(() => {
    const rows: { driver: DriverDoc; doc: DocumentEntry }[] = [];
    drivers.forEach((d) => {
      d.documents.forEach((doc) => {
        if (doc.status === "expired") rows.push({ driver: d, doc });
      });
    });
    return rows.slice(0, 5);
  }, [drivers]);

  const pendingVerification = useMemo(() => {
    const rows: { driver: DriverDoc; doc: DocumentEntry }[] = [];
    drivers.forEach((d) => {
      d.documents.forEach((doc) => {
        if (doc.status === "pending") rows.push({ driver: d, doc });
      });
    });
    return rows.slice(0, 5);
  }, [drivers]);

  // ─── Filtering ───
  const filtered = drivers.filter((d) => {
    const matchesSearch =
      !search ||
      d.driverName.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search);
    const matchesStatus = statusFilter === "all" || d.overallStatus === statusFilter;

    const matchesDocType =
      docTypeFilter === "all" ||
      d.documents.some(
        (doc) => doc.type === docTypeFilter && doc.status !== "valid",
      );

    let matchesExpiry = true;
    if (expiryWindow !== "all") {
      matchesExpiry = d.documents.some((doc) => {
        const days = daysUntil(doc.expiryDate);
        if (days === null) return false;
        if (expiryWindow === "overdue") return days < 0;
        if (expiryWindow === "7d") return days >= 0 && days <= 7;
        if (expiryWindow === "30d") return days >= 0 && days <= 30;
        return true;
      });
    }
    return matchesSearch && matchesStatus && matchesDocType && matchesExpiry;
  });

  const {
    paginatedData: paginatedDrivers,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems,
    startIndex,
    endIndex,
    pageSize,
    setPageSize,
  } = usePagination(filtered, 10);

  const allFilteredIds = useMemo(
    () => new Set(paginatedDrivers.map((d) => d.driverId)),
    [paginatedDrivers],
  );
  const allSelectedOnPage =
    paginatedDrivers.length > 0 &&
    paginatedDrivers.every((d) => selectedIds.has(d.driverId));

  const togglePageSelection = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkNotice, setBulkNotice] = useState<string | null>(null);

  const bulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) {
      await dialog.alert({ title: "No selection", message: "Select at least one driver first.", tone: "info" });
      return;
    }
    const ok = await dialog.confirm({
      title: `Approve ${selectedIds.size} driver${selectedIds.size > 1 ? "s" : ""}?`,
      message: "All selected drivers will have their documents approved.",
      tone: "warning",
      confirmLabel: "Approve",
    });
    if (!ok) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetchApi(`/admin/drivers/${id}/verify`, {
            method: "PUT",
            body: JSON.stringify({ action: "approve" }),
          }).catch(() => null),
        ),
      );
      setBulkNotice(`Approved ${ids.length} driver(s).`);
      setSelectedIds(new Set());
      loadDrivers();
    } catch (err) {
      console.error("Bulk approve failed:", err);
      setBulkNotice("Bulk approve failed. Check console for details.");
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, loadDrivers, dialog]);

  const bulkBlock = useCallback(async () => {
    if (selectedIds.size === 0) {
      await dialog.alert({ title: "No selection", message: "Select at least one driver first.", tone: "info" });
      return;
    }
    const reason = await dialog.prompt({
      title: `Block ${selectedIds.size} driver${selectedIds.size > 1 ? "s" : ""}?`,
      message: "Provide a reason for blocking — this will be recorded.",
      tone: "danger",
      defaultValue: "Document compliance",
      required: true,
      multiline: true,
      confirmLabel: "Block drivers",
    });
    if (reason === null) return;
    setBulkBusy(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(
        ids.map((id) =>
          fetchApi(`/admin/drivers/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({
              status: "suspended",
              reason: reason || "Document compliance",
              isActive: false,
            }),
          }).catch(() => null),
        ),
      );
      setBulkNotice(`Blocked ${ids.length} driver(s).`);
      setSelectedIds(new Set());
      loadDrivers();
    } catch (err) {
      console.error("Bulk block failed:", err);
      setBulkNotice("Bulk block failed. Check console for details.");
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, loadDrivers, dialog]);

  const bulkNotify = useCallback(async () => {
    if (selectedIds.size === 0) {
      await dialog.alert({ title: "No selection", message: "Select at least one driver first.", tone: "info" });
      return;
    }
    const message = await dialog.prompt({
      title: "Send reminder",
      message: "This message will be sent to all selected drivers as a notification.",
      tone: "info",
      defaultValue: "Please update your expiring documents to continue accepting bookings.",
      required: true,
      multiline: true,
      confirmLabel: "Send reminder",
    });
    if (!message) return;
    setBulkBusy(true);
    try {
      await fetchApi(`/admin/notifications/broadcast`, {
        method: "POST",
        body: JSON.stringify({
          title: "Document Reminder",
          body: message,
          type: "SYSTEM",
          audience: "DRIVERS",
          data: {
            targetType: "COMPLIANCE",
            driverIds: Array.from(selectedIds).join(","),
          },
        }),
      }).catch(() => null);
      setBulkNotice(`Reminder dispatched to ${selectedIds.size} driver(s).`);
      setSelectedIds(new Set());
    } catch (err) {
      console.error("Bulk notify failed:", err);
      setBulkNotice("Bulk notify failed. Check console for details.");
    } finally {
      setBulkBusy(false);
    }
  }, [selectedIds, dialog]);

  // Per-driver approve — hits the same real endpoint the bulk bar uses. These
  // row buttons previously only showed a dialog.alert() and did nothing.
  const approveDriver = useCallback(
    async (driverId: string, driverName: string) => {
      const ok = await dialog.confirm({
        title: `Approve ${driverName}?`,
        message: "This approves the driver's documents and activates their account.",
        tone: "success",
        confirmLabel: "Approve",
      });
      if (!ok) return;
      const res = await fetchApi(`/admin/drivers/${driverId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ action: "approve" }),
      }).catch(() => null);
      if (res) {
        setBulkNotice(`Approved ${driverName}.`);
        loadDrivers();
      } else {
        await dialog.alert({ title: "Approve failed", message: "Could not approve. Try again.", tone: "danger" });
      }
    },
    [dialog, loadDrivers],
  );

  const rejectDriver = useCallback(
    async (driverId: string, driverName: string) => {
      const reason = await dialog.prompt({
        title: `Reject ${driverName}?`,
        message: "Provide a reason — the driver sees this and can re-upload.",
        tone: "danger",
        defaultValue: "Documents unclear or invalid. Please re-upload.",
        required: true,
        multiline: true,
        confirmLabel: "Reject",
      });
      if (reason === null) return;
      const res = await fetchApi(`/admin/drivers/${driverId}/verify`, {
        method: "PUT",
        body: JSON.stringify({ action: "reject", rejectionReason: reason }),
      }).catch(() => null);
      if (res) {
        setBulkNotice(`Rejected ${driverName}.`);
        loadDrivers();
      } else {
        await dialog.alert({ title: "Reject failed", message: "Could not reject. Try again.", tone: "danger" });
      }
    },
    [dialog, loadDrivers],
  );

  // "Request re-upload" — notify a single driver to re-submit documents.
  const requestReupload = useCallback(
    async (driverId: string, driverName: string) => {
      const message = await dialog.prompt({
        title: `Request re-upload from ${driverName}`,
        message: "This is sent to the driver as a notification.",
        tone: "info",
        defaultValue: "Please re-upload your documents — some were unclear or expired.",
        required: true,
        multiline: true,
        confirmLabel: "Send request",
      });
      if (!message) return;
      const res = await fetchApi(`/admin/notifications/broadcast`, {
        method: "POST",
        body: JSON.stringify({
          title: "Document Re-upload Requested",
          body: message,
          type: "SYSTEM",
          audience: "DRIVERS",
          data: { targetType: "COMPLIANCE", driverIds: driverId },
        }),
      }).catch(() => null);
      setBulkNotice(
        res ? `Re-upload request sent to ${driverName}.` : "Could not send request.",
      );
    },
    [dialog],
  );

  useEffect(() => {
    if (!bulkNotice) return;
    const t = setTimeout(() => setBulkNotice(null), 3500);
    return () => clearTimeout(t);
  }, [bulkNotice]);

  const handleExport = () => {
    const rows = [["Driver", "Phone", "Document", "Status", "Expiry Date", "Score"].join(",")];
    drivers.forEach((d) => {
      d.documents.forEach((doc) => {
        rows.push(
          [d.driverName, d.phone, doc.label, doc.status, doc.expiryDate || "N/A", `${d.complianceScore}%`].join(","),
        );
      });
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-compliance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor driver document validity, renewals, and compliance risk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={loadDrivers}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-xl text-sm text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Compliance Health Strip */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <HealthCard
          label="Total Documents"
          value={counts.totalDocs}
          sub={`${drivers.length} drivers`}
          icon={FileCheck}
          tone="blue"
        />
        <HealthCard
          label="Verified"
          value={counts.verified}
          sub={`${counts.totalDocs > 0 ? Math.round((counts.verified / counts.totalDocs) * 100) : 0}% of total`}
          icon={CheckCircle}
          tone="green"
        />
        <HealthCard
          label="Expiring Soon"
          value={counts.expiring}
          sub="Next 30 days"
          icon={Clock}
          tone="amber"
        />
        <HealthCard
          label="Expired"
          value={counts.expired}
          sub="Action required"
          icon={XCircle}
          tone="red"
          pulse={counts.expired > 0}
        />
        <HealthCard
          label="Pending Review"
          value={counts.pending}
          sub="Awaiting approval"
          icon={FileWarning}
          tone="blueLight"
        />
      </div>

      {/* Urgent Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Expiring Soon */}
        <ActionBlock
          title="Expiring Soon"
          subtitle={`Next ${URGENT_THRESHOLD} days`}
          toneColor="amber"
          icon={Clock}
          empty="No upcoming expiries — nice!"
          rows={urgentExpiring.map(({ driver, doc, days }) => ({
            key: `${driver.driverId}-${doc.type}`,
            avatar: driver.avatar,
            initial: driver.driverName.charAt(0),
            name: driver.driverName,
            secondary: `${doc.label} • ${days === 0 ? "today" : `${days}d`}`,
            ctaLabel: "Notify",
            ctaIcon: Bell,
            onCta: () => dialog.alert({ title: "Notify driver", message: `Notify ${driver.driverName} about ${doc.label}.`, tone: "info" }),
          }))}
        />

        {/* Expired */}
        <ActionBlock
          title="Expired Documents"
          subtitle="Driver may be blocked"
          toneColor="red"
          icon={XCircle}
          empty="No expired documents."
          rows={urgentExpired.map(({ driver, doc }) => ({
            key: `${driver.driverId}-${doc.type}`,
            avatar: driver.avatar,
            initial: driver.driverName.charAt(0),
            name: driver.driverName,
            secondary: `${doc.label} • ${friendlyDate(doc.expiryDate)}`,
            ctaLabel: "Block",
            ctaIcon: Ban,
            onCta: () => dialog.alert({ title: "Block driver", message: `Block ${driver.driverName}.`, tone: "danger" }),
            secondaryAction: {
              label: "Request Update",
              icon: Send,
              onClick: () => dialog.alert({ title: "Request update", message: `Request update from ${driver.driverName}.`, tone: "info" }),
            },
          }))}
        />

        {/* Pending Verification */}
        <ActionBlock
          title="Pending Verification"
          subtitle="Newly uploaded"
          toneColor="blue"
          icon={FileWarning}
          empty="Everything's up to date."
          rows={pendingVerification.map(({ driver, doc }) => ({
            key: `${driver.driverId}-${doc.type}`,
            avatar: driver.avatar,
            initial: driver.driverName.charAt(0),
            name: driver.driverName,
            secondary: doc.label,
            ctaLabel: "Approve",
            ctaIcon: CheckCircle,
            onCta: () => dialog.alert({ title: "Approve document", message: `Approve ${doc.label} for ${driver.driverName}.`, tone: "success" }),
            secondaryAction: {
              label: "Reject",
              icon: X,
              onClick: () => dialog.alert({ title: "Reject document", message: `Reject ${doc.label} for ${driver.driverName}.`, tone: "danger" }),
            },
          }))}
        />
      </div>

      {/* Smart Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              placeholder="Search by driver name or phone..."
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as DocStatus | "all")}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="all">All Status</option>
              <option value="valid">Verified</option>
              <option value="expiring">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="pending">Pending Review</option>
              <option value="missing">Missing</option>
            </select>
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="all">All Document Types</option>
              {DOC_TYPES.map((dt) => (
                <option key={dt.key} value={dt.key}>
                  {dt.label}
                </option>
              ))}
            </select>
            <select
              value={expiryWindow}
              onChange={(e) => setExpiryWindow(e.target.value as typeof expiryWindow)}
              className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="all">Any expiry</option>
              <option value="overdue">Overdue</option>
              <option value="7d">≤ 7 days</option>
              <option value="30d">≤ 30 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk notice banner */}
      {bulkNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2 text-sm text-emerald-800">
          {bulkNotice}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-center justify-between">
          <p className="text-sm font-medium text-orange-800">
            {selectedIds.size} selected
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={bulkApprove}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-60"
            >
              Bulk Approve
            </button>
            <button
              onClick={bulkNotify}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              Bulk Notify
            </button>
            <button
              onClick={bulkBlock}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-60"
            >
              Bulk Block
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkBusy}
              className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 disabled:opacity-60"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Smart Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No drivers match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      onChange={togglePageSelection}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Driver
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Compliance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Documents
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Next Expiry
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedDrivers.map((driver) => {
                  const StatusConf = STATUS_CONFIG[driver.overallStatus];
                  const nextExpiry = [...driver.documents]
                    .filter((d) => d.expiryDate && d.status !== "missing")
                    .sort(
                      (a, b) =>
                        new Date(a.expiryDate!).getTime() -
                        new Date(b.expiryDate!).getTime(),
                    )[0];
                  const rowTone =
                    driver.overallStatus === "expired"
                      ? "bg-red-50/40"
                      : driver.overallStatus === "expiring"
                        ? "bg-amber-50/30"
                        : "";
                  return (
                    <tr
                      key={driver.driverId}
                      className={`hover:bg-gray-50 transition-colors ${rowTone}`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(driver.driverId)}
                          onChange={() => toggleOne(driver.driverId)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                            {driver.avatar ? (
                              <img
                                src={driver.avatar}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-gray-500">
                                {driver.driverName.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">
                              {driver.driverName}
                            </p>
                            <p className="text-xs text-gray-500">{driver.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${StatusConf.bg} ${StatusConf.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${StatusConf.dot}`} />
                          {StatusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-40">
                        <ComplianceScore score={driver.complianceScore} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {driver.documents.map((doc) => (
                            <div
                              key={doc.type}
                              title={`${doc.label}: ${STATUS_CONFIG[doc.status].label}`}
                              className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[doc.status].dot}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {nextExpiry ? (
                          <span
                            className={
                              nextExpiry.status === "expired"
                                ? "text-red-600 font-semibold"
                                : nextExpiry.status === "expiring"
                                  ? "text-amber-700 font-semibold"
                                  : "text-gray-600"
                            }
                          >
                            {friendlyDate(nextExpiry.expiryDate)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setProfileDriver(driver)}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => approveDriver(driver.driverId, driver.driverName)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => requestReupload(driver.driverId, driver.driverName)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Request Re-upload"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => rejectDriver(driver.driverId, driver.driverName)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
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

      {!loading && filtered.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemLabel="drivers"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Automation Rules */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-500" />
            <p className="text-sm font-semibold text-gray-800">
              Automation Rules
            </p>
          </div>
          <span className="text-xs text-gray-400">Saved locally — wire to backend to persist</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <RuleToggle
            label={`Notify ${rules.notifyBeforeDays} days before expiry`}
            description="Auto-ping drivers via SMS/push before docs lapse"
            enabled={rules.notifyBefore}
            onToggle={() => setRules((r) => ({ ...r, notifyBefore: !r.notifyBefore }))}
            extra={
              <input
                type="number"
                min={1}
                max={14}
                value={rules.notifyBeforeDays}
                onChange={(e) =>
                  setRules((r) => ({
                    ...r,
                    notifyBeforeDays: Math.max(1, Number(e.target.value) || 1),
                  }))
                }
                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs"
              />
            }
          />
          <RuleToggle
            label={`Block driver if expired > ${rules.blockIfExpiredDays} days`}
            description="Prevent new assignments until renewed"
            enabled={rules.autoBlock}
            onToggle={() => setRules((r) => ({ ...r, autoBlock: !r.autoBlock }))}
            extra={
              <input
                type="number"
                min={0}
                max={30}
                value={rules.blockIfExpiredDays}
                onChange={(e) =>
                  setRules((r) => ({
                    ...r,
                    blockIfExpiredDays: Math.max(0, Number(e.target.value) || 0),
                  }))
                }
                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs"
              />
            }
          />
          <RuleToggle
            label="Auto-approve if verified source"
            description="Skip manual review for DigiLocker / API-verified docs"
            enabled={rules.autoApproveVerified}
            onToggle={() =>
              setRules((r) => ({ ...r, autoApproveVerified: !r.autoApproveVerified }))
            }
          />
        </div>
      </div>

      {/* Compliance Profile Panel */}
      {profileDriver && (
        <CompliancePanel
          driver={profileDriver}
          onClose={() => setProfileDriver(null)}
        />
      )}
    </div>
  );
};

// ─── Sub-components ───

const toneMap: Record<
  string,
  { bg: string; iconBg: string; iconColor: string; text: string; border: string }
> = {
  blue: {
    bg: "bg-white",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    text: "text-gray-900",
    border: "border-gray-100",
  },
  blueLight: {
    bg: "bg-white",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    text: "text-sky-700",
    border: "border-sky-100 !border-l-sky-500",
  },
  green: {
    bg: "bg-white",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    text: "text-green-600",
    border: "border-gray-100 !border-l-green-500",
  },
  amber: {
    bg: "bg-white",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    text: "text-amber-600",
    border: "border-gray-100 !border-l-amber-500",
  },
  red: {
    bg: "bg-white",
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    text: "text-red-600",
    border: "border-gray-100 !border-l-red-500",
  },
};

const HealthCard: React.FC<{
  label: string;
  value: number;
  sub: string;
  icon: React.ElementType;
  tone: "blue" | "blueLight" | "green" | "amber" | "red";
  pulse?: boolean;
}> = ({ label, value, sub, icon: Icon, tone, pulse }) => {
  const t = toneMap[tone];
  return (
    <div
      className={`${t.bg} rounded-2xl shadow-sm p-5 border border-l-4 ${t.border}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
            {pulse && (
              <span className={`w-2 h-2 rounded-full animate-pulse bg-red-500`} />
            )}
            {label}
          </p>
          <p className={`text-3xl font-bold ${t.text} mt-1`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div
          className={`w-12 h-12 ${t.iconBg} rounded-xl flex items-center justify-center`}
        >
          <Icon className={`w-6 h-6 ${t.iconColor}`} />
        </div>
      </div>
    </div>
  );
};

interface ActionRow {
  key: string;
  avatar?: string;
  initial: string;
  name: string;
  secondary: string;
  ctaLabel: string;
  ctaIcon: React.ElementType;
  onCta: () => void;
  secondaryAction?: {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
  };
}

const ActionBlock: React.FC<{
  title: string;
  subtitle: string;
  toneColor: "amber" | "red" | "blue";
  icon: React.ElementType;
  rows: ActionRow[];
  empty: string;
}> = ({ title, subtitle, toneColor, icon: Icon, rows, empty }) => {
  const colors = {
    amber: { head: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
    red: { head: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
    blue: { head: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  }[toneColor];
  return (
    <div
      className={`${colors.bg} rounded-2xl border ${colors.border} p-4 flex flex-col`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2">
          <Icon className={`w-5 h-5 ${colors.head} mt-0.5`} />
          <div>
            <p className={`font-semibold ${colors.head}`}>{title}</p>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
        </div>
        <span className={`text-xs font-bold ${colors.head}`}>{rows.length}</span>
      </div>
      <div className="space-y-2 flex-1">
        {rows.length === 0 ? (
          <p className="text-xs text-gray-400 italic py-6 text-center">{empty}</p>
        ) : (
          rows.map((r) => {
            const CtaIcon = r.ctaIcon;
            const SecIcon = r.secondaryAction?.icon;
            return (
              <div
                key={r.key}
                className="flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-gray-100"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {r.avatar ? (
                      <img src={r.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-gray-500">
                        {r.initial}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {r.name}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">{r.secondary}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {r.secondaryAction && SecIcon && (
                    <button
                      onClick={r.secondaryAction.onClick}
                      className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                      title={r.secondaryAction.label}
                    >
                      <SecIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={r.onCta}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white ${
                      toneColor === "red"
                        ? "bg-red-600 hover:bg-red-700"
                        : toneColor === "amber"
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    <CtaIcon className="w-3 h-3" />
                    {r.ctaLabel}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const ComplianceScore: React.FC<{ score: number }> = ({ score }) => {
  const tone =
    score >= 90
      ? { bar: "bg-green-500", text: "text-green-700", bg: "bg-green-50" }
      : score >= 70
        ? { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50" }
        : { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50" };
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-gray-100 min-w-[50px]">
        <div
          className={`h-full rounded-full ${tone.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${tone.text}`}>{score}%</span>
    </div>
  );
};

const RuleToggle: React.FC<{
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
}> = ({ label, description, enabled, onToggle, extra }) => (
  <div className="border border-gray-100 rounded-xl p-3 bg-gray-50">
    <div className="flex items-start justify-between gap-2 mb-2">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-colors ${
          enabled ? "bg-orange-500" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transform transition-transform ${
            enabled ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
    {extra && <div className="mt-2">{extra}</div>}
  </div>
);

const CompliancePanel: React.FC<{
  driver: DriverDoc;
  onClose: () => void;
}> = ({ driver, onClose }) => {
  const dialog = useDialog();
  const missing = driver.documents.filter((d) => d.status === "missing");
  const nonCompliant = driver.documents.filter(
    (d) => d.status === "expired" || d.status === "expiring" || d.status === "pending",
  );
  const compliant = driver.documents.filter((d) => d.status === "valid");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-xl h-full overflow-y-auto shadow-xl flex flex-col">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
              {driver.avatar ? (
                <img src={driver.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-gray-600">
                  {driver.driverName.charAt(0)}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">{driver.driverName}</h3>
              <p className="text-sm text-gray-500">{driver.phone}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 space-y-5">
          {/* Compliance score card */}
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-orange-600" />
                <p className="text-sm font-semibold text-orange-900">Compliance Score</p>
              </div>
              <Sparkles className="w-4 h-4 text-orange-500" />
            </div>
            <div className="flex items-end justify-between">
              <p className="text-5xl font-bold text-orange-600">
                {driver.complianceScore}
                <span className="text-2xl">%</span>
              </p>
              <div className="text-right">
                <p className="text-xs text-gray-600">
                  {compliant.length}/{driver.documents.length} documents verified
                </p>
                {missing.length > 0 && (
                  <p className="text-xs text-red-600 font-medium">
                    {missing.length} missing
                  </p>
                )}
                {nonCompliant.length > 0 && (
                  <p className="text-xs text-amber-700 font-medium">
                    {nonCompliant.length} need attention
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 h-2 bg-white/60 rounded-full">
              <div
                className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500"
                style={{ width: `${driver.complianceScore}%` }}
              />
            </div>
          </div>

          {/* Document list by status */}
          {[
            { title: "Needs Attention", docs: nonCompliant },
            { title: "Missing", docs: missing },
            { title: "Verified", docs: compliant },
          ].map((group) =>
            group.docs.length === 0 ? null : (
              <div key={group.title}>
                <p className="text-xs font-semibold uppercase text-gray-500 mb-2 tracking-wide">
                  {group.title}{" "}
                  <span className="text-gray-400">({group.docs.length})</span>
                </p>
                <div className="space-y-2">
                  {group.docs.map((doc) => {
                    const cfg = STATUS_CONFIG[doc.status];
                    const Icon = cfg.icon;
                    return (
                      <div
                        key={doc.type}
                        className={`border rounded-xl p-3 ${cfg.border} ${cfg.bg}/40`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${cfg.color}`} />
                            <span className="text-sm font-semibold text-gray-800">
                              {doc.label}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-semibold ${cfg.color}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <p className="text-xs text-gray-500">
                            {doc.expiryDate
                              ? friendlyDate(doc.expiryDate)
                              : doc.url
                                ? "No expiry"
                                : "Not uploaded"}
                          </p>
                          <div className="flex items-center gap-1">
                            {doc.url && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg"
                                title="View file"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {doc.status !== "valid" && (
                              <button
                                onClick={() =>
                                  dialog.alert({ title: "Request update", message: `Request ${doc.label} update.`, tone: "info" })
                                }
                                className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded-lg hover:bg-blue-700"
                              >
                                <Send className="w-3 h-3" />
                                Request
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center gap-2">
          <button
            onClick={async () => {
              // Was alert-only; now sends a real notification to this driver.
              const message = await dialog.prompt({
                title: `Notify ${driver.driverName}`,
                message: "This is sent to the driver as a notification.",
                tone: "info",
                defaultValue:
                  "Please update your documents to stay compliant.",
                required: true,
                multiline: true,
                confirmLabel: "Send",
              });
              if (!message) return;
              const res = await fetchApi(`/admin/notifications/broadcast`, {
                method: "POST",
                body: JSON.stringify({
                  title: "Document Compliance",
                  body: message,
                  type: "SYSTEM",
                  audience: "DRIVERS",
                  data: { targetType: "COMPLIANCE", driverIds: driver.driverId },
                }),
              }).catch(() => null);
              await dialog.alert({
                title: res ? "Sent" : "Failed",
                message: res
                  ? `Notification sent to ${driver.driverName}.`
                  : "Could not send notification.",
                tone: res ? "success" : "danger",
              });
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold hover:bg-blue-100"
          >
            <Bell className="w-4 h-4" />
            Notify
          </button>
          <button
            onClick={async () => {
              // Was alert-only; now actually suspends the driver.
              const reason = await dialog.prompt({
                title: `Block ${driver.driverName}?`,
                message:
                  "The driver will be suspended and taken offline. Provide a reason.",
                tone: "danger",
                defaultValue: "Document compliance",
                required: true,
                multiline: true,
                confirmLabel: "Block driver",
              });
              if (reason === null) return;
              const res = await fetchApi(`/admin/drivers/${driver.driverId}/status`, {
                method: "PUT",
                body: JSON.stringify({
                  status: "suspended",
                  reason: reason || "Document compliance",
                  isActive: false,
                }),
              }).catch(() => null);
              await dialog.alert({
                title: res ? "Driver blocked" : "Failed",
                message: res
                  ? `${driver.driverName} has been suspended.`
                  : "Could not block the driver.",
                tone: res ? "success" : "danger",
              });
              if (res) onClose();
            }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-700 font-semibold hover:bg-red-100"
          >
            <Ban className="w-4 h-4" />
            Block
          </button>
          <button
            onClick={onClose}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
          >
            <ChevronRight className="w-4 h-4" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentCompliancePage;
