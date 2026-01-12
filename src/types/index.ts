// src/types/index.ts
import type { LucideIcon } from "lucide-react";

export interface Stat {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color: string;
}

export interface Order {
  id: string;
  customer: string;
  rider: string;
  status: "Delivered" | "In Transit" | "Pending" | "Cancelled";
  amount: string;
  date?: string;
  pickup?: string;
  dropoff?: string;
  vehicleType?: string;
  distance?: string;
  createdAt?: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  status: "Active" | "Inactive";
  joinedDate?: string;
  totalSpent?: string;
  lastOrderDate?: string;
  address?: string;
}

export interface Rider {
  id: number;
  name: string;
  phone: string;
  vehicle: "Bike" | "Tempo" | "Pickup" | "Truck";
  status: "Online" | "Offline" | "Busy";
  completedOrders: number;
  rating: number;
  earnings?: string;
  joinedDate?: string;
  vehicleNumber?: string;
  licenseNumber?: string;
  currentLocation?: string;
}

export interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type TabType =
  | "dashboard"
  | "customers"
  | "riders"
  | "orders"
  | "settings";
