"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [regNo, setRegNo] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function sendOtp() {
    setError("");
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to send OTP");
      return;
    }
    setMaskedEmail(data.maskedEmail);
    setOtpSent(true);
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo, otp, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to reset password");
      return;
    }
    setSuccess("Password reset successfully. Redirecting to login...");
    setTimeout(() => router.push("/"), 2000);
  }

  const inputStyle =
    "w-full mb-3 px-3 py-2 rounded-lg bg-background border border-border-color text-text-primary";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm bg-card border border-border-color rounded-xl p-8">
        <p className="text-lg font-medium text-text-primary mb-1">Reset password</p>
        <p className="text-sm text-text-secondary mb-6">Enter your registration number to begin</p>

        <input
          type="text"
          placeholder="Registration number"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          disabled={otpSent}
          className={inputStyle}
        />

        {!otpSent && (
          <button onClick={sendOtp} className="w-full py-2 rounded-lg bg-brand text-background font-medium">
            Send OTP
          </button>
        )}

        {otpSent && !success && (
          <form onSubmit={resetPassword}>
            <p className="text-xs text-text-secondary mb-3">OTP sent to {maskedEmail}</p>

            <input
              type="text"
              placeholder="6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className={inputStyle}
            />

            <div className="relative mb-3">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 pr-16 rounded-lg bg-background border border-border-color text-text-primary"
              />
              <span
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2 text-xs text-brand-light cursor-pointer"
              >
                {showPassword ? "Hide" : "Show"}
              </span>
            </div>

            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputStyle}
            />

            <button type="submit" className="w-full py-2 rounded-lg bg-brand text-background font-medium">
              Reset password
            </button>
          </form>
        )}

        {error && <p className="text-danger text-sm mt-3">{error}</p>}
        {success && <p className="text-success text-sm mt-3">{success}</p>}

        <p className="text-sm text-text-secondary text-center mt-4">
          <a href="/" className="text-brand-light font-medium">
            Back to login
          </a>
        </p>
      </div>
    </div>
  );
}
