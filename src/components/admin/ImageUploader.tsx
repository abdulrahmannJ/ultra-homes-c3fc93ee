import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ensureImageBucket, signImages } from "@/lib/admin.functions";

const BUCKET = "property-images";

function isStoragePath(value: string) {
  return !/^(https?:)?\/\//.test(value) && !value.startsWith("/") && !value.startsWith("data:");
}

export function ImageUploader({
  images,
  featured,
  onChange,
  onFeaturedChange,
  folder = "properties",
}: {
  images: string[];
  featured: string | null;
  onChange: (images: string[]) => void;
  onFeaturedChange: (featured: string | null) => void;
  folder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const ensureBucket = useServerFn(ensureImageBucket);
  const sign = useServerFn(signImages);

  const storagePaths = images.filter(isStoragePath);
  const { data: signed } = useQuery({
    queryKey: ["signed-images", storagePaths],
    queryFn: () => sign({ data: { paths: storagePaths } }),
    enabled: storagePaths.length > 0,
    staleTime: 30 * 60_000,
  });

  const previewFor = (path: string) => (isStoragePath(path) ? (signed?.[path] ?? "") : path);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      await ensureBucket({});
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${folder}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw new Error(error.message);
        uploaded.push(path);
      }
      const next = [...images, ...uploaded];
      onChange(next);
      if (!featured && next[0]) onFeaturedChange(next[0]);
      toast.success(`${uploaded.length} image${uploaded.length > 1 ? "s" : ""} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(path: string) {
    const next = images.filter((img) => img !== path);
    onChange(next);
    if (featured === path) onFeaturedChange(next[0] ?? null);
    if (isStoragePath(path)) void supabase.storage.from(BUCKET).remove([path]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="mr-2 h-4 w-4" />
          )}
          Upload images
        </Button>
        <p className="text-xs text-muted-foreground">
          Stored privately; the website shows them through secure signed links.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />

      {images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No images yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((path) => (
            <div key={path} className="group relative overflow-hidden rounded-lg border border-border">
              <img
                src={previewFor(path)}
                alt="Property"
                loading="lazy"
                className="aspect-4/3 w-full bg-muted object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/85 px-2 py-1">
                <button
                  type="button"
                  onClick={() => onFeaturedChange(path)}
                  className="flex items-center gap-1 text-xs font-medium"
                  title="Set as featured image"
                >
                  <Star
                    className={`h-3.5 w-3.5 ${featured === path ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                  {featured === path ? "Featured" : "Make featured"}
                </button>
                <button type="button" onClick={() => remove(path)} title="Remove image">
                  <X className="h-4 w-4 text-destructive" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
