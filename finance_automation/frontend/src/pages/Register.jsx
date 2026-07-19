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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#061826] relative overflow-hidden px-4 font-sans text-white">
        {/* Background Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Logo container */}
        <div className="mb-8 z-10">
          <img 
            src="/logo.png" 
            alt="SLT Mobitel Logo" 
            className="h-20 object-contain drop-shadow-[0_2px_8px_rgba(0,141,255,0.2)]" 
          />
        </div>

        <div className="max-w-md w-full z-10 bg-[#0B2135]/65 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
            <svg className="h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-white">Registration Received!</h2>
          <p className="mt-4 text-sm text-gray-300">
            Thank you, <span className="font-semibold text-blue-400">{fullName}</span>. Your account registration is complete and is currently 
            <span className="font-semibold text-orange-400"> pending administrator approval</span>.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            You will be able to log in once an administrator approves your account status.
          </p>
          <div className="mt-8">
            <Link
              to="/login"
              className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-xl text-white bg-blue-500 hover:bg-blue-600 shadow-md transition-all"
            >
              Return to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#061826] relative overflow-hidden px-4 py-12 font-sans text-white">
      {/* Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Logo container */}
      <div className="mb-8 z-10">
        <img 
          src="/logo.png" 
          alt="SLT Mobitel Logo" 
          className="h-20 object-contain drop-shadow-[0_2px_8px_rgba(0,141,255,0.2)]" 
        />
      </div>

      {/* Main card */}
      <div className="max-w-md w-full z-10 bg-[#0B2135]/65 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8 flex flex-col">
        {/* Sign In / Register Tabs Toggle */}
        <div className="flex bg-[#051624] p-1 rounded-2xl mb-8">
          <Link 
            to="/login" 
            className="flex-1 text-center py-2.5 text-sm font-semibold rounded-xl text-gray-400 hover:text-white transition-all"
          >
            Sign In
          </Link>
          <button className="flex-1 text-center py-2.5 text-sm font-semibold rounded-xl bg-blue-600 text-white shadow-md transition-all">
            Register
          </button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start space-x-3 text-red-200">
            <svg className="h-5 w-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Full Name *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-[#e8f0fe] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          {/* Email field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Email Address *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                </svg>
              </span>
              <input
                type="email"
                required
                className="w-full pl-11 pr-4 py-2.5 bg-[#e8f0fe] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-11 pr-11 py-2.5 bg-[#e8f0fe] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Confirm Password field */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Confirm Password *
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-11 pr-11 py-2.5 bg-[#e8f0fe] text-gray-900 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Show password checkbox */}
          <div className="flex items-center space-x-2 pt-1 pb-2">
            <input 
              type="checkbox" 
              id="show-pass"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
              className="rounded bg-[#051624] border-white/10 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="show-pass" className="text-xs text-gray-300 cursor-pointer select-none">
              Show Passwords
            </label>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Registering...
              </span>
            ) : (
              <>
                <span>Register</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-semibold hover:underline transition-all">
              Sign In
            </Link>
          </p>
        </div>
      </div>

      {/* Terms of Use Footer */}
      <div className="mt-8 z-10 text-center text-xs text-gray-500">
        By registering you agree to our{" "}
        <a href="#" className="hover:text-gray-300 hover:underline">Privacy Policy</a> and{" "}
        <a href="#" className="hover:text-gray-300 hover:underline">Terms of Use</a>
      </div>
    </div>
  );
}
