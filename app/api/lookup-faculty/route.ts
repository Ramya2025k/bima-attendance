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

  const facultyId = req.nextUrl.searchParams.get("facultyId");

  if (!facultyId) {
    return NextResponse.json({ error: "facultyId is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [rows]: any = await connection.query(
      "SELECT name FROM faculty WHERE faculty_id = ?",
      [facultyId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ found: false });
    }

    return NextResponse.json({ found: true, name: rows[0].name });
  } finally {
    await connection.end();
  }
}
