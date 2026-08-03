import React from "react";
import { Menu, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlobalSearch from "./GlobalSearch";

interface HeaderProps {
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setIsMobileMenuOpen }) => {
  const navigate = useNavigate();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden text-gray-600 hover:text-gray-800"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {/* Global Search Trigger */}
          <GlobalSearch />

          {/*
            The dropdown that used to live here was a hardcoded array of three
            invented notifications (order #12345 from "Rahul", ₹450 payment) with
            an always-on unread dot and a "Mark all as read" button that had no
            handler — no request was ever made. There is no admin notification
            feed endpoint, so the bell is now just a link to the Notification
            Center page rather than a fabricated inbox.
          */}
          <button
            onClick={() => navigate("/admin/notifications")}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notification Center"
            aria-label="Notification Center"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
