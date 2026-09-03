import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdmin } from "@/lib/admin.server";

export type ActivityLog = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export const listActivityLogs = createServerFn({ method: "GET" })
  .inputValidator((data: { entity?: string; search?: string; limit?: number } | undefined) => data ?? {})
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const client = context.supabase as never as SupabaseClient;

    let query = client
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Math.min(data.limit ?? 200, 500));

    if (data.entity && data.entity !== "all") query = query.eq("entity", data.entity);
    if (data.search?.trim()) {
      const term = `%${data.search.trim()}%`;
      query = query.or(
        `summary.ilike.${term},action.ilike.${term},actor_email.ilike.${term},entity_id.ilike.${term}`,
      );
    }

    const { data: rows, error } = await query;
    if (error) {
      // Table not provisioned yet — surface a clear, non-fatal state.
      if (/relation .*activity_logs.* does not exist|schema cache/i.test(error.message)) {
        return { ready: false as const, logs: [] as ActivityLog[] };
      }
      throw new Error(error.message);
    }

    const list = (rows ?? []) as ActivityLog[];
    const actorIds = [...new Set(list.map((r) => r.actor_id).filter(Boolean))] as string[];
    const names = new Map<string, string>();
    if (actorIds.length) {
      const { data: staff } = await client
        .from("staff_members")
        .select("user_id, full_name")
        .in("user_id", actorIds);
      for (const s of (staff ?? []) as Array<{ user_id: string; full_name: string | null }>) {
        if (s.full_name) names.set(s.user_id, s.full_name);
      }
    }

    return {
      ready: true as const,
      logs: list.map((row) => ({
        ...row,
        actor_name: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
      })),
    };
  });
