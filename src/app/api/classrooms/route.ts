import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { grade: { contains: search } },
        { major: { contains: search } },
        { room: { contains: search } },
      ];
    }

    const classes = await db.classRoom.findMany({
      where,
      include: {
        _count: { select: { students: true } },
        homeroomTeacher: { select: { id: true, name: true, position: true } },
      },
      orderBy: [{ grade: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(classes);
  } catch (e) {
    console.error("GET classrooms error:", e);
    return NextResponse.json({ error: "Gagal memuat data kelas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, grade, major, homeroomTeacherId, room, capacity, academicYear, description,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama kelas wajib diisi" }, { status: 400 });
    }

    if (homeroomTeacherId) {
      const t = await db.teacher.findUnique({ where: { id: homeroomTeacherId } });
      if (!t) return NextResponse.json({ error: "Wali kelas tidak ditemukan" }, { status: 400 });
    }

    const cls = await db.classRoom.create({
      data: {
        name: name.trim(),
        grade: grade || null,
        major: major || null,
        homeroomTeacherId: homeroomTeacherId || null,
        room: room || null,
        capacity: typeof capacity === "number" ? capacity : null,
        academicYear: academicYear || null,
        description: description || null,
      },
      include: {
        _count: { select: { students: true } },
        homeroomTeacher: { select: { id: true, name: true, position: true } },
      },
    });

    return NextResponse.json(cls);
  } catch (e) {
    console.error("POST classroom error:", e);
    return NextResponse.json({ error: "Gagal menambah data kelas" }, { status: 500 });
  }
}
