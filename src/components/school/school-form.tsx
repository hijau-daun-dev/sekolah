"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./image-upload";
import { Save, Loader2, School as SchoolIcon, MapPin, Phone, Mail, Globe, User } from "lucide-react";
import type { School } from "@/lib/types";

export function SchoolForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<School>({
    name: "",
    address: "",
    logoUrl: null,
    principalName: "",
    principalNip: "",
    phone: "",
    email: "",
    website: "",
    description: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/school");
        const data = await res.json();
        if (data && data.id) {
          setForm({
            name: data.name || "",
            address: data.address || "",
            logoUrl: data.logoUrl || null,
            principalName: data.principalName || "",
            principalNip: data.principalNip || "",
            phone: data.phone || "",
            email: data.email || "",
            website: data.website || "",
            description: data.description || "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const set = (key: keyof School, value: string | null) =>
    setForm((p) => ({ ...p, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Validasi gagal", description: "Nama sekolah wajib diisi.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/school", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      toast({ title: "Berhasil", description: "Data sekolah berhasil disimpan." });
      if (data.id) {
        setForm((p) => ({ ...p, id: data.id, ...data }));
      }
    } catch (e) {
      toast({
        title: "Gagal menyimpan",
        description: e instanceof Error ? e.message : "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SchoolIcon className="h-5 w-5 text-primary" />
            Identitas Sekolah
          </CardTitle>
          <CardDescription>
            Informasi dasar tentang sekolah beserta logo institusi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start">
            <ImageUpload
              label="Logo Sekolah"
              value={form.logoUrl}
              onChange={(url) => set("logoUrl", url)}
              shape="rounded"
              size="lg"
            />
            <div className="grid sm:grid-cols-2 gap-4 w-full">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">Nama Sekolah *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="contoh: SMA Negeri 1 Nusantara"
                  required
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address">Alamat Sekolah</Label>
                <Textarea
                  id="address"
                  value={form.address || ""}
                  onChange={(e) => set("address", e.target.value)}
                  placeholder="Jl. Pendidikan No. 1, Kel. Maju, Kec. Jaya, Kota Nusantara"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Kepala Sekolah
          </CardTitle>
          <CardDescription>
            Data kepala sekolah akan ditampilkan pada bagian atas struktur organisasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="principalName">Nama Kepala Sekolah</Label>
            <Input
              id="principalName"
              value={form.principalName || ""}
              onChange={(e) => set("principalName", e.target.value)}
              placeholder="Dr. Bambang Sutrisno, M.Pd."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="principalNip">NIP Kepala Sekolah</Label>
            <Input
              id="principalNip"
              value={form.principalNip || ""}
              onChange={(e) => set("principalNip", e.target.value)}
              placeholder="196505121990031001"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Kontak &amp; Media
          </CardTitle>
          <CardDescription>
            Informasi kontak sekolah untuk keperluan administrasi dan komunikasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="phone" className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" /> Telepon
            </Label>
            <Input
              id="phone"
              value={form.phone || ""}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(021) 1234567"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5" /> Email
            </Label>
            <Input
              id="email"
              type="email"
              value={form.email || ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="info@sekolah.sch.id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Website
            </Label>
            <Input
              id="website"
              value={form.website || ""}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://www.sekolah.sch.id"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description" className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" /> Deskripsi Singkat
            </Label>
            <Input
              id="description"
              value={form.description || ""}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Sekolah unggulan berbasis teknologi"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={saving} className="min-w-32">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Simpan Data Sekolah
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
