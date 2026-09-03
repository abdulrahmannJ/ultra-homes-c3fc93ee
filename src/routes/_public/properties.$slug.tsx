import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bath, BedDouble, Building2, Calendar, Car, Check, Copy, Download, Expand, Facebook,
  Hospital, MessageCircle, Phone, Ruler, School, ShoppingBag, Twitter, X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { LeadForm } from "@/components/site/LeadForm";
import { PropertyCard } from "@/components/site/PropertyCard";
import { formatDate, formatPrice, statusLabel } from "@/lib/format";
import { getProperty } from "@/lib/public.functions";
import { SITE, whatsappLink } from "@/lib/site";
import type { PublicUnit } from "@/lib/types";

export const Route = createFileRoute("/_public/properties/$slug")({
  loader: async ({ params }) => {
    const data = await getProperty({ data: { slug: params.slug } });
    if (!data.property) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const p = loaderData?.property;
    if (!p) return { meta: [{ title: "Property | Universal Golden Homes" }] };
    return {
      meta: [
        { title: `${p.title} | ${p.town ?? "Kenya"} | Universal Golden Homes` },
        { name: "description", content: (p.short_description ?? p.title).slice(0, 155) },
        { property: "og:title", content: `${p.title} | Universal Golden Homes` },
        { property: "og:description", content: p.short_description ?? p.title },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "RealEstateListing",
            name: p.title,
            description: p.short_description,
            url: `${SITE.url}/properties/${p.slug}`,
            image: p.featured_image ? `${SITE.url}${p.featured_image}` : undefined,
            offers: { "@type": "Offer", price: p.price, priceCurrency: p.currency },
          }),
        },
      ],
    };
  },
  component: PropertyDetailPage,
});

function MortgageCalculator({ price }: { price: number }) {
  const [deposit, setDeposit] = useState(Math.round(price * 0.1));
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(13);

  const monthly = useMemo(() => {
    const principal = Math.max(0, price - deposit);
    const r = rate / 100 / 12;
    const n = years * 12;
    if (!r) return principal / n;
    return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }, [price, deposit, years, rate]);

  const inputCls = "w-full rounded-sm border border-input bg-card px-3 py-2.5 text-sm focus:border-gold focus:outline-none";

  return (
    <div className="rounded-md bg-card p-6 shadow-card">
      <h3 className="font-display text-lg font-semibold">Mortgage Calculator</h3>
      <div className="mt-4 space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Deposit (KES)
          <input type="number" value={deposit} onChange={(e) => setDeposit(Number(e.target.value))} className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Period (years)
          <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} className={`${inputCls} mt-1`} />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Interest rate (%)
          <input type="number" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} className={`${inputCls} mt-1`} />
        </label>
      </div>
      <div className="mt-5 rounded-sm bg-navy-deep p-4 text-center">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold">Estimated Monthly</p>
        <p className="mt-1 font-display text-2xl font-bold text-ivory">{formatPrice(Math.round(monthly))}</p>
      </div>
    </div>
  );
}

function UnitCard({
  unit,
  slug,
  currency,
  propertyTitle,
  whatsapp,
}: {
  unit: PublicUnit;
  slug: string;
  currency: string;
  propertyTitle: string;
  whatsapp: string;
}) {
  const priceLabel = unit.monthly_rent
    ? formatPrice(unit.monthly_rent, currency, "rent")
    : unit.sale_price
      ? formatPrice(unit.sale_price, currency, "sale")
      : "Price on request";
  const wa = whatsappLink(
    `Hello Universal Golden Homes, I'd like to enquire about unit ${unit.label} at "${propertyTitle}" (${priceLabel}): ${SITE.url}/properties/${slug}/units/${unit.id}`,
    whatsapp,
  );

  return (
    <article className="overflow-hidden rounded-md bg-card shadow-card">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={unit.cover_image ?? unit.images[0] ?? "/images/property-2.jpg"}
          alt={`${unit.label} at ${propertyTitle}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <span className="absolute left-3 top-3 rounded-sm bg-navy-deep/85 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-ivory backdrop-blur">
          {statusLabel(unit.status)}
        </span>
        <span className="absolute bottom-3 left-3 rounded-sm bg-gradient-gold px-3 py-1.5 font-display text-sm font-bold text-navy-deep">
          {priceLabel}
        </span>
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold">
          <Link
            to="/properties/$slug/units/$unitId"
            params={{ slug, unitId: unit.id }}
            className="transition-colors hover:text-gold"
          >
            {unit.label}
          </Link>
        </h3>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {[unit.unit_type, unit.block ? `Block ${unit.block}` : null, unit.floor ? `Floor ${unit.floor}` : null]
            .filter(Boolean)
            .join(" · ") || "Unit"}
        </p>
        <div className="mt-4 flex flex-wrap gap-4 border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-gold" /> {unit.bedrooms} Bed</span>
          <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-gold" /> {unit.bathrooms} Bath</span>
          <span className="flex items-center gap-1.5"><Bath className="h-4 w-4 text-gold" /> {unit.toilets} Toilets</span>
          {unit.size_sqm ? (
            <span className="flex items-center gap-1.5"><Ruler className="h-4 w-4 text-gold" /> {unit.size_sqm} sqm</span>
          ) : null}
        </div>
        {unit.monthly_rent > 0 && unit.sale_price ? (
          <p className="mt-3 text-xs text-muted-foreground">
            Also for sale at {formatPrice(unit.sale_price, currency, "sale")}
          </p>
        ) : null}
        <div className="mt-4 flex gap-2">
          <Link
            to="/properties/$slug/units/$unitId"
            params={{ slug, unitId: unit.id }}
            className="flex-1 rounded-sm bg-navy px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-ivory transition-colors hover:bg-navy-deep"
          >
            View Unit
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label={`Enquire about ${unit.label} on WhatsApp`}
            className="flex items-center justify-center rounded-sm border border-gold px-3.5 text-gold transition-colors hover:bg-gold hover:text-navy-deep"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

function PropertyDetailPage() {
  const { property: p, related, agents, units } = Route.useLoaderData();
  const agent = agents[0];
  const multiUnit = p.structure === "multi_unit";
  const summary = multiUnit ? p.unit_summary : null;
  const images = p.images.length ? p.images : [p.featured_image ?? "/images/property-2.jpg"];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [copied, setCopied] = useState(false);

  const rentFirst = p.listing_purpose === "for_rent" || p.listing_type === "rent";
  const fromValue = summary
    ? rentFirst
      ? (summary.min_rent ?? summary.min_sale_price)
      : (summary.min_sale_price ?? summary.min_rent)
    : null;
  const fromIsRent = summary ? fromValue !== null && fromValue === summary.min_rent && rentFirst : false;
  const headlinePrice = multiUnit
    ? fromValue
      ? `From ${formatPrice(fromValue, p.currency, fromIsRent ? "rent" : "sale")}`
      : "Price on request"
    : formatPrice(p.price, p.currency, p.listing_type);

  const pageUrl = `${SITE.url}/properties/${p.slug}`;
  const wa = whatsappLink(
    `Hello Universal Golden Homes, I'm interested in "${p.title}" (${headlinePrice}). Please share more details: ${pageUrl}`,
    agent?.whatsapp ?? SITE.whatsapp,
  );
  const bookWa = whatsappLink(
    `Hello Universal Golden Homes, I'd like to book a site visit for "${p.title}": ${pageUrl}`,
    agent?.whatsapp ?? SITE.whatsapp,
  );

  const facts = [
    { icon: BedDouble, label: "Bedrooms", value: p.bedrooms },
    { icon: Bath, label: "Bathrooms", value: p.bathrooms },
    { icon: Car, label: "Garage", value: p.garage },
    { icon: Ruler, label: "Floor Area", value: p.area_sqft ? `${p.area_sqft.toLocaleString()} sqft` : "—" },
    { icon: Building2, label: "Type", value: p.property_type },
    { icon: Calendar, label: "Completion", value: p.completion_date ? formatDate(p.completion_date) : (p.construction_status ?? "Ready") },
  ];

  const developmentFacts = [
    { icon: Building2, label: "Total Units", value: summary?.unit_count ?? units.length },
    { icon: Check, label: "Available", value: summary?.available_units ?? 0 },
    {
      icon: BedDouble,
      label: "Bedrooms",
      value:
        summary && summary.min_bedrooms !== null && summary.max_bedrooms !== null
          ? summary.min_bedrooms === summary.max_bedrooms
            ? `${summary.min_bedrooms}`
            : `${summary.min_bedrooms}–${summary.max_bedrooms}`
          : "—",
    },
    { icon: Building2, label: "Type", value: p.property_type },
    { icon: Calendar, label: "Completion", value: p.completion_date ? formatDate(p.completion_date) : (p.construction_status ?? "Ready") },
  ];

  const embedMap = p.latitude && p.longitude
    ? `https://maps.google.com/maps?q=${p.latitude},${p.longitude}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(`${p.neighborhood ?? ""} ${p.town ?? ""} Kenya`)}&z=13&output=embed`;


  return (
    <div className="pt-18">
      {/* GALLERY */}
      <section className="bg-navy-deep py-24">
        <div className="container-luxe">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">
                {multiUnit
                  ? `${p.property_type} · Development · ${summary?.unit_count ?? units.length} units`
                  : `${p.property_type} · ${statusLabel(p.status)} · For ${p.listing_type === "rent" ? "Rent" : "Sale"}`}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-ivory sm:text-5xl">{p.title}</h1>
              <p className="mt-2 text-sm text-ivory/60">{[p.address, p.neighborhood, p.town, p.county].filter(Boolean).join(", ")}</p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-gradient-gold sm:text-4xl">
                {headlinePrice}
              </p>
              {multiUnit ? (
                <p className="text-sm text-ivory/60">
                  {summary?.available_units ?? 0} of {summary?.unit_count ?? units.length} units available
                </p>
              ) : (
                p.discount_price && (
                  <p className="text-sm text-ivory/50 line-through">{formatPrice(p.discount_price, p.currency, p.listing_type)}</p>
                )
              )}
            </div>

          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <button onClick={() => setLightbox(true)} className="group relative aspect-[16/10] overflow-hidden rounded-md lg:col-span-2">
              <img src={images[active]} alt={p.title} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <span className="absolute bottom-4 right-4 flex items-center gap-2 rounded-sm bg-navy-deep/80 px-3 py-2 text-xs font-bold uppercase tracking-wider text-ivory backdrop-blur">
                <Expand className="h-4 w-4 text-gold" /> View Gallery ({images.length})
              </span>
            </button>
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {images.slice(0, 3).map((img, i) => (
                <button key={img + i} onClick={() => setActive(i)} className={`overflow-hidden rounded-md border-2 ${i === active ? "border-gold" : "border-transparent"}`}>
                  <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* LIGHTBOX */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-navy-deep/97 backdrop-blur">
          <button onClick={() => setLightbox(false)} aria-label="Close gallery" className="absolute right-6 top-6 text-ivory hover:text-gold">
            <X className="h-8 w-8" />
          </button>
          <div className="flex flex-1 items-center justify-center p-6">
            <img src={images[active]} alt={p.title} className="max-h-[75vh] max-w-full rounded-md object-contain" />
          </div>
          <div className="flex justify-center gap-2 overflow-x-auto p-6">
            {images.map((img, i) => (
              <button key={img + i} onClick={() => setActive(i)} className={`h-16 w-24 shrink-0 overflow-hidden rounded-sm border-2 ${i === active ? "border-gold" : "border-transparent opacity-60"}`}>
                <img src={img} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <section className="container-luxe grid gap-10 py-14 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          {/* FACTS */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {(multiUnit ? developmentFacts : facts).map((f) => (
              <div key={f.label} className="rounded-md bg-card p-5 text-center shadow-card">
                <f.icon className="mx-auto h-6 w-6 text-gold" />
                <p className="mt-2 font-display text-lg font-semibold">{f.value}</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </div>

          {/* AVAILABLE UNITS */}
          {multiUnit && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Available Units</h2>
              {units.length === 0 ? (
                <p className="mt-4 rounded-md bg-card p-6 text-sm text-muted-foreground shadow-card">
                  Units for this development are being finalised. Contact us for the latest availability.
                </p>
              ) : (
                <div className="mt-5 grid gap-5 sm:grid-cols-2">
                  {units.map((u) => (
                    <UnitCard
                      key={u.id}
                      unit={u}
                      slug={p.slug}
                      currency={p.currency}
                      propertyTitle={p.title}
                      whatsapp={agent?.whatsapp ?? SITE.whatsapp}
                    />
                  ))}
                </div>
              )}
            </div>
          )}


          {/* DESCRIPTION */}
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {multiUnit ? "About This Development" : "About This Property"}
            </h2>

            <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {p.description ?? p.short_description}
            </div>
            {p.payment_plan && (
              <p className="mt-4 rounded-sm border-l-2 border-gold bg-card p-4 text-sm shadow-card">
                <span className="font-bold">Payment plan:</span> {p.payment_plan}
              </p>
            )}
          </div>

          {/* VIDEO */}
          {p.youtube_url && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Video Tour</h2>
              <div className="mt-4 aspect-video overflow-hidden rounded-md shadow-card">
                <iframe src={p.youtube_url.replace("watch?v=", "embed/")} title="Video tour" className="h-full w-full" allowFullScreen loading="lazy" />
              </div>
            </div>
          )}

          {/* AMENITIES */}
          {p.amenities.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Amenities</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-2 rounded-sm bg-card px-4 py-3 text-sm shadow-card">
                    <Check className="h-4 w-4 text-gold" /> {a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* NEARBY */}
          {(p.nearby_schools.length > 0 || p.nearby_hospitals.length > 0 || p.nearby_shopping.length > 0) && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Nearby Places</h2>
              <div className="mt-4 grid gap-6 sm:grid-cols-3">
                {[
                  { icon: School, title: "Schools", items: p.nearby_schools },
                  { icon: Hospital, title: "Hospitals", items: p.nearby_hospitals },
                  { icon: ShoppingBag, title: "Shopping", items: p.nearby_shopping },
                ].map((g) =>
                  g.items.length > 0 ? (
                    <div key={g.title} className="rounded-md bg-card p-5 shadow-card">
                      <g.icon className="h-5 w-5 text-gold" />
                      <h3 className="mt-2 text-sm font-bold">{g.title}</h3>
                      <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                        {g.items.map((i) => <li key={i}>· {i}</li>)}
                      </ul>
                    </div>
                  ) : null,
                )}
              </div>
            </div>
          )}

          {/* MAP */}
          <div>
            <h2 className="font-display text-2xl font-semibold">Location</h2>
            <div className="mt-4 aspect-[16/8] overflow-hidden rounded-md shadow-card">
              <iframe src={embedMap} title="Property location map" className="h-full w-full border-0" loading="lazy" />
            </div>
          </div>

          {/* DOWNLOADS + SHARE */}
          <div className="flex flex-wrap gap-3">
            {p.brochure_url && (
              <a href={p.brochure_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:border-gold">
                <Download className="h-4 w-4 text-gold" /> Brochure
              </a>
            )}
            {p.floor_plan_url && (
              <a href={p.floor_plan_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-sm border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:border-gold">
                <Download className="h-4 w-4 text-gold" /> Floor Plan
              </a>
            )}
            <span className="mx-2 hidden border-l border-border sm:block" />
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`} target="_blank" rel="noreferrer" aria-label="Share on Facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-gold hover:text-gold"><Facebook className="h-4 w-4" /></a>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(p.title)}`} target="_blank" rel="noreferrer" aria-label="Share on X" className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-gold hover:text-gold"><Twitter className="h-4 w-4" /></a>
            <a href={wa} target="_blank" rel="noreferrer" aria-label="Share on WhatsApp" className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-gold hover:text-gold"><MessageCircle className="h-4 w-4" /></a>
            <button
              onClick={() => { navigator.clipboard.writeText(window.location.href); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              aria-label="Copy link"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border hover:border-gold hover:text-gold"
            >
              {copied ? <Check className="h-4 w-4 text-gold" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {agent && (
            <div className="rounded-md bg-card p-6 text-center shadow-card">
              <img src={agent.photo_url ?? "/images/agent-1.jpg"} alt={agent.name} className="mx-auto h-20 w-20 rounded-full border-2 border-gold object-cover" />
              <h3 className="mt-3 font-display text-lg font-semibold">{agent.name}</h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{agent.title}</p>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <a href={`tel:${agent.phone ?? SITE.phone}`} className="flex items-center justify-center gap-2 rounded-sm bg-navy px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-ivory hover:bg-navy-deep">
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
                <a href={wa} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-sm bg-[#25D366] px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
              </div>
              <a href={bookWa} target="_blank" rel="noreferrer" className="mt-2 block rounded-sm bg-gradient-gold px-3 py-3 text-xs font-bold uppercase tracking-[0.14em] text-navy-deep transition-transform hover:scale-[1.02]">
                Book a Site Visit
              </a>
            </div>
          )}
          <div className="rounded-md bg-gradient-navy p-6 shadow-luxe">
            <LeadForm dark source="property-inquiry" propertyId={p.id} title="Inquire About This Property" />
          </div>
          {!multiUnit && <MortgageCalculator price={p.discount_price ?? p.price} />}
        </aside>
      </section>

      {/* RELATED */}
      {related.length > 0 && (
        <section className="bg-secondary/50 py-16">
          <div className="container-luxe">
            <h2 className="text-center font-display text-3xl font-semibold">Similar Properties</h2>
            <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => <PropertyCard key={r.id} property={r} />)}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
