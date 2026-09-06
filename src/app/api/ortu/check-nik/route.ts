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
    const nik = searchParams.get("nik");
    const excludeId = searchParams.get("excludeId"); // for edit case

    if (!nik) return NextResponse.json({ error: "nik wajib" }, { status: 400 });

    const where: Record<string, unknown> = { nik };
    if (sekolahId) where.sekolahId = sekolahId;
    if (excludeId) where.id = { not: Number(excludeId) };

    const existing = await db.ortu.findFirst({
      where,
      select: {
        id: true,
        nama: true,
        nik: true,
        telepon: true,
        email: true,
        alamat: true,
        pekerjaan: true,
        anakAnak: {
          select: {
            hubungan: true,
            siswa: { select: { id: true, nama: true, nis: true, nisn: true, status: true } },
          },
          orderBy: { siswa: { nama: "asc" } },
        },
      },
    });

    const anakAnak = existing?.anakAnak.map((a) => ({ ...a.siswa, hubungan: a.hubungan })) ?? [];
    return NextResponse.json({ found: !!existing, exists: !!existing, ortu: existing, anakAnak });
  } catch (e) {
    console.error("GET ortu/check-nik error:", e);
    return NextResponse.json({ error: "Gagal check NIK" }, { status: 500 });
  }
}
