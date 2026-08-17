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
    return NextResponse.json({ error: "Only HOD can delete subjects" }, { status: 403 });
  }

  const { subjectId } = await req.json();

  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [attendanceRows]: any = await connection.query(
      "SELECT id FROM attendance WHERE subject_id = ? LIMIT 1",
      [subjectId]
    );

    if (attendanceRows.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete this subject — attendance has already been recorded for it" },
        { status: 400 }
      );
    }

    await connection.query("DELETE FROM subjects WHERE id = ?", [subjectId]);

    return NextResponse.json({ message: "Subject deleted successfully" });
  } finally {
    await connection.end();
  }
}
