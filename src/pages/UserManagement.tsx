import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Eye,
  Home,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCcw,
  Search,
  Star,
  Trash2,
  Unlock,
  Users,
  X,
} from "lucide-react";
import { usersApi } from "../services/admin-api";

// ==================== TYPES ====================
interface UserAddress {
  _id: string;
  fullName?: string;
  mobileNumber?: string;
  addressType?: string;
  houseNo?: string;
  area?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: number;
  latitude?: number;
  longitude?: number;
  isSelected?: boolean;
}

interface ApiUser {
  _id: string;
  fullName: string;
  email: string;
  profileImage?: string;
  gender?: string;
  dob?: string;
  countryCode: string;
  mobileNumber: string;
  isActive: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
  blockReason?: string | null;
  blockedAt?: string | null;
  notificationAllowed: boolean;
  referralCode?: string;
  createdAt: string;
  updatedAt: string;
  addressCount: number;
  allAddresses: UserAddress[];
}

interface UserStatsSummary {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  deletedUsers: number;
}

interface ToastState {
  type: "success" | "error";
  message: string;
}

type StatusFilter = "all" | "active" | "inactive" | "blocked" | "deleted";

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

// ==================== COMPONENT ====================
const UserManagement: React.FC = () => {
  // State
  const [stats, setStats] = useState<UserStatsSummary | null>(null);
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });
  const [page, setPage] = useState(0);
  const [limit] = useState(15);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [toast, setToast] = useState<ToastState | null>(null);

  // Modal States
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [addressFormOpen, setAddressFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  // Form States
  const [editForm, setEditForm] = useState({
    fullName: "",
    email: "",
    gender: "",
    dob: "",
  });
  const [blockReason, setBlockReason] = useState("");
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    mobileNumber: "",
    houseNo: "",
    area: "",
    city: "",
    state: "",
    country: "India",
    pinCode: "",
    addressType: "Home" as "Home" | "Work" | "Other",
    latitude: "",
    longitude: "",
  });

  // Show toast notification
  const showToast = useCallback((payload: ToastState) => {
    setToast(payload);
    setTimeout(() => setToast(null), 4000);
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await usersApi.getStats();
      setStats(response.data);
    } catch (err) {
      console.error("Failed to load stats", err);
    }
  }, []);

  // Load users
  const loadUsers = useCallback(
    async (pageToLoad = page) => {
      setLoading(true);
      try {
        const response = await usersApi.getAll({
          search: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          page: pageToLoad,
          limit,
        });
        setUsers(response.data.users);
        setPagination({
          total: response.data.total,
          totalPages: response.data.totalPages,
        });
      } catch (err) {
        console.error("Failed to load users", err);
        showToast({ type: "error", message: "Failed to load users" });
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter, limit, page, showToast],
  );

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Get status badge
  const getStatusBadge = (user: ApiUser) => {
    if (user.isDeleted)
      return { label: "Deleted", classes: "bg-gray-100 text-gray-700" };
    if (user.isBlocked)
      return { label: "Blocked", classes: "bg-red-100 text-red-700" };
    if (user.isActive)
      return { label: "Active", classes: "bg-green-100 text-green-700" };
    return { label: "Inactive", classes: "bg-yellow-100 text-yellow-700" };
  };

  // View user details
  const handleViewUser = (user: ApiUser) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  // Open edit modal
  const openEditModal = (user: ApiUser) => {
    setSelectedUser(user);
    setEditForm({
      fullName: user.fullName || "",
      email: user.email || "",
      gender: user.gender || "",
      dob: user.dob || "",
    });
    setEditModalOpen(true);
  };

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await usersApi.update(selectedUser._id, editForm);
      showToast({ type: "success", message: "User updated successfully" });
      setEditModalOpen(false);
      loadUsers();
    } catch (err) {
      showToast({ type: "error", message: "Failed to update user" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open address management modal
  const openAddressModal = (user: ApiUser) => {
    setSelectedUser(user);
    setAddressModalOpen(true);
  };

  // Open add/edit address form
  const openAddressForm = (address?: UserAddress) => {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        fullName: address.fullName || "",
        mobileNumber: address.mobileNumber || "",
        houseNo: address.houseNo || "",
        area: address.area || "",
        city: address.city || "",
        state: address.state || "",
        country: address.country || "India",
        pinCode: address.pinCode?.toString() || "",
        addressType:
          (address.addressType as "Home" | "Work" | "Other") || "Home",
        latitude: address.latitude?.toString() || "",
        longitude: address.longitude?.toString() || "",
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        fullName: selectedUser?.fullName || "",
        mobileNumber: selectedUser?.mobileNumber || "",
        houseNo: "",
        area: "",
        city: "",
        state: "",
        country: "India",
        pinCode: "",
        addressType: "Home",
        latitude: "",
        longitude: "",
      });
    }
    setAddressFormOpen(true);
  };

  // Save address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const data = {
        ...addressForm,
        pinCode: parseInt(addressForm.pinCode) || 0,
        latitude: addressForm.latitude
          ? parseFloat(addressForm.latitude)
          : undefined,
        longitude: addressForm.longitude
          ? parseFloat(addressForm.longitude)
          : undefined,
      };

      if (editingAddress) {
        await usersApi.updateAddress(
          selectedUser._id,
          editingAddress._id,
          data,
        );
        showToast({ type: "success", message: "Address updated" });
      } else {
        await usersApi.addAddress(selectedUser._id, data as any);
        showToast({ type: "success", message: "Address added" });
      }
      setAddressFormOpen(false);
      // Refresh user data
      const response = await usersApi.getAll({
        search: selectedUser._id,
        limit: 1,
      });
      if (response.data.users[0]) {
        setSelectedUser(response.data.users[0]);
      }
      loadUsers();
    } catch (err) {
      showToast({ type: "error", message: "Failed to save address" });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async (addressId: string) => {
    if (!selectedUser || !confirm("Delete this address?")) return;
    setActionLoading(true);
    try {
      await usersApi.deleteAddress(selectedUser._id, addressId);
      showToast({ type: "success", message: "Address deleted" });
      const response = await usersApi.getAll({
        search: selectedUser._id,
        limit: 1,
      });
      if (response.data.users[0]) {
        setSelectedUser(response.data.users[0]);
      }
      loadUsers();
    } catch (err) {
      showToast({ type: "error", message: "Failed to delete address" });
    } finally {
      setActionLoading(false);
    }
  };

  // Set primary address
  const handleSetPrimary = async (addressId: string) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await usersApi.setAddressPrimary(selectedUser._id, addressId);
      showToast({ type: "success", message: "Primary address updated" });
      const response = await usersApi.getAll({
        search: selectedUser._id,
        limit: 1,
      });
      if (response.data.users[0]) {
        setSelectedUser(response.data.users[0]);
      }
      loadUsers();
    } catch (err) {
      showToast({ type: "error", message: "Failed to update primary address" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open delete modal
  const openDeleteModal = (user: ApiUser) => {
    setSelectedUser(user);
    setDeleteModalOpen(true);
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await usersApi.delete(selectedUser._id);
      showToast({ type: "success", message: "User deleted successfully" });
      setDeleteModalOpen(false);
      setDetailOpen(false);
      loadUsers();
      fetchStats();
    } catch (err) {
      showToast({ type: "error", message: "Failed to delete user" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open block modal
  const openBlockModal = (user: ApiUser) => {
    setSelectedUser(user);
    setBlockReason(user.blockReason || "");
    setBlockModalOpen(true);
  };

  // Block/Unblock user
  const handleBlockToggle = async (shouldBlock: boolean) => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      if (shouldBlock) {
        await usersApi.block(
          selectedUser._id,
          blockReason || "Blocked by admin",
        );
        showToast({ type: "success", message: "User blocked" });
      } else {
        await usersApi.unblock(selectedUser._id);
        showToast({ type: "success", message: "User unblocked" });
      }
      setBlockModalOpen(false);
      loadUsers();
    } catch (err) {
      showToast({ type: "error", message: "Failed to update block status" });
    } finally {
      setActionLoading(false);
    }
  };

  // Pagination label
  const paginationLabel = useMemo(() => {
    if (!users.length) return "No users";
    const start = page * limit + 1;
    const end = page * limit + users.length;
    return `${start}-${end} of ${pagination.total}`;
  }, [users.length, page, limit, pagination.total]);

  return (
    <div className="relative p-6 space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
          <p className="mt-1 text-gray-600">
            Manage app users, addresses, and account status
          </p>
        </div>
        <button
          onClick={() => {
            loadUsers();
            fetchStats();
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 rounded-lg bg-blue-50 hover:bg-blue-100"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <h3 className="mt-1 text-3xl font-bold text-gray-900">
                {stats?.totalUsers ?? "-"}
              </h3>
            </div>
            <Users className="w-10 h-10 p-2 text-blue-600 bg-blue-50 rounded-xl" />
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <h3 className="mt-1 text-3xl font-bold text-green-600">
                {stats?.activeUsers ?? "-"}
              </h3>
            </div>
            <CheckCircle className="w-10 h-10 p-2 text-green-600 bg-green-50 rounded-xl" />
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Blocked</p>
              <h3 className="mt-1 text-3xl font-bold text-red-600">
                {stats?.blockedUsers ?? "-"}
              </h3>
            </div>
            <Ban className="w-10 h-10 p-2 text-red-600 bg-red-50 rounded-xl" />
          </div>
        </div>
        <div className="p-5 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Deleted</p>
              <h3 className="mt-1 text-3xl font-bold text-gray-600">
                {stats?.deletedUsers ?? "-"}
              </h3>
            </div>
            <Trash2 className="w-10 h-10 p-2 text-gray-600 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 p-4 bg-white border border-gray-100 shadow-sm md:flex-row md:items-center md:justify-between rounded-2xl">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute w-4 h-4 text-gray-400 -translate-y-1/2 left-3 top-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers(0)}
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as StatusFilter);
            setPage(0);
          }}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[140px]"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="blocked">Blocked</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="px-6 py-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  User
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-wide text-center text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-wide text-center text-gray-500 uppercase">
                  Addresses
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-wide text-center text-gray-500 uppercase">
                  Joined
                </th>
                <th className="px-4 py-4 text-xs font-semibold tracking-wide text-center text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const statusBadge = getStatusBadge(user);
                return (
                  <tr
                    key={user._id}
                    className="transition-colors hover:bg-gray-50"
                  >
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0 w-10 h-10 overflow-hidden bg-blue-100 rounded-full">
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.fullName}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-full text-sm font-semibold text-blue-600">
                              {user.fullName?.[0]?.toUpperCase() || "U"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">
                            {user.fullName || "Unnamed User"}
                          </p>
                          {user.gender && (
                            <p className="text-xs text-gray-500">
                              {user.gender}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Contact */}
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="flex items-center gap-2 text-sm text-gray-700">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {user.countryCode} {user.mobileNumber}
                        </p>
                        {user.email && (
                          <p className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate max-w-[180px]">
                              {user.email}
                            </span>
                          </p>
                        )}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.classes}`}
                      >
                        {statusBadge.label}
                      </span>
                    </td>
                    {/* Addresses */}
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => openAddressModal(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        {user.addressCount || 0} Address
                        {user.addressCount !== 1 ? "es" : ""}
                      </button>
                    </td>
                    {/* Joined */}
                    <td className="px-4 py-4 text-sm text-center text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-2 text-gray-500 rounded-lg hover:text-blue-600 hover:bg-blue-50"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-2 text-gray-500 rounded-lg hover:text-green-600 hover:bg-green-50"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openBlockModal(user)}
                          className={`p-2 rounded-lg ${
                            user.isBlocked
                              ? "text-green-600 hover:bg-green-50"
                              : "text-gray-400 hover:text-red-600 hover:bg-red-50"
                          }`}
                          title={user.isBlocked ? "Unblock" : "Block"}
                        >
                          {user.isBlocked ? (
                            <Unlock className="w-4 h-4" />
                          ) : (
                            <Ban className="w-4 h-4" />
                          )}
                        </button>
                        {!user.isDeleted && (
                          <button
                            onClick={() => openDeleteModal(user)}
                            className="p-2 text-gray-400 rounded-lg hover:text-red-600 hover:bg-red-50"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {loading && (
          <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading users...
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="p-10 text-center text-gray-500">No users found.</div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 md:flex-row md:items-center md:justify-between">
          <span className="text-sm text-gray-500">{paginationLabel}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setPage(Math.max(0, page - 1));
              }}
              disabled={page === 0 || loading}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => {
                setPage(Math.min(pagination.totalPages - 1, page + 1));
              }}
              disabled={page >= pagination.totalPages - 1 || loading}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* User Detail Popup */}
      {detailOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-lg overflow-hidden bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                User Details
              </h3>
              <button
                onClick={() => setDetailOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* User Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 overflow-hidden bg-blue-100 rounded-full">
                  {selectedUser.profileImage ? (
                    <img
                      src={selectedUser.profileImage}
                      alt={selectedUser.fullName}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-xl font-semibold text-blue-600">
                      {selectedUser.fullName?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">
                    {selectedUser.fullName || "Unnamed"}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedUser.countryCode} {selectedUser.mobileNumber}
                  </p>
                  <span
                    className={`inline-flex px-2 py-0.5 mt-1 text-xs font-semibold rounded-full ${getStatusBadge(selectedUser).classes}`}
                  >
                    {getStatusBadge(selectedUser).label}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium">
                    {selectedUser.email || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Gender</p>
                  <p className="text-sm font-medium">
                    {selectedUser.gender || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date of Birth</p>
                  <p className="text-sm font-medium">
                    {selectedUser.dob || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Joined</p>
                  <p className="text-sm font-medium">
                    {formatDate(selectedUser.createdAt)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    openEditModal(selectedUser);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Edit2 className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    openAddressModal(selectedUser);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 bg-purple-100 rounded-lg hover:bg-purple-200"
                >
                  <MapPin className="w-4 h-4" /> Addresses
                </button>
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    openBlockModal(selectedUser);
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
                    selectedUser.isBlocked
                      ? "text-green-600 bg-green-100 hover:bg-green-200"
                      : "text-red-600 bg-red-100 hover:bg-red-200"
                  }`}
                >
                  {selectedUser.isBlocked ? (
                    <Unlock className="w-4 h-4" />
                  ) : (
                    <Ban className="w-4 h-4" />
                  )}
                  {selectedUser.isBlocked ? "Unblock" : "Block"}
                </button>
                {!selectedUser.isDeleted && (
                  <button
                    onClick={() => {
                      setDetailOpen(false);
                      openDeleteModal(selectedUser);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-lg hover:bg-red-200"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-lg overflow-hidden bg-white shadow-xl rounded-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
              <button
                onClick={() => setEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fullName: e.target.value })
                  }
                  className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gender
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) =>
                      setEditForm({ ...editForm, gender: e.target.value })
                    }
                    className="w-full px-4 py-2 mt-1 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={editForm.dob}
                    onChange={(e) =>
                      setEditForm({ ...editForm, dob: e.target.value })
                    }
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address Management Modal */}
      {addressModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-2xl overflow-hidden bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Addresses
                </h3>
                <p className="text-sm text-gray-500">
                  {selectedUser.fullName || "User"}'s saved addresses
                </p>
              </div>
              <button
                onClick={() => setAddressModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Add Address Button */}
              <button
                onClick={() => openAddressForm()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" /> Add Address
              </button>

              {/* Address List */}
              <div className="space-y-3">
                {selectedUser.allAddresses?.length ? (
                  selectedUser.allAddresses.map((addr) => (
                    <div
                      key={addr._id}
                      className={`p-4 border rounded-xl ${addr.isSelected ? "border-blue-300 bg-blue-50" : "border-gray-200 bg-gray-50"}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded ${
                                addr.addressType === "Home"
                                  ? "bg-green-100 text-green-700"
                                  : addr.addressType === "Work"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {addr.addressType === "Home" && (
                                <Home className="w-3 h-3" />
                              )}
                              {addr.addressType || "Other"}
                            </span>
                            {addr.isSelected && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-amber-700 bg-amber-100 rounded">
                                <Star className="w-3 h-3" /> Primary
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800">
                            {addr.address ||
                              `${addr.houseNo}, ${addr.area}, ${addr.city}`}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {addr.city}, {addr.state} - {addr.pinCode}
                          </p>
                          {addr.latitude && addr.longitude && (
                            <p className="mt-1 text-xs text-gray-400">
                              📍 {addr.latitude.toFixed(4)},{" "}
                              {addr.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!addr.isSelected && (
                            <button
                              onClick={() => handleSetPrimary(addr._id)}
                              className="p-2 rounded-lg text-amber-600 hover:bg-amber-50"
                              title="Set as primary"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => openAddressForm(addr)}
                            className="p-2 text-blue-600 rounded-lg hover:bg-blue-50"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr._id)}
                            className="p-2 text-red-600 rounded-lg hover:bg-red-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="py-8 text-sm text-center text-gray-500">
                    No addresses saved yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Address Form Modal */}
      {addressFormOpen && selectedUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-lg overflow-hidden bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAddress ? "Edit Address" : "Add Address"}
              </h3>
              <button
                onClick={() => setAddressFormOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAddress} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={addressForm.fullName}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        fullName: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Mobile Number
                  </label>
                  <input
                    type="text"
                    value={addressForm.mobileNumber}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        mobileNumber: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address Type
                </label>
                <select
                  value={addressForm.addressType}
                  onChange={(e) =>
                    setAddressForm({
                      ...addressForm,
                      addressType: e.target.value as any,
                    })
                  }
                  className="w-full px-4 py-2 mt-1 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    House/Flat No *
                  </label>
                  <input
                    type="text"
                    value={addressForm.houseNo}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        houseNo: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Area/Locality *
                  </label>
                  <input
                    type="text"
                    value={addressForm.area}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, area: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    City *
                  </label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, city: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    State *
                  </label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, state: e.target.value })
                    }
                    required
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    PIN Code *
                  </label>
                  <input
                    type="text"
                    value={addressForm.pinCode}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        pinCode: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country
                  </label>
                  <input
                    type="text"
                    value={addressForm.country}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        country: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Latitude
                  </label>
                  <input
                    type="text"
                    value={addressForm.latitude}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        latitude: e.target.value,
                      })
                    }
                    placeholder="e.g. 28.6139"
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Longitude
                  </label>
                  <input
                    type="text"
                    value={addressForm.longitude}
                    onChange={(e) =>
                      setAddressForm({
                        ...addressForm,
                        longitude: e.target.value,
                      })
                    }
                    placeholder="e.g. 77.2090"
                    className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setAddressFormOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingAddress ? (
                    "Update Address"
                  ) : (
                    "Add Address"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md overflow-hidden bg-white shadow-xl rounded-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete User
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <p className="text-sm text-red-700">
                  Are you sure you want to delete{" "}
                  <strong>{selectedUser.fullName || "this user"}</strong>? This
                  action can be reversed by restoring the user.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Delete User"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block/Unblock Modal */}
      {blockModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md overflow-hidden bg-white shadow-xl rounded-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedUser.isBlocked ? "Unblock User" : "Block User"}
              </h3>
            </div>
            <div className="p-6 space-y-4">
              {selectedUser.isBlocked ? (
                <p className="text-sm text-gray-600">
                  Unblock <strong>{selectedUser.fullName}</strong> to allow them
                  back into the application.
                </p>
              ) : (
                <>
                  <p className="text-sm text-gray-600">
                    Blocking <strong>{selectedUser.fullName}</strong> will
                    immediately prevent them from accessing the application.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reason (optional)
                    </label>
                    <textarea
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2 mt-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter block reason..."
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setBlockModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBlockToggle(!selectedUser.isBlocked)}
                  disabled={actionLoading}
                  className={`px-5 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 ${
                    selectedUser.isBlocked
                      ? "bg-green-600 hover:bg-green-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : selectedUser.isBlocked ? (
                    "Unblock"
                  ) : (
                    "Block"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
