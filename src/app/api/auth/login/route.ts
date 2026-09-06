import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { signSessionToken, SessionUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return NextResponse.json({ error: "Email dan password wajib diisi" }, { status: 400 });

    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { role: true, sekolah: { select: { id: true, nama: true, logoUrl: true } } },
    });
    if (!user || !user.isActive) return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return NextResponse.json({ error: "Email atau password salah" }, { status: 401 });

    await db.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });

    const sessionUser: SessionUser = {
      id: String(user.id), email: user.email, name: user.name, role: user.role.name, roleId: user.roleId,
      sekolahId: user.sekolahId ? String(user.sekolahId) : null,
      sekolahNama: user.sekolah?.nama ?? null, sekolahLogo: user.sekolah?.logoUrl ?? null,
      pegawaiId: user.pegawaiId ? String(user.pegawaiId) : null,
      ortuId: user.ortuId ? String(user.ortuId) : null,
      siswaId: user.siswaId ? String(user.siswaId) : null,
    };

    const token = await signSessionToken(sessionUser);
    const res = NextResponse.json({ success: true, user: { id: sessionUser.id, email: sessionUser.email, name: sessionUser.name, role: sessionUser.role } });
    res.cookies.set("simsekolah-token", token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7, secure: false });
    return res;
  } catch (e) {
    console.error("Login error:", e);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
