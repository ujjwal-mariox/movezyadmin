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
  accountStatus: "Active" | "Inactive";
  completedOrders: number;
  rating: number;
  earnings: string;
  joinedDate: string;
  vehicleNumber: string;
  currentLocation: string;
}

export interface Order {
  id: string;
  customerName: string;
  rider?: string;
  status: 'Pending' | 'Assigned' | 'In Transit' | 'Delivered' | 'Cancelled';
  amount: number;
  date: string;
  pickup?: string;
  dropoff?: string;
  vehicle?: 'Bike' | '3 Wheeler' | 'Tata Ace' | 'Pickup 8ft' | 'Truck';
  goodsType?: string;
  distance?: string;
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