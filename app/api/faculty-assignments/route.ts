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
    const [rows] = await connection.query(
      `SELECT a.id, a.title, a.description, a.due_date, a.pdf_filename, a.created_at,
              s.subject_name,
              (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) AS submission_count
       FROM assignments a
       JOIN subjects s ON s.id = a.subject_id
       WHERE a.faculty_id = ?
       ORDER BY a.created_at DESC`,
      [payload.id]
    );
    return NextResponse.json({ assignments: rows });
  } finally {
    await connection.end();
  }
}
