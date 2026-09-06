"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileBarChart, Loader2, Save, SearchX, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface SekolahOpt { id: number; nama: string; jenjang?: string | null }
interface KelasOpt { id: number; nama: string; tingkat?: { id: number; nama: string } | null; tahunAjaran?: { id: number; nama: string } | null }
interface TingkatOpt { id: number; nama: string; jenjang?: string | null; urutan?: number }
interface MapelOpt { id: number; nama: string; kode?: string | null }
interface KomponenOpt { id: number; nama: string; bobot: number }
interface SemesterOpt { id: number; nama: string; statusAktif: boolean; tahunAjaranId: number; tahunAjaran?: { nama: string } | null; tanggalMulai?: string | null; tanggalSelesai?: string | null }
interface TingkatMapelOpt { id: number; tingkatId: number; mapelId: number; mapel: MapelOpt }
interface GuruMapelOpt { id: number; pegawaiId: number; mapelId: number; tingkatId: number; mapel?: MapelOpt }

interface NilaiRow {
  siswaId: number;
  siswaNama: string;
  nis?: string | null;
  nilai: string;
  keterangan?: string | null;
}

interface SessionInfo {
  role: string;
  pegawaiId?: string | null;
  sekolahId?: string | null;
}

export function PenilaianSection() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [sekolahList, setSekolahList] = useState<SekolahOpt[]>([]);
  const [sekolahId, setSekolahId] = useState<string>("");
  const [jenjang, setJenjang] = useState<string>("");
  const [tingkatList, setTingkatList] = useState<TingkatOpt[]>([]);
  const [tingkatId, setTingkatId] = useState<string>("");
  const [kelasList, setKelasList] = useState<KelasOpt[]>([]);
  const [kelasId, setKelasId] = useState<string>("");
  const [allMapel, setAllMapel] = useState<MapelOpt[]>([]);
  const [tingkatMapelList, setTingkatMapelList] = useState<TingkatMapelOpt[]>([]);
  const [guruMapelList, setGuruMapelList] = useState<GuruMapelOpt[]>([]);
  const [mapelId, setMapelId] = useState<string>("");
  const [komponenOpts, setKomponenOpts] = useState<KomponenOpt[]>([]);
  const [komponenId, setKomponenId] = useState<string>("");
  const [semesterList, setSemesterList] = useState<SemesterOpt[]>([]);
  const [semesterId, setSemesterId] = useState<string>("");

  const [rows, setRows] = useState<NilaiRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // 1. Fetch session + sekolah list
  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => {
      if (d.user) {
        setSession({
          role: d.user.role,
          pegawaiId: d.user.pegawaiId,
          sekolahId: d.user.sekolahId,
        });
      }
    }).catch(() => {});
    fetch("/api/sekolah/list").then((r) => r.json()).then((d: SekolahOpt[]) => {
      if (Array.isArray(d)) {
        setSekolahList(d);
        if (d.length > 0) setSekolahId(String(d[0].id));
      }
    }).catch(() => {});
  }, []);

  // Update jenjang from sekolah
  useEffect(() => {
    if (!sekolahId) return;
    const s = sekolahList.find((x) => x.id === Number(sekolahId));
    setJenjang(s?.jenjang || "");
  }, [sekolahId, sekolahList]);

  // 2. Fetch tingkat + semester + komponen + all mapel + guruMapel based on sekolah
  useEffect(() => {
    if (!sekolahId) return;
    const sid = Number(sekolahId);
    Promise.all([
      fetch(`/api/tingkat?sekolahId=${sid}&statusAktif=true`).then((r) => r.json()).catch(() => []),
      fetch(`/api/semester?sekolahId=${sid}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/komponen-nilai?sekolahId=${sid}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/mapel?sekolahId=${sid}`).then((r) => r.json()).catch(() => []),
    ]).then(([t, sem, komp, mp]: [TingkatOpt[], SemesterOpt[], KomponenOpt[], MapelOpt[]]) => {
      if (Array.isArray(t)) setTingkatList(t);
      if (Array.isArray(sem)) {
        setSemesterList(sem);
        // Auto-detect semester by current date
        const now = new Date();
        const matched = sem.find((s) => {
          if (!s.tanggalMulai || !s.tanggalSelesai) return false;
          return new Date(s.tanggalMulai) <= now && now <= new Date(s.tanggalSelesai);
        });
        if (matched) setSemesterId(String(matched.id));
        else {
          const aktif = sem.find((s) => s.statusAktif);
          if (aktif) setSemesterId(String(aktif.id));
        }
      }
      if (Array.isArray(komp)) setKomponenOpts(komp);
      if (Array.isArray(mp)) setAllMapel(mp);
    });
    // Reset dependent filters
    setTingkatId("");
    setKelasList([]);
    setKelasId("");
    setTingkatMapelList([]);
    setMapelId("");
    setGuruMapelList([]);
  }, [sekolahId]);

  // 3. For GURU role: fetch their GuruMapel
  useEffect(() => {
    if (!session || session.role !== "GURU" || !session.pegawaiId || !sekolahId) return;
    fetch(`/api/guru-mapel?pegawaiId=${session.pegawaiId}&sekolahId=${sekolahId}&statusAktif=true`)
      .then((r) => r.json())
      .then((d: GuruMapelOpt[]) => {
        if (Array.isArray(d)) setGuruMapelList(d);
      })
      .catch(() => {});
  }, [session, sekolahId]);

  // 4. When tingkatId changes, fetch kelas (filter by tingkat) + tingkat-mapel (filter by tingkat)
  useEffect(() => {
    if (!tingkatId) {
      setKelasList([]);
      setKelasId("");
      setTingkatMapelList([]);
      setMapelId("");
      return;
    }
    Promise.all([
      fetch(`/api/kelas?sekolahId=${sekolahId}&search=`).then((r) => r.json()).catch(() => []),
      fetch(`/api/tingkat-mapel?tingkatId=${tingkatId}&statusAktif=true`).then((r) => r.json()).catch(() => []),
    ]).then(([kl, tm]: [KelasOpt[], TingkatMapelOpt[]]) => {
      // Filter kelas by tingkat
      const tid = Number(tingkatId);
      const filteredKelas = Array.isArray(kl) ? kl.filter((k) => k.tingkat?.id === tid) : [];
      setKelasList(filteredKelas);
      if (Array.isArray(tm)) setTingkatMapelList(tm);
      else setTingkatMapelList([]);
      setKelasId("");
      setMapelId("");
    });
  }, [tingkatId, sekolahId]);

  // Mapel options: filter allMapel by tingkatMapel list, AND if GURU, also by GuruMapel
  const mapelOptions = useMemo(() => {
    const allowedByTingkat = tingkatMapelList.map((tm) => tm.mapelId);
    let result = allMapel.filter((m) => allowedByTingkat.includes(m.id));
    if (session?.role === "GURU" && guruMapelList.length > 0) {
      // Only show mapels the guru teaches at this tingkat
      const allowedByGuru = guruMapelList
        .filter((gm) => gm.tingkatId === Number(tingkatId))
        .map((gm) => gm.mapelId);
      result = result.filter((m) => allowedByGuru.includes(m.id));
    }
    return result;
  }, [allMapel, tingkatMapelList, session, guruMapelList, tingkatId]);

  // Determine active tahun ajaran ID from selected kelas (for saving)
  const activeTahunAjaranId = useMemo(() => {
    if (!kelasId) return null;
    const k = kelasList.find((x) => x.id === Number(kelasId));
    return k?.tahunAjaran?.id || null;
  }, [kelasId, kelasList]);

  const load = useCallback(async () => {
    if (!kelasId || !mapelId || !komponenId) return;
    setLoading(true);
    setRows([]);
    try {
      const params = new URLSearchParams();
      params.set("kelasId", kelasId);
      params.set("mapelId", mapelId);
      params.set("komponenNilaiId", komponenId);
      if (semesterId && semesterId !== "all") params.set("semesterId", semesterId);
      const [siswaRes, nilaiRes] = await Promise.all([
        fetch(`/api/kelas-siswa?kelasId=${kelasId}`).then((r) => r.json()),
        fetch(`/api/penilaian?${params.toString()}`).then((r) => r.json()),
      ]);
      const kelasSiswas = Array.isArray(siswaRes) ? siswaRes : [];
      const nilais = Array.isArray(nilaiRes) ? nilaiRes : [];
      const nilaiMap = new Map<number, { nilai: number; keterangan?: string | null }>(nilais.map((n: { siswaId: number; nilai: number; keterangan?: string | null }) => [n.siswaId, n]));

      const built: NilaiRow[] = kelasSiswas
        .map((ks: Record<string, unknown>) => {
          const siswaId = Number(ks.siswaId);
          const siswa = ks.siswa as { nama: string; nis?: string | null } | undefined;
          const ex = nilaiMap.get(siswaId);
          return {
            siswaId,
            siswaNama: siswa?.nama || "(tanpa nama)",
            nis: siswa?.nis || null,
            nilai: ex ? String(ex.nilai) : "",
            keterangan: ex?.keterangan || "",
          };
        })
        .sort((a, b) => a.siswaNama.localeCompare(b.siswaNama));
      setRows(built);
    } catch {
      toast({ title: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [kelasId, mapelId, komponenId, semesterId, toast]);

  useEffect(() => { if (kelasId && mapelId && komponenId) load(); }, [load, kelasId, mapelId, komponenId, semesterId]);

  const updateRow = (siswaId: number, patch: Partial<NilaiRow>) => {
    setRows((p) => p.map((r) => r.siswaId === siswaId ? { ...r, ...patch } : r));
  };

  const stats = useMemo(() => {
    const nums = rows.map((r) => Number(r.nilai)).filter((n, i) => !isNaN(n) && rows[i].nilai !== "");
    if (nums.length === 0) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return { count: nums.length, avg: sum / nums.length, min: Math.min(...nums), max: Math.max(...nums) };
  }, [rows]);

  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    try {
      const payload = rows
        .filter((r) => r.nilai !== "" && !isNaN(Number(r.nilai)))
        .map((r) => ({
          siswaId: r.siswaId,
          mapelId: Number(mapelId),
          komponenNilaiId: Number(komponenId),
          tahunAjaranId: activeTahunAjaranId,
          semesterId: semesterId && semesterId !== "all" ? Number(semesterId) : undefined,
          nilai: Number(r.nilai),
          keterangan: r.keterangan || null,
        }));
      if (payload.length === 0) {
        toast({ title: "Tidak ada nilai untuk disimpan", variant: "destructive" });
        setSaving(false);
        return;
      }
      const r = await fetch("/api/penilaian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: `Tersimpan ${d.saved} nilai` });
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const isGuruRestricted = session?.role === "GURU";
  const hasGuruMapelForTingkat = !isGuruRestricted || guruMapelList.some((gm) => gm.tingkatId === Number(tingkatId));

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <FileBarChart className="h-4 w-4" /> Input Penilaian Siswa
            </h3>
            <p className="text-xs text-slate-500">Cascade filter: Sekolah/Jenjang → Tingkat → Kelas → Mapel → Komponen → Semester</p>
          </div>
          {isGuruRestricted && (
            <Badge variant="outline" className="text-[10px]">Mode Guru: hanya mapel yang Anda ajar</Badge>
          )}
        </div>

        {/* Cascade Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {sekolahList.length > 1 && (
            <div>
              <Label className="text-xs flex items-center gap-1"><Filter className="h-3 w-3" /> Sekolah</Label>
              <Select value={sekolahId} onValueChange={(v) => { setSekolahId(v); setTingkatId(""); }} disabled={sekolahList.length <= 1}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sekolahList.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label className="text-xs">Jenjang</Label>
            <Input value={jenjang || "-"} disabled className="bg-slate-50 text-slate-600" />
          </div>
          <div>
            <Label className="text-xs">Tingkat</Label>
            <Select value={tingkatId} onValueChange={setTingkatId} disabled={!sekolahId || tingkatList.length === 0}>
              <SelectTrigger className="w-full"><SelectValue placeholder={sekolahId ? "Pilih tingkat" : "Pilih sekolah dulu"} /></SelectTrigger>
              <SelectContent>
                {tingkatList.length === 0 ? (
                  <SelectItem value="_none" disabled>Belum ada tingkat</SelectItem>
                ) : tingkatList.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.nama}{t.jenjang ? ` (${t.jenjang})` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Kelas</Label>
            <Select value={kelasId} onValueChange={setKelasId} disabled={!tingkatId || kelasList.length === 0}>
              <SelectTrigger className="w-full"><SelectValue placeholder={tingkatId ? "Pilih kelas" : "Pilih tingkat dulu"} /></SelectTrigger>
              <SelectContent>
                {kelasList.length === 0 ? (
                  <SelectItem value="_none" disabled>Belum ada kelas</SelectItem>
                ) : kelasList.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Mapel {isGuruRestricted && <span className="text-[10px] text-amber-600">(yang Anda ajar)</span>}</Label>
            <Select value={mapelId} onValueChange={setMapelId} disabled={!tingkatId || mapelOptions.length === 0 || (isGuruRestricted && !hasGuruMapelForTingkat)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={
                  !tingkatId ? "Pilih tingkat dulu"
                  : isGuruRestricted && !hasGuruMapelForTingkat ? "Tidak ada mapel di tingkat ini"
                  : mapelOptions.length === 0 ? "Belum ada mapel di tingkat"
                  : "Pilih mapel"
                } />
              </SelectTrigger>
              <SelectContent>
                {mapelOptions.length === 0 ? (
                  <SelectItem value="_none" disabled>Tidak ada mapel</SelectItem>
                ) : mapelOptions.map((m) => <SelectItem key={m.id} value={String(m.id)}>{m.nama}{m.kode ? ` [${m.kode}]` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Komponen Nilai</Label>
            <Select value={komponenId} onValueChange={setKomponenId} disabled={komponenOpts.length === 0}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih komponen" /></SelectTrigger>
              <SelectContent>
                {komponenOpts.length === 0 ? (
                  <SelectItem value="_none" disabled>Belum ada komponen</SelectItem>
                ) : komponenOpts.map((k) => <SelectItem key={k.id} value={String(k.id)}>{k.nama} ({k.bobot}%)</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Semester</Label>
            <Select value={semesterId} onValueChange={setSemesterId} disabled={semesterList.length === 0}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih semester" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Semester</SelectItem>
                {semesterList.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.tahunAjaran?.nama ? `${s.tahunAjaran.nama} - ` : ""}{s.nama}{s.statusAktif ? " (Aktif)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button size="sm" onClick={handleSave} disabled={saving || rows.length === 0} className="w-full bg-slate-700 hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Simpan Semua
            </Button>
          </div>
        </div>

        {stats && (
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px]">Jumlah: {stats.count}</Badge>
            <Badge className="bg-slate-100 text-slate-700 text-[10px]">Rata-rata: {stats.avg.toFixed(1)}</Badge>
            <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Tertinggi: {stats.max}</Badge>
            <Badge className="bg-rose-100 text-rose-700 text-[10px]">Terendah: {stats.min}</Badge>
          </div>
        )}

        {(!kelasId || !mapelId || !komponenId) ? (
          <div className="text-center py-8 text-slate-500">
            <FileBarChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Pilih kelas, mapel, dan komponen nilai untuk memulai.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tidak ada siswa di kelas ini.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">NIS</th>
                  <th className="text-left px-3 py-2 font-medium">Nama Siswa</th>
                  <th className="text-left px-3 py-2 font-medium w-32">Nilai (0-100)</th>
                  <th className="text-left px-3 py-2 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.siswaId} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 text-xs text-slate-500">{r.nis || "-"}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.siswaNama}</td>
                    <td className="px-3 py-2">
                      <Input
                        type="number" min={0} max={100} step="0.1"
                        value={r.nilai}
                        onChange={(e) => updateRow(r.siswaId, { nilai: e.target.value })}
                        className="h-8 text-xs w-24"
                        placeholder="0"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={r.keterangan || ""}
                        onChange={(e) => updateRow(r.siswaId, { keterangan: e.target.value })}
                        placeholder="Keterangan..."
                        className="h-8 text-xs"
                      />
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

export default PenilaianSection;
