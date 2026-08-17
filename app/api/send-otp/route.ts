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
  const { regNo, email } = await req.json();

  if (!regNo || !email) {
    return NextResponse.json({ error: "Registration number and email are required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [enrolledRows]: any = await connection.query(
      "SELECT name FROM enrolled_students WHERE reg_no = ?",
      [regNo]
    );

    if (enrolledRows.length === 0) {
      return NextResponse.json({ error: "Registration number not recognized" }, { status: 400 });
    }

    const [existingRows]: any = await connection.query(
      "SELECT id FROM students WHERE reg_no = ?",
      [regNo]
    );

    if (existingRows.length > 0) {
      return NextResponse.json({ error: "This student is already registered" }, { status: 400 });
    }

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
        subject: "Your Bima Attendance OTP",
        html: "<p>Your verification code is <strong>" + otp + "</strong>. It expires in 5 minutes.</p>",
      });
    } catch (err) {
      console.error("Email send error:", err);
      return NextResponse.json({ error: "Failed to send OTP email" }, { status: 500 });
    }

    return NextResponse.json({ message: "OTP sent successfully" });
  } finally {
    await connection.end();
  }
}