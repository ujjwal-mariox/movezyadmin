import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CreditCard,
  Package,
  Shield,
  AlertCircle,
  Loader2,
} from "lucide-react";
import {
  fetchAdminUserById,
  fetchAdminUserBookings,
  fetchAdminUserTransactions,
  type AdminUserDetailResponse,
  type AdminUserBookingRow,
  type AdminUserTransactionRow,
  type AdminUserAddress,
} from "../services/api";

const formatDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const formatAddress = (a: AdminUserAddress | null): string => {
  if (!a) return "No address on file";
  return [a.houseNo, a.address, a.area, a.city, a.state, a.pinCode]
    .filter(Boolean)
    .join(", ");
};

const bookingLocationText = (loc: unknown): string => {
  if (!loc) return "—";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object" && loc !== null && "address" in loc) {
    const addr = (loc as { address?: string }).address;
    return addr || "—";
  }
  return "—";
};

const bookingStatusClass = (status?: string) => {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "CANCELLED":
    case "REJECTED":
      return "bg-red-100 text-red-800";
    case "IN_PROGRESS":
    case "ASSIGNED":
    case "PICKED_UP":
      return "bg-blue-100 text-blue-800";
    default:
      return "bg-yellow-100 text-yellow-800";
  }
};

const txnStatusClass = (status?: string) => {
  if (!status) return "bg-gray-100 text-gray-700";
  const s = status.toUpperCase();
  if (s === "SUCCESS" || s === "COMPLETED") return "bg-green-100 text-green-800";
  if (s === "FAILED") return "bg-red-100 text-red-800";
  if (s === "PENDING") return "bg-yellow-100 text-yellow-800";
  return "bg-gray-100 text-gray-700";
};

const UserDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<AdminUserDetailResponse | null>(null);
  const [bookings, setBookings] = useState<AdminUserBookingRow[]>([]);
  const [transactions, setTransactions] = useState<AdminUserTransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, bookingsRes, txnRes] = await Promise.all([
        fetchAdminUserById(id),
        fetchAdminUserBookings(id, { page: 0, limit: 10 }),
        fetchAdminUserTransactions(id, { page: 0, limit: 10 }),
      ]);

      if (detailRes?.success === false) {
        setError(detailRes?.message || "Failed to load user");
      } else {
        setDetail(detailRes?.data ?? detailRes);
      }
      setBookings(bookingsRes?.data?.bookings || bookingsRes?.bookings || []);
      setTransactions(
        txnRes?.data?.transactions || txnRes?.transactions || [],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load user");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const user = detail?.user;
  const wallet = detail?.wallet;
  const coinWallet = detail?.coinWallet;
  const addresses = detail?.addresses || [];

  const primaryAddress = useMemo<AdminUserAddress | null>(() => {
    const list = addresses as AdminUserAddress[];
    if (!list.length) return null;
    return list.find((a) => a.isSelected) || list[0] || null;
  }, [addresses]);

  const totalCompleted = useMemo(() => {
    return detail?.bookingStats?.find((s) => s._id === "COMPLETED")?.count ?? 0;
  }, [detail]);

  const totalBookingsAll = useMemo(() => {
    return detail?.bookingStats?.reduce((sum, s) => sum + (s.count || 0), 0) ?? 0;
  }, [detail]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-6 space-y-4">
        <button
          onClick={() => navigate("/admin/users")}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-5 h-5" /> Back to users
        </button>
        <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error || "User not found"}
        </div>
      </div>
    );
  }

  const statusLabel = user.isDeleted
    ? "Deleted"
    : user.isBlocked
      ? "Blocked"
      : user.isActive
        ? "Active"
        : "Inactive";
  const statusClass = user.isDeleted
    ? "bg-gray-200 text-gray-700"
    : user.isBlocked
      ? "bg-red-100 text-red-800"
      : user.isActive
        ? "bg-green-100 text-green-800"
        : "bg-yellow-100 text-yellow-800";

  const profilePicture =
    (user as { profilePicture?: string }).profilePicture ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.fullName || user.email || "U")}`;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate("/admin/users")}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Details</h1>
          <p className="text-gray-500">View and manage user information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex flex-col items-center text-center mb-6">
              <img
                src={profilePicture}
                alt={user.fullName || "User"}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-50 mb-4 bg-gray-100"
              />
              <h2 className="text-xl font-bold text-gray-900">
                {user.fullName || "Unnamed user"}
              </h2>
              <span
                className={`mt-2 px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}
              >
                {statusLabel}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-sm break-all">{user.email || "—"}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-sm">{user.mobileNumber || "—"}</span>
              </div>
              <div className="flex items-start gap-3 text-gray-600">
                <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                <span className="text-sm">{formatAddress(primaryAddress)}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-sm">
                  {user.isVerified ? "Verified" : "Unverified"} · Referral{" "}
                  {user.referralCode || "—"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Wallet Balance</span>
                <span className="text-lg font-bold text-gray-900">
                  ₹{(wallet?.balance ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Coin Balance</span>
                <span className="text-lg font-bold text-gray-900">
                  {(coinWallet?.balance ?? 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Total Bookings</span>
                <span className="text-lg font-bold text-gray-900">
                  {totalBookingsAll}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Completed</span>
                <span className="text-lg font-bold text-gray-900">
                  {totalCompleted}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-movezy-600" />
                Recent Bookings
              </h3>
              <span className="text-xs text-gray-500">
                Showing latest {bookings.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">ID</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Route</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Fare</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                        No bookings yet
                      </td>
                    </tr>
                  )}
                  {bookings.map((booking) => {
                    const fare = booking.finalFare ?? booking.totalFare ?? 0;
                    return (
                      <tr key={booking._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {booking.orderId || booking._id.slice(-6).toUpperCase()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-gray-900 truncate max-w-[220px]">
                              {bookingLocationText(booking.pickupLocation)}
                            </span>
                            <span className="text-gray-400 text-xs">to</span>
                            <span className="text-gray-900 truncate max-w-[220px]">
                              {bookingLocationText(booking.dropLocation)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatDate(booking.createdAt)}
                        </td>
                        <td className="px-6 py-4 font-medium">
                          ₹{fare.toLocaleString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${bookingStatusClass(booking.status)}`}
                          >
                            {booking.status || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-movezy-600" />
                Payment History
              </h3>
              <span className="text-xs text-gray-500">
                Showing latest {transactions.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Transaction ID</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Type</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Amount</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Method</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        No wallet transactions yet
                      </td>
                    </tr>
                  )}
                  {transactions.map((txn) => (
                    <tr key={txn._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 text-xs">
                        {txn._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{txn.type || "—"}</td>
                      <td className="px-6 py-4 text-gray-500">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {txn.type === "DEBIT" ? "-" : "+"}₹
                        {(txn.amount ?? 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {txn.method || "Wallet"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${txnStatusClass(txn.status)}`}
                        >
                          {txn.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetail;
