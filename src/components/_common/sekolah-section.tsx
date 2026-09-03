"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./image-upload";

interface Sekolah {
  id?: number;
  nama: string;
  npsn?: string | null;
  alamat?: string | null;
  logoUrl?: string | null;
  telepon?: string | null;
  email?: string | null;
  website?: string | null;
  kepalaSekolah?: string | null;
  nipKepala?: string | null;
  description?: string | null;
}

export function SekolahSection() {
  const [data, setData] = useState<Sekolah | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/sekolah");
      const d = await r.json();
      setData(d ?? { nama: "" });
    } catch {
      toast({ title: "Gagal memuat data sekolah", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!data?.nama?.trim()) {
      toast({ title: "Nama sekolah wajib diisi", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const r = await fetch("/api/sekolah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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

  return (
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
  );
}
