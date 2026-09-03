import { z } from "zod";

// PRD §3: Validasi input ketat menggunakan Zod, terutama nominal uang dan nilai siswa

export const pembayaranSchema = z.object({
  tagihanSiswaId: z.number().int().positive(),
  jumlahBayar: z.number().int().positive(),
  metodePembayaran: z.enum(["Tunai", "Transfer", "Debit", "QRIS"]),
  keterangan: z.string().max(500).optional().nullable(),
});

export const pengeluaranSchema = z.object({
  posAnggaranId: z.number().int().positive(),
  nominal: z.number().int().positive(),
  keterangan: z.string().min(1).max(500),
  buktiNotaUrl: z.string().refine(v => !v || v.startsWith("/") || v.startsWith("http"), "URL tidak valid").optional().nullable(),
  tanggal: z.string().optional(), // ISO date string
});

export const penilaianItemSchema = z.object({
  siswaId: z.number().int().positive(),
  mapelId: z.number().int().positive(),
  komponenNilaiId: z.number().int().positive(),
  nilai: z.number().min(0).max(100),
  keterangan: z.string().max(500).optional().nullable(),
});

export const penilaianSchema = z.array(penilaianItemSchema).min(1).max(100);

export const absensiSiswaItemSchema = z.object({
  siswaId: z.number().int().positive(),
  kelasId: z.number().int().positive().optional().nullable(),
  tanggal: z.string(), // ISO date
  status: z.enum(["Hadir", "Sakit", "Izin", "Alpa"]),
  keterangan: z.string().max(500).optional().nullable(),
});

export const absensiSiswaSchema = z.array(absensiSiswaItemSchema).min(1).max(200);

export const tagihanSchema = z.object({
  siswaId: z.number().int().positive(),
  tarifPembayaranId: z.number().int().positive(),
  tahunAjaranId: z.number().int().positive(),
  bulanTagihan: z.string().max(50).optional().nullable(),
  nominal: z.number().int().positive(),
  statusLunas: z.boolean().optional(),
  tanggalJatuhTempo: z.string().optional().nullable(),
});

export const generateTagihanSchema = z.object({
  tahunAjaranId: z.number().int().positive(),
  bulanTagihan: z.string().min(1).max(50),
  jenisPembayaranId: z.number().int().positive().optional().nullable(),
});

export const generateKelasSchema = z.object({
  tahunAjaranIdLama: z.number().int().positive(),
  tahunAjaranIdBaru: z.number().int().positive(),
});

export const siswaSchema = z.object({
  nis: z.string().max(50).optional().nullable(),
  nisn: z.string().max(50).optional().nullable(),
  nama: z.string().min(1).max(200),
  gender: z.enum(["L", "P"]).optional().nullable(),
  tempatLahir: z.string().max(100).optional().nullable(),
  tanggalLahir: z.string().optional().nullable(),
  alamat: z.string().max(500).optional().nullable(),
  telepon: z.string().max(30).optional().nullable(),
  fotoUrl: z.string().refine(v => !v || v.startsWith("/") || v.startsWith("http"), "URL tidak valid").optional().nullable(),
  status: z.enum(["Aktif", "Lulus", "Pindah", "Nonaktif"]).optional(),
});

export const pegawaiSchema = z.object({
  nip: z.string().max(50).optional().nullable(),
  nama: z.string().min(1).max(200),
  gender: z.enum(["L", "P"]).optional().nullable(),
  tempatLahir: z.string().max(100).optional().nullable(),
  tanggalLahir: z.string().optional().nullable(),
  alamat: z.string().max(500).optional().nullable(),
  telepon: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  jabatan: z.string().max(100).optional().nullable(),
  bidangStudi: z.string().max(100).optional().nullable(),
  fotoUrl: z.string().refine(v => !v || v.startsWith("/") || v.startsWith("http"), "URL tidak valid").optional().nullable(),
  status: z.enum(["Aktif", "Pensiun", "Resign"]).optional(),
  orgLevel: z.number().int().min(0).optional(),
  orgOrder: z.number().int().min(0).optional(),
  parentId: z.number().int().positive().optional().nullable(),
});

export const pengumumanSchema = z.object({
  judul: z.string().min(1).max(300),
  isi: z.string().min(1).max(5000),
  target: z.enum(["Semua", "Siswa", "Ortu", "Guru"]),
});

export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(100).optional(),
  name: z.string().min(1).max(200),
  roleId: z.number().int().positive(),
  sekolahId: z.number().int().positive().optional().nullable(),
  pegawaiId: z.number().int().positive().optional().nullable(),
  ortuId: z.number().int().positive().optional().nullable(),
  siswaId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type PembayaranInput = z.infer<typeof pembayaranSchema>;
export type PengeluaranInput = z.infer<typeof pengeluaranSchema>;
export type PenilaianInput = z.infer<typeof penilaianSchema>;
export type AbsensiSiswaInput = z.infer<typeof absensiSiswaSchema>;
export type TagihanInput = z.infer<typeof tagihanSchema>;
export type GenerateTagihanInput = z.infer<typeof generateTagihanSchema>;
export type GenerateKelasInput = z.infer<typeof generateKelasSchema>;
export type SiswaInput = z.infer<typeof siswaSchema>;
export type PegawaiInput = z.infer<typeof pegawaiSchema>;
export type PengumumanInput = z.infer<typeof pengumumanSchema>;
export type UserInput = z.infer<typeof userSchema>;
