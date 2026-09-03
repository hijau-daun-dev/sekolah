import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) return NextResponse.json({ error: "No sekolah" }, { status: 403 });

    const { id } = await params;
    const existing = await db.absensiPegawai.findFirst({
      where: { id: Number(id), ...(sekolahId ? { pegawai: { sekolahId } } : {}) },
    });
    if (!existing) return NextResponse.json({ error: "Absensi tidak ditemukan" }, { status: 404 });

    await db.absensiPegawai.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE absensi-pegawai error:", e);
    return NextResponse.json({ error: "Gagal menghapus absensi" }, { status: 500 });
  }
}
