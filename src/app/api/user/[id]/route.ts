import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role as string;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya SUPER_ADMIN yang dapat mengedit user" }, { status: 403 });
    }

    const { id } = await params;
    const targetId = Number(id);
    const existing = await db.user.findUnique({ where: { id: targetId } });
    if (!existing) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    const body = await req.json();
    const { email, password, name, roleId, sekolahId, pegawaiId, ortuId, siswaId, isActive } = body;

    // If changing email, check uniqueness
    if (email && email.toLowerCase() !== existing.email) {
      const conflict = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
      if (conflict) return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (email != null) data.email = String(email).toLowerCase();
    if (name != null) data.name = String(name).trim();
    if (roleId != null) data.roleId = Number(roleId);
    if (sekolahId !== undefined) data.sekolahId = sekolahId ? Number(sekolahId) : null;
    if (pegawaiId !== undefined) data.pegawaiId = pegawaiId ? Number(pegawaiId) : null;
    if (ortuId !== undefined) data.ortuId = ortuId ? Number(ortuId) : null;
    if (siswaId !== undefined) data.siswaId = siswaId ? Number(siswaId) : null;
    if (isActive != null) data.isActive = !!isActive;
    if (password && String(password).trim()) {
      data.password = await bcrypt.hash(String(password), 10);
    }

    const updated = await db.user.update({
      where: { id: targetId },
      data,
      include: {
        role: { select: { id: true, name: true, label: true } },
        sekolah: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("PUT user error:", e);
    return NextResponse.json({ error: "Gagal memperbarui user" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role as string;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya SUPER_ADMIN yang dapat menghapus user" }, { status: 403 });
    }

    const { id } = await params;
    const targetId = Number(id);

    // Block self-delete
    if (String(session.user.id) === String(targetId)) {
      return NextResponse.json({ error: "Tidak dapat menghapus akun sendiri" }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { id: targetId } });
    if (!existing) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });

    await db.user.delete({ where: { id: targetId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE user error:", e);
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 });
  }
}
