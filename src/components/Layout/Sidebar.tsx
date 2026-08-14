import React, { useState } from "react";
import {
  X,
  LogOut,
  Gauge,
  Bike,
  ClipboardList,
  SlidersHorizontal,
  Truck,
  Building2,
  AlertTriangle,
  MapPin,
  Bell,
  Tag,
  Users,
  Shield,
  TicketCheck,
  Wallet,
  Package,
  Wrench,
  Ban,
  ChevronDown,
  DollarSign,
  Zap,
  FileCheck,
  ScrollText,
  Database,
  FileText,
  Award,
  GraduationCap,
  BarChart3,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import logo from "../../assets/logo.png";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

interface SidebarProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const navigate = useNavigate();
  const { logout, canAccessModule, user } = useAuth();
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const menuGroups: MenuGroup[] = [
    {
      label: "Command",
      items: [
        { id: "dashboard", label: "Dashboard", icon: Gauge },
        { id: "tracking", label: "Live Tracking", icon: MapPin },
        { id: "sos", label: "SOS", icon: AlertTriangle },
      ],
    },
    {
      label: "Operations",
      items: [
        { id: "orders", label: "Orders", icon: ClipboardList },
        { id: "riders", label: "Drivers", icon: Bike },
        { id: "vehicle-management", label: "Vehicles", icon: Truck },
        { id: "categories", label: "Delivery Categories", icon: Package },
        { id: "compliance", label: "Document Compliance", icon: FileCheck },
      ],
    },
    {
      label: "Stakeholders",
      items: [
        { id: "app-users", label: "Users", icon: Users },
        { id: "enterprises", label: "Enterprise", icon: Building2 },
      ],
    },
    {
      label: "Finance",
      items: [
        { id: "finance", label: "Finance & Insights", icon: DollarSign },
        // The payout queues live on the Finance page but were invisible as
        // unlabeled tabs — this entry lands directly on them.
        { id: "payouts", label: "Payout Approvals", icon: Wallet },
        { id: "reports", label: "Reports & BI", icon: BarChart3 },
        { id: "payments", label: "Payments", icon: Wallet },
        { id: "wallet", label: "Wallet", icon: Wallet },
        { id: "refunds", label: "Refund Approval", icon: Wallet },
        { id: "commissions", label: "Commission & Charges", icon: DollarSign },
      ],
    },
    {
      label: "Growth",
      items: [
        { id: "promos", label: "Coupons", icon: Tag },
        { id: "notifications", label: "Notifications", icon: Bell },
      ],
    },
    {
      label: "Configuration",
      items: [
        { id: "addon-services", label: "Add-on Services", icon: Wrench },
        { id: "cancellation-reasons", label: "Cancellation Reasons", icon: Ban },
        { id: "prohibited-items", label: "Prohibited Items", icon: Ban },
        { id: "master-data", label: "Master Data", icon: Database },
        { id: "driver-instructions", label: "Driver Instructions", icon: FileText },
        { id: "cms", label: "Content & Policies", icon: FileText },
      ],
    },
    {
      label: "Driver Development",
      items: [
        { id: "badges", label: "Badges", icon: Award },
        { id: "training", label: "Training", icon: GraduationCap },
      ],
    },
    {
      label: "Admin Control",
      items: [
        { id: "staff", label: "Staff Management", icon: Shield },
        { id: "automation", label: "Automation Rules", icon: Zap },
        { id: "audit-logs", label: "Audit Logs", icon: ScrollText },
        { id: "support", label: "Support Tickets", icon: TicketCheck },
        { id: "settings", label: "Settings", icon: SlidersHorizontal },
      ],
    },
  ];

  const toggleGroup = (label: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <img
                src={logo}
                alt="Movezy"
                className="object-contain w-10 h-10"
              />
              <div>
                <h1 className="text-xl font-bold text-gray-800">Movezy</h1>
                {user && (
                  <p className="text-xs text-gray-500">{user.roleName}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-500 lg:hidden hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Grouped Menu */}
          <nav className="flex-1 px-3 py-2 overflow-y-auto">
            {menuGroups.map((group) => {
              const visibleItems = group.items.filter((item) => canAccessModule(item.id));
              if (visibleItems.length === 0) return null;
              const isCollapsed = collapsedGroups[group.label];

              return (
                <div key={group.label} className="mb-1">
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {group.label}
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                  </button>
                  {!isCollapsed && (
                    <div className="space-y-0.5">
                      {visibleItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.id}
                            to={`/admin/${item.id}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              `w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                                isActive
                                  ? "bg-gradient-to-r from-movezy-500 to-movezy-600 text-white shadow-md"
                                  : "text-gray-600 hover:bg-gray-100"
                              }`
                            }
                          >
                            <Icon className="w-4 h-4" />
                            <span className="font-medium">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* User Info & Logout */}
          <div className="p-4 border-t border-gray-200">
            {user && (
              <div className="px-4 py-2 mb-3 rounded-lg bg-gray-50">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 space-x-3 text-red-600 transition-colors rounded-lg hover:bg-red-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
