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
    const data = await db.siswa.findMany({
      where,
      orderBy: [{ nama: "asc" }],
      include: {
        kelasSiswas: {
          include: {
            kelas: { select: { id: true, nama: true, tingkat: { select: { nama: true } }, tahunAjaran: { select: { nama: true, statusAktif: true } } } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET siswa error:", e);
    return NextResponse.json({ error: "Gagal memuat data siswa" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { nis, nisn, nama, gender, tempatLahir, tanggalLahir, alamat, telepon, fotoUrl, status } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama siswa wajib diisi" }, { status: 400 });
    }

    const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });

    const data = await db.siswa.create({
      data: {
        sekolahId: sid,
        nis: nis || null,
        nisn: nisn || null,
        nama: String(nama).trim(),
        gender: gender || null,
        tempatLahir: tempatLahir || null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        alamat: alamat || null,
        telepon: telepon || null,
        fotoUrl: fotoUrl || null,
        status: status || "Aktif",
      },
      include: { kelasSiswas: { include: { kelas: { select: { id: true, nama: true } } } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST siswa error:", e);
    return NextResponse.json({ error: "Gagal menambah siswa" }, { status: 500 });
  }
}
