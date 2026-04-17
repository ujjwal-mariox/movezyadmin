// src/pages/RefundApproval.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  MessageSquare,
  DollarSign,
  User,
  Shield,
  FileText,
  ThumbsUp,
  ThumbsDown,
  X,
  Settings,
  Timer,
  Lock,
} from "lucide-react";
import { refundApi, sessionApi } from "../services/admin-api";

interface RefundRequest {
  _id: string;
  orderId: string;
  trackingId: string;
  userId: { _id: string; fullName: string; email: string };
  amount: number;
  reason: string;
  status: "pending" | "first_approved" | "approved" | "rejected";
  firstApprovedBy?: { _id: string; fullName: string };
  firstApprovedAt?: string;
  secondApprovedBy?: { _id: string; fullName: string };
  secondApprovedAt?: string;
  rejectedBy?: { _id: string; fullName: string };
  rejectedAt?: string;
  rejectionReason?: string;
  requestedBy: { _id: string; fullName: string };
  createdAt: string;
  updatedAt: string;
  comments: Array<{
    _id: string;
    adminId: { _id: string; fullName: string };
    comment: string;
    createdAt: string;
  }>;
}

interface SessionConfig {
  sessionTimeout: number;
  maxConcurrentSessions: number;
  enforceIpWhitelist: boolean;
  enforceTimeRestrictions: boolean;
}

const RefundApproval: React.FC = () => {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "first_approved" | "approved" | "rejected">("all");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject">("approve");
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Session config state
  const [showSessionConfig, setShowSessionConfig] = useState(false);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig>({
    sessionTimeout: 30,
    maxConcurrentSessions: 3,
    enforceIpWhitelist: false,
    enforceTimeRestrictions: false,
  });

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await refundApi.getAll(params);
      setRefunds(response.data?.refunds || response.data || []);
    } catch (err) {
      console.error("Failed to load refunds:", err);
      showToast("error", "Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, showToast]);

  const loadSessionConfig = useCallback(async () => {
    try {
      const response = await sessionApi.getConfig();
      if (response.data) {
        setSessionConfig(response.data);
      }
    } catch (err) {
      console.error("Failed to load session config:", err);
    }
  }, []);

  useEffect(() => {
    loadRefunds();
    loadSessionConfig();
  }, [loadRefunds, loadSessionConfig]);

  const handleAction = async () => {
    if (!selectedRefund || !comment.trim()) {
      showToast("error", "Comment is required");
      return;
    }

    setActionLoading(true);
    try {
      if (actionType === "approve") {
        if (selectedRefund.status === "pending") {
          await refundApi.approveL1(selectedRefund._id, comment);
        } else {
          await refundApi.approveL2(selectedRefund._id, comment);
        }
        showToast("success", "Refund approved successfully");
      } else {
        await refundApi.reject(selectedRefund._id, comment);
        showToast("success", "Refund rejected");
      }
      setActionModalOpen(false);
      setComment("");
      loadRefunds();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Action failed";
      showToast("error", errorMessage);
    } finally {
      setActionLoading(false);
    }
  };

  const saveSessionConfig = async () => {
    try {
      await sessionApi.updateConfig(sessionConfig);
      showToast("success", "Session configuration updated");
      setShowSessionConfig(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save configuration";
      showToast("error", errorMessage);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending", bg: "bg-yellow-100", text: "text-yellow-800", icon: Clock };
      case "first_approved":
        return { label: "First Approval", bg: "bg-blue-100", text: "text-blue-800", icon: Shield };
      case "approved":
        return { label: "Approved", bg: "bg-green-100", text: "text-green-800", icon: CheckCircle };
      case "rejected":
        return { label: "Rejected", bg: "bg-red-100", text: "text-red-800", icon: XCircle };
      default:
        return { label: status, bg: "bg-gray-100", text: "text-gray-800", icon: AlertTriangle };
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const stats = {
    total: refunds.length,
    pending: refunds.filter((r) => r.status === "pending").length,
    firstApproved: refunds.filter((r) => r.status === "first_approved").length,
    approved: refunds.filter((r) => r.status === "approved").length,
    rejected: refunds.filter((r) => r.status === "rejected").length,
  };

  const filteredRefunds = refunds.filter((r) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !r.trackingId?.toLowerCase().includes(q) &&
        !r.userId?.fullName?.toLowerCase().includes(q) &&
        !r.reason?.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 ${
            toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-movezy-500" />
            Refund Approvals
          </h2>
          <p className="text-sm text-gray-500">Dual-approval workflow for refund requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSessionConfig(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200"
          >
            <Settings className="w-4 h-4" />
            Session Config
          </button>
          <button
            onClick={loadRefunds}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Requests", value: stats.total, color: "gray", filter: "all" as const },
          { label: "Pending", value: stats.pending, color: "yellow", filter: "pending" as const },
          { label: "First Approved", value: stats.firstApproved, color: "blue", filter: "first_approved" as const },
          { label: "Fully Approved", value: stats.approved, color: "green", filter: "approved" as const },
          { label: "Rejected", value: stats.rejected, color: "red", filter: "rejected" as const },
        ].map((stat) => (
          <div
            key={stat.label}
            onClick={() => setStatusFilter(stat.filter)}
            className={`bg-white rounded-2xl shadow-sm p-4 border cursor-pointer transition-all ${
              statusFilter === stat.filter
                ? `border-${stat.color}-500 ring-2 ring-${stat.color}-200`
                : "border-gray-100 hover:border-gray-200"
            }`}
          >
            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer, or reason..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="first_approved">First Approved</option>
            <option value="approved">Fully Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Refund List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 animate-spin" />
            Loading refund requests...
          </div>
        ) : filteredRefunds.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No refund requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRefunds.map((refund) => {
                  const statusConfig = getStatusConfig(refund.status);
                  const StatusIcon = statusConfig.icon;
                  return (
                    <tr key={refund._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-800">#{refund.trackingId}</p>
                        <p className="text-xs text-gray-500">{refund.orderId}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-800">{refund.userId?.fullName || "-"}</p>
                        <p className="text-xs text-gray-500">{refund.userId?.email || "-"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-800">{formatCurrency(refund.amount)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate">{refund.reason}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConfig.label}
                        </span>
                        {refund.status === "first_approved" && (
                          <p className="text-[10px] text-blue-600 mt-1">
                            By {refund.firstApprovedBy?.fullName}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{formatDate(refund.createdAt)}</p>
                        <p className="text-xs text-gray-400">by {refund.requestedBy?.fullName}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedRefund(refund);
                              setDetailModalOpen(true);
                            }}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(refund.status === "pending" || refund.status === "first_approved") && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedRefund(refund);
                                  setActionType("approve");
                                  setComment("");
                                  setActionModalOpen(true);
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Approve"
                              >
                                <ThumbsUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRefund(refund);
                                  setActionType("reject");
                                  setComment("");
                                  setActionModalOpen(true);
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Reject"
                              >
                                <ThumbsDown className="w-4 h-4" />
                              </button>
                            </>
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

      {/* Detail Modal */}
      {detailModalOpen && selectedRefund && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Refund Request Details</h3>
                <p className="text-sm text-gray-500">#{selectedRefund.trackingId}</p>
              </div>
              <button onClick={() => setDetailModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Refund Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(selectedRefund.amount)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  {(() => {
                    const cfg = getStatusConfig(selectedRefund.status);
                    const Icon = cfg.icon;
                    return (
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${cfg.bg} ${cfg.text}`}>
                        <Icon className="w-4 h-4" /> {cfg.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Customer */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">Customer</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-movezy-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-movezy-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedRefund.userId?.fullName || "-"}</p>
                    <p className="text-sm text-gray-500">{selectedRefund.userId?.email || "-"}</p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">Reason for Refund</p>
                <p className="text-gray-800">{selectedRefund.reason}</p>
              </div>

              {/* Approval Timeline */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-3">Approval Timeline</p>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">Requested</p>
                      <p className="text-sm text-gray-500">
                        {formatDate(selectedRefund.createdAt)} by {selectedRefund.requestedBy?.fullName}
                      </p>
                    </div>
                  </div>
                  {selectedRefund.firstApprovedBy && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">First Approval</p>
                        <p className="text-sm text-gray-500">
                          {selectedRefund.firstApprovedAt && formatDate(selectedRefund.firstApprovedAt)} by{" "}
                          {selectedRefund.firstApprovedBy.fullName}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedRefund.secondApprovedBy && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Final Approval</p>
                        <p className="text-sm text-gray-500">
                          {selectedRefund.secondApprovedAt && formatDate(selectedRefund.secondApprovedAt)} by{" "}
                          {selectedRefund.secondApprovedBy.fullName}
                        </p>
                      </div>
                    </div>
                  )}
                  {selectedRefund.rejectedBy && (
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <XCircle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">Rejected</p>
                        <p className="text-sm text-gray-500">
                          {selectedRefund.rejectedAt && formatDate(selectedRefund.rejectedAt)} by{" "}
                          {selectedRefund.rejectedBy.fullName}
                        </p>
                        {selectedRefund.rejectionReason && (
                          <p className="text-sm text-red-600 mt-1">Reason: {selectedRefund.rejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              {selectedRefund.comments && selectedRefund.comments.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3">Comments</p>
                  <div className="space-y-3">
                    {selectedRefund.comments.map((c) => (
                      <div key={c._id} className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-sm text-gray-800">{c.comment}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {c.adminId?.fullName} • {formatDate(c.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              {(selectedRefund.status === "pending" || selectedRefund.status === "first_approved") && (
                <>
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      setActionType("reject");
                      setComment("");
                      setActionModalOpen(true);
                    }}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-200"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setDetailModalOpen(false);
                      setActionType("approve");
                      setComment("");
                      setActionModalOpen(true);
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600"
                  >
                    {selectedRefund.status === "pending" ? "First Approval" : "Final Approval"}
                  </button>
                </>
              )}
              <button onClick={() => setDetailModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal (Mandatory Comment) */}
      {actionModalOpen && selectedRefund && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                {actionType === "approve" ? (
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <ThumbsUp className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <ThumbsDown className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-800">
                    {actionType === "approve"
                      ? selectedRefund.status === "pending"
                        ? "First Approval"
                        : "Final Approval"
                      : "Reject Refund"}
                  </h3>
                  <p className="text-sm text-gray-500">{formatCurrency(selectedRefund.amount)} for #{selectedRefund.trackingId}</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 flex items-start gap-2">
                <MessageSquare className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Comment Required</p>
                  <p className="text-yellow-700">All approval/rejection actions require a mandatory comment for audit purposes.</p>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {actionType === "approve" ? "Approval Comment" : "Rejection Reason"} *
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={actionType === "approve" ? "Enter your approval comment..." : "Enter reason for rejection..."}
                rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500 resize-none"
              />
              {actionType === "approve" && selectedRefund.status === "pending" && (
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  This is the first approval. A second approval from another admin is required.
                </p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => {
                  setActionModalOpen(false);
                  setComment("");
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={!comment.trim() || actionLoading}
                className={`px-4 py-2 rounded-xl text-white disabled:opacity-50 flex items-center gap-2 ${
                  actionType === "approve" ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                }`}
              >
                {actionLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
                {actionType === "approve" ? "Approve" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Session Config Modal */}
      {showSessionConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-movezy-100 rounded-full flex items-center justify-center">
                  <Lock className="w-5 h-5 text-movezy-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Session Configuration</h3>
                  <p className="text-sm text-gray-500">Auto-logout and security settings</p>
                </div>
              </div>
              <button onClick={() => setShowSessionConfig(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              {/* Session Timeout */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Timer className="w-4 h-4" />
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={sessionConfig.sessionTimeout}
                  onChange={(e) =>
                    setSessionConfig({ ...sessionConfig, sessionTimeout: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                />
                <p className="text-xs text-gray-500 mt-1">Auto-logout after this many minutes of inactivity</p>
              </div>

              {/* Max Concurrent Sessions */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4" />
                  Max Concurrent Sessions
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={sessionConfig.maxConcurrentSessions}
                  onChange={(e) =>
                    setSessionConfig({ ...sessionConfig, maxConcurrentSessions: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                />
                <p className="text-xs text-gray-500 mt-1">Maximum number of active sessions per admin</p>
              </div>

              {/* Enforce IP Whitelist */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">Enforce IP Whitelist</p>
                  <p className="text-sm text-gray-500">Restrict access to whitelisted IPs only</p>
                </div>
                <button
                  onClick={() =>
                    setSessionConfig({
                      ...sessionConfig,
                      enforceIpWhitelist: !sessionConfig.enforceIpWhitelist,
                    })
                  }
                  className={`w-12 h-7 rounded-full transition-colors ${
                    sessionConfig.enforceIpWhitelist ? "bg-movezy-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      sessionConfig.enforceIpWhitelist ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Enforce Time Restrictions */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">Enforce Time Restrictions</p>
                  <p className="text-sm text-gray-500">Only allow login during business hours</p>
                </div>
                <button
                  onClick={() =>
                    setSessionConfig({
                      ...sessionConfig,
                      enforceTimeRestrictions: !sessionConfig.enforceTimeRestrictions,
                    })
                  }
                  className={`w-12 h-7 rounded-full transition-colors ${
                    sessionConfig.enforceTimeRestrictions ? "bg-movezy-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      sessionConfig.enforceTimeRestrictions ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowSessionConfig(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl">
                Cancel
              </button>
              <button onClick={saveSessionConfig} className="px-4 py-2 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600">
                Save Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundApproval;
