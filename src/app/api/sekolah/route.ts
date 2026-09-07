import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const all = url.searchParams.get("all");
    const sekolahIdParam = url.searchParams.get("sekolahId");

    // ?all=true returns array of all sekolahs (for SUPER_ADMIN's user-management dropdown)
    if (all === "true") {
      if (session.user.role === "SUPER_ADMIN") {
        const list = await db.sekolah.findMany({
          orderBy: { nama: "asc" },
          select: { id: true, nama: true, jenjang: true, jenjangId: true, yayasan: true, yayasanId: true, alamat: true, logoUrl: true, kepalaSekolah: true, statusAktif: true, jenjangRef: { select: { id: true, kode: true, nama: true } }, yayasanRef: { select: { id: true, nama: true, logoUrl: true } } },
        });
        return NextResponse.json(list);
      }
      const sid = Number(session.user.sekolahId);
      if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
      const own = await db.sekolah.findUnique({ where: { id: sid }, select: { id: true, nama: true, jenjang: true, jenjangId: true, yayasan: true, yayasanId: true, alamat: true, logoUrl: true, kepalaSekolah: true, statusAktif: true, jenjangRef: { select: { id: true, kode: true, nama: true } }, yayasanRef: { select: { id: true, nama: true, logoUrl: true } } } });
      return NextResponse.json(own ? [own] : []);
    }

    // SUPER_ADMIN: array (or single if ?sekolahId=X provided)
    if (session.user.role === "SUPER_ADMIN") {
      if (sekolahIdParam) {
        const s = await db.sekolah.findUnique({
          where: { id: Number(sekolahIdParam) },
          include: { jenjangRef: true, yayasanRef: true },
        });
        return NextResponse.json(s);
      }
      const list = await db.sekolah.findMany({
        orderBy: { nama: "asc" },
        include: {
          jenjangRef: { select: { id: true, kode: true, nama: true } },
          yayasanRef: { select: { id: true, nama: true, logoUrl: true } },
          _count: { select: { siswas: true, pegawais: true, users: true } },
        },
      });
      return NextResponse.json(list);
    }

    // Non-super → their own sekolah as single object (backward compat with sekolah-section)
    const sid = Number(session.user.sekolahId);
    if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const sekolah = await db.sekolah.findUnique({
      where: { id: sid },
      include: {
        jenjangRef: { select: { id: true, kode: true, nama: true } },
        yayasanRef: { select: { id: true, nama: true, logoUrl: true, alamat: true, telepon: true, email: true } },
      },
    });
    return NextResponse.json(sekolah);
  } catch (e) {
    console.error("GET sekolah error:", e);
    return NextResponse.json({ error: "Gagal memuat data sekolah" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const {
      id, nama, npsn, jenjang, jenjangId, yayasan, yayasanId, alamat, logoUrl, telepon, email, website,
      kepalaSekolah, nipKepala, description, statusAktif,
    } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama sekolah wajib diisi" }, { status: 400 });
    }

    const data: Record<string, unknown> = {
      nama: String(nama).trim(),
      npsn: npsn || null,
      jenjang: jenjang || "SD",
      jenjangId: jenjangId ? Number(jenjangId) : null,
      yayasan: yayasan || null,
      yayasanId: yayasanId ? Number(yayasanId) : null,
      alamat: alamat || null,
      logoUrl: logoUrl || null,
      telepon: telepon || null,
      email: email || null,
      website: website || null,
      kepalaSekolah: kepalaSekolah || null,
      nipKepala: nipKepala || null,
      description: description || null,
    };
    if (statusAktif !== undefined) data.statusAktif = !!statusAktif;

    let targetId: number | undefined = id ? Number(id) : undefined;
    if (session.user.role !== "SUPER_ADMIN") {
      const sid = Number(session.user.sekolahId);
      if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
      targetId = sid;
    }

    let sekolah;
    if (targetId) {
      const existing = await db.sekolah.findUnique({ where: { id: targetId } });
      if (!existing) return NextResponse.json({ error: "Sekolah tidak ditemukan" }, { status: 404 });
      sekolah = await db.sekolah.update({ where: { id: targetId }, data, include: { jenjangRef: true, yayasanRef: true } });
    } else {
      sekolah = await db.sekolah.create({ data, include: { jenjangRef: true, yayasanRef: true } });
    }

    return NextResponse.json(sekolah);
  } catch (e) {
    console.error("POST sekolah error:", e);
    return NextResponse.json({ error: "Gagal menyimpan data sekolah" }, { status: 500 });
  }
}
