import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    const { id } = await params;
    const gmid = Number(id);

    const rel = await db.guruMapel.findUnique({ where: { id: gmid }, include: { pegawai: { select: { sekolahId: true } } } });
    if (!rel) return NextResponse.json({ error: "Tidak ditemukan" }, { status: 404 });
    if (sekolahId && rel.pegawai.sekolahId !== sekolahId) return NextResponse.json({ error: "Akses ditolak" }, { status: 403 });

    await db.guruMapel.delete({ where: { id: gmid } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE guru-mapel/[id] error:", e);
    return NextResponse.json({ error: "Gagal menghapus" }, { status: 500 });
  }
}
