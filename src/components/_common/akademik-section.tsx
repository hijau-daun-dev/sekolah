"use client";

import { useCallback, useEffect, useState } from "react";
import { BookOpen, CalendarDays, Layers, DoorOpen, GraduationCap, Award, Users, Loader2, X, Plus, Pencil, Trash2, ArrowUpRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CrudTable, type ColumnDef, type FieldDef } from "./_crud-table";
import { fmtDateDisplay } from "./_format";

interface TahunAjaran {
  id: number; nama: string; tanggalMulai?: string | null; tanggalSelesai?: string | null;
  statusAktif: boolean; _count?: { semesters: number; kelases: number };
}
interface Semester {
  id: number; tahunAjaranId: number; nama: string; statusAktif: boolean;
  tanggalMulai?: string | null; tanggalSelesai?: string | null;
  tahunAjaran?: { id: number; nama: string; statusAktif: boolean };
}
interface Tingkat { id: number; nama: string; jenjang?: string | null; urutan: number; }
interface Jurusan { id: number; kode: string; nama: string; keterangan?: string | null; _count?: { kelases: number }; }
interface Kelas {
  id: number; nama: string; tingkatId: number; jurusanId?: number | null; tahunAjaranId: number;
  walikelasId?: number | null; ruangan?: string | null; kapasitas?: number | null;
  tingkat?: { id: number; nama: string; jenjang?: string | null };
  jurusan?: { id: number; kode: string; nama: string } | null;
  tahunAjaran?: { id: number; nama: string; statusAktif: boolean };
  walikelas?: { id: number; nama: string; jabatan?: string | null } | null;
  _count?: { kelasSiswas: number };
}
interface KategoriMapel { id: number; nama: string; keterangan?: string | null; _count?: { mapels: number }; }
interface Mapel {
  id: number; kode?: string | null; nama: string; kategoriMapelId?: number | null;
  jpPerMinggu?: number | null; keterangan?: string | null;
  kategoriMapel?: { id: number; nama: string } | null;
  _count?: { guruMapels: number; jadwals: number };
}
interface KomponenNilai { id: number; nama: string; bobot: number; keterangan?: string | null; _count?: { penilaians: number }; }
interface GuruMapel {
  id: number; pegawaiId: number; mapelId: number; kelasId?: number | null;
  pegawai?: { id: number; nama: string; jabatan?: string | null };
  mapel?: { id: number; nama: string; kode?: string | null };
  kelas?: { id: number; nama: string } | null;
}
interface PegawaiMini { id: number; nama: string; jabatan?: string | null; }
interface SiswaMini { id: number; nama: string; nis?: string | null; status?: string | null; }
interface KelasSiswa {
  id: number; kelasId: number; siswaId: number; tahunAjaranId: number;
  kelas?: { id: number; nama: string; tingkat?: { nama: string } | null; tahunAjaran?: { nama: string } | null };
  siswa?: { id: number; nama: string; nis?: string | null; status?: string | null };
}

export function AkademikSection() {
  return (
    <Tabs defaultValue="ta" className="w-full">
      <TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-slate-100">
        <TabsTrigger value="ta" className="text-xs"><CalendarDays className="h-3.5 w-3.5 mr-1.5" /> Tahun Ajaran & Semester</TabsTrigger>
        <TabsTrigger value="tingkat" className="text-xs"><Layers className="h-3.5 w-3.5 mr-1.5" /> Tingkat & Jurusan</TabsTrigger>
        <TabsTrigger value="kelas" className="text-xs"><DoorOpen className="h-3.5 w-3.5 mr-1.5" /> Kelas & Siswa</TabsTrigger>
        <TabsTrigger value="mapel" className="text-xs"><BookOpen className="h-3.5 w-3.5 mr-1.5" /> Mata Pelajaran</TabsTrigger>
        <TabsTrigger value="nilai" className="text-xs"><Award className="h-3.5 w-3.5 mr-1.5" /> Komponen Nilai & Guru Mapel</TabsTrigger>
      </TabsList>

      <TabsContent value="ta" className="space-y-4 mt-4">
        <GenerateKelasCard />
        <TahunAjaranTab />
        <SemesterTab />
      </TabsContent>
      <TabsContent value="tingkat" className="space-y-4 mt-4">
        <TingkatTab />
        <JurusanTab />
      </TabsContent>
      <TabsContent value="kelas" className="space-y-4 mt-4">
        <KelasTab />
      </TabsContent>
      <TabsContent value="mapel" className="space-y-4 mt-4">
        <KategoriMapelTab />
        <MapelTab />
      </TabsContent>
      <TabsContent value="nilai" className="space-y-4 mt-4">
        <KomponenNilaiTab />
        <GuruMapelTab />
      </TabsContent>
    </Tabs>
  );
}

// ============ Generate Kelas (Kenaikan) ============
function GenerateKelasCard() {
  const [taList, setTaList] = useState<TahunAjaran[]>([]);
  const [open, setOpen] = useState(false);
  const [lamaId, setLamaId] = useState<number | null>(null);
  const [baruId, setBaruId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { promoted: number; graduated: number; skipped: number; total: number }>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/tahun-ajaran")
      .then((r) => r.json())
      .then((d: TahunAjaran[]) => {
        if (Array.isArray(d)) setTaList(d);
      })
      .catch(() => { /* ignore */ });
  }, []);

  const handleOpen = () => {
    setResult(null);
    setLamaId(null);
    setBaruId(null);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!lamaId || !baruId) {
      toast({ title: "Pilih tahun ajaran lama dan baru", variant: "destructive" });
      return;
    }
    if (lamaId === baruId) {
      toast({ title: "Tahun ajaran lama dan baru tidak boleh sama", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/generate-kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tahunAjaranIdLama: lamaId, tahunAjaranIdBaru: baruId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal generate kelas");
      setResult({ promoted: d.promoted, graduated: d.graduated, skipped: d.skipped, total: d.total });
      toast({
        title: "Generate Kelas selesai",
        description: `Naik: ${d.promoted} • Lulus: ${d.graduated} • Skip: ${d.skipped} (total: ${d.total})`,
      });
    } catch (e) {
      toast({
        title: "Gagal generate kelas",
        description: e instanceof Error ? e.message : "",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-slate-600" />
              Generate Kelas (Kenaikan Kelas)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Naikkan siswa ke kelas di tahun ajaran baru sesuai tingkat berikutnya. Siswa di kelas akhir akan ditandai sebagai &quot;Lulus&quot;.
            </p>
          </div>
          <Button size="sm" onClick={handleOpen} className="bg-slate-700 hover:bg-slate-800 whitespace-nowrap">
            <ArrowUpRight className="h-4 w-4 mr-1" /> Generate Kelas
          </Button>
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setResult(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Kelas (Kenaikan)</DialogTitle>
            <DialogDescription>
              Pilih tahun ajaran lama sebagai sumber, dan tahun ajaran baru sebagai tujuan kenaikan.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 py-2">
            <div>
              <Label className="text-sm">Tahun Ajaran Lama (Sumber) *</Label>
              <Select
                value={lamaId ? String(lamaId) : "none"}
                onValueChange={(v) => setLamaId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tahun ajaran lama" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>— Pilih —</SelectItem>
                  {taList.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nama}{t.statusAktif ? " (Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Tahun Ajaran Baru (Tujuan) *</Label>
              <Select
                value={baruId ? String(baruId) : "none"}
                onValueChange={(v) => setBaruId(v === "none" ? null : Number(v))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tahun ajaran baru" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>— Pilih —</SelectItem>
                  {taList.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nama}{t.statusAktif ? " (Aktif)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Catatan: pastikan kelas pada tahun ajaran baru sudah dibuat (menu Kelas &amp; Siswa) dengan
              nama mengikuti pola tingkat (cth. &quot;6A&quot; untuk tingkat 6 paralel A). Siswa yang tidak
              memiliki kelas tujuan akan dilewati (skip).
            </p>

            {result && (
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm space-y-1">
                <div className="font-medium text-slate-800">Hasil:</div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-700">
                  <span> Total diproses:</span><span className="text-right font-semibold">{result.total}</span>
                  <span> Naik kelas:</span><span className="text-right font-semibold text-emerald-700">{result.promoted}</span>
                  <span> Lulus:</span><span className="text-right font-semibold text-amber-700">{result.graduated}</span>
                  <span> Dilewati (skip):</span><span className="text-right font-semibold text-slate-600">{result.skipped}</span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              {result ? "Tutup" : "Batal"}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-slate-700 hover:bg-slate-800">
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Jalankan Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ============ Tahun Ajaran ============
function TahunAjaranTab() {
  const columns: ColumnDef<TahunAjaran>[] = [
    { key: "nama", header: "Nama", cell: (r) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-800">{r.nama}</span>
        {r.statusAktif && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>}
      </div>
    ) },
    { key: "tanggalMulai", header: "Mulai", cell: (r) => fmtDateDisplay(r.tanggalMulai) },
    { key: "tanggalSelesai", header: "Selesai", cell: (r) => fmtDateDisplay(r.tanggalSelesai) },
    { key: "_count", header: "Stats", cell: (r) => (
      <span className="text-xs text-slate-600">{r._count?.semesters ?? 0} semester • {r._count?.kelases ?? 0} kelas</span>
    ) },
  ];
  const fields: FieldDef[] = [
    { key: "nama", label: "Nama (cth: 2025/2026)", type: "text", required: true, full: true },
    { key: "tanggalMulai", label: "Tanggal Mulai", type: "date" },
    { key: "tanggalSelesai", label: "Tanggal Selesai", type: "date" },
    { key: "statusAktif", label: "Set sebagai Tahun Ajaran Aktif", type: "switch", full: true, help: "Yang lain akan otomatis dinonaktifkan" },
  ];
  return (
    <CrudTable<TahunAjaran>
      title="Tahun Ajaran"
      description="Periode tahun ajaran sekolah"
      fetchUrl="/api/tahun-ajaran"
      columns={columns}
      fields={fields}
      emptyRecord={{ nama: "", tanggalMulai: "", tanggalSelesai: "", statusAktif: false }}
      searchKeys={["nama"]}
      searchPlaceholder="Cari tahun ajaran..."
    />
  );
}

// ============ Semester ============
function SemesterTab() {
  const [taList, setTaList] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    fetch("/api/tahun-ajaran").then((r) => r.json()).then((d: TahunAjaran[]) => {
      if (Array.isArray(d)) setTaList(d.map((t) => ({ value: String(t.id), label: t.nama + (t.statusAktif ? " (Aktif)" : "") })));
    });
  }, []);

  const columns: ColumnDef<Semester>[] = [
    { key: "nama", header: "Semester", cell: (r) => (
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-800">{r.nama}</span>
        {r.statusAktif && <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>}
      </div>
    ) },
    { key: "tahunAjaran", header: "Tahun Ajaran", cell: (r) => r.tahunAjaran?.nama || "-" },
    { key: "tanggalMulai", header: "Mulai", cell: (r) => fmtDateDisplay(r.tanggalMulai) },
    { key: "tanggalSelesai", header: "Selesai", cell: (r) => fmtDateDisplay(r.tanggalSelesai) },
  ];
  const fields: FieldDef[] = [
    { key: "tahunAjaranId", label: "Tahun Ajaran", type: "select", required: true, full: true, options: taList },
    { key: "nama", label: "Nama Semester", type: "select", required: true, options: [{ value: "Ganjil", label: "Ganjil" }, { value: "Genap", label: "Genap" }] },
    { key: "statusAktif", label: "Set sebagai Semester Aktif", type: "switch", help: "Yang lain otomatis dinonaktifkan" },
    { key: "tanggalMulai", label: "Tanggal Mulai", type: "date" },
    { key: "tanggalSelesai", label: "Tanggal Selesai", type: "date" },
  ];
  return (
    <CrudTable<Semester>
      title="Semester"
      description="Semester per tahun ajaran"
      fetchUrl="/api/semester"
      columns={columns}
      fields={fields}
      emptyRecord={{ tahunAjaranId: "", nama: "", statusAktif: false, tanggalMulai: "", tanggalSelesai: "" }}
      searchKeys={["nama"]}
      searchPlaceholder="Cari semester..."
    />
  );
}

// ============ Tingkat ============
function TingkatTab() {
  const columns: ColumnDef<Tingkat>[] = [
    { key: "urutan", header: "Urutan", cell: (r) => <span className="text-slate-600">{r.urutan}</span> },
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "jenjang", header: "Jenjang", cell: (r) => r.jenjang ? <Badge variant="outline" className="text-[10px]">{r.jenjang}</Badge> : "-" },
  ];
  const fields: FieldDef[] = [
    { key: "nama", label: "Nama (cth: 1, 2, ..., 9)", type: "text", required: true },
    { key: "jenjang", label: "Jenjang", type: "select", options: [{ value: "SD", label: "SD" }, { value: "SMP", label: "SMP" }] },
    { key: "urutan", label: "Urutan", type: "number" },
  ];
  return (
    <CrudTable<Tingkat>
      title="Tingkat"
      description="Tingkat kelas (1-9 untuk SD-SMP)"
      fetchUrl="/api/tingkat"
      columns={columns}
      fields={fields}
      emptyRecord={{ nama: "", jenjang: "", urutan: 0 }}
      searchKeys={["nama"]}
      searchPlaceholder="Cari tingkat..."
    />
  );
}

// ============ Jurusan ============
function JurusanTab() {
  const columns: ColumnDef<Jurusan>[] = [
    { key: "kode", header: "Kode", cell: (r) => <Badge variant="outline" className="text-[10px]">{r.kode}</Badge> },
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "keterangan", header: "Keterangan", cell: (r) => <span className="text-xs text-slate-600">{r.keterangan || "-"}</span> },
    { key: "_count", header: "Kelas", cell: (r) => r._count?.kelases ?? 0 },
  ];
  const fields: FieldDef[] = [
    { key: "kode", label: "Kode *", type: "text", required: true, placeholder: "cth: IPA" },
    { key: "nama", label: "Nama *", type: "text", required: true, full: true },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<Jurusan>
      title="Jurusan"
      description="Jurusan (untuk SMP)"
      fetchUrl="/api/jurusan"
      columns={columns}
      fields={fields}
      emptyRecord={{ kode: "", nama: "", keterangan: "" }}
      searchKeys={["nama", "kode"]}
      searchPlaceholder="Cari jurusan..."
    />
  );
}

// ============ Kelas (with kelas-siswa management) ============
function KelasTab() {
  const [tingkatList, setTingkatList] = useState<{ value: string; label: string }[]>([]);
  const [jurusanList, setJurusanList] = useState<{ value: string; label: string }[]>([]);
  const [taList, setTaList] = useState<{ value: string; label: string }[]>([]);
  const [pegawaiList, setPegawaiList] = useState<{ value: string; label: string }[]>([]);
  const [list, setList] = useState<Kelas[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Kelas> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Kelas | null>(null);
  const [siswaDialogKelas, setSiswaDialogKelas] = useState<Kelas | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/kelas");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat kelas", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
    Promise.all([
      fetch("/api/tingkat").then((r) => r.json()),
      fetch("/api/jurusan").then((r) => r.json()),
      fetch("/api/tahun-ajaran").then((r) => r.json()),
      fetch("/api/pegawai").then((r) => r.json()),
    ]).then(([t, j, ta, pg]: [Tingkat[], Jurusan[], TahunAjaran[], PegawaiMini[]]) => {
      if (Array.isArray(t)) setTingkatList(t.map((x) => ({ value: String(x.id), label: `${x.nama}${x.jenjang ? ` (${x.jenjang})` : ""}` })));
      if (Array.isArray(j)) setJurusanList(j.map((x) => ({ value: String(x.id), label: `${x.kode} - ${x.nama}` })));
      if (Array.isArray(ta)) setTaList(ta.map((x) => ({ value: String(x.id), label: x.nama + (x.statusAktif ? " (Aktif)" : "") })));
      if (Array.isArray(pg)) setPegawaiList(pg.map((x) => ({ value: String(x.id), label: x.nama + (x.jabatan ? ` (${x.jabatan})` : "") })));
    });
  }, [load]);

  const filtered = list.filter((k) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return k.nama.toLowerCase().includes(q) || (k.tingkat?.nama || "").toLowerCase().includes(q);
  });

  const handleAdd = () => {
    // prefill tahun ajaran aktif
    const aktifTa = taList.length > 0 ? taList[0].value : "";
    setEditing({ nama: "", tingkatId: undefined, jurusanId: null, tahunAjaranId: aktifTa ? Number(aktifTa) : undefined, walikelasId: null, ruangan: "", kapasitas: null });
    setDialogOpen(true);
  };
  const handleEdit = (k: Kelas) => { setEditing({ ...k }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.nama?.trim()) { toast({ title: "Nama wajib", variant: "destructive" }); return; }
    if (!editing.tingkatId) { toast({ title: "Tingkat wajib", variant: "destructive" }); return; }
    if (!editing.tahunAjaranId) { toast({ title: "Tahun ajaran wajib", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = editing.id ? `/api/kelas/${editing.id}` : "/api/kelas";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Kelas diperbarui" : "Kelas ditambahkan" });
      setDialogOpen(false); setEditing(null); await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/kelas/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Kelas dihapus" });
      setDelTarget(null); await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const update = (k: keyof Kelas, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Kelas</h3>
            <p className="text-xs text-slate-500">Kelas per tahun ajaran & tingkat</p>
          </div>
          <div className="flex gap-2">
            <div className="relative w-full sm:w-56">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <Input placeholder="Cari kelas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500"><p className="text-sm">Belum ada kelas.</p></div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nama</th>
                  <th className="text-left px-3 py-2 font-medium">Tingkat</th>
                  <th className="text-left px-3 py-2 font-medium">Jurusan</th>
                  <th className="text-left px-3 py-2 font-medium">TA</th>
                  <th className="text-left px-3 py-2 font-medium">Walikelas</th>
                  <th className="text-left px-3 py-2 font-medium">Siswa</th>
                  <th className="text-right px-3 py-2 font-medium w-32">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-800">{k.nama}{k.ruangan && <span className="text-[10px] text-slate-500 block">{k.ruangan}</span>}</td>
                    <td className="px-3 py-2">{k.tingkat?.nama || "-"}</td>
                    <td className="px-3 py-2">{k.jurusan?.nama || "-"}</td>
                    <td className="px-3 py-2">{k.tahunAjaran?.nama}{k.tahunAjaran?.statusAktif && <Badge className="ml-1 bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>}</td>
                    <td className="px-3 py-2">{k.walikelas?.nama || "-"}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{k._count?.kelasSiswas ?? 0} siswa</Badge></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="outline" className="h-7" onClick={() => setSiswaDialogKelas(k)}>
                        <Users className="h-3 w-3 mr-1" /> Siswa
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(k)} title="Edit">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(k)} title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Kelas" : "Tambah Kelas"}</DialogTitle>
            <DialogDescription>Kelas per tahun ajaran & tingkat</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <div className="sm:col-span-2">
                <Label className="text-sm">Nama Kelas *</Label>
                <Input value={editing.nama || ""} onChange={(e) => update("nama", e.target.value)} placeholder="cth: 6A" />
              </div>
              <div>
                <Label className="text-sm">Tingkat *</Label>
                <Select value={editing.tingkatId ? String(editing.tingkatId) : "none"} onValueChange={(v) => update("tingkatId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tingkat" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>— Pilih —</SelectItem>
                    {tingkatList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Jurusan</Label>
                <Select value={editing.jurusanId ? String(editing.jurusanId) : "none"} onValueChange={(v) => update("jurusanId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {jurusanList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Tahun Ajaran *</Label>
                <Select value={editing.tahunAjaranId ? String(editing.tahunAjaranId) : "none"} onValueChange={(v) => update("tahunAjaranId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih TA" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>— Pilih —</SelectItem>
                    {taList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Walikelas</Label>
                <Select value={editing.walikelasId ? String(editing.walikelasId) : "none"} onValueChange={(v) => update("walikelasId", v === "none" ? null : Number(v))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Tidak ada" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {pegawaiList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Ruangan</Label>
                <Input value={editing.ruangan || ""} onChange={(e) => update("ruangan", e.target.value)} />
              </div>
              <div>
                <Label className="text-sm">Kapasitas</Label>
                <Input type="number" value={editing.kapasitas ?? ""} onChange={(e) => update("kapasitas", e.target.value === "" ? null : Number(e.target.value))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!siswaDialogKelas} onOpenChange={(o) => !o && setSiswaDialogKelas(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Siswa Kelas: {siswaDialogKelas?.nama}</DialogTitle>
            <DialogDescription>Tahun ajaran {siswaDialogKelas?.tahunAjaran?.nama}. Tambah / hapus siswa dari kelas ini.</DialogDescription>
          </DialogHeader>
          {siswaDialogKelas && <KelasSiswaManager kelas={siswaDialogKelas} />}
        </DialogContent>
      </Dialog>

      <DeleteDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)} onConfirm={handleDelete} />
    </Card>
  );
}

function DeleteDialog({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (o: boolean) => void; onConfirm: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus data?</DialogTitle>
          <DialogDescription>Yakin menghapus data ini? Tindakan tidak dapat dibatalkan.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700">Hapus</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KelasSiswaManager({ kelas }: { kelas: Kelas }) {
  const [list, setList] = useState<KelasSiswa[]>([]);
  const [allSiswa, setAllSiswa] = useState<SiswaMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [pick, setPick] = useState<string>("");
  const [adding, setAdding] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/kelas-siswa?kelasId=${kelas.id}`),
        fetch("/api/siswa"),
      ]);
      const d1 = await r1.json();
      const d2 = await r2.json();
      if (Array.isArray(d1)) setList(d1);
      if (Array.isArray(d2)) setAllSiswa(d2);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [kelas.id]);

  useEffect(() => { load(); }, [load]);

  const linkedIds = new Set(list.map((x) => x.siswaId));
  const available = allSiswa.filter((s) => !linkedIds.has(s.id));

  const handleAdd = async () => {
    if (!pick) return;
    setAdding(true);
    try {
      const r = await fetch("/api/kelas-siswa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kelasId: kelas.id, siswaId: Number(pick), tahunAjaranId: kelas.tahunAjaranId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menambah");
      setPick("");
      await load();
      toast({ title: "Siswa ditambahkan ke kelas" });
    } catch (e) {
      toast({ title: "Gagal menambah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleRemove = async (ksid: number, nama: string) => {
    try {
      const r = await fetch(`/api/kelas-siswa/${ksid}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Gagal menghapus");
      await load();
      toast({ title: `${nama} dihapus dari kelas` });
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-2 items-end">
            <div className="flex-1 w-full">
              <Label className="text-xs">Tambah Siswa ke Kelas</Label>
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih siswa..." /></SelectTrigger>
                <SelectContent>
                  {available.length === 0 ? (
                    <SelectItem value="_none" disabled>Tidak ada siswa tersedia</SelectItem>
                  ) : available.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>{s.nama} {s.nis ? `(${s.nis})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAdd} disabled={adding || !pick || pick === "_none"} className="bg-slate-700 hover:bg-slate-800">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />} Tambah
            </Button>
          </div>
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-72 overflow-y-auto">
            {list.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500">Belum ada siswa di kelas ini.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Nama</th>
                    <th className="text-left px-3 py-2 font-medium">NIS</th>
                    <th className="text-left px-3 py-2 font-medium">Status</th>
                    <th className="text-right px-3 py-2 font-medium w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {list.map((ks) => (
                    <tr key={ks.id} className="hover:bg-slate-50/60">
                      <td className="px-3 py-2 font-medium text-slate-800">{ks.siswa?.nama || "-"}</td>
                      <td className="px-3 py-2 text-xs">{ks.siswa?.nis || "-"}</td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{ks.siswa?.status || "-"}</Badge></td>
                      <td className="px-3 py-2 text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => handleRemove(ks.id, ks.siswa?.nama || "")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============ Kategori Mapel ============
function KategoriMapelTab() {
  const columns: ColumnDef<KategoriMapel>[] = [
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "keterangan", header: "Keterangan", cell: (r) => <span className="text-xs text-slate-600">{r.keterangan || "-"}</span> },
    { key: "_count", header: "Mapel", cell: (r) => r._count?.mapels ?? 0 },
  ];
  const fields: FieldDef[] = [
    { key: "nama", label: "Nama *", type: "text", required: true, full: true },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<KategoriMapel>
      title="Kategori Mata Pelajaran"
      description="Pengelompokan mapel (Umum, Agama, Mulok)"
      fetchUrl="/api/kategori-mapel"
      columns={columns}
      fields={fields}
      emptyRecord={{ nama: "", keterangan: "" }}
      searchKeys={["nama"]}
      searchPlaceholder="Cari kategori..."
    />
  );
}

// ============ Mapel ============
function MapelTab() {
  const [katList, setKatList] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    fetch("/api/kategori-mapel").then((r) => r.json()).then((d: KategoriMapel[]) => {
      if (Array.isArray(d)) setKatList(d.map((k) => ({ value: String(k.id), label: k.nama })));
    });
  }, []);
  const columns: ColumnDef<Mapel>[] = [
    { key: "kode", header: "Kode", cell: (r) => r.kode ? <Badge variant="outline" className="text-[10px]">{r.kode}</Badge> : "-" },
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "kategoriMapel", header: "Kategori", cell: (r) => r.kategoriMapel?.nama || "-" },
    { key: "jpPerMinggu", header: "JP/Minggu", cell: (r) => r.jpPerMinggu ?? "-" },
  ];
  const fields: FieldDef[] = [
    { key: "kode", label: "Kode", type: "text" },
    { key: "nama", label: "Nama *", type: "text", required: true, full: true },
    { key: "kategoriMapelId", label: "Kategori", type: "select", options: katList, full: true },
    { key: "jpPerMinggu", label: "JP per Minggu", type: "number" },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<Mapel>
      title="Mata Pelajaran"
      description="Daftar mapel & jam pelajaran"
      fetchUrl="/api/mapel"
      columns={columns}
      fields={fields}
      emptyRecord={{ kode: "", nama: "", kategoriMapelId: "", jpPerMinggu: "", keterangan: "" }}
      searchKeys={["nama", "kode"]}
      searchPlaceholder="Cari mapel..."
    />
  );
}

// ============ Komponen Nilai ============
function KomponenNilaiTab() {
  const columns: ColumnDef<KomponenNilai>[] = [
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "bobot", header: "Bobot (%)", cell: (r) => <Badge variant="outline" className="text-[10px]">{r.bobot}%</Badge> },
    { key: "keterangan", header: "Keterangan", cell: (r) => <span className="text-xs text-slate-600">{r.keterangan || "-"}</span> },
    { key: "_count", header: "Penilaian", cell: (r) => r._count?.penilaians ?? 0 },
  ];
  const fields: FieldDef[] = [
    { key: "nama", label: "Nama * (cth: UTS, UAS, Tugas)", type: "text", required: true, full: true },
    { key: "bobot", label: "Bobot (0-100)", type: "number", required: true, step: "0.1", help: "Persentase bobot dalam nilai akhir" },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<KomponenNilai>
      title="Komponen Nilai"
      description="Komponen penilaian (UTS, UAS, Tugas, Harian)"
      fetchUrl="/api/komponen-nilai"
      columns={columns}
      fields={fields}
      emptyRecord={{ nama: "", bobot: 0, keterangan: "" }}
      searchKeys={["nama"]}
      searchPlaceholder="Cari komponen..."
      validate={(rec) => {
        const b = Number(rec.bobot);
        if (Number.isNaN(b) || b < 0 || b > 100) return "Bobot harus 0-100";
        return null;
      }}
    />
  );
}

// ============ Guru Mapel ============
function GuruMapelTab() {
  const [pgList, setPgList] = useState<{ value: string; label: string }[]>([]);
  const [mpList, setMpList] = useState<{ value: string; label: string }[]>([]);
  const [kList, setKList] = useState<{ value: string; label: string }[]>([]);
  const [list, setList] = useState<GuruMapel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<{ pegawaiId: string; mapelId: string; kelasId: string }>({ pegawaiId: "", mapelId: "", kelasId: "" });
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<GuruMapel | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/guru-mapel");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    Promise.all([
      fetch("/api/pegawai").then((r) => r.json()),
      fetch("/api/mapel").then((r) => r.json()),
      fetch("/api/kelas").then((r) => r.json()),
    ]).then(([pg, mp, kl]: [PegawaiMini[], Mapel[], Kelas[]]) => {
      if (Array.isArray(pg)) setPgList(pg.map((x) => ({ value: String(x.id), label: x.nama + (x.jabatan ? ` (${x.jabatan})` : "") })));
      if (Array.isArray(mp)) setMpList(mp.map((x) => ({ value: String(x.id), label: x.nama + (x.kode ? ` [${x.kode}]` : "") })));
      if (Array.isArray(kl)) setKList(kl.map((x) => ({ value: String(x.id), label: x.nama })));
    });
  }, [load]);

  const handleAdd = async () => {
    if (!form.pegawaiId || !form.mapelId) { toast({ title: "Pegawai & Mapel wajib", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/guru-mapel", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pegawaiId: Number(form.pegawaiId),
          mapelId: Number(form.mapelId),
          kelasId: form.kelasId ? Number(form.kelasId) : null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menambah");
      toast({ title: "Guru mapel ditambahkan" });
      setDialogOpen(false);
      setForm({ pegawaiId: "", mapelId: "", kelasId: "" });
      await load();
    } catch (e) {
      toast({ title: "Gagal menambah", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/guru-mapel/${delTarget.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Gagal menghapus");
      toast({ title: "Guru mapel dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Guru Mapel</h3>
            <p className="text-xs text-slate-500">Pasangan guru – mapel – kelas</p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} className="bg-slate-700 hover:bg-slate-800"><Plus className="h-4 w-4 mr-1" /> Tambah</Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-slate-500"><p className="text-sm">Belum ada data.</p></div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Guru</th>
                  <th className="text-left px-3 py-2 font-medium">Mapel</th>
                  <th className="text-left px-3 py-2 font-medium">Kelas</th>
                  <th className="text-right px-3 py-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-800">{g.pegawai?.nama || "-"}</td>
                    <td className="px-3 py-2">{g.mapel?.nama || "-"}</td>
                    <td className="px-3 py-2">{g.kelas?.nama || <span className="text-slate-400">Semua</span>}</td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(g)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah Guru Mapel</DialogTitle>
            <DialogDescription>Tetapkan guru untuk mapel & kelas tertentu.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Guru / Pegawai *</Label>
              <Select value={form.pegawaiId} onValueChange={(v) => setForm((p) => ({ ...p, pegawaiId: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih guru" /></SelectTrigger>
                <SelectContent>
                  {pgList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Mata Pelajaran *</Label>
              <Select value={form.mapelId} onValueChange={(v) => setForm((p) => ({ ...p, mapelId: v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih mapel" /></SelectTrigger>
                <SelectContent>
                  {mpList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Kelas (opsional)</Label>
              <Select value={form.kelasId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, kelasId: v === "none" ? "" : v }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Semua kelas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Semua Kelas —</SelectItem>
                  {kList.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAdd} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hapus guru mapel?</DialogTitle>
            <DialogDescription>Yakin menghapus penugasan guru ini?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelTarget(null)}>Batal</Button>
            <Button onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
