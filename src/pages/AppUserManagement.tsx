// src/pages/AppUserManagement.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  Download,
  Eye,
  Ban,
  Unlock,
  Phone,
  Mail,
  Package,
  Coins,
  Gift,
  X,
  Clock,
  TrendingUp,
  AlertTriangle,
  Check,
  Loader2,
  Wallet as WalletIcon,
} from "lucide-react";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";
import { useDialog } from "../components/Layout/Dialog";
import {
  fetchAdminUsers,
  fetchAdminUserStats,
  blockAdminUser,
  unblockAdminUser,
  adjustAdminUserCoins,
  type AdminUserRow,
  type AdminUserStats,
} from "../services/api";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (dateString?: string) =>
  dateString
    ? new Date(dateString).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const getTimeAgo = (dateString?: string) => {
  if (!dateString) return "Never";
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const AppUserManagement: React.FC = () => {
  const dialog = useDialog();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "ACTIVE" | "BLOCKED" | "INACTIVE"
  >("ALL");

  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "overview" | "bookings" | "transactions"
  >("overview");

  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [userToBlock, setUserToBlock] = useState<AdminUserRow | null>(null);
  const [actioning, setActioning] = useState(false);

  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAdjustment, setCoinAdjustment] = useState<{
    type: "CREDIT" | "DEBIT";
    amount: number | string;
    reason: string;
  }>({ type: "CREDIT", amount: 0, reason: "" });
  const [coinSaving, setCoinSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {
        page: 0,
        limit: 200,
      };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (statusFilter === "ACTIVE") params.status = "active";
      if (statusFilter === "INACTIVE") params.status = "inactive";
      if (statusFilter === "BLOCKED") params.status = "blocked";

      const [usersRes, statsRes] = await Promise.all([
        fetchAdminUsers(params),
        fetchAdminUserStats(),
      ]);

      if (usersRes?.success === false) {
        setError(usersRes.message || "Failed to load users");
      } else {
        setUsers(usersRes?.data?.users || usersRes?.users || []);
      }
      setStats(statsRes?.data || statsRes || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => void loadUsers(), 200);
    return () => clearTimeout(timer);
  }, [loadUsers]);

  const filteredUsers = users;

  const {
    paginatedData: paginatedUsers,
    currentPage,
    totalPages,
    setCurrentPage,
    totalItems,
    startIndex,
    endIndex,
    pageSize,
    setPageSize,
  } = usePagination(filteredUsers, 10);

  const headerStats = useMemo(() => {
    if (stats) {
      return {
        total: stats.totalUsers,
        active: stats.activeUsers,
        blocked: stats.blockedUsers,
        totalSpent: stats.totalRevenue,
        totalBookings: stats.totalBookings,
      };
    }
    return {
      total: users.length,
      active: users.filter((u) => u.isActive && !u.isBlocked).length,
      blocked: users.filter((u) => u.isBlocked).length,
      totalSpent: users.reduce((sum, u) => sum + (u.totalSpent || 0), 0),
      totalBookings: users.reduce((sum, u) => sum + (u.bookingCount || 0), 0),
    };
  }, [stats, users]);

  const handleViewUser = (user: AdminUserRow) => {
    setSelectedUser(user);
    setActiveDetailTab("overview");
    setShowDetailModal(true);
  };

  const handleBlockUser = async () => {
    if (!userToBlock || !blockReason.trim()) return;
    setActioning(true);
    try {
      const res = await blockAdminUser(userToBlock._id, blockReason.trim());
      if (res?.success === false) {
        await dialog.alert({ title: "Block failed", message: res.message || "Failed to block user", tone: "danger" });
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userToBlock._id ? { ...u, isBlocked: true } : u,
          ),
        );
        setShowBlockModal(false);
        setUserToBlock(null);
        setBlockReason("");
      }
    } catch (e) {
      await dialog.alert({ title: "Block failed", message: e instanceof Error ? e.message : "Failed to block user", tone: "danger" });
    } finally {
      setActioning(false);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    setActioning(true);
    try {
      const res = await unblockAdminUser(userId);
      if (res?.success === false) {
        await dialog.alert({ title: "Unblock failed", message: res.message || "Failed to unblock user", tone: "danger" });
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u._id === userId ? { ...u, isBlocked: false } : u,
          ),
        );
        if (selectedUser?._id === userId) {
          setSelectedUser({ ...selectedUser, isBlocked: false });
        }
      }
    } catch (e) {
      await dialog.alert({ title: "Unblock failed", message: e instanceof Error ? e.message : "Failed to unblock user", tone: "danger" });
    } finally {
      setActioning(false);
    }
  };

  const handleCoinAdjustment = async () => {
    if (!selectedUser) return;
    const amount = Number(coinAdjustment.amount) || 0;
    if (!amount || !coinAdjustment.reason.trim()) return;
    setCoinSaving(true);
    try {
      const res = await adjustAdminUserCoins(selectedUser._id, {
        type: coinAdjustment.type,
        amount,
        reason: coinAdjustment.reason.trim(),
      });
      if (res?.success === false) {
        await dialog.alert({ title: "Adjustment failed", message: res.message || "Failed to adjust coin balance", tone: "danger" });
      } else {
        const newBalance = res?.data?.wallet?.balance;
        const resolvedBalance =
          typeof newBalance === "number"
            ? newBalance
            : coinAdjustment.type === "CREDIT"
              ? (selectedUser.coinBalance || 0) + amount
              : Math.max(0, (selectedUser.coinBalance || 0) - amount);
        setUsers((prev) =>
          prev.map((u) =>
            u._id === selectedUser._id
              ? { ...u, coinBalance: resolvedBalance }
              : u,
          ),
        );
        setSelectedUser({ ...selectedUser, coinBalance: resolvedBalance });
        setShowCoinModal(false);
        setCoinAdjustment({ type: "CREDIT", amount: 0, reason: "" });
      }
    } catch (e) {
      await dialog.alert({ title: "Adjustment failed", message: e instanceof Error ? e.message : "Failed to adjust coin balance", tone: "danger" });
    } finally {
      setCoinSaving(false);
    }
  };

  const openBlockModal = (user: AdminUserRow) => {
    setUserToBlock(user);
    setBlockReason("");
    setShowBlockModal(true);
  };

  const statusLabel = (u: AdminUserRow) =>
    u.isDeleted
      ? "Deleted"
      : u.isBlocked
        ? "Blocked"
        : u.isActive
          ? "Active"
          : "Inactive";

  const statusClass = (u: AdminUserRow) =>
    u.isDeleted
      ? "bg-gray-200 text-gray-700"
      : u.isBlocked
        ? "bg-red-100 text-red-800"
        : u.isActive
          ? "bg-green-100 text-green-800"
          : "bg-yellow-100 text-yellow-800";

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-movezy-500" />
            User Management
          </h2>
          <p className="text-sm text-gray-500">
            Manage app users and customers
          </p>
        </div>
        <button className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-gray-50">
          <Download className="w-4 h-4" />
          Export Users
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {headerStats.total}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {headerStats.active}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Blocked</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {headerStats.blocked}
              </p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Ban className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Bookings</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">
                {headerStats.totalBookings}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-xl font-bold text-movezy-600 mt-1">
                {formatCurrency(headerStats.totalSpent)}
              </p>
            </div>
            <div className="w-10 h-10 bg-movezy-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-movezy-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, phone, email, or referral code..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  User
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Contact
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Bookings
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Spent
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Coins
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Joined
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                    Loading...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-movezy-100 rounded-full flex items-center justify-center">
                          <span className="text-movezy-600 font-semibold">
                            {(user.fullName || user.email || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.fullName || "Unnamed"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.referralCode || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <p className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3 h-3" />
                          {user.mobileNumber || "—"}
                        </p>
                        {user.email && (
                          <p className="flex items-center gap-1 text-gray-500 text-xs mt-0.5 truncate max-w-[200px]">
                            <Mail className="w-3 h-3 shrink-0" />
                            {user.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-800">
                        {user.bookingCount}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-800">
                        {formatCurrency(user.totalSpent)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Coins className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium text-gray-800">
                          {user.coinBalance}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Clock className="w-3 h-3" />
                        {user.lastLoginAt
                          ? getTimeAgo(user.lastLoginAt)
                          : formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass(user)}`}
                      >
                        {statusLabel(user)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {user.isBlocked ? (
                          <button
                            onClick={() => handleUnblockUser(user._id)}
                            disabled={actioning}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-40"
                            title="Unblock User"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openBlockModal(user)}
                            disabled={actioning}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40"
                            title="Block User"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={totalItems}
          startIndex={startIndex}
          endIndex={endIndex}
          itemLabel="users"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        />
      </div>

      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-movezy-100 rounded-full flex items-center justify-center">
                    <span className="text-movezy-600 font-bold text-xl">
                      {(selectedUser.fullName || "U").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {selectedUser.fullName || "Unnamed"}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Member since {formatDate(selectedUser.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-4 mt-4 border-b border-gray-100 -mb-6 pb-0">
                {(["overview", "bookings", "transactions"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveDetailTab(tab)}
                      className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors capitalize ${
                        activeDetailTab === tab
                          ? "border-movezy-500 text-movezy-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab}
                    </button>
                  ),
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {activeDetailTab === "overview" && (
                <div className="space-y-6">
                  {selectedUser.isBlocked && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">User is Blocked</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Total Bookings</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {selectedUser.bookingCount}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Total Spent</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {formatCurrency(selectedUser.totalSpent)}
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Coin Balance</p>
                      <div className="flex items-center gap-2">
                        <p className="text-2xl font-bold text-yellow-600">
                          {selectedUser.coinBalance}
                        </p>
                        <button
                          onClick={() => setShowCoinModal(true)}
                          className="text-xs text-movezy-600 hover:underline"
                        >
                          Adjust
                        </button>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Wallet</p>
                      <p className="text-2xl font-bold text-green-600 flex items-center gap-1">
                        <WalletIcon className="w-5 h-5" />
                        {formatCurrency(selectedUser.walletBalance)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium text-gray-800">
                            {selectedUser.mobileNumber || "—"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium text-gray-800 flex items-center gap-1 break-all">
                            {selectedUser.email || "Not provided"}
                            {selectedUser.isVerified && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                Verified
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedUser.referralCode && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">
                        Referral Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Gift className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">
                              Referral Code
                            </p>
                            <p className="font-medium text-gray-800 font-mono">
                              {selectedUser.referralCode}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedUser.primaryAddress && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">
                        Primary Address
                      </h4>
                      <div className="p-3 bg-gray-50 rounded-xl text-sm text-gray-700">
                        {[
                          selectedUser.primaryAddress.address,
                          selectedUser.primaryAddress.area,
                          selectedUser.primaryAddress.city,
                          selectedUser.primaryAddress.state,
                          selectedUser.primaryAddress.pinCode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === "bookings" && (
                <div className="text-center text-gray-500 py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>
                    Open the user detail page for full booking history.
                  </p>
                  <p className="text-sm">
                    Total: {selectedUser.bookingCount} bookings ·{" "}
                    {selectedUser.completedBookings} completed
                  </p>
                </div>
              )}

              {activeDetailTab === "transactions" && (
                <div className="text-center text-gray-500 py-8">
                  <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>
                    Open the user detail page for full transaction history.
                  </p>
                  <p className="text-sm">
                    Wallet: {formatCurrency(selectedUser.walletBalance)} · Coins:{" "}
                    {selectedUser.coinBalance}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-between">
              <a
                href={`tel:${selectedUser.mobileNumber}`}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call User
              </a>
              <div className="flex gap-2">
                {selectedUser.isBlocked ? (
                  <button
                    onClick={() => handleUnblockUser(selectedUser._id)}
                    disabled={actioning}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Unlock className="w-4 h-4" />
                    Unblock User
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      openBlockModal(selectedUser);
                    }}
                    className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Block User
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBlockModal && userToBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Block User
                </h3>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-red-600 font-semibold">
                    {(userToBlock.fullName || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {userToBlock.fullName || "Unnamed"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {userToBlock.mobileNumber || "—"}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Block Reason *
                </label>
                <textarea
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
                  placeholder="Enter reason for blocking this user..."
                />
              </div>

              <p className="text-sm text-gray-500">
                Blocking this user will prevent them from making new bookings
                and using the app.
              </p>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowBlockModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBlockUser}
                disabled={!blockReason.trim() || actioning}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
              >
                {actioning && <Loader2 className="w-4 h-4 animate-spin" />}
                Block User
              </button>
            </div>
          </div>
        </div>
      )}

      {showCoinModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  Adjust Coins
                </h3>
                <button
                  onClick={() => setShowCoinModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center p-4 bg-yellow-50 rounded-xl">
                <Coins className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Current Balance</p>
                <p className="text-2xl font-bold text-gray-800">
                  {selectedUser.coinBalance}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adjustment Type
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setCoinAdjustment({ ...coinAdjustment, type: "CREDIT" })
                    }
                    className={`flex-1 py-2 rounded-xl font-medium ${
                      coinAdjustment.type === "CREDIT"
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Credit (+)
                  </button>
                  <button
                    onClick={() =>
                      setCoinAdjustment({ ...coinAdjustment, type: "DEBIT" })
                    }
                    className={`flex-1 py-2 rounded-xl font-medium ${
                      coinAdjustment.type === "DEBIT"
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    Debit (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="number"
                  value={coinAdjustment.amount || ""}
                  onChange={(e) =>
                    setCoinAdjustment({
                      ...coinAdjustment,
                      amount:
                        e.target.value === "" ? "" : Number(e.target.value),
                    })
                  }
                  min="1"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  placeholder="Enter coin amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <input
                  type="text"
                  value={coinAdjustment.reason}
                  onChange={(e) =>
                    setCoinAdjustment({
                      ...coinAdjustment,
                      reason: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  placeholder="e.g., Referral bonus, Compensation"
                />
              </div>

              {Number(coinAdjustment.amount) > 0 && (
                <div className="p-3 bg-gray-50 rounded-xl text-center">
                  <p className="text-sm text-gray-500">New Balance</p>
                  <p className="text-xl font-bold text-gray-800">
                    {coinAdjustment.type === "CREDIT"
                      ? selectedUser.coinBalance +
                        Number(coinAdjustment.amount)
                      : Math.max(
                          0,
                          selectedUser.coinBalance -
                            Number(coinAdjustment.amount),
                        )}
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCoinModal(false)}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCoinAdjustment}
                disabled={
                  !coinAdjustment.amount ||
                  !coinAdjustment.reason.trim() ||
                  coinSaving
                }
                className="px-4 py-2 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600 disabled:opacity-50 flex items-center gap-2"
              >
                {coinSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply Adjustment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppUserManagement;
