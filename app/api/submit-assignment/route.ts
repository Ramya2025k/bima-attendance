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

  if (payload.role !== "student") {
    return NextResponse.json({ error: "Only students can submit assignments" }, { status: 403 });
  }

  const formData = await req.formData();
  const assignmentId = formData.get("assignmentId") as string;
  const file = formData.get("pdf") as File | null;

  if (!assignmentId || !file) {
    return NextResponse.json({ error: "assignmentId and PDF are required" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const connection = await getConnection();

  try {
    const [assignmentRows]: any = await connection.query(
      "SELECT DATE_FORMAT(due_date, '%Y-%m-%d') AS due_date FROM assignments WHERE id = ?",
      [assignmentId]
    );

    if (assignmentRows.length === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const dueDate: string | null = assignmentRows[0].due_date;
    if (dueDate) {
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
      if (match) {
        const [, y, m, d] = match;
        // Treat the whole due day as still open by comparing against the
        // end of that day (23:59:59.999), not midnight.
        const deadline = new Date(Number(y), Number(m) - 1, Number(d), 23, 59, 59, 999);
        if (deadline.getTime() < Date.now()) {
          return NextResponse.json(
            { error: "The deadline for this assignment has passed. Submission is closed." },
            { status: 403 }
          );
        }
      }
    }

    await connection.query(
      `INSERT INTO submissions (assignment_id, student_id, pdf_filename, pdf_data)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pdf_filename = VALUES(pdf_filename), pdf_data = VALUES(pdf_data), submitted_at = CURRENT_TIMESTAMP`,
      [assignmentId, payload.id, file.name, buffer]
    );

    return NextResponse.json({ message: "Assignment submitted successfully" });
  } finally {
    await connection.end();
  }
}