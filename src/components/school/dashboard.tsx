"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardDescription } from "@/components/ui/card";
import { School as SchoolIcon, Users, GraduationCap, Network, UserCheck, BookOpen, DoorOpen, Library } from "lucide-react";
import type { School, Teacher, Student, ClassRoom, Subject } from "@/lib/types";

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [school, setSchool] = useState<School | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<ClassRoom[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, t, st, c, sub] = await Promise.all([
          fetch("/api/school").then((r) => r.json()),
          fetch("/api/teachers").then((r) => r.json()),
          fetch("/api/students").then((r) => r.json()),
          fetch("/api/classrooms").then((r) => r.json()),
          fetch("/api/subjects").then((r) => r.json()),
        ]);
        setSchool(s || null);
        setTeachers(Array.isArray(t) ? t : []);
        setStudents(Array.isArray(st) ? st : []);
        setClassrooms(Array.isArray(c) ? c : []);
        setSubjects(Array.isArray(sub) ? sub : []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const maleStudents = students.filter((s) => s.gender === "L").length;
  const femaleStudents = students.filter((s) => s.gender === "P").length;
  const teacherMale = teachers.filter((t) => t.gender === "L").length;
  const teacherFemale = teachers.filter((t) => t.gender === "P").length;
  const totalCapacity = classrooms.reduce((sum, c) => sum + (c.capacity || 0), 0);
  const totalEnrolled = classrooms.reduce((sum, c) => sum + (c._count?.students || 0), 0);
  const totalJP = subjects.reduce((sum, s) => sum + (s.durationHours || 0), 0);

  const stats = [
    {
      label: "Total Guru",
      value: teachers.length,
      sub: `${teacherMale} L / ${teacherFemale} P`,
      icon: Users,
      tab: "teachers",
      color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    {
      label: "Total Siswa",
      value: students.length,
      sub: `${maleStudents} L / ${femaleStudents} P`,
      icon: GraduationCap,
      tab: "students",
      color: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
    },
    {
      label: "Jumlah Kelas",
      value: classrooms.length,
      sub: totalCapacity ? `${totalEnrolled}/${totalCapacity} terisi` : "Kelas terdaftar",
      icon: DoorOpen,
      tab: "classrooms",
      color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    },
    {
      label: "Mata Pelajaran",
      value: subjects.length,
      sub: totalJP ? `${totalJP} JP/minggu` : "Mapel terdaftar",
      icon: BookOpen,
      tab: "subjects",
      color: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
    {
      label: "Struktur Organisasi",
      value: teachers.filter((t) => !t.parentId).length,
      sub: "Titik puncak",
      icon: Network,
      tab: "structure",
      color: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
    },
    {
      label: "Kapasitas Total",
      value: totalCapacity || "—",
      sub: totalCapacity ? `${totalEnrolled} siswa aktif` : "Belum diatur",
      icon: Library,
      tab: "classrooms",
      color: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Hero banner */}
      <Card className="overflow-hidden border-none bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white shadow-lg">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20">
              {school?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={school.logoUrl}
                  alt="Logo Sekolah"
                  className="h-full w-full object-cover"
                />
              ) : (
                <SchoolIcon className="h-10 w-10" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-emerald-100 text-sm font-medium mb-1">
                Selamat datang di Sistem Manajemen Sekolah
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
                {loading ? "Memuat..." : school?.name || "Nama Sekolah Belum Diisi"}
              </h2>
              <p className="text-emerald-100/80 text-sm mt-1 line-clamp-1">
                {school?.address || "Lengkapi data sekolah pada menu Data Sekolah"}
              </p>
              {school?.principalName && (
                <p className="text-emerald-100/90 text-xs mt-2 inline-flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  Kepala Sekolah: <span className="font-semibold">{school.principalName}</span>
                </p>
              )}
            </div>
            <button
              onClick={() => onNavigate("school")}
              className="rounded-lg bg-white/15 hover:bg-white/25 px-4 py-2 text-sm font-medium transition-colors border border-white/20"
            >
              Kelola Data Sekolah
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Card
            key={s.label}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate(s.tab)}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight">
                {loading ? "—" : s.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Akses Cepat</CardTitle>
            <CardDescription>Pintasan ke modul utama</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            {[
              { label: "Data Sekolah", tab: "school", icon: SchoolIcon },
              { label: "Data Guru", tab: "teachers", icon: Users },
              { label: "Data Siswa", tab: "students", icon: GraduationCap },
              { label: "Data Kelas", tab: "classrooms", icon: DoorOpen },
              { label: "Data Mapel", tab: "subjects", icon: BookOpen },
              { label: "Struktur Organisasi", tab: "structure", icon: Network },
            ].map((q) => (
              <button
                key={q.tab}
                onClick={() => onNavigate(q.tab)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-left"
              >
                <q.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{q.label}</span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Sekolah</CardTitle>
            <CardDescription>Informasi umum sekolah</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Nama Sekolah</span>
              <span className="font-medium text-right truncate">
                {school?.name || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Kepala Sekolah</span>
              <span className="font-medium text-right truncate">
                {school?.principalName || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Telepon</span>
              <span className="font-medium text-right truncate">
                {school?.phone || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium text-right truncate">
                {school?.email || "—"}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total Guru & Siswa</span>
              <span className="font-medium">
                {teachers.length + students.length} orang
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Jumlah Kelas</span>
              <span className="font-medium">{classrooms.length} kelas</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Jumlah Mata Pelajaran</span>
              <span className="font-medium">{subjects.length} mapel</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
