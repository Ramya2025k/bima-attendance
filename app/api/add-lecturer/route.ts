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
    return NextResponse.json({ error: "Only HOD can add lecturers" }, { status: 403 });
  }

  const { id, name } = await req.json();

  if (!id || !name) {
    return NextResponse.json({ error: "ID and name are required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [existing]: any = await connection.query(
      "SELECT id FROM lecturers WHERE id = ?",
      [id]
    );

    if (existing.length > 0) {
      return NextResponse.json({ error: "This ID is already in use" }, { status: 400 });
    }

    await connection.query(
      "INSERT INTO lecturers (id, name) VALUES (?, ?)",
      [id, name]
    );

    return NextResponse.json({ message: "Lecturer added successfully" });
  } finally {
    await connection.end();
  }
}
