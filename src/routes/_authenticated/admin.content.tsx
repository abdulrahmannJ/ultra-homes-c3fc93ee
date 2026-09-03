import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listSiteContent, saveSiteContent } from "@/lib/admin.functions";
import { PermissionGate } from "@/lib/use-staff";

export const Route = createFileRoute("/_authenticated/admin/content")({
  head: () => ({
    meta: [
      { title: "Website Content | Universal Golden Homes Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContentPage,
});

type Row = { key: string; value: unknown };
type Draft = Record<string, unknown>;

const LABELS: Record<string, string> = {
  home: "Homepage",
  company: "Company details",
  about: "About page",
};

function get(draft: Draft, path: string) {
  return (draft[path] ?? "") as string;
}

function TextField({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {multiline ? (
        <Textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function PairListEditor({
  label,
  items,
  fields,
  onChange,
}: {
  label: string;
  items: Record<string, string>[];
  fields: [string, string][];
  onChange: (next: Record<string, string>[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...items, Object.fromEntries(fields.map(([k]) => [k, ""]))])}
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex flex-wrap items-end gap-2 rounded-lg border border-border p-3">
            {fields.map(([key, fieldLabel]) => (
              <div key={key} className="min-w-40 flex-1 space-y-1">
                <Label className="text-xs text-muted-foreground">{fieldLabel}</Label>
                <Input
                  value={item[key] ?? ""}
                  onChange={(event) => {
                    const next = [...items];
                    next[index] = { ...item, [key]: event.target.value };
                    onChange(next);
                  }}
                />
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionEditor({
  contentKey,
  value,
  saving,
  onSave,
}: {
  contentKey: string;
  value: Draft;
  saving: boolean;
  onSave: (key: string, value: unknown) => void;
}) {
  const [draft, setDraft] = useState<Draft>(value);
  const [raw, setRaw] = useState(false);
  const [rawText, setRawText] = useState(() => JSON.stringify(value, null, 2));

  useEffect(() => {
    setDraft(value);
    setRawText(JSON.stringify(value, null, 2));
  }, [value]);

  const set = (key: string, next: unknown) => setDraft((current) => ({ ...current, [key]: next }));

  function submit() {
    if (raw) {
      try {
        onSave(contentKey, JSON.parse(rawText));
      } catch {
        toast.error("Invalid JSON — check the syntax before saving.");
      }
      return;
    }
    onSave(contentKey, draft);
  }

  return (
    <div className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{LABELS[contentKey] ?? contentKey}</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setRaw((current) => !current)}>
            {raw ? "Form view" : "JSON view"}
          </Button>
          <Button size="sm" disabled={saving} onClick={submit}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      {raw ? (
        <Textarea
          rows={18}
          className="font-mono text-xs"
          value={rawText}
          onChange={(event) => setRawText(event.target.value)}
        />
      ) : contentKey === "home" ? (
        <div className="space-y-4">
          <TextField label="Hero heading" value={get(draft, "heroHeading")} onChange={(v) => set("heroHeading", v)} />
          <TextField
            label="Hero subheading"
            multiline
            value={get(draft, "heroSubheading")}
            onChange={(v) => set("heroSubheading", v)}
          />
          <TextField label="Hero image URL" value={get(draft, "heroImage")} onChange={(v) => set("heroImage", v)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Primary CTA" value={get(draft, "primaryCta")} onChange={(v) => set("primaryCta", v)} />
            <TextField
              label="Secondary CTA"
              value={get(draft, "secondaryCta")}
              onChange={(v) => set("secondaryCta", v)}
            />
          </div>
          <PairListEditor
            label="Stats"
            items={(draft["stats"] as Record<string, string>[]) ?? []}
            fields={[
              ["value", "Value"],
              ["label", "Label"],
            ]}
            onChange={(next) => set("stats", next)}
          />
          <PairListEditor
            label="Why choose us"
            items={(draft["whyChooseUs"] as Record<string, string>[]) ?? []}
            fields={[
              ["title", "Title"],
              ["body", "Body"],
            ]}
            onChange={(next) => set("whyChooseUs", next)}
          />
        </div>
      ) : contentKey === "company" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Company name" value={get(draft, "name")} onChange={(v) => set("name", v)} />
          <TextField label="Phone" value={get(draft, "phone")} onChange={(v) => set("phone", v)} />
          <TextField label="WhatsApp" value={get(draft, "whatsapp")} onChange={(v) => set("whatsapp", v)} />
          <TextField label="Email" value={get(draft, "email")} onChange={(v) => set("email", v)} />
          <TextField label="Address" value={get(draft, "address")} onChange={(v) => set("address", v)} />
          <TextField label="Opening hours" value={get(draft, "hours")} onChange={(v) => set("hours", v)} />
          <div className="sm:col-span-2">
            <TextField
              label="Google Maps embed URL"
              value={get(draft, "mapEmbed")}
              onChange={(v) => set("mapEmbed", v)}
            />
          </div>
        </div>
      ) : contentKey === "about" ? (
        <div className="space-y-4">
          <TextField label="Mission" multiline value={get(draft, "mission")} onChange={(v) => set("mission", v)} />
          <TextField label="Vision" multiline value={get(draft, "vision")} onChange={(v) => set("vision", v)} />
          <TextField label="Story" multiline value={get(draft, "story")} onChange={(v) => set("story", v)} />
          <PairListEditor
            label="Values"
            items={(draft["values"] as Record<string, string>[]) ?? []}
            fields={[
              ["title", "Title"],
              ["body", "Body"],
            ]}
            onChange={(next) => set("values", next)}
          />
          <PairListEditor
            label="Timeline"
            items={(draft["timeline"] as Record<string, string>[]) ?? []}
            fields={[
              ["year", "Year"],
              ["event", "Event"],
            ]}
            onChange={(next) => set("timeline", next)}
          />
        </div>
      ) : (
        <Textarea
          rows={14}
          className="font-mono text-xs"
          value={rawText}
          onChange={(event) => {
            setRawText(event.target.value);
            setRaw(true);
          }}
        />
      )}
    </div>
  );
}

function ContentManager() {
  const queryClient = useQueryClient();
  const fetchContent = useServerFn(listSiteContent);
  const persist = useServerFn(saveSiteContent);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-content"],
    queryFn: () => fetchContent() as Promise<Row[]>,
  });

  const saveMutation = useMutation({
    mutationFn: (input: { key: string; value: string }) => persist({ data: input }),
    onSuccess: () => {
      toast.success("Content updated — the website reflects it immediately.");
      void queryClient.invalidateQueries({ queryKey: ["admin-content"] });
    },
    onError: (error) => toast.error(error.message),
  });

  const ordered = [...(rows ?? [])].sort((a, b) => {
    const order = ["home", "company", "about"];
    const rank = (key: string) => (order.indexOf(key) === -1 ? order.length : order.indexOf(key));
    return rank(a.key) - rank(b.key) || a.key.localeCompare(b.key);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Website content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hero copy, company contact details and the about page — edited without touching code.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-5 py-12 text-center text-sm text-muted-foreground">
          No content sections found.
        </div>
      ) : (
        ordered.map((row) => (
          <SectionEditor
            key={row.key}
            contentKey={row.key}
            value={(row.value ?? {}) as Draft}
            saving={saveMutation.isPending}
            onSave={(key, value) => saveMutation.mutate({ key, value: JSON.stringify(value) })}
          />
        ))
      )}
    </div>
  );
}

function ContentPage() {
  return (
    <PermissionGate permission="content">
      <ContentManager />
    </PermissionGate>
  );
}
