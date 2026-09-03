import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sekolahId = session.user.role === "SUPER_ADMIN" ? undefined : Number(session.user.sekolahId);
    if (session.user.role !== "SUPER_ADMIN" && !sekolahId) {
      return NextResponse.json({ error: "No sekolah" }, { status: 403 });
    }

    const sekolahWhere = sekolahId ? { sekolahId } : {};
    const tagihanWhere = sekolahId
      ? { siswa: { sekolahId }, statusLunas: false }
      : { statusLunas: false };
    const pengeluaranWhere = sekolahId ? { pegawai: { sekolahId } } : {};
    const pembayaranWhere = sekolahId ? { tagihanSiswa: { siswa: { sekolahId } } } : {};

    const [sekolahs, siswaCount, pegawaiCount, kelasCount, mapelCount, tagihanUnpaid, pengeluaranSum, pembayaranSum, pengumumanCount] = await Promise.all([
      sekolahId ? db.sekolah.findUnique({ where: { id: sekolahId } }) : db.sekolah.findFirst(),
      db.siswa.count({ where: { ...sekolahWhere, status: "Aktif" } }),
      db.pegawai.count({ where: sekolahWhere }),
      db.kelas.count({ where: sekolahWhere }),
      db.mapel.count({ where: sekolahWhere }),
      db.tagihanSiswa.count({ where: tagihanWhere }),
      db.pengeluaran.aggregate({ where: pengeluaranWhere, _sum: { nominal: true } }),
      db.pembayaran.aggregate({ where: pembayaranWhere, _sum: { jumlahBayar: true } }),
      db.pengumuman.count({ where: sekolahWhere }),
    ]);

    const saldoKas = (pembayaranSum._sum.jumlahBayar || 0) - (pengeluaranSum._sum.nominal || 0);

    return NextResponse.json({
      sekolah: sekolahs,
      stats: {
        siswa: siswaCount,
        pegawai: pegawaiCount,
        kelas: kelasCount,
        mapel: mapelCount,
        tagihanUnpaid,
        saldoKas,
        totalPemasukan: pembayaranSum._sum.jumlahBayar || 0,
        totalPengeluaran: pengeluaranSum._sum.nominal || 0,
        pengumuman: pengumumanCount,
      },
      user: {
        role: session.user.role,
        name: session.user.name,
        sekolahNama: session.user.sekolahNama,
        sekolahLogo: session.user.sekolahLogo,
      },
    });
  } catch (e) {
    console.error("Dashboard error:", e);
    return NextResponse.json({ error: "Gagal memuat dashboard" }, { status: 500 });
  }
}
