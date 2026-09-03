"use client";

import { useEffect, useState } from "react";
import { PackageOpen, DoorOpen, Boxes, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudTable, type ColumnDef, type FieldDef } from "./_crud-table";
import { fmtDateDisplay, fmtIDR } from "./_format";

interface Ruangan {
  id: number; kode?: string | null; nama: string; lokasi?: string | null;
  kapasitas?: number | null; keterangan?: string | null;
  _count?: { barangs: number };
}
interface KategoriBarang {
  id: number; nama: string; keterangan?: string | null;
  _count?: { barangs: number };
}
interface Barang {
  id: number; kode?: string | null; nama: string;
  kategoriBarangId?: number | null; ruanganId?: number | null;
  jumlah: number; kondisi: string; status: string;
  tanggalBeli?: string | null; hargaBeli?: number | null; keterangan?: string | null;
  kategoriBarang?: { id: number; nama: string } | null;
  ruangan?: { id: number; nama: string } | null;
}

export function SaranaSection() {
  return (
    <Tabs defaultValue="ruangan" className="w-full">
      <TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-slate-100">
        <TabsTrigger value="ruangan" className="text-xs"><DoorOpen className="h-3.5 w-3.5 mr-1.5" /> Ruangan</TabsTrigger>
        <TabsTrigger value="kategori" className="text-xs"><Boxes className="h-3.5 w-3.5 mr-1.5" /> Kategori Barang</TabsTrigger>
        <TabsTrigger value="barang" className="text-xs"><Package className="h-3.5 w-3.5 mr-1.5" /> Barang / Inventaris</TabsTrigger>
      </TabsList>

      <TabsContent value="ruangan" className="mt-4">
        <RuanganTab />
      </TabsContent>
      <TabsContent value="kategori" className="mt-4">
        <KategoriBarangTab />
      </TabsContent>
      <TabsContent value="barang" className="mt-4">
        <BarangTab />
      </TabsContent>
    </Tabs>
  );
}

function RuanganTab() {
  const columns: ColumnDef<Ruangan>[] = [
    { key: "kode", header: "Kode", cell: (r) => r.kode ? <Badge variant="outline" className="text-[10px]">{r.kode}</Badge> : "-" },
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "lokasi", header: "Lokasi", cell: (r) => r.lokasi || "-" },
    { key: "kapasitas", header: "Kapasitas", cell: (r) => r.kapasitas ?? "-" },
    { key: "_count", header: "Barang", cell: (r) => r._count?.barangs ?? 0 },
  ];
  const fields: FieldDef[] = [
    { key: "kode", label: "Kode", type: "text" },
    { key: "nama", label: "Nama *", type: "text", required: true, full: true },
    { key: "lokasi", label: "Lokasi", type: "text", full: true },
    { key: "kapasitas", label: "Kapasitas", type: "number" },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<Ruangan>
      title="Ruangan"
      description="Daftar ruangan sekolah"
      fetchUrl="/api/ruangan"
      columns={columns}
      fields={fields}
      emptyRecord={{ kode: "", nama: "", lokasi: "", kapasitas: "", keterangan: "" }}
      searchKeys={["nama", "kode", "lokasi"]}
      searchPlaceholder="Cari ruangan..."
    />
  );
}

function KategoriBarangTab() {
  const columns: ColumnDef<KategoriBarang>[] = [
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "keterangan", header: "Keterangan", cell: (r) => <span className="text-xs text-slate-600">{r.keterangan || "-"}</span> },
    { key: "_count", header: "Barang", cell: (r) => r._count?.barangs ?? 0 },
  ];
  const fields: FieldDef[] = [
    { key: "nama", label: "Nama *", type: "text", required: true, full: true },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<KategoriBarang>
      title="Kategori Barang"
      description="Pengelompokan barang inventaris"
      fetchUrl="/api/kategori-barang"
      columns={columns}
      fields={fields}
      emptyRecord={{ nama: "", keterangan: "" }}
      searchKeys={["nama"]}
      searchPlaceholder="Cari kategori..."
    />
  );
}

function BarangTab() {
  const [katList, setKatList] = useState<{ value: string; label: string }[]>([]);
  const [ruanganList, setRuanganList] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/kategori-barang").then((r) => r.json()),
      fetch("/api/ruangan").then((r) => r.json()),
    ]).then(([k, r]: [KategoriBarang[], Ruangan[]]) => {
      if (Array.isArray(k)) setKatList(k.map((x) => ({ value: String(x.id), label: x.nama })));
      if (Array.isArray(r)) setRuanganList(r.map((x) => ({ value: String(x.id), label: x.nama + (x.lokasi ? ` (${x.lokasi})` : "") })));
    });
  }, []);

  const columns: ColumnDef<Barang>[] = [
    { key: "kode", header: "Kode", cell: (r) => r.kode ? <Badge variant="outline" className="text-[10px]">{r.kode}</Badge> : "-" },
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "kategoriBarang", header: "Kategori", cell: (r) => r.kategoriBarang?.nama || "-" },
    { key: "ruangan", header: "Ruangan", cell: (r) => r.ruangan?.nama || "-" },
    { key: "jumlah", header: "Jumlah", cell: (r) => r.jumlah },
    { key: "kondisi", header: "Kondisi", cell: (r) => (
      <Badge className={r.kondisi === "Baik" ? "bg-emerald-100 text-emerald-700 text-[10px]" : r.kondisi === "Rusak Ringan" ? "bg-amber-100 text-amber-700 text-[10px]" : "bg-rose-100 text-rose-700 text-[10px]"}>{r.kondisi}</Badge>
    ) },
    { key: "status", header: "Status", cell: (r) => (
      <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
    ) },
    { key: "hargaBeli", header: "Harga Beli", cell: (r) => r.hargaBeli ? fmtIDR(r.hargaBeli) : "-" },
  ];
  const fields: FieldDef[] = [
    { key: "kode", label: "Kode", type: "text" },
    { key: "nama", label: "Nama *", type: "text", required: true, full: true },
    { key: "kategoriBarangId", label: "Kategori", type: "select", options: katList },
    { key: "ruanganId", label: "Ruangan", type: "select", options: ruanganList },
    { key: "jumlah", label: "Jumlah", type: "number" },
    { key: "kondisi", label: "Kondisi", type: "select", options: [
      { value: "Baik", label: "Baik" }, { value: "Rusak Ringan", label: "Rusak Ringan" }, { value: "Rusak Berat", label: "Rusak Berat" },
    ] },
    { key: "status", label: "Status", type: "select", options: [
      { value: "Tersedia", label: "Tersedia" }, { value: "Dipinjam", label: "Dipinjam" },
    ] },
    { key: "tanggalBeli", label: "Tanggal Beli", type: "date" },
    { key: "hargaBeli", label: "Harga Beli (Rp)", type: "number" },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<Barang>
      title="Barang / Inventaris"
      description="Daftar barang inventaris sekolah"
      fetchUrl="/api/barang"
      columns={columns}
      fields={fields}
      emptyRecord={{ kode: "", nama: "", kategoriBarangId: "", ruanganId: "", jumlah: 1, kondisi: "Baik", status: "Tersedia", tanggalBeli: "", hargaBeli: "", keterangan: "" }}
      searchKeys={["nama", "kode"]}
      searchPlaceholder="Cari barang..."
    />
  );
}
