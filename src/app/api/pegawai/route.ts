import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { pegawaiSchema } from "@/lib/schemas";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const where = sekolahId ? { sekolahId } : {};
    const data = await db.pegawai.findMany({
      where,
      orderBy: [{ orgLevel: "asc" }, { orgOrder: "asc" }, { nama: "asc" }],
      include: {
        _count: { select: { children: true } },
        parent: { select: { id: true, nama: true, jabatan: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pegawai error:", e);
    return NextResponse.json({ error: "Gagal memuat data pegawai" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const body = await req.json();
    // Zod validation (PRD §3)
    const parsed = pegawaiSchema.safeParse({
      nip: body.nip ?? null,
      nama: body.nama,
      gender: body.gender ?? null,
      tempatLahir: body.tempatLahir ?? null,
      tanggalLahir: body.tanggalLahir ?? null,
      alamat: body.alamat ?? null,
      telepon: body.telepon ?? null,
      email: body.email ?? null,
      jabatan: body.jabatan ?? null,
      bidangStudi: body.bidangStudi ?? null,
      fotoUrl: body.fotoUrl ?? null,
      status: body.status,
      orgLevel: body.orgLevel != null ? Number(body.orgLevel) : undefined,
      orgOrder: body.orgOrder != null ? Number(body.orgOrder) : undefined,
      parentId: body.parentId != null ? Number(body.parentId) : null,
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const {
      nip, nama, gender, tempatLahir, tanggalLahir, alamat, telepon, email,
      jabatan, bidangStudi, fotoUrl, status, orgLevel, orgOrder, parentId,
    } = parsed.data;

    const sid = sekolahId ?? (body.sekolahId ? Number(body.sekolahId) : undefined);
    if (!sid) return NextResponse.json({ error: "sekolahId wajib untuk super admin" }, { status: 400 });

    const data = await db.pegawai.create({
      data: {
        sekolahId: sid,
        nip: nip || null,
        nama: String(nama).trim(),
        gender: gender || null,
        tempatLahir: tempatLahir || null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : null,
        alamat: alamat || null,
        telepon: telepon || null,
        email: email || null,
        jabatan: jabatan || null,
        bidangStudi: bidangStudi || null,
        fotoUrl: fotoUrl || null,
        status: status || "Aktif",
        orgLevel: orgLevel != null ? orgLevel : 0,
        orgOrder: orgOrder != null ? orgOrder : 0,
        parentId: parentId || null,
      },
      include: { parent: { select: { id: true, nama: true } }, _count: { select: { children: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST pegawai error:", e);
    return NextResponse.json({ error: "Gagal menambah pegawai" }, { status: 500 });
  }
}
