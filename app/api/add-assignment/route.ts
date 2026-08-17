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

  let dueDateValue: string | null = null;
  if (dueDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
    const year = match ? Number(match[1]) : NaN;
    const month = match ? Number(match[2]) : NaN;
    const day = match ? Number(match[3]) : NaN;
    const isRealDate =
      !!match &&
      year >= 2020 &&
      year <= 2099 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31 &&
      !isNaN(new Date(year, month - 1, day).getTime());
    if (!isRealDate) {
      return NextResponse.json({ error: "Due date is invalid" }, { status: 400 });
    }
    // Server clock is UTC; since IST (and most relevant timezones here) run
    // ahead of UTC, comparing against the server's UTC "today" is always at
    // least as permissive as the faculty member's local "today" — it will
    // never reject a legitimate same-day date, only genuinely past ones.
    const serverTodayStr = new Date().toISOString().slice(0, 10);
    if (dueDate < serverTodayStr) {
      return NextResponse.json({ error: "Due date can't be in the past" }, { status: 400 });
    }
    dueDateValue = dueDate;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const connection = await getConnection();

  try {
    await connection.query(
      "INSERT INTO assignments (subject_id, faculty_id, title, description, due_date, pdf_filename, pdf_data) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [subjectId, payload.id, title, description || null, dueDateValue, file.name, buffer]
    );

    return NextResponse.json({ message: "Assignment posted successfully" });
  } finally {
    await connection.end();
  }
}