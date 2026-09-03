"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Save, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { toDateISO } from "./_format";

interface PegawaiOpt { id: number; nama: string; nip?: string | null; jabatan?: string | null }
interface AbsensiRow {
  id?: number;
  pegawaiId: number;
  pegawaiNama: string;
  nip?: string | null;
  jabatan?: string | null;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa" | "Cuti";
  jamMasuk: string;
  jamPulang: string;
  keterangan?: string | null;
}

const STATUS_LIST = ["Hadir", "Sakit", "Izin", "Alpa", "Cuti"] as const;
const STATUS_COLOR: Record<string, string> = {
  Hadir: "bg-emerald-100 text-emerald-700",
  Sakit: "bg-amber-100 text-amber-700",
  Izin: "bg-sky-100 text-sky-700",
  Alpa: "bg-rose-100 text-rose-700",
  Cuti: "bg-violet-100 text-violet-700",
};

export function AbsensiPegawaiSection() {
  const [pegawaiOpts, setPegawaiOpts] = useState<PegawaiOpt[]>([]);
  const [tanggal, setTanggal] = useState<string>(new Date().toISOString().split("T")[0]);
  const [rows, setRows] = useState<AbsensiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/pegawai")
      .then((r) => r.json())
      .then((d: PegawaiOpt[]) => { if (Array.isArray(d)) setPegawaiOpts(d); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!tanggal) return;
    setLoading(true);
    try {
      const [absensiRes] = await Promise.all([
        fetch(`/api/absensi-pegawai?tanggal=${tanggal}`).then((r) => r.json()),
      ]);
      const absensi: Array<{
        id: number; pegawaiId: number; status: string;
        jamMasuk?: string | null; jamPulang?: string | null; keterangan?: string | null;
        pegawai?: PegawaiOpt;
      }> = Array.isArray(absensiRes) ? absensiRes : [];
      const absMap = new Map(absensi.map((a) => [a.pegawaiId, a]));

      const built: AbsensiRow[] = pegawaiOpts
        .filter((p) => p.jabatan !== "Pensiun" && p.jabatan !== "Resign")
        .map((p) => {
          const ex = absMap.get(p.id);
          return {
            id: ex?.id,
            pegawaiId: p.id,
            pegawaiNama: p.nama,
            nip: p.nip || null,
            jabatan: p.jabatan || null,
            status: (ex?.status as AbsensiRow["status"]) || "Hadir",
            jamMasuk: ex?.jamMasuk ? new Date(ex.jamMasuk).toTimeString().slice(0, 5) : "",
            jamPulang: ex?.jamPulang ? new Date(ex.jamPulang).toTimeString().slice(0, 5) : "",
            keterangan: ex?.keterangan || "",
          };
        })
        .sort((a, b) => a.pegawaiNama.localeCompare(b.pegawaiNama));
      setRows(built);
    } catch {
      toast({ title: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [tanggal, pegawaiOpts, toast]);

  useEffect(() => { if (tanggal) load(); }, [load, tanggal]);

  const updateRow = (pegawaiId: number, patch: Partial<AbsensiRow>) => {
    setRows((p) => p.map((r) => r.pegawaiId === pegawaiId ? { ...r, ...patch } : r));
  };

  const summary = useMemo(() => {
    const c: Record<string, number> = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Cuti: 0 };
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const payload = rows.map((r) => {
        const tgl = toDateISO(tanggal)!;
        const jamMasuk = r.jamMasuk ? new Date(`${tanggal}T${r.jamMasuk}:00`).toISOString() : null;
        const jamPulang = r.jamPulang ? new Date(`${tanggal}T${r.jamPulang}:00`).toISOString() : null;
        return {
          pegawaiId: r.pegawaiId,
          tanggal: tgl,
          jamMasuk,
          jamPulang,
          status: r.status,
          keterangan: r.keterangan || null,
        };
      });
      const r = await fetch("/api/absensi-pegawai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: `Tersimpan ${d.saved} absensi` });
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Absensi Pegawai Harian
          </h3>
          <p className="text-xs text-slate-500">Pilih tanggal, isi kehadiran & jam masuk/pulang pegawai</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
          <div className="flex-1">
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving || rows.length === 0} className="bg-slate-700 hover:bg-slate-800">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Simpan Semua
          </Button>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {STATUS_LIST.map((s) => (
              <Badge key={s} className={`${STATUS_COLOR[s]} text-[10px]`}>
                {s}: {summary[s] || 0}
              </Badge>
            ))}
            <Badge variant="outline" className="text-[10px]">Total: {rows.length}</Badge>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tidak ada pegawai.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">NIP</th>
                  <th className="text-left px-3 py-2 font-medium">Nama</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Masuk</th>
                  <th className="text-left px-3 py-2 font-medium w-28">Pulang</th>
                  <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.pegawaiId} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-500">{r.nip || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="font-medium text-slate-800">{r.pegawaiNama}</div>
                      {r.jabatan && <div className="text-[10px] text-slate-500">{r.jabatan}</div>}
                    </td>
                    <td className="px-3 py-2">
                      <Select value={r.status} onValueChange={(v) => updateRow(r.pegawaiId, { status: v as AbsensiRow["status"] })}>
                        <SelectTrigger className="h-8 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_LIST.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input type="time" value={r.jamMasuk} onChange={(e) => updateRow(r.pegawaiId, { jamMasuk: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="px-3 py-2">
                      <Input type="time" value={r.jamPulang} onChange={(e) => updateRow(r.pegawaiId, { jamPulang: e.target.value })} className="h-8 text-xs" />
                    </td>
                    <td className="px-3 py-2">
                      <Input value={r.keterangan || ""} onChange={(e) => updateRow(r.pegawaiId, { keterangan: e.target.value })} placeholder="Keterangan..." className="h-8 text-xs" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AbsensiPegawaiSection;
