"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface DataTableShellProps {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  toolbar?: React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  emptyIcon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}

export function DataTableShell({
  title, description, icon: Icon, toolbar, loading, emptyMessage, emptyIcon: EmptyIcon, children,
}: DataTableShellProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {Icon && <Icon className="h-5 w-5 text-primary" />} {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {toolbar}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ icon: Icon, message }: { icon?: React.ComponentType<{ className?: string }>; message: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      {Icon && <Icon className="h-10 w-10 mx-auto mb-2 opacity-50" />}
      <p className="text-sm">{message}</p>
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative w-full max-w-sm">
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
      </svg>
      <Input placeholder={placeholder || "Cari..."} value={value} onChange={(e) => onChange(e.target.value)} className="pl-8" />
    </div>
  );
}
