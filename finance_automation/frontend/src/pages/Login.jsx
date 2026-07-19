import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      if (user.role === "Admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell min-h-screen relative overflow-hidden px-4 py-8 font-sans text-slate-900">
      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-full max-w-[420px] bg-white rounded-[22px] shadow-[0_24px_70px_rgba(77,112,148,0.18)] overflow-hidden">
          <div className="px-6 sm:px-8 pt-8 pb-7 text-center border-b border-slate-200">
            <h1 className="text-[26px] sm:text-[30px] leading-tight font-extrabold text-[#070b1f] tracking-normal">
              Sign In
            </h1>
            <p className="mt-2.5 text-sm font-semibold text-slate-500">
              Finance Portal Access
            </p>
          </div>

          <div className="px-6 sm:px-8 py-7">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
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

              <div className="flex items-center justify-between gap-4 -mt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() => setShowPassword(!showPassword)}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  Show password
                </label>
                <Link to="/forgot-password" className="text-xs font-extrabold text-[#0787d8] hover:text-[#056da8] transition-all">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 text-white text-sm font-extrabold shadow-[0_12px_22px_rgba(14,126,216,0.24)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200 text-center">
              <p className="text-xs font-semibold text-slate-500">
                Don't have an account?{" "}
                <Link to="/register" className="text-[#0787d8] font-extrabold hover:text-[#056da8] transition-all">
                  Request Access
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
