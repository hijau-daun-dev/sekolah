"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, Pencil, Trash2, Loader2, SearchX, X, Download, FileText, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface KelasOpt { id: number; nama: string; tingkat?: { id: number; nama: string } | null }
interface MapelOpt { id: number; nama: string; kode?: string | null }
interface PegawaiOpt { id: number; nama: string; jabatan?: string | null }
interface TahunOpt { id: number; nama: string; statusAktif: boolean }
interface EkskulOpt { id: number; nama: string; pembina?: { id: number; nama: string } | null }
interface TingkatOpt { id: number; nama: string; jenjang?: string | null }

interface Jadwal {
  id: number;
  kelasId?: number | null;
  mapelId?: number | null;
  pegawaiId?: number | null;
  tahunAjaranId: number;
  tipeJadwal: string;
  judulKhusus?: string | null;
  ekstrakurikulerId?: number | null;
  hari: string;
  jamKe: number;
  jamMulai?: string | null;
  jamSelesai?: string | null;
  kelas?: KelasOpt | null;
  mapel?: MapelOpt | null;
  pegawai?: PegawaiOpt | null;
  tahunAjaran?: TahunOpt | null;
  ekstrakurikuler?: EkskulOpt | null;
}

const HARI_LIST = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

const TIPE_OPTS = [
  { value: "pelajaran", label: "Pelajaran" },
  { value: "ekskul", label: "Ekstrakurikuler" },
  { value: "khusus", label: "Jadwal Khusus" },
];

function tipeBadge(tipe: string) {
  if (tipe === "ekskul") return <Badge className="bg-amber-100 text-amber-700 text-[10px]">Ekskul</Badge>;
  if (tipe === "khusus") return <Badge className="bg-purple-100 text-purple-700 text-[10px]">Khusus</Badge>;
  return <Badge className="bg-slate-100 text-slate-700 text-[10px]">Pelajaran</Badge>;
}

export function JadwalSection() {
  return <JadwalTab />;
}

function JadwalTab() {
  const [list, setList] = useState<Jadwal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSekolah, setFilterSekolah] = useState<string>("all");
  const [filterTahun, setFilterTahun] = useState<string>("all");
  const [filterKelas, setFilterKelas] = useState<string>("all");
  const [filterHari, setFilterHari] = useState<string>("all");
  const [filterTipe, setFilterTipe] = useState<string>("all");
  const [sekolahOpts, setSekolahOpts] = useState<Array<{ id: number; nama: string; jenjang?: string | null }>>([]);
  const [kelasOpts, setKelasOpts] = useState<KelasOpt[]>([]);
  const [mapelOpts, setMapelOpts] = useState<MapelOpt[]>([]);
  const [pegawaiOpts, setPegawaiOpts] = useState<PegawaiOpt[]>([]);
  const [tahunOpts, setTahunOpts] = useState<TahunOpt[]>([]);
  const [ekskulOpts, setEkskulOpts] = useState<EkskulOpt[]>([]);
  const [tingkatOpts, setTingkatOpts] = useState<TingkatOpt[]>([]);
  const [userRole, setUserRole] = useState<string>("");
  const [userSekolahId, setUserSekolahId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Jadwal>>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Jadwal | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const { toast } = useToast();

  // Detect user role & sekolahId from /api/auth/me
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setUserRole(d.user.role || "");
          setUserSekolahId(d.user.sekolahId ? Number(d.user.sekolahId) : null);
          // For Super Admin: load all sekolahs for the filter
          if (d.user.role === "SUPER_ADMIN") {
            fetch("/api/sekolah?all=true")
              .then((r) => r.json())
              .then((list) => { if (Array.isArray(list)) setSekolahOpts(list); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  // Resolve effective sekolahId: for Super Admin = filterSekolah, else = userSekolahId
  const effectiveSekolahId = userRole === "SUPER_ADMIN"
    ? (filterSekolah !== "all" ? Number(filterSekolah) : null)
    : userSekolahId;

  // Reload dependent dropdowns whenever effectiveSekolahId changes
  useEffect(() => {
    if (!userRole) return; // wait until role loaded
    const sekolahQuery = effectiveSekolahId ? `?sekolahId=${effectiveSekolahId}` : "";
    Promise.all([
      fetch(`/api/kelas${sekolahQuery}`).then((r) => r.json()),
      fetch(`/api/mapel${sekolahQuery}`).then((r) => r.json()),
      fetch(`/api/pegawai${sekolahQuery}`).then((r) => r.json()),
      fetch(`/api/tahun-ajaran${sekolahQuery}`).then((r) => r.json()),
      fetch(`/api/ekstrakurikuler?statusAktif=true${effectiveSekolahId ? `&sekolahId=${effectiveSekolahId}` : ""}`).then((r) => r.json()),
      fetch(`/api/tingkat?statusAktif=true${effectiveSekolahId ? `&sekolahId=${effectiveSekolahId}` : ""}`).then((r) => r.json()),
    ]).then(([k, m, p, t, eks, tg]: [KelasOpt[], MapelOpt[], PegawaiOpt[], TahunOpt[], EkskulOpt[], TingkatOpt[]]) => {
      if (Array.isArray(k)) setKelasOpts(k);
      if (Array.isArray(m)) setMapelOpts(m);
      if (Array.isArray(p)) setPegawaiOpts(p);
      if (Array.isArray(t)) setTahunOpts(t);
      if (Array.isArray(eks)) setEkskulOpts(eks);
      if (Array.isArray(tg)) setTingkatOpts(tg);
      // Reset dependent filters
      setFilterKelas("all");
      setFilterTahun("all");
    }).catch(() => {});
  }, [userRole, effectiveSekolahId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (effectiveSekolahId) params.set("sekolahId", String(effectiveSekolahId));
      if (filterTahun !== "all") params.set("tahunAjaranId", filterTahun);
      if (filterKelas !== "all") params.set("kelasId", filterKelas);
      if (filterHari !== "all") params.set("hari", filterHari);
      if (filterTipe !== "all") params.set("tipeJadwal", filterTipe);
      const r = await fetch(`/api/jadwal?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat jadwal", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [effectiveSekolahId, filterTahun, filterKelas, filterHari, filterTipe, toast]);

  useEffect(() => { load(); }, [load]);

  // Filter mapel by tingkat (when kelas selected)
  const filteredMapelOpts = useMemo(() => {
    if (!editing.kelasId) return mapelOpts;
    const kelas = kelasOpts.find((k) => k.id === Number(editing.kelasId));
    const tingkatId = kelas?.tingkat?.id;
    if (!tingkatId) return mapelOpts;
    // We don't have tingkatMapel list preloaded; let the API verify. Just keep all mapels for selection.
    return mapelOpts;
  }, [editing.kelasId, kelasOpts, mapelOpts]);

  // Filter pegawai by mapel (when mapel selected) — best-effort; API will enforce
  const filteredPegawaiOpts = useMemo(() => pegawaiOpts, [pegawaiOpts]);

  // Group by hari for display
  const grouped = useMemo(() => {
    const g: Record<string, Jadwal[]> = {};
    HARI_LIST.forEach((h) => g[h] = []);
    list.forEach((j) => {
      if (!g[j.hari]) g[j.hari] = [];
      g[j.hari].push(j);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => a.jamKe - b.jamKe));
    return g;
  }, [list]);

  // Per kelas summary card
  const perKelasCount = useMemo(() => {
    const c: Record<number, number> = {};
    list.forEach((j) => { if (j.kelasId) c[j.kelasId] = (c[j.kelasId] || 0) + 1; });
    return c;
  }, [list]);

  const handleAdd = () => {
    const activeTahun = tahunOpts.find((t) => t.statusAktif) || tahunOpts[0];
    setEditing({
      tipeJadwal: "pelajaran",
      hari: "Senin", jamKe: 1, jamMulai: "07:00", jamSelesai: "07:40",
      tahunAjaranId: activeTahun?.id,
    });
    setDialogOpen(true);
  };
  const handleEdit = (j: Jadwal) => {
    setEditing({ ...j });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.tahunAjaranId || !editing.hari || editing.jamKe == null) {
      toast({ title: "Tahun ajaran, hari, dan jam ke wajib", variant: "destructive" });
      return;
    }
    const tipe = editing.tipeJadwal || "pelajaran";
    if (tipe === "pelajaran") {
      if (!editing.kelasId || !editing.mapelId || !editing.pegawaiId) {
        toast({ title: "Untuk tipe Pelajaran: kelas, mapel, guru wajib", variant: "destructive" });
        return;
      }
    } else if (tipe === "ekskul") {
      if (!editing.ekstrakurikulerId) {
        toast({ title: "Untuk tipe Ekskul: pilih ekskul", variant: "destructive" });
        return;
      }
    } else if (tipe === "khusus") {
      if (!editing.judulKhusus?.trim()) {
        toast({ title: "Untuk tipe Khusus: judul wajib", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        tipeJadwal: tipe,
        tahunAjaranId: Number(editing.tahunAjaranId),
        hari: editing.hari,
        jamKe: Number(editing.jamKe),
        jamMulai: editing.jamMulai || null,
        jamSelesai: editing.jamSelesai || null,
        kelasId: editing.kelasId ? Number(editing.kelasId) : null,
        mapelId: editing.mapelId ? Number(editing.mapelId) : null,
        pegawaiId: editing.pegawaiId ? Number(editing.pegawaiId) : null,
        ekstrakurikulerId: editing.ekstrakurikulerId ? Number(editing.ekstrakurikulerId) : null,
        judulKhusus: editing.judulKhusus || null,
      };
      // For ekskul: auto-assign pembina as pegawaiId
      if (tipe === "ekskul" && editing.ekstrakurikulerId) {
        const eks = ekskulOpts.find((e) => e.id === Number(editing.ekstrakurikulerId));
        if (eks?.pembina?.id) payload.pegawaiId = eks.pembina.id;
      }
      const url = editing.id ? `/api/jadwal/${editing.id}` : "/api/jadwal";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Jadwal diperbarui" : "Jadwal ditambahkan" });
      setDialogOpen(false);
      setEditing({});
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/jadwal/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Jadwal dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleExport = (format: "pdf" | "csv", target: { type: "kelas" | "tingkat"; id: string }) => {
    const params = new URLSearchParams();
    params.set("format", format);
    if (target.type === "kelas") params.set("kelasId", target.id);
    else params.set("tingkatId", target.id);
    window.open(`/api/jadwal/export?${params.toString()}`, "_blank");
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Jadwal Pelajaran
            </h3>
            <p className="text-xs text-slate-500">Jadwal pelajaran, ekstrakurikuler, & jadwal khusus per kelas per hari</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
            <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
              <Plus className="h-4 w-4 mr-1" /> Tambah
            </Button>
          </div>
        </div>

        {/* Filter Bar — Sekolah (Super Admin only) + Tahun Ajaran + Tipe + Kelas + Hari */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <SearchX className="h-3.5 w-3.5" />
            <span className="font-medium">Filter Jadwal:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            {/* Filter Sekolah — only for Super Admin */}
            {userRole === "SUPER_ADMIN" && (
              <Select value={filterSekolah} onValueChange={setFilterSekolah}>
                <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Semua Sekolah" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🌐 Semua Sekolah</SelectItem>
                  {sekolahOpts.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.nama}{s.jenjang ? ` (${s.jenjang})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filterTahun} onValueChange={setFilterTahun}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Semua Tahun Ajaran" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tahun Ajaran</SelectItem>
                {tahunOpts.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nama}{t.statusAktif ? " (Aktif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterTipe} onValueChange={setFilterTipe}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Semua Tipe" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Tipe</SelectItem>
                {TIPE_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterKelas} onValueChange={setFilterKelas}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="Semua Kelas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kelas</SelectItem>
                {kelasOpts.map((k) => (
                  <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama || ""} {k.nama}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterHari} onValueChange={setFilterHari}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Semua Hari" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Hari</SelectItem>
                {HARI_LIST.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
              </SelectContent>
            </Select>
            {/* Reset button */}
            {(filterSekolah !== "all" || filterTahun !== "all" || filterKelas !== "all" || filterHari !== "all" || filterTipe !== "all") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setFilterSekolah("all");
                  setFilterTahun("all");
                  setFilterKelas("all");
                  setFilterHari("all");
                  setFilterTipe("all");
                }}
                className="text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
          {/* Active filter indicator */}
          {(userRole === "SUPER_ADMIN" && filterSekolah !== "all") && (
            <div className="text-xs text-slate-500">
              Menampilkan jadwal untuk sekolah: <span className="font-semibold text-slate-700">
                {sekolahOpts.find((s) => String(s.id) === filterSekolah)?.nama || filterSekolah}
              </span>
            </div>
          )}
        </div>

        {filterKelas === "all" && list.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {kelasOpts.map((k) => (
              <div key={k.id} className="border border-slate-200 rounded-md p-2 text-xs">
                <div className="font-medium text-slate-700 truncate">{k.tingkat?.nama} {k.nama}</div>
                <div className="text-slate-500">{perKelasCount[k.id] || 0} jadwal</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada jadwal.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {HARI_LIST.filter((h) => (grouped[h] || []).length > 0).map((h) => (
              <div key={h} className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200">
                  <span className="text-sm font-semibold text-slate-700">{h}</span>
                  <span className="text-xs text-slate-500 ml-2">({(grouped[h] || []).length} jadwal)</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-slate-600 text-xs">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Tipe</th>
                        <th className="text-left px-3 py-2 font-medium">Jam Ke</th>
                        <th className="text-left px-3 py-2 font-medium">Waktu</th>
                        <th className="text-left px-3 py-2 font-medium">Kelas</th>
                        <th className="text-left px-3 py-2 font-medium">Mapel/Judul</th>
                        <th className="text-left px-3 py-2 font-medium">Guru</th>
                        <th className="text-right px-3 py-2 font-medium w-20">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(grouped[h] || []).map((j) => (
                        <tr key={j.id} className="hover:bg-slate-50/60">
                          <td className="px-3 py-2">{tipeBadge(j.tipeJadwal)}</td>
                          <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">Ke-{j.jamKe}</Badge></td>
                          <td className="px-3 py-2 text-xs text-slate-600">{j.jamMulai || "-"} - {j.jamSelesai || "-"}</td>
                          <td className="px-3 py-2">
                            {j.kelas ? <span className="font-medium text-slate-800">{j.kelas.tingkat?.nama} {j.kelas.nama}</span> : <span className="text-slate-400">-</span>}
                          </td>
                          <td className="px-3 py-2">
                            {j.tipeJadwal === "pelajaran" && (j.mapel?.nama || "-")}
                            {j.tipeJadwal === "ekskul" && (j.ekstrakurikuler?.nama ? <span className="text-amber-700">{j.ekstrakurikuler.nama}</span> : "-")}
                            {j.tipeJadwal === "khusus" && (j.judulKhusus ? <span className="text-purple-700">{j.judulKhusus}</span> : "-")}
                          </td>
                          <td className="px-3 py-2 text-slate-600">{j.pegawai?.nama || "-"}</td>
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(j)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(j)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing({}); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle>
            <DialogDescription>Pilih tipe jadwal, lalu lengkapi detail</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Tipe Jadwal *</Label>
              <RadioGroup
                value={editing.tipeJadwal || "pelajaran"}
                onValueChange={(v) => setEditing((p) => ({ ...p, tipeJadwal: v }))}
                className="flex gap-4 mt-1"
              >
                {TIPE_OPTS.map((o) => (
                  <label key={o.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <RadioGroupItem value={o.value} id={`tipe-${o.value}`} />
                    {o.label}
                  </label>
                ))}
              </RadioGroup>
            </div>

            {editing.tipeJadwal === "pelajaran" && (
              <>
                <div>
                  <Label className="text-sm">Kelas *</Label>
                  <Select value={String(editing.kelasId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, kelasId: Number(v), mapelId: undefined, pegawaiId: undefined }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                    <SelectContent>
                      {kelasOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama} {k.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Mapel * <span className="text-[10px] text-slate-500">(difilter berdasarkan tingkat kelas)</span></Label>
                  <Select value={String(editing.mapelId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, mapelId: Number(v), pegawaiId: undefined }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                    <SelectContent>
                      {filteredMapelOpts.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Guru * <span className="text-[10px] text-slate-500">(harus terdaftar di GuruMapel)</span></Label>
                  <Select value={String(editing.pegawaiId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, pegawaiId: Number(v) }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                    <SelectContent>
                      {filteredPegawaiOpts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}{p.jabatan ? ` (${p.jabatan})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {editing.tipeJadwal === "ekskul" && (
              <>
                <div>
                  <Label className="text-sm">Ekstrakurikuler *</Label>
                  <Select value={String(editing.ekstrakurikulerId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, ekstrakurikulerId: Number(v) }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih ekskul" /></SelectTrigger>
                    <SelectContent>
                      {ekskulOpts.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.nama}{e.pembina?.nama ? ` (Pembina: ${e.pembina.nama})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Kelas (opsional)</Label>
                  <Select value={String(editing.kelasId ?? "none")} onValueChange={(v) => setEditing((p) => ({ ...p, kelasId: v === "none" ? null : Number(v) }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Semua kelas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Semua Kelas —</SelectItem>
                      {kelasOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama} {k.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-slate-500">Pembina ekskul akan otomatis di-assign sebagai guru pada jadwal ini.</p>
              </>
            )}

            {editing.tipeJadwal === "khusus" && (
              <>
                <div>
                  <Label className="text-sm">Judul Khusus *</Label>
                  <Input value={editing.judulKhusus || ""} onChange={(e) => setEditing((p) => ({ ...p, judulKhusus: e.target.value }))} placeholder="cth: Upacara, Rapat, Libur" />
                </div>
                <div>
                  <Label className="text-sm">Kelas (opsional)</Label>
                  <Select value={String(editing.kelasId ?? "none")} onValueChange={(v) => setEditing((p) => ({ ...p, kelasId: v === "none" ? null : Number(v) }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Semua kelas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Semua Kelas —</SelectItem>
                      {kelasOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama} {k.nama}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <Label className="text-sm">Tahun Ajaran *</Label>
                <Select value={String(editing.tahunAjaranId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, tahunAjaranId: Number(v) }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                  <SelectContent>
                    {tahunOpts.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nama}{t.statusAktif ? " (Aktif)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Hari *</Label>
                <Select value={String(editing.hari ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, hari: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih hari" /></SelectTrigger>
                  <SelectContent>
                    {HARI_LIST.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Jam Ke *</Label>
                <Input type="number" min={1} max={20} value={String(editing.jamKe ?? "")} onChange={(e) => setEditing((p) => ({ ...p, jamKe: Number(e.target.value) }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Jam Mulai</Label>
                  <Input type="time" value={String(editing.jamMulai ?? "")} onChange={(e) => setEditing((p) => ({ ...p, jamMulai: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm">Jam Selesai</Label>
                  <Input type="time" value={String(editing.jamSelesai ?? "")} onChange={(e) => setEditing((p) => ({ ...p, jamSelesai: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <ExportJadwalDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        kelasOpts={kelasOpts}
        tingkatOpts={tingkatOpts}
        onExport={handleExport}
      />

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus jadwal?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus jadwal {delTarget?.tipeJadwal === "khusus" ? delTarget?.judulKhusus : delTarget?.mapel?.nama || delTarget?.ekstrakurikuler?.nama} ({delTarget?.hari})? Tindakan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel><X className="hidden" />Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function ExportJadwalDialog({
  open, onOpenChange, kelasOpts, tingkatOpts, onExport,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kelasOpts: KelasOpt[];
  tingkatOpts: TingkatOpt[];
  onExport: (format: "pdf" | "csv", target: { type: "kelas" | "tingkat"; id: string }) => void;
}) {
  const [scope, setScope] = useState<"kelas" | "tingkat">("kelas");
  const [kelasId, setKelasId] = useState<string>("");
  const [tingkatId, setTingkatId] = useState<string>("");

  const canExport = (scope === "kelas" && kelasId) || (scope === "tingkat" && tingkatId);

  const handle = (fmt: "pdf" | "csv") => {
    if (!canExport) return;
    if (scope === "kelas") onExport(fmt, { type: "kelas", id: kelasId });
    else onExport(fmt, { type: "tingkat", id: tingkatId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Jadwal</DialogTitle>
          <DialogDescription>Pilih scope (per kelas atau per tingkat) dan format file</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-sm">Scope</Label>
            <RadioGroup value={scope} onValueChange={(v) => setScope(v as "kelas" | "tingkat")} className="flex gap-4 mt-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value="kelas" id="scope-kelas" /> Per Kelas
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <RadioGroupItem value="tingkat" id="scope-tingkat" /> Per Tingkat
              </label>
            </RadioGroup>
          </div>
          {scope === "kelas" ? (
            <div>
              <Label className="text-sm">Kelas *</Label>
              <Select value={kelasId} onValueChange={setKelasId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                <SelectContent>
                  {kelasOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.tingkat?.nama} {k.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label className="text-sm">Tingkat *</Label>
              <Select value={tingkatId} onValueChange={setTingkatId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                <SelectContent>
                  {tingkatOpts.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nama}{t.jenjang ? ` (${t.jenjang})` : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button variant="outline" disabled={!canExport} onClick={() => handle("csv")}>
            <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel/CSV
          </Button>
          <Button disabled={!canExport} onClick={() => handle("pdf")} className="bg-slate-700 hover:bg-slate-800">
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default JadwalSection;
