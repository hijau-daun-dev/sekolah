import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }
    if (category) where.category = category;

    const subjects = await db.subject.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(subjects);
  } catch (e) {
    console.error("GET subjects error:", e);
    return NextResponse.json({ error: "Gagal memuat data mata pelajaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, name, category, durationHours, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama mata pelajaran wajib diisi" }, { status: 400 });
    }

    // Check unique code if provided
    if (code && code.trim()) {
      const exists = await db.subject.findFirst({ where: { code: code.trim() } });
      if (exists) {
        return NextResponse.json({ error: "Kode mata pelajaran sudah digunakan" }, { status: 400 });
      }
    }

    const subject = await db.subject.create({
      data: {
        code: code || null,
        name: name.trim(),
        category: category || null,
        durationHours: typeof durationHours === "number" ? durationHours : null,
        description: description || null,
      },
    });

    return NextResponse.json(subject);
  } catch (e) {
    console.error("POST subject error:", e);
    return NextResponse.json({ error: "Gagal menambah data mata pelajaran" }, { status: 500 });
  }
}
