import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import {
  Bath, BedDouble, Building2, Car, Check, ChevronLeft, MapPin, MessageCircle, Phone, Ruler,
} from "lucide-react";
import { useState } from "react";

import { LeadForm } from "@/components/site/LeadForm";
import { formatPrice, statusLabel } from "@/lib/format";
import { getPublicUnit } from "@/lib/public.functions";
import { SITE, whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/_public/properties_/$slug/units/$unitId")({
  loader: async ({ params }) => {
    const data = await getPublicUnit({ data: { slug: params.slug, unitId: params.unitId } });
    if (!data.property || !data.unit) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    if (!loaderData?.unit || !loaderData.property) {
      return {
        meta: [
          { title: "Unit unavailable | Universal Golden Homes" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const { unit, property } = loaderData;
    const title = `${unit.label} · ${property.title} | Universal Golden Homes`;
    const description = (
      unit.description ??
      `${unit.bedrooms} bedroom ${unit.unit_type ?? "unit"} at ${property.title}, ${[property.neighborhood, property.town].filter(Boolean).join(", ")}.`
    ).slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: UnitDetailPage,
});

function UnitDetailPage() {
  const { property, unit, agents } = Route.useLoaderData();
  const agent = agents[0];
  const images = unit.images.length
    ? unit.images
    : [unit.cover_image ?? property.featured_image ?? "/images/property-2.jpg"];
  const [active, setActive] = useState(0);

  const pageUrl = `${SITE.url}/properties/${property.slug}/units/${unit.id}`;
  const priceLabel = unit.monthly_rent
    ? formatPrice(unit.monthly_rent, property.currency, "rent")
    : unit.sale_price
      ? formatPrice(unit.sale_price, property.currency, "sale")
      : "Price on request";

  const wa = whatsappLink(
    `Hello Universal Golden Homes, I'd like to enquire about unit ${unit.label} at "${property.title}" (${priceLabel}): ${pageUrl}`,
    agent?.whatsapp ?? SITE.whatsapp,
  );

  const specs = [
    { icon: BedDouble, label: "Bedrooms", value: unit.bedrooms },
    { icon: Bath, label: "Bathrooms", value: unit.bathrooms },
    { icon: Bath, label: "Toilets", value: unit.toilets },
    { icon: Ruler, label: "Size", value: unit.size_sqm ? `${unit.size_sqm} sqm` : "—" },
    { icon: Car, label: "Parking", value: unit.parking_spaces },
    { icon: Building2, label: "Type", value: unit.unit_type ?? property.property_type },
  ];

  return (
    <div className="pt-18">
      <section className="bg-navy-deep py-24">
        <div className="container-luxe">
          <Link
            to="/properties/$slug"
            params={{ slug: property.slug }}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-gold hover:text-ivory"
          >
            <ChevronLeft className="h-4 w-4" /> Back to {property.title}
          </Link>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">
                {unit.unit_type ?? "Unit"} · {statusLabel(unit.status)}
                {unit.block ? ` · Block ${unit.block}` : ""}
                {unit.floor ? ` · Floor ${unit.floor}` : ""}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold text-ivory sm:text-5xl">
                {unit.label}
              </h1>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-ivory/60">
                <MapPin className="h-4 w-4 text-gold" />
                {[property.neighborhood, property.town, property.county].filter(Boolean).join(", ")}
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-gradient-gold sm:text-4xl">
                {priceLabel}
              </p>
              {unit.monthly_rent > 0 && unit.sale_price ? (
                <p className="text-sm text-ivory/60">
                  Also for sale at {formatPrice(unit.sale_price, property.currency, "sale")}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-3">
            <div className="aspect-[16/10] overflow-hidden rounded-md lg:col-span-2">
              <img src={images[active]} alt={`${unit.label} at ${property.title}`} className="h-full w-full object-cover" />
            </div>
            <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
              {images.slice(0, 3).map((img, i) => (
                <button
                  key={img + i}
                  onClick={() => setActive(i)}
                  className={`overflow-hidden rounded-md border-2 ${i === active ? "border-gold" : "border-transparent"}`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-luxe grid gap-10 py-14 lg:grid-cols-3">
        <div className="space-y-10 lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {specs.map((s) => (
              <div key={s.label} className="rounded-md bg-card p-5 text-center shadow-card">
                <s.icon className="mx-auto h-6 w-6 text-gold" />
                <p className="mt-2 font-display text-lg font-semibold">{s.value}</p>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="font-display text-2xl font-semibold">About This Unit</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {unit.description ??
                `${unit.label} is a ${unit.bedrooms} bedroom ${unit.unit_type ?? "unit"} within ${property.title}.`}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <p className="rounded-sm bg-card p-4 text-sm shadow-card">
                <span className="font-bold">Availability:</span> {statusLabel(unit.status)}
              </p>
              <p className="rounded-sm bg-card p-4 text-sm shadow-card">
                <span className="font-bold">Furnished:</span> {unit.furnished ? "Yes" : "No"}
              </p>
              {unit.deposit > 0 && (
                <p className="rounded-sm bg-card p-4 text-sm shadow-card">
                  <span className="font-bold">Deposit:</span>{" "}
                  {formatPrice(unit.deposit, property.currency, "sale")}
                </p>
              )}
              {unit.service_charge > 0 && (
                <p className="rounded-sm bg-card p-4 text-sm shadow-card">
                  <span className="font-bold">Service charge:</span>{" "}
                  {formatPrice(unit.service_charge, property.currency, "rent")}
                </p>
              )}
            </div>
          </div>

          {unit.amenities.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-semibold">Unit Amenities</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {unit.amenities.map((a) => (
                  <span key={a} className="flex items-center gap-2 rounded-sm bg-card px-4 py-3 text-sm shadow-card">
                    <Check className="h-4 w-4 text-gold" /> {a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-md bg-card p-6 text-center shadow-card">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              Enquire about {unit.label}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={`tel:${agent?.phone ?? SITE.phone}`}
                className="flex items-center justify-center gap-2 rounded-sm bg-navy px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-ivory hover:bg-navy-deep"
              >
                <Phone className="h-3.5 w-3.5" /> Call
              </a>
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-sm bg-[#25D366] px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:opacity-90"
              >
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
            </div>
          </div>
          <div className="rounded-md bg-gradient-navy p-6 shadow-luxe">
            <LeadForm
              dark
              source="unit-inquiry"
              propertyId={property.id}
              title={`Enquire — ${unit.label}`}
            />
          </div>
        </aside>
      </section>
    </div>
  );
}
