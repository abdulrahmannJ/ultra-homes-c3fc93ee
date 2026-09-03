import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  Building2,
  Eye,
  Globe,
  Inbox,
  Sparkles,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getDashboardStats } from "@/lib/admin.functions";
import { formatCompact, formatDate, formatPrice, statusLabel } from "@/lib/format";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({
    meta: [
      { title: "Dashboard | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function AdminDashboard() {
  const fetchStats = useServerFn(getDashboardStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => fetchStats(),
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-9 w-48 animate-pulse rounded-lg bg-muted/60" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total properties", value: String(data.totals.properties), icon: Building2 },
    { label: "Published listings", value: String(data.totals.published), icon: Globe },
    { label: "Total leads", value: String(data.totals.leads), icon: Inbox },
    { label: "New leads", value: String(data.totals.newLeads), icon: Sparkles },
    {
      label: "Portfolio value",
      value: formatPrice(data.totals.portfolioValue).replace("KES", "KES "),
      icon: Wallet,
    },
    { label: "Listing views", value: formatCompact(data.totals.views), icon: Eye },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A quick pulse on listings, leads and portfolio performance.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 className="font-semibold">Latest leads</h2>
            <Link
              to="/admin/leads"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {data.recentLeads.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No enquiries yet — new leads will appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentLeads.map((lead) => (
                <li key={lead.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{lead.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.email || lead.phone || "No contact details"} · {formatDate(lead.created_at)}
                    </p>
                  </div>
                  <Badge variant={lead.status === "new" ? "default" : "secondary"}>
                    {lead.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4">
            <h2 className="font-semibold">Most viewed properties</h2>
          </div>
          {data.topViewed.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No properties yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data.topViewed.map((property) => (
                <li key={property.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <p className="truncate text-sm font-medium">{property.title}</p>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Eye className="h-3.5 w-3.5" /> {formatCompact(property.views)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Listing status mix</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {data.statusMix.map((item) => (
            <Badge key={item.status} variant="secondary" className="px-3 py-1.5 text-xs">
              {statusLabel(item.status)} · {item.count}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}

function DashboardPage() {
  return (
    <PermissionGate permission="analytics">
      <AdminDashboard />
    </PermissionGate>
  );
}
