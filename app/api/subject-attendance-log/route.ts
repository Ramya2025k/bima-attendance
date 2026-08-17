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

  if (payload.role !== "faculty" && payload.role !== "hod") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const month = req.nextUrl.searchParams.get("month");

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    let query =
      "SELECT date, COUNT(*) AS total, SUM(status = 'present') AS present " +
      "FROM attendance WHERE subject_id = ?";
    const params: any[] = [subjectId];

    if (month) {
      query += " AND DATE_FORMAT(date, '%Y-%m') = ?";
      params.push(month);
    }

    query += " GROUP BY date ORDER BY date DESC";

    const [rows]: any = await connection.query(query, params);

    const log = rows.map((r: any) => ({
      date: r.date,
      total: r.total,
      present: r.present,
    }));

    return NextResponse.json({
      totalClassesHeld: log.length,
      log,
    });
  } finally {
    await connection.end();
  }
}
