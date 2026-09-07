"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageOpen, Plus, Undo2, Loader2, SearchX, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { fmtDateDisplay, toDateISO } from "./_format";
import { useSekolahFilter, SekolahFilterDropdown } from "@/lib/use-sekolah-filter";

interface BarangOpt {
  id: number; nama: string; kode?: string | null; status: string;
  kategoriBarang?: { nama: string } | null;
  ruangan?: { nama: string } | null;
}
interface Peminjaman {
  id: number;
  tanggalPinjam: string;
  tanggalKembaliRencana: string;
  tanggalKembaliAktual?: string | null;
  kondisiKembali?: string | null;
  status: string;
  keterangan?: string | null;
  barang: {
    id: number; nama: string; kode?: string | null; status: string; kondisi: string;
    kategoriBarang?: { nama: string } | null;
    ruangan?: { nama: string } | null;
  };
  pegawai: { id: number; nama: string; jabatan?: string | null } | null;
}

export function PeminjamanSection() {
  const sekolahFilter = useSekolahFilter();
  const [list, setList] = useState<Peminjaman[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [barangOpts, setBarangOpts] = useState<BarangOpt[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBarangId, setSelectedBarangId] = useState<string>("");
  const [tglKembali, setTglKembali] = useState<string>("");
  const [keterangan, setKeterangan] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [returnTarget, setReturnTarget] = useState<Peminjaman | null>(null);
  const [returnKondisi, setReturnKondisi] = useState<string>("Baik");
  const [returnKet, setReturnKet] = useState<string>("");
  const [returning, setReturning] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (sekolahFilter.effectiveSekolahId) params.set("sekolahId", String(sekolahFilter.effectiveSekolahId));
      const r = await fetch(`/api/peminjaman?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat peminjaman", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, sekolahFilter.effectiveSekolahId, toast]);

  useEffect(() => { load(); }, [load]);

  const loadBarang = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (sekolahFilter.effectiveSekolahId) params.set("sekolahId", String(sekolahFilter.effectiveSekolahId));
      const r = await fetch(`/api/barang?${params.toString()}`);
      const d = await r.json();
      if (Array.isArray(d)) setBarangOpts(d.filter((b: BarangOpt) => b.status === "Tersedia"));
    } catch {
      toast({ title: "Gagal memuat barang", variant: "destructive" });
    }
  }, [sekolahFilter.effectiveSekolahId, toast]);

  const handleOpen = () => {
    setSelectedBarangId("");
    setTglKembali("");
    setKeterangan("");
    setDialogOpen(true);
    loadBarang();
  };

  const stats = useMemo(() => {
    const dipinjam = list.filter((p) => p.status === "Dipinjam").length;
    const dikembalikan = list.filter((p) => p.status === "Dikembalikan").length;
    return { dipinjam, dikembalikan, total: list.length };
  }, [list]);

  const handleSave = async () => {
    if (!selectedBarangId || !tglKembali) {
      toast({ title: "Lengkapi field wajib", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/peminjaman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barangId: Number(selectedBarangId),
          tanggalKembaliRencana: toDateISO(tglKembali),
          keterangan: keterangan || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: "Peminjaman ditambahkan" });
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReturn = async () => {
    if (!returnTarget) return;
    setReturning(true);
    try {
      const r = await fetch(`/api/peminjaman/${returnTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "return",
          kondisiKembali: returnKondisi,
          keterangan: returnKet || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal mengembalikan");
      toast({ title: "Barang dikembalikan" });
      setReturnTarget(null);
      setReturnKondisi("Baik");
      setReturnKet("");
      await load();
    } catch (e) {
      toast({ title: "Gagal mengembalikan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setReturning(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <PackageOpen className="h-4 w-4" /> Peminjaman Barang
            </h3>
            <p className="text-xs text-slate-500">Peminjaman & pengembalian barang inventaris</p>
          </div>
          <Button size="sm" onClick={handleOpen} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Pinjam Barang
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="border border-slate-200 rounded-md p-3 text-center">
            <div className="text-xs text-slate-500">Dipinjam</div>
            <div className="text-base font-bold text-amber-700">{stats.dipinjam}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3 text-center">
            <div className="text-xs text-slate-500">Dikembalikan</div>
            <div className="text-base font-bold text-emerald-700">{stats.dikembalikan}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3 text-center">
            <div className="text-xs text-slate-500">Total</div>
            <div className="text-base font-bold text-slate-700">{stats.total}</div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <SearchX className="h-3.5 w-3.5" />
            <span className="font-medium">Filter Peminjaman:</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <SekolahFilterDropdown
              isSuperAdmin={sekolahFilter.isSuperAdmin}
              filterSekolah={sekolahFilter.filterSekolah}
              setFilterSekolah={sekolahFilter.setFilterSekolah}
              sekolahOpts={sekolahFilter.sekolahOpts}
            />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-56 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="Dipinjam">Dipinjam</SelectItem>
                <SelectItem value="Dikembalikan">Dikembalikan</SelectItem>
              </SelectContent>
            </Select>
            {(sekolahFilter.filterSekolah !== "all" || filterStatus !== "all") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  sekolahFilter.resetSekolahFilter();
                  setFilterStatus("all");
                }}
                className="text-xs h-9"
              >
                <X className="h-3.5 w-3.5 mr-1" /> Reset
              </Button>
            )}
          </div>
          {sekolahFilter.isSuperAdmin && sekolahFilter.filterSekolah !== "all" && (
            <div className="text-xs text-slate-500">
              Menampilkan peminjaman untuk sekolah: <span className="font-semibold text-slate-700">
                {sekolahFilter.sekolahOpts.find((s) => String(s.id) === sekolahFilter.filterSekolah)?.nama || sekolahFilter.filterSekolah}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada peminjaman.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Barang</th>
                  <th className="text-left px-3 py-2 font-medium">Peminjam</th>
                  <th className="text-left px-3 py-2 font-medium">Tgl Pinjam</th>
                  <th className="text-left px-3 py-2 font-medium">Rencana Kembali</th>
                  <th className="text-left px-3 py-2 font-medium">Aktual Kembali</th>
                  <th className="text-left px-3 py-2 font-medium">Kondisi</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-24">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {list.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{p.barang.nama}</div>
                      <div className="text-[10px] text-slate-500">
                        {p.barang.kode ? `Kode: ${p.barang.kode}` : ""}
                        {p.barang.ruangan?.nama ? ` · ${p.barang.ruangan.nama}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{p.pegawai?.nama || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{fmtDateDisplay(p.tanggalPinjam)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{fmtDateDisplay(p.tanggalKembaliRencana)}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{p.tanggalKembaliAktual ? fmtDateDisplay(p.tanggalKembaliAktual) : "-"}</td>
                    <td className="px-3 py-2">
                      {p.kondisiKembali ? (
                        <Badge className={p.kondisiKembali === "Baik" ? "bg-emerald-100 text-emerald-700 text-[10px]" : "bg-rose-100 text-rose-700 text-[10px]"}>
                          {p.kondisiKembali}
                        </Badge>
                      ) : "-"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={p.status === "Dipinjam" ? "bg-amber-100 text-amber-700 text-[10px]" : "bg-emerald-100 text-emerald-700 text-[10px]"}>
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {p.status === "Dipinjam" && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setReturnTarget(p); setReturnKondisi("Baik"); setReturnKet(p.keterangan || ""); }}>
                          <Undo2 className="h-3 w-3 mr-1" /> Kembalikan
                        </Button>
                      )}
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
            <DialogTitle>Pinjam Barang</DialogTitle>
            <DialogDescription>Pilih barang tersedia & tanggal kembali rencana</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Barang *</Label>
              {barangOpts.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">Tidak ada barang tersedia.</div>
              ) : (
                <Select value={selectedBarangId} onValueChange={setSelectedBarangId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih barang" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {barangOpts.map((b) => (
                      <SelectItem key={b.id} value={String(b.id)}>
                        {b.nama}{b.kode ? ` (${b.kode})` : ""}{b.ruangan?.nama ? ` - ${b.ruangan.nama}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-sm">Tanggal Kembali Rencana *</Label>
              <Input type="date" value={tglKembali} onChange={(e) => setTglKembali(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Keterangan</Label>
              <Textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} rows={2} placeholder="Keperluan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Pinjam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kembalikan Barang</DialogTitle>
            <DialogDescription>
              {returnTarget?.barang.nama} - dipinjam {returnTarget ? fmtDateDisplay(returnTarget.tanggalPinjam) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Kondisi Kembali *</Label>
              <Select value={returnKondisi} onValueChange={setReturnKondisi}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baik">Baik</SelectItem>
                  <SelectItem value="Rusak">Rusak</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Keterangan (opsional)</Label>
              <Textarea value={returnKet} onChange={(e) => setReturnKet(e.target.value)} rows={2} placeholder="Catatan kondisi/kerusakan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)}>Batal</Button>
            <Button onClick={handleReturn} disabled={returning} className="bg-slate-700 hover:bg-slate-800">
              {returning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Kembalikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default PeminjamanSection;
