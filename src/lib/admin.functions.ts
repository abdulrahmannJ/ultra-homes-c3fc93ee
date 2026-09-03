import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin, requirePermission, type Permission } from "@/lib/admin.server";
import type { Agent, BlogPost, Property } from "@/lib/types";

export type PropertyInput = Partial<Property> & { id?: string };
export type AgentInput = Partial<Agent> & { id?: string };
export type PostInput = Partial<BlogPost> & { id?: string };

/* ------------------------------------------------------------------ session */

export const getStaffSession = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: roles }, { data: staff }] = await Promise.all([
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
      (context.supabase as never as import("@supabase/supabase-js").SupabaseClient)
        .from("staff_members")
        .select("*")
        .eq("user_id", context.userId)
        .maybeSingle(),
    ]);

    const roleList = (roles ?? []).map((r) => r.role as string);
    const isAdmin = roleList.includes("admin");
    const record = staff as {
      full_name?: string;
      title?: string;
      is_active?: boolean;
      permissions?: string[];
    } | null;

    return {
      userId: context.userId,
      email: (context.claims as { email?: string }).email ?? "",
      fullName: record?.full_name ?? "",
      title: record?.title ?? (isAdmin ? "Administrator" : "Staff"),
      roles: roleList,
      isAdmin,
      isStaff: roleList.length > 0 && record?.is_active !== false,
      permissions: isAdmin
        ? ["properties", "leads", "content", "agents", "blog", "staff", "analytics", "rentals"]
        : (record?.permissions ?? []),
    };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("claim_first_admin" as never);
    if (error) throw new Error(error.message);
    return { granted: Boolean(data) };
  });

/* ---------------------------------------------------------------- analytics */

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "analytics");

    const [properties, leads, posts, agents] = await Promise.all([
      context.supabase
        .from("properties")
        .select("id,title,price,status,listing_type,is_published,views,created_at,town"),
      context.supabase
        .from("leads")
        .select("id,name,email,phone,status,source,created_at")
        .order("created_at", { ascending: false }),
      context.supabase.from("blog_posts").select("id,is_published"),
      context.supabase.from("agents").select("id"),
    ]);

    const props = properties.data ?? [];
    const leadRows = leads.data ?? [];

    const byMonth = new Map<string, number>();
    for (const lead of leadRows) {
      const key = new Date(lead.created_at).toISOString().slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }

    const bySource = new Map<string, number>();
    for (const lead of leadRows) bySource.set(lead.source, (bySource.get(lead.source) ?? 0) + 1);

    return {
      totals: {
        properties: props.length,
        published: props.filter((p) => p.is_published).length,
        leads: leadRows.length,
        newLeads: leadRows.filter((l) => l.status === "new").length,
        posts: (posts.data ?? []).length,
        agents: (agents.data ?? []).length,
        views: props.reduce((sum, p) => sum + (p.views ?? 0), 0),
        portfolioValue: props.reduce((sum, p) => sum + Number(p.price ?? 0), 0),
      },
      leadsByMonth: [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, count]) => ({ month, count })),
      leadsBySource: [...bySource.entries()].map(([source, count]) => ({ source, count })),
      statusMix: ["available", "reserved", "sold", "new", "let"].map((status) => ({
        status,
        count: props.filter((p) => p.status === status).length,
      })),
      topViewed: [...props]
        .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
        .slice(0, 5)
        .map((p) => ({ id: p.id, title: p.title, views: p.views ?? 0 })),
      recentLeads: leadRows.slice(0, 6),
    };
  });

/* --------------------------------------------------------------- properties */

/** Canonical listing purposes, with legacy short values mapped forward. */
const LISTING_PURPOSE_ALIASES: Record<string, string> = {
  sale: "for_sale",
  rent: "for_rent",
  for_sale: "for_sale",
  for_rent: "for_rent",
  sale_and_rent: "sale_and_rent",
  rental_management: "rental_management",
  commercial: "commercial",
  mixed: "mixed",
};

export const listAdminProperties = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "properties");
    const { data, error } = await context.supabase
      .from("properties")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Property[];
  });

export const getAdminProperty = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "properties");
    const { data: row, error } = await context.supabase
      .from("properties")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row ?? null) as unknown as Property | null;
  });

export const saveProperty = createServerFn({ method: "POST" })
  .inputValidator((data: PropertyInput) => {
    if (!data.title?.trim()) throw new Error("Title is required");
    if (!data.slug?.trim()) throw new Error("Slug is required");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "properties");
    const { id, created_at: _c, updated_at: _u, views: _v, ...fields } = data;
    const multiUnit = fields.structure === "multi_unit";
    const payload = {
      ...fields,
      structure: multiUnit ? "multi_unit" : "standalone",
      listing_purpose: LISTING_PURPOSE_ALIASES[fields.listing_purpose ?? ""] ?? "for_sale",
      // Units are the single source of truth for dwelling data on a development.
      price: multiUnit ? 0 : Number(fields.price ?? 0),
      discount_price: multiUnit || !fields.discount_price ? null : Number(fields.discount_price),
      bedrooms: multiUnit ? 0 : Number(fields.bedrooms ?? 0),
      bathrooms: multiUnit ? 0 : Number(fields.bathrooms ?? 0),
      garage: multiUnit ? 0 : Number(fields.garage ?? 0),
      area_sqft: multiUnit || !fields.area_sqft ? null : Number(fields.area_sqft),
      latitude: fields.latitude ? Number(fields.latitude) : null,
      longitude: fields.longitude ? Number(fields.longitude) : null,
    };

    if (id) {
      const { error } = await context.supabase
        .from("properties")
        .update(payload as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }

    const { data: inserted, error } = await context.supabase
      .from("properties")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteProperty = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "properties");
    const { error } = await context.supabase.from("properties").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePropertyFlag = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; field: "is_published" | "is_featured" | "is_archived"; value: boolean }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "properties");
    const { error } = await context.supabase
      .from("properties")
      .update({ [data.field]: data.value } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------------- leads */

export const listAdminLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "leads");
    const { data, error } = await context.supabase
      .from("leads")
      .select("*, properties(title,slug)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "leads");
    const { error } = await context.supabase
      .from("leads")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteLead = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "leads");
    const { error } = await context.supabase.from("leads").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listNewsletterSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "leads");
    const { data, error } = await context.supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Array<{ id: string; email: string; created_at: string }>;
  });

/* ------------------------------------------------------------- site content */

export const listSiteContent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "content");
    const { data, error } = await context.supabase.from("site_content").select("*").order("key");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveSiteContent = createServerFn({ method: "POST" })
  .inputValidator((data: { key: string; value: string }) => {
    JSON.parse(data.value);
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "content");
    const { error } = await context.supabase
      .from("site_content")
      .upsert({ key: data.key, value: JSON.parse(data.value) } as never, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ------------------------------------------------------------------- agents */

export const listAdminAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "agents");
    const { data, error } = await context.supabase.from("agents").select("*").order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Agent[];
  });

export const saveAgent = createServerFn({ method: "POST" })
  .inputValidator((data: AgentInput) => {
    if (!data.name?.trim()) throw new Error("Name is required");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "agents");
    const { id, ...fields } = data;
    const payload = { ...fields, sort_order: Number(fields.sort_order ?? 0) };
    if (id) {
      const { error } = await context.supabase.from("agents").update(payload as never).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: inserted, error } = await context.supabase
      .from("agents")
      .insert(payload as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "agents");
    const { error } = await context.supabase.from("agents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* --------------------------------------------------------------------- blog */

export const listAdminPosts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "blog");
    const { data, error } = await context.supabase
      .from("blog_posts")
      .select("*")
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as BlogPost[];
  });

export const savePost = createServerFn({ method: "POST" })
  .inputValidator((data: PostInput) => {
    if (!data.title?.trim()) throw new Error("Title is required");
    if (!data.slug?.trim()) throw new Error("Slug is required");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "blog");
    const { id, ...fields } = data;
    if (id) {
      const { error } = await context.supabase
        .from("blog_posts")
        .update(fields as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: inserted, error } = await context.supabase
      .from("blog_posts")
      .insert(fields as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deletePost = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "blog");
    const { error } = await context.supabase.from("blog_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* -------------------------------------------------------------------- staff */

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "staff");
    const client = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;
    const [{ data: members, error }, { data: roles }] = await Promise.all([
      client.from("staff_members").select("*").order("created_at"),
      context.supabase.from("user_roles").select("user_id,role"),
    ]);
    if (error) throw new Error(error.message);
    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) roleMap.set(r.user_id, r.role as string);
    return (members ?? []).map((m: Record<string, unknown>) => ({
      ...m,
      role: roleMap.get(m["user_id"] as string) ?? "editor",
    })) as Array<{
      user_id: string;
      full_name: string;
      email: string | null;
      title: string | null;
      phone: string | null;
      is_active: boolean;
      permissions: string[];
      created_at: string;
      role: string;
    }>;
  });

export const createStaff = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      email: string;
      password: string;
      full_name: string;
      title?: string;
      phone?: string;
      role: "admin" | "editor";
      permissions: string[];
    }) => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) throw new Error("Valid email required");
      if (data.password.length < 8) throw new Error("Password must be at least 8 characters");
      if (!data.full_name.trim()) throw new Error("Full name is required");
      return data;
    },
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Could not create staff account");

    const uid = created.user.id;
    const admin = supabaseAdmin as never as import("@supabase/supabase-js").SupabaseClient;

    await admin.from("user_roles").insert({ user_id: uid, role: data.role });
    const { error: staffError } = await admin.from("staff_members").upsert(
      {
        user_id: uid,
        full_name: data.full_name,
        email: data.email,
        title: data.title ?? (data.role === "admin" ? "Administrator" : "Editor"),
        phone: data.phone ?? null,
        permissions: data.permissions,
        is_active: true,
      },
      { onConflict: "user_id" },
    );
    if (staffError) throw new Error(staffError.message);

    return { userId: uid };
  });

export const updateStaff = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      user_id: string;
      full_name?: string;
      title?: string;
      phone?: string;
      is_active?: boolean;
      permissions?: string[];
      role?: "admin" | "editor";
    }) => data,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { user_id, role, ...fields } = data;
    const client = context.supabase as never as import("@supabase/supabase-js").SupabaseClient;

    const { error } = await client.from("staff_members").update(fields).eq("user_id", user_id);
    if (error) throw new Error(error.message);

    if (role) {
      if (user_id === context.userId && role !== "admin") {
        throw new Error("You cannot remove your own administrator role.");
      }
      await context.supabase.from("user_roles").delete().eq("user_id", user_id);
      await context.supabase.from("user_roles").insert({ user_id, role });
    }
    return { ok: true };
  });

export const deleteStaff = createServerFn({ method: "POST" })
  .inputValidator((data: { user_id: string }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    if (data.user_id === context.userId) throw new Error("You cannot remove your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export type { Permission };

/* ------------------------------------------------------------------ storage */

export const ensureImageBucket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePermission(context.supabase, context.userId, "properties");
    const { ensurePropertyBucket } = await import("@/lib/storage.server");
    return ensurePropertyBucket();
  });

export const signImages = createServerFn({ method: "POST" })
  .inputValidator((data: { paths: string[] }) => data)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requirePermission(context.supabase, context.userId, "properties");
    const { signPaths } = await import("@/lib/storage.server");
    const map = await signPaths(data.paths, context.supabase);
    return Object.fromEntries(map) as Record<string, string>;
  });
