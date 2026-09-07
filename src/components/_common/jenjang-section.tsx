"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, Plus, Pencil, Trash2, Loader2, SearchX, CheckCircle2, XCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";

interface Jenjang {
  id: number;
  kode: string;
  nama: string;
  urutan: number;
  keterangan?: string | null;
  statusAktif: boolean;
  _count?: { sekolahs: number };
}

export function JenjangSection() {
  const [list, setList] = useState<Jenjang[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Jenjang>>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Jenjang | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/jenjang");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat jenjang", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = () => {
    setEditing({ urutan: 1, statusAktif: true });
    setDialogOpen(true);
  };

  const handleEdit = (j: Jenjang) => {
    setEditing({ ...j });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.kode?.trim()) {
      toast({ title: "Kode jenjang wajib", variant: "destructive" });
      return;
    }
    if (!editing.nama?.trim()) {
      toast({ title: "Nama jenjang wajib", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const url = editing.id ? `/api/jenjang/${editing.id}` : "/api/jenjang";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal simpan");
      toast({ title: editing.id ? "Jenjang diupdate" : "Jenjang dibuat" });
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Gagal simpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`/api/jenjang/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal hapus");
      toast({ title: "Jenjang dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal hapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  // Group by urutan for display
  const grouped: Record<number, Jenjang[]> = {};
  list.forEach((j) => {
    const u = j.urutan || 0;
    if (!grouped[u]) grouped[u] = [];
    grouped[u].push(j);
  });
  const urutanLabels: Record<number, string> = {
    1: "Dasar (Setara SD/MI)",
    2: "Menengah Pertama (Setara SMP/MTs)",
    3: "Menengah Atas (Setara SMA/MA/SMK)",
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Layers className="h-4 w-4" /> Master Jenjang Pendidikan
            </h3>
            <p className="text-xs text-slate-500">Pilihan jenjang: SD/MI, SMP/MTs, SMA/MA/SMK. Dipakai saat input sekolah.</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah Jenjang
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada jenjang.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map((urutan) => {
              const u = Number(urutan);
              return (
                <div key={u}>
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    {urutanLabels[u] || `Urutan ${u}`}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {grouped[u].map((j) => (
                      <div key={j.id} className="border border-slate-200 rounded-md p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-slate-700 text-white text-xs">{j.kode}</Badge>
                              {j.statusAktif ? (
                                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Aktif</Badge>
                              ) : (
                                <Badge className="bg-slate-200 text-slate-600 text-[10px]"><XCircle className="h-3 w-3 mr-0.5" /> Nonaktif</Badge>
                              )}
                            </div>
                            <div className="text-sm font-medium text-slate-800 mt-1">{j.nama}</div>
                            {j.keterangan && <div className="text-xs text-slate-500 mt-1">{j.keterangan}</div>}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 mb-2">{j._count?.sekolahs || 0} sekolah memakai jenjang ini</div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(j)} className="text-xs h-7 flex-1">
                            <Pencil className="h-3 w-3 mr-1" /> Edit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDelTarget(j)} className="text-xs h-7 text-rose-600 hover:text-rose-700">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Dialog Add/Edit */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Jenjang" : "Tambah Jenjang"}</DialogTitle>
              <DialogDescription>Master jenjang pendidikan</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Kode *</Label>
                <Input
                  value={editing.kode || ""}
                  onChange={(e) => setEditing((p) => ({ ...p, kode: e.target.value.toUpperCase() }))}
                  placeholder="SD, MI, SMP, MTs, MA, SMA, SMK"
                  maxLength={10}
                />
                <p className="text-[11px] text-slate-500 mt-1">Kode unik, contoh: SD, MI, SMP</p>
              </div>
              <div>
                <Label className="text-sm">Nama Lengkap *</Label>
                <Input
                  value={editing.nama || ""}
                  onChange={(e) => setEditing((p) => ({ ...p, nama: e.target.value }))}
                  placeholder="Sekolah Dasar / Madrasah Ibtidaiyah"
                />
              </div>
              <div>
                <Label className="text-sm">Urutan</Label>
                <Input
                  type="number"
                  min={0}
                  value={editing.urutan ?? 1}
                  onChange={(e) => setEditing((p) => ({ ...p, urutan: Number(e.target.value) }))}
                />
                <p className="text-[11px] text-slate-500 mt-1">1=Dasar, 2=Menengah Pertama, 3=Menengah Atas</p>
              </div>
              <div>
                <Label className="text-sm">Keterangan</Label>
                <Input
                  value={editing.keterangan || ""}
                  onChange={(e) => setEditing((p) => ({ ...p, keterangan: e.target.value }))}
                  placeholder="Deskripsi singkat jenjang"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="jenjangStatusAktif"
                  checked={editing.statusAktif !== false}
                  onChange={(e) => setEditing((p) => ({ ...p, statusAktif: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="jenjangStatusAktif" className="text-sm">Status Aktif</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Simpan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Jenjang?</AlertDialogTitle>
              <AlertDialogDescription>
                Yakin ingin menghapus jenjang <strong>{delTarget?.kode} - {delTarget?.nama}</strong>?
                Jenjang yang masih dipakai oleh sekolah tidak bisa dihapus.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
