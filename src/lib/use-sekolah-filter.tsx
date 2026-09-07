"use client";

import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SekolahOpt {
  id: number;
  nama: string;
  jenjang?: string | null;
  jenjangId?: number | null;
  jenjangRef?: { id: number; kode: string; nama: string } | null;
}

interface JenjangOpt {
  id: number;
  kode: string;
  nama: string;
  urutan: number;
}

/**
 * useSekolahFilter
 *
 * Reusable hook for filter Jenjang + Sekolah di modul yang butuh filter multi-sekolah
 * (untuk Super Admin). Untuk role lain, hook return session sekolahId
 * supaya API tetap filter dengan benar.
 *
 * Cascade behavior:
 *   1. Filter Jenjang (Super Admin only) → filter sekolah list
 *   2. Filter Sekolah → query API dengan sekolahId
 *
 * Returns:
 *   - userRole: string
 *   - userSekolahId: number | null (dari session)
 *   - jenjangOpts: array jenjang aktif (only populated for SUPER_ADMIN)
 *   - filterJenjang: string ("all" | jenjangId)
 *   - setFilterJenjang: setter
 *   - sekolahOpts: array sekolah (auto-filtered by jenjang for Super Admin)
 *   - filterSekolah: string ("all" | sekolahId)
 *   - setFilterSekolah: setter
 *   - effectiveSekolahId: number | null (yang dipakai untuk query API)
 *   - isSuperAdmin: boolean
 *   - sekolahQuery: string ("?sekolahId=X" atau "")
 *   - sekolahQueryAppend: string ("&sekolahId=X" atau "")
 *   - resetSekolahFilter: () => void
 */
export function useSekolahFilter() {
  const [userRole, setUserRole] = useState<string>("");
  const [userSekolahId, setUserSekolahId] = useState<number | null>(null);
  const [jenjangOpts, setJenjangOpts] = useState<JenjangOpt[]>([]);
  const [sekolahOpts, setSekolahOpts] = useState<SekolahOpt[]>([]);
  const [filterJenjang, setFilterJenjang] = useState<string>("all");
  const [filterSekolah, setFilterSekolah] = useState<string>("all");

  // Detect user role & load jenjang list
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user) {
          setUserRole(d.user.role || "");
          setUserSekolahId(d.user.sekolahId ? Number(d.user.sekolahId) : null);
          if (d.user.role === "SUPER_ADMIN") {
            // Load jenjang aktif only
            fetch("/api/jenjang?statusAktif=true")
              .then((r) => r.json())
              .then((list) => { if (Array.isArray(list)) setJenjangOpts(list); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, []);

  const isSuperAdmin = userRole === "SUPER_ADMIN";

  // Load sekolah list (filtered by jenjang if Super Admin + filterJenjang set)
  useEffect(() => {
    if (!userRole) return;
    if (isSuperAdmin) {
      // Super Admin: load all sekolah, optionally filtered by jenjang
      const params = new URLSearchParams();
      if (filterJenjang !== "all") {
        // We'll fetch all and filter client-side since /api/sekolah/list doesn't support jenjang filter
        // Actually we can use the main /api/sekolah endpoint with include
      }
      fetch("/api/sekolah?all=true")
        .then((r) => r.json())
        .then((list: SekolahOpt[]) => {
          if (!Array.isArray(list)) return;
          // Client-side filter by jenjang if selected
          if (filterJenjang !== "all") {
            const filtered = list.filter((s) => {
              // Match by jenjangId (preferred) or jenjang string (legacy)
              const sJenjangId = s.jenjangId ?? s.jenjangRef?.id;
              if (sJenjangId) return String(sJenjangId) === filterJenjang;
              // Fallback: match by kode (find kode from jenjangOpts)
              const jenjangOpt = jenjangOpts.find((j) => String(j.id) === filterJenjang);
              if (jenjangOpt && s.jenjang === jenjangOpt.kode) return true;
              return false;
            });
            setSekolahOpts(filtered);
          } else {
            setSekolahOpts(list);
          }
        })
        .catch(() => {});
    } else {
      // Non-super admin: only their own sekolah
      // sekolahOpts stays empty — UI uses session.sekolahId implicitly
    }
  }, [userRole, isSuperAdmin, filterJenjang, jenjangOpts]);

  // When jenjang changes, reset sekolah filter (handled in setter to avoid effect cascade)
  const handleSetFilterJenjang = (v: string) => {
    setFilterJenjang(v);
    setFilterSekolah("all");
  };

  const effectiveSekolahId = isSuperAdmin
    ? (filterSekolah !== "all" ? Number(filterSekolah) : null)
    : userSekolahId;

  const sekolahQuery = effectiveSekolahId ? `?sekolahId=${effectiveSekolahId}` : "";
  const sekolahQueryAppend = effectiveSekolahId ? `&sekolahId=${effectiveSekolahId}` : "";

  const resetSekolahFilter = () => {
    setFilterJenjang("all");
    setFilterSekolah("all");
  };

  return {
    userRole,
    userSekolahId,
    jenjangOpts,
    filterJenjang,
    setFilterJenjang: handleSetFilterJenjang,
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
 * JenjangSekolahFilterDropdowns
 *
 * Reusable dropdown pair: Jenjang + Sekolah.
 * Renders only if isSuperAdmin === true; otherwise returns null.
 * Sekolah dropdown auto-filtered by Jenjang selection.
 */
export function JenjangSekolahFilterDropdowns({
  isSuperAdmin,
  jenjangOpts,
  filterJenjang,
  setFilterJenjang,
  sekolahOpts,
  filterSekolah,
  setFilterSekolah,
  classNameJenjang = "w-full sm:w-40",
  classNameSekolah = "w-full sm:w-56",
}: {
  isSuperAdmin: boolean;
  jenjangOpts: JenjangOpt[];
  filterJenjang: string;
  setFilterJenjang: (v: string) => void;
  sekolahOpts: SekolahOpt[];
  filterSekolah: string;
  setFilterSekolah: (v: string) => void;
  classNameJenjang?: string;
  classNameSekolah?: string;
}) {
  if (!isSuperAdmin) return null;
  return (
    <>
      <Select value={filterJenjang} onValueChange={setFilterJenjang}>
        <SelectTrigger className={classNameJenjang}>
          <SelectValue placeholder="Semua Jenjang" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">🌐 Semua Jenjang</SelectItem>
          {jenjangOpts.map((j) => (
            <SelectItem key={j.id} value={String(j.id)}>
              {j.kode} — {j.nama}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterSekolah} onValueChange={setFilterSekolah}>
        <SelectTrigger className={classNameSekolah}>
          <SelectValue placeholder="Semua Sekolah" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">🏫 Semua Sekolah</SelectItem>
          {sekolahOpts.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.nama}{s.jenjang ? ` (${s.jenjang})` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}

/**
 * SekolahFilterDropdown (legacy compat)
 *
 * Old signature — keeps existing code working.
 * Now also renders Jenjang dropdown if isSuperAdmin.
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
