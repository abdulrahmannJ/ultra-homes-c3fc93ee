import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityEntry = {
  action: string;
  entity: string;
  entityId?: string | null;
  summary?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Writes an audit trail row. Never throws: a failed log must not break the
 * admin action it describes (e.g. when the table has not been created yet).
 */
export async function recordActivity(
  supabase: unknown,
  actor: { userId: string; email?: string },
  entry: ActivityEntry,
) {
  try {
    await (supabase as SupabaseClient).from("activity_logs").insert({
      actor_id: actor.userId,
      actor_email: actor.email ?? null,
      action: entry.action,
      entity: entry.entity,
      entity_id: entry.entityId ?? null,
      summary: entry.summary ?? null,
      metadata: entry.metadata ?? {},
    });
  } catch {
    /* audit logging is best-effort */
  }
}
