import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Switch } from "@/components/ui/switch";
import { createStaff, deleteStaff, listStaff, updateStaff } from "@/lib/admin.functions";
import { PERMISSIONS } from "@/lib/admin.server";
import { formatDate } from "@/lib/format";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StaffPage,
});

type StaffMember = {
  user_id: string;
  full_name: string;
  email: string | null;
  title: string | null;
  phone: string | null;
  is_active: boolean;
  permissions: string[];
  created_at: string;
  role: string;
};

function PermissionPicker({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {PERMISSIONS.map((permission) => {
        const checked = selected.includes(permission);
        return (
          <label key={permission} className="flex items-center gap-2 text-sm capitalize">
            <Checkbox
              checked={checked}
              onCheckedChange={(value) =>
                onChange(
                  value === true
                    ? [...selected, permission]
                    : selected.filter((item) => item !== permission),
                )
              }
            />
            {permission}
          </label>
        );
      })}
    </div>
  );
}

function StaffManager() {
  const queryClient = useQueryClient();
  const fetchStaff = useServerFn(listStaff);
  const create = useServerFn(createStaff);
  const update = useServerFn(updateStaff);
  const remove = useServerFn(deleteStaff);

  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);

  const { data: staff, isLoading } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => fetchStaff() as Promise<StaffMember[]>,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-staff"] });

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof create>[0]["data"]) => create({ data: input }),
    onSuccess: () => {
      toast.success("Staff account created");
      setInviting(false);
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: (input: Parameters<typeof update>[0]["data"]) => update({ data: input }),
    onSuccess: () => {
      toast.success("Staff member updated");
      setEditing(null);
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => remove({ data: { user_id: userId } }),
    onSuccess: () => {
      toast.success("Staff account removed");
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Give colleagues access to the control centre and decide what each of them can manage.
          </p>
        </div>
        <Button onClick={() => setInviting(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Add staff member
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : (staff ?? []).length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <Users className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No staff members yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(staff ?? []).map((member) => (
            <li
              key={member.user_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{member.full_name || member.email}</p>
                  <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                    {member.role}
                  </Badge>
                  {member.is_active ? null : <Badge variant="outline">Disabled</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {member.email} · {member.title || "Staff"} · joined {formatDate(member.created_at)}
                </p>
                <p className="mt-1 text-xs capitalize text-muted-foreground">
                  {member.role === "admin"
                    ? "Full access to every section"
                    : member.permissions.length
                      ? member.permissions.join(", ")
                      : "No sections assigned"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setEditing(member)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Remove staff member">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {member.full_name || member.email}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Their login is deleted and they lose access to the control centre.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(member.user_id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </li>
          ))}
        </ul>
      )}

      {inviting ? (
        <InviteDialog
          saving={createMutation.isPending}
          onCancel={() => setInviting(false)}
          onSave={(input) => createMutation.mutate(input)}
        />
      ) : null}

      {editing ? (
        <EditDialog
          member={editing}
          saving={updateMutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input) => updateMutation.mutate(input)}
        />
      ) : null}
    </div>
  );
}

function InviteDialog({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: (input: {
    email: string;
    password: string;
    full_name: string;
    title: string;
    phone: string;
    role: "admin" | "editor";
    permissions: string[];
  }) => void;
}) {
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    title: "",
    phone: "",
    role: "editor" as "admin" | "editor",
    permissions: ["properties", "leads"] as string[],
  });

  return (
    <Dialog open onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add staff member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Temporary password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) => setForm({ ...form, role: role as "admin" | "editor" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sections they can manage</Label>
            <PermissionPicker
              selected={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />
            {form.role === "admin" ? (
              <p className="text-xs text-muted-foreground">
                Administrators always have access to every section.
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => onSave(form)}>
            {saving ? "Creating…" : "Create account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  member,
  saving,
  onCancel,
  onSave,
}: {
  member: StaffMember;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: {
    user_id: string;
    full_name: string;
    title: string;
    phone: string;
    is_active: boolean;
    permissions: string[];
    role: "admin" | "editor";
  }) => void;
}) {
  const [form, setForm] = useState({
    user_id: member.user_id,
    full_name: member.full_name ?? "",
    title: member.title ?? "",
    phone: member.phone ?? "",
    is_active: member.is_active,
    permissions: member.permissions ?? [],
    role: (member.role === "admin" ? "admin" : "editor") as "admin" | "editor",
  });

  return (
    <Dialog open onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {member.full_name || member.email}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(role) => setForm({ ...form, role: role as "admin" | "editor" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sections they can manage</Label>
            <PermissionPicker
              selected={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={form.is_active}
              onCheckedChange={(is_active) => setForm({ ...form, is_active })}
            />
            Account active
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => onSave(form)}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StaffPage() {
  return (
    <PermissionGate permission="staff">
      <StaffManager />
    </PermissionGate>
  );
}
