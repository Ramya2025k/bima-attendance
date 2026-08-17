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
    const [rows] = await connection.query("SELECT id, name FROM lecturers ORDER BY name");
    return NextResponse.json({ lecturers: rows });
  } finally {
    await connection.end();
  }
}
