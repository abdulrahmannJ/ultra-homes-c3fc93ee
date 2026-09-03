import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Archive, Images, Plus, Star, Trash2, Wand2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { UnitImageUploader } from "@/components/admin/rentals/UnitImageUploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { generateUnits } from "@/lib/rentals.functions";
import {
  archiveUnit,
  deleteUnitSafe,
  listUnits,
  reorderUnits,
  saveUnitDetails,
  setUnitStatus,
  toggleUnitFlag,
  UNIT_STATUSES,
  type UnitRecord,
} from "@/lib/units.functions";

type UnitRow = UnitRecord & { image_count: number };

type Draft = {
  id?: string;
  label: string;
  unit_type: string;
  block: string;
  floor: string;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  size_sqm: string;
  monthly_rent: number;
  sale_price: string;
  deposit: number;
  service_charge: number;
  rent_due_day: number;
  parking_spaces: number;
  furnished: boolean;
  amenities: string;
  description: string;
  notes: string;
  is_published: boolean;
  is_featured: boolean;
};

const EMPTY_DRAFT: Draft = {
  label: "",
  unit_type: "",
  block: "",
  floor: "",
  bedrooms: 1,
  bathrooms: 1,
  toilets: 1,
  size_sqm: "",
  monthly_rent: 0,
  sale_price: "",
  deposit: 0,
  service_charge: 0,
  rent_due_day: 5,
  parking_spaces: 0,
  furnished: false,
  amenities: "",
  description: "",
  notes: "",
  is_published: true,
  is_featured: false,
};

const STATUS_LABELS: Record<string, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  sold: "Sold",
  maintenance: "Maintenance",
  off_market: "Off market",
};

function toDraft(unit: UnitRow): Draft {
  return {
    id: unit.id,
    label: unit.label,
    unit_type: unit.unit_type ?? "",
    block: unit.block ?? "",
    floor: unit.floor ?? "",
    bedrooms: unit.bedrooms ?? 0,
    bathrooms: unit.bathrooms ?? 0,
    toilets: unit.toilets ?? 0,
    size_sqm: unit.size_sqm === null ? "" : String(unit.size_sqm),
    monthly_rent: Number(unit.monthly_rent ?? 0),
    sale_price: unit.sale_price === null ? "" : String(unit.sale_price),
    deposit: Number(unit.deposit ?? 0),
    service_charge: Number(unit.service_charge ?? 0),
    rent_due_day: unit.rent_due_day ?? 5,
    parking_spaces: unit.parking_spaces ?? 0,
    furnished: Boolean(unit.furnished),
    amenities: (unit.amenities ?? []).join(", "),
    description: unit.description ?? "",
    notes: unit.notes ?? "",
    is_published: unit.is_published ?? true,
    is_featured: Boolean(unit.is_featured),
  };
}

export function RentalUnitsManager({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const fetchUnits = useServerFn(listUnits);
  const persist = useServerFn(saveUnitDetails);
  const removeUnit = useServerFn(deleteUnitSafe);
  const archive = useServerFn(archiveUnit);
  const flag = useServerFn(toggleUnitFlag);
  const status = useServerFn(setUnitStatus);
  const order = useServerFn(reorderUnits);
  const bulk = useServerFn(generateUnits);

  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DRAFT });
  const [galleryFor, setGalleryFor] = useState<string | null>(null);
  const [prefix, setPrefix] = useState("A");
  const [count, setCount] = useState(6);
  const [bulkRent, setBulkRent] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["property-units", propertyId],
    queryFn: () => fetchUnits({ data: { propertyId } }) as Promise<UnitRow[]>,
  });
  const rows = data ?? [];

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["property-units"] });
    void queryClient.invalidateQueries({ queryKey: ["rental-units"] });
    void queryClient.invalidateQueries({ queryKey: ["rentals-overview"] });
  };
  const fail = (error: Error) => toast.error(error.message);

  const saveMutation = useMutation({
    mutationFn: (input: Draft) =>
      persist({
        data: {
          ...(input.id ? { id: input.id } : {}),
          property_id: propertyId,
          label: input.label,
          unit_type: input.unit_type || null,
          block: input.block || null,
          floor: input.floor || null,
          bedrooms: input.bedrooms,
          bathrooms: input.bathrooms,
          toilets: input.toilets,
          size_sqm: input.size_sqm === "" ? null : Number(input.size_sqm),
          monthly_rent: input.monthly_rent,
          sale_price: input.sale_price === "" ? null : Number(input.sale_price),
          deposit: input.deposit,
          service_charge: input.service_charge,
          rent_due_day: input.rent_due_day,
          parking_spaces: input.parking_spaces,
          furnished: input.furnished,
          amenities: input.amenities
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          description: input.description || null,
          notes: input.notes || null,
          is_published: input.is_published,
          is_featured: input.is_featured,
        },
      }),
    onSuccess: () => {
      toast.success("Unit saved");
      setDraft({ ...EMPTY_DRAFT });
      invalidate();
    },
    onError: fail,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeUnit({ data: { id } }),
    onSuccess: () => {
      toast.success("Unit removed");
      invalidate();
    },
    onError: fail,
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archive({ data: { id } }),
    onSuccess: () => {
      toast.success("Unit taken off market");
      invalidate();
    },
    onError: fail,
  });

  const flagMutation = useMutation({
    mutationFn: (input: { id: string; field: "is_published" | "is_featured"; value: boolean }) =>
      flag({ data: input }),
    onSuccess: invalidate,
    onError: fail,
  });

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => status({ data: input }),
    onSuccess: invalidate,
    onError: fail,
  });

  const orderMutation = useMutation({
    mutationFn: (ordered: string[]) =>
      order({ data: { property_id: propertyId, ordered_ids: ordered } }),
    onSuccess: invalidate,
    onError: fail,
  });

  const generateMutation = useMutation({
    mutationFn: () =>
      bulk({
        data: { property_id: propertyId, count, prefix, monthly_rent: bulkRent, rent_due_day: 5 },
      }),
    onSuccess: () => {
      toast.success("Units generated");
      invalidate();
    },
    onError: fail,
  });

  function move(index: number, direction: -1 | 1) {
    const next = [...rows];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (!a || !b) return;
    next[index] = b;
    next[target] = a;
    orderMutation.mutate(next.map((unit) => unit.id));
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div>
        <h3 className="text-sm font-semibold">Units</h3>
        <p className="text-xs text-muted-foreground">
          Individual doors inside this development — each with its own pricing, photos and
          availability.
        </p>
      </div>

      <div className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Prefix</Label>
          <Input value={prefix} onChange={(e) => setPrefix(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">How many</Label>
          <Input
            type="number"
            value={String(count)}
            onChange={(e) => setCount(Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Rent each (KES)</Label>
          <Input
            type="number"
            value={String(bulkRent)}
            onChange={(e) => setBulkRent(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            <Wand2 className="mr-2 h-4 w-4" />
            Generate {prefix}1–{prefix}
            {Math.max(count, 1)}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-lg bg-muted/40" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No units yet for this property.</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {rows.map((unit, index) => (
            <li key={unit.id} className="space-y-3 px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 text-sm">
                  <span className="font-medium">{unit.label}</span>
                  {unit.block ? (
                    <span className="ml-1 text-xs text-muted-foreground">· {unit.block}</span>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    {unit.bedrooms} bed · {unit.bathrooms} bath · KES{" "}
                    {Number(unit.monthly_rent).toLocaleString()}/mo
                    {unit.sale_price
                      ? ` · sale KES ${Number(unit.sale_price).toLocaleString()}`
                      : ""}
                    {unit.floor ? ` · floor ${unit.floor}` : ""} · {unit.image_count} photo
                    {unit.image_count === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={unit.status}
                    onValueChange={(value) => statusMutation.mutate({ id: unit.id, status: value })}
                  >
                    <SelectTrigger className="h-8 w-[140px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_STATUSES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {STATUS_LABELS[value] ?? value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Badge variant={unit.is_published ? "secondary" : "outline"}>
                    {unit.is_published ? "Live" : "Hidden"}
                  </Badge>
                  <Switch
                    checked={unit.is_published}
                    onCheckedChange={(value) =>
                      flagMutation.mutate({ id: unit.id, field: "is_published", value })
                    }
                    aria-label="Publish unit"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={unit.is_featured ? "Unfeature unit" : "Feature unit"}
                    onClick={() =>
                      flagMutation.mutate({
                        id: unit.id,
                        field: "is_featured",
                        value: !unit.is_featured,
                      })
                    }
                  >
                    <Star
                      className={`h-4 w-4 ${unit.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Move up"
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Move down"
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGalleryFor(galleryFor === unit.id ? null : unit.id)}
                  >
                    <Images className="mr-2 h-4 w-4" />
                    Photos
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDraft(toDraft(unit))}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Take off market"
                    onClick={() => archiveMutation.mutate(unit.id)}
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Delete unit"
                    onClick={() => deleteMutation.mutate(unit.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              {galleryFor === unit.id ? <UnitImageUploader unitId={unit.id} /> : null}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium">{draft.id ? "Edit unit" : "Add a unit"}</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Label</Label>
            <Input
              value={draft.label}
              placeholder="A1"
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Unit type</Label>
            <Input
              value={draft.unit_type}
              placeholder="Bedsitter, 2 bedroom…"
              onChange={(e) => setDraft({ ...draft, unit_type: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Block</Label>
            <Input
              value={draft.block}
              onChange={(e) => setDraft({ ...draft, block: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Floor</Label>
            <Input
              value={draft.floor}
              onChange={(e) => setDraft({ ...draft, floor: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Bedrooms</Label>
            <Input
              type="number"
              value={String(draft.bedrooms)}
              onChange={(e) => setDraft({ ...draft, bedrooms: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Bathrooms</Label>
            <Input
              type="number"
              value={String(draft.bathrooms)}
              onChange={(e) => setDraft({ ...draft, bathrooms: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Toilets</Label>
            <Input
              type="number"
              value={String(draft.toilets)}
              onChange={(e) => setDraft({ ...draft, toilets: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Size (sqm)</Label>
            <Input
              type="number"
              value={draft.size_sqm}
              onChange={(e) => setDraft({ ...draft, size_sqm: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Monthly rent</Label>
            <Input
              type="number"
              value={String(draft.monthly_rent)}
              onChange={(e) => setDraft({ ...draft, monthly_rent: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Sale price</Label>
            <Input
              type="number"
              value={draft.sale_price}
              placeholder="Leave blank if not for sale"
              onChange={(e) => setDraft({ ...draft, sale_price: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Deposit</Label>
            <Input
              type="number"
              value={String(draft.deposit)}
              onChange={(e) => setDraft({ ...draft, deposit: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Service charge</Label>
            <Input
              type="number"
              value={String(draft.service_charge)}
              onChange={(e) => setDraft({ ...draft, service_charge: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Rent due day</Label>
            <Input
              type="number"
              value={String(draft.rent_due_day)}
              onChange={(e) => setDraft({ ...draft, rent_due_day: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Parking spaces</Label>
            <Input
              type="number"
              value={String(draft.parking_spaces)}
              onChange={(e) => setDraft({ ...draft, parking_spaces: Number(e.target.value) })}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch
              checked={draft.furnished}
              onCheckedChange={(value) => setDraft({ ...draft, furnished: value })}
              id="unit-furnished"
            />
            <Label htmlFor="unit-furnished" className="text-xs">
              Furnished
            </Label>
          </div>
          <div className="flex items-center gap-4 pt-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_published}
                onCheckedChange={(value) => setDraft({ ...draft, is_published: value })}
                id="unit-published"
              />
              <Label htmlFor="unit-published" className="text-xs">
                Published
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={draft.is_featured}
                onCheckedChange={(value) => setDraft({ ...draft, is_featured: value })}
                id="unit-featured"
              />
              <Label htmlFor="unit-featured" className="text-xs">
                Featured
              </Label>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Amenities (comma separated)</Label>
            <Input
              value={draft.amenities}
              placeholder="Balcony, Borehole water, Lift"
              onChange={(e) => setDraft({ ...draft, amenities: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Public description</Label>
            <Textarea
              rows={2}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Internal notes</Label>
          <Textarea
            rows={2}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            disabled={!draft.label.trim() || saveMutation.isPending}
            onClick={() => saveMutation.mutate(draft)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {draft.id ? "Update unit" : "Add unit"}
          </Button>
          {draft.id ? (
            <Button type="button" variant="outline" onClick={() => setDraft({ ...EMPTY_DRAFT })}>
              Cancel
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
