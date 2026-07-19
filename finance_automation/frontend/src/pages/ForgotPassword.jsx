import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  requestPasswordResetOtp,
  resetForgottenPassword,
  verifyPasswordResetOtp,
} from "../services/api";

export default function ForgotPassword() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getErrorMessage = (err, fallback) => {
    if (typeof err.message === "string") {
      return err.message;
    }
    return fallback;
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await requestPasswordResetOtp(email);
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await verifyPasswordResetOtp(email, otp);
      setStep("reset");
    } catch (err) {
      setError(getErrorMessage(err, "Invalid OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetForgottenPassword(email, otp, newPassword, confirmPassword);
      setStep("success");
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reset password"));
    } finally {
      setLoading(false);
    }
  };

  const renderHeaderText = () => {
    if (step === "success") {
      return "Password Reset Complete";
    }
    if (step === "reset") {
      return "Create New Password";
    }
    if (step === "otp") {
      return "Enter OTP Code";
    }
    return "Forgot Password";
  };

  return (
    <div className="auth-shell min-h-screen relative overflow-hidden px-4 py-8 font-sans text-slate-900">
      <div className="relative z-10 min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="w-full max-w-[420px] bg-white rounded-[22px] shadow-[0_24px_70px_rgba(77,112,148,0.18)] overflow-hidden">
          <div className="px-6 sm:px-8 pt-8 pb-7 text-center border-b border-slate-200">
            <h1 className="text-[26px] sm:text-[30px] leading-tight font-extrabold text-[#070b1f] tracking-normal">
              {renderHeaderText()}
            </h1>
            <p className="mt-2.5 text-sm font-semibold text-slate-500">
              Finance Portal Account Recovery
            </p>
          </div>

          <div className="px-6 sm:px-8 py-7">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            {step === "email" && (
              <>
                <p className="mb-6 text-sm leading-6 font-semibold text-slate-500">
                  Enter your account email address. We will send a 6-digit OTP code to reset your password.
                </p>

                <form onSubmit={handleRequestOtp} className="space-y-5">
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

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[50px] rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 text-white text-sm font-extrabold shadow-[0_12px_22px_rgba(14,126,216,0.24)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading ? "Sending OTP..." : "Send OTP"}
                  </button>
                </form>
              </>
            )}

            {step === "otp" && (
              <>
                <p className="mb-6 text-sm leading-6 font-semibold text-slate-500">
                  We sent a 6-digit OTP code to <span className="text-[#0787d8]">{email}</span>.
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-[0.08em]">
                      OTP Code
                    </label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength="6"
                      className="w-full h-[46px] px-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 text-sm font-semibold placeholder:text-slate-400 transition-all"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[50px] rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 text-white text-sm font-extrabold shadow-[0_12px_22px_rgba(14,126,216,0.24)] transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
                  >
                    {loading ? "Verifying..." : "Verify OTP"}
                  </button>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleRequestOtp}
                    className="w-full h-[44px] rounded-xl border border-slate-200 bg-white text-sm font-extrabold text-[#0787d8] transition-all hover:bg-slate-50 disabled:opacity-60"
                  >
                    Resend OTP
                  </button>
                </form>
              </>
            )}

            {step === "reset" && (
              <>
                <p className="mb-6 text-sm leading-6 font-semibold text-slate-500">
                  OTP verified. Set a new password for your account.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-[0.08em]">
                      New Password
                    </label>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full h-[46px] px-4 bg-slate-50 text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-400 text-sm font-semibold placeholder:text-slate-400 transition-all"
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                    {loading ? "Resetting..." : "Reset Password"}
                  </button>
                </form>
              </>
            )}

            {step === "success" && (
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-emerald-50 border border-emerald-100 mb-5">
                  <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm leading-6 font-semibold text-slate-500">
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>
                <Link
                  to="/login"
                  className="mt-7 inline-flex h-[48px] px-7 items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-emerald-500 text-white text-sm font-extrabold shadow-[0_12px_22px_rgba(14,126,216,0.24)] transition-all hover:brightness-105"
                >
                  Return to Login
                </Link>
              </div>
            )}

            {step !== "success" && (
              <div className="mt-6 pt-5 border-t border-slate-200 text-center">
                <p className="text-xs font-semibold text-slate-500">
                  Remembered your password?{" "}
                  <Link to="/login" className="text-[#0787d8] font-extrabold hover:text-[#056da8] transition-all">
                    Sign In
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
