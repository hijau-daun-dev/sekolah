"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Network, ChevronRight, ChevronDown, Printer, Maximize2, Minimize2, Loader2, Building2, Users } from "lucide-react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface Pegawai {
  id: number;
  nama: string;
  nip?: string | null;
  jabatan?: string | null;
  bidangStudi?: string | null;
  fotoUrl?: string | null;
  orgLevel: number;
  orgOrder: number;
  parentId?: number | null;
  status?: string;
  _count?: { children: number };
}
interface Sekolah {
  id: number;
  nama: string;
  logoUrl?: string | null;
  kepalaSekolah?: string | null;
  alamat?: string | null;
}

interface TreeNode extends Pegawai {
  children: TreeNode[];
}

function buildTree(list: Pegawai[]): TreeNode[] {
  const map = new Map<number, TreeNode>();
  list.forEach((p) => map.set(p.id, { ...p, children: [] }));
  const roots: TreeNode[] = [];
  list.forEach((p) => {
    const node = map.get(p.id)!;
    if (p.parentId && map.has(p.parentId)) {
      map.get(p.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  // sort children by orgOrder, then nama
  const sortRecursive = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => (a.orgOrder - b.orgOrder) || a.nama.localeCompare(b.nama));
    nodes.forEach((n) => sortRecursive(n.children));
  };
  sortRecursive(roots);
  return roots;
}

function maxDepth(nodes: TreeNode[]): number {
  if (nodes.length === 0) return 0;
  return 1 + Math.max(...nodes.map((n) => maxDepth(n.children)));
}

function countNodes(nodes: TreeNode[]): number {
  return nodes.reduce((s, n) => s + 1 + countNodes(n.children), 0);
}

function collectIds(nodes: TreeNode[]): Set<number> {
  const set = new Set<number>();
  const walk = (ns: TreeNode[]) => {
    ns.forEach((n) => {
      set.add(n.id);
      walk(n.children);
    });
  };
  walk(nodes);
  return set;
}

export function OrgStructureSection() {
  const [list, setList] = useState<Pegawai[]>([]);
  const [sekolah, setSekolah] = useState<Sekolah | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pegRes, sekRes] = await Promise.all([
        fetch("/api/pegawai").then((r) => r.json()),
        fetch("/api/sekolah").then((r) => r.json()),
      ]);
      if (Array.isArray(pegRes)) setList(pegRes);
      if (Array.isArray(sekRes) && sekRes.length > 0) setSekolah(sekRes[0]);
      else if (sekRes && !Array.isArray(sekRes)) setSekolah(sekRes);
    } catch {
      toast({ title: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const tree = useMemo(() => buildTree(list), [list]);
  const totalNodes = useMemo(() => countNodes(tree), [tree]);
  const depth = useMemo(() => maxDepth(tree), [tree]);

  // Auto-expand all by default
  useEffect(() => {
    if (tree.length > 0 && expanded.size === 0) {
      setExpanded(collectIds(tree));
    }
  }, [tree, expanded.size]);

  const toggle = (id: number) => {
    setExpanded((p) => {
      const next = new Set(p);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(collectIds(tree));
  const collapseAll = () => setExpanded(new Set());

  const renderNode = (node: TreeNode, level: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expanded.has(node.id);
    return (
      <div key={node.id} className="relative">
        <div className="flex items-start gap-2 py-2">
          {/* Connector */}
          {level > 0 && (
            <div className="absolute -left-4 top-0 bottom-0 w-4">
              <div className="absolute left-3 top-0 bottom-0 border-l border-slate-300" />
              <div className="absolute left-3 top-4 w-3 border-t border-slate-300" />
            </div>
          )}
          {hasChildren ? (
            <button
              onClick={() => toggle(node.id)}
              className="mt-1 h-5 w-5 rounded flex items-center justify-center hover:bg-slate-100 flex-shrink-0"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-slate-500" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-500" />}
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}
          <div className="flex-1 border border-slate-200 rounded-lg p-3 hover:shadow-sm transition-shadow bg-white">
            <div className="flex items-start gap-3">
              <div className="relative h-12 w-12 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                {node.fotoUrl ? (
                  <Image src={node.fotoUrl} alt={node.nama} fill unoptimized className="object-cover" />
                ) : (
                  <span className="text-base font-bold text-slate-500">{node.nama[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-800 text-sm">{node.nama}</span>
                  <Badge variant="outline" className="text-[9px]">L{node.orgLevel}</Badge>
                  {node.status && node.status !== "Aktif" && (
                    <Badge variant="outline" className="text-[9px] text-amber-700">{node.status}</Badge>
                  )}
                </div>
                {node.jabatan && <p className="text-xs text-slate-600 mt-0.5">{node.jabatan}</p>}
                <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 flex-wrap">
                  {node.nip && <span>NIP: {node.nip}</span>}
                  {node.bidangStudi && <span>Bidang: {node.bidangStudi}</span>}
                  {hasChildren && <span>{node.children.length} bawahan</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="ml-8 border-l border-slate-200 pl-4">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-full { max-height: none !important; overflow: visible !important; }
          }
        `}</style>

        {/* School Banner */}
        {sekolah && (
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-lg p-4 flex items-center gap-4">
            <div className="relative h-16 w-16 rounded-full bg-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-white/20">
              {sekolah.logoUrl ? (
                <Image src={sekolah.logoUrl} alt="Logo" fill unoptimized className="object-cover" />
              ) : (
                <Building2 className="h-8 w-8 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base">{sekolah.nama}</h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Kepala Sekolah: <span className="font-medium text-white">{sekolah.kepalaSekolah || "-"}</span>
              </p>
              {sekolah.alamat && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sekolah.alamat}</p>}
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Network className="h-4 w-4" /> Struktur Organisasi
            </h3>
            <p className="text-xs text-slate-500">Hierarki pegawai dari kepala sekolah</p>
          </div>
          <div className="flex gap-2 no-print">
            <Button size="sm" variant="outline" onClick={expandAll} disabled={loading}>
              <Maximize2 className="h-3.5 w-3.5 mr-1" /> Expand
            </Button>
            <Button size="sm" variant="outline" onClick={collapseAll} disabled={loading}>
              <Minimize2 className="h-3.5 w-3.5 mr-1" /> Collapse
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={loading}>
              <Printer className="h-3.5 w-3.5 mr-1" /> Cetak
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-slate-200 rounded-md p-3 text-center">
            <div className="text-xs text-slate-500 flex items-center justify-center gap-1"><Users className="h-3 w-3" /> Total Personil</div>
            <div className="text-base font-bold text-slate-800">{totalNodes}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3 text-center">
            <div className="text-xs text-slate-500">Titik Puncak</div>
            <div className="text-base font-bold text-slate-700">{tree.length}</div>
          </div>
          <div className="border border-slate-200 rounded-md p-3 text-center">
            <div className="text-xs text-slate-500">Kedalaman Maks</div>
            <div className="text-base font-bold text-slate-700">{depth} level</div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : tree.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada data pegawai.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 max-h-[60vh] overflow-y-auto print-full">
            {tree.map((node) => renderNode(node, 0))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OrgStructureSection;
