import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const student = await db.student.findUnique({ where: { id } });
    if (!student) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    return NextResponse.json(student);
  } catch (e) {
    console.error("GET student by id error:", e);
    return NextResponse.json({ error: "Gagal memuat data siswa" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      nis, nisn, name, gender, birthPlace, birthDate, phone, email, address,
      className, major, photoUrl, guardianName, guardianPhone, guardianJob,
    } = body;

    const existing = await db.student.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });

    const student = await db.student.update({
      where: { id },
      data: {
        nis: nis || null,
        nisn: nisn || null,
        name: (name || "").trim(),
        gender: gender || null,
        birthPlace: birthPlace || null,
        birthDate: birthDate || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        className: className || null,
        major: major || null,
        photoUrl: photoUrl || null,
        guardianName: guardianName || null,
        guardianPhone: guardianPhone || null,
        guardianJob: guardianJob || null,
      },
    });

    return NextResponse.json(student);
  } catch (e) {
    console.error("PUT student error:", e);
    return NextResponse.json({ error: "Gagal memperbarui data siswa" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.student.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });

    await db.student.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE student error:", e);
    return NextResponse.json({ error: "Gagal menghapus data siswa" }, { status: 500 });
  }
}
