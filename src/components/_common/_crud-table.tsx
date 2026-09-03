"use client";

import { useCallback, useEffect, useMemo, useState, ReactNode } from "react";
import { Plus, Pencil, Trash2, Loader2, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export type FieldType = "text" | "number" | "date" | "textarea" | "select" | "switch";

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  // for select: provide options OR optionKey (look up in optionsMap)
  options?: { value: string; label: string }[];
  optionKey?: string;
  // for number: optional step
  step?: string;
  // span (sm:col-span-2)
  full?: boolean;
  // helper
  help?: string;
}

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell?: (row: T) => ReactNode;
  className?: string;
}

interface CrudTableProps<T extends { id: number }> {
  title: string;
  description?: string;
  fetchUrl: string;
  columns: ColumnDef<T>[];
  fields: FieldDef[];
  // optional lookup options for select with optionKey
  optionsMap?: Record<string, { value: string; label: string }[]>;
  // initial empty record (without id)
  emptyRecord: Record<string, unknown>;
  // search fields (which keys to filter client-side)
  searchKeys?: (keyof T)[];
  searchPlaceholder?: string;
  // optional custom validate function
  validate?: (rec: Record<string, unknown>) => string | null;
  // optional render of a custom header bar above table
  extraHeader?: ReactNode;
  // disable add button
  disableAdd?: boolean;
  // format payload before sending
  formatPayload?: (rec: Record<string, unknown>) => Record<string, unknown>;
  // process item after fetch
  processItem?: (item: T) => T;
}

export function CrudTable<T extends { id: number }>({
  title, description, fetchUrl, columns, fields, optionsMap,
  emptyRecord, searchKeys, searchPlaceholder, validate, extraHeader,
  disableAdd, formatPayload, processItem,
}: CrudTableProps<T>) {
  const [list, setList] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<T | null>(null);
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(fetchUrl);
      const d = await r.json();
      if (Array.isArray(d)) {
        setList(processItem ? d.map(processItem) : d);
      }
    } catch {
      toast({ title: `Gagal memuat ${title.toLowerCase()}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [fetchUrl, toast, title, processItem]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search || !searchKeys) return list;
    const q = search.toLowerCase();
    return list.filter((row) =>
      searchKeys.some((k) => {
        const v = (row as Record<string, unknown>)[k as string];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [list, search, searchKeys]);

  const handleAdd = () => { setEditing({ ...emptyRecord }); setDialogOpen(true); };
  const handleEdit = (row: T) => {
    // For date fields, convert ISO to yyyy-mm-dd
    const rec: Record<string, unknown> = { ...row };
    fields.forEach((f) => {
      if (f.type === "date" && rec[f.key]) {
        rec[f.key] = new Date(rec[f.key] as string).toISOString().split("T")[0];
      }
      if (f.type === "select" && rec[f.key] == null) {
        rec[f.key] = "";
      }
    });
    setEditing(rec);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;
    const err = validate ? validate(editing) : null;
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    // required check
    for (const f of fields) {
      if (f.required) {
        const v = editing[f.key];
        if (v == null || v === "" || (typeof v === "string" && !v.trim())) {
          toast({ title: `${f.label} wajib diisi`, variant: "destructive" });
          return;
        }
      }
    }
    setSaving(true);
    try {
      let payload = { ...editing };
      // convert date fields to ISO
      fields.forEach((f) => {
        if (f.type === "date") {
          const v = payload[f.key];
          payload[f.key] = v ? new Date(v as string).toISOString() : null;
        }
        if (f.type === "select" && (payload[f.key] === "" || payload[f.key] === "none")) {
          payload[f.key] = null;
        }
        if (f.type === "number") {
          const v = payload[f.key];
          payload[f.key] = v === "" || v == null ? null : Number(v);
        }
      });
      if (formatPayload) payload = formatPayload(payload);

      const id = editing.id;
      const url = id ? `${fetchUrl}/${id}` : fetchUrl;
      const method = id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: id ? "Data diperbarui" : "Data ditambahkan" });
      setDialogOpen(false);
      setEditing(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menyimpan", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    try {
      const r = await fetch(`${fetchUrl}/${(delTarget as { id: number }).id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "Data dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  const update = (k: string, v: unknown) => setEditing((p) => p ? { ...p, [k]: v } : p);

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{title}</h3>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
          <div className="flex gap-2">
            {searchKeys && (
              <div className="relative w-full sm:w-56">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                </svg>
                <Input placeholder={searchPlaceholder || "Cari..."} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
              </div>
            )}
            {!disableAdd && (
              <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
                <Plus className="h-4 w-4 mr-1" /> Tambah
              </Button>
            )}
          </div>
        </div>
        {extraHeader}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada data.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className={`text-left px-3 py-2 font-medium whitespace-nowrap ${c.className || ""}`}>{c.header}</th>
                  ))}
                  <th className="text-right px-3 py-2 font-medium w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <tr key={(row as { id: number }).id} className="hover:bg-slate-50/60">
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2 align-top ${c.className || ""}`}>
                        {c.cell ? c.cell(row) : String((row as Record<string, unknown>)[c.key] ?? "-")}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(row)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => setDelTarget(row)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Edit ${title}` : `Tambah ${title}`}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              {fields.map((f) => {
                const val = editing[f.key];
                if (f.type === "switch") {
                  return (
                    <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                      <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                        <Label className="text-sm">{f.label}</Label>
                        <Switch checked={!!val} onCheckedChange={(c) => update(f.key, c)} />
                      </div>
                      {f.help && <p className="text-[10px] text-slate-500 mt-1">{f.help}</p>}
                    </div>
                  );
                }
                if (f.type === "textarea") {
                  return (
                    <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                      <Label className="text-sm">{f.label}{f.required ? " *" : ""}</Label>
                      <Textarea value={String(val || "")} onChange={(e) => update(f.key, e.target.value)} placeholder={f.placeholder} rows={2} />
                    </div>
                  );
                }
                if (f.type === "select") {
                  const opts = f.options ?? (f.optionKey && optionsMap ? optionsMap[f.optionKey] : []) ?? [];
                  return (
                    <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                      <Label className="text-sm">{f.label}{f.required ? " *" : ""}</Label>
                      <Select value={String(val ?? "") || "none"} onValueChange={(v) => update(f.key, v === "none" ? null : v)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder={f.placeholder || "Pilih"} /></SelectTrigger>
                        <SelectContent>
                          {!f.required && <SelectItem value="none">— Tidak ada —</SelectItem>}
                          {opts.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {f.help && <p className="text-[10px] text-slate-500 mt-1">{f.help}</p>}
                    </div>
                  );
                }
                return (
                  <div key={f.key} className={f.full ? "sm:col-span-2" : ""}>
                    <Label className="text-sm">{f.label}{f.required ? " *" : ""}</Label>
                    <Input
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      step={f.step}
                      value={String(val ?? "")}
                      onChange={(e) => update(f.key, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-slate-700 hover:bg-slate-800">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus data?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus data ini? Tindakan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export { Badge };
