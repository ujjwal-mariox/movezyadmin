import React from "react";
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
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import logo from "../../assets/logo.png";

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

  const allMenuItems = [
    { id: "dashboard", label: "Dashboard", icon: Gauge },
    { id: "staff", label: "Staff Management", icon: Shield },
    { id: "vehicle-management", label: "Vehicle Management", icon: Truck },
    { id: "categories", label: "Delivery Categories", icon: Package },
    { id: "addon-services", label: "Add-on Services", icon: Wrench },
    { id: "app-users", label: "User Management", icon: Users },
    { id: "riders", label: "Driver Management", icon: Bike },
    { id: "orders", label: "Orders Management", icon: ClipboardList },
    { id: "enterprises", label: "Enterprise Management", icon: Building2 },
    { id: "sos", label: "SOS Dashboard", icon: AlertTriangle },
    { id: "tracking", label: "Driver Tracking", icon: MapPin },
    { id: "promos", label: "Coupon Management", icon: Tag },
    { id: "notifications", label: "Master Notifications", icon: Bell },
    { id: "support", label: "Support Tickets", icon: TicketCheck },
    { id: "wallet", label: "Wallet Management", icon: Wallet },
    { id: "settings", label: "Settings", icon: SlidersHorizontal },
  ];

  // Filter menu items based on user's permissions
  const menuItems = allMenuItems.filter((item) => canAccessModule(item.id));

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

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.id}
                  to={`/admin/${item.id}`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-movezy-500 to-movezy-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
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
