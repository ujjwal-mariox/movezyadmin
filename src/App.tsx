import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { AuthProvider } from "./auth/AuthContext";
import PrivateRoute from "./routes/privateRoute";

import AuthLayout from "./layouts/AuthLayout";
import AdminLayout from "./layouts/AdminLayout";
import { authRoutes, adminRoutes } from "./routes";
import UserDetail from "./pages/UserDetail";
import CmsEdit from "./pages/CMSEdit";


const LoadingSpinner = () => <div>Loading...</div>;

const App = () => {
  return (
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
            </Route>
          </Route>

          {/* fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
