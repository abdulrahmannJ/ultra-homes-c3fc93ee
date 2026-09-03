/**
 * Server-only helpers that expose PUBLISHED unit data to the public site.
 * Only `property_units` / `unit_images` are read here — never tenants,
 * leases, rent charges or payments.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Property, PropertyListing, PublicUnit, UnitSummary } from "./types";

type Client = SupabaseClient<any, any, any>;

export const PUBLIC_UNIT_COLUMNS =
  "id, property_id, label, unit_type, block, floor, bedrooms, bathrooms, toilets, size_sqm, monthly_rent, sale_price, deposit, service_charge, furnished, parking_spaces, amenities, description, status, is_featured, sort_order";

type UnitRow = Omit<PublicUnit, "cover_image" | "images">;

function emptySummary(): UnitSummary {
  return {
    unit_count: 0,
    available_units: 0,
    min_rent: null,
    min_sale_price: null,
    min_bedrooms: null,
    max_bedrooms: null,
  };
}

function foldSummary(summary: UnitSummary, unit: { bedrooms: number | null; monthly_rent: number | null; sale_price: number | null; status: string }) {
  summary.unit_count += 1;
  if (unit.status === "available") summary.available_units += 1;
  const rent = Number(unit.monthly_rent ?? 0);
  if (rent > 0) summary.min_rent = summary.min_rent === null ? rent : Math.min(summary.min_rent, rent);
  const sale = Number(unit.sale_price ?? 0);
  if (sale > 0)
    summary.min_sale_price = summary.min_sale_price === null ? sale : Math.min(summary.min_sale_price, sale);
  const beds = Number(unit.bedrooms ?? 0);
  summary.min_bedrooms = summary.min_bedrooms === null ? beds : Math.min(summary.min_bedrooms, beds);
  summary.max_bedrooms = summary.max_bedrooms === null ? beds : Math.max(summary.max_bedrooms, beds);
  return summary;
}

/** Adds a `unit_summary` to each property; standalone properties get `null`. */
export async function attachUnitSummaries(
  supabase: Client,
  properties: Property[],
): Promise<PropertyListing[]> {
  const multiIds = properties.filter((p) => p.structure === "multi_unit").map((p) => p.id);
  if (multiIds.length === 0) return properties.map((p) => ({ ...p, unit_summary: null }));

  const { data } = await supabase
    .from("property_units")
    .select("property_id, bedrooms, monthly_rent, sale_price, status")
    .in("property_id", multiIds)
    .eq("is_published", true);

  const map = new Map<string, UnitSummary>();
  for (const row of (data ?? []) as Array<{
    property_id: string;
    bedrooms: number | null;
    monthly_rent: number | null;
    sale_price: number | null;
    status: string;
  }>) {
    map.set(row.property_id, foldSummary(map.get(row.property_id) ?? emptySummary(), row));
  }

  return properties.map((p) => ({
    ...p,
    unit_summary: p.structure === "multi_unit" ? (map.get(p.id) ?? emptySummary()) : null,
  }));
}

async function attachUnitImages(supabase: Client, units: UnitRow[]): Promise<PublicUnit[]> {
  if (units.length === 0) return [];
  const { data } = await supabase
    .from("unit_images")
    .select("unit_id, path, sort_order, is_cover")
    .in(
      "unit_id",
      units.map((u) => u.id),
    )
    .order("sort_order");

  const rows = (data ?? []) as Array<{ unit_id: string; path: string; is_cover: boolean }>;
  const { signPaths } = await import("./storage.server");
  const signed = await signPaths(rows.map((r) => r.path));

  const byUnit = new Map<string, { images: string[]; cover: string | null }>();
  for (const row of rows) {
    const url = signed.get(row.path) ?? row.path;
    const entry = byUnit.get(row.unit_id) ?? { images: [], cover: null };
    entry.images.push(url);
    if (row.is_cover || !entry.cover) entry.cover = url;
    byUnit.set(row.unit_id, entry);
  }

  return units.map((unit) => {
    const entry = byUnit.get(unit.id);
    return {
      ...unit,
      images: entry?.images ?? [],
      cover_image: entry?.cover ?? null,
    } satisfies PublicUnit;
  });
}

/** Published units of a published property, with signed gallery URLs. */
export async function loadPublicUnits(supabase: Client, propertyId: string): Promise<PublicUnit[]> {
  const { data } = await supabase
    .from("property_units")
    .select(PUBLIC_UNIT_COLUMNS)
    .eq("property_id", propertyId)
    .eq("is_published", true)
    .order("sort_order")
    .order("label");
  return attachUnitImages(supabase, (data ?? []) as unknown as UnitRow[]);
}

/** A single published unit, verified to belong to `propertyId`. */
export async function loadPublicUnit(
  supabase: Client,
  propertyId: string,
  unitId: string,
): Promise<PublicUnit | null> {
  const { data } = await supabase
    .from("property_units")
    .select(PUBLIC_UNIT_COLUMNS)
    .eq("id", unitId)
    .eq("property_id", propertyId)
    .eq("is_published", true)
    .maybeSingle();
  if (!data) return null;
  const [unit] = await attachUnitImages(supabase, [data as unknown as UnitRow]);
  return unit ?? null;
}
