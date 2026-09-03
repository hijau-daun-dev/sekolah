"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Network,
  UserCircle2,
  ChevronDown,
  ChevronRight,
  School as SchoolIcon,
  Printer,
  AlertCircle,
} from "lucide-react";
import type { Teacher, School } from "@/lib/types";

interface OrgNode extends Teacher {
  children: OrgNode[];
}

export function OrgStructure() {
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, sRes] = await Promise.all([
        fetch("/api/teachers").then((r) => r.json()),
        fetch("/api/school").then((r) => r.json()),
      ]);
      setTeachers(Array.isArray(tRes) ? tRes : []);
      setSchool(sRes || null);
    } catch {
      toast({ title: "Gagal memuat struktur organisasi", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Build tree
  const { roots, totalNodes, maxDepth } = useMemo(() => {
    const byParent = new Map<string | null, Teacher[]>();
    teachers.forEach((t) => {
      const key = t.parentId || null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(t);
    });
    // Sort each level by orgOrder then name
    byParent.forEach((arr) => {
      arr.sort((a, b) => {
        if (a.orgOrder !== b.orgOrder) return a.orgOrder - b.orgOrder;
        return a.name.localeCompare(b.name);
      });
    });

    const build = (parentId: string | null, depth: number): OrgNode[] => {
      const items = byParent.get(parentId) || [];
      return items.map((t) => ({
        ...t,
        children: build(t.id, depth + 1),
      }));
    };

    const roots = build(null, 0);
    let totalNodes = 0;
    let maxDepth = 0;
    const walk = (nodes: OrgNode[], d: number) => {
      if (nodes.length === 0) return;
      if (d > maxDepth) maxDepth = d;
      nodes.forEach((n) => {
        totalNodes += 1;
        walk(n.children, d + 1);
      });
    };
    walk(roots, 0);
    return { roots, totalNodes, maxDepth };
  }, [teachers]);

  const toggle = (id: string) => {
    setCollapsed((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());
  const collapseAll = () => {
    const all = new Set<string>();
    const walk = (nodes: OrgNode[]) => {
      nodes.forEach((n) => {
        if (n.children.length > 0) all.add(n.id);
        walk(n.children);
      });
    };
    walk(roots);
    setCollapsed(all);
  };

  // Level color & badge
  const levelColors = [
    "from-emerald-600 to-teal-700",
    "from-teal-600 to-cyan-700",
    "from-cyan-600 to-sky-700",
    "from-sky-600 to-blue-700",
    "from-violet-600 to-purple-700",
    "from-amber-600 to-orange-700",
  ];
  const getLevelColor = (level: number) =>
    levelColors[level % levelColors.length];

  const renderNode = (node: OrgNode, level: number, isLast: boolean, parentLine: boolean[]): React.ReactNode => {
    const isCollapsed = collapsed.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id} className="relative">
        {/* Tree connector lines */}
        {level > 0 && (
          <div className="absolute left-0 top-0 bottom-0 pointer-events-none" aria-hidden>
            {parentLine.map((hasPrev, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-border"
                style={{ left: `${i * 28 + 12}px` }}
              >
                {hasPrev ? <div className="h-full w-px bg-border" /> : null}
              </div>
            ))}
            {/* horizontal connector to this node */}
            <div
              className="absolute top-7 h-px bg-border"
              style={{
                left: `${(level - 1) * 28 + 12}px`,
                width: `${28}px`,
              }}
            />
          </div>
        )}

        <div
          className="flex items-start gap-2 py-1.5"
          style={{ marginLeft: level === 0 ? 0 : level * 28 }}
        >
          {/* Toggle / bullet */}
          <button
            type="button"
            onClick={() => hasChildren && toggle(node.id)}
            className={`flex-shrink-0 h-6 w-6 rounded-md flex items-center justify-center mt-1 transition-colors ${
              hasChildren
                ? "hover:bg-accent text-foreground"
                : "text-muted-foreground/40 cursor-default"
            }`}
            aria-label={hasChildren ? (isCollapsed ? "Bentangkan" : "Lipat") : undefined}
          >
            {hasChildren ? (
              isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )
            ) : (
              <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
            )}
          </button>

          {/* Node card */}
          <div className="flex-1 min-w-0 rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-sm transition-all overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${getLevelColor(level)}`} />
            <div className="flex items-center gap-3 p-3">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0 border border-border">
                {node.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={node.photoUrl} alt={node.name} className="h-full w-full object-cover" />
                ) : (
                  <UserCircle2 className="h-7 w-7 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-sm truncate">{node.name}</p>
                  {node.position && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                      {node.position}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-xs text-muted-foreground mt-0.5">
                  {node.subject && <span>{node.subject}</span>}
                  {node.nip && <span>NIP: {node.nip}</span>}
                  {node.phone && <span>{node.phone}</span>}
                  {node.children.length > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <UserCircle2 className="h-3 w-3" />
                      {node.children.length} bawahan
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/70 px-1.5 py-0.5 rounded bg-muted/50 flex-shrink-0">
                L{level}
              </span>
            </div>
          </div>
        </div>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <div className="relative">
            {node.children.map((child, idx) => {
              const newParentLine = [...parentLine, !isLast];
              return (
                <div key={child.id}>
                  {renderNode(child, level + 1, idx === node.children.length - 1, newParentLine)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Network className="h-5 w-5 text-primary" /> Struktur Organisasi Sekolah
              </CardTitle>
              <CardDescription>
                Hierarki fleksibel dari kepala sekolah hingga struktur terendah.
                Struktur dibentuk dari data guru &mdash; atur pada menu Data Guru.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                <ChevronDown className="h-4 w-4" /> Bentangkan
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                <ChevronRight className="h-4 w-4" /> Lipat
              </Button>
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Cetak
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : roots.length === 0 && !school?.principalName ? (
            <div className="text-center py-12 text-muted-foreground">
              <Network className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium mb-1">Belum ada struktur organisasi</p>
              <p className="text-sm">
                Tambahkan data guru dan atur posisi &amp; atasan langsung pada menu Data Guru
                untuk membangun struktur organisasi.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground pb-3 border-b border-border">
                <span className="font-medium text-foreground">Statistik:</span>
                <span>Total Personil: <strong className="text-foreground">{totalNodes}</strong></span>
                <span>Titik Puncak: <strong className="text-foreground">{roots.length}</strong></span>
                <span>Kedalaman Maks: <strong className="text-foreground">{maxDepth + 1} level</strong></span>
              </div>

              {/* School / Principal top banner (if principalName set) */}
              {school?.principalName && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white shadow-md">
                  <div className="h-14 w-14 rounded-lg bg-white/15 backdrop-blur flex items-center justify-center overflow-hidden flex-shrink-0 border border-white/20">
                    {school?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={school.logoUrl} alt="Logo" className="h-full w-full object-cover" />
                    ) : (
                      <SchoolIcon className="h-7 w-7" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-emerald-100 text-xs">Institusi</p>
                    <p className="font-bold truncate">{school.name || "Sekolah"}</p>
                    <p className="text-emerald-100/90 text-xs truncate">
                      Kepala Sekolah: <span className="font-semibold">{school.principalName}</span>
                      {school.principalNip ? ` · NIP: ${school.principalNip}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {/* Tree */}
              {roots.length > 0 ? (
                <div className="overflow-x-auto">
                  <div className="min-w-fit pb-2">
                    {roots.map((root, idx) =>
                      renderNode(root, 0, idx === roots.length - 1, [])
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    Nama kepala sekolah sudah diisi, namun belum ada data guru. Tambahkan data guru
                    dengan jabatan &quot;Kepala Sekolah&quot; dan tanpa atasan untuk membangun struktur.
                  </span>
                </div>
              )}

              {/* Hierarchy guide */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">Panduan Pembentukan Struktur</p>
                <ul className="text-xs text-muted-foreground space-y-1.5 list-disc pl-4">
                  <li>
                    Setiap guru memiliki <strong>Atasan Langsung</strong> &mdash; pilih dari dropdown
                    pada formulir Data Guru.
                  </li>
                  <li>
                    Guru tanpa atasan (<strong>Level 0</strong>) berada di puncak struktur (mis. Kepala Sekolah).
                  </li>
                  <li>
                    Hierarki fleksibel &mdash; Anda bebas membuat sebanyak mungkin level
                    (Wakasek &rarr; Koordinator &rarr; Guru Senior &rarr; Guru).
                  </li>
                  <li>
                    Gunakan <strong>Urutan</strong> untuk mengatur urutan tampil antar saudara se-level.
                  </li>
                  <li>
                    Klik ikon chevron untuk melipat/membentangkan cabang. Gunakan tombol di kanan atas
                    untuk membentangkan/melipat semua sekaligus.
                  </li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
