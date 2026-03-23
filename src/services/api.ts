// src/services/api.ts
import type { Enterprise } from "../types/admin";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";

const getHeaders = () => {
  const token = localStorage.getItem("adminToken");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const fetchCustomers = async () => {
  const response = await fetch(`${API_URL}/customers`, {
    headers: getHeaders(),
  });
  return response.json();
};

// ─── WALLET ADMIN APIs ───

export interface WalletUser {
  _id: string;
  userId: string;
  balance: number;
  lockedBalance: number;
  createdAt: string;
  updatedAt: string;
  user: {
    fullName?: string;
    mobileNumber?: string;
    email?: string;
    profileImage?: string;
  };
}

export interface WalletTransactionItem {
  _id: string;
  userId: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  referenceId?: string;
  description?: string;
  balanceBefore: number;
  balanceAfter: number;
  status: "PENDING" | "COMPLETED" | "FAILED";
  createdAt: string;
  user?: {
    fullName?: string;
    mobileNumber?: string;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface WalletsResponse {
  success: boolean;
  data: {
    wallets: WalletUser[];
    pagination: PaginationMeta;
  };
}

export interface TransactionsResponse {
  success: boolean;
  data: {
    transactions: WalletTransactionItem[];
    pagination: PaginationMeta;
  };
}

export interface UserWalletResponse {
  success: boolean;
  data: {
    balance: number;
    lockedBalance: number;
    transactions: WalletTransactionItem[];
  };
}

export const fetchAllWallets = async (
  page = 1,
  limit = 20,
  search?: string
): Promise<WalletsResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set("search", search);

  const res = await fetch(`${API_URL}/wallet/admin/all?${params}`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const fetchUserWallet = async (
  userId: string
): Promise<UserWalletResponse> => {
  const res = await fetch(`${API_URL}/wallet/admin/user/${userId}`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const creditUserWallet = async (
  userId: string,
  amount: number,
  description: string
) => {
  const res = await fetch(`${API_URL}/wallet/admin/user/${userId}/credit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ amount, description }),
  });
  return res.json();
};

export const debitUserWallet = async (
  userId: string,
  amount: number,
  description: string
) => {
  const res = await fetch(`${API_URL}/wallet/admin/user/${userId}/debit`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ amount, description }),
  });
  return res.json();
};

export const fetchAllTransactions = async (
  page = 1,
  limit = 20,
  type?: string,
  status?: string
): Promise<TransactionsResponse> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (type) params.set("type", type);
  if (status) params.set("status", status);

  const res = await fetch(`${API_URL}/wallet/admin/transactions?${params}`, {
    headers: getHeaders(),
  });
  return res.json();
};

// ─── CONFIG / CATEGORY APIs ───

export interface VehicleTypeItem {
  _id: string;
  name: string;
  description?: string;
  maxWeightKg: number;
  baseFare: number;
  perKmRate: number;
  perMinuteRate: number;
  image?: string;
  icon?: string;
  isActive: boolean;
  isDeleted: boolean;
  sortOrder: number;
}

export interface GoodsTypeItem {
  _id: string;
  name: string;
  code: string;
  category: "BUSINESS" | "PERSONAL";
  icon: string;
  description: string;
  allowedVehicleTypes: VehicleTypeItem[];
  isActive: boolean;
  isDeleted: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface AddonServiceItem {
  _id: string;
  name: string;
  code: string;
  description: string;
  icon: string;
  priceType: "FIXED" | "PER_FLOOR" | "PER_KG";
  price: number;
  isActive: boolean;
  applicableVehicleTypes: VehicleTypeItem[];
  sortOrder: number;
  createdAt: string;
}

export interface PromoCodeItem {
  _id: string;
  code: string;
  description: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  maxUsage: number;
  usedCount: number;
  perUserLimit: number;
  validFrom: string;
  validTo: string;
  applicableVehicleTypes: VehicleTypeItem[];
  applicableServiceTypes: string[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
}

// Vehicle Types
export const fetchVehicleTypes = async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const res = await fetch(`${API_URL}/admin/config/vehicle-types?${query}`, { headers: getHeaders() });
  return res.json();
};

// Goods Types (Delivery Categories)
export const fetchGoodsTypes = async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const res = await fetch(`${API_URL}/admin/config/goods-types?${query}`, { headers: getHeaders() });
  return res.json();
};

export const createGoodsType = async (data: Partial<GoodsTypeItem>) => {
  const res = await fetch(`${API_URL}/admin/config/goods-types`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updateGoodsType = async (id: string, data: Partial<GoodsTypeItem>) => {
  const res = await fetch(`${API_URL}/admin/config/goods-types/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const toggleGoodsType = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/goods-types/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return res.json();
};

export const deleteGoodsType = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/goods-types/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

// Addon Services
export const fetchAddonServices = async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const res = await fetch(`${API_URL}/admin/config/addon-services?${query}`, { headers: getHeaders() });
  return res.json();
};

export const createAddonService = async (data: Partial<AddonServiceItem>) => {
  const res = await fetch(`${API_URL}/admin/config/addon-services`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updateAddonService = async (id: string, data: Partial<AddonServiceItem>) => {
  const res = await fetch(`${API_URL}/admin/config/addon-services/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const toggleAddonService = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/addon-services/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return res.json();
};

export const deleteAddonService = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/addon-services/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

// Promo Codes
export const fetchPromos = async (page = 0, limit = 20, search?: string, status?: string) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  const res = await fetch(`${API_URL}/admin/promos?${params}`, { headers: getHeaders() });
  return res.json();
};

export const createPromo = async (data: Partial<PromoCodeItem>) => {
  const res = await fetch(`${API_URL}/admin/promos`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updatePromo = async (id: string, data: Partial<PromoCodeItem>) => {
  const res = await fetch(`${API_URL}/admin/promos/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const togglePromo = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/promos/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return res.json();
};

export const deletePromo = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/promos/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

// ─── CANCELLATION REASONS ───

export interface CancellationReasonItem {
  _id: string;
  reason: string;
  code: string;
  applicableTo: "USER" | "DRIVER" | "BOTH";
  penaltyType: "NONE" | "FIXED" | "PERCENTAGE";
  penaltyValue: number;
  isRefundable: boolean;
  refundPercentage: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const fetchCancellationReasons = async (params?: { page?: number; limit?: number; search?: string; activeOnly?: string; applicableTo?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.activeOnly) query.set("activeOnly", params.activeOnly);
  if (params?.applicableTo) query.set("applicableTo", params.applicableTo);
  const res = await fetch(`${API_URL}/admin/config/cancellation-reasons?${query}`, { headers: getHeaders() });
  return res.json();
};

export const createCancellationReason = async (data: Partial<CancellationReasonItem>) => {
  const res = await fetch(`${API_URL}/admin/config/cancellation-reasons`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updateCancellationReason = async (id: string, data: Partial<CancellationReasonItem>) => {
  const res = await fetch(`${API_URL}/admin/config/cancellation-reasons/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteCancellationReason = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/cancellation-reasons/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

// ─── PROHIBITED ITEMS ───

export interface ProhibitedItemData {
  _id: string;
  name: string;
  icon: string;
  image: string;
  bgColor: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const fetchProhibitedItems = async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const res = await fetch(`${API_URL}/admin/config/prohibited-items?${query}`, { headers: getHeaders() });
  return res.json();
};

export const createProhibitedItem = async (data: Partial<ProhibitedItemData>) => {
  const res = await fetch(`${API_URL}/admin/config/prohibited-items`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updateProhibitedItem = async (id: string, data: Partial<ProhibitedItemData>) => {
  const res = await fetch(`${API_URL}/admin/config/prohibited-items/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteProhibitedItem = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/prohibited-items/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

// ─── ENTERPRISE ACCOUNTS ───

export const fetchEnterprises = async (status?: string, search?: string, page = 1, limit = 20) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status && status !== "ALL") params.set("status", status);
  if (search) params.set("search", search);
  const res = await fetch(`${API_URL}/admin/enterprises?${params}`, { headers: getHeaders() });
  return res.json();
};

export const createEnterprise = async (data: Partial<Enterprise>) => {
  const res = await fetch(`${API_URL}/admin/enterprises`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updateEnterprise = async (enterpriseId: string, data: Partial<Enterprise>) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteEnterprise = async (enterpriseId: string) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

export const approveEnterprise = async (enterpriseId: string, data: { creditLimit: number; discountPercentage: number; paymentTerms: number }) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}/approve`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const rejectEnterprise = async (enterpriseId: string, data: { reason: string }) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}/reject`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const suspendEnterprise = async (enterpriseId: string, data: { reason: string }) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}/suspend`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

// ─── ENTERPRISE INQUIRIES ───

export interface EnterpriseInquiryData {
  _id: string;
  userId: { _id: string; fullName?: string; mobileNumber?: string; email?: string; profileImage?: string } | string;
  name: string;
  phone: string;
  email?: string;
  companyName?: string;
  message?: string;
  source: "GET_IN_TOUCH" | "ENTERPRISE_ENTRY";
  status: "NEW" | "CONTACTED" | "CONVERTED" | "CLOSED";
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export const fetchEnterpriseInquiries = async (status?: string, search?: string, page = 1, limit = 20) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status && status !== "ALL") params.set("status", status);
  if (search) params.set("search", search);
  const res = await fetch(`${API_URL}/admin/enterprises/inquiries?${params}`, { headers: getHeaders() });
  return res.json();
};

export const updateEnterpriseInquiry = async (id: string, data: { status?: string; adminNotes?: string }) => {
  const res = await fetch(`${API_URL}/admin/enterprises/inquiries/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const deleteEnterpriseInquiry = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/enterprises/inquiries/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

// ─── ENTERPRISE PAGE CONTENT ───

export interface EnterpriseFeatureData {
  _id?: string;
  icon: string;
  title: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

export interface EnterpriseFaqData {
  _id?: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
}

export interface EnterpriseClientData {
  _id?: string;
  name: string;
  logoUrl: string;
  sortOrder: number;
  isActive: boolean;
}

export interface EnterpriseContentData {
  _id?: string;
  heroTitle: string;
  heroSubtitle: string;
  features: EnterpriseFeatureData[];
  faqs: EnterpriseFaqData[];
  clients: EnterpriseClientData[];
  ctaText: string;
  ctaSubtext: string;
  isActive: boolean;
}

export const fetchEnterpriseContent = async () => {
  const res = await fetch(`${API_URL}/admin/enterprises/content`, { headers: getHeaders() });
  return res.json();
};

export const updateEnterpriseContent = async (data: Partial<EnterpriseContentData>) => {
  const res = await fetch(`${API_URL}/admin/enterprises/content`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

// Driver Instructions
export interface DriverInstructionItem {
  _id: string;
  text: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const fetchDriverInstructions = async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const res = await fetch(`${API_URL}/admin/driver-instructions?${query}`, { headers: getHeaders() });
  return res.json();
};

export const createDriverInstruction = async (data: Partial<DriverInstructionItem>) => {
  const res = await fetch(`${API_URL}/admin/driver-instructions`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updateDriverInstruction = async (id: string, data: Partial<DriverInstructionItem>) => {
  const res = await fetch(`${API_URL}/admin/driver-instructions/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const toggleDriverInstruction = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/driver-instructions/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return res.json();
};

export const deleteDriverInstruction = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/driver-instructions/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

// Badges
export interface BadgeItem {
  _id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  unlockType: string;
  unlockValue: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const fetchBadges = async (params?: { page?: number; limit?: number; search?: string; status?: string }) => {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  if (params?.status) query.set("status", params.status);
  const res = await fetch(`${API_URL}/admin/badges?${query}`, { headers: getHeaders() });
  return res.json();
};

export const createBadge = async (data: Partial<BadgeItem>) => {
  const res = await fetch(`${API_URL}/admin/badges`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const updateBadge = async (id: string, data: Partial<BadgeItem>) => {
  const res = await fetch(`${API_URL}/admin/badges/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return res.json();
};

export const toggleBadge = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/badges/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return res.json();
};

export const deleteBadge = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/badges/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return res.json();
};

