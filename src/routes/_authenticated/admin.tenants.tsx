import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, Pencil, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { listTenants, saveTenant, type TenantRow } from "@/lib/rentals.functions";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/tenants")({
  head: () => ({
    meta: [
      { title: "Tenants | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TenantsPage,
});

const money = (value: number) => `KES ${Math.round(value).toLocaleString()}`;

function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Users className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function EditTenantDialog({
  tenant,
  onClose,
  onDone,
}: {
  tenant: TenantRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const persist = useServerFn(saveTenant);
  const [form, setForm] = useState({
    full_name: tenant.full_name,
    phone: tenant.phone ?? "",
    email: tenant.email ?? "",
    id_number: tenant.id_number ?? "",
    emergency_contact: tenant.emergency_contact ?? "",
    notes: tenant.notes ?? "",
  });

  const mutation = useMutation({
    mutationFn: () =>
      persist({
        data: {
          id: tenant.id,
          full_name: form.full_name,
          phone: form.phone || null,
          email: form.email || null,
          id_number: form.id_number || null,
          emergency_contact: form.emergency_contact || null,
          notes: form.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Tenant updated");
      onDone();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit tenant — {tenant.full_name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Full name</Label>
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>ID number</Label>
            <Input
              value={form.id_number}
              onChange={(e) => setForm({ ...form, id_number: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Emergency contact</Label>
            <Input
              value={form.emergency_contact}
              onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!form.full_name.trim() || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TenantsManager() {
  const queryClient = useQueryClient();
  const fetchTenants = useServerFn(listTenants);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<TenantRow | null>(null);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["admin", "tenants"],
    queryFn: () => fetchTenants(),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin", "tenants"] });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      if (status === "active" && tenant.lease_status !== "active") return false;
      if (status === "past" && tenant.lease_status === "active") return false;
      if (status === "arrears" && !(tenant.balance > 0)) return false;
      if (!term) return true;
      return [
        tenant.full_name,
        tenant.phone ?? "",
        tenant.email ?? "",
        tenant.unit_label ?? "",
        tenant.property_title ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [tenants, search, status]);

  const active = tenants.filter((t) => t.lease_status === "active");
  const arrears = tenants.reduce((sum, t) => sum + Math.max(t.balance, 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Tenants</h1>
        <p className="text-sm text-muted-foreground">
          Everyone who has occupied a unit, with their property, tenancy and balance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Total tenants" value={String(tenants.length)} />
        <MetricCard label="Active tenancies" value={String(active.length)} />
        <MetricCard
          label="Outstanding"
          value={money(arrears)}
          hint={`${tenants.filter((t) => t.balance > 0).length} tenant(s) owing`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name, phone, unit or property…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tenants</SelectItem>
            <SelectItem value="active">Active tenancies</SelectItem>
            <SelectItem value="past">Past tenants</SelectItem>
            <SelectItem value="arrears">In arrears</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Tenant</th>
              <th className="px-4 py-3">Property / unit</th>
              <th className="px-4 py-3">Tenancy</th>
              <th className="px-4 py-3">Rent</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  Loading tenants…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                  No tenants match this view. Onboard a tenant from the Rentals page.
                </td>
              </tr>
            ) : (
              rows.map((tenant) => (
                <tr key={tenant.id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <p className="font-medium">{tenant.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.phone || tenant.email || "No contact"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{tenant.property_title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.unit_label ? `Unit ${tenant.unit_label}` : "No unit"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={tenant.lease_status === "active" ? "default" : "secondary"}>
                      {tenant.lease_status === "active" ? "Active" : (tenant.lease_status ?? "None")}
                    </Badge>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tenant.start_date ? formatDate(tenant.start_date) : "—"}
                      {tenant.end_date ? ` → ${formatDate(tenant.end_date)}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{tenant.monthly_rent ? money(tenant.monthly_rent) : "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.next_due_date ? `Next due ${formatDate(tenant.next_due_date)}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {tenant.credit > 0 ? (
                      <span className="text-primary">{money(tenant.credit)} credit</span>
                    ) : (
                      <span className={tenant.balance > 0 ? "font-semibold text-destructive" : ""}>
                        {money(tenant.balance)}
                      </span>
                    )}
                    {tenant.overdue ? (
                      <p className="text-xs text-destructive">Overdue</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {tenant.phone ? (
                        <Button asChild size="sm" variant="outline">
                          <a
                            href={`https://wa.me/${tenant.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}
                      <Button size="sm" variant="outline" onClick={() => setEditing(tenant)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing ? (
        <EditTenantDialog tenant={editing} onClose={() => setEditing(null)} onDone={refresh} />
      ) : null}
    </div>
  );
}

function TenantsPage() {
  return (
    <PermissionGate permission="rentals">
      <TenantsManager />
    </PermissionGate>
  );
}
