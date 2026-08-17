import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { regNo, email, mobile, password } = await req.json();

  if (!regNo || !email || !mobile || !password) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [enrolledRows]: any = await connection.query(
      "SELECT name, semester FROM enrolled_students WHERE reg_no = ?",
      [regNo]
    );

    if (enrolledRows.length === 0) {
      return NextResponse.json({ error: "Registration number not recognized" }, { status: 400 });
    }

    const officialName = enrolledRows[0].name;
    const officialSemester = enrolledRows[0].semester;

    const [existingRows]: any = await connection.query(
      "SELECT id FROM students WHERE reg_no = ?",
      [regNo]
    );

    if (existingRows.length > 0) {
      return NextResponse.json({ error: "This student is already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
await connection.query(
  "INSERT INTO students (reg_no, name, email, mobile, password_hash, semester) VALUES (?, ?, ?, ?, ?, ?)",
  [regNo, officialName, email, mobile, passwordHash, officialSemester]
);

    return NextResponse.json({ message: "Registration successful", name: officialName });
  } finally {
    await connection.end();
  }
}
