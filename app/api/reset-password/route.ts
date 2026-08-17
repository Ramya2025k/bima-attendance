import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { regNo, otp, newPassword } = await req.json();

  if (!regNo || !otp || !newPassword) {
    return NextResponse.json({ error: "Registration number, OTP, and new password are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [otpRows]: any = await connection.query(
      "SELECT * FROM otp_codes WHERE reg_no = ? AND otp_code = ? AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
      [regNo, otp]
    );

    if (otpRows.length === 0) {
      return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await connection.query(
      "UPDATE students SET password_hash = ? WHERE reg_no = ?",
      [passwordHash, regNo]
    );

    await connection.query("DELETE FROM otp_codes WHERE reg_no = ?", [regNo]);

    return NextResponse.json({ message: "Password reset successfully" });
  } finally {
    await connection.end();
  }
}
