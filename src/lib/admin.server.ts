import type { SupabaseClient } from "@supabase/supabase-js";

export const PERMISSIONS = [
  "properties",
  "leads",
  "content",
  "agents",
  "blog",
  "staff",
  "analytics",
  "rentals",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** Throws unless the caller is an admin or has the requested permission. */
export async function requirePermission(
  supabase: SupabaseClient<never>,
  userId: string,
  permission: Permission,
) {
  const { data, error } = await (supabase as never as SupabaseClient).rpc("has_permission", {
    _user_id: userId,
    _permission: permission,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`You do not have permission to manage ${permission}.`);
  return true;
}

export async function requireAdmin(supabase: SupabaseClient<never>, userId: string) {
  const { data, error } = await (supabase as never as SupabaseClient).rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Administrator access required.");
  return true;
}
