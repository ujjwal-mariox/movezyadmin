import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Layout/Sidebar";
import Header from "../components/Layout/Header";
import RouteErrorBoundary from "../components/Layout/RouteErrorBoundary";

const AdminLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <main className="flex-1 overflow-y-auto p-6">
          {/* A page that throws used to blank the entire admin. */}
          <RouteErrorBoundary>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
