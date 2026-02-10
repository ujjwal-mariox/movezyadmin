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
  Shield,
  Building2,
  AlertTriangle,
  MapPin,
  Tag,
  Bell,
  TicketCheck,
  Wallet,
  Package,
  Wrench,
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
const StaffManagement = lazy(() => import("./pages/StaffManagement"));
const EnterpriseManagement = lazy(() => import("./pages/EnterpriseManagement"));
const SOSDashboard = lazy(() => import("./pages/SOSDashboard"));
const DriverTracking = lazy(() => import("./pages/DriverTracking"));
const PromoManagement = lazy(() => import("./pages/PromoManagement"));
const NotificationCenter = lazy(() => import("./pages/NotificationCenter"));
const SupportTickets = lazy(() => import("./pages/SupportTickets"));
const WalletManagement = lazy(() => import("./pages/WalletManagement"));
const CategoryManagement = lazy(() => import("./pages/CategoryManagement"));
const AddonServiceManagement = lazy(() => import("./pages/AddonServiceManagement"));

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
    path: "staff",
    element: StaffManagement,
    name: "Staff Management",
    icon: Shield,
  },
  {
    path: "vehicle-management",
    element: VehicleManagement,
    name: "Vehicle Management",
    icon: Truck,
  },
  {
    path: "categories",
    element: CategoryManagement,
    name: "Delivery Categories",
    icon: Package,
  },
  {
    path: "addon-services",
    element: AddonServiceManagement,
    name: "Add-on Services",
    icon: Wrench,
  },
  {
    path: "app-users",
    element: UserManagement,
    name: "User Management",
    icon: Users,
  },
  {
    path: "riders",
    element: RiderManagement,
    name: "Driver Management",
    icon: Bike,
  },
  {
    path: "customers",
    element: CustomerManagement,
    name: "Customers",
    icon: UserCircle,
  },
  {
    path: "orders",
    element: OrderManagement,
    name: "Orders Management",
    icon: ShoppingBag,
  },
  {
    path: "enterprises",
    element: EnterpriseManagement,
    name: "Enterprise Management",
    icon: Building2,
  },
  {
    path: "sos",
    element: SOSDashboard,
    name: "SOS Dashboard",
    icon: AlertTriangle,
  },
  {
    path: "tracking",
    element: DriverTracking,
    name: "Driver Tracking",
    icon: MapPin,
  },
  {
    path: "promos",
    element: PromoManagement,
    name: "Coupon Management",
    icon: Tag,
  },
  {
    path: "notifications",
    element: NotificationCenter,
    name: "Master Notifications",
    icon: Bell,
  },
  {
    path: "support",
    element: SupportTickets,
    name: "Support Tickets",
    icon: TicketCheck,
  },
  {
    path: "payments",
    element: Payments,
    name: "Payments",
    icon: CreditCard,
  },
  {
    path: "wallet",
    element: WalletManagement,
    name: "Wallet Management",
    icon: Wallet,
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
