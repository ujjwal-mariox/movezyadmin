import React, { createContext, useState, useEffect, useRef, useCallback } from "react";
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
  // Backend permission strings live in role.model.ts PERMISSIONS. These were
  // "config:view"/"config:update", which no backend permission uses, so any
  // module gated on them could never match a real admin's permission list.
  SETTINGS_VIEW: "settings:view",
  SETTINGS_UPDATE: "settings:update",
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
  // Backend uses the plural "enterprises:*" (role.model.ts).
  ENTERPRISES_VIEW: "enterprises:view",
  ENTERPRISES_APPROVE: "enterprises:approve",
  ENTERPRISES_UPDATE: "enterprises:update",
  ENTERPRISES_SUSPEND: "enterprises:suspend",
  SUPPORT_VIEW: "support:view",
  SUPPORT_REPLY: "support:reply",
  SUPPORT_ASSIGN: "support:assign",
  SUPPORT_RESOLVE: "support:resolve",
  TRACKING_VIEW: "tracking:view",
  NOTIFICATIONS_VIEW: "notifications:view",
  NOTIFICATIONS_SEND: "notifications:send",
  // New permissions
  PRICING_VIEW: "pricing:view",
  PRICING_UPDATE: "pricing:update",
  AUTOMATION_VIEW: "automation:view",
  AUTOMATION_MANAGE: "automation:manage",
  AUDIT_VIEW: "audit:view",
  FINANCE_VIEW: "finance:view",
  FINANCE_EXPORT: "finance:export",
  DRIVER_INSTRUCTIONS_VIEW: "driver-instructions:view",
  BADGES_VIEW: "badges:view",
  TRAINING_VIEW: "training:view",
  REFUNDS_VIEW: "refunds:view",
} as const;

// Fallback map of sidebar item id -> permissions that grant it.
//
// The authoritative list is the backend's SIDEBAR_MODULES (role.model.ts), which
// login and /auth/me turn into `accessibleModules`. This map is only consulted
// when that list does not already grant the module, so every id the sidebar can
// render must appear here with the SAME permission the backend gates it on —
// otherwise an id missing from the backend list disappears from the nav
// entirely, which is exactly what happened to ten items.
export const SIDEBAR_PERMISSION_MAP: Record<string, string[]> = {
  dashboard: [PERMISSIONS.DASHBOARD_VIEW],
  "vehicle-management": [PERMISSIONS.VEHICLES_VIEW],
  categories: [PERMISSIONS.SETTINGS_VIEW],
  "addon-services": [PERMISSIONS.SETTINGS_VIEW],
  "cancellation-reasons": [PERMISSIONS.SETTINGS_VIEW],
  "prohibited-items": [PERMISSIONS.SETTINGS_VIEW],
  "master-data": [PERMISSIONS.SETTINGS_VIEW],
  "driver-instructions": [PERMISSIONS.DRIVER_INSTRUCTIONS_VIEW],
  cms: [PERMISSIONS.SETTINGS_VIEW],
  commissions: [PERMISSIONS.SETTINGS_VIEW],
  "app-users": [PERMISSIONS.USERS_VIEW],
  riders: [PERMISSIONS.DRIVERS_VIEW],
  orders: [PERMISSIONS.BOOKINGS_VIEW],
  payments: [PERMISSIONS.PAYMENTS_VIEW],
  enterprises: [PERMISSIONS.ENTERPRISES_VIEW],
  sos: [PERMISSIONS.SOS_VIEW],
  tracking: [PERMISSIONS.TRACKING_VIEW],
  notifications: [
    PERMISSIONS.NOTIFICATIONS_VIEW,
    PERMISSIONS.NOTIFICATIONS_SEND,
  ],
  promos: [PERMISSIONS.PROMOS_VIEW],
  support: [PERMISSIONS.SUPPORT_VIEW],
  staff: [PERMISSIONS.STAFF_VIEW, PERMISSIONS.ROLES_VIEW],
  wallet: [PERMISSIONS.PAYMENTS_VIEW],
  settings: [PERMISSIONS.SETTINGS_VIEW],
  badges: [PERMISSIONS.BADGES_VIEW],
  training: [PERMISSIONS.TRAINING_VIEW],
  refunds: [PERMISSIONS.REFUNDS_VIEW],
  finance: [PERMISSIONS.FINANCE_VIEW],
  // Same gate as finance — the payout endpoints themselves require it.
  payouts: [PERMISSIONS.FINANCE_VIEW],
  // GET /admin/reports/* is gated on reports:view, not finance:view.
  reports: [PERMISSIONS.REPORTS_VIEW],
  "audit-logs": [PERMISSIONS.AUDIT_VIEW],
  automation: [PERMISSIONS.AUTOMATION_VIEW],
  compliance: [PERMISSIONS.DRIVERS_VIEW],
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
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes

  const performLogout = useCallback(() => {
    localStorage.removeItem("adminToken");
    setUser(null);
    setIsAuthenticated(false);
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
  }, []);

  // Auto-logout on inactivity
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    if (!isAuthenticated) return;
    inactivityTimerRef.current = setTimeout(() => {
      console.log("[Auth] Auto-logout due to inactivity");
      performLogout();
      window.location.href = "/login";
    }, INACTIVITY_TIMEOUT);
  }, [isAuthenticated, performLogout]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    const handler = () => resetInactivityTimer();
    events.forEach((e) => window.addEventListener(e, handler));
    resetInactivityTimer(); // start timer
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    };
  }, [isAuthenticated, resetInactivityTimer]);

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
    performLogout();
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

    // Union of the two sources, not a short-circuit. Returning early on a
    // non-empty accessibleModules made the permission map below unreachable for
    // every staff admin, so any sidebar id the backend's SIDEBAR_MODULES did not
    // list was hidden even when the admin held the permission the page needs.
    // A missing id now degrades to the permission check instead of vanishing.
    const grantedByBackend = user.accessibleModules?.includes(moduleId) ?? false;
    if (grantedByBackend) return true;

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
