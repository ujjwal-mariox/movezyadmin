import { lazy } from "react";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CreditCard,
  Settings,
  Truck,
  FileText,
  Bike,
  UserCircle,
} from "lucide-react";

// Auth Pages
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const OTPVerification = lazy(() => import("./pages/OTPVerification"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Admin Pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RiderManagement = lazy(() => import("./pages/RiderManagement"));
const CustomerManagement = lazy(() => import("./pages/CustomerManagement"));
const OrderManagement = lazy(() => import("./pages/OrderManagement"));
const Payments = lazy(() => import("./pages/Payments"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const VehicleManagement = lazy(() => import("./pages/VehicleManagement"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const CmsManagement = lazy(() => import("./pages/CMSManagement"));

export const authRoutes = [
  { path: "/login", element: Login },
  { path: "/forgot-password", element: ForgotPassword },
  { path: "/otp-verification", element: OTPVerification },
  { path: "/reset-password", element: ResetPassword },
];

export const adminRoutes = [
  {
    path: "dashboard",
    element: Dashboard,
    name: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    path: "riders",
    element: RiderManagement,
    name: "Riders",
    icon: Bike,
  },
  {
    path: "customers",
    element: CustomerManagement,
    name: "Customers",
    icon: Users,
  },
  {
    path: "orders",
    element: OrderManagement,
    name: "Orders",
    icon: ShoppingBag,
  },
  {
    path: "vehicle-management",
    element: VehicleManagement,
    name: "Vehicles",
    icon: Truck,
  },
  {
    path: "users",
    element: UserManagement,
    name: "Users",
    icon: UserCircle,
  },
  {
    path: "payments",
    element: Payments,
    name: "Payments",
    icon: CreditCard,
  },
  {
    path: "cms",
    element: CmsManagement,
    name: "CMS",
    icon: FileText,
  },
  {
    path: "settings",
    element: SettingsPage,
    name: "Settings",
    icon: Settings,
  },
];