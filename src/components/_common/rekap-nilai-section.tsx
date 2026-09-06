"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, FileText, FileSpreadsheet, ArrowLeft, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface SekolahOpt { id: number; nama: string; jenjang?: string | null }
interface KelasOpt { id: number; nama: string; tingkat?: { id: number; nama: string } | null; tahunAjaran?: { nama: string } | null }
interface SemesterOpt { id: number; nama: string; statusAktif: boolean; tahunAjaran?: { nama: string } | null; tanggalMulai?: string | null; tanggalSelesai?: string | null }
interface SiswaOpt { id: number; nama: string; nis?: string | null }

interface Komponen { id: number; nama: string; bobot: number }
interface RekapKelasSiswa {
  siswaId: number;
  nama: string;
  nis?: string | null;
  nilaiPerMapel: {
    mapelId: number;
    mapelNama: string;
    mapelKode?: string | null;
    nilaiAkhir: number | null;
    komponen: { komponenNilaiId: number; nama: string; bobot: number; nilai: number | null }[];
  }[];
  rataRata: number | null;
}
interface RekapKelasResp {
  kelas: { id: number; nama: string; tingkat?: { nama: string } | null; tahunAjaran?: { nama: string } | null };
  semesterId: number | null;
  komponenList: Komponen[];
  siswa: RekapKelasSiswa[];
}

interface RekapSiswaResp {
  siswa: { id: number; nama: string; nis?: string | null; nisn?: string | null };
  kelas: { id: number; nama: string; tingkat?: { nama: string } | null } | null;
  semesterId: number | null;
  komponenList: Komponen[];
  nilaiPerMapel: RekapKelasSiswa["nilaiPerMapel"];
  rataRata: number | null;
}

type Mode = "kelas" | "siswa";

export function RekapNilaiSection() {
  const [sekolahList, setSekolahList] = useState<SekolahOpt[]>([]);
  const [sekolahId, setSekolahId] = useState<string>("");
  const [kelasList, setKelasList] = useState<KelasOpt[]>([]);
  const [siswaList, setSiswaList] = useState<SiswaOpt[]>([]);
  const [semesterList, setSemesterList] = useState<SemesterOpt[]>([]);
  const [mode, setMode] = useState<Mode>("kelas");
  const [kelasId, setKelasId] = useState<string>("");
  const [siswaId, setSiswaId] = useState<string>("");
  const [semesterId, setSemesterId] = useState<string>("");

  const [rekapKelas, setRekapKelas] = useState<RekapKelasResp | null>(null);
  const [rekapSiswa, setRekapSiswa] = useState<RekapSiswaResp | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  // Load sekolah list
  useEffect(() => {
    fetch("/api/sekolah/list").then((r) => r.json()).then((d: SekolahOpt[]) => {
      if (Array.isArray(d)) {
        setSekolahList(d);
        if (d.length > 0) setSekolahId(String(d[0].id));
      }
    }).catch(() => {});
  }, []);

  // Load semesters + kelas + siswa based on sekolahId
  useEffect(() => {
    if (!sekolahId) return;
    const sid = Number(sekolahId);
    Promise.all([
      fetch(`/api/semester?sekolahId=${sid}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/kelas?sekolahId=${sid}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/siswa?sekolahId=${sid}`).then((r) => r.json()).catch(() => []),
    ]).then(([sem, kl, sis]: [SemesterOpt[], KelasOpt[], SiswaOpt[]]) => {
      if (Array.isArray(sem)) {
        setSemesterList(sem);
        // Auto-detect current semester by date
        const now = new Date();
        const matched = sem.find((s) => {
          if (!s.tanggalMulai || !s.tanggalSelesai) return false;
          const m = new Date(s.tanggalMulai);
          const se = new Date(s.tanggalSelesai);
          return m <= now && now <= se;
        });
        if (matched) setSemesterId(String(matched.id));
        else {
          const aktif = sem.find((s) => s.statusAktif);
          if (aktif) setSemesterId(String(aktif.id));
        }
      }
      if (Array.isArray(kl)) setKelasList(kl);
      if (Array.isArray(sis)) setSiswaList(sis);
    });
  }, [sekolahId]);

  const loadRekap = useCallback(async () => {
    if (mode === "kelas" && !kelasId) return;
    if (mode === "siswa" && !siswaId) return;
    setLoading(true);
    setRekapKelas(null);
    setRekapSiswa(null);
    try {
      const semParam = semesterId ? `&semesterId=${semesterId}` : "";
      if (mode === "kelas") {
        const r = await fetch(`/api/penilaian/rekap-kelas?kelasId=${kelasId}${semParam}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal memuat rekap kelas");
        setRekapKelas(d as RekapKelasResp);
      } else {
        const r = await fetch(`/api/penilaian/rekap-siswa?siswaId=${siswaId}${semParam}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Gagal memuat rekap siswa");
        setRekapSiswa(d as RekapSiswaResp);
      }
    } catch (e) {
      toast({ title: "Gagal memuat rekap", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [mode, kelasId, siswaId, semesterId, toast]);

  useEffect(() => {
    if ((mode === "kelas" && kelasId) || (mode === "siswa" && siswaId)) {
      loadRekap();
    }
  }, [loadRekap, mode, kelasId, siswaId, semesterId]);

  const handleExport = (format: "pdf" | "csv") => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (mode === "kelas" && kelasId) params.set("kelasId", kelasId);
    else if (mode === "siswa" && siswaId) params.set("siswaId", siswaId);
    if (semesterId) params.set("semesterId", semesterId);
    window.open(`/api/penilaian/export?${params.toString()}`, "_blank");
  };

  const filteredSiswa = useMemo(() => {
    if (!rekapKelas) return [];
    if (!search) return rekapKelas.siswa;
    const q = search.toLowerCase();
    return rekapKelas.siswa.filter((s) => s.nama.toLowerCase().includes(q) || (s.nis || "").toLowerCase().includes(q));
  }, [rekapKelas, search]);

  const mapelColumns = useMemo(() => {
    if (mode === "kelas" && rekapKelas) {
      const set: { mapelId: number; mapelNama: string }[] = [];
      rekapKelas.siswa.forEach((s) => s.nilaiPerMapel.forEach((m) => {
        if (!set.some((x) => x.mapelId === m.mapelId)) set.push({ mapelId: m.mapelId, mapelNama: m.mapelNama });
      }));
      return set;
    }
    if (mode === "siswa" && rekapSiswa) {
      return rekapSiswa.nilaiPerMapel.map((m) => ({ mapelId: m.mapelId, mapelNama: m.mapelNama }));
    }
    return [];
  }, [mode, rekapKelas, rekapSiswa]);

  const handleClickSiswa = (sid: number) => {
    setSiswaId(String(sid));
    setMode("siswa");
  };

  const handleBackToKelas = () => {
    setMode("kelas");
    setSiswaId("");
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Rekap Nilai
            </h3>
            <p className="text-xs text-slate-500">Rekap nilai per kelas atau per siswa (per semester)</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handleExport("csv")} disabled={!((mode === "kelas" && kelasId) || (mode === "siswa" && siswaId))}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel/CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport("pdf")} disabled={!((mode === "kelas" && kelasId) || (mode === "siswa" && siswaId))}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {sekolahList.length > 1 && (
            <div>
              <Label className="text-xs">Sekolah</Label>
              <Select value={sekolahId} onValueChange={setSekolahId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih sekolah" /></SelectTrigger>
                <SelectContent>
                  {sekolahList.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kelas">Per Kelas</SelectItem>
                <SelectItem value="siswa">Per Siswa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {mode === "kelas" ? (
            <div>
              <Label className="text-xs">Kelas</Label>
              <Select value={kelasId} onValueChange={setKelasId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasList.length === 0 ? (
                    <SelectItem value="_none" disabled>Belum ada kelas</SelectItem>
                  ) : kelasList.map((k) => (
                    <SelectItem key={k.id} value={String(k.id)}>
                      {k.tingkat?.nama || ""} {k.nama} {k.tahunAjaran ? `· ${k.tahunAjaran.nama}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-xs">Siswa</Label>
              <Select value={siswaId} onValueChange={setSiswaId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                <SelectContent>
                  {siswaList.length === 0 ? (
                    <SelectItem value="_none" disabled>Belum ada siswa</SelectItem>
                  ) : siswaList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nama} {s.nis ? `(${s.nis})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Semester</Label>
            <Select value={semesterId} onValueChange={setSemesterId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Semua semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Semester</SelectItem>
                {semesterList.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.tahunAjaran?.nama ? `${s.tahunAjaran.nama} - ` : ""}{s.nama}{s.statusAktif ? " (Aktif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-slate-500" /></div>
        ) : mode === "kelas" ? (
          <RekapKelasTable
            rekap={rekapKelas}
            filteredSiswa={filteredSiswa}
            mapelColumns={mapelColumns}
            search={search}
            setSearch={setSearch}
            onClickSiswa={handleClickSiswa}
          />
        ) : (
          <RekapSiswaDetail rekap={rekapSiswa} onBack={handleBackToKelas} />
        )}
      </CardContent>
    </Card>
  );
}

function RekapKelasTable({
  rekap, filteredSiswa, mapelColumns, search, setSearch, onClickSiswa,
}: {
  rekap: RekapKelasResp | null;
  filteredSiswa: RekapKelasSiswa[];
  mapelColumns: { mapelId: number; mapelNama: string }[];
  search: string;
  setSearch: (v: string) => void;
  onClickSiswa: (sid: number) => void;
}) {
  if (!rekap) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Pilih kelas & semester untuk menampilkan rekap nilai.</p>
      </div>
    );
  }
  if (rekap.siswa.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Belum ada siswa di kelas ini.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="text-xs text-slate-600">
          <span className="font-medium text-slate-800">{rekap.kelas?.nama}</span>
          {rekap.kelas?.tingkat?.nama && <span className="ml-2">Tingkat {rekap.kelas.tingkat.nama}</span>}
          {rekap.kelas?.tahunAjaran?.nama && <span className="ml-2">· {rekap.kelas.tahunAjaran.nama}</span>}
        </div>
        <div className="relative w-full sm:w-64">
          <Input placeholder="Cari siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-8 text-xs" />
        </div>
      </div>
      <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600 sticky top-0 z-10">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-10">No</th>
              <th className="text-left px-3 py-2 font-medium min-w-[180px]">Nama</th>
              <th className="text-left px-3 py-2 font-medium w-24">NIS</th>
              {mapelColumns.map((m) => (
                <th key={m.mapelId} className="text-center px-3 py-2 font-medium w-20" title={m.mapelNama}>
                  <div className="truncate max-w-[80px]">{m.mapelNama}</div>
                </th>
              ))}
              <th className="text-center px-3 py-2 font-medium w-24">Rata-rata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSiswa.map((s, idx) => (
              <tr key={s.siswaId} className="hover:bg-slate-50/60">
                <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => onClickSiswa(s.siswaId)}
                    className="font-medium text-slate-800 hover:text-slate-600 hover:underline text-left"
                    title="Klik untuk lihat detail per siswa"
                  >
                    {s.nama}
                  </button>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{s.nis || "-"}</td>
                {mapelColumns.map((m) => {
                  const v = s.nilaiPerMapel.find((x) => x.mapelId === m.mapelId);
                  return (
                    <td key={m.mapelId} className="text-center px-3 py-2">
                      {v?.nilaiAkhir != null ? (
                        <Badge variant="outline" className={nilaiBadgeClass(v.nilaiAkhir)}>{v.nilaiAkhir.toFixed(1)}</Badge>
                      ) : <span className="text-slate-300">-</span>}
                    </td>
                  );
                })}
                <td className="text-center px-3 py-2 font-semibold text-slate-700">
                  {s.rataRata != null ? s.rataRata.toFixed(1) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">Klik nama siswa untuk melihat detail per komponen nilai.</p>
    </div>
  );
}

function RekapSiswaDetail({ rekap, onBack }: { rekap: RekapSiswaResp | null; onBack: () => void }) {
  if (!rekap) {
    return (
      <div className="text-center py-12 text-slate-500">
        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Pilih siswa & semester untuk menampilkan rekap nilai.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Kembali ke Rekap Kelas
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="border border-slate-200 rounded-md p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Nama Siswa</p>
          <p className="text-sm font-semibold text-slate-800">{rekap.siswa.nama}</p>
          <p className="text-xs text-slate-500">{rekap.siswa.nis ? `NIS: ${rekap.siswa.nis}` : ""}{rekap.siswa.nisn ? ` · NISN: ${rekap.siswa.nisn}` : ""}</p>
        </div>
        <div className="border border-slate-200 rounded-md p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Kelas</p>
          <p className="text-sm font-semibold text-slate-800">
            {rekap.kelas ? `${rekap.kelas.tingkat?.nama || ""} ${rekap.kelas.nama}`.trim() : "-"}
          </p>
        </div>
        <div className="border border-slate-200 rounded-md p-3">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Rata-rata</p>
          <p className="text-xl font-bold text-slate-800">
            {rekap.rataRata != null ? rekap.rataRata.toFixed(1) : "-"}
          </p>
        </div>
      </div>

      {rekap.nilaiPerMapel.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Belum ada nilai untuk siswa ini.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rekap.nilaiPerMapel.map((m) => {
            const totalBobot = m.komponen.reduce((s, c) => s + (c.nilai != null ? c.bobot : 0), 0);
            return (
              <div key={m.mapelId} className="border border-slate-200 rounded-md p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{m.mapelNama}</p>
                    {m.mapelKode && <span className="text-[10px] text-slate-500">[{m.mapelKode}]</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500">Nilai Akhir</span>
                    <p className="text-lg font-bold text-slate-800">
                      {m.nilaiAkhir != null ? m.nilaiAkhir.toFixed(1) : "-"}
                      {totalBobot === 0 && m.nilaiAkhir == null && <span className="text-[10px] text-amber-600 ml-1">(belum dinilai)</span>}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {m.komponen.map((c) => (
                    <div key={c.komponenNilaiId} className="bg-slate-50 rounded p-2 border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-700">{c.nama}</span>
                        <Badge variant="outline" className="text-[10px]">{c.bobot}%</Badge>
                      </div>
                      <div className="mt-1 text-lg font-semibold text-slate-800">
                        {c.nilai != null ? c.nilai.toFixed(1) : <span className="text-slate-300 text-sm">Belum dinilai</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function nilaiBadgeClass(n: number): string {
  if (n >= 90) return "bg-emerald-100 text-emerald-700";
  if (n >= 75) return "bg-slate-100 text-slate-700";
  if (n >= 60) return "bg-amber-100 text-amber-700";
  return "bg-rose-100 text-rose-700";
}

export default RekapNilaiSection;
