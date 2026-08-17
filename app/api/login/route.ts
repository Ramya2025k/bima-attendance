import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { regNo, password, role } = await req.json();

  if (!regNo || !password || !role) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    if (role === "student") {
      const [rows]: any = await connection.query(
        "SELECT * FROM students WHERE reg_no = ?",
        [regNo]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const student = rows[0];
      const passwordMatches = await bcrypt.compare(password, student.password_hash);

      if (!passwordMatches) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = jwt.sign(
        { id: student.id, regNo: student.reg_no, name: student.name, role: "student" },
        process.env.JWT_SECRET!,
        { expiresIn: "8h" }
      );

      return NextResponse.json({ message: "Login successful", token, name: student.name });
    }

    if (role === "faculty" || role === "hod") {
      const [rows]: any = await connection.query(
        "SELECT * FROM faculty WHERE faculty_id = ?",
        [regNo]
      );

      if (rows.length === 0) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const faculty = rows[0];

      if (faculty.role !== role) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const passwordMatches = await bcrypt.compare(password, faculty.password_hash);

      if (!passwordMatches) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      const token = jwt.sign(
        { id: faculty.id, facultyId: faculty.faculty_id, name: faculty.name, role: faculty.role },
        process.env.JWT_SECRET!,
        { expiresIn: "8h" }
      );

      return NextResponse.json({ message: "Login successful", token, name: faculty.name });
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  } finally {
    await connection.end();
  }
}