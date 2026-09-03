"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileBarChart, Plus, Printer, Loader2, SearchX } from "lucide-react";
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

interface Pembayaran {
  id: number;
  tanggalBayar: string;
  jumlahBayar: number;
  metodePembayaran: string;
  kodeKwitansi: string;
  keterangan?: string | null;
  tagihanSiswa: {
    id: number;
    nominal: number;
    bulanTagihan?: string | null;
    statusLunas: boolean;
    siswa: { id: number; nama: string; nis?: string | null };
    tarifPembayaran: { jenisPembayaran: { id: number; nama: string } };
  };
  pegawai: { id: number; nama: string; jabatan?: string | null } | null;
}

interface TagihanOpt {
  id: number;
  nominal: number;
  bulanTagihan?: string | null;
  statusLunas: boolean;
  siswa: { id: number; nama: string; nis?: string | null };
  tarifPembayaran: { jenisPembayaran: { id: number; nama: string } };
}

const METODE_LIST = ["Tunai", "Transfer", "Debit", "QRIS"];

export function PembayaranSection() {
  const [list, setList] = useState<Pembayaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tagihanOpts, setTagihanOpts] = useState<TagihanOpt[]>([]);
  const [selectedTagihanId, setSelectedTagihanId] = useState<string>("");
  const [jumlahBayar, setJumlahBayar] = useState<string>("");
  const [metode, setMetode] = useState<string>("Tunai");
  const [keterangan, setKeterangan] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [loadingOpts, setLoadingOpts] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/pembayaran");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat pembayaran", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const loadUnpaid = useCallback(async () => {
    setLoadingOpts(true);
    try {
      const r = await fetch("/api/tagihan?statusLunas=false");
      const d = await r.json();
      if (Array.isArray(d)) setTagihanOpts(d);
    } catch {
      toast({ title: "Gagal memuat tagihan", variant: "destructive" });
    } finally {
      setLoadingOpts(false);
    }
  }, [toast]);

  const handleOpenDialog = () => {
    setSelectedTagihanId("");
    setJumlahBayar("");
    setMetode("Tunai");
    setKeterangan("");
    setDialogOpen(true);
    loadUnpaid();
  };

  // When user selects a tagihan, auto-fill jumlahBayar with nominal
  useEffect(() => {
    if (selectedTagihanId) {
      const t = tagihanOpts.find((x) => x.id === Number(selectedTagihanId));
      if (t) setJumlahBayar(String(t.nominal));
    }
  }, [selectedTagihanId, tagihanOpts]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((p) =>
      p.kodeKwitansi.toLowerCase().includes(q) ||
      p.tagihanSiswa.siswa.nama.toLowerCase().includes(q) ||
      (p.tagihanSiswa.siswa.nis || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  const totalHariIni = useMemo(() => {
    const today = new Date().toDateString();
    return list.filter((p) => new Date(p.tanggalBayar).toDateString() === today)
      .reduce((s, p) => s + p.jumlahBayar, 0);
  }, [list]);

  const handleSave = async () => {
    if (!selectedTagihanId) {
      toast({ title: "Pilih tagihan", variant: "destructive" });
      return;
    }
    if (!jumlahBayar || Number(jumlahBayar) <= 0) {
      toast({ title: "Jumlah bayar harus > 0", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/pembayaran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagihanSiswaId: Number(selectedTagihanId),
          jumlahBayar: Number(jumlahBayar),
          metodePembayaran: metode,
          keterangan: keterangan || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: "Pembayaran tersimpan", description: `Kode: ${d.kodeKwitansi}` });
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleCetak = (id: number) => {
    window.open(`/api/pembayaran/${id}/kwitansi`, "_blank");
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileBarChart className="h-4 w-4" /> Pembayaran
            </h3>
            <p className="text-xs text-slate-500">Input pembayaran + cetak kwitansi PDF</p>
          </div>
          <Button size="sm" onClick={handleOpenDialog} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Input Pembayaran
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Total Penerimaan Hari Ini</div>
            <div className="text-base font-bold text-slate-800">{fmtIDR(totalHariIni)}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Total Transaksi</div>
            <div className="text-base font-bold text-slate-700">{list.length}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3">
            <div className="text-xs text-slate-500">Total Nominal</div>
            <div className="text-base font-bold text-slate-800">{fmtIDR(list.reduce((s, p) => s + p.jumlahBayar, 0))}</div>
          </div>
        </div>

        <div className="relative w-full max-w-md">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <Input placeholder="Cari kode kwitansi / siswa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada pembayaran.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Tanggal</th>
                  <th className="text-left px-3 py-2 font-medium">Kode Kwitansi</th>
                  <th className="text-left px-3 py-2 font-medium">Siswa</th>
                  <th className="text-left px-3 py-2 font-medium">Jenis</th>
                  <th className="text-left px-3 py-2 font-medium">Jumlah</th>
                  <th className="text-left px-3 py-2 font-medium">Metode</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium w-16">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-600">{fmtDateDisplay(p.tanggalBayar)}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px] font-mono">{p.kodeKwitansi}</Badge></td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{p.tagihanSiswa.siswa.nama}</div>
                      <div className="text-[10px] text-slate-500">{p.tagihanSiswa.siswa.nis || "-"}</div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{p.tagihanSiswa.tarifPembayaran.jenisPembayaran.nama}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{fmtIDR(p.jumlahBayar)}</td>
                    <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{p.metodePembayaran}</Badge></td>
                    <td className="px-3 py-2">
                      <Badge className={p.tagihanSiswa.statusLunas ? "bg-emerald-100 text-emerald-700 text-[10px]" : "bg-rose-100 text-rose-700 text-[10px]"}>
                        {p.tagihanSiswa.statusLunas ? "Lunas" : "Belum"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCetak(p.id)} title="Cetak Kwitansi">
                        <Printer className="h-3.5 w-3.5" />
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Input Pembayaran</DialogTitle>
            <DialogDescription>Pilih tagihan belum lunas, isi jumlah & metode</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-sm">Tagihan *</Label>
              {loadingOpts ? (
                <div className="flex items-center gap-2 text-xs text-slate-500 py-2"><Loader2 className="h-3 w-3 animate-spin" /> Memuat tagihan...</div>
              ) : tagihanOpts.length === 0 ? (
                <div className="text-xs text-slate-500 py-2">Tidak ada tagihan belum lunas.</div>
              ) : (
                <Select value={selectedTagihanId} onValueChange={setSelectedTagihanId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih tagihan" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {tagihanOpts.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.siswa.nama} - {t.tarifPembayaran.jenisPembayaran.nama} ({t.bulanTagihan || "Sekali"}) - {fmtIDR(t.nominal)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label className="text-sm">Jumlah Bayar *</Label>
              <Input type="number" min={0} value={jumlahBayar} onChange={(e) => setJumlahBayar(e.target.value)} placeholder="Rp" />
              {selectedTagihanId && (
                <p className="text-[10px] text-slate-500 mt-1">
                  Nominal tagihan: {fmtIDR(tagihanOpts.find((x) => x.id === Number(selectedTagihanId))?.nominal || 0)}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm">Metode Pembayaran *</Label>
              <Select value={metode} onValueChange={setMetode}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METODE_LIST.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">Keterangan</Label>
              <Input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Catatan tambahan..." />
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
    </Card>
  );
}

export default PembayaranSection;
