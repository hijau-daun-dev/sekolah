import { db } from "@/lib/db";

/**
 * Mapping jenjang → list of tingkat names with urutan.
 * SD/MI: 6 tingkat (1..6)
 * SMP/MTs: 3 tingkat (7..9)
 * MA: 3 tingkat (10..12)
 */
export const JENJANG_TINGKAT: Record<string, { nama: string; jenjang: string }[]> = {
  SD: ["1", "2", "3", "4", "5", "6"].map((n) => ({ nama: n, jenjang: "SD" })),
  MI: ["1", "2", "3", "4", "5", "6"].map((n) => ({ nama: n, jenjang: "MI" })),
  SMP: ["7", "8", "9"].map((n) => ({ nama: n, jenjang: "SMP" })),
  MTs: ["7", "8", "9"].map((n) => ({ nama: n, jenjang: "MTs" })),
  MA: ["10", "11", "12"].map((n) => ({ nama: n, jenjang: "MA" })),
  "SD-SMP": ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => ({
    nama: n,
    jenjang: Number(n) <= 6 ? "SD" : "SMP",
  })),
  "MI-MTs": ["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => ({
    nama: n,
    jenjang: Number(n) <= 6 ? "MI" : "MTs",
  })),
};

/**
 * List of supported jenjang options for dropdowns / pickers.
 */
export const JENJANG_OPTIONS: { value: string; label: string }[] = [
  { value: "SD", label: "SD (1-6)" },
  { value: "MI", label: "MI (1-6)" },
  { value: "SMP", label: "SMP (7-9)" },
  { value: "MTs", label: "MTs (7-9)" },
  { value: "MA", label: "MA (10-12)" },
  { value: "SD-SMP", label: "SD-SMP (1-9)" },
  { value: "MI-MTs", label: "MI-MTs (1-9)" },
];

export interface AutoGenerateResult {
  created: number;
  skipped: number;
  total: number;
  tingkats: { id: number; nama: string; jenjang: string }[];
}

/**
 * Auto-generate Tingkat records for a sekolah based on its jenjang.
 * Skips tingkat that already exist (matched by name within the sekolah).
 */
export async function autoGenerateTingkat(sekolahId: number, jenjang?: string | null): Promise<AutoGenerateResult> {
  const sekolah = await db.sekolah.findUnique({ where: { id: sekolahId }, select: { jenjang: true } });
  const j = (jenjang || sekolah?.jenjang || "SD").trim();
  const defs = JENJANG_TINGKAT[j] || JENJANG_TINGKAT.SD;

  const existing = await db.tingkat.findMany({
    where: { sekolahId, nama: { in: defs.map((d) => d.nama) } },
    select: { id: true, nama: true, jenjang: true, urutan: true },
  });
  const existingNames = new Set(existing.map((t) => t.nama));

  // Determine max urutan
  const maxUrutan = await db.tingkat.aggregate({ where: { sekolahId }, _max: { urutan: true } });
  let nextUrutan = (maxUrutan._max.urutan ?? -1) + 1;

  const toCreate = defs.filter((d) => !existingNames.has(d.nama));
  const created = await db.$transaction(
    toCreate.map((d, idx) =>
      db.tingkat.create({
        data: {
          sekolahId,
          nama: d.nama,
          jenjang: d.jenjang,
          urutan: nextUrutan + idx,
        },
        select: { id: true, nama: true, jenjang: true },
      })
    )
  );

  return {
    created: created.length,
    skipped: existing.length,
    total: existing.length + created.length,
    tingkats: [...existing.map((e) => ({ id: e.id, nama: e.nama, jenjang: e.jenjang || "" })), ...created],
  };
}
