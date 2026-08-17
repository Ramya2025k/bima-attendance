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

  if (payload.role !== "hod") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const connection = await getConnection();

  try {
    const [overallRows]: any = await connection.query(
      "SELECT COUNT(*) AS total, SUM(a.status = 'present') AS present " +
      "FROM attendance a JOIN students st ON a.student_id = st.id " +
      "WHERE st.status != 'working'"
    );
    const total = overallRows[0].total;
    const present = overallRows[0].present || 0;
    const classAverage = total > 0 ? Math.round((present / total) * 100) : 0;

    const subjectQuery =
      "SELECT s.subject_name, COUNT(*) AS total, SUM(a.status = 'present') AS present " +
      "FROM attendance a " +
      "JOIN subjects s ON a.subject_id = s.id " +
      "JOIN students st ON a.student_id = st.id " +
      "WHERE st.status != 'working' " +
      "GROUP BY s.id, s.subject_name";
    const [subjectRows]: any = await connection.query(subjectQuery);

    const subjectBreakdown = subjectRows.map((row: any) => ({
      subject: row.subject_name,
      percent: row.total > 0 ? Math.round((row.present / row.total) * 100) : 0,
    }));

    const defaulterQuery =
      "SELECT st.name, st.reg_no, COUNT(*) AS total, SUM(a.status = 'present') AS present " +
      "FROM attendance a " +
      "JOIN students st ON a.student_id = st.id " +
      "WHERE st.status != 'working' " +
      "GROUP BY st.id, st.name, st.reg_no " +
      "HAVING (SUM(a.status = 'present') / COUNT(*)) * 100 < 75";
    const [defaulterRows]: any = await connection.query(defaulterQuery);

    const defaulters = defaulterRows.map((row: any) => ({
      name: row.name,
      regNo: row.reg_no,
      percent: Math.round((row.present / row.total) * 100),
    }));

    const [studentCountRows]: any = await connection.query(
      "SELECT COUNT(*) AS count FROM students WHERE status != 'working'"
    );

    const [subjectListRows]: any = await connection.query(
      "SELECT s.id, s.subject_name, f.name AS faculty_name FROM subjects s " +
      "LEFT JOIN faculty f ON s.faculty_id = f.id"
    );

    return NextResponse.json({
      totalStudents: studentCountRows[0].count,
      classAverage,
      subjectBreakdown,
      defaulters,
      subjects: subjectListRows.map((r: any) => ({
        id: r.id,
        name: r.subject_name,
        faculty: r.faculty_name || "Unassigned",
      })),
    });
  } finally {
    await connection.end();
  }
}
