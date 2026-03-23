// src/pages/AppUserManagement.tsx
import React, { useState, useEffect, useMemo } from "react";
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
  Smartphone,
  Clock,
  TrendingUp,
  AlertTriangle,
  Check,
} from "lucide-react";
import type { AppUser } from "../types/admin";
import { usePagination } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

const AppUserManagement: React.FC = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Detail Modal
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<
    "overview" | "bookings" | "transactions"
  >("overview");

  // Block Modal
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [userToBlock, setUserToBlock] = useState<AppUser | null>(null);

  // Coin Adjustment Modal
  const [showCoinModal, setShowCoinModal] = useState(false);
  const [coinAdjustment, setCoinAdjustment] = useState<{
    type: "CREDIT" | "DEBIT";
    amount: number | string;
    reason: string;
  }>({
    type: "CREDIT",
    amount: 0,
    reason: "",
  });

  // Mock users data
  const mockUsers: AppUser[] = [
    {
      _id: "user1",
      name: "Rahul Sharma",
      email: "rahul.sharma@gmail.com",
      phone: "+91 98765 43210",
      isPhoneVerified: true,
      isEmailVerified: true,
      isBlocked: false,
      totalBookings: 45,
      totalSpent: 23500,
      coinBalance: 1250,
      referralCode: "RAHUL2024",
      referralCount: 5,
      deviceInfo: {
        platform: "ANDROID",
        version: "3.2.1",
        deviceId: "abc123",
      },
      lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      createdAt: "2024-01-15T00:00:00Z",
    },
    {
      _id: "user2",
      name: "Priya Patel",
      email: "priya.patel@gmail.com",
      phone: "+91 98765 43211",
      isPhoneVerified: true,
      isEmailVerified: false,
      isBlocked: false,
      totalBookings: 28,
      totalSpent: 14200,
      coinBalance: 850,
      referralCode: "PRIYA2024",
      referredBy: "RAHUL2024",
      referralCount: 3,
      deviceInfo: {
        platform: "IOS",
        version: "3.2.0",
        deviceId: "xyz789",
      },
      lastActive: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      createdAt: "2024-02-10T00:00:00Z",
    },
    {
      _id: "user3",
      name: "Arjun Reddy",
      phone: "+91 98765 43212",
      isPhoneVerified: true,
      isEmailVerified: false,
      isBlocked: false,
      totalBookings: 67,
      totalSpent: 35800,
      coinBalance: 2100,
      referralCode: "ARJUN2024",
      referralCount: 8,
      deviceInfo: {
        platform: "ANDROID",
        version: "3.1.5",
        deviceId: "def456",
      },
      lastActive: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      createdAt: "2023-12-01T00:00:00Z",
    },
    {
      _id: "user4",
      name: "Sneha Desai",
      email: "sneha.d@gmail.com",
      phone: "+91 98765 43213",
      isPhoneVerified: true,
      isEmailVerified: true,
      isBlocked: true,
      blockReason: "Multiple payment failures and disputes",
      totalBookings: 12,
      totalSpent: 5400,
      coinBalance: 0,
      referralCode: "SNEHA2024",
      referralCount: 0,
      lastActive: "2024-11-15T00:00:00Z",
      createdAt: "2024-03-01T00:00:00Z",
    },
    {
      _id: "user5",
      name: "Vikram Singh",
      email: "vikram.singh@outlook.com",
      phone: "+91 98765 43214",
      isPhoneVerified: true,
      isEmailVerified: true,
      isBlocked: false,
      totalBookings: 89,
      totalSpent: 52300,
      coinBalance: 3450,
      referralCode: "VIKRAM2024",
      referralCount: 12,
      deviceInfo: {
        platform: "ANDROID",
        version: "3.2.1",
        deviceId: "ghi789",
      },
      lastActive: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      createdAt: "2023-11-15T00:00:00Z",
    },
    {
      _id: "user6",
      name: "Anjali Mehta",
      phone: "+91 98765 43215",
      isPhoneVerified: true,
      isEmailVerified: false,
      isBlocked: false,
      totalBookings: 5,
      totalSpent: 2100,
      coinBalance: 150,
      referralCode: "ANJALI2024",
      referralCount: 0,
      deviceInfo: {
        platform: "IOS",
        version: "3.2.1",
        deviceId: "jkl012",
      },
      lastActive: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      createdAt: "2024-05-20T00:00:00Z",
    },
    {
      _id: "user7",
      name: "Rohan Kumar",
      email: "rohan.k@gmail.com",
      phone: "+91 98765 43216",
      isPhoneVerified: true,
      isEmailVerified: true,
      isBlocked: false,
      totalBookings: 156,
      totalSpent: 89500,
      coinBalance: 5200,
      referralCode: "ROHAN2024",
      referralCount: 25,
      deviceInfo: {
        platform: "ANDROID",
        version: "3.2.1",
        deviceId: "mno345",
      },
      lastActive: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      createdAt: "2023-08-10T00:00:00Z",
    },
    {
      _id: "user8",
      name: "Neha Gupta",
      email: "neha.gupta@gmail.com",
      phone: "+91 98765 43217",
      isPhoneVerified: true,
      isEmailVerified: true,
      isBlocked: false,
      totalBookings: 34,
      totalSpent: 18700,
      coinBalance: 980,
      referralCode: "NEHA2024",
      referredBy: "ROHAN2024",
      referralCount: 2,
      deviceInfo: {
        platform: "IOS",
        version: "3.2.0",
        deviceId: "pqr678",
      },
      lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      createdAt: "2024-04-05T00:00:00Z",
    },
  ];

  useEffect(() => {
    setTimeout(() => {
      setUsers(mockUsers);
      setLoading(false);
    }, 500);
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone.includes(searchQuery) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.referralCode.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && !user.isBlocked) ||
        (statusFilter === "BLOCKED" && user.isBlocked);
      return matchesSearch && matchesStatus;
    });
  }, [users, searchQuery, statusFilter]);

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

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => !u.isBlocked).length,
      blocked: users.filter((u) => u.isBlocked).length,
      totalSpent: users.reduce((sum, u) => sum + u.totalSpent, 0),
      totalBookings: users.reduce((sum, u) => sum + u.totalBookings, 0),
    }),
    [users],
  );

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return "Never";
    const now = Date.now();
    const date = new Date(dateString).getTime();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handleViewUser = (user: AppUser) => {
    setSelectedUser(user);
    setActiveDetailTab("overview");
    setShowDetailModal(true);
  };

  const handleBlockUser = () => {
    if (!userToBlock || !blockReason) return;
    setUsers(
      users.map((u) =>
        u._id === userToBlock._id ? { ...u, isBlocked: true, blockReason } : u,
      ),
    );
    setShowBlockModal(false);
    setUserToBlock(null);
    setBlockReason("");
  };

  const handleUnblockUser = (userId: string) => {
    setUsers(
      users.map((u) =>
        u._id === userId
          ? { ...u, isBlocked: false, blockReason: undefined }
          : u,
      ),
    );
  };

  const handleCoinAdjustment = () => {
    const amount = Number(coinAdjustment.amount) || 0;
    if (!selectedUser || !amount || !coinAdjustment.reason)
      return;
    const adjustment =
      coinAdjustment.type === "CREDIT"
        ? amount
        : -amount;
    setUsers(
      users.map((u) =>
        u._id === selectedUser._id
          ? { ...u, coinBalance: Math.max(0, u.coinBalance + adjustment) }
          : u,
      ),
    );
    setSelectedUser({
      ...selectedUser,
      coinBalance: Math.max(0, selectedUser.coinBalance + adjustment),
    });
    setShowCoinModal(false);
    setCoinAdjustment({ type: "CREDIT", amount: 0, reason: "" });
  };

  const openBlockModal = (user: AppUser) => {
    setUserToBlock(user);
    setBlockReason("");
    setShowBlockModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">
                {stats.total}
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
                {stats.active}
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
                {stats.blocked}
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
                {stats.totalBookings}
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
                {formatCurrency(stats.totalSpent)}
              </p>
            </div>
            <div className="w-10 h-10 bg-movezy-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-movezy-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Table */}
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
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
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
                  Last Active
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
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {user.referralCode}
                            {user.referralCount > 0 && (
                              <span className="ml-1 text-green-600">
                                ({user.referralCount} referrals)
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm">
                        <p className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3 h-3" />
                          {user.phone}
                          {user.isPhoneVerified && (
                            <Check className="w-3 h-3 text-green-500" />
                          )}
                        </p>
                        {user.email && (
                          <p className="flex items-center gap-1 text-gray-500 text-xs mt-0.5">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-800">
                        {user.totalBookings}
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
                        {getTimeAgo(user.lastActive)}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.isBlocked
                            ? "bg-red-100 text-red-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {user.isBlocked ? "Blocked" : "Active"}
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
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="Unblock User"
                          >
                            <Unlock className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => openBlockModal(user)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
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

        {/* Pagination */}
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

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-movezy-100 rounded-full flex items-center justify-center">
                    <span className="text-movezy-600 font-bold text-xl">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {selectedUser.name}
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

              {/* Tabs */}
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
                  {/* Status Badge */}
                  {selectedUser.isBlocked && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-5 h-5" />
                        <span className="font-medium">User is Blocked</span>
                      </div>
                      {selectedUser.blockReason && (
                        <p className="text-sm text-red-600 mt-1">
                          Reason: {selectedUser.blockReason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">Total Bookings</p>
                      <p className="text-2xl font-bold text-gray-800">
                        {selectedUser.totalBookings}
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
                      <p className="text-sm text-gray-500">Referrals</p>
                      <p className="text-2xl font-bold text-green-600">
                        {selectedUser.referralCount}
                      </p>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      Contact Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Phone</p>
                          <p className="font-medium text-gray-800 flex items-center gap-1">
                            {selectedUser.phone}
                            {selectedUser.isPhoneVerified && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                Verified
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Email</p>
                          <p className="font-medium text-gray-800 flex items-center gap-1">
                            {selectedUser.email || "Not provided"}
                            {selectedUser.isEmailVerified && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                                Verified
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Referral Info */}
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      Referral Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Gift className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="text-sm text-gray-500">Referral Code</p>
                          <p className="font-medium text-gray-800 font-mono">
                            {selectedUser.referralCode}
                          </p>
                        </div>
                      </div>
                      {selectedUser.referredBy && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Users className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="text-sm text-gray-500">Referred By</p>
                            <p className="font-medium text-gray-800 font-mono">
                              {selectedUser.referredBy}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Device Info */}
                  {selectedUser.deviceInfo && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-3">
                        Device Information
                      </h4>
                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Smartphone className="w-5 h-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-800">
                            {selectedUser.deviceInfo.platform}
                          </p>
                          <p className="text-sm text-gray-500">
                            App version: {selectedUser.deviceInfo.version}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeDetailTab === "bookings" && (
                <div className="text-center text-gray-500 py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Booking history will be loaded from API</p>
                  <p className="text-sm">
                    Total: {selectedUser.totalBookings} bookings
                  </p>
                </div>
              )}

              {activeDetailTab === "transactions" && (
                <div className="text-center text-gray-500 py-8">
                  <Coins className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Transaction history will be loaded from API</p>
                  <p className="text-sm">
                    Current balance: {selectedUser.coinBalance} coins
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-between">
              <a
                href={`tel:${selectedUser.phone}`}
                className="px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 flex items-center gap-2"
              >
                <Phone className="w-4 h-4" />
                Call User
              </a>
              <div className="flex gap-2">
                {selectedUser.isBlocked ? (
                  <button
                    onClick={() => {
                      handleUnblockUser(selectedUser._id);
                      setSelectedUser({ ...selectedUser, isBlocked: false });
                    }}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 flex items-center gap-2"
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

      {/* Block User Modal */}
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
                    {userToBlock.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {userToBlock.name}
                  </p>
                  <p className="text-sm text-gray-500">{userToBlock.phone}</p>
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
                disabled={!blockReason}
                className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50"
              >
                Block User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coin Adjustment Modal */}
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
                      amount: e.target.value === '' ? '' : Number(e.target.value),
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
                      ? selectedUser.coinBalance + Number(coinAdjustment.amount)
                      : Math.max(
                          0,
                          selectedUser.coinBalance - Number(coinAdjustment.amount),
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
                disabled={!coinAdjustment.amount || !coinAdjustment.reason}
                className="px-4 py-2 bg-movezy-500 text-white rounded-xl hover:bg-movezy-600 disabled:opacity-50"
              >
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
