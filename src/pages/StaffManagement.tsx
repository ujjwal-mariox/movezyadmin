// src/pages/StaffManagement.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Shield,
  ShieldCheck,
  ShieldAlert,
  X,
  Check,
  Clock,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { staffApi, rolesApi } from "../services/admin-api";
import { useAuth } from "../auth/useAuth";
import { PAGE_SIZE_OPTIONS, type PageSize } from "../hooks/usePagination";
import Pagination from "../components/Pagination";

// Types
interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  staffCount: number;
  createdAt: string;
}

interface StaffMember {
  _id: string;
  name: string;
  fullName?: string;
  email: string;
  phone: string;
  avatar?: string;
  role: Role;
  roleId?: { _id: string; name: string; permissions: string[] };
  roleName?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  createdBy?: { fullName: string; email: string } | string;
}

// Permission modules - IDs must match backend PERMISSIONS format (using colons)
const PERMISSION_MODULES = [
  {
    module: "Dashboard",
    permissions: [
      {
        id: "dashboard:view",
        name: "View Dashboard",
        description: "Can view dashboard statistics",
      },
    ],
  },
  {
    module: "Users",
    permissions: [
      {
        id: "users:view",
        name: "View Users",
        description: "Can view customer list",
      },
      {
        id: "users:update",
        name: "Edit Users",
        description: "Can edit customer details",
      },
      {
        id: "users:block",
        name: "Block Users",
        description: "Can block/unblock customers",
      },
    ],
  },
  {
    module: "Drivers",
    permissions: [
      {
        id: "drivers:view",
        name: "View Drivers",
        description: "Can view driver list",
      },
      {
        id: "drivers:update",
        name: "Edit Drivers",
        description: "Can edit driver details",
      },
      {
        id: "drivers:verify",
        name: "Verify Drivers",
        description: "Can verify driver KYC",
      },
      {
        id: "drivers:block",
        name: "Block Drivers",
        description: "Can block/unblock drivers",
      },
    ],
  },
  {
    module: "Vehicles",
    permissions: [
      {
        id: "vehicles:view",
        name: "View Vehicles",
        description: "Can view vehicle types",
      },
      {
        id: "vehicles:create",
        name: "Create Vehicles",
        description: "Can create vehicle types",
      },
      {
        id: "vehicles:update",
        name: "Edit Vehicles",
        description: "Can edit vehicle types",
      },
      {
        id: "vehicles:delete",
        name: "Delete Vehicles",
        description: "Can delete vehicle types",
      },
    ],
  },
  {
    module: "Bookings",
    permissions: [
      {
        id: "bookings:view",
        name: "View Bookings",
        description: "Can view all bookings",
      },
      {
        id: "bookings:update",
        name: "Edit Bookings",
        description: "Can modify bookings",
      },
      {
        id: "bookings:cancel",
        name: "Cancel Bookings",
        description: "Can cancel bookings",
      },
      {
        id: "bookings:refund",
        name: "Process Refunds",
        description: "Can process refunds",
      },
    ],
  },
  {
    module: "Payments",
    permissions: [
      {
        id: "payments:view",
        name: "View Payments",
        description: "Can view payment history",
      },
      {
        id: "payments:process",
        name: "Process Payments",
        description: "Can process driver payouts",
      },
      {
        id: "payments:refund",
        name: "Refund Payments",
        description: "Can process refunds",
      },
    ],
  },
  {
    module: "Enterprises",
    permissions: [
      {
        id: "enterprises:view",
        name: "View Enterprises",
        description: "Can view enterprise list",
      },
      {
        id: "enterprises:approve",
        name: "Approve Enterprises",
        description: "Can approve/reject enterprises",
      },
      {
        id: "enterprises:update",
        name: "Edit Enterprises",
        description: "Can edit enterprise details",
      },
      {
        id: "enterprises:suspend",
        name: "Suspend Enterprises",
        description: "Can suspend enterprises",
      },
    ],
  },
  {
    module: "SOS",
    permissions: [
      {
        id: "sos:view",
        name: "View SOS Alerts",
        description: "Can view SOS alerts",
      },
      {
        id: "sos:respond",
        name: "Respond to SOS",
        description: "Can respond to SOS alerts",
      },
      {
        id: "sos:resolve",
        name: "Resolve SOS",
        description: "Can resolve SOS alerts",
      },
    ],
  },
  {
    module: "Tracking",
    permissions: [
      {
        id: "tracking:view",
        name: "View Tracking",
        description: "Can view driver tracking",
      },
    ],
  },
  {
    module: "Support",
    permissions: [
      {
        id: "support:view",
        name: "View Tickets",
        description: "Can view support tickets",
      },
      {
        id: "support:respond",
        name: "Respond to Tickets",
        description: "Can reply to tickets",
      },
      {
        id: "support:resolve",
        name: "Resolve Tickets",
        description: "Can resolve tickets",
      },
      {
        id: "support:assign",
        name: "Assign Tickets",
        description: "Can assign tickets to staff",
      },
    ],
  },
  {
    module: "Promos",
    permissions: [
      {
        id: "promos:view",
        name: "View Promos",
        description: "Can view promo codes",
      },
      {
        id: "promos:create",
        name: "Create Promos",
        description: "Can create promo codes",
      },
      {
        id: "promos:update",
        name: "Edit Promos",
        description: "Can edit promo codes",
      },
      {
        id: "promos:delete",
        name: "Delete Promos",
        description: "Can delete promo codes",
      },
    ],
  },
  {
    module: "Notifications",
    permissions: [
      {
        id: "notifications:view",
        name: "View Notifications",
        description: "Can view notifications",
      },
      {
        id: "notifications:send",
        name: "Send Notifications",
        description: "Can send push notifications",
      },
    ],
  },
  {
    module: "Settings",
    permissions: [
      {
        id: "settings:view",
        name: "View Settings",
        description: "Can view app settings",
      },
      {
        id: "settings:update",
        name: "Edit Settings",
        description: "Can modify app settings",
      },
    ],
  },
  {
    module: "Staff",
    permissions: [
      {
        id: "staff:view",
        name: "View Staff",
        description: "Can view staff members",
      },
      {
        id: "staff:create",
        name: "Create Staff",
        description: "Can add staff members",
      },
      {
        id: "staff:update",
        name: "Edit Staff",
        description: "Can edit staff members",
      },
      {
        id: "staff:delete",
        name: "Delete Staff",
        description: "Can remove staff members",
      },
    ],
  },
  {
    module: "Roles",
    permissions: [
      {
        id: "roles:view",
        name: "View Roles",
        description: "Can view roles",
      },
      {
        id: "roles:create",
        name: "Create Roles",
        description: "Can create roles",
      },
      {
        id: "roles:update",
        name: "Edit Roles",
        description: "Can edit roles",
      },
      {
        id: "roles:delete",
        name: "Delete Roles",
        description: "Can delete roles",
      },
    ],
  },
  {
    module: "Reports",
    permissions: [
      {
        id: "reports:view",
        name: "View Reports",
        description: "Can view reports",
      },
      {
        id: "reports:export",
        name: "Export Reports",
        description: "Can export reports",
      },
    ],
  },
];

const StaffManagement: React.FC = () => {
  useAuth(); // For authentication check
  const [activeTab, setActiveTab] = useState<"staff" | "roles">("staff");
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<PageSize>(10);
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, pages: 0 });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Staff Modal
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    email: "",
    phone: "",
    roleId: "",
    password: "",
  });

  // Reset Password Modal
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordStaff, setResetPasswordStaff] =
    useState<StaffMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Role Modal
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  // Delete Confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "staff" | "role";
    id: string;
  } | null>(null);

  // Auto-dismiss notifications
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [staffResponse, rolesResponse] = await Promise.all([
        staffApi.getAll({
          page,
          limit,
          search: searchQuery || undefined,
          role: roleFilter !== "ALL" ? roleFilter : undefined,
          status: statusFilter !== "ALL" ? statusFilter.toLowerCase() : undefined,
        }),
        rolesApi.getAll(),
      ]);

      if (staffResponse.success) {
        // Map backend data to frontend format
        const mappedStaff = (staffResponse.data.staff || []).map((s: any) => ({
          ...s,
          name: s.fullName || s.name || "",
          role: s.roleId ||
            s.role || {
              _id: "",
              name: s.roleName || "Unknown",
              permissions: [],
            },
        }));
        setStaffMembers(mappedStaff);
        if (staffResponse.data.pagination) {
          setPaginationMeta({
            total: staffResponse.data.pagination.total || 0,
            pages: staffResponse.data.pagination.pages || 0,
          });
        }
      }
      if (rolesResponse.success) {
        setRoles(rolesResponse.data.roles || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, roleFilter, statusFilter]);

  // Server-side pagination: staffMembers IS already the current page data
  const paginatedStaff = staffMembers;
  const currentPage = page;
  const totalPages = paginationMeta.pages;
  const totalItems = paginationMeta.total;
  const startIndex = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalItems);

  const stats = useMemo(
    () => ({
      total: paginationMeta.total,
      active: staffMembers.filter((s) => s.isActive).length,
      inactive: staffMembers.filter((s) => !s.isActive).length,
      roles: roles.length,
    }),
    [staffMembers, roles, paginationMeta],
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

  const generateRandomPassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleSaveStaff = async () => {
    if (!staffForm.name || !staffForm.email || !staffForm.roleId) {
      setError("Please fill in all required fields");
      return;
    }
    if (!editingStaff && !staffForm.password) {
      setError("Password is required for new staff member");
      return;
    }
    if (!editingStaff && staffForm.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingStaff) {
        await staffApi.update(editingStaff._id, {
          fullName: staffForm.name,
          email: staffForm.email,
          phone: staffForm.phone,
          roleId: staffForm.roleId,
        });
        setSuccess("Staff member updated successfully");
      } else {
        await staffApi.create({
          fullName: staffForm.name,
          email: staffForm.email,
          phone: staffForm.phone,
          password: staffForm.password,
          roleId: staffForm.roleId,
        });
        setSuccess("Staff member created successfully");
      }

      setShowStaffModal(false);
      setEditingStaff(null);
      setStaffForm({
        name: "",
        email: "",
        phone: "",
        roleId: "",
        password: "",
      });
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordStaff) return;

    if (!newPassword || newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await staffApi.resetPassword(resetPasswordStaff._id, newPassword);
      setSuccess(
        `Password reset successfully for ${resetPasswordStaff.name || resetPasswordStaff.fullName}`,
      );
      setShowResetPasswordModal(false);
      setResetPasswordStaff(null);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to reset password");
    } finally {
      setSaving(false);
    }
  };

  const openResetPasswordModal = (staff: StaffMember) => {
    setResetPasswordStaff(staff);
    setNewPassword("");
    setConfirmPassword("");
    setShowResetPasswordModal(true);
  };

  const handleSaveRole = async () => {
    if (!roleForm.name || roleForm.permissions.length === 0) {
      setError("Please provide a role name and select at least one permission");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (editingRole) {
        await rolesApi.update(editingRole._id, {
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        });
        setSuccess("Role updated successfully");
      } else {
        await rolesApi.create({
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        });
        setSuccess("Role created successfully");
      }

      setShowRoleModal(false);
      setEditingRole(null);
      setRoleForm({ name: "", description: "", permissions: [] });
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStaffStatus = async (staffId: string) => {
    try {
      const response = await staffApi.toggleStatus(staffId);
      setSuccess(response.data?.message || "Staff status updated successfully");
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to toggle staff status");
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      await staffApi.delete(id);
      setSuccess("Staff member deleted successfully");
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to delete staff member");
    }
  };

  const handleDeleteRole = async (id: string) => {
    const role = roles.find((r) => r._id === id);
    if (role?.isSystem) {
      setError("Cannot delete system role");
      return;
    }
    if (role && role.staffCount > 0) {
      setError("Cannot delete role with assigned staff members");
      return;
    }
    try {
      await rolesApi.delete(id);
      setSuccess("Role deleted successfully");
      setDeleteConfirm(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Failed to delete role");
    }
  };

  const togglePermission = (permissionId: string) => {
    setRoleForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter((p) => p !== permissionId)
        : [...prev.permissions, permissionId],
    }));
  };

  const toggleModulePermissions = (module: string) => {
    const modulePerms =
      PERMISSION_MODULES.find((m) => m.module === module)?.permissions.map(
        (p) => p.id,
      ) || [];
    const allSelected = modulePerms.every((p) =>
      roleForm.permissions.includes(p),
    );

    if (allSelected) {
      setRoleForm((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !modulePerms.includes(p)),
      }));
    } else {
      setRoleForm((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...modulePerms])],
      }));
    }
  };

  const openEditStaffModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setStaffForm({
      name: staff.name || staff.fullName || "",
      email: staff.email || "",
      phone: staff.phone || "",
      roleId: staff.role?._id || "",
      password: "",
    });
    setShowStaffModal(true);
  };

  const openEditRoleModal = (role: Role) => {
    setEditingRole(role);
    setRoleForm({
      name: role.name || "",
      description: role.description || "",
      permissions: [...(role.permissions || [])],
    });
    setShowRoleModal(true);
  };

  // Helper to get display name
  const getStaffDisplayName = (staff: StaffMember) => {
    return staff.name || staff.fullName || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Notifications */}
      {success && (
        <div className="fixed z-50 flex items-center gap-3 px-4 py-3 text-green-800 border border-green-200 shadow-lg top-4 right-4 bg-green-50 rounded-xl animate-in slide-in-from-top-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <span className="font-medium">{success}</span>
          <button
            onClick={() => setSuccess(null)}
            className="ml-2 text-green-600 hover:text-green-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="fixed z-50 flex items-center gap-3 px-4 py-3 text-red-800 border border-red-200 shadow-lg top-4 right-4 bg-red-50 rounded-xl animate-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="font-medium">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-800">
            <Shield className="w-6 h-6 text-movezy-500" />
            Staff Management
          </h2>
          <p className="text-sm text-gray-500">
            Manage staff members and access roles
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("staff")}
          className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "staff"
              ? "border-movezy-500 text-movezy-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="inline-block w-4 h-4 mr-2" />
          Staff Members ({stats.total})
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
            activeTab === "roles"
              ? "border-movezy-500 text-movezy-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Key className="inline-block w-4 h-4 mr-2" />
          Roles & Permissions ({stats.roles})
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Staff</p>
              <p className="mt-1 text-2xl font-bold text-gray-800">
                {stats.total}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active</p>
              <p className="mt-1 text-2xl font-bold text-green-600">
                {stats.active}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Inactive</p>
              <p className="mt-1 text-2xl font-bold text-gray-600">
                {stats.inactive}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-100 shadow-sm rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Roles</p>
              <p className="mt-1 text-2xl font-bold text-purple-600">
                {stats.roles}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl">
              <Key className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Staff Tab Content */}
      {activeTab === "staff" && (
        <div className="overflow-hidden bg-white border border-gray-100 shadow-sm rounded-2xl">
          {/* Filters */}
          <div className="flex flex-col gap-4 p-4 border-b border-gray-100 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-2 pl-10 pr-4 text-sm border border-gray-200 rounded-xl"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl"
            >
              <option value="ALL">All Roles</option>
              {roles.map((role) => (
                <option key={role._id} value={role._id}>
                  {role.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 text-sm border border-gray-200 rounded-xl"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <button
              onClick={() => {
                setEditingStaff(null);
                setStaffForm({
                  name: "",
                  email: "",
                  phone: "",
                  roleId: "",
                  password: "",
                });
                setShowStaffModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-movezy-500 rounded-xl hover:bg-movezy-600"
            >
              <Plus className="w-4 h-4" />
              Add Staff
            </button>
          </div>

          {/* Staff Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                    Staff Member
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                    Role
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-left text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-sm font-semibold text-right text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No staff members found
                    </td>
                  </tr>
                ) : (
                  paginatedStaff.map((staff) => (
                    <tr key={staff._id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-movezy-100">
                            <span className="font-semibold text-movezy-600">
                              {getStaffDisplayName(staff)
                                .charAt(0)
                                .toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">
                              {getStaffDisplayName(staff)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {staff.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            staff.role?.isSystem
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {staff.role?.name || "No Role"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-gray-600">
                          {staff.phone || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-4 h-4" />
                          {getTimeAgo(staff.lastLogin)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            staff.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {staff.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditStaffModal(staff)}
                            className="p-2 text-gray-400 rounded-lg hover:text-blue-600 hover:bg-blue-50"
                            title="Edit Staff"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openResetPasswordModal(staff)}
                            className="p-2 text-gray-400 rounded-lg hover:text-purple-600 hover:bg-purple-50"
                            title="Reset Password"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleStaffStatus(staff._id)}
                            className={`p-2 rounded-lg ${
                              staff.isActive
                                ? "text-gray-400 hover:text-orange-600 hover:bg-orange-50"
                                : "text-gray-400 hover:text-green-600 hover:bg-green-50"
                            }`}
                            title={staff.isActive ? "Deactivate" : "Activate"}
                          >
                            {staff.isActive ? (
                              <Lock className="w-4 h-4" />
                            ) : (
                              <Unlock className="w-4 h-4" />
                            )}
                          </button>
                          {!staff.role?.isSystem && (
                            <button
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "staff",
                                  id: staff._id,
                                })
                              }
                              className="p-2 text-gray-400 rounded-lg hover:text-red-600 hover:bg-red-50"
                              title="Delete Staff"
                            >
                              <Trash2 className="w-4 h-4" />
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
            onPageChange={setPage}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            itemLabel="staff members"
            pageSize={limit}
            onPageSizeChange={(size) => { setLimit(size); setPage(1); }}
          />
        </div>
      )}

      {/* Roles Tab Content */}
      {activeTab === "roles" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingRole(null);
                setRoleForm({ name: "", description: "", permissions: [] });
                setShowRoleModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-movezy-500 rounded-xl hover:bg-movezy-600"
            >
              <Plus className="w-4 h-4" />
              Create Role
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role._id}
                className="p-5 transition-shadow bg-white border border-gray-100 shadow-sm rounded-2xl hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        role.isSystem ? "bg-purple-100" : "bg-blue-100"
                      }`}
                    >
                      <Shield
                        className={`w-5 h-5 ${role.isSystem ? "text-purple-600" : "text-blue-600"}`}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">
                        {role.name}
                      </h3>
                      {role.isSystem && (
                        <span className="text-xs font-medium text-purple-600">
                          System Role
                        </span>
                      )}
                    </div>
                  </div>
                  {!role.isSystem && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEditRoleModal(role)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          setDeleteConfirm({ type: "role", id: role._id })
                        }
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <p className="mb-4 text-sm text-gray-500">{role.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">
                    <Users className="inline-block w-4 h-4 mr-1" />
                    {role.staffCount} members
                  </span>
                  <span className="text-gray-500">
                    <Key className="inline-block w-4 h-4 mr-1" />
                    {role.permissions.length} permissions
                  </span>
                </div>

                <div className="pt-4 mt-4 border-t border-gray-100">
                  <p className="mb-2 text-xs text-gray-500">Permissions:</p>
                  <div className="flex flex-wrap gap-1">
                    {PERMISSION_MODULES.filter((m) =>
                      m.permissions.some((p) =>
                        role.permissions.includes(p.id),
                      ),
                    )
                      .slice(0, 4)
                      .map((m) => (
                        <span
                          key={m.module}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {m.module}
                        </span>
                      ))}
                    {PERMISSION_MODULES.filter((m) =>
                      m.permissions.some((p) =>
                        role.permissions.includes(p.id),
                      ),
                    ).length > 4 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                        +
                        {PERMISSION_MODULES.filter((m) =>
                          m.permissions.some((p) =>
                            role.permissions.includes(p.id),
                          ),
                        ).length - 4}{" "}
                        more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-lg bg-white rounded-2xl">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingStaff ? "Edit Staff Member" : "Add Staff Member"}
                </h3>
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={staffForm.email}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  placeholder="email@movezy.com"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={staffForm.phone}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Role *
                </label>
                <select
                  value={staffForm.roleId}
                  onChange={(e) =>
                    setStaffForm({ ...staffForm, roleId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role._id} value={role._id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>

              {!editingStaff && (
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={staffForm.password}
                      onChange={(e) =>
                        setStaffForm({ ...staffForm, password: e.target.value })
                      }
                      className="w-full px-4 py-2 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                      placeholder="Min 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = generateRandomPassword();
                      setStaffForm({ ...staffForm, password: generated });
                      setShowPassword(true);
                    }}
                    className="flex items-center gap-1 mt-2 text-xs font-medium text-movezy-600 hover:text-movezy-700"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Generate Password
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowStaffModal(false);
                  setEditingStaff(null);
                  setStaffForm({
                    name: "",
                    email: "",
                    phone: "",
                    roleId: "",
                    password: "",
                  });
                }}
                className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveStaff}
                disabled={
                  !staffForm.name ||
                  !staffForm.email ||
                  !staffForm.roleId ||
                  saving ||
                  (!editingStaff &&
                    (!staffForm.password || staffForm.password.length < 8))
                }
                className="flex items-center gap-2 px-4 py-2 text-white bg-movezy-500 rounded-xl hover:bg-movezy-600 disabled:opacity-50"
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                {editingStaff ? "Save Changes" : "Add Staff"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingRole ? "Edit Role" : "Create New Role"}
                </h3>
                <button
                  onClick={() => setShowRoleModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                    placeholder="e.g. Support Manager"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    type="text"
                    value={roleForm.description}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, description: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-movezy-500"
                    placeholder="Brief description of this role"
                  />
                </div>
              </div>

              <div>
                <h4 className="mb-4 font-medium text-gray-800">
                  Permissions ({roleForm.permissions.length} selected)
                </h4>
                <div className="space-y-4">
                  {PERMISSION_MODULES.map((module) => {
                    const modulePerms = module.permissions.map((p) => p.id);
                    const selectedCount = modulePerms.filter((p) =>
                      roleForm.permissions.includes(p),
                    ).length;
                    const allSelected = selectedCount === modulePerms.length;

                    return (
                      <div
                        key={module.module}
                        className="overflow-hidden border border-gray-200 rounded-xl"
                      >
                        <div
                          className="flex items-center justify-between p-3 cursor-pointer bg-gray-50"
                          onClick={() => toggleModulePermissions(module.module)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center ${
                                allSelected
                                  ? "bg-movezy-500 border-movezy-500"
                                  : selectedCount > 0
                                    ? "bg-movezy-100 border-movezy-300"
                                    : "border-gray-300"
                              }`}
                            >
                              {allSelected && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <span className="font-medium text-gray-800">
                              {module.module}
                            </span>
                          </div>
                          <span className="text-sm text-gray-500">
                            {selectedCount}/{modulePerms.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-2">
                          {module.permissions.map((perm) => (
                            <label
                              key={perm.id}
                              className="flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={roleForm.permissions.includes(perm.id)}
                                onChange={() => togglePermission(perm.id)}
                                className="w-4 h-4 rounded text-movezy-500 focus:ring-movezy-500"
                              />
                              <div>
                                <p className="text-sm font-medium text-gray-700">
                                  {perm.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRole}
                disabled={
                  !roleForm.name || roleForm.permissions.length === 0 || saving
                }
                className="flex items-center gap-2 px-4 py-2 text-white bg-movezy-500 rounded-xl hover:bg-movezy-600 disabled:opacity-50"
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                {editingRole ? "Save Changes" : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && resetPasswordStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md bg-white shadow-xl rounded-2xl">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Reset Password
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Set a new password for{" "}
                  {getStaffDisplayName(resetPasswordStaff)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordStaff(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="p-2 text-gray-400 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-movezy-100">
                  <span className="text-lg font-semibold text-movezy-600">
                    {getStaffDisplayName(resetPasswordStaff)
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {getStaffDisplayName(resetPasswordStaff)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {resetPasswordStaff.email}
                  </p>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                    className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute text-gray-400 -translate-y-1/2 right-3 top-1/2 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-movezy-500 ${
                    confirmPassword && newPassword !== confirmPassword
                      ? "border-red-300 bg-red-50"
                      : "border-gray-200"
                  }`}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  const generated = generateRandomPassword();
                  setNewPassword(generated);
                  setConfirmPassword(generated);
                  setShowPassword(true);
                }}
                className="flex items-center gap-2 text-sm font-medium text-movezy-600 hover:text-movezy-700"
              >
                <RefreshCw className="w-4 h-4" />
                Generate Random Password
              </button>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetPasswordStaff(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={
                  !newPassword ||
                  newPassword.length < 8 ||
                  newPassword !== confirmPassword ||
                  saving
                }
                className="flex items-center gap-2 px-4 py-2 text-white bg-movezy-500 rounded-xl hover:bg-movezy-600 disabled:opacity-50"
              >
                {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 bg-white rounded-2xl">
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-800">
                Delete{" "}
                {deleteConfirm.type === "staff" ? "Staff Member" : "Role"}?
              </h3>
              <p className="mb-6 text-gray-500">
                This action cannot be undone.
                {deleteConfirm.type === "staff"
                  ? " The staff member will lose access immediately."
                  : " Make sure no staff members are assigned to this role."}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    deleteConfirm.type === "staff"
                      ? handleDeleteStaff(deleteConfirm.id)
                      : handleDeleteRole(deleteConfirm.id)
                  }
                  className="px-4 py-2 text-white bg-red-500 rounded-xl hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagement;
