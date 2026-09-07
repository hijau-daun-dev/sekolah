"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Save, Loader2, History, Plus, Pencil, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./image-upload";

interface Sekolah {
  id?: number;
  nama: string;
  npsn?: string | null;
  jenjang?: string | null;
  jenjangId?: number | null;
  jenjangRef?: { id: number; kode: string; nama: string } | null;
  yayasan?: string | null;
  yayasanId?: number | null;
  yayasanRef?: { id: number; nama: string; logoUrl?: string | null } | null;
  alamat?: string | null;
  logoUrl?: string | null;
  telepon?: string | null;
  email?: string | null;
  website?: string | null;
  kepalaSekolah?: string | null;
  nipKepala?: string | null;
  description?: string | null;
  statusAktif?: boolean;
}

interface SekolahOpt { id: number; nama: string; jenjang?: string | null; jenjangRef?: { kode: string; nama: string } | null }
interface JenjangOpt { id: number; kode: string; nama: string; urutan: number }
interface YayasanOpt { id: number; nama: string; logoUrl?: string | null }
interface RiwayatKepala {
  id: number;
  pegawaiId: number;
  namaSnapshot: string;
  nipSnapshot?: string | null;
  tanggalMulai: string;
  tanggalSelesai?: string | null;
  status: string;
  keterangan?: string | null;
  pegawai?: { id: number; nama: string; jabatan?: string | null; nip?: string | null };
}
interface PegawaiOpt { id: number; nama: string; jabatan?: string | null; nip?: string | null }

const JENJANG_OPTS = [
  { value: "SD", label: "SD" },
  { value: "MI", label: "MI" },
  { value: "SMP", label: "SMP" },
  { value: "MTs", label: "MTs" },
  { value: "MA", label: "MA" },
  { value: "SD-SMP", label: "SD-SMP" },
  { value: "MI-MTs", label: "MI-MTs" },
];

export function SekolahSection() {
  const [sekolahList, setSekolahList] = useState<SekolahOpt[]>([]);
  const [sekolahId, setSekolahId] = useState<string>("");
  const [data, setData] = useState<Sekolah | null>(null);
  const [loading, setLoading] = useState(true);
  const [jenjangOpts, setJenjangOpts] = useState<JenjangOpt[]>([]);
  const [yayasanOpts, setYayasanOpts] = useState<YayasanOpt[]>([]);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = sekolahId ? `/api/sekolah?sekolahId=${sekolahId}` : "/api/sekolah";
      const r = await fetch(url);
      const d = await r.json();
      setData(d ?? { nama: "" });
    } catch {
      toast({ title: "Gagal memuat data sekolah", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [sekolahId, toast]);

  useEffect(() => {
    fetch("/api/sekolah/list").then((r) => r.json()).then((d: SekolahOpt[]) => {
      if (Array.isArray(d)) {
        setSekolahList(d);
        if (d.length > 0 && !sekolahId) setSekolahId(String(d[0].id));
      }
    }).catch(() => {});
    // Load master jenjang + yayasan for dropdowns
    fetch("/api/jenjang?statusAktif=true").then((r) => r.json()).then((d: JenjangOpt[]) => {
      if (Array.isArray(d)) setJenjangOpts(d);
    }).catch(() => {});
    fetch("/api/yayasan").then((r) => r.json()).then((d: YayasanOpt[]) => {
      if (Array.isArray(d)) setYayasanOpts(d);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!data?.nama?.trim()) {
      toast({ title: "Nama sekolah wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Sekolah & { id?: number } = { ...data };
      if (sekolahId) payload.id = Number(sekolahId);
      const r = await fetch("/api/sekolah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      setData(d);
      toast({ title: "Data sekolah tersimpan", description: "Perubahan berhasil disimpan" });
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
      </div>
    );
  }

  const update = (k: keyof Sekolah, v: string | null) => setData((p) => p ? { ...p, [k]: v } : p);
  const isMulti = sekolahList.length > 1;

  return (
    <div className="space-y-4">
      {isMulti && (
        <Card className="border-slate-200">
          <CardContent className="p-3 flex items-center gap-3">
            <Building2 className="h-4 w-4 text-slate-500" />
            <Label className="text-xs whitespace-nowrap">Pilih Sekolah</Label>
            <Select value={sekolahId} onValueChange={setSekolahId}>
              <SelectTrigger className="w-full sm:w-72 h-8"><SelectValue placeholder="Pilih sekolah" /></SelectTrigger>
              <SelectContent>
                {sekolahList.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-800">
            <Building2 className="h-5 w-5 text-slate-600" /> Identitas Sekolah
          </CardTitle>
          <CardDescription>Data ini akan tampil pada header aplikasi & kwitansi pembayaran</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <ImageUpload
              label="Logo Sekolah"
              value={data?.logoUrl ?? null}
              onChange={(v) => update("logoUrl", v)}
              shape="rounded"
              size="lg"
            />
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="nama">Nama Sekolah *</Label>
                <Input id="nama" value={data?.nama || ""} onChange={(e) => update("nama", e.target.value)} placeholder="SD Negeri 1 Contoh" />
              </div>
              <div>
                <Label htmlFor="npsn">NPSN</Label>
                <Input id="npsn" value={data?.npsn || ""} onChange={(e) => update("npsn", e.target.value)} placeholder="12345678" />
              </div>
              <div>
                <Label htmlFor="jenjang">Jenjang</Label>
                {jenjangOpts.length > 0 ? (
                  <Select
                    value={data?.jenjangId ? String(data.jenjangId) : ""}
                    onValueChange={(v) => {
                      const opt = jenjangOpts.find((j) => j.id === Number(v));
                      update("jenjangId", Number(v));
                      if (opt) update("jenjang", opt.kode); // sync legacy field
                    }}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih jenjang" /></SelectTrigger>
                    <SelectContent>
                      {jenjangOpts.map((j) => (
                        <SelectItem key={j.id} value={String(j.id)}>
                          <Badge className="bg-slate-700 text-white text-[10px] mr-2">{j.kode}</Badge>
                          {j.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select value={data?.jenjang || "SD"} onValueChange={(v) => update("jenjang", v)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {JENJANG_OPTS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Kelola daftar jenjang di menu <strong>Master Jenjang</strong>
                </p>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="yayasan">Yayasan</Label>
                {yayasanOpts.length > 0 ? (
                  <Select
                    value={data?.yayasanId ? String(data.yayasanId) : "_none"}
                    onValueChange={(v) => {
                      if (v === "_none") {
                        update("yayasanId", null);
                        update("yayasan", "");
                      } else {
                        const opt = yayasanOpts.find((y) => y.id === Number(v));
                        update("yayasanId", Number(v));
                        if (opt) update("yayasan", opt.nama); // sync legacy field
                      }
                    }}
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="Pilih yayasan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">(Tanpa yayasan)</SelectItem>
                      {yayasanOpts.map((y) => (
                        <SelectItem key={y.id} value={String(y.id)}>{y.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input id="yayasan" value={data?.yayasan || ""} onChange={(e) => update("yayasan", e.target.value)} placeholder="Yayasan Pendidikan ..." />
                )}
                <p className="text-[11px] text-slate-500 mt-1">
                  💡 Kelola daftar yayasan di menu <strong>Master Yayasan</strong>
                </p>
              </div>
              <div>
                <Label htmlFor="telepon">Telepon</Label>
                <Input id="telepon" value={data?.telepon || ""} onChange={(e) => update("telepon", e.target.value)} placeholder="(021) 1234567" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={data?.email || ""} onChange={(e) => update("email", e.target.value)} placeholder="sekolah@example.com" />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={data?.website || ""} onChange={(e) => update("website", e.target.value)} placeholder="https://sekolah.sch.id" />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="alamat">Alamat</Label>
            <Textarea id="alamat" value={data?.alamat || ""} onChange={(e) => update("alamat", e.target.value)} placeholder="Jl. Pendidikan No. 1, Kota" rows={2} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="kepala">Nama Kepala Sekolah</Label>
              <Input id="kepala" value={data?.kepalaSekolah || ""} onChange={(e) => update("kepalaSekolah", e.target.value)} placeholder="Drs. Budi Santoso, M.Pd." />
              <p className="text-[10px] text-slate-500 mt-1">Auto-terisi dari Riwayat Kepala Sekolah yang aktif.</p>
            </div>
            <div>
              <Label htmlFor="nipKepala">NIP Kepala Sekolah</Label>
              <Input id="nipKepala" value={data?.nipKepala || ""} onChange={(e) => update("nipKepala", e.target.value)} placeholder="196501011990031001" />
            </div>
          </div>

          <div>
            <Label htmlFor="desc">Deskripsi / Visi-Misi</Label>
            <Textarea id="desc" value={data?.description || ""} onChange={(e) => update("description", e.target.value)} placeholder="Visi, misi, atau deskripsi singkat sekolah" rows={4} />
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button onClick={handleSave} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan Data Sekolah
            </Button>
          </div>
        </CardContent>
      </Card>

      <RiwayatKepalaSekolahCard sekolahId={sekolahId} />
    </div>
  );
}

// ============ Riwayat Kepala Sekolah ============
function RiwayatKepalaSekolahCard({ sekolahId }: { sekolahId: string }) {
  const [list, setList] = useState<RiwayatKepala[]>([]);
  const [pegawaiList, setPegawaiList] = useState<PegawaiOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<RiwayatKepala> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<RiwayatKepala | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    if (!sekolahId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("sekolahId", sekolahId);
      const r = await fetch(`/api/riwayat-kepala-sekolah?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat riwayat kepala sekolah", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [sekolahId, toast]);

  useEffect(() => {
    if (!sekolahId) return;
    load();
    fetch(`/api/pegawai?sekolahId=${sekolahId}`).then((r) => r.json()).then((d: PegawaiOpt[]) => {
      if (Array.isArray(d)) setPegawaiList(d);
    }).catch(() => {});
  }, [sekolahId, load]);

  const handleAdd = () => {
    setEditing({ pegawaiId: undefined, tanggalMulai: new Date().toISOString().split("T")[0], status: "Aktif" });
    setDialogOpen(true);
  };
  const handleEdit = (r: RiwayatKepala) => { setEditing({ ...r, tanggalMulai: r.tanggalMulai ? new Date(r.tanggalMulai).toISOString().split("T")[0] : "", tanggalSelesai: r.tanggalSelesai ? new Date(r.tanggalSelesai).toISOString().split("T")[0] : "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!editing?.pegawaiId || !editing.tanggalMulai) {
      toast({ title: "Pegawai & tanggal mulai wajib", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const pegawai = pegawaiList.find((p) => p.id === Number(editing.pegawaiId));
      const payload: Record<string, unknown> = {
        pegawaiId: Number(editing.pegawaiId),
        namaSnapshot: pegawai?.nama || editing.namaSnapshot || "",
        nipSnapshot: pegawai?.nip || editing.nipSnapshot || null,
        tanggalMulai: editing.tanggalMulai,
        tanggalSelesai: editing.tanggalSelesai || null,
        status: editing.status || "Aktif",
        keterangan: editing.keterangan || null,
        sekolahId: sekolahId ? Number(sekolahId) : undefined,
      };
      const url = editing.id ? `/api/riwayat-kepala-sekolah/${editing.id}` : "/api/riwayat-kepala-sekolah";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Riwayat diperbarui" : "Riwayat ditambahkan" });
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/riwayat-kepala-sekolah/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Riwayat dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const update = (k: keyof RiwayatKepala, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  const fmtPeriode = (mulai?: string | null, selesai?: string | null) => {
    const m = mulai ? new Date(mulai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "-";
    const s = selesai ? new Date(selesai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "sekarang";
    return `${m} → ${s}`;
  };

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-800">
          <History className="h-5 w-5 text-slate-600" /> Riwayat Kepala Sekolah
        </CardTitle>
        <CardDescription>SCD Type 2 — penambahan kepala sekolah baru otomatis menutup periode sebelumnya</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-slate-500">Total {list.length} riwayat</p>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah Riwayat
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada riwayat kepala sekolah.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-10">No</th>
                  <th className="text-left px-3 py-2 font-medium">Nama</th>
                  <th className="text-left px-3 py-2 font-medium">NIP</th>
                  <th className="text-left px-3 py-2 font-medium">Periode</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.namaSnapshot}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{r.nipSnapshot || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{fmtPeriode(r.tanggalMulai, r.tanggalSelesai)}</td>
                    <td className="px-3 py-2">
                      {r.status === "Aktif"
                        ? <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>
                        : <Badge className="bg-slate-200 text-slate-600 text-[10px]">Selesai</Badge>}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Riwayat" : "Tambah Riwayat Kepala Sekolah"}</DialogTitle>
            <DialogDescription>Pilih pegawai (jabatan Kepala). Riwayat aktif sebelumnya akan otomatis ditutup.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <div>
                <Label className="text-sm">Pegawai (Kepala Sekolah) *</Label>
                <Select
                  value={editing.pegawaiId ? String(editing.pegawaiId) : ""}
                  onValueChange={(v) => {
                    const pg = pegawaiList.find((p) => p.id === Number(v));
                    update("pegawaiId", Number(v));
                    if (pg) {
                      update("namaSnapshot", pg.nama);
                      update("nipSnapshot", pg.nip || null);
                    }
                  }}
                >
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                  <SelectContent>
                    {pegawaiList.length === 0 ? (
                      <SelectItem value="_none" disabled>Belum ada pegawai</SelectItem>
                    ) : pegawaiList.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.nama}{p.jabatan ? ` (${p.jabatan})` : ""}{p.nip ? ` — NIP: ${p.nip}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Tanggal Mulai *</Label>
                  <Input type="date" value={editing.tanggalMulai || ""} onChange={(e) => update("tanggalMulai", e.target.value)} />
                </div>
                <div>
                  <Label className="text-sm">Tanggal Selesai</Label>
                  <Input type="date" value={editing.tanggalSelesai || ""} onChange={(e) => update("tanggalSelesai", e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-sm">Status</Label>
                <Select value={editing.status || "Aktif"} onValueChange={(v) => update("status", v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Selesai">Selesai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Keterangan</Label>
                <Input value={editing.keterangan || ""} onChange={(e) => update("keterangan", e.target.value)} placeholder="cth: Periode 2020-2025" />
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

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus riwayat?</AlertDialogTitle>
            <AlertDialogDescription>
              Riwayat <b>{delTarget?.namaSnapshot}</b> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export default SekolahSection;
