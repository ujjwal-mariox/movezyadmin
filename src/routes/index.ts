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
    path: "settings",
    element: Settings,
  },
];
