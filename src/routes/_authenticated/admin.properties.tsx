import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ImageUploader } from "@/components/admin/ImageUploader";
import { RentalUnitsManager } from "@/components/admin/rentals/RentalUnitsManager";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteProperty,
  listAdminProperties,
  saveProperty,
  togglePropertyFlag,
  type PropertyInput,
} from "@/lib/admin.functions";
import { formatPrice, slugify } from "@/lib/format";
import { listUnitSummaries } from "@/lib/units.functions";
import type { Property } from "@/lib/types";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/properties")({
  head: () => ({
    meta: [
      { title: "Properties | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PropertiesPage,
});

const LISTING_TYPES = ["sale", "rent"];
const PROPERTY_TYPES = ["apartment", "house", "villa", "townhouse", "land", "commercial", "office"];
const STATUSES = ["available", "reserved", "sold", "new", "let"];
const STRUCTURES = [
  { value: "standalone", label: "Standalone property" },
  { value: "multi_unit", label: "Multi-unit development" },
];
const LISTING_PURPOSES = [
  { value: "for_sale", label: "For sale" },
  { value: "for_rent", label: "For rent" },
  { value: "sale_and_rent", label: "Sale & rent" },
  { value: "rental_management", label: "Rental management" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed", label: "Mixed" },
];

const EMPTY: PropertyInput = {
  title: "",
  slug: "",
  short_description: "",
  description: "",
  price: 0,
  discount_price: null,
  currency: "KES",
  listing_type: "sale",
  property_type: "apartment",
  structure: "standalone",
  listing_purpose: "for_sale",
  status: "available",
  county: "",
  town: "",
  neighborhood: "",
  address: "",
  bedrooms: 0,
  bathrooms: 0,
  garage: 0,
  area_sqft: null,
  plot_size: "",
  developer: "",
  construction_status: "",
  payment_plan: "",
  amenities: [],
  nearby_schools: [],
  nearby_hospitals: [],
  nearby_shopping: [],
  images: [],
  featured_image: null,
  youtube_url: "",
  virtual_tour_url: "",
  is_featured: false,
  is_published: false,
  is_archived: false,
};

function toList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function summaryLine(
  property: Property,
  summary?: { unit_count: number; available_units: number; min_rent: number | null; min_sale_price: number | null },
) {
  if (property.structure !== "multi_unit") {
    return `${formatPrice(property.price, property.currency, property.listing_type)} · ${property.bedrooms} bed`;
  }
  if (!summary || summary.unit_count === 0) return "Development · no units yet";
  const from = summary.min_rent ?? summary.min_sale_price;
  const price = from
    ? `From ${formatPrice(from, property.currency, summary.min_rent ? "rent" : "sale")}`
    : "Pricing on units";
  return `${price} · ${summary.unit_count} unit${summary.unit_count === 1 ? "" : "s"} · ${summary.available_units} available`;
}

function PropertiesManager() {
  const queryClient = useQueryClient();
  const fetchProperties = useServerFn(listAdminProperties);
  const persist = useServerFn(saveProperty);
  const remove = useServerFn(deleteProperty);
  const toggle = useServerFn(togglePropertyFlag);
  const fetchSummaries = useServerFn(listUnitSummaries);

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PropertyInput | null>(null);

  const { data: properties, isLoading } = useQuery({
    queryKey: ["admin-properties"],
    queryFn: () => fetchProperties(),
  });

  const { data: summaries } = useQuery({
    queryKey: ["admin-unit-summaries"],
    queryFn: () => fetchSummaries(),
  });
  const summaryByProperty = useMemo(
    () => new Map((summaries ?? []).map((row) => [row.property_id, row])),
    [summaries],
  );

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin-unit-summaries"] });
    return queryClient.invalidateQueries({ queryKey: ["admin-properties"] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: PropertyInput) => persist({ data: input }),
    onSuccess: () => {
      toast.success("Property saved");
      setEditing(null);
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Property deleted");
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const toggleMutation = useMutation({
    mutationFn: (input: {
      id: string;
      field: "is_published" | "is_featured" | "is_archived";
      value: boolean;
    }) => toggle({ data: input }),
    onSuccess: () => void invalidate(),
    onError: (error) => toast.error(error.message),
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (properties ?? []).filter((property) =>
      !term
        ? true
        : [property.title, property.town, property.county, property.slug]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [properties, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create listings, upload photography and control what appears on the website.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" /> New property
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by title, town or slug"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <Building2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No properties found.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((property) => (
            <li
              key={property.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{property.title}</p>
                  <Badge variant="outline" className="capitalize">
                    {property.listing_type}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">
                    {property.status}
                  </Badge>
                  {property.structure === "multi_unit" ? (
                    <Badge variant="outline">Multi-unit</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {[property.neighborhood, property.town, property.county].filter(Boolean).join(", ") ||
                    "No location set"}{" "}
                  · {summaryLine(property, summaryByProperty.get(property.id))} ·{" "}
                  {property.views ?? 0} views
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={property.is_published}
                    onCheckedChange={(value) =>
                      toggleMutation.mutate({ id: property.id, field: "is_published", value })
                    }
                  />
                  Published
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch
                    checked={property.is_featured}
                    onCheckedChange={(value) =>
                      toggleMutation.mutate({ id: property.id, field: "is_featured", value })
                    }
                  />
                  Featured
                </label>
                <Button variant="outline" size="icon" onClick={() => setEditing(property)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Delete property">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete “{property.title}”?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This removes the listing and its enquiry links. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(property.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing ? (
        <PropertyEditor
          value={editing}
          saving={saveMutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input) => saveMutation.mutate(input)}
        />
      ) : null}
    </div>
  );
}

function PropertyEditor({
  value,
  saving,
  onCancel,
  onSave,
}: {
  value: PropertyInput;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: PropertyInput) => void;
}) {
  const [form, setForm] = useState<PropertyInput>(value);

  const set = <K extends keyof PropertyInput>(key: K, next: PropertyInput[K]) =>
    setForm((current) => ({ ...current, [key]: next }));
  const multiUnit = form.structure === "multi_unit";

  return (
    <Dialog open onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit property" : "New property"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title ?? ""}
                onChange={(event) => {
                  const title = event.target.value;
                  setForm((current) => ({
                    ...current,
                    title,
                    slug: current.id ? (current.slug ?? "") : slugify(title),
                  }));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug ?? ""} onChange={(e) => set("slug", slugify(e.target.value))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Short description</Label>
            <Input
              value={form.short_description ?? ""}
              onChange={(e) => set("short_description", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Full description</Label>
            <Textarea
              rows={5}
              value={form.description ?? ""}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Structure</Label>
              <Select
                value={form.structure ?? "standalone"}
                onValueChange={(next) => set("structure", next)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STRUCTURES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {multiUnit
                  ? "Pricing and dwelling details live on each unit below."
                  : "One sellable or rentable asset with its own price and specification."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Listing purpose</Label>
              <Select
                value={form.listing_purpose ?? "for_sale"}
                onValueChange={(next) => set("listing_purpose", next)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_PURPOSES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {multiUnit ? null : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input
                type="number"
                value={String(form.price ?? 0)}
                onChange={(e) => set("price", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discounted price</Label>
              <Input
                type="number"
                value={form.discount_price == null ? "" : String(form.discount_price)}
                onChange={(e) =>
                  set("discount_price", e.target.value ? Number(e.target.value) : null)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={form.currency ?? "KES"} onChange={(e) => set("currency", e.target.value)} />
            </div>
          </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Listing type</Label>
              <Select
                value={form.listing_type ?? "sale"}
                onValueChange={(next) => set("listing_type", next)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_TYPES.map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Property type</Label>
              <Select
                value={form.property_type ?? "apartment"}
                onValueChange={(next) => set("property_type", next)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status ?? "available"} onValueChange={(next) => set("status", next)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((item) => (
                    <SelectItem key={item} value={item} className="capitalize">
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>County</Label>
              <Input value={form.county ?? ""} onChange={(e) => set("county", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Town</Label>
              <Input value={form.town ?? ""} onChange={(e) => set("town", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Neighborhood</Label>
              <Input
                value={form.neighborhood ?? ""}
                onChange={(e) => set("neighborhood", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value)} />
            </div>
          </div>

          {multiUnit ? (
            <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
              Bedrooms, bathrooms, parking, size and price are managed per unit for a multi-unit
              development — the listing only carries building-level information.
            </p>
          ) : (
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Bedrooms</Label>
              <Input
                type="number"
                value={String(form.bedrooms ?? 0)}
                onChange={(e) => set("bedrooms", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Bathrooms</Label>
              <Input
                type="number"
                value={String(form.bathrooms ?? 0)}
                onChange={(e) => set("bathrooms", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Garage</Label>
              <Input
                type="number"
                value={String(form.garage ?? 0)}
                onChange={(e) => set("garage", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Area (sqft)</Label>
              <Input
                type="number"
                value={form.area_sqft == null ? "" : String(form.area_sqft)}
                onChange={(e) => set("area_sqft", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Plot size</Label>
              <Input value={form.plot_size ?? ""} onChange={(e) => set("plot_size", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Developer</Label>
              <Input value={form.developer ?? ""} onChange={(e) => set("developer", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Construction status</Label>
              <Input
                value={form.construction_status ?? ""}
                onChange={(e) => set("construction_status", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment plan</Label>
              <Input
                value={form.payment_plan ?? ""}
                onChange={(e) => set("payment_plan", e.target.value)}
              />
            </div>
          </div>

          {(
            [
              ["amenities", "Amenities"],
              ["nearby_schools", "Nearby schools"],
              ["nearby_hospitals", "Nearby hospitals"],
              ["nearby_shopping", "Nearby shopping"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label} (comma separated)</Label>
              <Input
                value={(form[key] ?? []).join(", ")}
                onChange={(e) => set(key, toList(e.target.value))}
              />
            </div>
          ))}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>YouTube URL</Label>
              <Input
                value={form.youtube_url ?? ""}
                onChange={(e) => set("youtube_url", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Virtual tour URL</Label>
              <Input
                value={form.virtual_tour_url ?? ""}
                onChange={(e) => set("virtual_tour_url", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{multiUnit ? "Building gallery (exterior & shared areas)" : "Gallery"}</Label>
            <ImageUploader
              images={form.images ?? []}
              featured={form.featured_image ?? null}
              onChange={(images) => set("images", images)}
              onFeaturedChange={(featured) => set("featured_image", featured)}
            />
          </div>

          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={Boolean(form.is_published)}
                onCheckedChange={(next) => set("is_published", next)}
              />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={Boolean(form.is_featured)}
                onCheckedChange={(next) => set("is_featured", next)}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={Boolean(form.is_archived)}
                onCheckedChange={(next) => set("is_archived", next)}
              />
              Archived
            </label>
          </div>

          {multiUnit ? (
            form.id ? (
              <RentalUnitsManager propertyId={form.id} />
            ) : (
              <p className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                Save this development first — units can be added once the listing exists.
              </p>
            )
          ) : null}
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => onSave(form)}>
            {saving ? "Saving…" : "Save property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PropertiesPage() {
  return (
    <PermissionGate permission="properties">
      <PropertiesManager />
    </PermissionGate>
  );
}

export type { Property };
