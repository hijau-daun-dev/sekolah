"use client";

// Shared client-side helpers used across master-data section components.

export const fmtIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number.isFinite(n) ? n : 0);

export const fmtNum = (n: number) =>
  new Intl.NumberFormat("id-ID").format(Number.isFinite(n) ? n : 0);

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toISOString().split("T")[0] : "";

export const fmtDateDisplay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "-";

// Convert date input (yyyy-mm-dd) to ISO string for saving
export const toDateISO = (v?: string | null) => (v ? new Date(v).toISOString() : null);
