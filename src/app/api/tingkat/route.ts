import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const where = sekolahId ? { sekolahId } : {};
    const data = await db.tingkat.findMany({ where, orderBy: [{ urutan: "asc" }, { nama: "asc" }] });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET tingkat error:", e);
    return NextResponse.json({ error: "Gagal memuat tingkat" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { nama, jenjang, urutan } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });

    // Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    const data = await db.tingkat.create({
      data: {
        sekolahId: sid,
        nama: String(nama).trim(),
        jenjang: jenjang || null,
        urutan: urutan != null ? Number(urutan) : 0,
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST tingkat error:", e);
    return NextResponse.json({ error: "Gagal menambah tingkat" }, { status: 500 });
  }
}
