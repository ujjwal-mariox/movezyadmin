// Admin API Service
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";

// Helper function to get auth token
const getAuthToken = () => localStorage.getItem("adminToken");

// Generic fetch wrapper with auth
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();

  // If no token exists, throw error but don't redirect
  if (!token) {
    console.error("[API] No token found in localStorage");
    throw new Error("No authentication token. Please login.");
  }

  console.log(`[API] Calling: ${API_URL}${endpoint}`);
  console.log(`[API] Token (first 50 chars): ${token.substring(0, 50)}...`);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    console.log(`[API] Response status: ${response.status}`);

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[API] 401 Unauthorized:", errorData);
      // DON'T auto-logout - let the user see the error first
      alert(
        `API returned 401: ${errorData.message || "Session expired"}\n\nCheck console for details.`,
      );
      throw new Error(
        errorData.message || "Session expired. Please login again.",
      );
    }

    // Handle 403 Forbidden - no permission (don't logout)
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({}));
      console.error("[API] 403 Forbidden:", errorData.message);
      throw new Error(
        errorData.message || "You don't have permission for this action.",
      );
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Request failed" }));
      console.error(`[API] Error: ${error.message}`);
      throw new Error(error.message || "Request failed");
    }

    return response.json();
  } catch (error: any) {
    // Network error or other fetch error
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      console.error("[API] Network error - is the backend running?");
      alert("Cannot connect to backend. Is the server running on port 9050?");
      throw new Error(
        "Unable to connect to server. Please check your connection.",
      );
    }
    throw error;
  }
};

// Fetch wrapper for FormData (file uploads) — omits Content-Type so browser sets multipart boundary
const fetchFormData = async (endpoint: string, formData: FormData, method: string = "POST") => {
  const token = getAuthToken();
  if (!token) throw new Error("No authentication token. Please login.");

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (response.status === 401) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Session expired. Please login again.");
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }
  return response.json();
};

// ==================== ENTERPRISE API ====================
export const enterpriseApi = {
  // Get all enterprises
  getAll: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/enterprises?${query}`);
  },

  // Get single enterprise
  getById: (id: string) => fetchWithAuth(`/admin/enterprises/${id}`),

  // Approve enterprise
  approve: (id: string, data: { creditLimit: number; billingCycle: string }) =>
    fetchWithAuth(`/admin/enterprises/${id}/approve`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Reject enterprise
  reject: (id: string, reason: string) =>
    fetchWithAuth(`/admin/enterprises/${id}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),

  // Suspend enterprise
  suspend: (id: string, reason: string) =>
    fetchWithAuth(`/admin/enterprises/${id}/suspend`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),

  // Update credit limit
  updateCreditLimit: (id: string, creditLimit: number) =>
    fetchWithAuth(`/admin/enterprises/${id}/credit-limit`, {
      method: "PUT",
      body: JSON.stringify({ creditLimit }),
    }),

  // Get enterprise users
  getUsers: (id: string) => fetchWithAuth(`/admin/enterprises/${id}/users`),

  // Get enterprise bookings
  getBookings: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/enterprises/${id}/bookings?${query}`);
  },
};

// ==================== SOS/EMERGENCY API ====================
export const sosApi = {
  // Get active SOS alerts
  getActiveAlerts: () => fetchWithAuth("/admin/sos/active"),

  // Get all SOS alerts
  getAll: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/sos?${query}`);
  },

  // Respond to SOS
  respond: (id: string) =>
    fetchWithAuth(`/admin/sos/${id}/respond`, { method: "PUT" }),

  // Resolve SOS
  resolve: (id: string, resolution: string) =>
    fetchWithAuth(`/admin/sos/${id}/resolve`, {
      method: "PUT",
      body: JSON.stringify({ resolution }),
    }),

  // Notify police
  notifyPolice: (id: string) =>
    fetchWithAuth(`/admin/sos/${id}/notify-police`, { method: "POST" }),

  // Get SOS stats
  getStats: () => fetchWithAuth("/admin/sos/stats"),
};

// ==================== TRACKING API ====================
export const trackingApi = {
  // Get all drivers on map
  getDriversOnMap: (params?: { status?: string; bounds?: string }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/tracking/drivers?${query}`);
  },

  // Get driver location history
  getDriverHistory: (
    driverId: string,
    params?: { from?: string; to?: string },
  ) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(
      `/admin/tracking/drivers/${driverId}/history?${query}`,
    );
  },

  // Get active bookings with locations
  getActiveBookings: () => fetchWithAuth("/admin/tracking/bookings/active"),
};

// ==================== NOTIFICATION API ====================
export const notificationApi = {
  // Send promo notification
  sendPromoNotification: (data: {
    title: string;
    body: string;
    promoCode?: string;
    targetAudience: "all" | "active" | "inactive";
  }) =>
    fetchWithAuth("/admin/notifications/promo", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Send notification to specific users
  sendToUsers: (data: { userIds: string[]; title: string; body: string }) =>
    fetchWithAuth("/admin/notifications/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get notification templates
  getTemplates: () => fetchWithAuth("/admin/notifications/templates"),

  // Create notification template
  createTemplate: (data: {
    name: string;
    title: string;
    body: string;
    type: string;
  }) =>
    fetchWithAuth("/admin/notifications/templates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get notification history
  getHistory: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/notifications/history?${query}`);
  },
};

// ==================== PROMO CODE API ====================
export const promoApi = {
  // Get all promo codes
  getAll: (params?: { status?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/promos?${query}`);
  },

  // Get single promo
  getById: (id: string) => fetchWithAuth(`/admin/promos/${id}`),

  // Create promo code
  create: (data: {
    code: string;
    discountType: "PERCENTAGE" | "FIXED";
    discountValue: number;
    minOrderAmount?: number;
    maxDiscount?: number;
    usageLimit?: number;
    startDate: string;
    endDate: string;
    description?: string;
  }) =>
    fetchWithAuth("/admin/promos", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update promo code
  update: (
    id: string,
    data: Partial<{
      discountValue: number;
      minOrderAmount: number;
      maxDiscount: number;
      usageLimit: number;
      endDate: string;
      isActive: boolean;
    }>,
  ) =>
    fetchWithAuth(`/admin/promos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete promo code
  delete: (id: string) =>
    fetchWithAuth(`/admin/promos/${id}`, { method: "DELETE" }),

  // Get promo usage stats
  getUsageStats: (id: string) => fetchWithAuth(`/admin/promos/${id}/stats`),
};

// ==================== SUPPORT TICKET API ====================
export const supportApi = {
  // Get all tickets
  getAll: (params?: {
    status?: string;
    priority?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/support/tickets?${query}`);
  },

  // Get single ticket
  getById: (id: string) => fetchWithAuth(`/admin/support/tickets/${id}`),

  // Get ticket messages
  getMessages: (id: string) =>
    fetchWithAuth(`/admin/support/tickets/${id}/messages`),

  // Reply to ticket
  reply: (id: string, message: string) =>
    fetchWithAuth(`/admin/support/tickets/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Update ticket status
  updateStatus: (id: string, status: string) =>
    fetchWithAuth(`/admin/support/tickets/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // Assign ticket
  assign: (id: string, adminId: string) =>
    fetchWithAuth(`/admin/support/tickets/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify({ adminId }),
    }),

  // Resolve ticket
  resolve: (id: string, resolution: string) =>
    fetchWithAuth(`/admin/support/tickets/${id}/resolve`, {
      method: "PUT",
      body: JSON.stringify({ resolution }),
    }),

  // Get ticket stats
  getStats: () => fetchWithAuth("/admin/support/stats"),
};

// ==================== DASHBOARD API ====================
export const dashboardApi = {
  // Get dashboard stats
  getStats: () => fetchWithAuth("/admin/dashboard/stats"),

  // Get revenue chart data
  getRevenueChart: (period: "week" | "month" | "year") =>
    fetchWithAuth(`/admin/dashboard/revenue?period=${period}`),

  // Get booking chart data
  getBookingChart: (period: "week" | "month" | "year") =>
    fetchWithAuth(`/admin/dashboard/bookings?period=${period}`),

  // Get recent activity
  getRecentActivity: () => fetchWithAuth("/admin/dashboard/activity"),
};

// ==================== COINS/REWARDS API ====================
export const coinsApi = {
  // Get coin settings
  getSettings: () => fetchWithAuth("/admin/coins/settings"),

  // Update coin settings
  updateSettings: (data: {
    coinsPerRupee: number;
    maxCoinsPerBooking: number;
    coinValue: number;
  }) =>
    fetchWithAuth("/admin/coins/settings", {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Get user coin balance
  getUserBalance: (userId: string) =>
    fetchWithAuth(`/admin/coins/users/${userId}`),

  // Adjust user coins
  adjustCoins: (
    userId: string,
    data: { amount: number; reason: string; type: "CREDIT" | "DEBIT" },
  ) =>
    fetchWithAuth(`/admin/coins/users/${userId}/adjust`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ==================== STAFF MANAGEMENT API ====================
export const staffApi = {
  // Get all staff members
  getAll: (params?: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/staff?${query}`);
  },

  // Get single staff member
  getById: (id: string) => fetchWithAuth(`/admin/staff/${id}`),

  // Create staff member
  create: (data: {
    fullName: string;
    email: string;
    phone?: string;
    password: string;
    roleId: string;
  }) =>
    fetchWithAuth("/admin/staff", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update staff member
  update: (
    id: string,
    data: {
      fullName?: string;
      email?: string;
      phone?: string;
      roleId?: string;
    },
  ) =>
    fetchWithAuth(`/admin/staff/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete staff member
  delete: (id: string) =>
    fetchWithAuth(`/admin/staff/${id}`, { method: "DELETE" }),

  // Activate/Deactivate staff
  toggleStatus: (id: string) =>
    fetchWithAuth(`/admin/staff/${id}/toggle-status`, { method: "PUT" }),

  // Reset password
  resetPassword: (id: string, newPassword: string) =>
    fetchWithAuth(`/admin/staff/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify({ newPassword }),
    }),

  // Get activity log
  getActivityLog: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/staff/${id}/activity?${query}`);
  },
};

// ==================== ROLES API ====================
export const rolesApi = {
  // Get all roles
  getAll: () => fetchWithAuth("/admin/roles"),

  // Get single role
  getById: (id: string) => fetchWithAuth(`/admin/roles/${id}`),

  // Create role
  create: (data: {
    name: string;
    description?: string;
    permissions: string[];
  }) =>
    fetchWithAuth("/admin/roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update role
  update: (
    id: string,
    data: { name?: string; description?: string; permissions?: string[] },
  ) =>
    fetchWithAuth(`/admin/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete role
  delete: (id: string) =>
    fetchWithAuth(`/admin/roles/${id}`, { method: "DELETE" }),

  // Get all permissions
  getPermissions: () => fetchWithAuth("/admin/roles/permissions"),

  // Initialize default roles
  initializeDefaults: () =>
    fetchWithAuth("/admin/roles/initialize", { method: "POST" }),

  // Get sidebar modules
  getSidebarModules: () => fetchWithAuth("/admin/sidebar-modules"),
};

// ==================== DRIVERS API ====================
export const driversApi = {
  // Get all drivers with filters
  getAll: (params?: {
    status?: string;
    isActive?: boolean;
    isOnline?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, String(value));
        }
      });
    }
    const suffix = query.toString();
    return fetchWithAuth(`/admin/drivers${suffix ? `?${suffix}` : ""}`);
  },

  // Get driver by ID with full details
  getById: (id: string) => fetchWithAuth(`/admin/drivers/${id}`),

  // Get pending verifications
  getPendingVerifications: () =>
    fetchWithAuth("/admin/drivers/pending-verification"),

  // Get driver documents/KYC
  getDocuments: (id: string) => fetchWithAuth(`/admin/drivers/${id}/documents`),

  // Verify driver (approve/reject)
  verify: (
    id: string,
    data: { action: "approve" | "reject"; rejectionReason?: string },
  ) =>
    fetchWithAuth(`/admin/drivers/${id}/verify`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Update driver status
  updateStatus: (
    id: string,
    data: { status?: string; isActive?: boolean; reason?: string },
  ) =>
    fetchWithAuth(`/admin/drivers/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Get driver stats
  getStats: () => fetchWithAuth("/admin/drivers/stats"),

  // Update driver profile
  update: (
    id: string,
    data: Partial<{
      fullName: string;
      email: string;
      gender: string;
      dob: string;
      bloodGroup: string;
      city: string;
      state: string;
      languages: string[];
    }>,
  ) =>
    fetchWithAuth(`/admin/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Update bank details
  updateBankDetails: (
    id: string,
    data: {
      accountHolderName: string;
      bankName: string;
      accountNumber: string;
      ifscCode: string;
    },
  ) =>
    fetchWithAuth(`/admin/drivers/${id}/bank-details`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Verify bank details
  verifyBankDetails: (id: string) =>
    fetchWithAuth(`/admin/drivers/${id}/bank-details/verify`, {
      method: "PUT",
    }),

  // Get driver vehicles
  getVehicles: (id: string) => fetchWithAuth(`/admin/drivers/${id}/vehicles`),

  // Delete driver (soft delete)
  delete: (id: string) =>
    fetchWithAuth(`/admin/drivers/${id}`, { method: "DELETE" }),

  // Restore deleted driver
  restore: (id: string) =>
    fetchWithAuth(`/admin/drivers/${id}/restore`, { method: "PUT" }),

  // Get driver bookings
  getBookings: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/drivers/${id}/bookings?${query}`);
  },

  // Get driver earnings
  getEarnings: (
    id: string,
    params?: { dateFrom?: string; dateTo?: string },
  ) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/drivers/${id}/earnings?${query}`);
  },
};

// ==================== APP USERS API ====================
export const usersApi = {
  // Get all app users (customers)
  getAll: (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const query = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          query.append(key, String(value));
        }
      });
    }

    const suffix = query.toString();
    return fetchWithAuth(`/admin/users${suffix ? `?${suffix}` : ""}`);
  },

  // Get single user
  getById: (id: string) => fetchWithAuth(`/admin/users/${id}`),

  // Get user bookings
  getBookings: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/users/${id}/bookings?${query}`);
  },

  // Get user transactions
  getTransactions: (id: string, params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/users/${id}/transactions?${query}`);
  },

  // Get user addresses
  getAddresses: (id: string) => fetchWithAuth(`/admin/users/${id}/addresses`),

  // Add user address
  addAddress: (
    id: string,
    data: {
      fullName?: string;
      mobileNumber?: string;
      houseNo: string;
      area: string;
      city: string;
      state: string;
      country?: string;
      pinCode: number;
      addressType: "Home" | "Work" | "Other";
      latitude?: number;
      longitude?: number;
      isSelected?: boolean;
    },
  ) =>
    fetchWithAuth(`/admin/users/${id}/addresses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Update user address
  updateAddress: (
    userId: string,
    addressId: string,
    data: {
      fullName?: string;
      mobileNumber?: string;
      houseNo?: string;
      area?: string;
      city?: string;
      state?: string;
      country?: string;
      pinCode?: number;
      addressType?: "Home" | "Work" | "Other";
      latitude?: number;
      longitude?: number;
      isSelected?: boolean;
    },
  ) =>
    fetchWithAuth(`/admin/users/${userId}/addresses/${addressId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Delete user address
  deleteAddress: (userId: string, addressId: string) =>
    fetchWithAuth(`/admin/users/${userId}/addresses/${addressId}`, {
      method: "DELETE",
    }),

  // Set address as primary
  setAddressPrimary: (userId: string, addressId: string) =>
    fetchWithAuth(`/admin/users/${userId}/addresses/${addressId}/primary`, {
      method: "PUT",
    }),

  // Update user profile
  update: (
    id: string,
    data: {
      fullName?: string;
      email?: string;
      gender?: string;
      dob?: string;
      notificationAllowed?: boolean;
    },
  ) =>
    fetchWithAuth(`/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Update user active status
  updateStatus: (id: string, data: { isActive: boolean; reason?: string }) =>
    fetchWithAuth(`/admin/users/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Block user
  block: (id: string, reason: string) =>
    fetchWithAuth(`/admin/users/${id}/block`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    }),

  // Unblock user
  unblock: (id: string) =>
    fetchWithAuth(`/admin/users/${id}/unblock`, { method: "PUT" }),

  // Restore deleted user
  restore: (id: string) =>
    fetchWithAuth(`/admin/users/${id}/restore`, { method: "PUT" }),

  // Adjust user coins
  adjustCoins: (
    id: string,
    data: { amount: number; reason: string; type: "CREDIT" | "DEBIT" },
  ) =>
    fetchWithAuth(`/admin/users/${id}/coins`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Delete user
  delete: (id: string) =>
    fetchWithAuth(`/admin/users/${id}`, {
      method: "DELETE",
    }),

  // Get user stats
  getStats: () => fetchWithAuth("/admin/users/stats"),

  // Export users
  export: (params?: { format?: "csv" | "xlsx"; status?: string }) => {
    const query = new URLSearchParams(
      params as Record<string, string>,
    ).toString();
    return fetchWithAuth(`/admin/users/export?${query}`);
  },
};

// ==================== VEHICLE TYPES API ====================
export const vehicleTypesApi = {
  // Get all vehicle types (with pagination)
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    return fetchWithAuth(`/admin/config/vehicle-types?${query}`);
  },

  // Create vehicle type (supports image file upload)
  create: (data: Record<string, any>, imageFile?: File) => {
    if (imageFile) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });
      formData.append("image", imageFile);
      return fetchFormData("/admin/config/vehicle-types", formData, "POST");
    }
    return fetchWithAuth("/admin/config/vehicle-types", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Update vehicle type (supports image file upload)
  update: (id: string, data: Record<string, any>, imageFile?: File) => {
    if (imageFile) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });
      formData.append("image", imageFile);
      return fetchFormData(`/admin/config/vehicle-types/${id}`, formData, "PUT");
    }
    return fetchWithAuth(`/admin/config/vehicle-types/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Toggle vehicle type active status
  toggle: (id: string) =>
    fetchWithAuth(`/admin/config/vehicle-types/${id}/toggle`, {
      method: "PUT",
    }),

  // Soft delete vehicle type
  delete: (id: string) =>
    fetchWithAuth(`/admin/config/vehicle-types/${id}`, { method: "DELETE" }),

  // Restore deleted vehicle type
  restore: (id: string) =>
    fetchWithAuth(`/admin/config/vehicle-types/${id}/restore`, {
      method: "PUT",
    }),
};

// ==================== TRAINING MATERIALS API ====================
export interface TrainingMaterialItem {
  _id: string;
  title: string;
  description: string;
  type: "youtube" | "video" | "image" | "document";
  url: string;
  thumbnailUrl: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const trainingApi = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.status) query.set("status", params.status);
    if (params?.type) query.set("type", params.type);
    return fetchWithAuth(`/admin/training?${query}`);
  },

  create: (data: Record<string, any>, file?: File) => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) formData.append(key, String(value));
    });
    if (file) formData.append("file", file);
    return fetchFormData("/admin/training", formData, "POST");
  },

  update: (id: string, data: Record<string, any>, file?: File) => {
    if (file) {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) formData.append(key, String(value));
      });
      formData.append("file", file);
      return fetchFormData(`/admin/training/${id}`, formData, "PUT");
    }
    return fetchWithAuth(`/admin/training/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  toggle: (id: string) =>
    fetchWithAuth(`/admin/training/${id}/toggle`, { method: "PUT" }),

  delete: (id: string) =>
    fetchWithAuth(`/admin/training/${id}`, { method: "DELETE" }),
};

// ==================== DEFAULT EXPORT ====================

// ==================== AUDIT LOG API ====================
export const auditApi = {
  getLogs: (params: { page?: number; limit?: number; module?: string; action?: string; search?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.limit) query.set("limit", String(params.limit));
    if (params.module) query.set("module", params.module);
    if (params.action) query.set("action", params.action);
    if (params.search) query.set("search", params.search);
    return fetchWithAuth(`/admin/audit-logs?${query.toString()}`);
  },
  getStats: () => fetchWithAuth("/admin/audit-logs/stats"),
};

// ==================== AUTOMATION API ====================
export const automationApi = {
  getRules: () => fetchWithAuth("/admin/automation/rules"),
  getRule: (id: string) => fetchWithAuth(`/admin/automation/rules/${id}`),
  createRule: (data: any) => fetchWithAuth("/admin/automation/rules", { method: "POST", body: JSON.stringify(data) }),
  updateRule: (id: string, data: any) => fetchWithAuth(`/admin/automation/rules/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteRule: (id: string) => fetchWithAuth(`/admin/automation/rules/${id}`, { method: "DELETE" }),
  toggleRule: (id: string) => fetchWithAuth(`/admin/automation/rules/${id}/toggle`, { method: "PUT" }),
  getTriggerTypes: () => fetchWithAuth("/admin/automation/trigger-types"),
  getActionTypes: () => fetchWithAuth("/admin/automation/action-types"),
};

// ==================== FINANCE API ====================
export const financeApi = {
  getOverview: (period: string = "month") => fetchWithAuth(`/admin/finance/overview?period=${period}`),
  getPayouts: (params: { page?: number; status?: string } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.status) query.set("status", params.status);
    return fetchWithAuth(`/admin/finance/payouts?${query.toString()}`);
  },
  getCODSummary: () => fetchWithAuth("/admin/finance/cod-summary"),
  exportData: (period: string = "month") => fetchWithAuth(`/admin/finance/export?period=${period}`),
};

// ==================== ENHANCED DASHBOARD API ====================
export const dashboardLiveApi = {
  getAlerts: () => fetchWithAuth("/admin/dashboard/alerts"),
  getLiveStats: () => fetchWithAuth("/admin/dashboard/live-stats"),
  getEventTimeline: (limit: number = 10) => fetchWithAuth(`/admin/dashboard/event-timeline?limit=${limit}`),
};

// ==================== MASTER DATA API ====================
export const masterDataApi = {
  // Cities
  getCities: (params?: { page?: number; limit?: number; search?: string; activeOnly?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.activeOnly) query.set("activeOnly", params.activeOnly);
    return fetchWithAuth(`/admin/config/cities?${query.toString()}`);
  },
  createCity: (data: { name: string; state: string; sortOrder?: number }) =>
    fetchWithAuth("/admin/config/cities", { method: "POST", body: JSON.stringify(data) }),
  updateCity: (id: string, data: Record<string, unknown>) =>
    fetchWithAuth(`/admin/config/cities/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCity: (id: string) =>
    fetchWithAuth(`/admin/config/cities/${id}`, { method: "DELETE" }),

  // Body Types
  getBodyTypes: (params?: { page?: number; limit?: number; search?: string; activeOnly?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.activeOnly) query.set("activeOnly", params.activeOnly);
    return fetchWithAuth(`/admin/config/body-types?${query.toString()}`);
  },
  createBodyType: (data: { name: string; sortOrder?: number }) =>
    fetchWithAuth("/admin/config/body-types", { method: "POST", body: JSON.stringify(data) }),
  updateBodyType: (id: string, data: Record<string, unknown>) =>
    fetchWithAuth(`/admin/config/body-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBodyType: (id: string) =>
    fetchWithAuth(`/admin/config/body-types/${id}`, { method: "DELETE" }),

  // Fuel Types
  getFuelTypes: (params?: { page?: number; limit?: number; search?: string; activeOnly?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);
    if (params?.activeOnly) query.set("activeOnly", params.activeOnly);
    return fetchWithAuth(`/admin/config/fuel-types?${query.toString()}`);
  },
  createFuelType: (data: { name: string; sortOrder?: number }) =>
    fetchWithAuth("/admin/config/fuel-types", { method: "POST", body: JSON.stringify(data) }),
  updateFuelType: (id: string, data: Record<string, unknown>) =>
    fetchWithAuth(`/admin/config/fuel-types/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFuelType: (id: string) =>
    fetchWithAuth(`/admin/config/fuel-types/${id}`, { method: "DELETE" }),
};

export default {
  enterprise: enterpriseApi,
  sos: sosApi,
  tracking: trackingApi,
  notification: notificationApi,
  promo: promoApi,
  support: supportApi,
  dashboard: dashboardApi,
  coins: coinsApi,
  staff: staffApi,
  roles: rolesApi,
  users: usersApi,
  drivers: driversApi,
  vehicleTypes: vehicleTypesApi,
  audit: auditApi,
  automation: automationApi,
  finance: financeApi,
  dashboardLive: dashboardLiveApi,
  masterData: masterDataApi,
};
