import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const data = await db.role.findMany({ orderBy: { id: "asc" } });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET role error:", e);
    return NextResponse.json({ error: "Gagal memuat role" }, { status: 500 });
  }
}
