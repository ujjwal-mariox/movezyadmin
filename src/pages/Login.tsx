// import React, { useState } from "react";
// import { useNavigate } from "react-router-dom";
// import { useAuth } from "../auth/useAuth";

// const Login: React.FC = () => {
//   const { login } = useAuth();
//   const navigate = useNavigate();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();

//     login();

//     navigate("/admin", { replace: true });
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
//         <h2 className="text-2xl font-bold text-gray-800 mb-1">Admin Login</h2>

//         <form onSubmit={handleSubmit} className="space-y-4">
//           <input
//             type="email"
//             placeholder="admin@movezy.com"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             className="w-full px-4 py-2 border rounded-lg"
//           />

//           <input
//             type="password"
//             placeholder="••••••••"
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             className="w-full px-4 py-2 border rounded-lg"
//           />

//           <button
//             type="submit"
//             className="w-full py-2 bg-gradient-to-r from-movezy-500 to-movezy-600 text-white rounded-lg"
//           >
//             Login
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default Login;

import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import logo from "../assets/logo.png";
import { AlertCircle } from "lucide-react";

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); // Reset error on new submission

    // Mock validation - in a real app, you'd call an API
    if (email === "admin@movezy.com" && password === "password") {
      login();
      navigate("/admin/dashboard", { replace: true });
    } else {
      setError("Invalid credentials. Please use the hint below.");
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
                <AlertCircle className="w-5 h-5 mr-3" />
                <span>{error}</span>
              </div>
            )}

            <input
              type="email"
              placeholder="admin@movezy.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-movezy-500"
              required
            />

            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-movezy-500"
              required
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 text-movezy-600 focus:ring-movezy-500 border-gray-300 rounded"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="ml-2">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-movezy-600 hover:text-movezy-500 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-movezy-500 to-movezy-600 text-white rounded-lg text-lg font-medium hover:shadow-xl transition"
            >
              Login
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
            <p>Hint: Use the example credentials to log in.</p>
            <p><code className="bg-gray-200 px-1 rounded">admin@movezy.com</code> / <code className="bg-gray-200 px-1 rounded">password</code></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
