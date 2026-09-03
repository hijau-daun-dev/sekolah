"use client";

import { useEffect, useState } from "react";
import { Wallet, CreditCard, Banknote, PiggyBank } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudTable, type ColumnDef, type FieldDef } from "./_crud-table";
import { fmtIDR } from "./_format";

interface JenisPembayaran {
  id: number; nama: string; keterangan?: string | null;
  _count?: { tarifPembayarans: number };
}
interface TahunAjaranMini { id: number; nama: string; statusAktif: boolean; }
interface TingkatMini { id: number; nama: string; jenjang?: string | null; }
interface TarifPembayaran {
  id: number; jenisPembayaranId: number; tahunAjaranId: number; tingkatId?: number | null;
  nominal: number; frekuensi: string; keterangan?: string | null;
  jenisPembayaran?: { id: number; nama: string };
  tahunAjaran?: { id: number; nama: string };
  tingkat?: { id: number; nama: string } | null;
}
interface PosAnggaran {
  id: number; kode?: string | null; nama: string; jenis: string; keterangan?: string | null;
  _count?: { pengeluarans: number };
}

export function KeuanganMasterSection() {
  return (
    <Tabs defaultValue="jenis" className="w-full">
      <TabsList className="flex w-full overflow-x-auto h-auto p-1 bg-slate-100">
        <TabsTrigger value="jenis" className="text-xs"><CreditCard className="h-3.5 w-3.5 mr-1.5" /> Jenis Pembayaran</TabsTrigger>
        <TabsTrigger value="tarif" className="text-xs"><Banknote className="h-3.5 w-3.5 mr-1.5" /> Tarif Pembayaran</TabsTrigger>
        <TabsTrigger value="pos" className="text-xs"><PiggyBank className="h-3.5 w-3.5 mr-1.5" /> Pos Anggaran</TabsTrigger>
      </TabsList>

      <TabsContent value="jenis" className="mt-4">
        <JenisPembayaranTab />
      </TabsContent>
      <TabsContent value="tarif" className="mt-4">
        <TarifTab />
      </TabsContent>
      <TabsContent value="pos" className="mt-4">
        <PosAnggaranTab />
      </TabsContent>
    </Tabs>
  );
}

function JenisPembayaranTab() {
  const columns: ColumnDef<JenisPembayaran>[] = [
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "keterangan", header: "Keterangan", cell: (r) => <span className="text-xs text-slate-600">{r.keterangan || "-"}</span> },
    { key: "_count", header: "Tarif", cell: (r) => r._count?.tarifPembayarans ?? 0 },
  ];
  const fields: FieldDef[] = [
    { key: "nama", label: "Nama * (cth: SPP, Uang Pangkal)", type: "text", required: true, full: true },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<JenisPembayaran>
      title="Jenis Pembayaran"
      description="Kategori penerimaan kas (SPP, pangkal, kegiatan)"
      fetchUrl="/api/jenis-pembayaran"
      columns={columns}
      fields={fields}
      emptyRecord={{ nama: "", keterangan: "" }}
      searchKeys={["nama"]}
      searchPlaceholder="Cari jenis pembayaran..."
    />
  );
}

function TarifTab() {
  const [jenisList, setJenisList] = useState<{ value: string; label: string }[]>([]);
  const [taList, setTaList] = useState<{ value: string; label: string }[]>([]);
  const [tingkatList, setTingkatList] = useState<{ value: string; label: string }[]>([]);
  useEffect(() => {
    Promise.all([
      fetch("/api/jenis-pembayaran").then((r) => r.json()),
      fetch("/api/tahun-ajaran").then((r) => r.json()),
      fetch("/api/tingkat").then((r) => r.json()),
    ]).then(([j, ta, t]: [JenisPembayaran[], TahunAjaranMini[], TingkatMini[]]) => {
      if (Array.isArray(j)) setJenisList(j.map((x) => ({ value: String(x.id), label: x.nama })));
      if (Array.isArray(ta)) setTaList(ta.map((x) => ({ value: String(x.id), label: x.nama + (x.statusAktif ? " (Aktif)" : "") })));
      if (Array.isArray(t)) setTingkatList(t.map((x) => ({ value: String(x.id), label: x.nama + (x.jenjang ? ` (${x.jenjang})` : "") })));
    });
  }, []);

  const columns: ColumnDef<TarifPembayaran>[] = [
    { key: "jenisPembayaran", header: "Jenis", cell: (r) => <span className="font-medium text-slate-800">{r.jenisPembayaran?.nama || "-"}</span> },
    { key: "tahunAjaran", header: "Tahun Ajaran", cell: (r) => r.tahunAjaran?.nama || "-" },
    { key: "tingkat", header: "Tingkat", cell: (r) => r.tingkat?.nama || <span className="text-slate-400">Semua</span> },
    { key: "nominal", header: "Nominal", cell: (r) => <span className="font-semibold text-slate-700">{fmtIDR(r.nominal)}</span> },
    { key: "frekuensi", header: "Frekuensi", cell: (r) => <Badge variant="outline" className="text-[10px]">{r.frekuensi}</Badge> },
  ];
  const fields: FieldDef[] = [
    { key: "jenisPembayaranId", label: "Jenis Pembayaran *", type: "select", required: true, options: jenisList, full: true },
    { key: "tahunAjaranId", label: "Tahun Ajaran *", type: "select", required: true, options: taList, full: true },
    { key: "tingkatId", label: "Tingkat (opsional)", type: "select", options: tingkatList, help: "Kosongkan untuk semua tingkat" },
    { key: "nominal", label: "Nominal (Rp) *", type: "number", required: true },
    { key: "frekuensi", label: "Frekuensi", type: "select", options: [
      { value: "Bulanan", label: "Bulanan" },
      { value: "Sekali", label: "Sekali" },
      { value: "Tahunan", label: "Tahunan" },
    ] },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<TarifPembayaran>
      title="Tarif Pembayaran"
      description="Nominal tagihan per jenis, tahun ajaran, & tingkat"
      fetchUrl="/api/tarif-pembayaran"
      columns={columns}
      fields={fields}
      emptyRecord={{ jenisPembayaranId: "", tahunAjaranId: "", tingkatId: "", nominal: 0, frekuensi: "Bulanan", keterangan: "" }}
      searchKeys={["frekuensi"]}
      searchPlaceholder="Cari tarif..."
      validate={(rec) => {
        const n = Number(rec.nominal);
        if (Number.isNaN(n) || n < 0) return "Nominal tidak valid";
        return null;
      }}
    />
  );
}

function PosAnggaranTab() {
  const columns: ColumnDef<PosAnggaran>[] = [
    { key: "kode", header: "Kode", cell: (r) => r.kode ? <Badge variant="outline" className="text-[10px]">{r.kode}</Badge> : "-" },
    { key: "nama", header: "Nama", cell: (r) => <span className="font-medium text-slate-800">{r.nama}</span> },
    { key: "jenis", header: "Jenis", cell: (r) => (
      <Badge className={r.jenis === "Pemasukan" ? "bg-emerald-100 text-emerald-700 text-[10px]" : "bg-rose-100 text-rose-700 text-[10px]"}>{r.jenis}</Badge>
    ) },
    { key: "keterangan", header: "Keterangan", cell: (r) => <span className="text-xs text-slate-600">{r.keterangan || "-"}</span> },
    { key: "_count", header: "Trx", cell: (r) => r._count?.pengeluarans ?? 0 },
  ];
  const fields: FieldDef[] = [
    { key: "kode", label: "Kode", type: "text" },
    { key: "nama", label: "Nama *", type: "text", required: true, full: true },
    { key: "jenis", label: "Jenis *", type: "select", required: true, options: [
      { value: "Pengeluaran", label: "Pengeluaran" },
      { value: "Pemasukan", label: "Pemasukan" },
    ] },
    { key: "keterangan", label: "Keterangan", type: "textarea", full: true },
  ];
  return (
    <CrudTable<PosAnggaran>
      title="Pos Anggaran"
      description="Kategori pemasukan/pengeluaran kas"
      fetchUrl="/api/pos-anggaran"
      columns={columns}
      fields={fields}
      emptyRecord={{ kode: "", nama: "", jenis: "Pengeluaran", keterangan: "" }}
      searchKeys={["nama", "kode"]}
      searchPlaceholder="Cari pos anggaran..."
    />
  );
}
