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

/** Throws a readable Error on non-2xx instead of letting error envelopes masquerade as success. */
const ensureOk = async (res: Response) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  return res.json();
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
  // Uses the audited admin endpoint: records a WalletTransaction AND an AuditLog
  // entry (action UPDATE / module users). Body key is `reason` per that controller.
  const res = await fetch(`${API_URL}/admin/users/${userId}/wallet/add`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ amount, reason: description }),
  });
  return ensureOk(res);
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
  return ensureOk(res);
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
  // Real usage stats attached by the admin list endpoint (from PromoUsage + bookings).
  realDiscount?: number;
  realRevenue?: number;
  redemptions?: number;
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
  return ensureOk(res);
};

export const updateGoodsType = async (id: string, data: Partial<GoodsTypeItem>) => {
  const res = await fetch(`${API_URL}/admin/config/goods-types/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const toggleGoodsType = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/goods-types/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const deleteGoodsType = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/goods-types/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
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
  return ensureOk(res);
};

export const updateAddonService = async (id: string, data: Partial<AddonServiceItem>) => {
  const res = await fetch(`${API_URL}/admin/config/addon-services/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const toggleAddonService = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/addon-services/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const deleteAddonService = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/addon-services/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

// Promo Codes
// ─── FAQs (Help & Support content) ───
export interface FaqItem {
  _id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  isActive: boolean;
}

export const fetchAdminFaqs = async () => {
  const res = await fetch(`${API_URL}/admin/faqs`, { headers: getHeaders() });
  return ensureOk(res);
};

export const createAdminFaq = async (data: Partial<FaqItem>) => {
  const res = await fetch(`${API_URL}/admin/faqs`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateAdminFaq = async (id: string, data: Partial<FaqItem>) => {
  const res = await fetch(`${API_URL}/admin/faqs/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteAdminFaq = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/faqs/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

// ─── Driver onboarding coupons ───
export interface OnboardingCouponItem {
  _id: string;
  code: string;
  description?: string;
  discountType: "PERCENT" | "FLAT";
  value: number;
  maxUses: number;
  usedCount: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
}

export const fetchOnboardingCoupons = async () => {
  const res = await fetch(`${API_URL}/admin/onboarding-coupons`, { headers: getHeaders() });
  return ensureOk(res);
};

export const createOnboardingCoupon = async (data: {
  code: string;
  description?: string;
  discountType: "PERCENT" | "FLAT";
  value: number;
  maxUses?: number;
  validFrom: string;
  validTo: string;
}) => {
  const res = await fetch(`${API_URL}/admin/onboarding-coupons`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateOnboardingCoupon = async (id: string, data: Record<string, unknown>) => {
  const res = await fetch(`${API_URL}/admin/onboarding-coupons/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteOnboardingCoupon = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/onboarding-coupons/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

// ─── Customer discounts (automatic strikethrough pricing) ───
export interface UserDiscountItem {
  _id: string;
  name: string;
  percent: number;
  maxDiscountAmount: number;
  appliesTo: "ALL" | "USERS";
  userIds: { _id: string; fullName?: string; mobileNumber?: string }[];
  validFrom: string;
  validTo: string;
  isActive: boolean;
  createdAt: string;
}

export const fetchUserDiscounts = async () => {
  const res = await fetch(`${API_URL}/admin/user-discounts`, { headers: getHeaders() });
  return ensureOk(res);
};

export const createUserDiscount = async (data: {
  name: string;
  percent: number;
  maxDiscountAmount?: number;
  appliesTo: "ALL" | "USERS";
  userMobileNumbers?: string[];
  validFrom: string;
  validTo: string;
}) => {
  const res = await fetch(`${API_URL}/admin/user-discounts`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateUserDiscount = async (id: string, data: Record<string, unknown>) => {
  const res = await fetch(`${API_URL}/admin/user-discounts/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteUserDiscount = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/user-discounts/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

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
  return ensureOk(res);
};

export const updatePromo = async (id: string, data: Partial<PromoCodeItem>) => {
  const res = await fetch(`${API_URL}/admin/promos/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const togglePromo = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/promos/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const deletePromo = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/promos/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
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
  return ensureOk(res);
};

export const updateCancellationReason = async (id: string, data: Partial<CancellationReasonItem>) => {
  const res = await fetch(`${API_URL}/admin/config/cancellation-reasons/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteCancellationReason = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/cancellation-reasons/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
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
  return ensureOk(res);
};

export const updateProhibitedItem = async (id: string, data: Partial<ProhibitedItemData>) => {
  const res = await fetch(`${API_URL}/admin/config/prohibited-items/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteProhibitedItem = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/config/prohibited-items/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
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
  return ensureOk(res);
};

export const updateEnterprise = async (enterpriseId: string, data: Partial<Enterprise>) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteEnterprise = async (enterpriseId: string) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const approveEnterprise = async (enterpriseId: string, data: { creditLimit: number; discountPercentage: number; paymentTerms: number }) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}/approve`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const rejectEnterprise = async (enterpriseId: string, data: { reason: string }) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}/reject`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const suspendEnterprise = async (enterpriseId: string, data: { reason: string }) => {
  const res = await fetch(`${API_URL}/admin/enterprises/${enterpriseId}/suspend`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
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
  return ensureOk(res);
};

export const deleteEnterpriseInquiry = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/enterprises/inquiries/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
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
  return ensureOk(res);
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
  return ensureOk(res);
};

export const updateDriverInstruction = async (id: string, data: Partial<DriverInstructionItem>) => {
  const res = await fetch(`${API_URL}/admin/driver-instructions/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const toggleDriverInstruction = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/driver-instructions/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const deleteDriverInstruction = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/driver-instructions/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
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
  return ensureOk(res);
};

export const updateBadge = async (id: string, data: Partial<BadgeItem>) => {
  const res = await fetch(`${API_URL}/admin/badges/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const toggleBadge = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/badges/${id}/toggle`, {
    method: "PUT", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const deleteBadge = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/badges/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

// ─── SUPPORT ADMIN APIs ───

export type SupportTicketType = "CUSTOMER" | "DRIVER" | "PAYMENT" | "TECHNICAL";
export type SupportChannel = "CUSTOMER" | "DRIVER" | "INTERNAL";
export type SupportResolutionType = "RESOLVED" | "REJECTED" | "DUPLICATE" | "ESCALATED";

export interface SupportTicketListParams {
  status?: string;
  priority?: string;
  category?: string;
  type?: SupportTicketType;
  escalated?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export const fetchSupportTickets = async (params: SupportTicketListParams = {}) => {
  const q = new URLSearchParams();
  if (params.status) q.set("status", params.status);
  if (params.priority) q.set("priority", params.priority);
  if (params.category) q.set("category", params.category);
  if (params.type) q.set("type", params.type);
  if (typeof params.escalated === "boolean") q.set("escalated", String(params.escalated));
  if (params.search) q.set("search", params.search);
  q.set("page", String(params.page ?? 0));
  q.set("limit", String(params.limit ?? 50));
  const res = await fetch(`${API_URL}/admin/support/tickets?${q}`, { headers: getHeaders() });
  return res.json();
};

export const fetchSupportTicket = async (ticketId: string, channel?: SupportChannel) => {
  const q = channel ? `?channel=${channel}` : "";
  const res = await fetch(`${API_URL}/admin/support/tickets/${ticketId}${q}`, { headers: getHeaders() });
  return res.json();
};

export const fetchSupportStats = async () => {
  const res = await fetch(`${API_URL}/admin/support/stats`, { headers: getHeaders() });
  return res.json();
};

export const assignSupportTicket = async (
  ticketId: string,
  data: { adminId?: string; staffName?: string; staffRole?: string },
) => {
  const res = await fetch(`${API_URL}/admin/support/tickets/${ticketId}/assign`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateSupportTicketStatus = async (
  ticketId: string,
  data: { status: string; resolution?: string; resolutionType?: SupportResolutionType },
) => {
  const res = await fetch(`${API_URL}/admin/support/tickets/${ticketId}/status`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const replySupportTicket = async (
  ticketId: string,
  data: { message: string; channel?: SupportChannel; attachments?: string[] },
) => {
  const res = await fetch(`${API_URL}/admin/support/tickets/${ticketId}/reply`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const escalateSupportTicket = async (ticketId: string, reason: string) => {
  const res = await fetch(`${API_URL}/admin/support/tickets/${ticketId}/escalate`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify({ reason }),
  });
  return ensureOk(res);
};

// Quick replies
export interface QuickReplyItem {
  _id: string;
  title: string;
  body: string;
  type?: SupportTicketType;
  category?: string;
  tags: string[];
  isActive: boolean;
  useCount: number;
  createdAt: string;
}

export const fetchQuickReplies = async (filters?: {
  type?: SupportTicketType;
  category?: string;
  search?: string;
  isActive?: boolean;
}) => {
  const q = new URLSearchParams();
  if (filters?.type) q.set("type", filters.type);
  if (filters?.category) q.set("category", filters.category);
  if (filters?.search) q.set("search", filters.search);
  if (typeof filters?.isActive === "boolean") q.set("isActive", String(filters.isActive));
  const res = await fetch(`${API_URL}/admin/support/quick-replies?${q}`, { headers: getHeaders() });
  return res.json();
};

export const createQuickReply = async (data: Partial<QuickReplyItem>) => {
  const res = await fetch(`${API_URL}/admin/support/quick-replies`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateQuickReply = async (id: string, data: Partial<QuickReplyItem>) => {
  const res = await fetch(`${API_URL}/admin/support/quick-replies/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteQuickReply = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/support/quick-replies/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const markQuickReplyUsed = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/support/quick-replies/${id}/use`, {
    method: "POST", headers: getHeaders(),
  });
  return ensureOk(res);
};

// ─── NOTIFICATIONS ADMIN APIs ───

export type NotificationAudience = "ALL" | "USERS" | "DRIVERS" | "ENTERPRISES";
export type NotificationType =
  | "BOOKING"
  | "PAYMENT"
  | "PROMO"
  | "SYSTEM"
  | "CHAT"
  | "REWARD";

export interface NotificationTemplate {
  _id: string;
  name: string;
  code: string;
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  variables: string[];
  priority?: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  tags: string[];
  isActive: boolean;
  useCount: number;
  createdAt: string;
}

export interface NotificationCampaign {
  _id: string;
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  templateId?: string;
  targetedCount: number;
  /**
   * Of the targeted accounts, how many had a push token to send to. A campaign
   * with targetedCount 5000 and pushTargetedCount 0 reached nobody — the
   * accounts exist but no device is registered.
   */
  pushTargetedCount?: number;
  sentCount: number;
  readCount: number;
  failedCount: number;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED";
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
}

export const fetchNotificationTemplates = async (filters?: {
  type?: NotificationType;
  audience?: NotificationAudience;
  isActive?: boolean;
  search?: string;
}) => {
  const q = new URLSearchParams();
  if (filters?.type) q.set("type", filters.type);
  if (filters?.audience) q.set("audience", filters.audience);
  if (typeof filters?.isActive === "boolean") q.set("isActive", String(filters.isActive));
  if (filters?.search) q.set("search", filters.search);
  const res = await fetch(`${API_URL}/admin/notifications/templates?${q}`, { headers: getHeaders() });
  return res.json();
};

export const createNotificationTemplate = async (data: Partial<NotificationTemplate>) => {
  const res = await fetch(`${API_URL}/admin/notifications/templates`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateNotificationTemplate = async (id: string, data: Partial<NotificationTemplate>) => {
  const res = await fetch(`${API_URL}/admin/notifications/templates/${id}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteNotificationTemplate = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/notifications/templates/${id}`, {
    method: "DELETE", headers: getHeaders(),
  });
  return ensureOk(res);
};

export const sendNotificationBroadcast = async (data: {
  title: string;
  body: string;
  type: NotificationType;
  audience: NotificationAudience;
  templateId?: string;
  /** Restrict the send to these recipients; omit for a true broadcast. */
  driverIds?: string[];
  userIds?: string[];
  data?: Record<string, unknown>;
}) => {
  const res = await fetch(`${API_URL}/admin/notifications/broadcast`, {
    method: "POST", headers: getHeaders(), body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const fetchNotificationHistory = async (filters?: {
  audience?: NotificationAudience;
  type?: NotificationType;
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) => {
  const q = new URLSearchParams();
  if (filters?.audience) q.set("audience", filters.audience);
  if (filters?.type) q.set("type", filters.type);
  if (filters?.status) q.set("status", filters.status);
  if (filters?.search) q.set("search", filters.search);
  if (filters?.dateFrom) q.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) q.set("dateTo", filters.dateTo);
  q.set("page", String(filters?.page ?? 0));
  q.set("limit", String(filters?.limit ?? 50));
  const res = await fetch(`${API_URL}/admin/notifications/history?${q}`, { headers: getHeaders() });
  return res.json();
};

export const fetchNotificationAnalytics = async () => {
  const res = await fetch(`${API_URL}/admin/notifications/analytics`, { headers: getHeaders() });
  return res.json();
};

// ─── AUDIT LOG ADMIN APIs ───

export type AuditImpactLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface AuditLogEntry {
  _id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRole?: string;
  action: string;
  module: string;
  targetId?: string;
  targetType?: string;
  description: string;
  changes?: Array<{ field: string; oldValue: unknown; newValue: unknown }>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  impactLevel?: AuditImpactLevel;
  device?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  revertedFromId?: string;
  revertedAt?: string;
  revertedBy?: string;
  createdAt: string;
}

export interface AuditStats {
  totalToday: number;
  criticalToday: number;
  byModule: Array<{ _id: string; count: number }>;
  byAction: Array<{ _id: string; count: number }>;
  byImpact: Array<{ _id: string; count: number }>;
  recentExports: AuditLogEntry[];
}

export const fetchAuditLogs = async (filters?: {
  page?: number;
  limit?: number;
  module?: string;
  action?: string;
  adminId?: string;
  impactLevel?: AuditImpactLevel;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const q = new URLSearchParams();
  q.set("page", String(filters?.page ?? 1));
  q.set("limit", String(filters?.limit ?? 50));
  if (filters?.module) q.set("module", filters.module);
  if (filters?.action) q.set("action", filters.action);
  if (filters?.adminId) q.set("adminId", filters.adminId);
  if (filters?.impactLevel) q.set("impactLevel", filters.impactLevel);
  if (filters?.startDate) q.set("startDate", filters.startDate);
  if (filters?.endDate) q.set("endDate", filters.endDate);
  if (filters?.search) q.set("search", filters.search);
  const res = await fetch(`${API_URL}/admin/audit-logs?${q}`, { headers: getHeaders() });
  return res.json();
};

export const fetchAuditStats = async () => {
  const res = await fetch(`${API_URL}/admin/audit-logs/stats`, { headers: getHeaders() });
  return res.json();
};

export const revertAuditLog = async (id: string, reason?: string) => {
  const res = await fetch(`${API_URL}/admin/audit-logs/${id}/revert`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return ensureOk(res);
};

// ─── REPORTS ADMIN APIs ───

export type ReportRange = "7D" | "30D" | "90D" | "YTD";

export interface ReportCityRow {
  city: string;
  orders: number;
  revenue: number;
  completed: number;
  sharePct: number;
}

export interface ReportCategoryRow {
  name: string;
  orders: number;
  revenue: number;
  sharePct: number;
}

export interface ReportEnterpriseRow {
  _id: string;
  name?: string;
  city?: string;
  status?: string;
  orders: number;
  revenue: number;
  completed: number;
}

export interface ReportOpsMetrics {
  range: ReportRange;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  revenue: number;
  avgOrderValue: number;
  cancellationRatePct: number;
  onTimeRatePct: number;
  avgDeliveryMinutes: number;
  driverUtilizationPct: number;
  approvedDrivers: number;
  onlineDrivers: number;
}

export interface ReportSnapshot {
  range: ReportRange;
  labels: string[];
  series: {
    revenue: number[];
    orders: number[];
    customers: number[];
    drivers: number[];
    avgRating: number[];
    cancelRate: number[];
  };
}

const buildRangeQuery = (range?: ReportRange) => {
  const q = new URLSearchParams();
  if (range) q.set("range", range);
  return q.toString();
};

export const fetchCitiesReport = async (range?: ReportRange) => {
  const res = await fetch(
    `${API_URL}/admin/reports/cities?${buildRangeQuery(range)}`,
    { headers: getHeaders() },
  );
  return res.json();
};

export const fetchCategoriesReport = async (range?: ReportRange) => {
  const res = await fetch(
    `${API_URL}/admin/reports/categories?${buildRangeQuery(range)}`,
    { headers: getHeaders() },
  );
  return res.json();
};

export const fetchEnterprisesReport = async (range?: ReportRange) => {
  const res = await fetch(
    `${API_URL}/admin/reports/enterprises?${buildRangeQuery(range)}`,
    { headers: getHeaders() },
  );
  return res.json();
};

export const fetchOpsMetrics = async (range?: ReportRange) => {
  const res = await fetch(
    `${API_URL}/admin/reports/ops-metrics?${buildRangeQuery(range)}`,
    { headers: getHeaders() },
  );
  return res.json();
};

export const fetchSnapshot = async (range?: ReportRange) => {
  const res = await fetch(
    `${API_URL}/admin/reports/snapshot?${buildRangeQuery(range)}`,
    { headers: getHeaders() },
  );
  return res.json();
};

// ─── SCHEDULED REPORTS ───
export interface ScheduledReportItem {
  _id: string;
  name: string;
  template: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  recipients: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: "SENT" | "LOGGED" | "FAILED";
}

export interface ScheduledReportInput {
  name: string;
  template: string;
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  recipients: string[];
  isActive?: boolean;
}

export const fetchReportSchedules = async () => {
  const res = await fetch(`${API_URL}/admin/reports/schedules`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createReportSchedule = async (data: ScheduledReportInput) => {
  const res = await fetch(`${API_URL}/admin/reports/schedules`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateReportSchedule = async (
  id: string,
  data: Partial<ScheduledReportInput>,
) => {
  const res = await fetch(`${API_URL}/admin/reports/schedules/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const deleteReportSchedule = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/reports/schedules/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

export const runReportScheduleNow = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/reports/schedules/${id}/run`, {
    method: "POST",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

// ─── MANUAL DRIVER PAYOUTS ───
export interface PayoutItem {
  _id: string;
  driverId: { _id: string; fullName?: string; mobileNumber?: string } | string;
  amount: number;
  method: "BANK" | "UPI" | "CASH";
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  reference?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  /**
   * Separation of duties: the API refuses to let one admin both request and
   * approve a payout, or both approve and pay it. getPayouts returns the whole
   * document, so these are already in the payload — the UI needs them to hide
   * the actions that would come back as a 400.
   */
  requestedBy?: string;
  requestedByType?: "Admin" | "Driver";
  approvedBy?: string;
}

export const fetchPayouts = async (status?: string) => {
  const q = status ? `?status=${status}` : "";
  const res = await fetch(`${API_URL}/admin/finance/payouts${q}`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const createPayout = async (data: {
  driverId: string;
  amount: number;
  method?: "BANK" | "UPI" | "CASH";
  notes?: string;
}) => {
  const res = await fetch(`${API_URL}/admin/finance/payouts`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const approvePayout = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/finance/payouts/${id}/approve`, {
    method: "PUT",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

export const markPayoutPaid = async (id: string, reference?: string) => {
  const res = await fetch(`${API_URL}/admin/finance/payouts/${id}/pay`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reference }),
  });
  return ensureOk(res);
};

export const rejectPayout = async (id: string, reason?: string) => {
  const res = await fetch(`${API_URL}/admin/finance/payouts/${id}/reject`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return ensureOk(res);
};

// ─── CUSTOMER COIN → BANK PAYOUTS ───
// Requested by customers from the app, settled manually by an operator. Same
// lifecycle as driver payouts; rejecting one refunds the customer's coins.
export interface CoinPayoutItem {
  _id: string;
  userId: { _id: string; name?: string; phone?: string; email?: string } | string;
  coins: number;
  amount: number;
  rateApplied: number;
  status: "PENDING" | "APPROVED" | "PAID" | "REJECTED";
  bankSnapshot: { accountName: string; accountNumber: string; ifsc: string };
  reference?: string;
  rejectionReason?: string;
  createdAt: string;
}

export const fetchCoinPayouts = async (status?: string) => {
  const q = status ? `?status=${status}` : "";
  const res = await fetch(`${API_URL}/admin/finance/coin-payouts${q}`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const approveCoinPayout = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/finance/coin-payouts/${id}/approve`, {
    method: "PUT",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

export const markCoinPayoutPaid = async (id: string, reference: string) => {
  const res = await fetch(`${API_URL}/admin/finance/coin-payouts/${id}/pay`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reference }),
  });
  return ensureOk(res);
};

export const rejectCoinPayout = async (id: string, reason: string) => {
  const res = await fetch(`${API_URL}/admin/finance/coin-payouts/${id}/reject`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return ensureOk(res);
};

export const fetchDriverReports = async (range?: ReportRange) => {
  const now = new Date();
  const days = range === "7D" ? 7 : range === "90D" ? 90 : range === "YTD" ? undefined : 30;
  const dateFrom =
    range === "YTD"
      ? new Date(now.getFullYear(), 0, 1).toISOString()
      : days
        ? new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString()
        : undefined;
  const q = new URLSearchParams();
  if (dateFrom) q.set("dateFrom", dateFrom);
  q.set("dateTo", now.toISOString());
  const res = await fetch(`${API_URL}/admin/reports/drivers?${q}`, { headers: getHeaders() });
  return res.json();
};

// ─── USERS ADMIN APIs ───

export interface AdminUserAddress {
  id: string;
  address?: string;
  area?: string;
  city?: string;
  state?: string;
  country?: string;
  pinCode?: string;
  latitude?: number;
  longitude?: number;
  addressType?: string;
  houseNo?: string;
  isSelected?: boolean;
}

export interface AdminUserRow {
  _id: string;
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  profilePicture?: string;
  referralCode?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  isDeleted?: boolean;
  isVerified?: boolean;
  createdAt?: string;
  lastLoginAt?: string;
  bookingCount: number;
  completedBookings: number;
  totalSpent: number;
  coinBalance: number;
  walletBalance: number;
  addressCount: number;
  primaryAddress: AdminUserAddress | null;
  allAddresses: AdminUserAddress[];
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  blockedUsers: number;
  deletedUsers: number;
  newToday: number;
  newThisMonth: number;
  totalBookings: number;
  totalRevenue: number;
}

export interface AdminUserBookingRow {
  _id: string;
  orderId?: string;
  status?: string;
  createdAt?: string;
  pickupLocation?: { address?: string };
  dropLocation?: { address?: string };
  finalFare?: number;
  totalFare?: number;
  driverId?: { fullName?: string; mobileNumber?: string } | string | null;
  vehicleTypeId?: { name?: string } | string | null;
}

export interface AdminUserTransactionRow {
  _id: string;
  type?: string;
  amount?: number;
  balanceAfter?: number;
  description?: string;
  method?: string;
  status?: string;
  bookingId?: string;
  createdAt?: string;
}

export interface AdminUserDetailResponse {
  user: AdminUserRow & Record<string, unknown>;
  wallet: { balance: number; lockedBalance?: number };
  coinWallet: { balance: number; totalEarned?: number; totalRedeemed?: number };
  addresses: AdminUserAddress[];
  bookingStats: Array<{ _id: string; count: number; totalSpent: number }>;
}

export const fetchAdminUsers = async (params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  dateFrom?: string;
  dateTo?: string;
}) => {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
  }
  const res = await fetch(`${API_URL}/admin/users?${q}`, { headers: getHeaders() });
  return res.json();
};

export const fetchAdminUserStats = async () => {
  const res = await fetch(`${API_URL}/admin/users/stats`, { headers: getHeaders() });
  return res.json();
};

export const fetchAdminUserById = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/users/${id}`, { headers: getHeaders() });
  return res.json();
};

export const fetchAdminUserBookings = async (id: string, params?: { status?: string; page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
  }
  const res = await fetch(`${API_URL}/admin/users/${id}/bookings?${q}`, { headers: getHeaders() });
  return res.json();
};

export const fetchAdminUserTransactions = async (id: string, params?: { type?: string; page?: number; limit?: number }) => {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
  }
  const res = await fetch(`${API_URL}/admin/users/${id}/transactions?${q}`, { headers: getHeaders() });
  return res.json();
};

export const updateAdminUser = async (id: string, data: Record<string, unknown>) => {
  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const updateAdminUserStatus = async (id: string, isActive: boolean, reason?: string) => {
  const res = await fetch(`${API_URL}/admin/users/${id}/status`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ isActive, reason }),
  });
  return ensureOk(res);
};

export const blockAdminUser = async (id: string, reason?: string) => {
  const res = await fetch(`${API_URL}/admin/users/${id}/block`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ reason }),
  });
  return ensureOk(res);
};

export const unblockAdminUser = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/users/${id}/unblock`, {
    method: "PUT",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

export const deleteAdminUser = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/users/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

export const restoreAdminUser = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/users/${id}/restore`, {
    method: "PUT",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

export const adjustAdminUserCoins = async (id: string, data: { type: "CREDIT" | "DEBIT"; amount: number; reason: string }) => {
  const res = await fetch(`${API_URL}/admin/users/${id}/coins/adjust`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

// ─── SOS ADMIN APIs ───

export type SOSStatus = "ACTIVE" | "RESPONDED" | "RESOLVED" | "FALSE_ALARM";

export interface SOSAlertRow {
  _id: string;
  userId?: { _id: string; name?: string; fullName?: string; mobileNumber?: string } | string | null;
  driverId?: { _id: string; name?: string; fullName?: string; mobileNumber?: string } | string | null;
  bookingId?: { _id: string; bookingNumber?: string; orderId?: string } | string | null;
  triggeredBy: "USER" | "DRIVER";
  status: SOSStatus;
  location: { type?: "Point"; coordinates: [number, number] };
  address?: string;
  respondedBy?: { _id: string; name?: string; email?: string } | string | null;
  respondedAt?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  contactsNotified?: Array<{ contactId?: string; notifiedAt?: string; method?: string }>;
  policeNotified?: boolean;
  policeNotifiedAt?: string;
  audioRecordingUrl?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SOSAlertsResponse {
  alerts: SOSAlertRow[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface SOSStatsResponse {
  activeCount: number;
  todayCount: number;
  thisMonthCount: number;
  lastMonthCount: number;
  resolvedCount: number;
  falseAlarmCount: number;
  totalCount: number;
}

export const fetchSOSAlerts = async (params?: { status?: string; page?: number; limit?: number; startDate?: string; endDate?: string }) => {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
  }
  const res = await fetch(`${API_URL}/admin/sos?${q}`, { headers: getHeaders() });
  return res.json();
};

export const fetchActiveSOSAlerts = async () => {
  const res = await fetch(`${API_URL}/admin/sos/active`, { headers: getHeaders() });
  return res.json();
};

export const fetchSOSStats = async () => {
  const res = await fetch(`${API_URL}/admin/sos/stats`, { headers: getHeaders() });
  return res.json();
};

export const respondToSOSAlert = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/sos/${id}/respond`, {
    // Backend registers this as POST — PUT never matched, so "Respond" 404'd.
    method: "POST",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

export const resolveSOSAlert = async (id: string, data: { resolutionNotes?: string; isFalseAlarm?: boolean }) => {
  const res = await fetch(`${API_URL}/admin/sos/${id}/resolve`, {
    // Backend registers this as POST — PUT never matched, so "Resolve" 404'd.
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const notifyPoliceForSOS = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/sos/${id}/notify-police`, {
    // Backend route is POST (admin.routes.ts); was incorrectly PUT here, so the
    // request never matched the route. admin-api.ts already used POST.
    method: "POST",
    headers: getHeaders(),
  });
  return ensureOk(res);
};

// ============ ACTION CENTER ============

export interface ActionCenterPending {
  _id: string;
  bookingNumber?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  waitingSince: string;
  customerName?: string;
}

export interface ActionCenterDelayed {
  _id: string;
  bookingNumber?: string;
  delayMinutes: number;
  driverName?: string;
  driverPhone?: string;
  lat?: number;
  lng?: number;
}

export interface ActionCenterAtRisk {
  _id: string;
  bookingNumber?: string;
  risk: string;
  severity: "high" | "medium" | "low";
}

export interface ActionCenterResponse {
  pendingAssignments: ActionCenterPending[];
  delayedOrders: ActionCenterDelayed[];
  atRisk: ActionCenterAtRisk[];
}

export const fetchActionCenter = async (signal?: AbortSignal) => {
  const res = await fetch(`${API_URL}/admin/dashboard/action-center`, {
    headers: getHeaders(),
    signal,
  });
  // Was `res.json()` with no status check, so a 401 resolved to
  // { success: false, message: "Session expired or invalid" } and the caller
  // treated an auth failure as an empty-but-valid action centre.
  return ensureOk(res);
};

// ============ BOOKINGS ADMIN APIs ============

export type BookingStatus =
  | "DRAFT"
  | "SEARCHING"
  | "ASSIGNED"
  | "DRIVER_ARRIVED"
  | "PICKED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type BookingPaymentStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface BookingLocation {
  address: string;
  lat: number;
  lng: number;
  contactName?: string;
  contactPhone?: string;
}

export interface BookingRow {
  _id: string;
  bookingNumber?: string;
  userId?: { _id: string; fullName?: string; mobileNumber?: string } | string;
  driverId?: { _id: string; fullName?: string; mobileNumber?: string; vehicleNumber?: string } | string;
  vehicleTypeId?: { _id: string; name?: string } | string;
  serviceType?: "WITHIN_CITY" | "OUTSTATION";
  pickup?: BookingLocation;
  drop?: BookingLocation;
  distanceKm?: number;
  durationMin?: number;
  finalFare: number;
  status: BookingStatus;
  paymentMethod?: string;
  paymentStatus: BookingPaymentStatus;
  isScheduled?: boolean;
  scheduledAt?: string;
  createdAt: string;
  assignedAt?: string;
  driverArrivedAt?: string;
  pickedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  estimatedArrivalTime?: number;
  estimatedDropTime?: string;
  /// When the driver is due at PICKUP. Written at assignment, unlike
  /// estimatedDropTime which only exists after goods are collected — so this
  /// is the only field that can flag an order running late to the pickup.
  estimatedPickupTime?: string;
  liveLocation?: { lat?: number; lng?: number; updatedAt?: string };
  rating?: number;
  cancellationReason?: string;
  /**
   * Fare raised mid-trip (an added stop) on an already-prepaid booking: cash
   * the driver still has to collect. Present in the getAllBookings payload —
   * it just was not declared here, so the admin showed the raised fare as
   * fully PAID.
   */
  pendingCashTopUp?: number;
}

export interface BookingsListResponse {
  bookings: BookingRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const fetchAdminBookings = async (
  params?: {
    status?: BookingStatus | "";
    paymentStatus?: BookingPaymentStatus | "";
    serviceType?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
  },
  signal?: AbortSignal,
) => {
  const q = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
  }
  const res = await fetch(`${API_URL}/admin/bookings?${q.toString()}`, {
    headers: getHeaders(),
    signal,
  });
  return res.json();
};

export const fetchAdminBookingById = async (id: string) => {
  const res = await fetch(`${API_URL}/admin/bookings/${id}`, { headers: getHeaders() });
  return res.json();
};

export const cancelAdminBooking = async (id: string, body: { reason?: string; refundAmount?: number }) => {
  const res = await fetch(`${API_URL}/admin/bookings/${id}/cancel`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return ensureOk(res);
};

export const refundAdminBooking = async (id: string, body: { amount: number; reason?: string }) => {
  const res = await fetch(`${API_URL}/admin/bookings/${id}/refund`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(body),
  });
  return ensureOk(res);
};

export const assignAdminDriver = async (id: string, driverId: string) => {
  const res = await fetch(`${API_URL}/admin/bookings/${id}/assign-driver`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ driverId }),
  });
  return ensureOk(res);
};

// Driver list helper (for assign-driver picker)
export interface DriverOption {
  _id: string;
  fullName?: string;
  mobileNumber?: string;
  vehicleNumber?: string;
  rating?: number;
  isOnline?: boolean;
  status?: string;
  /** Deactivated drivers must not be assignable. */
  isActive?: boolean;
  /** Non-null means the driver is already mid-trip on another booking. */
  currentBookingId?: string | null;
}

export const fetchAvailableDrivers = async (params?: { search?: string; limit?: number }) => {
  const q = new URLSearchParams();
  if (params?.search) q.set("search", params.search);
  if (params?.limit) q.set("limit", String(params.limit));
  q.set("status", "approved");
  // getAllDrivers honours both filters, so offline and deactivated drivers are
  // excluded server-side rather than being listed and then labelled.
  q.set("isOnline", "true");
  q.set("isActive", "true");
  const res = await fetch(`${API_URL}/admin/drivers?${q.toString()}`, { headers: getHeaders() });
  return res.json();
};

// ─── APP CONFIG / SETTINGS ADMIN APIs ───

export type AppConfigValueType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON" | "ARRAY";

export interface AppConfigItem {
  _id: string;
  key: string;
  value: unknown;
  type: AppConfigValueType;
  category: string;
  description?: string;
  isEditable?: boolean;
}

export interface FareConfigItem {
  _id: string;
  name: string;
  gstPercentage: number;
  driverCommissionPercent: number;
  insuranceFee: number;
  minimumFare: number;
  // Cancellation refund ceilings, as a % of finalFare, by how far the trip got
  // (booking.controller.ts refundCeilingForStage). They are stored on the same
  // FareConfig document and were previously absent from this type, so the only
  // editor of that document could not read or write them.
  refundBeforeAssignPercent: number;
  refundAfterAssignPercent: number;
  refundAfterPickupPercent: number;
  waitingChargePerMin: number;
  freeWaitingMinutes: number;
  nightSurgeMultiplier: number;
  nightSurgeStartHour: number;
  nightSurgeEndHour: number;
  rainSurgeMultiplier: number;
  peakHourSurgeMultiplier: number;
  peakHourStart: number;
  peakHourEnd: number;
  isActive: boolean;
}

// ── Legal / informational content (Terms, Privacy, About, Refund, Cancellation) ──
export interface ContentItem {
  _id: string;
  type: "TERMS" | "PRIVACY" | "ABOUT" | "REFUND" | "CANCELLATION";
  title: string;
  content: string;
  version: number;
  isActive: boolean;
  publishedAt?: string;
  updatedAt?: string;
  updatedBy?: { name?: string; email?: string } | null;
}

export const fetchContentList = async () => {
  const res = await fetch(`${API_URL}/admin/content`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to load content (${res.status})`);
  return res.json();
};

export const fetchContentByType = async (type: string) => {
  const res = await fetch(`${API_URL}/admin/content/${type}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`Failed to load content (${res.status})`);
  return res.json();
};

export const updateContentByType = async (
  type: string,
  data: { title: string; content: string },
) => {
  const res = await fetch(`${API_URL}/admin/content/${type}`, {
    method: "PUT", headers: getHeaders(), body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to save content (${res.status})`);
  }
  return res.json();
};

// ── Admin password reset (real endpoints; the old UI was a mock) ──
export const adminForgotPassword = async (email: string) => {
  const res = await fetch(`${API_URL}/admin/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return res.json();
};

export const adminResetPassword = async (token: string, newPassword: string) => {
  const res = await fetch(`${API_URL}/admin/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Reset failed");
  }
  return res.json();
};

export const fetchAppSettings = async (category?: string) => {
  const q = new URLSearchParams();
  if (category) q.set("category", category);
  const qs = q.toString();
  const res = await fetch(`${API_URL}/admin/config/app-settings${qs ? `?${qs}` : ""}`, {
    headers: getHeaders(),
  });
  return res.json();
};

export const updateAppSetting = async (key: string, value: unknown) => {
  const res = await fetch(`${API_URL}/admin/config/app-settings/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ value }),
  });
  return ensureOk(res);
};

export const createAppSetting = async (data: {
  key: string;
  value: unknown;
  type?: AppConfigValueType;
  category: string;
  description?: string;
}) => {
  const res = await fetch(`${API_URL}/admin/config/app-settings`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

export const upsertAppSetting = async (data: {
  key: string;
  value: unknown;
  type?: AppConfigValueType;
  category: string;
  description?: string;
}) => {
  try {
    return await updateAppSetting(data.key, data.value);
  } catch {
    // Setting doesn't exist yet (update 404s) — create it.
    return createAppSetting(data);
  }
};

export const fetchFareConfig = async () => {
  const res = await fetch(`${API_URL}/admin/config/fare`, { headers: getHeaders() });
  return res.json();
};

export const updateFareConfig = async (data: Partial<FareConfigItem>) => {
  const res = await fetch(`${API_URL}/admin/config/fare`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return ensureOk(res);
};

