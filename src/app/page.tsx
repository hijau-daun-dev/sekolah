"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  School as SchoolIcon,
  Users,
  GraduationCap,
  Network,
  DoorOpen,
  BookOpen,
  GraduationCap as Cap,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Dashboard } from "@/components/school/dashboard";
import { SchoolForm } from "@/components/school/school-form";
import { TeachersSection } from "@/components/school/teachers-section";
import { StudentsSection } from "@/components/school/students-section";
import { OrgStructure } from "@/components/school/org-structure";
import { ClassroomsSection } from "@/components/school/classrooms-section";
import { SubjectsSection } from "@/components/school/subjects-section";

type Tab = "dashboard" | "school" | "teachers" | "students" | "classrooms" | "subjects" | "structure";

const navItems: { id: Tab; label: string; desc: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", desc: "Ringkasan & statistik", icon: LayoutDashboard },
  { id: "school", label: "Data Sekolah", desc: "Identitas & logo sekolah", icon: SchoolIcon },
  { id: "teachers", label: "Data Guru", desc: "Kelola data guru", icon: Users },
  { id: "students", label: "Data Siswa", desc: "Kelola data siswa", icon: GraduationCap },
  { id: "classrooms", label: "Data Kelas", desc: "Daftar kelas & wali kelas", icon: DoorOpen },
  { id: "subjects", label: "Data Mata Pelajaran", desc: "Daftar mapel & kode", icon: BookOpen },
  { id: "structure", label: "Struktur Organisasi", desc: "Hierarki sekolah", icon: Network },
];

const titleMap: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: { title: "Dashboard", subtitle: "Ringkasan data sekolah, guru, dan siswa" },
  school: { title: "Data Sekolah", subtitle: "Kelola identitas, logo, dan kepala sekolah" },
  teachers: { title: "Data Guru", subtitle: "Kelola data guru beserta foto dan posisi organisasi" },
  students: { title: "Data Siswa", subtitle: "Kelola data siswa beserta foto dan wali" },
  classrooms: { title: "Data Kelas", subtitle: "Kelola daftar kelas, wali kelas, dan kapasitas" },
  subjects: { title: "Data Mata Pelajaran", subtitle: "Kelola daftar mapel, kode, kategori, dan jam pelajaran" },
  structure: { title: "Struktur Organisasi", subtitle: "Hierarki fleksibel dari kepala sekolah" },
};

export default function Home() {
  const [active, setActive] = useState<Tab>("dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNavigate = (tab: string) => {
    setActive(tab as Tab);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar (mobile) */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-border bg-sidebar">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Cap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">SIMSEKOLAH</span>
        </div>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="h-9 w-9 rounded-md flex items-center justify-center hover:bg-accent"
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
          {/* Brand */}
          <div className="h-16 px-5 flex items-center gap-3 border-b border-sidebar-border">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center shadow-sm">
              <Cap className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-base leading-tight text-sidebar-foreground">SIMSEKOLAH</p>
              <p className="text-[11px] text-muted-foreground leading-tight">Sistem Manajemen Sekolah</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Menu Utama
            </p>
            {navItems.map((item) => {
              const isActive = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "hover:bg-sidebar-accent text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 mt-0.5 flex-shrink-0",
                      isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium leading-tight", isActive ? "text-sidebar-primary-foreground" : "")}>
                      {item.label}
                    </p>
                    <p className={cn(
                      "text-[11px] leading-tight mt-0.5 truncate",
                      isActive ? "text-sidebar-primary-foreground/80" : "text-muted-foreground"
                    )}>
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="rounded-lg bg-sidebar-accent/60 p-3 text-xs text-sidebar-accent-foreground">
              <p className="font-medium mb-0.5">Tip</p>
              <p className="text-muted-foreground leading-relaxed">
                Mulai dari <strong>Data Sekolah</strong> untuk mengisi identitas &amp; kepala sekolah,
                lalu tambahkan guru dan siswa.
              </p>
            </div>
          </div>
        </aside>

        {/* Overlay (mobile) */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="hidden lg:flex h-16 items-center justify-between px-8 border-b border-border bg-background sticky top-0 z-20">
            <div>
              <h1 className="text-lg font-bold tracking-tight">{titleMap[active].title}</h1>
              <p className="text-xs text-muted-foreground">{titleMap[active].subtitle}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="hidden md:inline">Sistem Manajemen Sekolah</span>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                A
              </div>
            </div>
          </header>

          {/* Mobile header (title only) */}
          <div className="lg:hidden px-4 pt-4">
            <h1 className="text-xl font-bold tracking-tight">{titleMap[active].title}</h1>
            <p className="text-xs text-muted-foreground">{titleMap[active].subtitle}</p>
          </div>

          <div className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
            {active === "dashboard" && <Dashboard onNavigate={handleNavigate} />}
            {active === "school" && <SchoolForm />}
            {active === "teachers" && <TeachersSection />}
            {active === "students" && <StudentsSection />}
            {active === "classrooms" && <ClassroomsSection />}
            {active === "subjects" && <SubjectsSection />}
            {active === "structure" && <OrgStructure />}
          </div>

          <footer className="mt-auto border-t border-border py-4 px-4 lg:px-8 text-xs text-muted-foreground text-center">
            SIMSEKOLAH &middot; Sistem Manajemen Sekolah &middot; {new Date().getFullYear()}
          </footer>
        </main>
      </div>
    </div>
  );
}
