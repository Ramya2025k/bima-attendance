import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { getConnection } from "@/lib/db";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function POST(req: NextRequest) {
  const { regNo } = await req.json();

  if (!regNo) {
    return NextResponse.json({ error: "Registration number is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [rows]: any = await connection.query(
      "SELECT email FROM students WHERE reg_no = ?",
      [regNo]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Registration number not found" }, { status: 400 });
    }

    const email = rows[0].email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await connection.query(
      "INSERT INTO otp_codes (email, reg_no, otp_code, expires_at) VALUES (?, ?, ?, ?)",
      [email, regNo, otp, expiresAt]
    );

    try {
      await transporter.sendMail({
        from: `"Bima Attendance" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Password Reset OTP",
        html: "<p>Your password reset code is <strong>" + otp + "</strong>. It expires in 5 minutes.</p>",
      });
    } catch (err) {
      console.error("Email send error:", err);
      return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
    }

    const maskedEmail = email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
    return NextResponse.json({ message: "OTP sent", maskedEmail });
  } finally {
    await connection.end();
  }
}
