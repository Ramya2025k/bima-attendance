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

  const assignmentId = req.nextUrl.searchParams.get("assignmentId");
  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [assignmentRows]: any = await connection.query(
      "SELECT faculty_id FROM assignments WHERE id = ?",
      [assignmentId]
    );

    if (assignmentRows.length === 0 || assignmentRows[0].faculty_id !== payload.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const [rows] = await connection.query(
      `SELECT sub.id, sub.pdf_filename, sub.submitted_at, st.name, st.reg_no
       FROM submissions sub
       JOIN students st ON st.id = sub.student_id
       WHERE sub.assignment_id = ?
       ORDER BY sub.submitted_at DESC`,
      [assignmentId]
    );

    return NextResponse.json({ submissions: rows });
  } finally {
    await connection.end();
  }
}
