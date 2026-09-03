import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Pencil, Plus, Trash2, UserSquare2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { deleteAgent, listAdminAgents, saveAgent, type AgentInput } from "@/lib/admin.functions";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/agents")({
  head: () => ({
    meta: [
      { title: "Agents | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AgentsPage,
});

const EMPTY: AgentInput = {
  name: "",
  title: "",
  phone: "",
  whatsapp: "",
  email: "",
  photo_url: "",
  bio: "",
  is_published: true,
  sort_order: 0,
};

function AgentsManager() {
  const queryClient = useQueryClient();
  const fetchAgents = useServerFn(listAdminAgents);
  const persist = useServerFn(saveAgent);
  const remove = useServerFn(deleteAgent);
  const [editing, setEditing] = useState<AgentInput | null>(null);

  const { data: agents, isLoading } = useQuery({
    queryKey: ["admin-agents"],
    queryFn: () => fetchAgents(),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin-agents"] });

  const saveMutation = useMutation({
    mutationFn: (input: AgentInput) => persist({ data: input }),
    onSuccess: () => {
      toast.success("Agent saved");
      setEditing(null);
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Agent removed");
      void invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The sales team shown on the public agents page and property enquiries.
          </p>
        </div>
        <Button onClick={() => setEditing({ ...EMPTY })}>
          <Plus className="mr-2 h-4 w-4" /> New agent
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : (agents ?? []).length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
          <UserSquare2 className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No agents added yet.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(agents ?? []).map((agent) => (
            <li key={agent.id} className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <img
                src={agent.photo_url || "/images/agent-1.jpg"}
                alt={agent.name}
                loading="lazy"
                className="h-16 w-16 rounded-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{agent.name}</p>
                  {agent.is_published ? null : <Badge variant="outline">Hidden</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{agent.title}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {[agent.phone, agent.email].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={() => setEditing(agent)} title="Edit">
                  <Pencil className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" title="Delete agent">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove {agent.name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        They will no longer appear on the website.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(agent.id)}>
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

      {editing ? (
        <AgentEditor
          value={editing}
          saving={saveMutation.isPending}
          onCancel={() => setEditing(null)}
          onSave={(input) => saveMutation.mutate(input)}
        />
      ) : null}
    </div>
  );
}

function AgentEditor({
  value,
  saving,
  onCancel,
  onSave,
}: {
  value: AgentInput;
  saving: boolean;
  onCancel: () => void;
  onSave: (input: AgentInput) => void;
}) {
  const [form, setForm] = useState<AgentInput>(value);
  const set = <K extends keyof AgentInput>(key: K, next: AgentInput[K]) =>
    setForm((current) => ({ ...current, [key]: next }));

  return (
    <Dialog open onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit agent" : "New agent"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Job title</Label>
              <Input value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp</Label>
              <Input value={form.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Photo URL</Label>
              <Input value={form.photo_url ?? ""} onChange={(e) => set("photo_url", e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bio</Label>
            <Textarea rows={4} value={form.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <div className="space-y-1.5">
              <Label>Sort order</Label>
              <Input
                type="number"
                className="w-28"
                value={String(form.sort_order ?? 0)}
                onChange={(e) => set("sort_order", Number(e.target.value))}
              />
            </div>
            <label className="flex items-center gap-2 pt-5 text-sm">
              <Switch
                checked={Boolean(form.is_published)}
                onCheckedChange={(next) => set("is_published", next)}
              />
              Show on website
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={saving} onClick={() => onSave(form)}>
            {saving ? "Saving…" : "Save agent"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AgentsPage() {
  return (
    <PermissionGate permission="agents">
      <AgentsManager />
    </PermissionGate>
  );
}
