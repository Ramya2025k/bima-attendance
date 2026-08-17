import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getConnection } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1] || req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  const submissionId = req.nextUrl.searchParams.get("id");
  if (!submissionId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const connection = await getConnection();

  try {
    const [rows]: any = await connection.query(
      "SELECT pdf_filename, pdf_data FROM submissions WHERE id = ?",
      [submissionId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { pdf_filename, pdf_data } = rows[0];

    return new NextResponse(pdf_data, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${pdf_filename}"`,
      },
    });
  } finally {
    await connection.end();
  }
}
