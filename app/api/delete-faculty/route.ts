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
    return NextResponse.json({ error: "Only HOD can delete faculty" }, { status: 403 });
  }

  const { facultyDbId } = await req.json();

  if (!facultyDbId) {
    return NextResponse.json({ error: "facultyDbId is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [targetRows]: any = await connection.query(
      "SELECT role FROM faculty WHERE id = ?",
      [facultyDbId]
    );

    if (targetRows.length === 0) {
      return NextResponse.json({ error: "Faculty not found" }, { status: 404 });
    }

    if (targetRows[0].role === "hod") {
      return NextResponse.json({ error: "Cannot delete an HOD account" }, { status: 400 });
    }

    const [subjectRows]: any = await connection.query(
      "SELECT id FROM subjects WHERE faculty_id = ? LIMIT 1",
      [facultyDbId]
    );

    if (subjectRows.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete — this faculty is still assigned to a subject. Unassign first." },
        { status: 400 }
      );
    }

    await connection.query("DELETE FROM faculty WHERE id = ?", [facultyDbId]);

    return NextResponse.json({ message: "Faculty deleted successfully" });
  } finally {
    await connection.end();
  }
}
