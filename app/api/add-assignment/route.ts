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

  const formData = await req.formData();
  const subjectId = formData.get("subjectId") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const dueDate = formData.get("dueDate") as string;
  const file = formData.get("pdf") as File | null;

  if (!subjectId || !title || !file) {
    return NextResponse.json({ error: "Subject, title, and PDF are required" }, { status: 400 });
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const connection = await getConnection();

  try {
    await connection.query(
      "INSERT INTO assignments (subject_id, faculty_id, title, description, due_date, pdf_filename, pdf_data) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [subjectId, payload.id, title, description || null, dueDate || null, file.name, buffer]
    );

    return NextResponse.json({ message: "Assignment posted successfully" });
  } finally {
    await connection.end();
  }
}
