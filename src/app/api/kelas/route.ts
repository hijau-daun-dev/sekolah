import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const where = sekolahId ? { sekolahId } : {};
    const data = await db.kelas.findMany({
      where,
      orderBy: [{ tingkat: { urutan: "asc" } }, { nama: "asc" }],
      include: {
        tingkat: { select: { id: true, nama: true, jenjang: true } },
        jurusan: { select: { id: true, kode: true, nama: true } },
        tahunAjaran: { select: { id: true, nama: true, statusAktif: true } },
        walikelas: { select: { id: true, nama: true, jabatan: true } },
        _count: { select: { kelasSiswas: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET kelas error:", e);
    return NextResponse.json({ error: "Gagal memuat kelas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { nama, tingkatId, jurusanId, tahunAjaranId, walikelasId, ruangan, kapasitas } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });
    if (!tingkatId) return NextResponse.json({ error: "tingkatId wajib" }, { status: 400 });
    if (!tahunAjaranId) return NextResponse.json({ error: "tahunAjaranId wajib" }, { status: 400 });

    const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });

    const data = await db.kelas.create({
      data: {
        sekolahId: sid,
        nama: String(nama).trim(),
        tingkatId: Number(tingkatId),
        jurusanId: jurusanId ? Number(jurusanId) : null,
        tahunAjaranId: Number(tahunAjaranId),
        walikelasId: walikelasId ? Number(walikelasId) : null,
        ruangan: ruangan || null,
        kapasitas: kapasitas != null && kapasitas !== "" ? Number(kapasitas) : null,
      },
      include: {
        tingkat: { select: { id: true, nama: true } },
        jurusan: { select: { id: true, kode: true, nama: true } },
        tahunAjaran: { select: { id: true, nama: true } },
        walikelas: { select: { id: true, nama: true } },
        _count: { select: { kelasSiswas: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST kelas error:", e);
    return NextResponse.json({ error: "Gagal menambah kelas" }, { status: 500 });
  }
}
