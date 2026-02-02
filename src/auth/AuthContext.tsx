import React, { createContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

// Permission constants matching backend
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard:view",
  USERS_VIEW: "users:view",
  USERS_UPDATE: "users:update",
  USERS_DELETE: "users:delete",
  USERS_BLOCK: "users:block",
  DRIVERS_VIEW: "drivers:view",
  DRIVERS_UPDATE: "drivers:update",
  DRIVERS_DELETE: "drivers:delete",
  DRIVERS_VERIFY: "drivers:verify",
  DRIVERS_BLOCK: "drivers:block",
  VEHICLES_VIEW: "vehicles:view",
  VEHICLES_CREATE: "vehicles:create",
  VEHICLES_UPDATE: "vehicles:update",
  VEHICLES_DELETE: "vehicles:delete",
  BOOKINGS_VIEW: "bookings:view",
  BOOKINGS_UPDATE: "bookings:update",
  BOOKINGS_CANCEL: "bookings:cancel",
  BOOKINGS_REFUND: "bookings:refund",
  PAYMENTS_VIEW: "payments:view",
  PAYMENTS_REFUND: "payments:refund",
  PAYMENTS_EXPORT: "payments:export",
  PROMOS_VIEW: "promos:view",
  PROMOS_CREATE: "promos:create",
  PROMOS_UPDATE: "promos:update",
  PROMOS_DELETE: "promos:delete",
  CONFIG_VIEW: "config:view",
  CONFIG_UPDATE: "config:update",
  STAFF_VIEW: "staff:view",
  STAFF_CREATE: "staff:create",
  STAFF_UPDATE: "staff:update",
  STAFF_DELETE: "staff:delete",
  ROLES_VIEW: "roles:view",
  ROLES_CREATE: "roles:create",
  ROLES_UPDATE: "roles:update",
  ROLES_DELETE: "roles:delete",
  REPORTS_VIEW: "reports:view",
  REPORTS_EXPORT: "reports:export",
  SOS_VIEW: "sos:view",
  SOS_RESPOND: "sos:respond",
  SOS_RESOLVE: "sos:resolve",
  ENTERPRISE_VIEW: "enterprise:view",
  ENTERPRISE_APPROVE: "enterprise:approve",
  ENTERPRISE_UPDATE: "enterprise:update",
  ENTERPRISE_SUSPEND: "enterprise:suspend",
  SUPPORT_VIEW: "support:view",
  SUPPORT_REPLY: "support:reply",
  SUPPORT_ASSIGN: "support:assign",
  SUPPORT_RESOLVE: "support:resolve",
  TRACKING_VIEW: "tracking:view",
  NOTIFICATIONS_VIEW: "notifications:view",
  NOTIFICATIONS_SEND: "notifications:send",
} as const;

// Map sidebar items to required permissions
export const SIDEBAR_PERMISSION_MAP: Record<string, string[]> = {
  dashboard: [PERMISSIONS.DASHBOARD_VIEW],
  "vehicle-management": [PERMISSIONS.VEHICLES_VIEW],
  "app-users": [PERMISSIONS.USERS_VIEW],
  riders: [PERMISSIONS.DRIVERS_VIEW],
  orders: [PERMISSIONS.BOOKINGS_VIEW],
  payments: [PERMISSIONS.PAYMENTS_VIEW],
  enterprises: [PERMISSIONS.ENTERPRISE_VIEW],
  sos: [PERMISSIONS.SOS_VIEW],
  tracking: [PERMISSIONS.TRACKING_VIEW],
  notifications: [
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_SEND,
  ],
  promos: [PERMISSIONS.PROMOS_VIEW],
  support: [PERMISSIONS.SUPPORT_VIEW],
  staff: [PERMISSIONS.STAFF_VIEW, PERMISSIONS.ROLES_VIEW],
  settings: [PERMISSIONS.CONFIG_VIEW],
};

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  roleName: string;
  permissions: string[];
  accessibleModules: string[];
  avatar?: string;
}

export interface AuthContextType {
  login: (token: string, user: AdminUser) => void;
  logout: () => void;
  isAuthenticated: boolean;
  user: AdminUser | null;
  hasPermission: (permission: string | string[]) => boolean;
  canAccessModule: (moduleId: string) => boolean;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("adminToken");
      if (token) {
        try {
          const response = await fetch(`${API_URL}/admin/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              const { admin, accessibleModules } = data.data;
              setUser({
                _id: admin._id,
                name: admin.fullName,
                email: admin.email,
                roleName: admin.roleName,
                permissions: admin.permissions || [],
                accessibleModules: accessibleModules || [],
                avatar: admin.profileImage,
              });
              setIsAuthenticated(true);
            } else {
              localStorage.removeItem("adminToken");
            }
          } else {
            localStorage.removeItem("adminToken");
          }
        } catch (error) {
          localStorage.removeItem("adminToken");
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = (token: string, userData: AdminUser) => {
    localStorage.setItem("adminToken", token);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem("adminToken");
    setUser(null);
    setIsAuthenticated(false);
  };

  const hasPermission = (permission: string | string[]): boolean => {
    if (!user) return false;

    // Super Admin has all permissions
    if (user.roleName === "Super Admin") return true;

    if (Array.isArray(permission)) {
      return permission.some((p) => user.permissions.includes(p));
    }
    return user.permissions.includes(permission);
  };

  const canAccessModule = (moduleId: string): boolean => {
    if (!user) return false;

    // Super Admin can access all modules
    if (user.roleName === "Super Admin") return true;

    // Check if user has accessible modules from backend
    if (user.accessibleModules && user.accessibleModules.length > 0) {
      return user.accessibleModules.includes(moduleId);
    }

    // Fallback to permission check
    const requiredPermissions = SIDEBAR_PERMISSION_MAP[moduleId];
    if (!requiredPermissions) return false;

    return requiredPermissions.some((p) => user.permissions.includes(p));
  };

  return (
    <AuthContext.Provider
      value={{
        login,
        logout,
        isAuthenticated,
        user,
        hasPermission,
        canAccessModule,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
