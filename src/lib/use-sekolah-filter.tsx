"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SekolahOpt {
  id: number;
  nama: string;
  jenjang?: string | null;
}

/**
 * useSekolahFilter
 *
 * Reusable hook for filter Sekolah di modul yang butuh filter multi-sekolah
 * (untuk Super Admin). Untuk role lain, hook ini return session sekolahId
 * supaya API tetap filter dengan benar.
 *
 * Returns:
 *   - userRole: string
 *   - userSekolahId: number | null (dari session)
 *   - sekolahOpts: array sekolah untuk dropdown (only populated for SUPER_ADMIN)
 *   - filterSekolah: string ("all" | sekolahId)
 *   - setFilterSekolah: setter
 *   - effectiveSekolahId: number | null (yang dipakai untuk query API)
 *   - isSuperAdmin: boolean
 *   - sekolahQuery: string ("?sekolahId=X" atau "") — for URLs without existing query
 *   - sekolahQueryAppend: string ("&sekolahId=X" atau "") — for URLs with existing query
 *   - resetSekolahFilter: () => void
 */
export function useSekolahFilter() {
  const [userRole, setUserRole] = useState<string>("");
  const [userSekolahId, setUserSekolahId] = useState<number | null>(null);
  const [sekolahOpts, setSekolahOpts] = useState<SekolahOpt[]>([]);
  const [filterSekolah, setFilterSekolah] = useState<string>("all");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setUserRole(d.user.role || "");
          setUserSekolahId(d.user.sekolahId ? Number(d.user.sekolahId) : null);
          if (d.user.role === "SUPER_ADMIN") {
            fetch("/api/sekolah?all=true")
              .then((r) => r.json())
              .then((list) => { if (Array.isArray(list)) setSekolahOpts(list); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  const isSuperAdmin = userRole === "SUPER_ADMIN";
  const effectiveSekolahId = isSuperAdmin
    ? (filterSekolah !== "all" ? Number(filterSekolah) : null)
    : userSekolahId;

  const sekolahQuery = effectiveSekolahId ? `?sekolahId=${effectiveSekolahId}` : "";
  const sekolahQueryAppend = effectiveSekolahId ? `&sekolahId=${effectiveSekolahId}` : "";

  const resetSekolahFilter = () => setFilterSekolah("all");

  return {
    userRole,
    userSekolahId,
    sekolahOpts,
    filterSekolah,
    setFilterSekolah,
    effectiveSekolahId,
    isSuperAdmin,
    sekolahQuery,
    sekolahQueryAppend,
    resetSekolahFilter,
  };
}

/**
 * SekolahFilterDropdown
 *
 * Reusable dropdown component for filter Sekolah.
 * Renders only if isSuperAdmin === true; otherwise returns null.
 */
export function SekolahFilterDropdown({
  isSuperAdmin,
  filterSekolah,
  setFilterSekolah,
  sekolahOpts,
  className = "w-full sm:w-56",
}: {
  isSuperAdmin: boolean;
  filterSekolah: string;
  setFilterSekolah: (v: string) => void;
  sekolahOpts: SekolahOpt[];
  className?: string;
}) {
  if (!isSuperAdmin) return null;
  return (
    <Select value={filterSekolah} onValueChange={setFilterSekolah}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Semua Sekolah" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">🌐 Semua Sekolah</SelectItem>
        {sekolahOpts.map((s) => (
          <SelectItem key={s.id} value={String(s.id)}>
            {s.nama}{s.jenjang ? ` (${s.jenjang})` : ""}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
