import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(fullName, email, password, confirmPassword);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-shell min-h-screen relative overflow-hidden px-4 py-8 font-sans text-slate-900">
        <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="w-full max-w-[420px] bg-white rounded-[22px] shadow-[0_24px_70px_rgba(77,112,148,0.18)] overflow-hidden text-center">
            <div className="px-6 sm:px-8 pt-8 pb-7 border-b border-slate-200">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 mb-5">
                <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-[28px] sm:text-[32px] leading-tight font-extrabold text-[#070b1f] tracking-normal">
                Request Sent
              </h2>
              <p className="mt-3 text-base font-semibold text-slate-500">
                Finance Portal Access
              </p>
            </div>

            <div className="px-7 sm:px-10 py-8">
              <p className="text-base leading-7 font-semibold text-slate-500">
                Thank you, <span className="text-[#0787d8]">{fullName}</span>. Your account request is pending administrator approval.
              </p>
              <Link
                to="/login"
                className="mt-8 inline-flex h-[50px] px-7 items-center justify-center rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 text-white text-sm font-extrabold shadow-[0_12px_22px_rgba(14,126,216,0.24)] transition-all hover:brightness-105"
              >
                Return to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell min-h-screen relative overflow-hidden px-4 py-8 font-sans text-slate-900">
      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-full max-w-[420px] bg-white rounded-[22px] shadow-[0_24px_70px_rgba(77,112,148,0.18)] overflow-hidden">
          <div className="px-6 sm:px-8 pt-8 pb-7 text-center border-b border-slate-200">
            <h1 className="text-[26px] sm:text-[30px] leading-tight font-extrabold text-[#070b1f] tracking-normal">
              Request Access
            </h1>
            <p className="mt-2.5 text-sm font-semibold text-slate-500">
              Finance Portal Registration
            </p>
          </div>

          <div className="px-6 sm:px-8 py-7">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-[0.08em]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full h-[46px] px-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 text-sm font-semibold placeholder:text-slate-400 transition-all"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-[0.08em]">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="w-full h-[46px] px-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 text-sm font-semibold placeholder:text-slate-400 transition-all"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-[0.08em]">
                  Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full h-[46px] px-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 text-sm font-semibold placeholder:text-slate-400 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-[0.08em]">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full h-[46px] px-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 text-sm font-semibold placeholder:text-slate-400 transition-all"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Show passwords
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 text-white text-sm font-extrabold shadow-[0_12px_22px_rgba(14,126,216,0.24)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Requesting..." : "Request Access"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <p className="text-xs font-semibold text-slate-500">
                Already have an account?{" "}
                <Link to="/login" className="text-[#0787d8] font-extrabold hover:text-[#056da8] transition-all">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
