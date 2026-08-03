// src/pages/ForgotPassword.tsx
//
// Calls the REAL /admin/auth/forgot-password endpoint, which generates a
// one-hour reset token and emails a link to /reset-password?token=…
// (in development without SMTP the backend logs the link to its console).
// The old page was a setTimeout mock that navigated to a fake OTP screen.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, MailCheck } from 'lucide-react';
import { adminForgotPassword } from '../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await adminForgotPassword(email);
      // The backend deliberately answers the same whether or not the email
      // exists — so this state is "request accepted", not "account found".
      setSent(true);
    } catch {
      setError('Could not reach the server. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8 space-y-6">
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 flex items-center justify-center">
              <MailCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Check your email</h1>
            <p className="text-sm text-gray-500">
              If <span className="font-medium text-gray-700">{email}</span> has an
              admin account, a password-reset link is on its way. The link is
              valid for <b>1 hour</b>.
            </p>
            <p className="text-xs text-gray-400">
              Development note: without SMTP configured, the backend prints the
              reset link in its server console.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-movezy-600 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800">Forgot Password</h1>
              <p className="text-sm text-gray-500 mt-2">
                Enter your email to receive a password reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-movezy-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-movezy-500 to-movezy-600 text-white rounded-lg text-lg font-medium hover:shadow-xl transition disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center text-sm text-gray-600 hover:text-movezy-600 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
