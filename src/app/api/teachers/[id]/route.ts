import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const teacher = await db.teacher.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!teacher) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 });
    return NextResponse.json(teacher);
  } catch (e) {
    console.error("GET teacher by id error:", e);
    return NextResponse.json({ error: "Gagal memuat data guru" }, { status: 500 });
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
      nip, name, gender, birthPlace, birthDate, phone, email, address,
      subject, position, photoUrl, orgLevel, orgOrder, parentId,
    } = body;

    const existing = await db.teacher.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 });

    // Prevent setting parent to self or to own descendant
    if (parentId && parentId !== "") {
      if (parentId === id) {
        return NextResponse.json({ error: "Atasan tidak boleh diri sendiri" }, { status: 400 });
      }
      // Check cycle: walk up the parent chain from parentId; if we hit `id`, it's a cycle
      let cur: string | null = parentId;
      const seen = new Set<string>();
      while (cur && !seen.has(cur)) {
        if (cur === id) {
          return NextResponse.json({ error: "Struktur organisasi melingkar tidak diperbolehkan" }, { status: 400 });
        }
        seen.add(cur);
        const node = await db.teacher.findUnique({ where: { id: cur }, select: { parentId: true } });
        cur = node?.parentId ?? null;
      }
    }

    const teacher = await db.teacher.update({
      where: { id },
      data: {
        nip: nip || null,
        name: (name || "").trim(),
        gender: gender || null,
        birthPlace: birthPlace || null,
        birthDate: birthDate || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        subject: subject || null,
        position: position || null,
        photoUrl: photoUrl || null,
        orgLevel: typeof orgLevel === "number" ? orgLevel : existing.orgLevel,
        orgOrder: typeof orgOrder === "number" ? orgOrder : existing.orgOrder,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(teacher);
  } catch (e) {
    console.error("PUT teacher error:", e);
    return NextResponse.json({ error: "Gagal memperbarui data guru" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.teacher.findUnique({ where: { id }, include: { children: true } });
    if (!existing) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 });

    if (existing.children.length > 0) {
      return NextResponse.json(
        { error: "Guru ini masih memiliki bawahan. Pindahkan/hapus bawahan terlebih dahulu." },
        { status: 400 }
      );
    }

    await db.teacher.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("DELETE teacher error:", e);
    return NextResponse.json({ error: "Gagal menghapus data guru" }, { status: 500 });
  }
}
