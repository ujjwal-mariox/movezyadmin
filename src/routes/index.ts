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
const VehicleManagement = lazy(() => import("../pages/VehicleManagement"));
const CategoryManagement = lazy(() => import("../pages/CategoryManagement"));
const AddonServiceManagement = lazy(() => import("../pages/AddonServiceManagement"));
const WalletManagement = lazy(() => import("../pages/WalletManagement"));
const CancellationReasonManagement = lazy(() => import("../pages/CancellationReasonManagement"));
const ProhibitedItemManagement = lazy(() => import("../pages/ProhibitedItemManagement"));

// Phase 2 pages
const FinanceModule = lazy(() => import("../pages/FinanceModule"));
const AuditLogPage = lazy(() => import("../pages/AuditLogPage"));
const AutomationRulesPage = lazy(() => import("../pages/AutomationRulesPage"));
const DocumentCompliancePage = lazy(() => import("../pages/DocumentCompliancePage"));
const MasterDataManagement = lazy(() => import("../pages/MasterDataManagement"));
const DriverInstructionManagement = lazy(() => import("../pages/DriverInstructionManagement"));
const BadgeManagement = lazy(() => import("../pages/BadgeManagement"));
const TrainingManagement = lazy(() => import("../pages/TrainingManagement"));

// Phase 3 pages
const RefundApproval = lazy(() => import("../pages/RefundApproval"));
const ReportsPage = lazy(() => import("../pages/ReportsPage"));

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
    path: "vehicles",
    element: VehicleManagement,
  },
  {
    path: "categories",
    element: CategoryManagement,
  },
  {
    path: "addon-services",
    element: AddonServiceManagement,
  },
  {
    path: "wallet",
    element: WalletManagement,
  },
  {
    path: "cancellation-reasons",
    element: CancellationReasonManagement,
  },
  {
    path: "prohibited-items",
    element: ProhibitedItemManagement,
  },
  {
    path: "vehicle-management",
    element: VehicleManagement,
  },
  {
    path: "settings",
    element: Settings,
  },
  {
    path: "finance",
    element: FinanceModule,
  },
  {
    path: "audit-logs",
    element: AuditLogPage,
  },
  {
    path: "automation",
    element: AutomationRulesPage,
  },
  {
    path: "compliance",
    element: DocumentCompliancePage,
  },
  {
    path: "master-data",
    element: MasterDataManagement,
  },
  {
    path: "driver-instructions",
    element: DriverInstructionManagement,
  },
  {
    path: "badges",
    element: BadgeManagement,
  },
  {
    path: "training",
    element: TrainingManagement,
  },
  {
    path: "refunds",
    element: RefundApproval,
  },
  {
    path: "reports",
    element: ReportsPage,
  },
];
