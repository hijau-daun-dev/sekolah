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
    const qStatusAktif = searchParams.get("statusAktif");
    const qTahunAjaranId = searchParams.get("tahunAjaranId");
    const qSearch = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (sekolahId) where.sekolahId = sekolahId;
    else if (qSekolahId) where.sekolahId = Number(qSekolahId);
    if (qStatusAktif === "true") where.statusAktif = true;
    else if (qStatusAktif === "false") where.statusAktif = false;
    if (qTahunAjaranId) where.tahunAjaranId = Number(qTahunAjaranId);
    if (qSearch) {
      where.OR = [
        { nama: { contains: qSearch } },
        { tingkat: { nama: { contains: qSearch } } },
        { jurusan: { nama: { contains: qSearch } } },
        { walikelas: { nama: { contains: qSearch } } },
      ];
    }

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
    const { nama, tingkatId, jurusanId, tahunAjaranId, walikelasId, ruangan, kapasitas, statusAktif } = body;
    if (!nama || !String(nama).trim()) return NextResponse.json({ error: "nama wajib" }, { status: 400 });
    if (!tingkatId) return NextResponse.json({ error: "tingkatId wajib" }, { status: 400 });
    if (!tahunAjaranId) return NextResponse.json({ error: "tahunAjaranId wajib" }, { status: 400 });

    // Resolve sekolahId
    let sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) {
      const firstSekolah = await db.sekolah.findFirst({ select: { id: true } });
      if (!firstSekolah) return NextResponse.json({ error: "Belum ada sekolah terdaftar" }, { status: 400 });
      sid = firstSekolah.id;
    }

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
        statusAktif: statusAktif !== undefined ? !!statusAktif : true,
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
