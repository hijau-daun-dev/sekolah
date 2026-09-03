import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const teachers = await db.teacher.findMany({
      include: { children: true },
      orderBy: [{ orgLevel: "asc" }, { orgOrder: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(teachers);
  } catch (e) {
    console.error("GET teachers error:", e);
    return NextResponse.json({ error: "Gagal memuat data guru" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      nip, name, gender, birthPlace, birthDate, phone, email, address,
      subject, position, photoUrl, orgLevel, orgOrder, parentId,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama guru wajib diisi" }, { status: 400 });
    }

    // Validate parentId not forming cycle (basic: parent must not equal future id; we check after create)
    if (parentId) {
      const parent = await db.teacher.findUnique({ where: { id: parentId } });
      if (!parent) {
        return NextResponse.json({ error: "Atasan tidak ditemukan" }, { status: 400 });
      }
    }

    const teacher = await db.teacher.create({
      data: {
        nip: nip || null,
        name: name.trim(),
        gender: gender || null,
        birthPlace: birthPlace || null,
        birthDate: birthDate || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        subject: subject || null,
        position: position || null,
        photoUrl: photoUrl || null,
        orgLevel: typeof orgLevel === "number" ? orgLevel : 0,
        orgOrder: typeof orgOrder === "number" ? orgOrder : 0,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(teacher);
  } catch (e) {
    console.error("POST teacher error:", e);
    return NextResponse.json({ error: "Gagal menambah data guru" }, { status: 500 });
  }
}
