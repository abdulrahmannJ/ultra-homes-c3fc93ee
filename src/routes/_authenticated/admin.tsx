import { Link, Outlet, createFileRoute, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  KeyRound,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelsTopLeft,
  Users,
  Users2,
  UserSquare2,
  X,
} from "lucide-react";
import { useState } from "react";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";
import { useSignOut, useStaffSession } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Universal Golden Homes" },
      { name: "description", content: "Manage listings, leads, agents and website content." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, permission: "analytics", exact: true },
  { to: "/admin/properties", label: "Properties", icon: Building2, permission: "properties" },
  { to: "/admin/rentals", label: "Rentals", icon: KeyRound, permission: "rentals" },
  { to: "/admin/tenants", label: "Tenants", icon: Users2, permission: "rentals" },
  { to: "/admin/leads", label: "Leads", icon: Inbox, permission: "leads" },
  { to: "/admin/content", label: "Website content", icon: PanelsTopLeft, permission: "content" },
  { to: "/admin/agents", label: "Agents", icon: UserSquare2, permission: "agents" },
  { to: "/admin/blog", label: "Blog", icon: FileText, permission: "blog" },
  { to: "/admin/staff", label: "Staff", icon: Users, permission: "staff" },
] as const;

function AdminLayout() {
  const { data: staff, isLoading } = useStaffSession();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = NAV.filter((item) => !staff || staff.permissions.includes(item.permission));

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 transform flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-18 items-center justify-between border-b border-sidebar-border px-5 py-4">
          <Link to="/admin" className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <span className="font-display text-sm font-semibold leading-tight text-sidebar-foreground">
              {SITE.name}
              <span className="mt-0.5 block text-[10px] uppercase tracking-[0.2em] text-sidebar-primary">
                Control centre
              </span>
            </span>
          </Link>
          <button className="text-sidebar-foreground/70 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/40">
            Management
          </p>
          {items.map((item) => {
            const active = "exact" in item && item.exact ? pathname === item.to : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to as "/admin"}
                onClick={() => setOpen(false)}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-gradient-gold text-navy-deep shadow-luxe"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    active ? "bg-navy-deep/10" : "bg-sidebar-accent/60 group-hover:bg-sidebar-accent"
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {isLoading ? "Loading…" : staff?.fullName || staff?.email}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{staff?.title}</p>
          </div>
          <Button
            variant="ghost"
            className="mt-2 w-full justify-start rounded-xl text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            onClick={() => void signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      {open ? (
        <button
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-18 items-center justify-between gap-3 border-b border-border bg-card/80 px-4 backdrop-blur-xl lg:px-8">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
          <p className="hidden text-sm text-muted-foreground lg:block">
            Universal Golden Homes management system
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
          >
            View website →
          </Link>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

