import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import logo from "../assets/logo.png";
import {
  AlertCircle,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Zap,
  Activity,
  BarChart3,
} from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:9050/v1/api";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  const handleSSO = (provider: string) => {
    setError(`${provider} SSO is not configured yet`);
  };

  const valueProps = [
    {
      icon: Activity,
      title: "Real-time Dispatch",
      desc: "Track every order, driver, and route on a single live map.",
    },
    {
      icon: Zap,
      title: "Automated Workflows",
      desc: "Rule-driven assignment, payouts, and escalations — zero manual ops.",
    },
    {
      icon: BarChart3,
      title: "Decision Intelligence",
      desc: "Actionable analytics across fleet, finance, and customer health.",
    },
  ];

  return (
    <div className="min-h-screen w-full flex bg-gray-50">
      {/* LEFT PANEL — 60% */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-gradient-to-br from-movezy-600 via-movezy-500 to-movezy-700 text-white overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-movezy-800/30 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Movezy" className="w-12 h-12 object-contain" />
            <span className="text-xl font-semibold tracking-tight">
              Movezy Admin
            </span>
          </div>

          <div className="max-w-xl">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              The logistics control room,
              <br />
              <span className="text-movezy-100">built for speed.</span>
            </h1>
            <p className="text-lg text-white/80 mb-10">
              Orchestrate fleets, payouts, and customer operations from one
              high-performance command center.
            </p>

            <div className="space-y-5">
              {valueProps.map((v) => {
                const Icon = v.icon;
                return (
                  <div key={v.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-base mb-1">
                        {v.title}
                      </h3>
                      <p className="text-sm text-white/75 leading-relaxed">
                        {v.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-white/60">
            <span>© {new Date().getFullYear()} Movezy. All rights reserved.</span>
            <div className="flex gap-5">
              <a href="#" className="hover:text-white transition">Privacy</a>
              <a href="#" className="hover:text-white transition">Terms</a>
              <a href="#" className="hover:text-white transition">Support</a>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL — 40% */}
      <div className="w-full lg:w-2/5 flex items-center justify-center px-6 py-10 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <img src={logo} alt="Movezy" className="w-16 h-16 mb-3" />
            <span className="text-xl font-semibold text-gray-800">
              Movezy Admin
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome back
            </h2>
            <p className="text-gray-500">
              Sign in to access your control center.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@movezy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-movezy-500 focus:border-movezy-500 focus:outline-none transition"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-movezy-600 hover:text-movezy-700 font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-11 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-movezy-500 focus:border-movezy-500 focus:outline-none transition"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 text-movezy-600 focus:ring-movezy-500 border-gray-300 rounded"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
              />
              <span className="ml-2">Keep me signed in on this device</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-gradient-to-r from-movezy-500 to-movezy-600 hover:from-movezy-600 hover:to-movezy-700 text-white rounded-lg text-base font-semibold shadow-md hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>

            {/* Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wider">
                <span className="bg-white px-3 text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            {/* SSO */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSSO("Google")}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.11A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.2 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                onClick={() => handleSSO("Microsoft")}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition disabled:opacity-60"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#F25022" d="M1 1h10v10H1z" />
                  <path fill="#7FBA00" d="M13 1h10v10H13z" />
                  <path fill="#00A4EF" d="M1 13h10v10H1z" />
                  <path fill="#FFB900" d="M13 13h10v10H13z" />
                </svg>
                Microsoft
              </button>
            </div>
          </form>

          {/* Security note */}
          <div className="mt-8 flex items-start gap-2.5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-movezy-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Secured with 256-bit TLS encryption and multi-factor
              authentication. Movezy will never ask for your password by email
              or phone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
