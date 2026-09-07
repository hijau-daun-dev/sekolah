import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import { pengeluaranSchema } from "@/lib/schemas";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // GET is read-only: SUPER_ADMIN/KEUANGAN/TU may view
    const allowedGet = ["SUPER_ADMIN", "KEUANGAN", "TU"];
    if (!allowedGet.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: tidak ada akses lihat pengeluaran" }, { status: 403 });
    }

    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const url = new URL(req.url);
    const qSekolahId = url.searchParams.get("sekolahId");
    const effectiveSekolahId = sekolahId ?? (qSekolahId ? Number(qSekolahId) : undefined);

    const where = effectiveSekolahId ? { pegawai: { sekolahId: effectiveSekolahId } } : {};
    const data = await db.pengeluaran.findMany({
      where,
      include: {
        posAnggaran: { select: { id: true, nama: true, kode: true, jenis: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
      orderBy: { tanggal: "desc" },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pengeluaran error:", e);
    return NextResponse.json({ error: "Gagal memuat pengeluaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // PRD Alur 4: hanya Admin Keuangan/Super Admin yang dapat mencatat pengeluaran
    const allowedRoles = ["SUPER_ADMIN", "KEUANGAN"];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: hanya Keuangan/Super Admin yang dapat input pengeluaran" }, { status: 403 });
    }

    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    // Zod validation (PRD §3)
    const parsed = pengeluaranSchema.safeParse({
      posAnggaranId: Number(body.posAnggaranId),
      nominal: Number(body.nominal),
      keterangan: body.keterangan,
      buktiNotaUrl: body.buktiNotaUrl || null,
      tanggal: body.tanggal,
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const { posAnggaranId, nominal: nominalNum, keterangan, buktiNotaUrl, tanggal } = parsed.data;

    // Verify posAnggaran belongs to sekolah
    const pos = await db.posAnggaran.findFirst({
      where: { id: posAnggaranId, ...(sekolahId ? { sekolahId } : {}) },
    });
    if (!pos) return NextResponse.json({ error: "Pos anggaran tidak ditemukan" }, { status: 404 });

    // pegawaiId from session, fallback to any pegawai of sekolah
    let pegawaiId = session.user.pegawaiId ? Number(session.user.pegawaiId) : null;
    if (!pegawaiId) {
      const fallback = await db.pegawai.findFirst({
        where: sekolahId ? { sekolahId } : {},
        select: { id: true },
      });
      if (!fallback) return NextResponse.json({ error: "Pegawai tidak ditemukan untuk user ini" }, { status: 400 });
      pegawaiId = fallback.id;
    }

    const data = await db.pengeluaran.create({
      data: {
        pegawaiId,
        posAnggaranId,
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        nominal: nominalNum,
        keterangan: keterangan.trim(),
        buktiNotaUrl: buktiNotaUrl || null,
      },
      include: {
        posAnggaran: { select: { id: true, nama: true, kode: true, jenis: true } },
        pegawai: { select: { id: true, nama: true, jabatan: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST pengeluaran error:", e);
    return NextResponse.json({ error: "Gagal menambah pengeluaran" }, { status: 500 });
  }
}
