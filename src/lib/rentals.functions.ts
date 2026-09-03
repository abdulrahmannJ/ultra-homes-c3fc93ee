import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requirePermission } from "@/lib/admin.server";

export const LEASE_BUCKET = "lease-documents";

/** The generated types don't cover the rental tables yet. */
function db(client: unknown) {
  return client as SupabaseClient;
}

async function guard(context: { supabase: unknown; userId: string }) {
  await requirePermission(context.supabase as never, context.userId, "rentals");
  return db(context.supabase);
}

function monthBounds(date = new Date()) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export type RentalUnitRow = {
  id: string;
  property_id: string;
  property_title: string;
  label: string;
  bedrooms: number;
  floor: string | null;
  monthly_rent: number;
  rent_due_day: number;
  notes: string | null;
  status: string;
  lease_id: string | null;
  tenant_id: string | null;
  tenant_name: string | null;
  tenant_phone: string | null;
  lease_start: string | null;
  lease_end: string | null;
  charged: number;
  paid: number;
  balance: number;
  /** Excess rent paid beyond every charge raised so far — carries over to future rent. */
  credit: number;
  deposit: number;
  /** Deposit portion settled by payments so far (payments settle oldest obligation first). */
  deposit_paid: number;
  deposit_balance: number;
  rent_charged: number;
  rent_paid: number;
  rent_balance: number;
  service_charge: number;
  grace_days: number;
  /** Due date of the oldest charge that is not yet fully covered by payments. */
  next_due_date: string | null;
  overdue: boolean;

};

type LeaseRecord = {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  status: string;
  grace_days: number | null;
  deposit: number | null;
  rent_due_day: number | null;
};

const addDays = (iso: string, days: number) =>
  new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86_400_000).toISOString().slice(0, 10);

async function buildUnitRows(supabase: SupabaseClient, propertyId?: string) {
  let unitQuery = supabase
    .from("property_units")
    .select("*, properties(title)")
    .order("label", { ascending: true });
  if (propertyId) unitQuery = unitQuery.eq("property_id", propertyId);

  const { data: units, error } = await unitQuery;
  if (error) throw new Error(error.message);

  const unitIds = (units ?? []).map((u) => u.id as string);
  if (unitIds.length === 0) return [] as RentalUnitRow[];

  const { data: leases } = await supabase
    .from("leases")
    .select("id, unit_id, tenant_id, start_date, end_date, monthly_rent, status, grace_days, deposit, rent_due_day")
    .in("unit_id", unitIds)
    .eq("status", "active");

  const leaseList = (leases ?? []) as LeaseRecord[];
  const leaseIds = leaseList.map((l) => l.id);
  const tenantIds = [...new Set(leaseList.map((l) => l.tenant_id))];

  const [{ data: tenants }, { data: charges }, { data: payments }] = await Promise.all([
    tenantIds.length
      ? supabase.from("tenants").select("id, full_name, phone").in("id", tenantIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string; phone: string | null }> }),
    leaseIds.length
      ? supabase.from("rent_charges").select("lease_id, amount, due_date").in("lease_id", leaseIds)
      : Promise.resolve({ data: [] as Array<{ lease_id: string; amount: number; due_date: string }> }),
    leaseIds.length
      ? supabase.from("rent_payments").select("lease_id, amount").in("lease_id", leaseIds)
      : Promise.resolve({ data: [] as Array<{ lease_id: string; amount: number }> }),
  ]);

  const tenantMap = new Map((tenants ?? []).map((t) => [t.id as string, t]));
  const chargeTotal = new Map<string, number>();
  const chargesByLease = new Map<string, Array<{ amount: number; due_date: string }>>();
  for (const c of charges ?? []) {
    chargeTotal.set(c.lease_id, (chargeTotal.get(c.lease_id) ?? 0) + Number(c.amount));
    const list = chargesByLease.get(c.lease_id) ?? [];
    list.push({ amount: Number(c.amount), due_date: c.due_date });
    chargesByLease.set(c.lease_id, list);
  }
  const paidTotal = new Map<string, number>();
  for (const p of payments ?? []) {
    paidTotal.set(p.lease_id, (paidTotal.get(p.lease_id) ?? 0) + Number(p.amount));
  }

  /**
   * Full obligation ledger for a lease: the deposit falls due on the lease start
   * date, then each generated rent charge on its own due date.
   */
  const obligations = (lease: LeaseRecord) => {
    const deposit = Number(lease.deposit ?? 0);
    const list: Array<{ amount: number; due_date: string; kind: "deposit" | "rent" }> = [];
    if (deposit > 0) list.push({ amount: deposit, due_date: lease.start_date, kind: "deposit" });
    for (const charge of chargesByLease.get(lease.id) ?? []) {
      list.push({ ...charge, kind: "rent" });
    }
    return list.sort((a, b) => a.due_date.localeCompare(b.due_date));
  };

  /** Payments settle obligations oldest-first, so partial payments split correctly. */
  const settle = (lease: LeaseRecord) => {
    const list = obligations(lease);
    let remaining = paidTotal.get(lease.id) ?? 0;
    let depositPaid = 0;
    let rentPaid = 0;
    let nextDue: string | null = null;
    for (const item of list) {
      const applied = Math.min(remaining, item.amount);
      remaining -= applied;
      if (item.kind === "deposit") depositPaid += applied;
      else rentPaid += applied;
      if (!nextDue && applied < item.amount) nextDue = item.due_date;
    }
    return { depositPaid, rentPaid, nextDue, credit: remaining };
  };

  /** When every raised charge is settled, the next obligation is next month's rent. */
  const nextScheduledDue = (lease: LeaseRecord) => {
    const list = chargesByLease.get(lease.id) ?? [];
    const day = Math.min(Math.max(lease.rent_due_day ?? 5, 1), 28);
    const base = list.length
      ? new Date(`${list.map((c) => c.due_date).sort().at(-1)!}T00:00:00Z`)
      : new Date();
    const next = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + 1, day));
    return next.toISOString().slice(0, 10);
  };

  return (units ?? []).map((unit) => {
    const lease = leaseList.find((l) => l.unit_id === unit.id) ?? null;
    const tenant = lease ? tenantMap.get(lease.tenant_id) : null;
    const deposit = lease ? Number(lease.deposit ?? 0) : Number(unit.deposit ?? 0);
    const rentCharged = lease ? (chargeTotal.get(lease.id) ?? 0) : 0;
    // Deposit is a real obligation, so it counts towards what the tenant owes.
    const charged = lease ? rentCharged + deposit : 0;
    const paid = lease ? (paidTotal.get(lease.id) ?? 0) : 0;
    const split = lease
      ? settle(lease)
      : { depositPaid: 0, rentPaid: 0, nextDue: null as string | null, credit: 0 };
    const graceDays = lease?.grace_days ?? 0;
    const dueDate = lease ? (split.nextDue ?? nextScheduledDue(lease)) : null;
    const today = new Date().toISOString().slice(0, 10);
    return {
      id: unit.id,
      property_id: unit.property_id,
      property_title: (unit.properties as { title: string } | null)?.title ?? "",
      label: unit.label,
      bedrooms: unit.bedrooms,
      floor: unit.floor,
      // A leased unit bills the agreed lease rent, not the current list rent.
      monthly_rent: lease ? Number(lease.monthly_rent) : Number(unit.monthly_rent),
      rent_due_day: unit.rent_due_day,
      notes: unit.notes,
      status: unit.status,
      lease_id: lease?.id ?? null,
      tenant_id: lease?.tenant_id ?? null,
      tenant_name: tenant?.full_name ?? null,
      tenant_phone: tenant?.phone ?? null,
      lease_start: lease?.start_date ?? null,
      lease_end: lease?.end_date ?? null,
      charged,
      paid,
      balance: Math.max(charged - paid, 0),
      credit: split.credit,
      deposit,
      deposit_paid: split.depositPaid,
      deposit_balance: Math.max(deposit - split.depositPaid, 0),
      rent_charged: rentCharged,
      rent_paid: split.rentPaid,
      rent_balance: Math.max(rentCharged - split.rentPaid, 0),
      service_charge: Number(unit.service_charge ?? 0),
      grace_days: graceDays,
      next_due_date: dueDate,
      overdue: Boolean(dueDate) && charged - paid > 0 && addDays(dueDate!, graceDays) < today,
    } satisfies RentalUnitRow;
  });

}

/* ----------------------------------------------------------------- overview */

export const getRentalsOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = await guard(context);
    await supabase.rpc("generate_rent_charges");

    const { start, end } = monthBounds();
    const [{ data: charges }, { data: payments }, rows] = await Promise.all([
      supabase.from("rent_charges").select("amount, due_date").gte("period_start", start).lte("period_start", end),
      supabase.from("rent_payments").select("amount").gte("paid_on", start).lte("paid_on", end),
      buildUnitRows(supabase),
    ]);

    // Deposits for leases that start this month are expected income too.
    const depositsThisMonth = rows.reduce(
      (sum, r) => sum + (r.lease_start && r.lease_start >= start && r.lease_start <= end ? r.deposit : 0),
      0,
    );
    const expected =
      (charges ?? []).reduce((sum, c) => sum + Number(c.amount), 0) + depositsThisMonth;
    const collected = (payments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      expected,
      collected,
      // True arrears across every active lease, not just the current month.
      outstanding: rows.reduce((sum, r) => sum + Math.max(r.balance, 0), 0),

      overdueUnits: rows.filter((r) => r.overdue).length,
      totalUnits: rows.length,
      occupiedUnits: rows.filter((r) => r.status === "occupied").length,
      vacantUnits: rows.filter((r) => r.status !== "occupied").length,
    };
  });

export const listRentalUnits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { propertyId?: string } | undefined) => input ?? {})
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    await supabase.rpc("generate_rent_charges");
    return buildUnitRows(supabase, data.propertyId);
  });

export const listRentalProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = await guard(context);
    const { data, error } = await supabase
      .from("properties")
      .select("id, title, listing_type")
      .eq("is_archived", false)
      .order("title");
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; title: string; listing_type: string }>;
  });

/* -------------------------------------------------------------------- units */

export const generateUnits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      property_id: string;
      count: number;
      prefix?: string;
      monthly_rent?: number;
      rent_due_day?: number;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const count = Math.min(Math.max(data.count, 1), 100);
    const prefix = (data.prefix ?? "A").trim() || "A";
    const rows = Array.from({ length: count }, (_, index) => ({
      property_id: data.property_id,
      label: `${prefix}${index + 1}`,
      monthly_rent: data.monthly_rent ?? 0,
      rent_due_day: Math.min(Math.max(data.rent_due_day ?? 5, 1), 28),
    }));
    const { error } = await supabase.from("property_units").upsert(rows, {
      onConflict: "property_id,label",
      ignoreDuplicates: true,
    });
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });

/* ------------------------------------------------------------------ tenancy */

export const onboardTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      unit_id: string;
      full_name: string;
      phone?: string | null;
      email?: string | null;
      id_number?: string | null;
      emergency_contact?: string | null;
      start_date: string;
      end_date?: string | null;
      monthly_rent: number;
      deposit?: number;
      /** Amount of the deposit already collected at onboarding (recorded as a payment). */
      deposit_paid?: number;
      deposit_paid_method?: string;
      rent_due_day?: number;
      grace_days?: number;
      service_charge?: number;
      contract_path?: string | null;
      id_document_path?: string | null;
      notes?: string | null;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);

    const { data: existing } = await supabase
      .from("leases")
      .select("id")
      .eq("unit_id", data.unit_id)
      .eq("status", "active")
      .maybeSingle();
    if (existing) throw new Error("This unit already has an active tenant. Offboard them first.");

    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .insert({
        full_name: data.full_name.trim(),
        phone: data.phone ?? null,
        email: data.email ?? null,
        id_number: data.id_number ?? null,
        emergency_contact: data.emergency_contact ?? null,
        notes: data.notes ?? null,
      })
      .select("id")
      .single();
    if (tenantError) throw new Error(tenantError.message);

    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .insert({
        unit_id: data.unit_id,
        tenant_id: (tenant as { id: string }).id,
        start_date: data.start_date,
        end_date: data.end_date ?? null,
        monthly_rent: data.monthly_rent + (data.service_charge ?? 0),
        deposit: data.deposit ?? 0,
        rent_due_day: Math.min(Math.max(data.rent_due_day ?? 5, 1), 28),
        grace_days: Math.min(Math.max(data.grace_days ?? 5, 0), 15),
        contract_path: data.contract_path ?? null,
        id_document_path: data.id_document_path ?? null,
        status: "active",
      })
      .select("id")
      .single();
    if (leaseError) throw new Error(leaseError.message);

    const depositPaid = Number(data.deposit_paid ?? 0);
    if (depositPaid > 0) {
      const { error: payError } = await supabase.from("rent_payments").insert({
        lease_id: (lease as { id: string }).id,
        amount: depositPaid,
        paid_on: data.start_date,
        method: data.deposit_paid_method ?? "cash",
        notes: "Deposit received at onboarding",
        recorded_by: context.userId,
      });
      if (payError) throw new Error(payError.message);
    }

    await supabase.rpc("generate_rent_charges");
    return lease as { id: string };
  });

export const offboardTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { lease_id: string; move_out_date: string; move_out_notes?: string | null }) => input,
  )
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { error } = await supabase
      .from("leases")
      .update({
        status: "ended",
        end_date: data.move_out_date,
        move_out_date: data.move_out_date,
        move_out_notes: data.move_out_notes ?? null,
      })
      .eq("id", data.lease_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ----------------------------------------------------------------- payments */

export type PaymentRow = {
  id: string;
  lease_id: string;
  amount: number;
  paid_on: string;
  method: string;
  reference: string | null;
  notes: string | null;
  tenant_name: string;
  unit_label: string;
  property_title: string;
};

export const listPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { leaseId?: string } | undefined) => input ?? {})
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    let query = supabase
      .from("rent_payments")
      .select(
        "id, lease_id, amount, paid_on, method, reference, notes, leases(tenants(full_name), property_units(label, properties(title)))",
      )
      .order("paid_on", { ascending: false })
      .limit(300);
    if (data.leaseId) query = query.eq("lease_id", data.leaseId);

    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);

    return (rows ?? []).map((row) => {
      const lease = row.leases as unknown as {
        tenants: { full_name: string } | null;
        property_units: { label: string; properties: { title: string } | null } | null;
      } | null;
      return {
        id: row.id,
        lease_id: row.lease_id,
        amount: Number(row.amount),
        paid_on: row.paid_on,
        method: row.method,
        reference: row.reference,
        notes: row.notes,
        tenant_name: lease?.tenants?.full_name ?? "",
        unit_label: lease?.property_units?.label ?? "",
        property_title: lease?.property_units?.properties?.title ?? "",
      } satisfies PaymentRow;
    });
  });

export const savePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      lease_id: string;
      amount: number;
      paid_on: string;
      method: string;
      reference?: string | null;
      notes?: string | null;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { id, ...values } = data;

    const { data: lease, error: leaseError } = await supabase
      .from("leases")
      .select("id")
      .eq("id", values.lease_id)
      .maybeSingle();
    if (leaseError) throw new Error(leaseError.message);
    if (!lease) throw new Error("Lease not found for this payment.");

    const payload = {
      lease_id: values.lease_id,
      amount: values.amount,
      paid_on: values.paid_on,
      method: values.method,
      reference: values.reference ?? null,
      notes: values.notes ?? null,
      recorded_by: context.userId,
    };
    const query = id
      ? supabase.from("rent_payments").update(payload).eq("id", id).select("id").single()
      : supabase.from("rent_payments").insert(payload).select("id").single();
    const { data: row, error } = await query;
    if (error) throw new Error(error.message);
    return row as { id: string };
  });


export const deletePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { error } = await supabase.from("rent_payments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------------------------------------------------------------- reminders */

export const listRentReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = await guard(context);
    await supabase.rpc("generate_rent_charges");
    const rows = await buildUnitRows(supabase);
    const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);

    return rows
      .filter((row) => row.lease_id && row.balance > 0 && row.next_due_date && row.next_due_date <= soon)
      .sort((a, b) => (a.next_due_date ?? "").localeCompare(b.next_due_date ?? ""));
  });

/* ---------------------------------------------------------------- documents */

/** Falls back to the caller's client when no service-role key is configured. */
async function storageFor(supabase: SupabaseClient): Promise<SupabaseClient> {
  if (!process.env["SUPABASE_SERVICE_ROLE_KEY"]) return supabase;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as SupabaseClient;
}

export const createLeaseUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { fileName: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const safe = data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${crypto.randomUUID()}-${safe}`;
    const client = await storageFor(supabase);
    const { data: signed, error } = await client.storage
      .from(LEASE_BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, signedUrl: signed.signedUrl, token: signed.token };
  });

export const getLeaseDocumentUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) => input)
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const client = await storageFor(supabase);
    const { data: signed, error } = await client.storage
      .from(LEASE_BUCKET)
      .createSignedUrl(data.path, 60 * 60);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };

  });

/* ------------------------------------------------------------------ tenants */

export type TenantRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  id_number: string | null;
  emergency_contact: string | null;
  notes: string | null;
  created_at: string;
  lease_id: string | null;
  lease_status: string | null;
  start_date: string | null;
  end_date: string | null;
  monthly_rent: number;
  deposit: number;
  unit_label: string | null;
  property_id: string | null;
  property_title: string | null;
  charged: number;
  paid: number;
  balance: number;
  credit: number;
  next_due_date: string | null;
  overdue: boolean;
};

/** All tenants with their current (or most recent) tenancy and live balance. */
export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const supabase = await guard(context);
    await supabase.rpc("generate_rent_charges");

    const [{ data: tenants, error }, unitRows] = await Promise.all([
      supabase
        .from("tenants")
        .select("id, full_name, phone, email, id_number, emergency_contact, notes, created_at")
        .order("full_name"),
      buildUnitRows(supabase),
    ]);
    if (error) throw new Error(error.message);

    const { data: leases } = await supabase
      .from("leases")
      .select(
        "id, tenant_id, status, start_date, end_date, monthly_rent, deposit, property_units(id, label, property_id, properties(title))",
      )
      .order("start_date", { ascending: false });

    type LeaseJoin = NonNullable<typeof leases>[number];
    const leaseByTenant = new Map<string, LeaseJoin>();
    for (const lease of leases ?? []) {
      const current = leaseByTenant.get(lease.tenant_id as string);
      // Prefer the active lease, otherwise keep the most recent one.
      if (!current || (lease.status === "active" && current.status !== "active")) {
        leaseByTenant.set(lease.tenant_id as string, lease);
      }
    }

    return (tenants ?? []).map((tenant) => {
      const lease = leaseByTenant.get(tenant.id as string) ?? null;
      const unit = (lease?.property_units ?? null) as unknown as {
        id: string;
        label: string;
        property_id: string;
        properties: { title: string } | null;
      } | null;
      const stats = lease ? unitRows.find((row) => row.lease_id === lease.id) : undefined;
      return {
        id: tenant.id,
        full_name: tenant.full_name,
        phone: tenant.phone,
        email: tenant.email,
        id_number: tenant.id_number,
        emergency_contact: tenant.emergency_contact,
        notes: tenant.notes,
        created_at: tenant.created_at,
        lease_id: lease?.id ?? null,
        lease_status: lease?.status ?? null,
        start_date: lease?.start_date ?? null,
        end_date: lease?.end_date ?? null,
        monthly_rent: Number(lease?.monthly_rent ?? 0),
        deposit: Number(lease?.deposit ?? 0),
        unit_label: unit?.label ?? null,
        property_id: unit?.property_id ?? null,
        property_title: unit?.properties?.title ?? null,
        charged: stats?.charged ?? 0,
        paid: stats?.paid ?? 0,
        balance: stats?.balance ?? 0,
        credit: stats?.credit ?? 0,
        next_due_date: stats?.next_due_date ?? null,
        overdue: stats?.overdue ?? false,
      } satisfies TenantRow;
    });
  });

export const saveTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      full_name: string;
      phone?: string | null;
      email?: string | null;
      id_number?: string | null;
      emergency_contact?: string | null;
      notes?: string | null;
    }) => input,
  )
  .handler(async ({ context, data }) => {
    const supabase = await guard(context);
    const { id, ...values } = data;
    const { error } = await supabase
      .from("tenants")
      .update({
        full_name: values.full_name.trim(),
        phone: values.phone ?? null,
        email: values.email ?? null,
        id_number: values.id_number ?? null,
        emergency_contact: values.emergency_contact ?? null,
        notes: values.notes ?? null,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
