import React, { useState } from "react";
import { Menu, Bell, X } from "lucide-react";

interface HeaderProps {
  setIsMobileMenuOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setIsMobileMenuOpen }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    {
      id: 1,
      title: "New Order Received",
      message: "Order #12345 from Rahul",
      time: "5 min ago",
      unread: true,
    },
    {
      id: 2,
      title: "Rider Assigned",
      message: "Rider Amit assigned to #12340",
      time: "15 min ago",
      unread: true,
    },
    {
      id: 3,
      title: "Payment Successful",
      message: "Payment of ₹450 received",
      time: "1 hour ago",
      unread: false,
    },
  ];

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
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
                <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 ${
                        notification.unread ? "bg-blue-50/50" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p
                          className={`text-sm font-medium ${
                            notification.unread ? "text-blue-600" : "text-gray-800"
                          }`}
                        >
                          {notification.title}
                        </p>
                        <span className="text-xs text-gray-400">{notification.time}</span>
                      </div>
                      <p className="text-xs text-gray-500">{notification.message}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <button className="text-xs font-medium text-movezy-600 hover:text-movezy-700">
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
