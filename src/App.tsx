import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import React, { Suspense, useEffect } from "react";
import { AuthProvider } from "./auth/AuthContext";
import PrivateRoute from "./routes/privateRoute";

import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import { authRoutes, adminRoutes } from "./routes";
import UserDetail from "./pages/UserDetail";
import CmsEdit from "./pages/CMSEdit";
import { DialogProvider, useDialog, setImperativeDialog } from "./components/Layout/Dialog";


const LoadingSpinner = () => <div>Loading...</div>;

const DialogBridge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const d = useDialog();
  useEffect(() => {
    setImperativeDialog(d);
    return () => setImperativeDialog(null);
  }, [d]);
  return <>{children}</>;
};

const App = () => {
  return (
    <DialogProvider>
    <DialogBridge>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route element={<AuthLayout />}>
            {authRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <route.element />
                  </Suspense>
                }
              />
            ))}
          </Route>

          {/* Protected admin routes */}
          <Route element={<PrivateRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              {adminRoutes.map((route) => (
                <Route
                  key={route.path}
                  path={route.path}
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <route.element />
                    </Suspense>
                  }
                />
              ))}
              <Route path="users/:id" element={<UserDetail />} />
              <Route path="cms/:slug" element={<CmsEdit />} />

              {/* default admin route */}
              <Route index element={<Navigate to="dashboard" replace />} />
              {/* Catch-all inside /admin — prevents top-level fallback redirecting to /login */}
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* fallback — only for truly unknown routes outside /admin */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </DialogBridge>
    </DialogProvider>
  );
};

export default App;
