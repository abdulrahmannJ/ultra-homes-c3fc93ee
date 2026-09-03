import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getStaffSession } from "@/lib/admin.functions";
import type { Permission } from "@/lib/admin.server";

export const STAFF_SESSION_KEY = ["staff-session"] as const;

export function useStaffSession() {
  const fetchSession = useServerFn(getStaffSession);
  return useQuery({
    queryKey: STAFF_SESSION_KEY,
    queryFn: () => fetchSession(),
    staleTime: 60_000,
    retry: false,
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };
}

export function PermissionGate({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { data, isLoading } = useStaffSession();

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" />;
  }

  if (!data?.permissions.includes(permission)) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Access restricted</h2>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Your account does not have the <span className="font-medium">{permission}</span>{" "}
          permission. Ask an administrator to grant access.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
