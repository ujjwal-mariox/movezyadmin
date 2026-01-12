export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  orders: number;
  status: "Active" | "Inactive";
  totalSpent: string;
  joinedDate: string;
}

export interface Rider {
  id: number;
  name: string;
  phone: string;
  vehicle: "Bike" | "Tempo" | "Pickup" | "Truck";
  status: "Online" | "Offline" | "Busy";
  completedOrders: number;
  rating: number;
  earnings: string;
  joinedDate: string;
  vehicleNumber: string;
  currentLocation: string;
}

export interface Order {
  id: string;
  customer: string;
  rider: string;
  status: "Pending" | "In Transit" | "Delivered";
  amount: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  mobile: string;
  bookingCount: number;
  createdDate: string;
  status: "Active" | "Inactive";
}