// Admin Types

// Staff & Role Types
export interface Permission {
  id: string;
  name: string;
  description: string;
  module: string;
}

export interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  staffCount: number;
  createdAt: string;
  updatedAt?: string;
}

export interface StaffMember {
  _id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  role: Role;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  createdBy?: string;
}

// App User Types (Customers)
export interface AppUser {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  avatar?: string;
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  isBlocked: boolean;
  blockReason?: string;
  totalBookings: number;
  totalSpent: number;
  coinBalance: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  deviceInfo?: {
    platform: "ANDROID" | "IOS";
    version: string;
    deviceId: string;
  };
  lastActive?: string;
  createdAt: string;
}

// Enterprise Types
export interface Enterprise {
  _id: string;
  companyName: string;
  gstin: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  state: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  creditLimit: number;
  creditUsed: number;
  billingCycle: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  totalBookings: number;
  totalSpent: number;
  rejectionReason?: string;
  suspensionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EnterpriseUser {
  _id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  isActive: boolean;
  bookingCount: number;
}

// SOS Types
export interface SOSAlert {
  _id: string;
  userId?: string;
  driverId?: string;
  bookingId?: string;
  triggeredBy: "USER" | "DRIVER";
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  status: "ACTIVE" | "RESPONDED" | "RESOLVED" | "CANCELLED";
  respondedBy?: string;
  respondedAt?: string;
  resolvedAt?: string;
  resolution?: string;
  policeNotified: boolean;
  contactsNotified: number;
  createdAt: string;
  user?: {
    name: string;
    phone: string;
  };
  driver?: {
    name: string;
    phone: string;
  };
  booking?: {
    bookingNumber: string;
  };
}

// Tracking Types
export interface DriverLocation {
  driverId: string;
  driverName: string;
  phone: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status: "ONLINE" | "OFFLINE" | "BUSY";
  currentBookingId?: string;
  vehicleType: string;
  vehicleNumber: string;
  lastUpdated: string;
}

export interface ActiveBookingLocation {
  bookingId: string;
  bookingNumber: string;
  status: string;
  pickup: {
    lat: number;
    lng: number;
    address: string;
  };
  drop: {
    lat: number;
    lng: number;
    address: string;
  };
  driver?: {
    lat: number;
    lng: number;
    name: string;
  };
  user: {
    name: string;
    phone: string;
  };
}

// Notification Types
export interface NotificationTemplate {
  _id: string;
  name: string;
  title: string;
  body: string;
  type: "PROMO" | "BOOKING" | "SYSTEM" | "CUSTOM";
  variables: string[];
  isActive: boolean;
}

export interface NotificationHistory {
  _id: string;
  title: string;
  body: string;
  type: string;
  targetAudience: string;
  sentCount: number;
  successCount: number;
  failedCount: number;
  sentBy: string;
  sentAt: string;
}

// Promo Types
export interface PromoCode {
  _id: string;
  code: string;
  description?: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  perUserLimit: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  applicableVehicles: string[];
  applicableServiceTypes: string[];
  createdAt: string;
}

// Support Types
export interface SupportTicket {
  _id: string;
  ticketId: string;
  userId?: string;
  driverId?: string;
  bookingId?: string;
  category: string;
  subcategory?: string;
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "WAITING_FOR_USER" | "RESOLVED" | "CLOSED";
  assignedTo?: string;
  attachments: string[];
  resolution?: string;
  resolvedAt?: string;
  lastMessageAt?: string;
  rating?: number;
  feedback?: string;
  createdAt: string;
  user?: {
    name: string;
    phone: string;
  };
  driver?: {
    name: string;
    phone: string;
  };
}

export interface SupportMessage {
  _id: string;
  ticketId: string;
  senderId: string;
  senderType: "USER" | "DRIVER" | "ADMIN" | "SYSTEM";
  senderName: string;
  message: string;
  attachments: string[];
  isRead: boolean;
  createdAt: string;
}

// Dashboard Types
export interface DashboardStats {
  totalBookings: number;
  activeBookings: number;
  completedToday: number;
  totalRevenue: number;
  todayRevenue: number;
  activeDrivers: number;
  totalDrivers: number;
  totalUsers: number;
  pendingPayments: number;
  activeSOSAlerts: number;
  pendingEnterprises: number;
  openSupportTickets: number;
}

// Coin Settings
export interface CoinSettings {
  coinsPerRupee: number;
  maxCoinsPerBooking: number;
  coinValue: number; // 1 coin = X rupees
  minRedeemCoins: number;
  maxRedeemPercentage: number;
}

// Generic Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
