import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role as string;
    if (role !== "SUPER_ADMIN") {
      // Non-super-admin only sees users of own sekolah
      const sid = Number(session.user.sekolahId);
      if (!sid) return NextResponse.json({ error: "No sekolah" }, { status: 403 });
      const data = await db.user.findMany({
        where: { sekolahId: sid },
        include: {
          role: { select: { id: true, name: true, label: true } },
          sekolah: { select: { id: true, nama: true } },
        },
        orderBy: { name: "asc" },
      });
      return NextResponse.json(data);
    }
    // Super admin sees all
    const data = await db.user.findMany({
      include: {
        role: { select: { id: true, name: true, label: true } },
        sekolah: { select: { id: true, nama: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("GET user error:", e);
    return NextResponse.json({ error: "Gagal memuat user" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const role = session.user.role as string;
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Hanya SUPER_ADMIN yang dapat menambah user" }, { status: 403 });
    }

    const body = await req.json();
    const { email, password, name, roleId, sekolahId, pegawaiId, ortuId, siswaId, isActive } = body;

    if (!email || !password || !name || !roleId) {
      return NextResponse.json({ error: "Field wajib: email, password, name, roleId" }, { status: 400 });
    }

    // Check email uniqueness
    const existingEmail = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }

    // Validate role exists
    const roleRec = await db.role.findUnique({ where: { id: Number(roleId) } });
    if (!roleRec) return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 400 });

    const hashed = await bcrypt.hash(String(password), 10);

    const data = await db.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: hashed,
        name: String(name).trim(),
        roleId: Number(roleId),
        sekolahId: sekolahId ? Number(sekolahId) : null,
        pegawaiId: pegawaiId ? Number(pegawaiId) : null,
        ortuId: ortuId ? Number(ortuId) : null,
        siswaId: siswaId ? Number(siswaId) : null,
        isActive: isActive !== false,
      },
      include: {
        role: { select: { id: true, name: true, label: true } },
        sekolah: { select: { id: true, nama: true } },
      },
    });
    return NextResponse.json(data);
  } catch (e) {
    console.error("POST user error:", e);
    return NextResponse.json({ error: "Gagal menambah user" }, { status: 500 });
  }
}
