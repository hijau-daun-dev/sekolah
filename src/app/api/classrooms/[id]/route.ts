import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cls = await db.classRoom.findUnique({
      where: { id },
      include: {
        _count: { select: { students: true } },
        homeroomTeacher: { select: { id: true, name: true, position: true } },
        students: { select: { id: true, name: true, nis: true, gender: true, photoUrl: true } },
      },
    });
    if (!cls) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    return NextResponse.json(cls);
  } catch (e) {
    console.error("GET classroom by id error:", e);
    return NextResponse.json({ error: "Gagal memuat data kelas" }, { status: 500 });
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
      name, grade, major, homeroomTeacherId, room, capacity, academicYear, description,
    } = body;

    const existing = await db.classRoom.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    if (homeroomTeacherId) {
      const t = await db.teacher.findUnique({ where: { id: homeroomTeacherId } });
      if (!t) return NextResponse.json({ error: "Wali kelas tidak ditemukan" }, { status: 400 });
    }

    const cls = await db.classRoom.update({
      where: { id },
      data: {
        name: (name || "").trim(),
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
    console.error("PUT classroom error:", e);
    return NextResponse.json({ error: "Gagal memperbarui data kelas" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.classRoom.findUnique({
      where: { id },
      include: { _count: { select: { students: true } } },
    });
    if (!existing) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    if (existing._count.students > 0) {
      return NextResponse.json(
        { error: `Kelas masih memiliki ${existing._count.students} siswa. Pindahkan/hapus siswa terlebih dahulu.` },
        { status: 400 }
      );
    }

    await db.classRoom.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE classroom error:", e);
    return NextResponse.json({ error: "Gagal menghapus data kelas" }, { status: 500 });
  }
}
