import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, MailOpen, MessageSquare, Phone, Trash2 } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteLead,
  listAdminLeads,
  listNewsletterSubscribers,
  updateLeadStatus,
} from "@/lib/admin.functions";
import { formatDate } from "@/lib/format";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  head: () => ({
    meta: [
      { title: "Leads Inbox | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeadsPage,
});

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  status: string;
  source: string;
  created_at: string;
  properties: { title: string; slug: string } | null;
};

const STATUSES = ["new", "contacted", "qualified", "closed"] as const;
const FILTERS = ["all", ...STATUSES] as const;

function statusVariant(status: string) {
  if (status === "new") return "default" as const;
  if (status === "closed") return "outline" as const;
  return "secondary" as const;
}

function LeadsInbox() {
  const queryClient = useQueryClient();
  const fetchLeads = useServerFn(listAdminLeads);
  const fetchSubscribers = useServerFn(listNewsletterSubscribers);
  const setStatus = useServerFn(updateLeadStatus);
  const removeLead = useServerFn(deleteLead);

  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [tab, setTab] = useState<"leads" | "newsletter">("leads");

  const { data: leads, isLoading } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: () => fetchLeads() as Promise<LeadRow[]>,
  });
  const { data: subscribers } = useQuery({
    queryKey: ["admin-newsletter"],
    queryFn: () => fetchSubscribers(),
  });

  const statusMutation = useMutation({
    mutationFn: (input: { id: string; status: string }) => setStatus({ data: input }),
    onSuccess: () => {
      toast.success("Lead status updated");
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => removeLead({ data: { id } }),
    onSuccess: () => {
      toast.success("Lead deleted");
      void queryClient.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const rows = (leads ?? []).filter((lead) => filter === "all" || lead.status === filter);
  const counts = Object.fromEntries(
    FILTERS.map((f) => [
      f,
      f === "all" ? (leads ?? []).length : (leads ?? []).filter((l) => l.status === f).length,
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Leads inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enquiries from contact forms, property pages and newsletter signups.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={tab === "leads" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("leads")}
        >
          Enquiries ({leads?.length ?? 0})
        </Button>
        <Button
          variant={tab === "newsletter" ? "default" : "outline"}
          size="sm"
          onClick={() => setTab("newsletter")}
        >
          Newsletter ({subscribers?.length ?? 0})
        </Button>
      </div>

      {tab === "newsletter" ? (
        <div className="rounded-xl border border-border bg-card">
          {(subscribers ?? []).length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">
              No newsletter subscribers yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {(subscribers ?? []).map((sub) => (
                <li key={sub.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4 text-muted-foreground" /> {sub.email}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(sub.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f} · {counts[f] ?? 0}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-5 py-12 text-center">
              <MailOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No {filter === "all" ? "" : filter} enquiries yet.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {rows.map((lead) => (
                <li key={lead.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{lead.name}</p>
                        <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
                        <Badge variant="outline" className="capitalize">{lead.source}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{formatDate(lead.created_at)}</p>
                      {lead.properties ? (
                        <Link
                          to="/properties/$slug"
                          params={{ slug: lead.properties.slug }}
                          className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
                        >
                          Re: {lead.properties.title}
                        </Link>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {lead.phone ? (
                        <Button variant="outline" size="icon" asChild title="Call">
                          <a href={`tel:${lead.phone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}
                      {lead.phone ? (
                        <Button variant="outline" size="icon" asChild title="WhatsApp">
                          <a
                            href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}
                      {lead.email ? (
                        <Button variant="outline" size="icon" asChild title="Email">
                          <a href={`mailto:${lead.email}`}>
                            <Mail className="h-4 w-4" />
                          </a>
                        </Button>
                      ) : null}

                      <Select
                        value={lead.status}
                        onValueChange={(status) => statusMutation.mutate({ id: lead.id, status })}
                      >
                        <SelectTrigger className="h-9 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete lead">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete this lead?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This permanently removes the enquiry from {lead.name}. This action
                              cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(lead.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {lead.message ? (
                    <p className="mt-3 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                      {lead.message}
                    </p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {lead.email ? <span>{lead.email}</span> : null}
                    {lead.phone ? <span>{lead.phone}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function LeadsPage() {
  return (
    <PermissionGate permission="leads">
      <LeadsInbox />
    </PermissionGate>
  );
}
