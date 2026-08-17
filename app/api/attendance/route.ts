import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
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

  if (payload.role !== "faculty" && payload.role !== "hod") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { subjectId, date, records } = await req.json();

  if (!subjectId || !date || !Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "subjectId, date, and records[] are required" }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  if (date !== today) {
    return NextResponse.json({ error: "Attendance can only be marked for today's date" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [existing]: any = await connection.query(
      "SELECT id FROM attendance WHERE subject_id = ? AND date = ? LIMIT 1",
      [subjectId, date]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "Attendance already marked for this subject and date" }, { status: 400 });
    }

    for (const record of records) {
      await connection.query(
        "INSERT INTO attendance (student_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?)",
        [record.studentId, subjectId, date, record.status, payload.id]
      );
    }

    return NextResponse.json({ message: "Attendance marked successfully", count: records.length });
  } finally {
    await connection.end();
  }
}
