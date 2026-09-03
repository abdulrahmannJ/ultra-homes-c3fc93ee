import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { ensureImageBucket } from "@/lib/admin.functions";
import {
  addUnitImages,
  deleteUnitImage,
  listUnitImages,
  reorderUnitImages,
  updateUnitImage,
  type UnitImage,
} from "@/lib/units.functions";

const BUCKET = "property-images";

export function UnitImageUploader({ unitId }: { unitId: string }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const fetchImages = useServerFn(listUnitImages);
  const ensureBucket = useServerFn(ensureImageBucket);
  const addImages = useServerFn(addUnitImages);
  const patchImage = useServerFn(updateUnitImage);
  const reorder = useServerFn(reorderUnitImages);
  const removeImage = useServerFn(deleteUnitImage);

  const key = ["unit-images", unitId];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchImages({ data: { unitId } }) as Promise<UnitImage[]>,
  });
  const images = data ?? [];

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: key });

  const coverMutation = useMutation({
    mutationFn: (image: UnitImage) =>
      patchImage({ data: { id: image.id, unit_id: unitId, is_cover: true } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const altMutation = useMutation({
    mutationFn: (input: { id: string; alt: string }) =>
      patchImage({ data: { id: input.id, unit_id: unitId, alt: input.alt || null } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const orderMutation = useMutation({
    mutationFn: (ordered: string[]) => reorder({ data: { unit_id: unitId, ordered_ids: ordered } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeImage({ data: { id } }),
    onSuccess: () => {
      toast.success("Image removed");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function move(index: number, direction: -1 | 1) {
    const next = [...images];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    orderMutation.mutate(next.map((img) => img.id));
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      await ensureBucket({});
      const paths: string[] = [];
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `units/${unitId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });
        if (error) throw new Error(error.message);
        paths.push(path);
      }
      await addImages({ data: { unit_id: unitId, paths } });
      toast.success(`${paths.length} image${paths.length > 1 ? "s" : ""} uploaded`);
      invalidate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
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
          Upload unit photos
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

      {isLoading ? (
        <div className="h-24 animate-pulse rounded-lg bg-muted/40" />
      ) : images.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground">
          No photos for this unit yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.id} className="space-y-1.5 rounded-lg border border-border p-1.5">
              <div className="relative overflow-hidden rounded-md">
                <img
                  src={image.url}
                  alt={image.alt ?? "Unit photo"}
                  loading="lazy"
                  className="aspect-4/3 w-full bg-muted object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/85 px-1.5 py-1">
                  <button
                    type="button"
                    title="Set as cover photo"
                    onClick={() => coverMutation.mutate(image)}
                    className="flex items-center gap-1 text-[11px] font-medium"
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${image.is_cover ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                    {image.is_cover ? "Cover" : "Make cover"}
                  </button>
                  <div className="flex items-center gap-0.5">
                    <button type="button" title="Move left" onClick={() => move(index, -1)}>
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" title="Move right" onClick={() => move(index, 1)}>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Remove photo"
                      onClick={() => deleteMutation.mutate(image.id)}
                    >
                      <X className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
              <Input
                defaultValue={image.alt ?? ""}
                placeholder="Alt text"
                className="h-8 text-xs"
                onBlur={(event) => {
                  const value = event.target.value;
                  if (value !== (image.alt ?? "")) altMutation.mutate({ id: image.id, alt: value });
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
