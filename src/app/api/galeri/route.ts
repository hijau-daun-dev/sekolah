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
    const data = await db.galeriBerita.findMany({
      where,
      orderBy: { tanggalPosting: "desc" },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET galeri error:", e);
    return NextResponse.json({ error: "Gagal memuat galeri" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    const { judul, konten, gambarUrl, kategori } = body;

    if (!judul || !konten) {
      return NextResponse.json({ error: "Field wajib: judul, konten" }, { status: 400 });
    }
    const validKat = ["Berita", "Galeri", "Pengumuman"];
    if (kategori && !validKat.includes(kategori)) {
      return NextResponse.json({ error: "Kategori tidak valid" }, { status: 400 });
    }

    const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });

    const data = await db.galeriBerita.create({
      data: {
        sekolahId: sid,
        judul: String(judul).trim(),
        konten: String(konten),
        gambarUrl: gambarUrl || null,
        kategori: kategori || "Berita",
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST galeri error:", e);
    return NextResponse.json({ error: "Gagal menambah galeri" }, { status: 500 });
  }
}
