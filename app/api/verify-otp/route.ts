import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { email, otp } = await req.json();

  if (!email || !otp) {
    return NextResponse.json({ error: "Email and OTP are required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [rows]: any = await connection.query(
      "SELECT * FROM otp_codes WHERE email = ? AND otp_code = ? AND verified = FALSE ORDER BY created_at DESC LIMIT 1",
      [email, otp]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }

    const record = rows[0];
    const now = new Date();

    if (new Date(record.expires_at) < now) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }

    await connection.query(
      "UPDATE otp_codes SET verified = TRUE WHERE id = ?",
      [record.id]
    );

    return NextResponse.json({ message: "OTP verified successfully" });
  } finally {
    await connection.end();
  }
}
