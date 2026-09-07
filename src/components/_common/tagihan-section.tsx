"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Sparkles, Loader2, SearchX, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fmtIDR, fmtDateDisplay } from "./_format";
import { useSekolahFilter, JenjangSekolahFilterDropdowns } from "@/lib/use-sekolah-filter";

interface TahunOpt { id: number; nama: string; statusAktif: boolean }
interface JenisOpt { id: number; nama: string }

interface Tagihan {
  id: number;
  nominal: number;
  bulanTagihan?: string | null;
  statusLunas: boolean;
  tanggalJatuhTempo?: string | null;
  siswa: { id: number; nama: string; nis?: string | null };
  tarifPembayaran: {
    id: number; nominal: number; frekuensi: string;
    jenisPembayaran: { id: number; nama: string };
  };
  tahunAjaran: { id: number; nama: string };
  pembayarans?: { id: number }[];
}

const BULAN_LIST = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function TagihanSection() {
  const sekolahFilter = useSekolahFilter();
  const [list, setList] = useState<Tagihan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBulan, setFilterBulan] = useState<string>("all");

  const [genOpen, setGenOpen] = useState(false);
  const [tahunOpts, setTahunOpts] = useState<TahunOpt[]>([]);
  const [jenisOpts, setJenisOpts] = useState<JenisOpt[]>([]);
  const [genTahun, setGenTahun] = useState<string>("");
  const [genBulan, setGenBulan] = useState<string>("");
  const [genJenis, setGenJenis] = useState<string>("all");
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  // Reload TA + Jenis Pembayaran when sekolah changes
  useEffect(() => {
    if (!sekolahFilter.userRole) return;
    Promise.all([
      fetch(`/api/tahun-ajaran${sekolahFilter.sekolahQuery}`).then((r) => r.json()),
      fetch(`/api/jenis-pembayaran${sekolahFilter.sekolahQuery}`).then((r) => r.json()),
    ]).then(([t, j]: [TahunOpt[], JenisOpt[]]) => {
      if (Array.isArray(t)) {
        setTahunOpts(t);
        const aktif = t.find((x) => x.statusAktif);
        if (aktif) setGenTahun(String(aktif.id));
      }
      if (Array.isArray(j)) setJenisOpts(j);
    }).catch(() => {});
  }, [sekolahFilter.userRole, sekolahFilter.sekolahQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sekolahFilter.effectiveSekolahId) params.set("sekolahId", String(sekolahFilter.effectiveSekolahId));
      if (filterStatus === "lunas") params.set("statusLunas", "true");
      if (filterStatus === "belum") params.set("statusLunas", "false");
      if (filterBulan !== "all") params.set("bulanTagihan", filterBulan);
      const r = await fetch(`/api/tagihan?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat tagihan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [sekolahFilter.effectiveSekolahId, filterStatus, filterBulan, toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterStatus === "lunas") arr = arr.filter((t) => t.statusLunas);
    if (filterStatus === "belum") arr = arr.filter((t) => !t.statusLunas);
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((t) =>
        t.siswa.nama.toLowerCase().includes(q) ||
        (t.siswa.nis || "").toLowerCase().includes(q) ||
        (t.tarifPembayaran.jenisPembayaran.nama || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [list, search, filterStatus]);

  const stats = useMemo(() => {
    const outstanding = list.filter((t) => !t.statusLunas).reduce((s, t) => s + t.nominal, 0);
    const paid = list.filter((t) => t.statusLunas).reduce((s, t) => s + t.nominal, 0);
    return { outstanding, paid, total: list.length, lunasCount: list.filter((t) => t.statusLunas).length, belumCount: list.filter((t) => !t.statusLunas).length };
  }, [list]);

  const handleGenerate = async () => {
    if (!genTahun || !genBulan) {
      toast({ title: "Pilih tahun ajaran dan bulan", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const payload: Record<string, unknown> = {
        tahunAjaranId: Number(genTahun),
        bulanTagihan: genBulan,
      };
      if (genJenis !== "all") payload.jenisPembayaranId = Number(genJenis);
      const r = await fetch("/api/generate-tagihan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal generate");
      toast({ title: "Generate tagihan selesai", description: `${d.message} (created: ${d.created}, skipped: ${d.skipped})` });
      setGenOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Gagal generate", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Tagihan Siswa
            </h3>
            <p className="text-xs text-slate-500">Daftar tagihan & generate massal</p>
          </div>
          <Button size="sm" onClick={() => setGenOpen(true)} className="bg-slate-700 hover:bg-slate-800">
            <Sparkles className="h-4 w-4 mr-1" /> Generate Massal
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Total Outstanding</div>
            <div className="text-base font-bold text-rose-700">{fmtIDR(stats.outstanding)}</div>
            <div className="text-[10px] text-slate-500">{stats.belumCount} tagihan belum lunas</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Sudah Lunas</div>
            <div className="text-base font-bold text-emerald-700">{fmtIDR(stats.paid)}</div>
            <div className="text-[10px] text-slate-500">{stats.lunasCount} tagihan lunas</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Total Tagihan</div>
            <div className="text-base font-bold text-slate-700">{stats.total}</div>
            <div className="text-[10px] text-slate-500">seluruh record</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <SearchX className="h-3.5 w-3.5" />
            <span className="font-medium">Filter Tagihan:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <JenjangSekolahFilterDropdowns
              isSuperAdmin={sekolahFilter.isSuperAdmin}
              jenjangOpts={sekolahFilter.jenjangOpts}
              filterJenjang={sekolahFilter.filterJenjang}
              setFilterJenjang={sekolahFilter.setFilterJenjang}
              sekolahOpts={sekolahFilter.sekolahOpts}
              filterSekolah={sekolahFilter.filterSekolah}
              setFilterSekolah={sekolahFilter.setFilterSekolah}
              classNameJenjang="w-full sm:w-40 h-9"
              classNameSekolah="w-full sm:w-56 h-9"
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
                <SelectItem value="belum">Belum Lunas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterBulan} onValueChange={setFilterBulan}>
              <SelectTrigger className="w-full sm:w-44 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Bulan</SelectItem>
                {BULAN_LIST.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
              </svg>
              <Input placeholder="Cari siswa / NIS / jenis..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
            </div>
            {(sekolahFilter.filterSekolah !== "all" || filterStatus !== "all" || filterBulan !== "all" || search) && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  sekolahFilter.resetSekolahFilter();
                  setFilterStatus("all");
                  setFilterBulan("all");
                  setSearch("");
                }}
                className="text-xs h-9"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
          {sekolahFilter.isSuperAdmin && sekolahFilter.filterSekolah !== "all" && (
            <div className="text-xs text-slate-500">
              Menampilkan tagihan untuk sekolah: <span className="font-semibold text-slate-700">
                {sekolahFilter.sekolahOpts.find((s) => String(s.id) === sekolahFilter.filterSekolah)?.nama || sekolahFilter.filterSekolah}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada tagihan. Klik "Generate Massal" untuk membuat.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Siswa</th>
                  <th className="text-left px-3 py-2 font-medium">Jenis</th>
                  <th className="text-left px-3 py-2 font-medium">Bulan</th>
                  <th className="text-left px-3 py-2 font-medium">Nominal</th>
                  <th className="text-left px-3 py-2 font-medium">Jatuh Tempo</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{t.siswa.nama}</div>
                      <div className="text-[10px] text-slate-500">{t.siswa.nis || "-"}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{t.tarifPembayaran.jenisPembayaran.nama}</td>
                    <td className="px-3 py-2 text-slate-600">{t.bulanTagihan || "-"}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{fmtIDR(t.nominal)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{t.tanggalJatuhTempo ? fmtDateDisplay(t.tanggalJatuhTempo) : "-"}</td>
                    <td className="px-3 py-2">
                      <Badge className={t.statusLunas ? "bg-emerald-100 text-emerald-700 text-[10px]" : "bg-rose-100 text-rose-700 text-[10px]"}>
                        {t.statusLunas ? "Lunas" : "Belum"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Tagihan Massal</DialogTitle>
            <DialogDescription>
              Sistem akan membuat tagihan otomatis untuk semua siswa aktif berdasarkan tarif per tingkat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Tahun Ajaran *</Label>
              <Select value={genTahun} onValueChange={setGenTahun}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tahun ajaran" /></SelectTrigger>
                <SelectContent>
                  {tahunOpts.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nama}{t.statusAktif ? " (Aktif)" : ""}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Bulan Tagihan *</Label>
              <Select value={genBulan} onValueChange={setGenBulan}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih bulan" /></SelectTrigger>
                <SelectContent>
                  {BULAN_LIST.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Jenis Pembayaran</Label>
              <Select value={genJenis} onValueChange={setGenJenis}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Jenis</SelectItem>
                  {jenisOpts.map((j) => <SelectItem key={j.id} value={String(j.id)}>{j.nama}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-slate-500 mt-1">Pilih jenis spesifik atau semua</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Batal</Button>
            <Button onClick={handleGenerate} disabled={generating} className="bg-slate-700 hover:bg-slate-800">
              {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default TagihanSection;
