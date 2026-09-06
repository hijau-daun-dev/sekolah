import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { autoGenerateTingkat } from "@/lib/tingkat";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true, jenjang: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    const result = await autoGenerateTingkat(sid, body.jenjang);
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST tingkat/auto-generate error:", e);
    return NextResponse.json({ error: "Gagal auto-generate tingkat" }, { status: 500 });
  }
}
