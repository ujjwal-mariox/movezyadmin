// src/services/api.ts
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
export const fetchVehicleTypes = async () => {
  const res = await fetch(`${API_URL}/admin/config/vehicle-types`, { headers: getHeaders() });
  return res.json();
};

// Goods Types (Delivery Categories)
export const fetchGoodsTypes = async () => {
  const res = await fetch(`${API_URL}/admin/config/goods-types`, { headers: getHeaders() });
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
export const fetchAddonServices = async () => {
  const res = await fetch(`${API_URL}/admin/config/addon-services`, { headers: getHeaders() });
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
export const fetchPromos = async (page = 1, limit = 20) => {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
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
