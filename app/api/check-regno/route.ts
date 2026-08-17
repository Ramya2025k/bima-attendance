import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { regNo } = await req.json();

  if (!regNo) {
    return NextResponse.json({ error: "Registration number is required" }, { status: 400 });
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

    return NextResponse.json({ name: enrolledRows[0].name });
  } finally {
    await connection.end();
  }
}
