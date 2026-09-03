import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

async function checkOwnership(pegawaiId: number, sekolahId?: number) {
  const p = await db.pegawai.findUnique({ where: { id: pegawaiId }, select: { sekolahId: true } });
  if (!p) return null;
  if (sekolahId && p.sekolahId !== sekolahId) return null;
  return p;
}

// Walk up the parent chain to detect a cycle starting from `startId` moving up via candidate parentId
async function wouldCreateCycle(nodeId: number, candidateParentId: number): Promise<boolean> {
  if (candidateParentId === nodeId) return true;
  let current: number | null = candidateParentId;
  const visited = new Set<number>();
  while (current && !visited.has(current)) {
    if (current === nodeId) return true;
    visited.add(current);
    const row = await db.pegawai.findUnique({ where: { id: current }, select: { parentId: true } });
    current = row?.parentId ?? null;
  }
  return false;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const pegawaiId = Number(id);
    const owned = await checkOwnership(pegawaiId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const data = await db.pegawai.findUnique({
      where: { id: pegawaiId },
      include: {
        parent: { select: { id: true, nama: true, jabatan: true } },
        children: { select: { id: true, nama: true, jabatan: true, orgLevel: true }, orderBy: { orgOrder: "asc" } },
        _count: { select: { children: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET pegawai/[id] error:", e);
    return NextResponse.json({ error: "Gagal memuat pegawai" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const pegawaiId = Number(id);
    const owned = await checkOwnership(pegawaiId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const {
      nip, nama, gender, tempatLahir, tanggalLahir, alamat, telepon, email,
      jabatan, bidangStudi, fotoUrl, status, orgLevel, orgOrder, parentId,
    } = body;

    // Validate parentId not forming a cycle
    if (parentId != null && parentId !== "") {
      const pid = Number(parentId);
      if (pid === pegawaiId) {
        return NextResponse.json({ error: "Pegawai tidak boleh menjadi parent dirinya sendiri" }, { status: 400 });
      }
      // ensure parent exists and same sekolah
      const parent = await db.pegawai.findUnique({ where: { id: pid }, select: { sekolahId: true } });
      if (!parent) return NextResponse.json({ error: "Parent tidak ditemukan" }, { status: 400 });
      if (sekolahId && parent.sekolahId !== sekolahId) return NextResponse.json({ error: "Parent beda sekolah" }, { status: 400 });
      if (await wouldCreateCycle(pegawaiId, pid)) {
        return NextResponse.json({ error: "Parent ini akan membentuk siklus hierarki" }, { status: 400 });
      }
    }

    const data = await db.pegawai.update({
      where: { id: pegawaiId },
      data: {
        nip: nip ?? null,
        nama: nama ? String(nama).trim() : undefined,
        gender: gender ?? null,
        tempatLahir: tempatLahir ?? null,
        tanggalLahir: tanggalLahir ? new Date(tanggalLahir) : tanggalLahir === "" ? null : undefined,
        alamat: alamat ?? null,
        telepon: telepon ?? null,
        email: email ?? null,
        jabatan: jabatan ?? null,
        bidangStudi: bidangStudi ?? null,
        fotoUrl: fotoUrl ?? null,
        status: status ?? undefined,
        orgLevel: orgLevel != null ? Number(orgLevel) : undefined,
        orgOrder: orgOrder != null ? Number(orgOrder) : undefined,
        parentId: parentId === "" || parentId == null ? null : Number(parentId),
      },
      include: { parent: { select: { id: true, nama: true } }, _count: { select: { children: true } } },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("PUT pegawai/[id] error:", e);
    return NextResponse.json({ error: "Gagal mengupdate pegawai" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const pegawaiId = Number(id);
    const owned = await checkOwnership(pegawaiId, sekolahId);
    if (!owned) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });

    const childCount = await db.pegawai.count({ where: { parentId: pegawaiId } });
    if (childCount > 0) {
      return NextResponse.json({ error: "Tidak dapat menghapus pegawai yang masih memiliki bawahan. Hapus/reassign bawahan terlebih dahulu." }, { status: 400 });
    }

    await db.pegawai.delete({ where: { id: pegawaiId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE pegawai/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus pegawai" }, { status: 500 });
  }
}
