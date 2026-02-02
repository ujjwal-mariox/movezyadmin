import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import logo from "../assets/logo.png";
import { AlertCircle, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/admin/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.success && data.data) {
        const { token, admin, accessibleModules } = data.data;
        login(token, {
          _id: admin._id,
          name: admin.fullName,
          email: admin.email,
          roleName: admin.roleName,
          permissions: admin.permissions || [],
          accessibleModules: accessibleModules || [],
          avatar: admin.profileImage,
        });

        // Redirect to first accessible module or dashboard
        const firstModule = accessibleModules?.[0] || "dashboard";
        navigate(`/admin/${firstModule}`, { replace: true });
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* LEFT PANEL */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-movezy-500 to-movezy-600 items-center justify-center text-white px-16">
        <div className="text-center max-w-md">
          <img src={logo} alt="Movezy Logo" className="w-36 mx-auto mb-6" />
          <h1 className="text-4xl font-bold mb-3">Movezy Admin</h1>
          <p className="text-lg text-white/90">
            Manage customers, riders, orders and platform settings
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md bg-white p-10 rounded-xl shadow-lg">
          <h2 className="text-3xl font-bold text-gray-800 mb-1">Admin Login</h2>
          <p className="text-gray-500 mb-8">Sign in to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-movezy-500 focus:outline-none"
              required
              disabled={isLoading}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-movezy-500 focus:outline-none"
              required
              disabled={isLoading}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-movezy-600 focus:ring-movezy-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
                <span className="ml-2">Remember me</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-sm text-movezy-600 hover:text-movezy-500 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-movezy-500 to-movezy-600 text-white rounded-lg text-lg font-medium hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Login"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
