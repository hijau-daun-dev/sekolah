import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; siswaId: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id, siswaId } = await params;
    const ortuId = Number(id);
    const sid = Number(siswaId);

    // Verify ownership
    const ortu = await db.ortu.findUnique({ where: { id: ortuId }, select: { sekolahId: true } });
    if (!ortu) return NextResponse.json({ error: "Ortu tidak ditemukan" }, { status: 404 });
    if (sekolahId && ortu.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    await db.ortuSiswa.deleteMany({ where: { ortuId, siswaId: sid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE ortu remove-anak error:", e);
    return NextResponse.json({ error: "Gagal menghapus relasi" }, { status: 500 });
  }
}
