import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { getConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  if (payload.role !== "hod") {
    return NextResponse.json({ error: "Only HOD can add faculty" }, { status: 403 });
  }

  const { facultyId, name, password } = await req.json();

  if (!facultyId || !name || !password) {
    return NextResponse.json({ error: "Faculty ID, name, and password are required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [existing]: any = await connection.query(
      "SELECT id FROM faculty WHERE faculty_id = ?",
      [facultyId]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "This Faculty ID is already in use" }, { status: 400 });
    }

    const autoEmail = facultyId + "@bima.local";
    const passwordHash = await bcrypt.hash(password, 10);

    await connection.query(
      "INSERT INTO faculty (faculty_id, name, email, password_hash, role, active) VALUES (?, ?, ?, ?, 'faculty', 1)",
      [facultyId, name, autoEmail, passwordHash]
    );

    return NextResponse.json({ message: "Faculty added successfully" });
  } finally {
    await connection.end();
  }
}
