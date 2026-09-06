import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const qSekolahId = searchParams.get("sekolahId");
    const where: Record<string, unknown> = {};
    if (sekolahId) where.sekolahId = sekolahId;
    else if (qSekolahId) where.sekolahId = Number(qSekolahId);
    const data = await db.jurusan.findMany({
      where,
      orderBy: [{ kode: "asc" }, { nama: "asc" }],
      include: { _count: { select: { kelases: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET jurusan error:", e);
    return NextResponse.json({ error: "Gagal memuat jurusan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { kode, nama, keterangan } = body;
    if (!kode || !String(kode).trim()) return NextResponse.json({ error: "kode wajib" }, { status: 400 });
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });

    // Resolve sekolahId: from session, or body, or fallback to first sekolah for super admin
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    const data = await db.jurusan.create({
      data: {
        sekolahId: sid,
        kode: String(kode).trim(),
        nama: String(nama).trim(),
        keterangan: keterangan || null,
      },
      include: { _count: { select: { kelases: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST jurusan error:", e);
    return NextResponse.json({ error: "Gagal menambah jurusan" }, { status: 500 });
  }
}
