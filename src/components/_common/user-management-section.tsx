"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Settings, Plus, Pencil, Trash2, Loader2, SearchX, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import { fmtDateDisplay } from "./_format";

interface RoleOpt { id: number; name: string; label: string }
interface SekolahOpt { id: number; nama: string }
interface PegawaiOpt { id: number; nama: string; jabatan?: string | null }
interface SiswaOpt { id: number; nama: string; nis?: string | null }
interface OrtuOpt { id: number; nama: string }

interface User {
  id: number;
  email: string;
  name: string;
  roleId: number;
  sekolahId?: number | null;
  pegawaiId?: number | null;
  ortuId?: number | null;
  siswaId?: number | null;
  isActive: boolean;
  lastLogin?: string | null;
  role: { id: number; name: string; label: string };
  sekolah?: { id: number; nama: string } | null;
}

const ROLE_COLOR: Record<string, string> = {
  SUPER_ADMIN: "bg-slate-800 text-white",
  TU: "bg-violet-100 text-violet-700",
  KEUANGAN: "bg-emerald-100 text-emerald-700",
  GURU: "bg-sky-100 text-sky-700",
  SISWA: "bg-amber-100 text-amber-700",
  ORTU: "bg-rose-100 text-rose-700",
};

export function UserManagementSection() {
  const [list, setList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<User> & { password?: string }>({});
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState<User | null>(null);

  const [roleOpts, setRoleOpts] = useState<RoleOpt[]>([]);
  const [sekolahOpts, setSekolahOpts] = useState<SekolahOpt[]>([]);
  const [pegawaiOpts, setPegawaiOpts] = useState<PegawaiOpt[]>([]);
  const [siswaOpts, setSiswaOpts] = useState<SiswaOpt[]>([]);
  const [ortuOpts, setOrtuOpts] = useState<OrtuOpt[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([
      fetch("/api/role").then((r) => r.json()),
      fetch("/api/sekolah?all=true").then((r) => r.json()),
      fetch("/api/pegawai").then((r) => r.json()),
      fetch("/api/siswa").then((r) => r.json()),
      fetch("/api/ortu").then((r) => r.json()),
    ]).then(([r, s, p, sw, o]: [RoleOpt[], SekolahOpt[] | { error: string }, PegawaiOpt[], SiswaOpt[], OrtuOpt[]]) => {
      if (Array.isArray(r)) setRoleOpts(r);
      if (Array.isArray(s)) setSekolahOpts(s);
      if (Array.isArray(p)) setPegawaiOpts(p);
      if (Array.isArray(sw)) setSiswaOpts(sw);
      if (Array.isArray(o)) setOrtuOpts(o);
    }).catch(() => {});

    // Get current user id from session via /api/auth/... — simpler: read from window? No. We'll just block by email at API side.
    // Use a heuristic: the API blocks self-delete via session.id, so UI doesn't strictly need currentUserId.
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/user");
      const d = await r.json();
      if (Array.isArray(d)) setList(d);
    } catch {
      toast({ title: "Gagal memuat user", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!search) return list;
    const q = search.toLowerCase();
    return list.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.role?.name || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  const handleAdd = () => {
    setEditing({ isActive: true, password: "" });
    setDialogOpen(true);
  };
  const handleEdit = (u: User) => {
    setEditing({ ...u, password: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editing.email || !editing.name || !editing.roleId) {
      toast({ title: "Email, nama, dan role wajib diisi", variant: "destructive" });
      return;
    }
    if (!editing.id && !editing.password) {
      toast({ title: "Password wajib untuk user baru", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        email: editing.email,
        name: editing.name,
        roleId: Number(editing.roleId),
        sekolahId: editing.sekolahId ? Number(editing.sekolahId) : null,
        pegawaiId: editing.pegawaiId ? Number(editing.pegawaiId) : null,
        ortuId: editing.ortuId ? Number(editing.ortuId) : null,
        siswaId: editing.siswaId ? Number(editing.siswaId) : null,
        isActive: editing.isActive !== false,
      };
      if (editing.password && String(editing.password).trim()) {
        payload.password = editing.password;
      }
      const url = editing.id ? `/api/user/${editing.id}` : "/api/user";
      const method = editing.id ? "PUT" : "POST";
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menyimpan");
      toast({ title: editing.id ? "User diperbarui" : "User ditambahkan" });
      setDialogOpen(false);
      setEditing({});
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
      const r = await fetch(`/api/user/${delTarget.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Gagal menghapus");
      toast({ title: "User dihapus" });
      setDelTarget(null);
      await load();
    } catch (e) {
      toast({ title: "Gagal menghapus", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  // Get role-specific linkage hint
  const roleName = editing.roleId ? roleOpts.find((r) => r.id === Number(editing.roleId))?.name : "";

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <Settings className="h-4 w-4" /> Manajemen User
            </h3>
            <p className="text-xs text-slate-500">Akun pengguna & role RBAC (SUPER_ADMIN only)</p>
          </div>
          <Button size="sm" onClick={handleAdd} className="bg-slate-700 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-1" /> Tambah User
          </Button>
        </div>

        <div className="relative w-full max-w-md">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <Input placeholder="Cari nama / email / role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <SearchX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada user.</p>
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[60vh] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Nama</th>
                  <th className="text-left px-3 py-2 font-medium">Email</th>
                  <th className="text-left px-3 py-2 font-medium">Role</th>
                  <th className="text-left px-3 py-2 font-medium">Sekolah</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Last Login</th>
                  <th className="text-right px-3 py-2 font-medium w-20">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60">
                    <td className="px-3 py-2 font-medium text-slate-800">{u.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{u.email}</td>
                    <td className="px-3 py-2">
                      <Badge className={`${ROLE_COLOR[u.role?.name] || "bg-slate-100 text-slate-700"} text-[10px]`}>
                        {u.role?.name || "-"}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{u.sekolah?.nama || "-"}</td>
                    <td className="px-3 py-2">
                      {u.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700"><ShieldCheck className="h-3 w-3" /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-700"><ShieldAlert className="h-3 w-3" /> Inactive</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{u.lastLogin ? fmtDateDisplay(u.lastLogin) : "-"}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                        onClick={() => setDelTarget(u)}
                        disabled={String(u.id) === String(currentUserId)}
                        title={String(u.id) === String(currentUserId) ? "Tidak dapat menghapus diri sendiri" : "Hapus"}
                      >
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

      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing({}); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit User" : "Tambah User"}</DialogTitle>
            <DialogDescription>
              {editing.id ? "Update data user. Kosongkan password jika tidak diubah." : "Buat akun user baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-sm">Nama *</Label>
              <Input value={String(editing.name ?? "")} onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))} placeholder="Nama lengkap" />
            </div>
            <div>
              <Label className="text-sm">Email *</Label>
              <Input type="email" value={String(editing.email ?? "")} onChange={(e) => setEditing((p) => ({ ...p, email: e.target.value }))} placeholder="user@sekolah.id" />
            </div>
            <div>
              <Label className="text-sm">Password {editing.id ? "(kosongkan jika tidak diubah)" : "*"}</Label>
              <Input type="password" value={String(editing.password ?? "")} onChange={(e) => setEditing((p) => ({ ...p, password: e.target.value }))} placeholder="••••••" />
            </div>
            <div>
              <Label className="text-sm">Role *</Label>
              <Select value={String(editing.roleId ?? "")} onValueChange={(v) => setEditing((p) => ({ ...p, roleId: Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih role" /></SelectTrigger>
                <SelectContent>
                  {roleOpts.map((r) => <SelectItem key={r.id} value={String(r.id)}>{r.name} ({r.label})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-sm">Sekolah</Label>
              <Select value={String(editing.sekolahId ?? "none")} onValueChange={(v) => setEditing((p) => ({ ...p, sekolahId: v === "none" ? null : Number(v) }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Pilih sekolah" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Tidak ada —</SelectItem>
                  {sekolahOpts.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Role-specific linkage */}
            {roleName === "GURU" && (
              <div className="sm:col-span-2">
                <Label className="text-sm">Link Pegawai (opsional)</Label>
                <Select value={String(editing.pegawaiId ?? "none")} onValueChange={(v) => setEditing((p) => ({ ...p, pegawaiId: v === "none" ? null : Number(v) }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {pegawaiOpts.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.nama}{p.jabatan ? ` (${p.jabatan})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {roleName === "SISWA" && (
              <div className="sm:col-span-2">
                <Label className="text-sm">Link Siswa (opsional)</Label>
                <Select value={String(editing.siswaId ?? "none")} onValueChange={(v) => setEditing((p) => ({ ...p, siswaId: v === "none" ? null : Number(v) }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih siswa" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {siswaOpts.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.nama}{s.nis ? ` (${s.nis})` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {roleName === "ORTU" && (
              <div className="sm:col-span-2">
                <Label className="text-sm">Link Ortu (opsional)</Label>
                <Select value={String(editing.ortuId ?? "none")} onValueChange={(v) => setEditing((p) => ({ ...p, ortuId: v === "none" ? null : Number(v) }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Pilih ortu" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="none">— Tidak ada —</SelectItem>
                    {ortuOpts.map((o) => <SelectItem key={o.id} value={String(o.id)}>{o.nama}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="sm:col-span-2">
              <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2">
                <Label className="text-sm">Aktif</Label>
                <Switch checked={!!editing.isActive} onCheckedChange={(c) => setEditing((p) => ({ ...p, isActive: c }))} />
              </div>
            </div>
          </div>
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
            <AlertDialogTitle>Hapus user?</AlertDialogTitle>
            <AlertDialogDescription>
              Yakin menghapus user "{delTarget?.name}" ({delTarget?.email})? Tindakan tidak dapat dibatalkan.
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

export default UserManagementSection;
