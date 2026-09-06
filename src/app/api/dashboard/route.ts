import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/session";

/**
 * Resolve which `target` values the current user role is allowed to see.
 * Same logic as /api/pengumuman GET.
 */
function allowedTargetsForRole(role: string): string[] | null {
  switch (role) {
    case "SUPER_ADMIN":
    case "TU":
    case "KEUANGAN":
      return null; // no filter
    case "GURU":
      return ["Semua", "Guru"];
    case "SISWA":
      return ["Semua", "Siswa"];
    case "ORTU":
      return ["Semua", "Ortu"];
    default:
      return ["Semua"];
  }
}

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

    // Pengumuman filter: sekolah + role-target
    const pengumumanWhere: Record<string, unknown> = { ...sekolahWhere };
    const allowedTargets = allowedTargetsForRole(session.user.role);
    if (allowedTargets) pengumumanWhere.target = { in: allowedTargets };

    const [sekolahs, siswaCount, pegawaiCount, kelasCount, mapelCount, tagihanUnpaid, pengeluaranSum, pembayaranSum, pengumumanCount, recentPengumuman] = await Promise.all([
      sekolahId ? db.sekolah.findUnique({ where: { id: sekolahId } }) : db.sekolah.findFirst(),
      db.siswa.count({ where: { ...sekolahWhere, status: "Aktif" } }),
      db.pegawai.count({ where: sekolahWhere }),
      db.kelas.count({ where: sekolahWhere }),
      db.mapel.count({ where: sekolahWhere }),
      db.tagihanSiswa.count({ where: tagihanWhere }),
      db.pengeluaran.aggregate({ where: pengeluaranWhere, _sum: { nominal: true } }),
      db.pembayaran.aggregate({ where: pembayaranWhere, _sum: { jumlahBayar: true } }),
      db.pengumuman.count({ where: pengumumanWhere }),
      // Top 5 most recent pengumuman (filtered by target × role)
      db.pengumuman.findMany({
        where: pengumumanWhere,
        select: {
          id: true,
          judul: true,
          isi: true,
          target: true,
          tanggalPosting: true,
        },
        orderBy: { tanggalPosting: "desc" },
        take: 5,
      }),
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
      recentPengumuman,
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
