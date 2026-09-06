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
    const statusAktif = searchParams.get("statusAktif");

    const where: Record<string, unknown> = {};
    if (sekolahId) where.sekolahId = sekolahId;
    if (statusAktif === "true") where.statusAktif = true;
    else if (statusAktif === "false") where.statusAktif = false;

    const data = await db.ekstrakurikuler.findMany({
      where,
      orderBy: [{ nama: "asc" }],
      include: {
        pembina: { select: { id: true, nama: true, jabatan: true } },
        _count: { select: { pesertas: true, jadwals: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET ekstrakurikuler error:", e);
    return NextResponse.json({ error: "Gagal memuat ekstrakurikuler" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { nama, deskripsi, pembinaId, hari, jamMulai, jamSelesai, tempat, statusAktif } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });

    // Resolve sekolahId
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

    // Verify pembina ownership if provided
    if (pembinaId) {
      const pembina = await db.pegawai.findUnique({ where: { id: Number(pembinaId) }, select: { sekolahId: true } });
      if (!pembina) return NextResponse.json({ error: "Pembina tidak ditemukan" }, { status: 404 });
      if (sekolahId && pembina.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });
    }

    const data = await db.ekstrakurikuler.create({
      data: {
        sekolahId: sid,
        nama: String(nama).trim(),
        deskripsi: deskripsi || null,
        pembinaId: pembinaId ? Number(pembinaId) : null,
        hari: hari || null,
        jamMulai: jamMulai || null,
        jamSelesai: jamSelesai || null,
        tempat: tempat || null,
        statusAktif: statusAktif !== undefined ? !!statusAktif : true,
      },
      include: {
        pembina: { select: { id: true, nama: true, jabatan: true } },
        _count: { select: { pesertas: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST ekstrakurikuler error:", e);
    return NextResponse.json({ error: "Gagal menambah ekstrakurikuler" }, { status: 500 });
  }
}
