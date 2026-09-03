import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { requirePermission } from "@/lib/admin.server";

type Db = SupabaseClient<Database>;

/** Units are managed from the property editor (properties) and the rentals module. */
async function guard(context: { supabase: Db; userId: string }): Promise<Db> {
  const supabase = context.supabase;
  try {
    await requirePermission(supabase as never, context.userId, "properties");
  } catch {
    await requirePermission(supabase as never, context.userId, "rentals");
  }
  return supabase;
}

export const UNIT_STATUSES = [
  "available",
  "reserved",
  "occupied",
  "sold",
  "maintenance",
  "off_market",
] as const;

export type UnitStatus = (typeof UNIT_STATUSES)[number];

export type UnitRecord = {
  id: string;
  property_id: string;
  label: string;
  unit_type: string | null;
  block: string | null;
  bedrooms: number;
  bathrooms: number;
  toilets: number;
  floor: string | null;
  size_sqm: number | null;
  sale_price: number | null;
  monthly_rent: number;
  deposit: number;
  service_charge: number;
  furnished: boolean;
  parking_spaces: number;
  amenities: string[];
  description: string | null;
  notes: string | null;
  rent_due_day: number;
  sort_order: number;
  status: string;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

export type UnitImage = {
  id: string;
  unit_id: string;
  path: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_cover: boolean;
};

export type PropertyImage = {
  id: string;
  property_id: string;
  path: string;
  url: string;
  alt: string | null;
  sort_order: number;
  is_cover: boolean;
};

const UNIT_COLUMNS =
  "id, property_id, label, unit_type, block, bedrooms, bathrooms, toilets, floor, size_sqm, sale_price, monthly_rent, deposit, service_charge, furnished, parking_spaces, amenities, description, notes, rent_due_day, sort_order, status, is_published, is_featured, created_at, updated_at";

/* ------------------------------------------------------------------ units */

export const listUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { propertyId: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { data: rows, error } = await supabase
      .from("property_units")
      .select(UNIT_COLUMNS)
      .eq("property_id", data.propertyId)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error) throw new Error(error.message);

    const units = (rows ?? []) as UnitRecord[];
    if (units.length === 0) return [] as Array<UnitRecord & { image_count: number }>;

    const { data: images } = await supabase
      .from("unit_images")
      .select("unit_id")
      .in(
        "unit_id",
        units.map((u) => u.id),
      );

    const counts = new Map<string, number>();
    for (const row of (images ?? []) as Array<{ unit_id: string }>) {
      counts.set(row.unit_id, (counts.get(row.unit_id) ?? 0) + 1);
    }

    return units.map((unit) => ({ ...unit, image_count: counts.get(unit.id) ?? 0 }));
  });

export type UnitInput = {
  id?: string;
  property_id: string;
  label: string;
  unit_type?: string | null;
  block?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  toilets?: number;
  floor?: string | null;
  size_sqm?: number | null;
  sale_price?: number | null;
  monthly_rent?: number;
  deposit?: number;
  service_charge?: number;
  furnished?: boolean;
  parking_spaces?: number;
  amenities?: string[];
  description?: string | null;
  notes?: string | null;
  rent_due_day?: number;
  status?: string;
  is_published?: boolean;
  is_featured?: boolean;
  sort_order?: number;
};

const clampDay = (value: number | undefined) => Math.min(Math.max(value ?? 5, 1), 28);
const numberOrNull = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value) ? null : value;

export const saveUnitDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UnitInput) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    if (!data.label?.trim()) throw new Error("A unit label is required.");
    if (data.status && !UNIT_STATUSES.includes(data.status as UnitStatus)) {
      throw new Error(`Unsupported unit status: ${data.status}`);
    }

    const payload = {
      property_id: data.property_id,
      label: data.label.trim(),
      unit_type: data.unit_type?.trim() || "apartment",
      block: data.block?.trim() || null,
      bedrooms: data.bedrooms ?? 0,
      bathrooms: data.bathrooms ?? 0,
      toilets: data.toilets ?? 0,
      floor: data.floor?.trim() || null,
      size_sqm: numberOrNull(data.size_sqm),
      sale_price: numberOrNull(data.sale_price),
      monthly_rent: data.monthly_rent ?? 0,
      deposit: data.deposit ?? 0,
      service_charge: data.service_charge ?? 0,
      furnished: data.furnished ?? false,
      parking_spaces: data.parking_spaces ?? 0,
      amenities: data.amenities ?? [],
      description: data.description?.trim() || null,
      notes: data.notes?.trim() || null,
      rent_due_day: clampDay(data.rent_due_day),
      is_published: data.is_published ?? true,
      is_featured: data.is_featured ?? false,
      ...(data.sort_order === undefined ? {} : { sort_order: data.sort_order }),
    };

    if (data.id) {
      // Occupancy is owned by sync_unit_status(); never overwrite it manually.
      const { data: current } = await supabase
        .from("property_units")
        .select("status")
        .eq("id", data.id)
        .maybeSingle();
      const currentStatus = (current as { status?: string } | null)?.status;
      const nextStatus =
        currentStatus === "occupied" ? "occupied" : (data.status ?? currentStatus ?? "available");

      const { data: row, error } = await supabase
        .from("property_units")
        .update({ ...payload, status: nextStatus })
        .eq("id", data.id)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      return row as { id: string };
    }

    const { data: last } = await supabase
      .from("property_units")
      .select("sort_order")
      .eq("property_id", data.property_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: row, error } = await supabase
      .from("property_units")
      .insert({
        ...payload,
        status: data.status ?? "available",
        sort_order:
          data.sort_order ?? (((last as { sort_order?: number } | null)?.sort_order ?? -1) + 1),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row as { id: string };
  });

export const toggleUnitFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; field: "is_published" | "is_featured"; value: boolean }) => {
    if (input.field !== "is_published" && input.field !== "is_featured") {
      throw new Error("Unsupported field");
    }
    return input;
  })
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const patch: Database["public"]["Tables"]["property_units"]["Update"] =
      data.field === "is_published" ? { is_published: data.value } : { is_featured: data.value };
    const { error } = await supabase.from("property_units").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setUnitStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; status: string }) => {
    if (!UNIT_STATUSES.includes(input.status as UnitStatus)) throw new Error("Unsupported status");
    return input;
  })
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { data: active } = await supabase
      .from("leases")
      .select("id")
      .eq("unit_id", data.id)
      .eq("status", "active")
      .maybeSingle();
    if (active && data.status !== "occupied") {
      throw new Error("This unit has an active tenant. Offboard the tenant before changing status.");
    }
    const { error } = await supabase
      .from("property_units")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderUnits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { property_id: string; ordered_ids: string[] }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    for (const [index, id] of data.ordered_ids.entries()) {
      const { error } = await supabase
        .from("property_units")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("property_id", data.property_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

/** Reports what history is attached to a unit so the UI can warn before deleting. */
export const getUnitDependencies = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    return unitDependencies(supabase, data.id);
  });

async function unitDependencies(supabase: Db, unitId: string) {
  const { data: leases } = await supabase
    .from("leases")
    .select("id, status")
    .eq("unit_id", unitId);
  const leaseRows = (leases ?? []) as Array<{ id: string; status: string }>;
  const leaseIds = leaseRows.map((l) => l.id);

  let charges = 0;
  let payments = 0;
  if (leaseIds.length) {
    const [c, p] = await Promise.all([
      supabase.from("rent_charges").select("id", { count: "exact", head: true }).in("lease_id", leaseIds),
      supabase.from("rent_payments").select("id", { count: "exact", head: true }).in("lease_id", leaseIds),
    ]);
    charges = c.count ?? 0;
    payments = p.count ?? 0;
  }

  return {
    leases: leaseRows.length,
    activeLeases: leaseRows.filter((l) => l.status === "active").length,
    charges,
    payments,
    deletable: leaseRows.length === 0 && charges === 0 && payments === 0,
  };
}

/** Refuses to destroy financial history; suggests archiving instead. */
export const deleteUnitSafe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const deps = await unitDependencies(supabase, data.id);
    if (!deps.deletable) {
      throw new Error(
        `This unit has rental history (${deps.leases} lease(s), ${deps.charges} charge(s), ${deps.payments} payment(s)). Set it to "off market" instead of deleting it.`,
      );
    }

    const { data: images } = await supabase.from("unit_images").select("path").eq("unit_id", data.id);
    const paths = ((images ?? []) as Array<{ path: string }>).map((i) => i.path);
    if (paths.length) {
      const { removeStorageObjects } = await import("./storage.server");
      await removeStorageObjects(paths);
    }

    const { error } = await supabase.from("property_units").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Takes a unit off the market instead of deleting it. */
export const archiveUnit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { data: active } = await supabase
      .from("leases")
      .select("id")
      .eq("unit_id", data.id)
      .eq("status", "active")
      .maybeSingle();
    if (active) throw new Error("Offboard the current tenant before taking this unit off market.");
    const { error } = await supabase
      .from("property_units")
      .update({ status: "off_market", is_published: false, is_featured: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------------------------------------- unit images */

export const listUnitImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { unitId: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { data: rows, error } = await supabase
      .from("unit_images")
      .select("id, unit_id, path, alt, sort_order, is_cover")
      .eq("unit_id", data.unitId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const { signPaths } = await import("./storage.server");
    const list = (rows ?? []) as Array<Omit<UnitImage, "url">>;
    const map = await signPaths(list.map((r) => r.path), supabase);

    return list.map((row) => ({ ...row, url: map.get(row.path) ?? row.path })) as UnitImage[];
  });

export const addUnitImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { unit_id: string; paths: string[] }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { data: existing } = await supabase
      .from("unit_images")
      .select("id, sort_order")
      .eq("unit_id", data.unit_id)
      .order("sort_order", { ascending: false });
    const rows = (existing ?? []) as Array<{ id: string; sort_order: number }>;
    const base = (rows[0]?.sort_order ?? -1) + 1;

    const inserts = data.paths.map((path, index) => ({
      unit_id: data.unit_id,
      path,
      sort_order: base + index,
      is_cover: rows.length === 0 && index === 0,
    }));
    const { error } = await supabase.from("unit_images").insert(inserts);
    if (error) throw new Error(error.message);
    return { added: inserts.length };
  });

export const updateUnitImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; unit_id: string; alt?: string | null; is_cover?: boolean }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    if (data.is_cover) {
      const { error: clearError } = await supabase
        .from("unit_images")
        .update({ is_cover: false })
        .eq("unit_id", data.unit_id);
      if (clearError) throw new Error(clearError.message);
    }
    const patch: Database["public"]["Tables"]["unit_images"]["Update"] = {};
    if (data.alt !== undefined) patch.alt = data.alt;
    if (data.is_cover !== undefined) patch.is_cover = data.is_cover;
    const { error } = await supabase.from("unit_images").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderUnitImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { unit_id: string; ordered_ids: string[] }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    for (const [index, id] of data.ordered_ids.entries()) {
      const { error } = await supabase
        .from("unit_images")
        .update({ sort_order: index })
        .eq("id", id)
        .eq("unit_id", data.unit_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const deleteUnitImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { data: row } = await supabase
      .from("unit_images")
      .select("path")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await supabase.from("unit_images").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    const path = (row as { path?: string } | null)?.path;
    if (path) {
      const { removeStorageObjects } = await import("./storage.server");
      await removeStorageObjects([path]);
    }
    return { ok: true };
  });

/* ------------------------------------------------------- property images */

export const listPropertyImages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { propertyId: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { data: rows, error } = await supabase
      .from("property_images")
      .select("id, property_id, path, alt, sort_order, is_cover")
      .eq("property_id", data.propertyId)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    const { signPaths } = await import("./storage.server");
    const list = (rows ?? []) as Array<Omit<PropertyImage, "url">>;
    const map = await signPaths(list.map((r) => r.path), supabase);
    return list.map((row) => ({ ...row, url: map.get(row.path) ?? row.path })) as PropertyImage[];
  });

/**
 * Mirrors the property gallery into `property_images` while keeping the legacy
 * `properties.images` array in sync for backwards compatibility.
 */
export const syncPropertyGallery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { property_id: string; paths: string[]; featured?: string | null }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { error: deleteError } = await supabase
      .from("property_images")
      .delete()
      .eq("property_id", data.property_id);
    if (deleteError) throw new Error(deleteError.message);

    if (data.paths.length) {
      const rows = data.paths.map((path, index) => ({
        property_id: data.property_id,
        path,
        sort_order: index,
        is_cover: data.featured ? path === data.featured : index === 0,
      }));
      const { error } = await supabase.from("property_images").insert(rows);
      if (error) throw new Error(error.message);
    }
    return { synced: data.paths.length };
  });

/* ------------------------------------------------------- unit summaries */

export type AdminUnitSummary = {
  property_id: string;
  unit_count: number;
  available_units: number;
  min_rent: number | null;
  min_sale_price: number | null;
  min_bedrooms: number | null;
  max_bedrooms: number | null;
};

/** Aggregated unit figures used by the admin property list for developments. */
export const listUnitSummaries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = await guard(context);
    const { data, error } = await supabase
      .from("property_units")
      .select("property_id, monthly_rent, sale_price, bedrooms, status");
    if (error) throw new Error(error.message);

    const map = new Map<string, AdminUnitSummary>();
    for (const row of (data ?? []) as Array<{
      property_id: string;
      monthly_rent: number | null;
      sale_price: number | null;
      bedrooms: number | null;
      status: string;
    }>) {
      const current =
        map.get(row.property_id) ??
        ({
          property_id: row.property_id,
          unit_count: 0,
          available_units: 0,
          min_rent: null,
          min_sale_price: null,
          min_bedrooms: null,
          max_bedrooms: null,
        } satisfies AdminUnitSummary);

      current.unit_count += 1;
      if (row.status === "available") current.available_units += 1;
      const rent = Number(row.monthly_rent ?? 0);
      if (rent > 0) current.min_rent = current.min_rent === null ? rent : Math.min(current.min_rent, rent);
      if (row.sale_price)
        current.min_sale_price =
          current.min_sale_price === null
            ? Number(row.sale_price)
            : Math.min(current.min_sale_price, Number(row.sale_price));
      const beds = Number(row.bedrooms ?? 0);
      current.min_bedrooms = current.min_bedrooms === null ? beds : Math.min(current.min_bedrooms, beds);
      current.max_bedrooms = current.max_bedrooms === null ? beds : Math.max(current.max_bedrooms, beds);
      map.set(row.property_id, current);
    }
    return [...map.values()];
  });
