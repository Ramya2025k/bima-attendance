"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [regNo, setRegNo] = useState("");
  const [name, setName] = useState("");
  const [regChecked, setRegChecked] = useState(false);

  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const mobileRegex = /^[6-9]\d{9}$/;
  const emailValid = emailRegex.test(email);
  const mobileValid = mobileRegex.test(mobile);
  const passwordStrong = password.length >= 8 && /[0-9]/.test(password);

  async function checkRegNo() {
    setError("");
    const res = await fetch("/api/check-regno", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "UUCMS number not recognized");
      return;
    }
    setName(data.name);
    setRegChecked(true);
  }

  async function sendOtp() {
    setError("");
    const res = await fetch("/api/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo, email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to send OTP");
      return;
    }
    setOtpSent(true);
  }

  async function verifyOtp() {
    setError("");
    const res = await fetch("/api/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Invalid OTP");
      return;
    }
    setEmailVerified(true);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo, email, mobile, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }
    setSuccess("Registered successfully as " + data.name);
  }

  const inputStyle =
    "w-full mb-3 px-3 py-2 rounded-lg bg-background border border-border-color text-text-primary";
  const labelStyle = "text-xs text-text-secondary block mb-1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background py-10">
      <div className="w-full max-w-sm bg-card border border-border-color rounded-xl p-8">
        <p className="text-lg font-medium text-text-primary mb-1">Create account</p>
        <p className="text-sm text-text-secondary mb-6">Enter your UUCMS number to begin</p>

        <label className={labelStyle}>UUCMS number</label>
        <input
          type="text"
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          disabled={regChecked}
          className={inputStyle}
        />

        {!regChecked && (
          <button onClick={checkRegNo} className="w-full py-2 rounded-lg bg-brand text-background font-medium mb-3">
            Verify UUCMS number
          </button>
        )}

        {regChecked && (
          <>
            <label className={labelStyle}>Name</label>
            <input type="text" value={name} readOnly className={inputStyle + " opacity-70"} />

            <label className={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={emailVerified}
              className={inputStyle}
            />
            {email && !emailValid && <p className="text-danger text-xs -mt-2 mb-3">Enter a valid email address</p>}

            {!otpSent && emailValid && (
              <button onClick={sendOtp} className="w-full py-2 rounded-lg bg-brand text-background font-medium mb-3">
                Send OTP
              </button>
            )}

            {otpSent && !emailVerified && (
              <>
                <label className={labelStyle}>Enter OTP</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={inputStyle}
                  placeholder="6-digit code"
                />
                <button onClick={verifyOtp} className="w-full py-2 rounded-lg bg-brand text-background font-medium mb-3">
                  Verify OTP
                </button>
              </>
            )}

            {emailVerified && (
              <form onSubmit={handleRegister}>
                <label className={labelStyle}>Mobile number</label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className={inputStyle}
                />
                {mobile && !mobileValid && (
                  <p className="text-danger text-xs -mt-2 mb-3">Enter a valid 10-digit mobile number</p>
                )}

                <label className={labelStyle}>Password</label>
                <div className="relative mb-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputStyle + " pr-16"}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2 text-xs text-brand-light cursor-pointer"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </span>
                </div>
                {password && !passwordStrong && (
                  <p className="text-warning text-xs mb-3">Use at least 8 characters including a number</p>
                )}

                <label className={labelStyle}>Confirm password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputStyle}
                />

                <button type="submit" className="w-full py-2 rounded-lg bg-brand text-background font-medium">
                  Register
                </button>
              </form>
            )}
          </>
        )}

        {error && <p className="text-danger text-sm mt-3">{error}</p>}
        {success && <p className="text-success text-sm mt-3">{success}</p>}
      </div>
    </div>
  );
}
