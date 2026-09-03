import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Single school record (use first or return null)
    let school = await db.school.findFirst();
    return NextResponse.json(school);
  } catch (e) {
    console.error("GET school error:", e);
    return NextResponse.json({ error: "Gagal memuat data sekolah" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      address,
      logoUrl,
      principalName,
      principalNip,
      phone,
      email,
      website,
      description,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama sekolah wajib diisi" }, { status: 400 });
    }

    // Upsert: if exists update, else create
    let school = await db.school.findFirst();
    if (school) {
      school = await db.school.update({
        where: { id: school.id },
        data: {
          name: name.trim(),
          address: address || null,
          logoUrl: logoUrl || null,
          principalName: principalName || null,
          principalNip: principalNip || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          description: description || null,
        },
      });
    } else {
      school = await db.school.create({
        data: {
          name: name.trim(),
          address: address || null,
          logoUrl: logoUrl || null,
          principalName: principalName || null,
          principalNip: principalNip || null,
          phone: phone || null,
          email: email || null,
          website: website || null,
          description: description || null,
        },
      });
    }

    return NextResponse.json(school);
  } catch (e) {
    console.error("POST school error:", e);
    return NextResponse.json({ error: "Gagal menyimpan data sekolah" }, { status: 500 });
  }
}
