import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const all = url.searchParams.get("all");

    // ?all=true returns array of all sekolahs (for SUPER_ADMIN's user-management dropdown)
    if (all === "true") {
      if (session.user.role === "SUPER_ADMIN") {
        const list = await db.sekolah.findMany({ orderBy: { nama: "asc" }, select: { id: true, nama: true, alamat: true, logoUrl: true, kepalaSekolah: true } });
        return NextResponse.json(list);
      }
      // Non-super: return their own as single-item array
      const sid = Number(session.user.sekolahId);
      if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
      const own = await db.sekolah.findUnique({ where: { id: sid }, select: { id: true, nama: true, alamat: true, logoUrl: true, kepalaSekolah: true } });
      return NextResponse.json(own ? [own] : []);
    }

    // SUPER_ADMIN -> first sekolah (or empty list pick). Non-super -> their own sekolah.
    let sekolah = null;
    if (session.user.role === "SUPER_ADMIN") {
      sekolah = await db.sekolah.findFirst({ orderBy: { id: "asc" } });
    } else {
      const sid = Number(session.user.sekolahId);
      if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
      sekolah = await db.sekolah.findUnique({ where: { id: sid } });
    }
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
      id, nama, npsn, alamat, logoUrl, telepon, email, website,
      kepalaSekolah, nipKepala, description,
    } = body;

    if (!nama || !String(nama).trim()) {
      return NextResponse.json({ error: "Nama sekolah wajib diisi" }, { status: 400 });
    }

    const data = {
      nama: String(nama).trim(),
      npsn: npsn || null,
      alamat: alamat || null,
      logoUrl: logoUrl || null,
      telepon: telepon || null,
      email: email || null,
      website: website || null,
      kepalaSekolah: kepalaSekolah || null,
      nipKepala: nipKepala || null,
      description: description || null,
    };

    // For non-SUPER_ADMIN, force sekolahId to their own
    let targetId: number | undefined = id ? Number(id) : undefined;
    if (session.user.role !== "SUPER_ADMIN") {
      const sid = Number(session.user.sekolahId);
      if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
      targetId = sid; // always operate on their own sekolah
    }

    let sekolah;
    if (targetId) {
      // update existing
      const existing = await db.sekolah.findUnique({ where: { id: targetId } });
      if (!existing) return NextResponse.json({ error: "Sekolah tidak ditemukan" }, { status: 404 });
      sekolah = await db.sekolah.update({ where: { id: targetId }, data });
    } else {
      // create new (only SUPER_ADMIN can create new sekolah record)
      sekolah = await db.sekolah.create({ data });
    }

    return NextResponse.json(sekolah);
  } catch (e) {
    console.error("POST sekolah error:", e);
    return NextResponse.json({ error: "Gagal menyimpan data sekolah" }, { status: 500 });
  }
}
