import { lazy } from "react";

const Login = lazy(() => import("../pages/Login"));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword"));
const OTPVerification = lazy(() => import("../pages/OTPVerification"));
const ResetPassword = lazy(() => import("../pages/ResetPassword"));
const Dashboard = lazy(() => import("../pages/Dashboard"));
const RiderManagement = lazy(() => import("../pages/RiderManagement"));
const OrderManagement = lazy(() => import("../pages/OrderManagement"));
const Payments = lazy(() => import("../pages/Payments"));
const Settings = lazy(() => import("../pages/Settings"));

// New admin pages
const EnterpriseManagement = lazy(
  () => import("../pages/EnterpriseManagement"),
);
const SOSDashboard = lazy(() => import("../pages/SOSDashboard"));
const DriverTracking = lazy(() => import("../pages/DriverTracking"));
const NotificationCenter = lazy(() => import("../pages/NotificationCenter"));
const PromoManagement = lazy(() => import("../pages/PromoManagement"));
const SupportTickets = lazy(() => import("../pages/SupportTickets"));
const StaffManagement = lazy(() => import("../pages/StaffManagement"));
const UserManagement = lazy(() => import("../pages/UserManagement"));

export const authRoutes = [
  {
    path: "/login",
    element: Login,
  },
  {
    path: "/forgot-password",
    element: ForgotPassword,
  },
  {
    path: "/otp-verification",
    element: OTPVerification,
  },
  {
    path: "/reset-password",
    element: ResetPassword,
  },
];

export const adminRoutes = [
  {
    path: "dashboard",
    element: Dashboard,
  },
  {
    path: "app-users",
    element: UserManagement,
  },
  {
    path: "riders",
    element: RiderManagement,
  },
  {
    path: "orders",
    element: OrderManagement,
  },
  {
    path: "payments",
    element: Payments,
  },
  {
    path: "enterprises",
    element: EnterpriseManagement,
  },
  {
    path: "sos",
    element: SOSDashboard,
  },
  {
    path: "tracking",
    element: DriverTracking,
  },
  {
    path: "notifications",
    element: NotificationCenter,
  },
  {
    path: "promos",
    element: PromoManagement,
  },
  {
    path: "support",
    element: SupportTickets,
  },
  {
    path: "staff",
    element: StaffManagement,
  },
  {
    path: "settings",
    element: Settings,
  },
];
