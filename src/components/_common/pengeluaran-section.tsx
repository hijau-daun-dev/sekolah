"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Plus, Pencil, Trash2, Loader2, SearchX, ImageIcon } from "lucide-react";
import Image from "next/image";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./image-upload";
import { fmtIDR, fmtDateDisplay, toDateISO } from "./_format";

interface PosAnggaranOpt { id: number; nama: string; kode?: string | null; jenis: string }
interface Pengeluaran {
  id: number;
  tanggal: string;
  nominal: number;
  keterangan: string;
  buktiNotaUrl?: string | null;
  posAnggaran: { id: number; nama: string; kode?: string | null; jenis: string };
  pegawai: { id: number; nama: string; jabatan?: string | null } | null;
}

export function PengeluaranSection() {
  const [list, setList] = useState<Pengeluaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState<string>("all");
  const [posOpts, setPosOpts] = useState<PosAnggaranOpt[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Pengeluaran>>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Pengeluaran | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/pos-anggaran")
      .then((r) => r.json())
      .then((d: PosAnggaranOpt[]) => {
        if (Array.isArray(d)) setPosOpts(d.filter((x) => x.jenis === "Pengeluaran"));
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pengeluaran");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat pengeluaran", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    let arr = list;
    if (filterPos !== "all") arr = arr.filter((p) => p.posAnggaran.id === Number(filterPos));
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter((p) =>
        p.keterangan.toLowerCase().includes(q) ||
        p.posAnggaran.nama.toLowerCase().includes(q) ||
        (p.pegawai?.nama || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [list, search, filterPos]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = list.filter((p) => {
      const d = new Date(p.tanggal);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisYear = list.filter((p) => new Date(p.tanggal).getFullYear() === now.getFullYear());
    const byPos: Record<string, number> = {};
    thisMonth.forEach((p) => {
      byPos[p.posAnggaran.nama] = (byPos[p.posAnggaran.nama] || 0) + p.nominal;
    });
    return {
      thisMonth: thisMonth.reduce((s, p) => s + p.nominal, 0),
      thisYear: thisYear.reduce((s, p) => s + p.nominal, 0),
      byPos,
    };
  }, [list]);

  const handleAdd = () => {
    setEditing({
      tanggal: new Date().toISOString().split("T")[0],
      nominal: "",
      keterangan: "",
      buktiNotaUrl: null,
    });
    setDialogOpen(true);
  };
  const handleEdit = (p: Pengeluaran) => {
    setEditing({
      ...p,
      tanggal: new Date(p.tanggal).toISOString().split("T")[0],
      posAnggaranId: p.posAnggaran.id,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.posAnggaranId || !editing.nominal || !editing.keterangan) {
      toast({ title: "Lengkapi field wajib", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        posAnggaranId: Number(editing.posAnggaranId),
        tanggal: toDateISO(editing.tanggal as string),
        nominal: Number(editing.nominal),
        keterangan: editing.keterangan,
        buktiNotaUrl: editing.buktiNotaUrl || null,
      };
      const url = editing.id ? `/api/pengeluaran/${editing.id}` : "/api/pengeluaran";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "Pengeluaran diperbarui" : "Pengeluaran ditambahkan" });
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
      const r = await fetch(`/api/pengeluaran/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Pengeluaran dihapus" });
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
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Pengeluaran Kas
            </h3>
            <p className="text-xs text-slate-500">Catat kas keluar + upload bukti nota</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Total Bulan Ini</div>
            <div className="text-base font-bold text-rose-700">{fmtIDR(stats.thisMonth)}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Total Tahun Ini</div>
            <div className="text-base font-bold text-slate-800">{fmtIDR(stats.thisYear)}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500 mb-1">Per Pos Anggaran (Bulan Ini)</div>
            <div className="space-y-0.5 max-h-16 overflow-y-auto">
              {Object.entries(stats.byPos).length === 0 ? (
                <div className="text-[10px] text-slate-400">-</div>
              ) : Object.entries(stats.byPos).map(([k, v]) => (
                <div key={k} className="flex justify-between text-[10px]">
                  <span className="text-slate-600 truncate mr-2">{k}</span>
                  <span className="font-medium text-slate-700">{fmtIDR(v)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <Input placeholder="Cari keterangan / pos / petugas..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
          </div>
          <Select value={filterPos} onValueChange={setFilterPos}>
            <SelectTrigger className="w-full sm:w-56 h-9"><SelectValue placeholder="Pos Anggaran" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Pos</SelectItem>
              {posOpts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada pengeluaran.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Tanggal</th>
                  <th className="text-left px-3 py-2 font-medium">Pos Anggaran</th>
                  <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                  <th className="text-left px-3 py-2 font-medium">Nominal</th>
                  <th className="text-left px-3 py-2 font-medium">Nota</th>
                  <th className="text-left px-3 py-2 font-medium">Petugas</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-600">{fmtDateDisplay(p.tanggal)}</td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="text-[10px]">{p.posAnggaran.nama}</Badge>
                    </td>
                    <td className="px-3 py-2 text-slate-700 max-w-xs">
                      <div className="truncate" title={p.keterangan}>{p.keterangan}</div>
                    </td>
                    <td className="px-3 py-2 font-medium text-rose-700">{fmtIDR(p.nominal)}</td>
                    <td className="px-3 py-2">
                      {p.buktiNotaUrl ? (
                        <a href={p.buktiNotaUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                          <div className="relative h-10 w-10 rounded overflow-hidden border border-slate-200">
                            <Image src={p.buktiNotaUrl} alt="Nota" fill unoptimized className="object-cover" />
                          </div>
                        </a>
                      ) : (
                        <ImageIcon className="h-4 w-4 text-slate-300" />
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{p.pegawai?.nama || "-"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing({}); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</DialogTitle>
            <DialogDescription>Catat pengeluaran kas sekolah</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div className="sm:col-span-2">
              <Label className="text-sm">Pos Anggaran *</Label>
              <Select value={String(editing.posAnggaranId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, posAnggaranId: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih pos anggaran" /></SelectTrigger>
                <SelectContent>
                  {posOpts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Tanggal *</Label>
              <Input type="date" value={String(editing.tanggal ?? "")} onChange={(e) => setEditing((p) => ({ ...p, tanggal: e.target.value }))} />
            </div>
            <div>
              <Label className="text-sm">Nominal (Rp) *</Label>
              <Input type="number" min={0} value={String(editing.nominal ?? "")} onChange={(e) => setEditing((p) => ({ ...p, nominal: e.target.value }))} placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-sm">Keterangan *</Label>
              <Textarea value={String(editing.keterangan ?? "")} onChange={(e) => setEditing((p) => ({ ...p, keterangan: e.target.value }))} placeholder="Keterangan pengeluaran..." rows={2} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-sm">Bukti Nota</Label>
              <ImageUpload
                value={editing.buktiNotaUrl ?? null}
                onChange={(url) => setEditing((p) => ({ ...p, buktiNotaUrl: url }))}
                shape="rounded"
                size="md"
              />
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

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengeluaran?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus pengeluaran {fmtIDR(delTarget?.nominal || 0)}? Tindakan tidak dapat dibatalkan.
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

export default PengeluaranSection;
