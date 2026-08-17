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
    const [rows] = await connection.query(
      `SELECT f.id, f.faculty_id, f.name, f.role,
              GROUP_CONCAT(s.subject_name SEPARATOR ', ') AS subjects
       FROM faculty f
       LEFT JOIN subjects s ON s.faculty_id = f.id
       GROUP BY f.id, f.faculty_id, f.name, f.role
       ORDER BY f.name`
    );
    return NextResponse.json({ faculty: rows });
  } finally {
    await connection.end();
  }
}
