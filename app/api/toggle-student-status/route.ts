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

  if (payload.role !== "hod") {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { studentId, status } = await req.json();

  if (!studentId || !status || !["active", "working"].includes(status)) {
    return NextResponse.json({ error: "Valid studentId and status are required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    await connection.query("UPDATE students SET status = ? WHERE id = ?", [status, studentId]);
    return NextResponse.json({ message: "Status updated" });
  } finally {
    await connection.end();
  }
}
