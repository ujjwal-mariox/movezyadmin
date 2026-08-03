import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, ArrowRight } from "lucide-react";
import { useAuth } from "../../auth/useAuth";

interface SearchItem {
  id: string;
  label: string;
  path: string;
  module: string;
  keywords: string[];
}

const ALL_SEARCH_ITEMS: SearchItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/admin/dashboard", module: "dashboard", keywords: ["home", "overview", "stats"] },
  { id: "staff", label: "Staff Management", path: "/admin/staff", module: "staff", keywords: ["team", "employees", "roles", "permissions"] },
  { id: "vehicle-management", label: "Vehicle Management", path: "/admin/vehicles", module: "vehicle-management", keywords: ["truck", "bike", "car", "vehicle types"] },
  { id: "categories", label: "Delivery Categories", path: "/admin/categories", module: "categories", keywords: ["goods", "types", "service"] },
  { id: "addon-services", label: "Add-on Services", path: "/admin/addon-services", module: "addon-services", keywords: ["extra", "additional"] },
  { id: "cancellation-reasons", label: "Cancellation Reasons", path: "/admin/cancellation-reasons", module: "cancellation-reasons", keywords: ["cancel", "reasons"] },
  { id: "prohibited-items", label: "Prohibited Items", path: "/admin/prohibited-items", module: "prohibited-items", keywords: ["banned", "restricted"] },
  { id: "app-users", label: "User Management", path: "/admin/app-users", module: "app-users", keywords: ["customers", "users", "accounts"] },
  { id: "riders", label: "Driver Management", path: "/admin/riders", module: "riders", keywords: ["drivers", "riders", "delivery partners"] },
  { id: "orders", label: "Orders Management", path: "/admin/orders", module: "orders", keywords: ["bookings", "deliveries", "shipments"] },
  { id: "enterprises", label: "Enterprise Management", path: "/admin/enterprises", module: "enterprises", keywords: ["business", "corporate", "b2b"] },
  { id: "sos", label: "SOS Dashboard", path: "/admin/sos", module: "sos", keywords: ["emergency", "alert", "safety"] },
  { id: "tracking", label: "Driver Tracking", path: "/admin/tracking", module: "tracking", keywords: ["map", "location", "gps", "live"] },
  { id: "promos", label: "Coupon Management", path: "/admin/promos", module: "promos", keywords: ["promo", "discount", "coupon", "offer"] },
  { id: "notifications", label: "Master Notifications", path: "/admin/notifications", module: "notifications", keywords: ["push", "alerts", "messages"] },
  { id: "support", label: "Support Tickets", path: "/admin/support", module: "support", keywords: ["help", "ticket", "complaint", "issue"] },
  { id: "wallet", label: "Wallet Management", path: "/admin/wallet", module: "wallet", keywords: ["balance", "money", "payment"] },
  { id: "settings", label: "Settings", path: "/admin/settings", module: "settings", keywords: ["config", "preferences", "configuration"] },
  { id: "finance", label: "Finance & Insights", path: "/admin/finance", module: "finance", keywords: ["revenue", "payout", "commission", "analytics", "money", "cod"] },
  { id: "audit-logs", label: "Audit Logs", path: "/admin/audit-logs", module: "audit-logs", keywords: ["history", "trail", "accountability", "log"] },
  { id: "automation", label: "Automation Rules", path: "/admin/automation", module: "automation", keywords: ["rules", "triggers", "alerts", "engine"] },
  // module was "riders", so visibility keyed off the wrong nav entry; the
  // compliance module id is what the backend/sidebar actually gate this page on.
  { id: "compliance", label: "Document Compliance", path: "/admin/compliance", module: "compliance", keywords: ["kyc", "expiry", "documents", "license"] },
  { id: "reports", label: "Reports & BI", path: "/admin/reports", module: "reports", keywords: ["report", "bi", "insights", "export", "analytics"] },
  { id: "commissions", label: "Commission & Charges", path: "/admin/commissions", module: "commissions", keywords: ["commission", "charges", "fare", "pricing"] },
  { id: "cms", label: "Content & Policies", path: "/admin/cms", module: "cms", keywords: ["content", "policy", "terms", "privacy", "faq"] },
  // /admin/cod-management is not a registered route (routes/index.ts) — the
  // catch-all in App.tsx bounced it to the dashboard. COD is a tab of the
  // Finance page, which is where this now goes.
  { id: "cod-management", label: "COD Management", path: "/admin/finance", module: "finance", keywords: ["cash", "collection", "settlement", "cod"] },
];

const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { canAccessModule } = useAuth();

  const filteredItems = query.trim()
    ? ALL_SEARCH_ITEMS.filter((item) => {
        const q = query.toLowerCase();
        return (
          item.label.toLowerCase().includes(q) ||
          item.keywords.some((k) => k.includes(q))
        );
      }).filter((item) => canAccessModule(item.module))
    : ALL_SEARCH_ITEMS.filter((item) => canAccessModule(item.module));

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      navigate(item.path);
      handleClose();
    },
    [navigate, handleClose],
  );

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, handleOpen, handleClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Arrow key navigation
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, filteredItems, selectedIndex, handleSelect]);

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-500 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Search...</span>
        <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono bg-white border rounded text-gray-400">
          Ctrl+K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center border-b border-gray-100 px-4">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search pages, features, settings..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 px-3 py-4 text-base outline-none bg-transparent placeholder:text-gray-400"
          />
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No results found for "{query}"
            </div>
          ) : (
            filteredItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                  index === selectedIndex
                    ? "bg-movezy-50 text-movezy-700"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.path}</p>
                </div>
                <ArrowRight className={`w-4 h-4 flex-shrink-0 ${index === selectedIndex ? "text-movezy-500" : "text-gray-300"}`} />
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
          <span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">↑↓</kbd>{" "}
            navigate
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">↵</kbd>{" "}
            select
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-gray-100 rounded text-[10px] font-mono">esc</kbd>{" "}
            close
          </span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
