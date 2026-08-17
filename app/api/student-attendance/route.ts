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

  const studentId = payload.id;

  const connection = await getConnection();

  try {
    const [studentRows]: any = await connection.query(
      "SELECT semester FROM students WHERE id = ?",
      [studentId]
    );
    const semester = studentRows[0]?.semester || 1;

    const [overallRows]: any = await connection.query(
      "SELECT COUNT(*) AS total, SUM(status = 'present') AS present FROM attendance WHERE student_id = ?",
      [studentId]
    );

    const total = overallRows[0].total;
    const present = overallRows[0].present || 0;
    const overallPercent = total > 0 ? Math.round((present / total) * 100) : 0;

    const subjectQuery =
      "SELECT s.subject_name, " +
      "COUNT(a.id) AS total, " +
      "SUM(a.status = 'present') AS present " +
      "FROM subjects s " +
      "LEFT JOIN attendance a ON a.subject_id = s.id AND a.student_id = ? " +
      "WHERE s.semester = ? " +
      "GROUP BY s.id, s.subject_name";

    const [subjectRows]: any = await connection.query(subjectQuery, [studentId, semester]);

    const subjectBreakdown = subjectRows.map((row: any) => ({
      subject: row.subject_name,
      total: row.total,
      present: row.present || 0,
      percent: row.total > 0 ? Math.round((row.present / row.total) * 100) : 0,
    }));

    return NextResponse.json({
      name: payload.name,
      regNo: payload.regNo,
      overallPercent,
      totalClasses: total,
      attended: present,
      subjectBreakdown,
    });
  } finally {
    await connection.end();
  }
}
