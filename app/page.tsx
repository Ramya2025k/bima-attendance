"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Role = "student" | "faculty" | "hod";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("student");
  const [regNo, setRegNo] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regNo, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }
    localStorage.setItem("token", data.token);

    if (role === "student") router.push("/student-dashboard");
    else if (role === "faculty") router.push("/faculty-dashboard");
    else router.push("/hod-dashboard");
  }

  const tabStyle = (active: boolean) =>
    "flex-1 py-2 text-sm rounded-lg font-medium transition-colors " +
    (active ? "bg-brand text-background" : "bg-background text-text-secondary border border-border-color");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <form onSubmit={handleLogin} className="w-full max-w-sm bg-card border border-border-color rounded-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <img src="/college-logo.png" alt="College logo" className="w-20 h-20 object-contain mb-3" />
          <p className="text-sm font-semibold text-text-primary text-center leading-tight">
            Bangalore Integrated Management Academy
          </p>
          <p className="text-xs text-text-secondary mt-1">MCA Attendance Portal</p>
        </div>

        <div className="flex gap-2 mb-6">
          <button type="button" onClick={() => setRole("student")} className={tabStyle(role === "student")}>
            Student
          </button>
          <button type="button" onClick={() => setRole("faculty")} className={tabStyle(role === "faculty")}>
            Faculty
          </button>
          <button type="button" onClick={() => setRole("hod")} className={tabStyle(role === "hod")}>
            HOD
          </button>
        </div>

        <input
          type="text"
          placeholder={role === "student" ? "UUCMS number" : "Faculty ID"}
          value={regNo}
          onChange={(e) => setRegNo(e.target.value)}
          className="w-full mb-4 px-3 py-2 rounded-lg bg-background border border-border-color text-text-primary"
        />

        <div className="relative mb-1">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 pr-16 rounded-lg bg-background border border-border-color text-text-primary"
          />
          <span
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 text-xs text-brand-light cursor-pointer"
          >
            {showPassword ? "Hide" : "Show"}
          </span>
        </div>

        <div className="text-right mb-4">
          <a href="/forgot-password" className="text-xs text-text-secondary">
            Forgot password?
          </a>
        </div>

        {error && <p className="text-danger text-sm mb-4">{error}</p>}
        <button type="submit" className="w-full py-2 rounded-lg bg-brand text-background font-medium">
          Sign in
        </button>

        {role === "student" && (
          <p className="text-sm text-text-secondary text-center mt-4">
            New student?{" "}
            <a href="/register" className="text-brand-light font-medium">
              Register here
            </a>
          </p>
        )}
      </form>
    </div>
  );
}
