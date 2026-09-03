"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { Upload, X, Loader2, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  shape?: "circle" | "square" | "rounded";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "h-20 w-20",
  md: "h-28 w-28",
  lg: "h-40 w-40",
};

const shapeClass = (shape: ImageUploadProps["shape"]) => {
  if (shape === "circle") return "rounded-full";
  if (shape === "square") return "rounded-none";
  return "rounded-xl";
};

export function ImageUpload({
  value,
  onChange,
  label = "Unggah Foto",
  shape = "rounded",
  size = "md",
  className,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("File harus berupa gambar");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran maksimal 5MB");
        return;
      }
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal unggah");
        onChange(data.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Gagal unggah");
      } finally {
        setUploading(false);
      }
    },
    [onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <span className="text-sm font-medium text-foreground">{label}</span>
      )}
      <div className="flex items-start gap-4">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={cn(
            "relative flex items-center justify-center border-2 border-dashed bg-muted/40 transition-colors overflow-hidden",
            sizeMap[size],
            shapeClass(shape),
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/60"
          )}
        >
          {value ? (
            <>
              <Image
                src={value}
                alt="Pratinjau"
                fill
                unoptimized
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onChange(null)}
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 z-10"
                aria-label="Hapus foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary p-2"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-[10px]">Klik / Drop</span>
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background hover:bg-accent text-foreground text-xs font-medium transition-colors disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            Pilih File
          </button>
          <span>Format: JPG, PNG, WEBP</span>
          <span>Maksimal: 5MB</span>
          {error && <span className="text-destructive">{error}</span>}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
