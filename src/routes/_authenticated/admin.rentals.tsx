import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  BadgeCheck,
  Coins,
  DoorOpen,
  MessageCircle,
  Plus,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RentalUnitsManager } from "@/components/admin/rentals/RentalUnitsManager";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/format";
import {
  LEASE_BUCKET,
  createLeaseUploadUrl,
  deletePayment,
  getRentalsOverview,
  listPayments,
  listRentReminders,
  listRentalProperties,
  listRentalUnits,
  offboardTenant,
  onboardTenant,
  savePayment,
  type PaymentRow,
  type RentalUnitRow,
} from "@/lib/rentals.functions";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/rentals")({
  head: () => ({
    meta: [
      { title: "Rentals | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RentalsPage,
});

const today = () => new Date().toISOString().slice(0, 10);
const money = (value: number) => `KES ${Math.round(value).toLocaleString()}`;

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Coins;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ tenants */

function OnboardDialog({
  unit,
  onClose,
  onDone,
}: {
  unit: RentalUnitRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const onboard = useServerFn(onboardTenant);
  const createUpload = useServerFn(createLeaseUploadUrl);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    id_number: "",
    emergency_contact: "",
    start_date: today(),
    end_date: "",
    monthly_rent: unit.monthly_rent,
    deposit: unit.monthly_rent,
    deposit_paid: 0,
    rent_due_day: unit.rent_due_day,
    service_charge: unit.service_charge ?? 0,
    grace_days: 5,
    notes: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      let contract_path: string | null = null;
      if (file) {
        const signed = await createUpload({ data: { fileName: file.name } });
        const { error } = await supabase.storage
          .from(LEASE_BUCKET)
          .uploadToSignedUrl(signed.path, signed.token, file);
        if (error) throw new Error(error.message);
        contract_path = signed.path;
      }
      return onboard({
        data: {
          unit_id: unit.id,
          full_name: form.full_name,
          phone: form.phone || null,
          email: form.email || null,
          id_number: form.id_number || null,
          emergency_contact: form.emergency_contact || null,
          start_date: form.start_date,
          end_date: form.end_date || null,
          monthly_rent: Number(form.monthly_rent),
          deposit: Number(form.deposit),
          deposit_paid: Number(form.deposit_paid),
          rent_due_day: Number(form.rent_due_day),
          service_charge: Number(form.service_charge),
          grace_days: Math.min(15, Math.max(0, Number(form.grace_days))),
          contract_path,
          notes: form.notes || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Tenant onboarded");
      onDone();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Onboard tenant — {unit.property_title} {unit.label}
          </DialogTitle>
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
          <div className="space-y-1.5">
            <Label>Lease start</Label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lease end (optional)</Label>
            <Input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Monthly rent</Label>
            <Input
              type="number"
              value={String(form.monthly_rent)}
              onChange={(e) => setForm({ ...form, monthly_rent: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deposit</Label>
            <Input
              type="number"
              value={String(form.deposit)}
              onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Deposit paid now</Label>
            <Input
              type="number"
              min={0}
              value={String(form.deposit_paid)}
              onChange={(e) => setForm({ ...form, deposit_paid: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Recorded as a payment on the lease start date, so it clears the deposit balance.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Rent due day</Label>
            <Input
              type="number"
              value={String(form.rent_due_day)}
              onChange={(e) => setForm({ ...form, rent_due_day: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Service charge</Label>
            <Input
              type="number"
              min={0}
              value={String(form.service_charge)}
              onChange={(e) => setForm({ ...form, service_charge: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Grace days (0–15)</Label>
            <Input
              type="number"
              min={0}
              max={15}
              value={String(form.grace_days)}
              onChange={(e) =>
                setForm({ ...form, grace_days: Math.min(15, Math.max(0, Number(e.target.value))) })
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lease document (optional)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
            {mutation.isPending ? "Saving…" : "Onboard tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OffboardDialog({
  unit,
  onClose,
  onDone,
}: {
  unit: RentalUnitRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const offboard = useServerFn(offboardTenant);
  const [moveOut, setMoveOut] = useState(today());
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      offboard({
        data: { lease_id: unit.lease_id!, move_out_date: moveOut, move_out_notes: notes || null },
      }),
    onSuccess: () => {
      toast.success("Tenant offboarded");
      onDone();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Offboard {unit.tenant_name} — {unit.label}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Move-out date</Label>
            <Input type="date" value={moveOut} onChange={(e) => setMoveOut(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Notes (condition, deposit refund…)</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {unit.balance > 0 ? (
            <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              Outstanding balance of {money(unit.balance)} on this lease.
            </p>
          ) : null}
          {unit.credit > 0 ? (
            <p className="rounded-lg bg-primary/10 p-3 text-xs text-primary">
              Rent credit of {money(unit.credit)} plus a deposit of {money(unit.deposit)} to refund
              or offset.
            </p>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Confirm move-out"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ----------------------------------------------------------------- payments */

function PaymentDialog({
  units,
  editing,
  onClose,
  onDone,
}: {
  units: RentalUnitRow[];
  editing: PaymentRow | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const persist = useServerFn(savePayment);
  const occupied = units.filter((unit) => unit.lease_id);
  const [form, setForm] = useState({
    lease_id: editing?.lease_id ?? occupied[0]?.lease_id ?? "",
    amount: editing?.amount ?? 0,
    paid_on: editing?.paid_on ?? today(),
    method: editing?.method ?? "mpesa",
    reference: editing?.reference ?? "",
    notes: editing?.notes ?? "",
  });
  const selected = occupied.find((unit) => unit.lease_id === form.lease_id) ?? null;



  const mutation = useMutation({
    mutationFn: () =>
      persist({
        data: {
          ...(editing?.id ? { id: editing.id } : {}),
          lease_id: form.lease_id,
          amount: Number(form.amount),
          paid_on: form.paid_on,
          method: form.method,
          reference: form.reference || null,
          notes: form.notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Payment recorded");
      onDone();
      onClose();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit payment" : "Record payment"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Tenant / unit</Label>
            <Select value={form.lease_id} onValueChange={(next) => setForm({ ...form, lease_id: next })}>
              <SelectTrigger>
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {occupied.map((unit) => (
                  <SelectItem key={unit.lease_id!} value={unit.lease_id!}>
                    {unit.property_title} {unit.label} — {unit.tenant_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selected ? (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs">
              <div>
                <p className="text-muted-foreground">Monthly rent</p>
                <p className="font-semibold">{money(selected.monthly_rent)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Deposit due</p>
                <p className="font-semibold">{money(selected.deposit_balance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Outstanding</p>
                <p className={`font-semibold ${selected.balance > 0 ? "text-destructive" : ""}`}>
                  {selected.credit > 0 ? `${money(selected.credit)} credit` : money(selected.balance)}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                value={String(form.amount)}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Paid on</Label>
              <Input
                type="date"
                value={form.paid_on}
                onChange={(e) => setForm({ ...form, paid_on: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Method</Label>
              <Select value={form.method} onValueChange={(next) => setForm({ ...form, method: next })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["mpesa", "bank", "cash", "cheque"].map((method) => (
                    <SelectItem key={method} value={method} className="capitalize">
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reference</Label>
              <Input
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={2}
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
            disabled={!form.lease_id || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving…" : "Save payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------------------------------------- main page */

function RentalsManager() {
  const queryClient = useQueryClient();
  const fetchOverview = useServerFn(getRentalsOverview);
  const fetchUnits = useServerFn(listRentalUnits);
  const fetchProperties = useServerFn(listRentalProperties);
  const fetchPayments = useServerFn(listPayments);
  const fetchReminders = useServerFn(listRentReminders);
  const removePayment = useServerFn(deletePayment);

  const [propertyFilter, setPropertyFilter] = useState("all");
  const [onboarding, setOnboarding] = useState<RentalUnitRow | null>(null);
  const [offboarding, setOffboarding] = useState<RentalUnitRow | null>(null);
  const [paymentDialog, setPaymentDialog] = useState<{ editing: PaymentRow | null } | null>(null);

  const { data: overview } = useQuery({
    queryKey: ["rentals-overview"],
    queryFn: () => fetchOverview(),
  });
  const { data: units, isLoading: unitsLoading } = useQuery({
    queryKey: ["rental-units", "all"],
    queryFn: () => fetchUnits({ data: {} }) as Promise<RentalUnitRow[]>,
  });
  const { data: properties } = useQuery({
    queryKey: ["rental-properties"],
    queryFn: () => fetchProperties(),
  });
  const { data: payments } = useQuery({
    queryKey: ["rental-payments"],
    queryFn: () => fetchPayments({ data: {} }) as Promise<PaymentRow[]>,
  });
  const { data: reminders } = useQuery({
    queryKey: ["rental-reminders"],
    queryFn: () => fetchReminders(),
  });

  const refreshAll = () => {
    for (const key of [
      "rentals-overview",
      "rental-units",
      "rental-payments",
      "rental-reminders",
    ]) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  };

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => removePayment({ data: { id } }),
    onSuccess: () => {
      toast.success("Payment deleted");
      refreshAll();
    },
    onError: (error) => toast.error(error.message),
  });

  const rentalProperties = (properties ?? []).filter((p) => p.listing_type === "rent");
  const visibleUnits = useMemo(
    () =>
      (units ?? []).filter((unit) => propertyFilter === "all" || unit.property_id === propertyFilter),
    [units, propertyFilter],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rentals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Units, tenants, rent collection and reminders across the managed portfolio.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="reminders">
            Reminders{reminders?.length ? ` (${reminders.length})` : ""}
          </TabsTrigger>
        </TabsList>

        {/* overview */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Expected this month"
              value={money(overview?.expected ?? 0)}
              hint={`${overview?.totalUnits ?? 0} units tracked`}
              icon={Coins}
            />
            <MetricCard
              label="Collected"
              value={money(overview?.collected ?? 0)}
              hint="Payments recorded this month"
              icon={Wallet}
            />
            <MetricCard
              label="Outstanding"
              value={money(overview?.outstanding ?? 0)}
              hint={`${overview?.overdueUnits ?? 0} units overdue`}
              icon={AlertTriangle}
            />
            <MetricCard
              label="Occupancy"
              value={`${overview?.occupiedUnits ?? 0}/${overview?.totalUnits ?? 0}`}
              hint={`${overview?.vacantUnits ?? 0} vacant`}
              icon={DoorOpen}
            />
          </div>

          {rentalProperties.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              No rental listings yet. Set a property’s listing type to “rent” and add its units from
              the property editor.
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-5">
              <h2 className="text-sm font-semibold">Rental properties</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {rentalProperties.map((property) => {
                  const rows = (units ?? []).filter((u) => u.property_id === property.id);
                  const occupied = rows.filter((u) => u.status === "occupied").length;
                  return (
                    <li
                      key={property.id}
                      className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                    >
                      <span className="truncate">{property.title}</span>
                      <Badge variant="outline">
                        {occupied}/{rows.length} occupied
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </TabsContent>

        {/* units */}
        <TabsContent value="units" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={propertyFilter} onValueChange={setPropertyFilter}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All properties</SelectItem>
                {rentalProperties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {unitsLoading ? (
            <div className="h-40 animate-pulse rounded-xl border border-border bg-muted/40" />
          ) : visibleUnits.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              No units to show.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Property</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Tenant</th>
                    <th className="px-4 py-3 text-right">Rent</th>
                    <th className="px-4 py-3 text-right">Balance</th>
                    <th className="px-4 py-3 text-left">Lease end</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visibleUnits.map((unit) => (
                    <tr key={unit.id}>
                      <td className="px-4 py-3 text-muted-foreground">{unit.property_title}</td>
                      <td className="px-4 py-3 font-medium">
                        {unit.label}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {unit.bedrooms} bed
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {unit.tenant_name ? (
                          <span>
                            {unit.tenant_name}
                            {unit.tenant_phone ? (
                              <span className="block text-xs text-muted-foreground">
                                {unit.tenant_phone}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <Badge variant="outline">Vacant</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {money(unit.monthly_rent)}
                        {unit.lease_id && unit.deposit > 0 ? (
                          <span className="block text-xs text-muted-foreground">
                            deposit {money(unit.deposit)}
                          </span>
                        ) : null}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${unit.balance > 0 ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {unit.credit > 0 ? `${money(unit.credit)} credit` : money(unit.balance)}
                        {unit.lease_id && unit.balance > 0 ? (
                          <span className="block text-xs text-muted-foreground">
                            {money(unit.rent_balance)} rent
                            {unit.deposit_balance > 0
                              ? ` · ${money(unit.deposit_balance)} deposit`
                              : ""}
                          </span>
                        ) : null}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {unit.lease_end ? formatDate(unit.lease_end) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {unit.lease_id ? (
                          <Button variant="outline" size="sm" onClick={() => setOffboarding(unit)}>
                            Offboard
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setOnboarding(unit)}>
                            <Plus className="mr-1.5 h-3.5 w-3.5" /> Onboard
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {propertyFilter !== "all" ? <RentalUnitsManager propertyId={propertyFilter} /> : null}
        </TabsContent>

        {/* payments */}
        <TabsContent value="payments" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setPaymentDialog({ editing: null })}>
              <Plus className="mr-2 h-4 w-4" /> Record payment
            </Button>
          </div>

          {(payments ?? []).length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              No payments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Tenant</th>
                    <th className="px-4 py-3 text-left">Unit</th>
                    <th className="px-4 py-3 text-left">Method</th>
                    <th className="px-4 py-3 text-left">Reference</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(payments ?? []).map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(payment.paid_on)}
                      </td>
                      <td className="px-4 py-3 font-medium">{payment.tenant_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {payment.property_title} {payment.unit_label}
                      </td>
                      <td className="px-4 py-3 capitalize">{payment.method}</td>
                      <td className="px-4 py-3 text-muted-foreground">{payment.reference ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-medium">{money(payment.amount)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPaymentDialog({ editing: payment })}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Print receipt"
                            onClick={() => window.print()}
                          >
                            <BadgeCheck className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete payment"
                            onClick={() => deletePaymentMutation.mutate(payment.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* reminders */}
        <TabsContent value="reminders" className="space-y-3">
          {(reminders ?? []).length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground">
              Nothing due in the next seven days. All rent is up to date.
            </div>
          ) : (
            <ul className="space-y-3">
              {(reminders ?? []).map((row) => {
                const phone = (row.tenant_phone ?? "").replace(/[^0-9]/g, "");
                const message = encodeURIComponent(
                  `Hello ${row.tenant_name}, this is a friendly reminder from Universal Golden Homes about rent for ${row.property_title} unit ${row.label}. Outstanding balance: ${money(row.balance)}${row.next_due_date ? `, due ${row.next_due_date}` : ""}. Thank you.`,
                );
                return (
                  <li
                    key={row.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{row.tenant_name}</p>
                        <Badge variant={row.overdue ? "destructive" : "secondary"}>
                          {row.overdue ? "Overdue" : "Due soon"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.property_title} {row.label} · balance {money(row.balance)}
                        {row.next_due_date ? ` · due ${formatDate(row.next_due_date)}` : ""}
                        {` · ${row.grace_days} day grace`}
                      </p>
                    </div>
                    <Button asChild disabled={!phone} variant={row.overdue ? "default" : "outline"}>
                      <a
                        href={`https://wa.me/${phone}?text=${message}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp reminder
                      </a>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>

      {onboarding ? (
        <OnboardDialog
          unit={onboarding}
          onClose={() => setOnboarding(null)}
          onDone={refreshAll}
        />
      ) : null}
      {offboarding ? (
        <OffboardDialog
          unit={offboarding}
          onClose={() => setOffboarding(null)}
          onDone={refreshAll}
        />
      ) : null}
      {paymentDialog ? (
        <PaymentDialog
          units={units ?? []}
          editing={paymentDialog.editing}
          onClose={() => setPaymentDialog(null)}
          onDone={refreshAll}
        />
      ) : null}
    </div>
  );
}

function RentalsPage() {
  return (
    <PermissionGate permission="rentals">
      <RentalsManager />
    </PermissionGate>
  );
}
