// src/pages/RefundApproval.tsx
//
// Dual-approval refund queue, aligned to the real backend contract:
//   GET  /admin/refunds            → { requests, stats, total, totalPages }
//   PUT  /admin/refunds/:id/approve-l1  { comment }
//   PUT  /admin/refunds/:id/approve-l2  { comment }
//   PUT  /admin/refunds/:id/reject      { comment, reason }  (≥15 chars)
//   PUT  /admin/refunds/:id/process     ← the call that actually moves money
// Statuses: PENDING_L1 | PENDING_L2 | APPROVED | REJECTED | PROCESSED.
// The previous version used lowercase statuses and fields the API never
// returned, so the page crashed on load and could never execute a refund.
import React, { useState, useEffect, useCallback } from "react";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Shield,
  ThumbsUp,
  ThumbsDown,
  X,
  Settings,
  Send,
} from "lucide-react";
import { refundApi, sessionApi } from "../services/admin-api";

// ── Types matching the backend documents ──
interface AdminRef {
  _id: string;
  fullName?: string;
  email?: string;
}

interface RefundRequest {
  _id: string;
  bookingId?: {
    _id: string;
    bookingNumber?: string;
    finalFare?: number;
    paymentMethod?: string;
  } | null;
  requestedBy?: AdminRef | null;
  amount: number;
  reason: string;
  status: "PENDING_L1" | "PENDING_L2" | "APPROVED" | "REJECTED" | "PROCESSED";
  level1ApprovedBy?: AdminRef | null;
  level1ApprovedAt?: string;
  level1Comment?: string;
  level2ApprovedBy?: AdminRef | null;
  level2ApprovedAt?: string;
  level2Comment?: string;
  rejectedBy?: AdminRef | null;
  rejectedAt?: string;
  rejectionReason?: string;
  processedAt?: string;
  createdAt: string;
}

interface StatusStat {
  _id: string;
  count: number;
  totalAmount: number;
}

const STATUS_META: Record<
  RefundRequest["status"],
  { label: string; chip: string }
> = {
  PENDING_L1: {
    label: "Awaiting L1",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
  },
  PENDING_L2: {
    label: "Awaiting L2",
    chip: "bg-blue-50 text-blue-700 border-blue-200",
  },
  APPROVED: {
    label: "Approved — not paid",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  REJECTED: {
    label: "Rejected",
    chip: "bg-red-50 text-red-600 border-red-200",
  },
  PROCESSED: {
    label: "Paid out",
    chip: "bg-gray-100 text-gray-600 border-gray-200",
  },
};

const money = (n?: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const when = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

type ActionKind = "approve-l1" | "approve-l2" | "reject" | "process";

const RefundApproval: React.FC = () => {
  const [requests, setRequests] = useState<RefundRequest[]>([]);
  const [stats, setStats] = useState<StatusStat[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Action modal
  const [action, setAction] = useState<{
    kind: ActionKind;
    request: RefundRequest;
  } | null>(null);
  const [comment, setComment] = useState("");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  // Detail drawer
  const [detail, setDetail] = useState<RefundRequest | null>(null);

  // Session config modal (kept from the old page, keys corrected)
  const [showConfig, setShowConfig] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [configBusy, setConfigBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await refundApi.getAll({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      const data = res?.data || {};
      setRequests(Array.isArray(data.requests) ? data.requests : []);
      setStats(Array.isArray(data.stats) ? data.stats : []);
      setTotal(Number(data.total || 0));
      setTotalPages(Number(data.totalPages || 1));
    } catch (e: any) {
      setError(e?.message || "Could not load refund requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  const statFor = (status: string) =>
    stats.find((s) => s._id === status) || { count: 0, totalAmount: 0 };

  // ── Actions ──
  const openAction = (kind: ActionKind, request: RefundRequest) => {
    setComment("");
    setActionError("");
    setAction({ kind, request });
  };

  const runAction = async () => {
    if (!action) return;
    const { kind, request } = action;

    if (kind !== "process") {
      const trimmed = comment.trim();
      const min = kind === "reject" ? 15 : 5;
      if (trimmed.length < min) {
        setActionError(
          kind === "reject"
            ? "Rejection reason must be at least 15 characters."
            : "A short comment is required (min 5 characters).",
        );
        return;
      }
    }

    setActionBusy(true);
    setActionError("");
    try {
      if (kind === "approve-l1") await refundApi.approveL1(request._id, comment.trim());
      else if (kind === "approve-l2") await refundApi.approveL2(request._id, comment.trim());
      else if (kind === "reject") await refundApi.reject(request._id, comment.trim());
      else await refundApi.process(request._id);
      setAction(null);
      await load();
    } catch (e: any) {
      setActionError(e?.message || "Action failed");
    } finally {
      setActionBusy(false);
    }
  };

  const openConfig = async () => {
    setShowConfig(true);
    try {
      const res = await sessionApi.getConfig();
      setConfig(res?.data?.config || null);
    } catch {
      setConfig(null);
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setConfigBusy(true);
    try {
      await sessionApi.updateConfig({
        sessionTimeoutMinutes: Number(config.sessionTimeoutMinutes) || 480,
        idleTimeoutMinutes: Number(config.idleTimeoutMinutes) || 15,
        maxConcurrentSessions: Number(config.maxConcurrentSessions) || 3,
        enforceIPWhitelist: !!config.enforceIPWhitelist,
        enforceTimeRestriction: !!config.enforceTimeRestriction,
      });
      setShowConfig(false);
    } catch {
      /* keep the modal open so nothing is silently lost */
    } finally {
      setConfigBusy(false);
    }
  };

  const actionTitles: Record<ActionKind, string> = {
    "approve-l1": "Approve — Level 1",
    "approve-l2": "Approve — Level 2 (final)",
    reject: "Reject refund",
    process: "Process payout",
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Refund Approval</h1>
          <p className="text-sm text-gray-500">
            Dual-approval queue · L1 review → L2 sign-off → payout
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openConfig}
            className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <Settings className="w-4 h-4" /> Session Config
          </button>
          <button
            onClick={load}
            className="px-3 py-2 text-sm border rounded-lg text-gray-600 hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats — real aggregates from the API */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(
          [
            ["PENDING_L1", Clock, "text-amber-500"],
            ["PENDING_L2", Shield, "text-blue-500"],
            ["APPROVED", CheckCircle, "text-emerald-500"],
            ["REJECTED", XCircle, "text-red-500"],
            ["PROCESSED", DollarSign, "text-gray-500"],
          ] as const
        ).map(([status, Icon, tint]) => {
          const s = statFor(status);
          return (
            <button
              key={status}
              onClick={() => {
                setPage(0);
                setStatusFilter(statusFilter === status ? "" : status);
              }}
              className={`bg-white rounded-xl border p-4 text-left transition ${
                statusFilter === status
                  ? "border-blue-400 ring-1 ring-blue-200"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${tint}`} />
                <span className="text-xs font-semibold text-gray-500 uppercase">
                  {STATUS_META[status].label}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-800 mt-1">{s.count}</p>
              <p className="text-xs text-gray-400">{money(s.totalAmount)}</p>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Requested by</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    Loading refund requests…
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                    No refund requests
                    {statusFilter
                      ? ` in ${STATUS_META[statusFilter as RefundRequest["status"]]?.label ?? statusFilter}`
                      : ""}
                    .
                  </td>
                </tr>
              ) : (
                requests.map((r) => {
                  const meta = STATUS_META[r.status];
                  const fare = r.bookingId?.finalFare;
                  const overFare = fare != null && r.amount > fare;
                  return (
                    <tr
                      key={r._id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setDetail(r)}
                    >
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {r.bookingId?.bookingNumber || "—"}
                        <p className="text-xs text-gray-400">
                          {r.bookingId?.paymentMethod || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{money(r.amount)}</span>
                        {fare != null && (
                          <p
                            className={`text-xs ${
                              overFare
                                ? "text-red-600 font-semibold"
                                : "text-gray-400"
                            }`}
                          >
                            of {money(fare)} fare
                            {overFare ? " — exceeds fare!" : ""}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-[220px]">
                        <p className="truncate text-gray-600" title={r.reason}>
                          {r.reason || "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {r.requestedBy?.fullName || r.requestedBy?.email || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${meta.chip}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {when(r.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(r.status === "PENDING_L1" ||
                            r.status === "PENDING_L2") && (
                            <>
                              <button
                                onClick={() =>
                                  openAction(
                                    r.status === "PENDING_L1"
                                      ? "approve-l1"
                                      : "approve-l2",
                                    r,
                                  )
                                }
                                className={`px-2.5 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1 ${
                                  r.status === "PENDING_L1"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                }`}
                              >
                                {r.status === "PENDING_L1" ? (
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                ) : (
                                  <Shield className="w-3.5 h-3.5" />
                                )}
                                {r.status === "PENDING_L1"
                                  ? "Approve L1"
                                  : "Approve L2"}
                              </button>
                              <button
                                onClick={() => openAction("reject", r)}
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 flex items-center gap-1"
                              >
                                <ThumbsDown className="w-3.5 h-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {r.status === "APPROVED" && (
                            <button
                              onClick={() => openAction("process", r)}
                              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 flex items-center gap-1"
                            >
                              <Send className="w-3.5 h-3.5" /> Process payout
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-500">
          <span>
            {total} request{total === 1 ? "" : "s"}
            {statusFilter ? " (filtered)" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Prev
            </button>
            <span>
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ── Action modal ── */}
      {action && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {actionTitles[action.kind]}
                </h3>
                <p className="text-sm text-gray-500">
                  {action.request.bookingId?.bookingNumber || "—"} ·{" "}
                  {money(action.request.amount)}
                </p>
              </div>
              <button onClick={() => setAction(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {action.kind === "process" ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
                This triggers the actual payment
                {action.request.bookingId?.paymentMethod === "CASH"
                  ? " (wallet credit for a cash booking)"
                  : " via the payment gateway"}
                . It cannot be undone.
              </div>
            ) : (
              <>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {action.kind === "reject"
                    ? "Rejection reason (min 15 characters — recorded on the request)"
                    : "Comment (recorded in the audit trail)"}
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder={
                    action.kind === "reject"
                      ? "Why is this refund being rejected?"
                      : "Why is this refund justified?"
                  }
                />
              </>
            )}

            {actionError && (
              <p className="text-sm text-red-600 mt-2">{actionError}</p>
            )}

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setAction(null)}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={runAction}
                disabled={actionBusy}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 ${
                  action.kind === "reject"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {actionBusy ? "Working…" : actionTitles[action.kind]}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail drawer ── */}
      {detail && (
        <div
          className="fixed inset-0 bg-black/40 flex justify-end z-50"
          onClick={() => setDetail(null)}
        >
          <div
            className="bg-white w-full max-w-md h-full overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  {detail.bookingId?.bookingNumber || "Refund request"}
                </h3>
                <span
                  className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-medium border ${STATUS_META[detail.status].chip}`}
                >
                  {STATUS_META[detail.status].label}
                </span>
              </div>
              <button onClick={() => setDetail(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Refund amount</p>
                  <p className="font-bold text-gray-800">{money(detail.amount)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Booking fare</p>
                  <p className="font-bold text-gray-800">
                    {money(detail.bookingId?.finalFare)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Reason
                </p>
                <p className="text-gray-700">{detail.reason || "—"}</p>
              </div>

              {/* Approval trail — real fields, in order */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Approval trail
                </p>
                <ol className="space-y-3 border-l-2 border-gray-100 pl-4">
                  <li>
                    <p className="font-medium text-gray-700">Requested</p>
                    <p className="text-xs text-gray-500">
                      {detail.requestedBy?.fullName || "—"} ·{" "}
                      {when(detail.createdAt)}
                    </p>
                  </li>
                  {detail.level1ApprovedAt && (
                    <li>
                      <p className="font-medium text-emerald-700">L1 approved</p>
                      <p className="text-xs text-gray-500">
                        {detail.level1ApprovedBy?.fullName || "—"} ·{" "}
                        {when(detail.level1ApprovedAt)}
                      </p>
                      {detail.level1Comment && (
                        <p className="text-xs text-gray-600 mt-0.5 italic">
                          "{detail.level1Comment}"
                        </p>
                      )}
                    </li>
                  )}
                  {detail.level2ApprovedAt && (
                    <li>
                      <p className="font-medium text-blue-700">L2 approved</p>
                      <p className="text-xs text-gray-500">
                        {detail.level2ApprovedBy?.fullName || "—"} ·{" "}
                        {when(detail.level2ApprovedAt)}
                      </p>
                      {detail.level2Comment && (
                        <p className="text-xs text-gray-600 mt-0.5 italic">
                          "{detail.level2Comment}"
                        </p>
                      )}
                    </li>
                  )}
                  {detail.rejectedAt && (
                    <li>
                      <p className="font-medium text-red-600">Rejected</p>
                      <p className="text-xs text-gray-500">
                        {detail.rejectedBy?.fullName || "—"} ·{" "}
                        {when(detail.rejectedAt)}
                      </p>
                      {detail.rejectionReason && (
                        <p className="text-xs text-gray-600 mt-0.5 italic">
                          "{detail.rejectionReason}"
                        </p>
                      )}
                    </li>
                  )}
                  {detail.processedAt && (
                    <li>
                      <p className="font-medium text-gray-800">
                        Payout processed
                      </p>
                      <p className="text-xs text-gray-500">
                        {when(detail.processedAt)}
                      </p>
                    </li>
                  )}
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Session config modal (keys match the backend now) ── */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Session Configuration
              </h3>
              <button onClick={() => setShowConfig(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            {!config ? (
              <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-gray-600">Session timeout (min)</span>
                    <input
                      type="number"
                      value={config.sessionTimeoutMinutes ?? 480}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          sessionTimeoutMinutes: e.target.value,
                        })
                      }
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    />
                  </label>
                  <label className="block">
                    <span className="text-gray-600">Idle timeout (min)</span>
                    <input
                      type="number"
                      value={config.idleTimeoutMinutes ?? 15}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          idleTimeoutMinutes: e.target.value,
                        })
                      }
                      className="mt-1 w-full border rounded-lg px-3 py-2"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-gray-600">Max concurrent sessions</span>
                  <input
                    type="number"
                    value={config.maxConcurrentSessions ?? 3}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        maxConcurrentSessions: e.target.value,
                      })
                    }
                    className="mt-1 w-full border rounded-lg px-3 py-2"
                  />
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!config.enforceIPWhitelist}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        enforceIPWhitelist: e.target.checked,
                      })
                    }
                  />
                  <span className="text-gray-600">Enforce IP whitelist</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!config.enforceTimeRestriction}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        enforceTimeRestriction: e.target.checked,
                      })
                    }
                  />
                  <span className="text-gray-600">
                    Enforce access-time restriction
                  </span>
                </label>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowConfig(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveConfig}
                    disabled={configBusy}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {configBusy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RefundApproval;
