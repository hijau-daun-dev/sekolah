"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = params.get("callbackUrl") || "/";

  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
  }, []);

  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    fetch("/api/seed", { method: "POST" }).catch(() => {});
    fetch("/api/auth/csrf", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCsrfToken(d.csrfToken))
      .catch(() => {});
  }, []);

  const onSubmit = (e: React.FormEvent) => {
    // Let the browser handle the native form submission (follows redirect, sets cookie reliably)
    if (!email || !password) {
      e.preventDefault();
      return;
    }
    setLoading(true);
    // Form will navigate to /api/auth/callback/credentials → 302 → callbackUrl
    // No preventDefault so browser submits natively
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-lg mb-3">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">SIMSEKOLAH</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sistem Manajemen Sekolah SD-SMP</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Masuk ke Sistem</CardTitle>
            <CardDescription>
              Silakan masukkan kredensial Anda untuk melanjutkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action="/api/auth/callback/credentials"
              method="POST"
              onSubmit={onSubmit}
              className="space-y-4"
            >
              <input type="hidden" name="csrfToken" value={csrfToken} />
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@sekolah.sch.id"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Memproses...</>
                ) : (
                  "Masuk"
                )}
              </Button>
            </form>

            <div className="mt-5 pt-4 border-t border-slate-200">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Akun Demo (auto-seed):</p>
              <div className="grid gap-1 text-[11px] text-muted-foreground/90 font-mono">
                <div className="flex justify-between"><span>Super Admin:</span><span>admin@…/admin123</span></div>
                <div className="flex justify-between"><span>TU:</span><span>tu@…/tu123</span></div>
                <div className="flex justify-between"><span>Keuangan:</span><span>keuangan@…/keuangan123</span></div>
                <div className="flex justify-between"><span>Guru:</span><span>guru@…/guru123</span></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-4">
          © {new Date().getFullYear()} SIMSEKOLAH. Sistem Manajemen Sekolah.
        </p>
      </div>
    </div>
  );
}
