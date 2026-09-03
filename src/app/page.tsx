"use client";

import { useSession } from "next-auth/react";
import { useState, useMemo, useEffect } from "react";
import {
  LayoutDashboard, Building2, Users, GraduationCap, DoorOpen, BookOpen,
  CalendarDays, ClipboardCheck, FileBarChart, Wallet, PackageOpen,
  Megaphone, Image as ImageIcon, Network, Settings, LogOut, Menu, X,
  ChevronDown, User as UserIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dashboard } from "@/components/_common/dashboard";
import { SekolahSection } from "@/components/_common/sekolah-section";
import { SiswaSection } from "@/components/_common/siswa-section";
import { PegawaiSection } from "@/components/_common/pegawai-section";
import { OrtuSection } from "@/components/_common/ortu-section";
import { AkademikSection } from "@/components/_common/akademik-section";
import { SaranaSection } from "@/components/_common/sarana-section";
import { KeuanganMasterSection } from "@/components/_common/keuangan-master-section";
import { TagihanSection } from "@/components/_common/tagihan-section";
import { PembayaranSection } from "@/components/_common/pembayaran-section";
import { PengeluaranSection } from "@/components/_common/pengeluaran-section";
import { JadwalSection } from "@/components/_common/jadwal-section";
import { AbsensiSiswaSection } from "@/components/_common/absensi-siswa-section";
import { PenilaianSection } from "@/components/_common/penilaian-section";
import { AbsensiPegawaiSection } from "@/components/_common/absensi-pegawai-section";
import { PeminjamanSection } from "@/components/_common/peminjaman-section";
import { PengumumanSection } from "@/components/_common/pengumuman-section";
import { GaleriSection } from "@/components/_common/galeri-section";
import { OrgStructureSection } from "@/components/_common/org-structure-section";
import { UserManagementSection } from "@/components/_common/user-management-section";

type Tab =
  | "dashboard" | "sekolah" | "pegawai" | "siswa" | "ortu"
  | "akademik" | "sarana" | "keuangan-master"
  | "jadwal" | "absensi-siswa" | "penilaian" | "absensi-pegawai"
  | "tagihan" | "pembayaran" | "pengeluaran"
  | "peminjaman" | "pengumuman" | "galeri"
  | "struktur" | "users";

interface NavItem {
  id: Tab;
  label: string;
  desc: string;
  icon: typeof LayoutDashboard;
  group: string;
  roles: string[]; // SUPER_ADMIN, TU, KEUANGAN, GURU, SISWA, ORTU
}

const allNav: NavItem[] = [
  { id: "dashboard", label: "Dashboard", desc: "Ringkasan & statistik", icon: LayoutDashboard, group: "Utama", roles: ["SUPER_ADMIN", "TU", "KEUANGAN", "GURU", "SISWA", "ORTU"] },

  { id: "sekolah", label: "Data Sekolah", desc: "Identitas & logo", icon: Building2, group: "Master Data", roles: ["SUPER_ADMIN", "TU"] },
  { id: "pegawai", label: "Data Pegawai", desc: "Guru & staf", icon: Users, group: "Master Data", roles: ["SUPER_ADMIN", "TU"] },
  { id: "siswa", label: "Data Siswa", desc: "Master siswa", icon: GraduationCap, group: "Master Data", roles: ["SUPER_ADMIN", "TU"] },
  { id: "ortu", label: "Data Ortu/Wali", desc: "Master ortu", icon: Users, group: "Master Data", roles: ["SUPER_ADMIN", "TU"] },
  { id: "akademik", label: "Master Akademik", desc: "TA, tingkat, kelas, mapel", icon: BookOpen, group: "Master Data", roles: ["SUPER_ADMIN", "TU"] },
  { id: "sarana", label: "Master Sarana", desc: "Ruangan & barang", icon: PackageOpen, group: "Master Data", roles: ["SUPER_ADMIN", "TU"] },
  { id: "keuangan-master", label: "Master Keuangan", desc: "Tarif & pos anggaran", icon: Wallet, group: "Master Data", roles: ["SUPER_ADMIN", "TU", "KEUANGAN"] },

  { id: "jadwal", label: "Jadwal Pelajaran", desc: "Jadwal guru-kelas", icon: CalendarDays, group: "Akademik", roles: ["SUPER_ADMIN", "TU", "GURU", "SISWA"] },
  { id: "absensi-siswa", label: "Absensi Siswa", desc: "Harian per kelas", icon: ClipboardCheck, group: "Akademik", roles: ["SUPER_ADMIN", "TU", "GURU"] },
  { id: "penilaian", label: "Penilaian", desc: "Nilai per komponen", icon: FileBarChart, group: "Akademik", roles: ["SUPER_ADMIN", "TU", "GURU", "SISWA"] },
  { id: "absensi-pegawai", label: "Absensi Pegawai", desc: "Jam masuk-pulang", icon: ClipboardCheck, group: "Akademik", roles: ["SUPER_ADMIN", "TU"] },

  { id: "tagihan", label: "Tagihan Siswa", desc: "Generate & list", icon: Wallet, group: "Keuangan", roles: ["SUPER_ADMIN", "TU", "KEUANGAN", "SISWA", "ORTU"] },
  { id: "pembayaran", label: "Pembayaran", desc: "Input + kwitansi PDF", icon: FileBarChart, group: "Keuangan", roles: ["SUPER_ADMIN", "KEUANGAN", "SISWA", "ORTU"] },
  { id: "pengeluaran", label: "Pengeluaran Kas", desc: "Kas keluar + nota", icon: Wallet, group: "Keuangan", roles: ["SUPER_ADMIN", "KEUANGAN"] },

  { id: "peminjaman", label: "Peminjaman Barang", desc: "Inventaris lab", icon: PackageOpen, group: "Sarana", roles: ["SUPER_ADMIN", "TU", "GURU"] },
  { id: "pengumuman", label: "Pengumuman", desc: "Broadcast ke ortu", icon: Megaphone, group: "Komunikasi", roles: ["SUPER_ADMIN", "TU", "GURU", "SISWA", "ORTU"] },
  { id: "galeri", label: "Galeri & Berita", desc: "Berita sekolah", icon: ImageIcon, group: "Komunikasi", roles: ["SUPER_ADMIN", "TU", "SISWA", "ORTU"] },

  { id: "struktur", label: "Struktur Organisasi", desc: "Hierarki pegawai", icon: Network, group: "Sistem", roles: ["SUPER_ADMIN", "TU", "GURU"] },
  { id: "users", label: "Manajemen User", desc: "Akun & role", icon: Settings, group: "Sistem", roles: ["SUPER_ADMIN"] },
];

const titleMap: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Ringkasan data sekolah" },
  sekolah: { title: "Data Sekolah", subtitle: "Identitas & logo sekolah" },
  pegawai: { title: "Data Pegawai", subtitle: "Guru & staf beserta struktur organisasi" },
  siswa: { title: "Data Siswa", subtitle: "Master data siswa" },
  ortu: { title: "Data Orang Tua/Wali", subtitle: "Master data orang tua & relasi ke siswa" },
  akademik: { title: "Master Akademik", subtitle: "Tahun ajaran, tingkat, kelas, mapel, komponen nilai" },
  sarana: { title: "Master Sarana", subtitle: "Ruangan, kategori barang, & inventaris" },
  "keuangan-master": { title: "Master Keuangan", subtitle: "Jenis pembayaran, tarif, & pos anggaran" },
  jadwal: { title: "Jadwal Pelajaran", subtitle: "Jadwal guru per kelas per hari" },
  "absensi-siswa": { title: "Absensi Siswa", subtitle: "Input kehadiran harian per kelas" },
  penilaian: { title: "Penilaian Siswa", subtitle: "Input nilai per komponen (UTS/UAS/Tugas/Harian)" },
  "absensi-pegawai": { title: "Absensi Pegawai", subtitle: "Catat jam masuk & pulang pegawai" },
  tagihan: { title: "Tagihan Siswa", subtitle: "Generate tagihan massal & monitoring pelunasan" },
  pembayaran: { title: "Pembayaran", subtitle: "Input pembayaran + cetak kwitansi PDF" },
  pengeluaran: { title: "Pengeluaran Kas", subtitle: "Catat kas keluar dengan upload bukti nota" },
  peminjaman: { title: "Peminjaman Barang", subtitle: "Peminjaman & pengembalian barang inventaris" },
  pengumuman: { title: "Pengumuman", subtitle: "Broadcast informasi ke warga sekolah" },
  galeri: { title: "Galeri & Berita", subtitle: "Publikasi berita & dokumentasi sekolah" },
  struktur: { title: "Struktur Organisasi", subtitle: "Hierarki pegawai dari kepala sekolah" },
  users: { title: "Manajemen User", subtitle: "Akun pengguna & role RBAC" },
};

export default function Home() {
  const { data: session, status } = useSession();
  const [active, setActive] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = session?.user?.role || "GURU";

  const navByGroup = useMemo(() => {
    const visible = allNav.filter((n) => n.roles.includes(role));
    const groups: Record<string, NavItem[]> = {};
    visible.forEach((n) => {
      if (!groups[n.group]) groups[n.group] = [];
      groups[n.group].push(n);
    });
    return groups;
  }, [role]);

  // If active tab is not allowed for current role, reset
  if (!allNav.find((n) => n.id === active && n.roles.includes(role))) {
    setActive("dashboard");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
      </div>
    );
  }

  if (!session) {
    // middleware should redirect to /login, but just in case
    return <LoginRedirector />;
  }

  const handleNavigate = (tab: string) => {
    setActive(tab as Tab);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top bar (mobile) */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-slate-200 bg-sidebar">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-sm text-sidebar-foreground">SIMSEKOLAH</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-sidebar-accent text-sidebar-foreground"
          aria-label="Menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-0 left-0 z-40 h-screen w-72 bg-sidebar border-r border-sidebar-border flex-shrink-0",
            "flex flex-col transition-transform duration-200",
            "lg:translate-x-0",
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          )}
        >
          <div className="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-sm flex-shrink-0">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base leading-tight text-sidebar-foreground">SIMSEKOLAH</p>
              <p className="text-[11px] text-sidebar-foreground/60 leading-tight truncate">
                {session.user?.sekolahNama || "Multi-Sekolah"}
              </p>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {Object.entries(navByGroup).map(([group, items]) => (
              <div key={group}>
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  {group}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const isActive = active === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavigate(item.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors group",
                          isActive
                            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                            : "hover:bg-sidebar-accent text-sidebar-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-4 w-4 flex-shrink-0",
                            isActive ? "text-sidebar-primary-foreground" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                          )}
                        />
                        <span className={cn(
                          "text-sm font-medium leading-tight",
                          isActive ? "text-sidebar-primary-foreground" : ""
                        )}>
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-sidebar-accent text-left">
                  <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-sidebar-accent-foreground text-xs font-semibold flex-shrink-0">
                    {session.user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">
                      {session.user?.name}
                    </p>
                    <p className="text-[11px] text-sidebar-foreground/60 truncate leading-tight">
                      {session.user?.role}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{session.user?.name}</span>
                    <span className="text-xs text-muted-foreground">{session.user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="h-4 w-4 mr-2" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
        )}

        <main className="flex-1 min-w-0 flex flex-col">
          <header className="hidden lg:flex h-16 items-center justify-between px-8 border-b border-slate-200 bg-white sticky top-0 z-20">
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900">{titleMap[active].title}</h1>
              <p className="text-xs text-slate-500">{titleMap[active].subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-medium">
                {role}
              </span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-xs font-semibold">
                {session.user?.name?.[0]?.toUpperCase() || "U"}
              </div>
            </div>
          </header>

          <div className="lg:hidden px-4 pt-4">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">{titleMap[active].title}</h1>
            <p className="text-xs text-slate-500">{titleMap[active].subtitle}</p>
          </div>

          <div className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
            {active === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
            {active === "sekolah" && <SekolahSection />}
            {active === "pegawai" && <PegawaiSection />}
            {active === "siswa" && <SiswaSection />}
            {active === "ortu" && <OrtuSection />}
            {active === "akademik" && <AkademikSection />}
            {active === "sarana" && <SaranaSection />}
            {active === "keuangan-master" && <KeuanganMasterSection />}
            {active === "jadwal" && <JadwalSection />}
            {active === "absensi-siswa" && <AbsensiSiswaSection />}
            {active === "penilaian" && <PenilaianSection />}
            {active === "absensi-pegawai" && <AbsensiPegawaiSection />}
            {active === "tagihan" && <TagihanSection />}
            {active === "pembayaran" && <PembayaranSection />}
            {active === "pengeluaran" && <PengeluaranSection />}
            {active === "peminjaman" && <PeminjamanSection />}
            {active === "pengumuman" && <PengumumanSection />}
            {active === "galeri" && <GaleriSection />}
            {active === "struktur" && <OrgStructureSection />}
            {active === "users" && <UserManagementSection />}
          </div>

          <footer className="mt-auto border-t border-slate-200 py-4 px-4 lg:px-8 text-xs text-slate-500 text-center">
            SIMSEKOLAH &middot; Sistem Manajemen Sekolah SD-SMP &middot; {new Date().getFullYear()}
          </footer>
        </main>
      </div>
    </div>
  );
}

function LoginRedirector() {
  useEffect(() => {
    if (typeof window !== "undefined") window.location.href = "/login";
  }, []);
  return null;
}
