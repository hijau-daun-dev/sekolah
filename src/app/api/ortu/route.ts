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
    const data = await db.ortu.findMany({
      where,
      orderBy: [{ nama: "asc" }],
      include: {
        anakAnak: {
          include: { siswa: { select: { id: true, nama: true, nis: true, status: true } } },
          orderBy: { siswa: { nama: "asc" } },
        },
        _count: { select: { anakAnak: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET ortu error:", e);
    return NextResponse.json({ error: "Gagal memuat data ortu" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { nama, nik, telepon, email, alamat, pekerjaan, fotoUrl } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama ortu wajib diisi" }, { status: 400 });
    }

    const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });

    const data = await db.ortu.create({
      data: {
        sekolahId: sid,
        nama: String(nama).trim(),
        nik: nik || null,
        telepon: telepon || null,
        email: email || null,
        alamat: alamat || null,
        pekerjaan: pekerjaan || null,
        fotoUrl: fotoUrl || null,
      },
      include: { anakAnak: { include: { siswa: { select: { id: true, nama: true } } } }, _count: { select: { anakAnak: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST ortu error:", e);
    return NextResponse.json({ error: "Gagal menambah ortu" }, { status: 500 });
  }
}
