import React, { useState, useEffect, useCallback } from "react";
import {
  FileCheck,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Download,
  ChevronDown,
  Eye,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";
const getToken = () => localStorage.getItem("adminToken");

const fetchApi = async (endpoint: string) => {
  const token = getToken();
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
};

type DocStatus = "valid" | "expiring" | "expired" | "missing";

interface DriverDoc {
  driverId: string;
  driverName: string;
  phone: string;
  avatar?: string;
  documents: {
    type: string;
    label: string;
    status: DocStatus;
    expiryDate?: string;
    uploadedAt?: string;
    url?: string;
  }[];
  overallStatus: DocStatus;
}

const STATUS_CONFIG: Record<DocStatus, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  valid: { color: "text-green-700", bg: "bg-green-100", icon: CheckCircle, label: "Valid" },
  expiring: { color: "text-amber-700", bg: "bg-amber-100", icon: Clock, label: "Expiring Soon" },
  expired: { color: "text-red-700", bg: "bg-red-100", icon: XCircle, label: "Expired" },
  missing: { color: "text-gray-500", bg: "bg-gray-100", icon: AlertTriangle, label: "Missing" },
};

const DOC_TYPES = [
  { key: "driving_license", label: "Driving License" },
  { key: "rc_book", label: "RC Book" },
  { key: "insurance", label: "Insurance" },
  { key: "permit", label: "Permit" },
  { key: "fitness", label: "Fitness Certificate" },
  { key: "puc", label: "PUC Certificate" },
  { key: "aadhar", label: "Aadhar Card" },
  { key: "pan", label: "PAN Card" },
];

const DAYS_THRESHOLD = 30; // days before expiry to mark as "expiring"

const classifyDocStatus = (doc: any): DocStatus => {
  if (!doc || !doc.url) return "missing";
  if (!doc.expiryDate) return "valid"; // no expiry = always valid
  const expiry = new Date(doc.expiryDate);
  const now = new Date();
  const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "expired";
  if (diffDays <= DAYS_THRESHOLD) return "expiring";
  return "valid";
};

const getOverallStatus = (docs: DriverDoc["documents"]): DocStatus => {
  if (docs.some((d) => d.status === "expired")) return "expired";
  if (docs.some((d) => d.status === "missing")) return "missing";
  if (docs.some((d) => d.status === "expiring")) return "expiring";
  return "valid";
};

const DocumentCompliancePage: React.FC = () => {
  const [drivers, setDrivers] = useState<DriverDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DocStatus | "all">("all");
  const [expandedDriver, setExpandedDriver] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchApi("/admin/drivers?limit=200");
      const driversData = response.data?.drivers || response.data || [];

      const driverDocs: DriverDoc[] = driversData.map((driver: any) => {
        const documents = DOC_TYPES.map((dt) => {
          const doc = driver.documents?.find((d: any) => d.type === dt.key || d.documentType === dt.key);
          const status = classifyDocStatus(doc);
          return {
            type: dt.key,
            label: dt.label,
            status,
            expiryDate: doc?.expiryDate,
            uploadedAt: doc?.uploadedAt || doc?.createdAt,
            url: doc?.url || doc?.frontImage || doc?.backImage,
          };
        });

        return {
          driverId: driver._id,
          driverName: `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || driver.name || "Unknown",
          phone: driver.phone || driver.mobileNumber || "",
          avatar: driver.profileImage || driver.avatar,
          documents,
          overallStatus: getOverallStatus(documents),
        };
      });

      setDrivers(driverDocs);
    } catch (err) {
      console.error("Load drivers error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDrivers(); }, [loadDrivers]);

  const filtered = drivers.filter((d) => {
    const matchesSearch = !search || d.driverName.toLowerCase().includes(search.toLowerCase()) || d.phone.includes(search);
    const matchesStatus = statusFilter === "all" || d.overallStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: drivers.length,
    valid: drivers.filter((d) => d.overallStatus === "valid").length,
    expiring: drivers.filter((d) => d.overallStatus === "expiring").length,
    expired: drivers.filter((d) => d.overallStatus === "expired").length,
    missing: drivers.filter((d) => d.overallStatus === "missing").length,
  };

  const handleExport = () => {
    const rows = [["Driver", "Phone", "Document", "Status", "Expiry Date"].join(",")];
    drivers.forEach((d) => {
      d.documents.forEach((doc) => {
        rows.push([d.driverName, d.phone, doc.label, doc.status, doc.expiryDate || "N/A"].join(","));
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
          <h1 className="text-2xl font-bold text-gray-800">Document Compliance</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor driver document validity with traffic-light indicators</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={loadDrivers} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Drivers", value: counts.total, color: "bg-blue-50 text-blue-700", icon: FileCheck },
          { label: "Fully Valid", value: counts.valid, color: "bg-green-50 text-green-700", icon: CheckCircle },
          { label: "Expiring Soon", value: counts.expiring, color: "bg-amber-50 text-amber-700", icon: Clock },
          { label: "Expired", value: counts.expired, color: "bg-red-50 text-red-700", icon: XCircle },
          { label: "Missing Docs", value: counts.missing, color: "bg-gray-50 text-gray-600", icon: AlertTriangle },
        ].map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color.split(" ")[0]}`}>
                <card.icon className={`w-5 h-5 ${card.color.split(" ")[1]}`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-movezy-500"
            placeholder="Search by driver name or phone..." />
        </div>
        <div className="flex gap-2">
          {(["all", "valid", "expiring", "expired", "missing"] as const).map((status) => (
            <button key={status} onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status ? "bg-movezy-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {status === "all" ? "All" : STATUS_CONFIG[status].label}
            </button>
          ))}
        </div>
      </div>

      {/* Driver List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-movezy-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No drivers match your filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((driver) => {
            const StatusConf = STATUS_CONFIG[driver.overallStatus];
            const isExpanded = expandedDriver === driver.driverId;
            return (
              <div key={driver.driverId} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <button onClick={() => setExpandedDriver(isExpanded ? null : driver.driverId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                      {driver.avatar ? (
                        <img src={driver.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-bold text-gray-500">{driver.driverName.charAt(0)}</span>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-800">{driver.driverName}</p>
                      <p className="text-xs text-gray-500">{driver.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Traffic light indicators */}
                    <div className="flex items-center gap-1">
                      {driver.documents.map((doc, i) => {
                        const dcfg = STATUS_CONFIG[doc.status];
                        return (
                          <div key={i} title={`${doc.label}: ${dcfg.label}`}
                            className={`w-3 h-3 rounded-full ${doc.status === "valid" ? "bg-green-500" : doc.status === "expiring" ? "bg-amber-500" : doc.status === "expired" ? "bg-red-500" : "bg-gray-300"}`} />
                        );
                      })}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${StatusConf.bg} ${StatusConf.color}`}>
                      {StatusConf.label}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      {driver.documents.map((doc) => {
                        const dcfg = STATUS_CONFIG[doc.status];
                        const Icon = dcfg.icon;
                        return (
                          <div key={doc.type} className={`p-3 rounded-lg border ${doc.status === "expired" ? "border-red-200 bg-red-50" : doc.status === "expiring" ? "border-amber-200 bg-amber-50" : doc.status === "missing" ? "border-gray-200 bg-gray-50" : "border-green-200 bg-green-50"}`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-700">{doc.label}</span>
                              <Icon className={`w-4 h-4 ${dcfg.color}`} />
                            </div>
                            <p className={`text-xs font-semibold ${dcfg.color}`}>{dcfg.label}</p>
                            {doc.expiryDate && (
                              <p className="text-[11px] text-gray-500 mt-0.5">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                            )}
                            {doc.url && (
                              <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 mt-1 text-[11px] text-movezy-600 hover:underline">
                                <Eye className="w-3 h-3" /> View
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DocumentCompliancePage;
