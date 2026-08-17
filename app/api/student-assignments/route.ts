import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getConnection } from "@/lib/db";

export async function GET(req: NextRequest) {
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

  const connection = await getConnection();

  try {
    const [studentRows]: any = await connection.query(
      "SELECT semester FROM students WHERE id = ?",
      [payload.id]
    );

    if (studentRows.length === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const semester = studentRows[0].semester;

    const [rows] = await connection.query(
      `SELECT a.id, a.title, a.description, a.due_date, a.pdf_filename, a.created_at,
              s.subject_name,
              sub.id AS submission_id, sub.pdf_filename AS submission_filename, sub.submitted_at
       FROM assignments a
       JOIN subjects s ON s.id = a.subject_id
       LEFT JOIN submissions sub ON sub.assignment_id = a.id AND sub.student_id = ?
       WHERE s.semester = ?
       ORDER BY a.due_date IS NULL, a.due_date ASC, a.created_at DESC`,
      [payload.id, semester]
    );

    return NextResponse.json({ assignments: rows });
  } finally {
    await connection.end();
  }
}
