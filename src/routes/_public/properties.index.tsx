import { createFileRoute } from "@tanstack/react-router";
import { LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";

import { PropertyCard } from "@/components/site/PropertyCard";
import { formatPrice, statusLabel } from "@/lib/format";
import { listProperties } from "@/lib/public.functions";
import { PROPERTY_TYPES } from "@/lib/site";
import { Link } from "@tanstack/react-router";

type Search = { q?: string; type?: string; beds?: string; max?: string };

export const Route = createFileRoute("/_public/properties/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const out: Search = {};
    for (const key of ["q", "type", "beds", "max"] as const) {
      const value = s[key];
      if (typeof value === "string") out[key] = value;
    }
    return out;
  },
  loader: () => listProperties(),
  head: () => ({
    meta: [
      { title: "Properties for Sale & Rent in Kenya | Universal Golden Homes" },
      {
        name: "description",
        content:
          "Browse luxury apartments, villas, townhouses and land for sale or rent across Nairobi and Kenya. Filter by location, price, bedrooms and type.",
      },
      { property: "og:title", content: "Properties for Sale & Rent in Kenya | Universal Golden Homes" },
      { property: "og:description", content: "Luxury Kenyan property listings — apartments, villas, townhouses and land." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertiesPage,
});

const PER_PAGE = 9;

function PropertiesPage() {
  const all = Route.useLoaderData();
  const initial = Route.useSearch();
  const [filters, setFilters] = useState({
    q: initial.q ?? "",
    type: initial.type ?? "",
    beds: initial.beds ?? "",
    baths: "",
    status: "",
    max: initial.max ?? "",
    county: "",
    structure: "",
  });
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const counties = useMemo(
    () => [...new Set(all.map((p) => p.county).filter(Boolean))] as string[],
    [all],
  );

  const results = useMemo(() => {
    let list = all.filter((p) => {
      const isMulti = p.structure === "multi_unit";
      const summary = isMulti ? p.unit_summary : null;
      const hay = `${p.title} ${p.town ?? ""} ${p.neighborhood ?? ""} ${p.county ?? ""} ${p.address ?? ""}`.toLowerCase();
      if (filters.q && !hay.includes(filters.q.toLowerCase())) return false;
      if (filters.structure && (filters.structure === "multi_unit") !== isMulti) return false;
      if (filters.type && p.property_type !== filters.type) return false;
      if (filters.beds) {
        const beds = summary ? (summary.max_bedrooms ?? 0) : p.bedrooms;
        if (beds < Number(filters.beds)) return false;
      }
      if (filters.baths && !isMulti && p.bathrooms < Number(filters.baths)) return false;
      if (filters.status && !isMulti && p.status !== filters.status) return false;
      if (filters.county && p.county !== filters.county) return false;
      if (filters.max) {
        const lowest = summary
          ? [summary.min_rent, summary.min_sale_price].filter((v): v is number => typeof v === "number" && v > 0)
          : [];
        const price = summary ? (lowest.length ? Math.min(...lowest) : 0) : p.price;
        if (price > Number(filters.max)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "oldest") return a.created_at.localeCompare(b.created_at);
      return b.created_at.localeCompare(a.created_at);
    });
    return list;
  }, [all, filters, sort]);


  const pages = Math.max(1, Math.ceil(results.length / PER_PAGE));
  const shown = results.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const inputCls =
    "w-full rounded-sm border border-input bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-gold focus:outline-none";

  function setFilter(key: string, value: string) {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  }

  return (
    <div>
      <section className="bg-gradient-navy pb-14 pt-36">
        <div className="container-luxe">
          <p className="eyebrow">Our Catalogue</p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-ivory sm:text-5xl">
            Properties in Kenya
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ivory/65">
            {results.length} {results.length === 1 ? "property" : "properties"} matching your search.
          </p>
        </div>
      </section>

      <section className="container-luxe py-12">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="mb-4 flex items-center gap-2 rounded-sm border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider lg:hidden"
        >
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </button>

        <div className={`mb-8 grid gap-3 rounded-md bg-card p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 ${showFilters ? "grid" : "hidden lg:grid"}`}>
          <input placeholder="Keyword or location" value={filters.q} onChange={(e) => setFilter("q", e.target.value)} className={inputCls} />
          <select value={filters.structure} onChange={(e) => setFilter("structure", e.target.value)} className={inputCls} aria-label="Structure">
            <option value="">All Structures</option>
            <option value="standalone">Standalone</option>
            <option value="multi_unit">Multi Unit</option>
          </select>
          <select value={filters.county} onChange={(e) => setFilter("county", e.target.value)} className={inputCls}>
            <option value="">County</option>
            {counties.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filters.type} onChange={(e) => setFilter("type", e.target.value)} className={inputCls}>
            <option value="">Type</option>
            {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <select value={filters.beds} onChange={(e) => setFilter("beds", e.target.value)} className={inputCls}>
            <option value="">Bedrooms</option>
            {[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+</option>)}
          </select>
          <select value={filters.baths} onChange={(e) => setFilter("baths", e.target.value)} className={inputCls}>
            <option value="">Bathrooms</option>
            {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b}+</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className={inputCls}>
            <option value="">Status</option>
            {["available", "new", "reserved", "sold", "let"].map((s) => (
              <option key={s} value={s}>{statusLabel(s)}</option>
            ))}
          </select>
          <select value={filters.max} onChange={(e) => setFilter("max", e.target.value)} className={inputCls}>
            <option value="">Max Price</option>
            {[5, 10, 25, 50, 100, 200].map((m) => (
              <option key={m} value={m * 1_000_000}>KES {m}M</option>
            ))}
          </select>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${inputCls} w-auto`}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-desc">Highest Price</option>
            <option value="price-asc">Lowest Price</option>
          </select>
          <div className="flex gap-1 rounded-sm border border-border p-1">
            <button onClick={() => setView("grid")} aria-label="Grid view" className={`rounded-sm p-2 ${view === "grid" ? "bg-navy text-ivory" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button onClick={() => setView("list")} aria-label="List view" className={`rounded-sm p-2 ${view === "list" ? "bg-navy text-ivory" : "text-muted-foreground"}`}>
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-md bg-card p-16 text-center shadow-card">
            <p className="font-display text-xl text-foreground">No properties match your filters.</p>
            <p className="mt-2 text-sm text-muted-foreground">Try widening your search criteria.</p>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => <PropertyCard key={p.id} property={p} />)}
          </div>
        ) : (
          <div className="space-y-5">
            {shown.map((p) => (
              <article key={p.id} className="flex flex-col overflow-hidden rounded-md bg-card shadow-card sm:flex-row">
                <img src={p.featured_image ?? "/images/property-2.jpg"} alt={p.title} className="h-56 w-full object-cover sm:h-auto sm:w-72" loading="lazy" />
                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {p.neighborhood}, {p.town}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-semibold">
                        <Link to="/properties/$slug" params={{ slug: p.slug }} className="hover:text-gold">{p.title}</Link>
                      </h3>
                    </div>
                    <p className="font-display text-lg font-bold text-gradient-gold whitespace-nowrap">
                      {formatPrice(p.price, p.currency, p.listing_type)}
                    </p>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.short_description}</p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {p.bedrooms} Beds · {p.bathrooms} Baths · {p.area_sqft?.toLocaleString()} sqft · {statusLabel(p.status)}
                    </p>
                    <Link to="/properties/$slug" params={{ slug: p.slug }} className="rounded-sm bg-navy px-4 py-2 text-xs font-bold uppercase tracking-wider text-ivory hover:bg-navy-deep">
                      Details
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-10 w-10 rounded-sm text-sm font-bold ${page === i + 1 ? "bg-gradient-gold text-navy-deep" : "border border-border text-muted-foreground hover:border-gold"}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
