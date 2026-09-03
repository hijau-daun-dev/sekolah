import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { userSchema } from "@/lib/schemas";

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
    // Zod validation (PRD §3)
    const parsed = userSchema.safeParse({
      email: body.email,
      password: body.password,
      name: body.name,
      roleId: body.roleId != null ? Number(body.roleId) : undefined,
      sekolahId: body.sekolahId != null ? Number(body.sekolahId) : null,
      pegawaiId: body.pegawaiId != null ? Number(body.pegawaiId) : null,
      ortuId: body.ortuId != null ? Number(body.ortuId) : null,
      siswaId: body.siswaId != null ? Number(body.siswaId) : null,
      isActive: body.isActive,
    });
    if (!parsed.success) {
      return NextResponse.json({
        error: "Validasi gagal",
        details: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      }, { status: 400 });
    }
    const { email, password, name, roleId, sekolahId, pegawaiId, ortuId, siswaId, isActive } = parsed.data;

    // POST requires password (schema marks it optional to allow PUT to omit it)
    if (!password) {
      return NextResponse.json({ error: "password wajib diisi" }, { status: 400 });
    }

    // Check email uniqueness
    const existingEmail = await db.user.findUnique({ where: { email: String(email).toLowerCase() } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }

    // Validate role exists
    const roleRec = await db.role.findUnique({ where: { id: roleId } });
    if (!roleRec) return NextResponse.json({ error: "Role tidak ditemukan" }, { status: 400 });

    const hashed = await bcrypt.hash(String(password), 10);

    const data = await db.user.create({
      data: {
        email: String(email).toLowerCase(),
        password: hashed,
        name: String(name).trim(),
        roleId,
        sekolahId: sekolahId ?? null,
        pegawaiId: pegawaiId ?? null,
        ortuId: ortuId ?? null,
        siswaId: siswaId ?? null,
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
