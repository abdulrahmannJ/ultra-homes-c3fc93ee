import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/site/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { claimFirstAdmin, getStaffSession } from "@/lib/admin.functions";
import { SITE } from "@/lib/site";
import { STAFF_SESSION_KEY } from "@/lib/use-staff";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Staff Sign In | Universal Golden Homes" },
      {
        name: "description",
        content: "Secure sign in for Universal Golden Homes staff to manage listings, leads and website content.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Staff Sign In | Universal Golden Homes" },
      { property: "og:description", content: "Private staff access to the Universal Golden Homes management dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useServerFn(getStaffSession);
  const claimAdmin = useServerFn(claimFirstAdmin);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);


  useEffect(() => {
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) {
        try {
          const staff = await session();
          if (staff.isStaff) {
            await navigate({ to: "/admin", replace: true });
            return;
          }
        } catch {
          /* fall through to the sign-in form */
        }
      }
      setChecking(false);
    })();
    return () => {
      active = false;
    };
  }, [navigate, session]);

  async function finishSignedIn() {
    let staff = await session();
    if (!staff.isStaff) {
      const claim = await claimAdmin();
      if (claim.granted) staff = await session();
    }

    if (!staff.isStaff) {
      await supabase.auth.signOut();
      throw new Error("This account does not have staff access.");
    }

    queryClient.setQueryData(STAFF_SESSION_KEY, staff);
    toast.success(`Welcome back, ${staff.fullName || staff.email}`);
    await navigate({ to: "/admin", replace: true });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/auth",
            data: { full_name: fullName },
          },
        });
        if (error) throw new Error(error.message);
        if (!data.session) {
          setPendingConfirm(true);
          toast.success("Account created. Confirm your email, then sign in.");
          setMode("signin");
          return;
        }
        await finishSignedIn();
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      await finishSignedIn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }


  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <Logo className="h-11 w-11" />
          <div>
            <p className="font-serif text-lg font-semibold leading-tight">{SITE.name}</p>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Staff portal</p>
          </div>
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight">
          {mode === "signup" ? "Create the first admin account" : "Sign in"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signup"
            ? "Only available while no administrator exists. The first account created becomes the administrator."
            : "Staff accounts are created by an administrator."}
        </p>
        {pendingConfirm ? (
          <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            Check your inbox and confirm your email address, then sign in below.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                autoComplete="name"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@universalgoldenhomes.co.ke"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mode === "signup" ? "Create admin account" : "Sign in to dashboard"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          className="mt-4 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {mode === "signup"
            ? "Already have an account? Sign in"
            : "No administrator yet? Create the first admin account"}
        </button>


        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to website
        </Link>
      </div>
    </div>
  );
}
