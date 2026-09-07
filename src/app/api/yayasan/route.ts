import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Hanya SUPER_ADMIN yang bisa lihat semua yayasan
    if (session.user.role !== "SUPER_ADMIN") {
      // Untuk non-super admin: hanya yayasan dari sekolahnya sendiri
      const sekolah = await db.sekolah.findUnique({
        where: { id: Number(session.user.sekolahId) },
        select: { yayasanId: true },
      });
      if (!sekolah?.yayasanId) return NextResponse.json([]);
      const yayasan = await db.yayasan.findUnique({ where: { id: sekolah.yayasanId } });
      return NextResponse.json(yayasan ? [yayasan] : []);
    }

    const url = new URL(req.url);
    const statusAktif = url.searchParams.get("statusAktif");

    const where: Record<string, unknown> = {};
    if (statusAktif === "true") where.statusAktif = true;

    const list = await db.yayasan.findMany({
      where,
      orderBy: { nama: "asc" },
      include: {
        _count: { select: { sekolahs: true } },
      },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET yayasan error:", e);
    return NextResponse.json({ error: "Gagal memuat data yayasan" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden: hanya Super Admin yang bisa kelola yayasan" }, { status: 403 });
    }

    const body = await req.json();
    const { nama, npsnYayasan, alamat, telepon, email, website, logoUrl, ketuaYayasan, description, statusAktif } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama yayasan wajib" }, { status: 400 });
    }

    const created = await db.yayasan.create({
      data: {
        nama: String(nama).trim(),
        npsnYayasan: npsnYayasan || null,
        alamat: alamat || null,
        telepon: telepon || null,
        email: email || null,
        website: website || null,
        logoUrl: logoUrl || null,
        ketuaYayasan: ketuaYayasan || null,
        description: description || null,
        statusAktif: statusAktif !== false,
      },
      include: { _count: { select: { sekolahs: true } } },
    });
    return NextResponse.json(created);
  } catch (e) {
    console.error("POST yayasan error:", e);
    return NextResponse.json({ error: "Gagal membuat yayasan" }, { status: 500 });
  }
}
