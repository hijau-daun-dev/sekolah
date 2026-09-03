import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const subject = await db.subject.findUnique({ where: { id } });
    if (!subject) return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });
    return NextResponse.json(subject);
  } catch (e) {
    console.error("GET subject by id error:", e);
    return NextResponse.json({ error: "Gagal memuat data mata pelajaran" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { code, name, category, durationHours, description } = body;

    const existing = await db.subject.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });

    // Check unique code if changed
    if (code && code.trim() && code !== existing.code) {
      const dup = await db.subject.findFirst({ where: { code: code.trim(), NOT: { id } } });
      if (dup) {
        return NextResponse.json({ error: "Kode mata pelajaran sudah digunakan" }, { status: 400 });
      }
    }

    const subject = await db.subject.update({
      where: { id },
      data: {
        code: code || null,
        name: (name || "").trim(),
        category: category || null,
        durationHours: typeof durationHours === "number" ? durationHours : null,
        description: description || null,
      },
    });

    return NextResponse.json(subject);
  } catch (e) {
    console.error("PUT subject error:", e);
    return NextResponse.json({ error: "Gagal memperbarui data mata pelajaran" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.subject.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Mata pelajaran tidak ditemukan" }, { status: 404 });

    await db.subject.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE subject error:", e);
    return NextResponse.json({ error: "Gagal menghapus data mata pelajaran" }, { status: 500 });
  }
}
