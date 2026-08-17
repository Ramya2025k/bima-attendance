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
    return NextResponse.json({ error: "Only HOD can add subjects" }, { status: 403 });
  }

 const { subjectName, type, facultyId } = await req.json();
const semester = 2;

if (!subjectName || !type) {
  return NextResponse.json({ error: "Subject name and type are required" }, { status: 400 });
}

  const connection = await getConnection();

  try {
    let assignedFacultyId = null;

    if (facultyId) {
      const [facultyRows]: any = await connection.query(
        "SELECT id FROM faculty WHERE faculty_id = ?",
        [facultyId]
      );
      if (facultyRows.length === 0) {
        return NextResponse.json({ error: "Faculty ID not found" }, { status: 400 });
      }
      assignedFacultyId = facultyRows[0].id;
    }

    await connection.query(
      "INSERT INTO subjects (subject_name, type, semester, faculty_id) VALUES (?, ?, ?, ?)",
      [subjectName, type, semester, assignedFacultyId]
    );

    return NextResponse.json({ message: "Subject added successfully" });
  } finally {
    await connection.end();
  }
}
