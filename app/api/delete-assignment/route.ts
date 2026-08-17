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

  const { assignmentId } = await req.json();

  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    await connection.query(
      "DELETE FROM assignments WHERE id = ? AND faculty_id = ?",
      [assignmentId, payload.id]
    );
    return NextResponse.json({ message: "Assignment deleted" });
  } finally {
    await connection.end();
  }
}
