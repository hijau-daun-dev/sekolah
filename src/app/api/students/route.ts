import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const className = searchParams.get("className") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { nis: { contains: search } },
        { nisn: { contains: search } },
      ];
    }
    if (className) {
      where.className = className;
    }

    const students = await db.student.findMany({
      where,
      orderBy: [{ className: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(students);
  } catch (e) {
    console.error("GET students error:", e);
    return NextResponse.json({ error: "Gagal memuat data siswa" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nis, nisn, name, gender, birthPlace, birthDate, phone, email, address,
      className, major, photoUrl, guardianName, guardianPhone, guardianJob,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama siswa wajib diisi" }, { status: 400 });
    }

    const student = await db.student.create({
      data: {
        nis: nis || null,
        nisn: nisn || null,
        name: name.trim(),
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
    console.error("POST student error:", e);
    return NextResponse.json({ error: "Gagal menambah data siswa" }, { status: 500 });
  }
}
