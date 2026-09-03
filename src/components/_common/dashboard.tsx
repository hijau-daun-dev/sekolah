"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2, Users, GraduationCap, DoorOpen, BookOpen, Wallet, FileWarning,
  Megaphone, TrendingUp, TrendingDown, UserCheck, CalendarClock,
} from "lucide-react";

interface RecentPengumuman {
  id: number;
  judul: string;
  isi: string;
  target: string;
  tanggalPosting: string;
}

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [data, setData] = useState<null | {
    sekolah: { nama: string; alamat?: string | null; logoUrl?: string | null; kepalaSekolah?: string | null } | null;
    stats: {
      siswa: number; pegawai: number; kelas: number; mapel: number;
      tagihanUnpaid: number; saldoKas: number; totalPemasukan: number; totalPengeluaran: number;
      pengumuman: number;
    };
    recentPengumuman?: RecentPengumuman[];
    user: { role: string; name: string; sekolahNama: string | null };
  }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((d) => setData(d)).finally(() => setLoading(false));
  }, []);

  const fmtIDR = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  const fmtDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return s;
    }
  };
  const role = data?.user?.role || "GURU";

  const cards: { label: string; value: string | number; sub?: string; icon: typeof Users; tab: string; color: string; show: boolean }[] = [
    { label: "Total Siswa Aktif", value: data?.stats?.siswa ?? 0, sub: "siswa", icon: GraduationCap, tab: "siswa", color: "bg-slate-100 text-slate-700", show: ["SUPER_ADMIN", "TU", "KEUANGAN"].includes(role) },
    { label: "Total Pegawai", value: data?.stats?.pegawai ?? 0, sub: "guru & staf", icon: Users, tab: "pegawai", color: "bg-slate-100 text-slate-700", show: ["SUPER_ADMIN", "TU"].includes(role) },
    { label: "Jumlah Kelas", value: data?.stats?.kelas ?? 0, sub: "kelas aktif", icon: DoorOpen, tab: "akademik", color: "bg-slate-100 text-slate-700", show: ["SUPER_ADMIN", "TU"].includes(role) },
    { label: "Mata Pelajaran", value: data?.stats?.mapel ?? 0, sub: "mapel terdaftar", icon: BookOpen, tab: "akademik", color: "bg-slate-100 text-slate-700", show: ["SUPER_ADMIN", "TU"].includes(role) },
    { label: "Tagihan Belum Lunas", value: data?.stats?.tagihanUnpaid ?? 0, sub: "tagihan", icon: FileWarning, tab: "tagihan", color: "bg-amber-100 text-amber-700", show: ["SUPER_ADMIN", "TU", "KEUANGAN"].includes(role) },
    { label: "Saldo Kas Sekolah", value: loading ? "..." : fmtIDR(data?.stats?.saldoKas ?? 0), sub: "pemasukan − pengeluaran", icon: Wallet, tab: "pengeluaran", color: (data?.stats?.saldoKas ?? 0) >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700", show: ["SUPER_ADMIN", "KEUANGAN"].includes(role) },
  ];

  const showCashFlow = (role === "SUPER_ADMIN" || role === "KEUANGAN") && !loading && data;
  const showRecentPengumuman = (role === "SISWA" || role === "ORTU" || role === "GURU") && !loading && data;
  const recentList = (data?.recentPengumuman ?? []).slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="overflow-hidden border-slate-300 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 text-white shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20">
              {data?.sekolah?.logoUrl ? (
                <img src={data.sekolah.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Building2 className="h-10 w-10" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-sm font-medium mb-1">Selamat datang, {data?.user?.name || "Pengguna"}</p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                {loading ? "Memuat..." : data?.sekolah?.nama || "Sekolah Belum Diisi"}
              </h2>
              <p className="text-slate-300/80 text-sm mt-1 line-clamp-1">
                {data?.sekolah?.alamat || "Lengkapi data sekolah pada menu Data Sekolah"}
              </p>
              {data?.sekolah?.kepalaSekolah && (
                <p className="text-slate-300/90 text-xs mt-2 inline-flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Kepala Sekolah: <span className="font-semibold">{data.sekolah.kepalaSekolah}</span>
                </p>
              )}
            </div>
            {(role === "SUPER_ADMIN" || role === "TU") && (
              <Button variant="secondary" onClick={() => onNavigate("sekolah")} className="bg-white/15 hover:bg-white/25 text-white border-white/20">
                Kelola Data Sekolah
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.filter((c) => c.show).map((c) => (
          <Card key={c.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate(c.tab)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight truncate">{c.value}</div>
              {c.sub && <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash flow card (SUPER_ADMIN/KEUANGAN) */}
      {showCashFlow && data && (
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pemasukan</CardTitle>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-emerald-700">{fmtIDR(data.stats.totalPemasukan)}</div>
              <p className="text-xs text-muted-foreground mt-1">dari pembayaran SPP/dll</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pengeluaran</CardTitle>
              <TrendingDown className="h-5 w-5 text-rose-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-rose-700">{fmtIDR(data.stats.totalPengeluaran)}</div>
              <p className="text-xs text-muted-foreground mt-1">kas keluar + nota</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pengumuman Aktif</CardTitle>
              <Megaphone className="h-5 w-5 text-slate-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{data.stats.pengumuman}</div>
              <p className="text-xs text-muted-foreground mt-1">pengumuman terposting</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Pengumuman for SISWA/ORTU/GURU (PRD Alur 6) */}
      {showRecentPengumuman && (
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2 text-slate-800">
                <Megaphone className="h-4 w-4 text-slate-600" />
                Pengumuman Terbaru
              </CardTitle>
              <CardDescription className="text-xs">
                Pengumuman terbaru yang ditujukan untuk Anda
              </CardDescription>
            </div>
            <Badge label={`${data?.stats?.pengumuman ?? 0} total`} />
          </CardHeader>
          <CardContent className="space-y-3">
            {recentList.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                <Megaphone className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                Belum ada pengumuman untuk Anda.
              </div>
            ) : (
              recentList.map((p) => (
                <div
                  key={p.id}
                  className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm text-slate-800 line-clamp-1">{p.judul}</h4>
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          <span className="font-medium">{p.target}</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">{p.isi}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 whitespace-nowrap">
                      <CalendarClock className="h-3 w-3" />
                      {fmtDate(p.tanggalPosting)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600">
      {label}
    </span>
  );
}
