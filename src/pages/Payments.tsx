import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Download,
  Search,
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Calendar,
  Filter,
  Bell,
  Loader2,
} from "lucide-react";
import {
  fetchAdminBookings,
  refundAdminBooking,
  sendNotificationBroadcast,
  type BookingRow,
  type BookingPaymentStatus,
} from "../services/api";
import { useDialog } from "../components/Layout/Dialog";

type PaymentRow = {
  id: string;
  bookingId: string;
  user: string;
  amount: number;
  method: string;
  status: BookingPaymentStatus;
  date: string;
  createdAt: string;
};

const STATUS_LABEL: Record<BookingPaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Completed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Refunded",
};

const personName = (p: BookingRow["userId"]): string => {
  if (!p) return "—";
  if (typeof p === "string") return "—";
  return p.fullName || "—";
};

const bookingToPayment = (b: BookingRow): PaymentRow => ({
  id: b._id,
  bookingId: b.bookingNumber || b._id.slice(-6).toUpperCase(),
  user: personName(b.userId),
  amount: b.finalFare ?? 0,
  method: b.paymentMethod || "—",
  status: b.paymentStatus,
  date: b.createdAt ? new Date(b.createdAt).toISOString().split("T")[0] : "",
  createdAt: b.createdAt,
});

const Payments: React.FC = () => {
  const dialog = useDialog();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BookingPaymentStatus | "">("");
  const [methodFilter, setMethodFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [refundFor, setRefundFor] = useState<PaymentRow | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdminBookings({
        paymentStatus: statusFilter || undefined,
        search: searchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 20,
      });
      const payload = res?.data ?? res ?? {};
      setBookings(Array.isArray(payload.bookings) ? payload.bookings : []);
      setTotal(payload.total ?? 0);
      setTotalPages(payload.totalPages ?? 1);
    } catch (err) {
      console.error("Payments load failed:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchTerm, dateFrom, dateTo, page]);

  useEffect(() => {
    const id = setTimeout(() => loadPayments(), 250);
    return () => clearTimeout(id);
  }, [loadPayments]);

  const payments = useMemo<PaymentRow[]>(
    () => bookings.map(bookingToPayment),
    [bookings],
  );

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter && p.method !== methodFilter) return false;
      return true;
    });
  }, [payments, methodFilter]);

  const methods = useMemo(() => {
    const set = new Set(payments.map((p) => p.method).filter(Boolean));
    return ["", ...Array.from(set)];
  }, [payments]);

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);
  const completedCount = filtered.filter((p) => p.status === "PAID").length;
  const pendingCount = filtered.filter((p) => p.status === "PENDING").length;
  const failedCount = filtered.filter((p) => p.status === "FAILED").length;
  const refundedRows = filtered.filter(
    (p) => p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED",
  );
  const refundedCount = refundedRows.length;
  const refundedAmount = refundedRows.reduce((s, p) => s + p.amount, 0);

  const failedPayments = filtered.filter((p) => p.status === "FAILED").slice(0, 3);

  const handleExport = () => {
    const rows = [
      ["Txn ID", "Booking ID", "User", "Amount", "Method", "Status", "Date"].join(","),
    ];
    filtered.forEach((p) => {
      rows.push(
        [
          p.id,
          p.bookingId,
          (p.user || "").replace(/,/g, ""),
          p.amount,
          p.method,
          STATUS_LABEL[p.status],
          p.date,
        ].join(","),
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const initiateRefund = (p: PaymentRow) => {
    setRefundFor(p);
    setRefundReason("");
    setRefundAmount(String(p.amount));
  };

  const confirmRefund = async () => {
    if (!refundFor) return;
    const amt = Number(refundAmount);
    if (!amt || amt <= 0) {
      await dialog.alert({ title: "Invalid amount", message: "Enter a valid refund amount.", tone: "warning" });
      return;
    }
    setSubmittingRefund(true);
    try {
      const res = await refundAdminBooking(refundFor.id, {
        amount: amt,
        reason: refundReason || undefined,
      });
      if (res?.success === false) {
        await dialog.alert({ title: "Refund failed", message: res.message || "Refund failed", tone: "danger" });
      } else {
        setRefundFor(null);
        loadPayments();
      }
    } catch (err: any) {
      await dialog.alert({ title: "Refund failed", message: err?.message || "Refund failed", tone: "danger" });
    } finally {
      setSubmittingRefund(false);
    }
  };

  const visiblePayments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((p) =>
      `${p.id} ${p.bookingId} ${p.user}`.toLowerCase().includes(q),
    );
  }, [filtered, searchTerm]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Page {page + 1} of {totalPages} · {total} transactions
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 bg-white shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span className="text-sm font-medium">Export CSV</span>
        </button>
      </div>

      {/* Failed payment alert strip */}
      {failedPayments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-800">
              {failedCount} failed payment{failedCount > 1 ? "s" : ""} in current view
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {failedPayments.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-red-200 text-xs text-red-700"
                >
                  {p.bookingId} · ₹{p.amount.toLocaleString()}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={async () => {
              // Was a stub; now sends a real broadcast to affected users.
              const message = await dialog.prompt({
                title: "Notify users about failed payments",
                message: `This will notify users of the ${failedPayments.length} failed payment(s).`,
                tone: "warning",
                defaultValue:
                  "Your recent payment could not be processed. Please retry from your bookings.",
                required: true,
                multiline: true,
                confirmLabel: "Send notification",
              });
              if (!message) return;
              const res = await sendNotificationBroadcast({
                title: "Payment Failed",
                body: message,
                type: "PAYMENT",
                audience: "USERS",
                data: {
                  targetType: "FAILED_PAYMENTS",
                  bookingIds: failedPayments.map((p) => p.bookingId).join(","),
                },
              }).catch(() => null);
              await dialog.alert({
                title: res?.success ? "Sent" : "Failed",
                message: res?.success
                  ? "Users have been notified."
                  : "Could not send the notification.",
                tone: res?.success ? "success" : "danger",
              });
            }}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700"
          >
            <Bell className="w-3 h-3" /> Notify
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Amount"
          value={`₹${totalAmount.toLocaleString()}`}
          sub={`${filtered.length} transactions`}
          Icon={DollarSign}
          tone="blue"
        />
        <StatCard
          label="Completed"
          value={`${completedCount}`}
          sub={`${filtered.length > 0 ? Math.round((completedCount / filtered.length) * 100) : 0}% success`}
          Icon={CheckCircle}
          tone="green"
        />
        <StatCard
          label="Pending"
          value={`${pendingCount}`}
          sub="Awaiting confirmation"
          Icon={Clock}
          tone="amber"
        />
        <StatCard
          label="Failed"
          value={`${failedCount}`}
          sub="Needs retry / review"
          Icon={XCircle}
          tone="red"
          pulse={failedCount > 0}
        />
        <StatCard
          label="Refunded"
          value={`₹${refundedAmount.toLocaleString()}`}
          sub={`${refundedCount} refund${refundedCount === 1 ? "" : "s"}`}
          Icon={RotateCcw}
          tone="purple"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by txn id, booking or user..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as BookingPaymentStatus | "");
                setPage(0);
              }}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              <option value="">All Status</option>
              <option value="PAID">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
              <option value="PARTIALLY_REFUNDED">Partially refunded</option>
            </select>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white"
            >
              {methods.map((m) => (
                <option key={m || "all"} value={m}>
                  {m ? m : "All Methods"}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-xl bg-white">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(0);
                }}
                className="text-xs outline-none bg-transparent"
              />
              <span className="text-gray-400 text-xs">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setPage(0);
                }}
                className="text-xs outline-none bg-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Txn ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Booking</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Method</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading payments…
                  </td>
                </tr>
              )}
              {!loading && visiblePayments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    No payments match your filters
                  </td>
                </tr>
              )}
              {!loading &&
                visiblePayments.map((p) => {
                  const rowTone =
                    p.status === "FAILED"
                      ? "bg-red-50/30"
                      : p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED"
                        ? "bg-purple-50/30"
                        : "";
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${rowTone}`}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {p.id.slice(-10).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{p.bookingId}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{p.user}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{p.method}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            p.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : p.status === "PENDING"
                                ? "bg-yellow-100 text-yellow-700"
                                : p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-red-100 text-red-700"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.status === "PAID"
                                ? "bg-green-500"
                                : p.status === "PENDING"
                                  ? "bg-yellow-500"
                                  : p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED"
                                    ? "bg-purple-500"
                                    : "bg-red-500"
                            }`}
                          />
                          {STATUS_LABEL[p.status]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{p.date}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.status === "PAID" && (
                            <button
                              onClick={() => initiateRefund(p)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100"
                              title="Refund"
                            >
                              <RotateCcw className="w-3 h-3" /> Refund
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

      {/* Refund modal */}
      {refundFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <p className="text-lg font-bold text-gray-900">Initiate Refund</p>
            <p className="text-sm text-gray-500 mt-1">
              Refund for booking {refundFor.bookingId} — paid ₹{refundFor.amount.toLocaleString()}
            </p>
            <label className="block text-xs font-medium text-gray-500 mt-4 mb-1">
              Refund amount (INR)
            </label>
            <input
              type="number"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm"
            />
            <label className="block text-xs font-medium text-gray-500 mt-3 mb-1">
              Reason (optional)
            </label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Reason for refund…"
              className="w-full p-3 border border-gray-200 rounded-xl text-sm"
              rows={3}
            />
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => setRefundFor(null)}
                disabled={submittingRefund}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmRefund}
                disabled={submittingRefund}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-60"
              >
                {submittingRefund ? "Refunding…" : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  Icon: React.ElementType;
  tone: "blue" | "green" | "amber" | "red" | "purple";
  pulse?: boolean;
}> = ({ label, value, sub, Icon, tone, pulse }) => {
  const toneMap = {
    blue: { bar: "!border-l-blue-500", iconBg: "bg-blue-100", iconColor: "text-blue-600", text: "text-blue-600" },
    green: { bar: "!border-l-green-500", iconBg: "bg-green-100", iconColor: "text-green-600", text: "text-green-600" },
    amber: { bar: "!border-l-amber-500", iconBg: "bg-amber-100", iconColor: "text-amber-600", text: "text-amber-600" },
    red: { bar: "!border-l-red-500", iconBg: "bg-red-100", iconColor: "text-red-600", text: "text-red-600" },
    purple: { bar: "!border-l-purple-500", iconBg: "bg-purple-100", iconColor: "text-purple-600", text: "text-purple-600" },
  }[tone];
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-5 border border-l-4 border-gray-100 ${toneMap.bar}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
            {pulse && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
            {label}
          </p>
          <p className={`text-2xl font-bold mt-1 ${toneMap.text}`}>{value}</p>
          <p className="text-xs text-gray-400 mt-1">{sub}</p>
        </div>
        <div className={`w-12 h-12 ${toneMap.iconBg} rounded-xl flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${toneMap.iconColor}`} />
        </div>
      </div>
    </div>
  );
};

export default Payments;
