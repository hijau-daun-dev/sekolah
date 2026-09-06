"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const callbackUrl = params.get("callbackUrl") || "/";

  useEffect(() => { fetch("/api/seed", { method: "POST" }).catch(() => {}); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Email atau password salah"); setLoading(false); return; }
      window.location.href = callbackUrl;
    } catch { setError("Terjadi kesalahan jaringan"); setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg mb-3">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SIMSEKOLAH</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sistem Manajemen Sekolah</p>
        </div>
        <Card className="shadow-lg border-slate-200">
          <CardHeader><CardTitle className="text-lg">Masuk ke Sistem</CardTitle><CardDescription>Silakan masukkan kredensial Anda.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@sekolah.sch.id" required disabled={loading} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required className="pr-10" disabled={loading} />
                  <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" disabled={loading}>
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (<div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm"><AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /><span>{error}</span></div>)}
              <Button type="submit" className="w-full" disabled={loading}>{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</> : "Masuk"}</Button>
            </form>
            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Akun Demo:</p>
              <div className="grid gap-1 text-[11px] text-muted-foreground/90 font-mono">
                <div>admin@alhidayah.sch.id / admin123 <span className="text-slate-400">(Super Admin Yayasan)</span></div>
                <div>tu@mialhidayah.sch.id / tu123 <span className="text-slate-400">(MI)</span></div>
                <div>keuangan@mialhidayah.sch.id / keuangan123 <span className="text-slate-400">(MI)</span></div>
                <div>guru@mialhidayah.sch.id / guru123 <span className="text-slate-400">(MI)</span></div>
                <div>mts-tu@mtsalhidayah.sch.id / tu123 <span className="text-slate-400">(MTs)</span></div>
                <div>mts-keuangan@mtsalhidayah.sch.id / keuangan123 <span className="text-slate-400">(MTs)</span></div>
                <div>mts-guru@mtsalhidayah.sch.id / guru123 <span className="text-slate-400">(MTs)</span></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (<Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-100"><div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" /></div>}><LoginForm /></Suspense>);
}
