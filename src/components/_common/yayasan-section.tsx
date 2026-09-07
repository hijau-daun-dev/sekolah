"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Plus, Pencil, Trash2, Loader2, SearchX, X, CheckCircle2, XCircle } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./image-upload";

interface Yayasan {
  id: number;
  nama: string;
  npsnYayasan?: string | null;
  alamat?: string | null;
  telepon?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  ketuaYayasan?: string | null;
  description?: string | null;
  statusAktif: boolean;
  _count?: { sekolahs: number };
  sekolahs?: Array<{ id: number; nama: string; jenjang: string; statusAktif: boolean }>;
}

export function YayasanSection() {
  const [list, setList] = useState<Yayasan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Yayasan>>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<Yayasan | null>(null);
  const [viewTarget, setViewTarget] = useState<Yayasan | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/yayasan");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat yayasan", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = () => {
    setEditing({ statusAktif: true });
    setDialogOpen(true);
  };

  const handleEdit = (y: Yayasan) => {
    setEditing({ ...y });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.nama?.trim()) {
      toast({ title: "Nama yayasan wajib", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/yayasan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal simpan");
      toast({ title: editing.id ? "Yayasan diupdate" : "Yayasan dibuat" });
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
      const r = await fetch(`/api/yayasan/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal hapus");
      toast({ title: "Yayasan dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal hapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const handleView = async (y: Yayasan) => {
    try {
      const r = await fetch(`/api/yayasan/${y.id}`);
      const d = await r.json();
      if (r.ok) setViewTarget(d);
    } catch {
      toast({ title: "Gagal memuat detail", variant: "destructive" });
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Master Yayasan
            </h3>
            <p className="text-xs text-slate-500">Kelola data yayasan pembina sekolah + upload logo</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah Yayasan
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada yayasan. Klik "Tambah Yayasan" untuk membuat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {list.map((y) => (
              <div key={y.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {y.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={y.logoUrl} alt={y.nama} className="h-16 w-16 rounded-lg object-contain border border-slate-200 bg-white" />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Building2 className="h-8 w-8 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-800 truncate">{y.nama}</h4>
                      {y.statusAktif ? (
                        <Badge className="bg-emerald-100 text-emerald-700 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" /> Aktif</Badge>
                      ) : (
                        <Badge className="bg-slate-200 text-slate-600 text-[10px]"><XCircle className="h-3 w-3 mr-0.5" /> Nonaktif</Badge>
                      )}
                    </div>
                    {y.ketuaYayasan && <p className="text-xs text-slate-500 mb-1">Ketua: {y.ketuaYayasan}</p>}
                    {y.alamat && <p className="text-xs text-slate-500 truncate">{y.alamat}</p>}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500">
                      <span>{y._count?.sekolahs || 0} sekolah</span>
                      {y.telepon && <span>• {y.telepon}</span>}
                      {y.email && <span className="truncate">• {y.email}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 mt-3 pt-3 border-t border-slate-100">
                  <Button size="sm" variant="outline" onClick={() => handleView(y)} className="text-xs h-7">Lihat</Button>
                  <Button size="sm" variant="outline" onClick={() => handleEdit(y)} className="text-xs h-7">
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setDelTarget(y)} className="text-xs h-7 text-rose-600 hover:text-rose-700">
                    <Trash2 className="h-3 w-3 mr-1" /> Hapus
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dialog Add/Edit */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Yayasan" : "Tambah Yayasan"}</DialogTitle>
              <DialogDescription>Kelola data yayasan pembina sekolah</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Logo Yayasan</Label>
                <ImageUpload
                  value={editing.logoUrl || ""}
                  onChange={(url) => setEditing((p) => ({ ...p, logoUrl: url }))}
                />
              </div>
              <div>
                <Label className="text-sm">Nama Yayasan *</Label>
                <Input value={editing.nama || ""} onChange={(e) => setEditing((p) => ({ ...p, nama: e.target.value }))} placeholder="Yayasan Pendidikan Al-Hidayah" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">NPSN Yayasan</Label>
                  <Input value={editing.npsnYayasan || ""} onChange={(e) => setEditing((p) => ({ ...p, npsnYayasan: e.target.value }))} placeholder="12345678" />
                </div>
                <div>
                  <Label className="text-sm">Ketua Yayasan</Label>
                  <Input value={editing.ketuaYayasan || ""} onChange={(e) => setEditing((p) => ({ ...p, ketuaYayasan: e.target.value }))} placeholder="H. Abdullah" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Alamat</Label>
                <Textarea value={editing.alamat || ""} onChange={(e) => setEditing((p) => ({ ...p, alamat: e.target.value }))} placeholder="Jl. Pondok Aren No. 1, Tangerang Selatan" rows={2} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm">Telepon</Label>
                  <Input value={editing.telepon || ""} onChange={(e) => setEditing((p) => ({ ...p, telepon: e.target.value }))} placeholder="(021) 1234567" />
                </div>
                <div>
                  <Label className="text-sm">Email</Label>
                  <Input type="email" value={editing.email || ""} onChange={(e) => setEditing((p) => ({ ...p, email: e.target.value }))} placeholder="info@yayasan.org" />
                </div>
                <div>
                  <Label className="text-sm">Website</Label>
                  <Input value={editing.website || ""} onChange={(e) => setEditing((p) => ({ ...p, website: e.target.value }))} placeholder="https://yayasan.org" />
                </div>
              </div>
              <div>
                <Label className="text-sm">Deskripsi</Label>
                <Textarea value={editing.description || ""} onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))} placeholder="Visi/misi yayasan, sejarah, dll" rows={3} />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="statusAktif"
                  checked={editing.statusAktif !== false}
                  onChange={(e) => setEditing((p) => ({ ...p, statusAktif: e.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <Label htmlFor="statusAktif" className="text-sm">Status Aktif</Label>
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

        {/* Dialog View (list sekolah di bawah yayasan) */}
        <Dialog open={!!viewTarget} onOpenChange={(v) => !v && setViewTarget(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detail Yayasan</DialogTitle>
            </DialogHeader>
            {viewTarget && (
              <div className="space-y-3">
                <div className="flex items-start gap-4">
                  {viewTarget.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={viewTarget.logoUrl} alt={viewTarget.nama} className="h-20 w-20 rounded-lg object-contain border border-slate-200 bg-white" />
                  ) : (
                    <div className="h-20 w-20 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Building2 className="h-10 w-10 text-slate-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">{viewTarget.nama}</h3>
                    {viewTarget.ketuaYayasan && <p className="text-sm text-slate-600">Ketua: {viewTarget.ketuaYayasan}</p>}
                    {viewTarget.npsnYayasan && <p className="text-xs text-slate-500">NPSN: {viewTarget.npsnYayasan}</p>}
                  </div>
                </div>
                {viewTarget.alamat && <div className="text-sm"><span className="text-slate-500">Alamat:</span> {viewTarget.alamat}</div>}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {viewTarget.telepon && <div><span className="text-slate-500">Telepon:</span> {viewTarget.telepon}</div>}
                  {viewTarget.email && <div><span className="text-slate-500">Email:</span> {viewTarget.email}</div>}
                  {viewTarget.website && <div className="col-span-2"><span className="text-slate-500">Website:</span> {viewTarget.website}</div>}
                </div>
                {viewTarget.description && (
                  <div className="text-sm border-t border-slate-100 pt-2">
                    <div className="text-slate-500 mb-1">Deskripsi:</div>
                    <p className="text-slate-700 whitespace-pre-wrap">{viewTarget.description}</p>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-3">
                  <div className="text-sm font-semibold text-slate-700 mb-2">
                    Sekolah di bawah Yayasan ({viewTarget.sekolahs?.length || 0})
                  </div>
                  {viewTarget.sekolahs && viewTarget.sekolahs.length > 0 ? (
                    <div className="space-y-1">
                      {viewTarget.sekolahs.map((s) => (
                        <div key={s.id} className="flex items-center justify-between border border-slate-200 rounded-md px-3 py-2 text-sm">
                          <div>
                            <span className="font-medium">{s.nama}</span>
                            <Badge className="ml-2 bg-slate-100 text-slate-600 text-[10px]">{s.jenjang}</Badge>
                          </div>
                          {s.statusAktif ? (
                            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Aktif</Badge>
                          ) : (
                            <Badge className="bg-slate-200 text-slate-600 text-[10px]">Nonaktif</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">Belum ada sekolah terdaftar di yayasan ini.</p>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewTarget(null)}>Tutup</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Yayasan?</AlertDialogTitle>
              <AlertDialogDescription>
                Yakin ingin menghapus yayasan <strong>{delTarget?.nama}</strong>?
                Tindakan ini tidak bisa dibatalkan. Yayasan yang masih punya sekolah aktif tidak bisa dihapus.
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
