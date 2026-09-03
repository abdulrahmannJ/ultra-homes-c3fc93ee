import { Link } from "@tanstack/react-router";
import { Bath, BedDouble, Building2, MapPin, MessageCircle, Ruler } from "lucide-react";

import { formatPrice, statusLabel } from "@/lib/format";
import { whatsappLink } from "@/lib/site";
import type { Property, UnitSummary } from "@/lib/types";

type CardProperty = Property & { unit_summary?: UnitSummary | null };

function bedroomRange(summary: UnitSummary) {
  if (summary.min_bedrooms === null || summary.max_bedrooms === null) return null;
  if (summary.min_bedrooms === summary.max_bedrooms) return `${summary.min_bedrooms} Bed`;
  return `${summary.min_bedrooms}–${summary.max_bedrooms} Bed`;
}

export function PropertyCard({ property }: { property: CardProperty }) {
  const img = property.featured_image || property.images[0] || "/images/property-2.jpg";
  const summary = property.structure === "multi_unit" ? (property.unit_summary ?? null) : null;
  const multiUnit = Boolean(summary);

  const rentFirst = property.listing_purpose === "for_rent" || property.listing_type === "rent";
  const fromValue = summary
    ? rentFirst
      ? (summary.min_rent ?? summary.min_sale_price)
      : (summary.min_sale_price ?? summary.min_rent)
    : null;
  const fromIsRent = summary ? fromValue !== null && fromValue === summary.min_rent && rentFirst : false;

  const priceLabel = summary
    ? fromValue
      ? `From ${formatPrice(fromValue, property.currency, fromIsRent ? "rent" : "sale")}`
      : "Price on request"
    : formatPrice(property.price, property.currency, property.listing_type);

  const wa = whatsappLink(
    `Hello Universal Golden Homes, I'm interested in "${property.title}" (${priceLabel}). Please share more details.`,
  );

  return (
    <article className="group overflow-hidden rounded-md bg-card shadow-card hover-lift">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={img}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <span className="rounded-sm bg-navy-deep/85 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-ivory backdrop-blur">
            {multiUnit ? "Development" : statusLabel(property.status)}
          </span>
          {property.is_featured && (
            <span className="rounded-sm bg-gradient-gold px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider text-navy-deep">
              Featured
            </span>
          )}
        </div>
        <span className="absolute bottom-3 left-3 rounded-sm bg-gradient-gold px-3 py-1.5 font-display text-sm font-bold text-navy-deep">
          {priceLabel}
        </span>
      </div>

      <div className="p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 text-gold" />
          {[property.neighborhood, property.town].filter(Boolean).join(", ")}
        </p>
        <h3 className="mt-2 line-clamp-1 font-display text-lg font-semibold text-card-foreground">
          <Link
            to="/properties/$slug"
            params={{ slug: property.slug }}
            className="transition-colors hover:text-gold"
          >
            {property.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {property.short_description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs font-semibold text-muted-foreground">
          {summary ? (
            <>
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-gold" /> {summary.available_units} of{" "}
                {summary.unit_count} units available
              </span>
              {bedroomRange(summary) && (
                <span className="flex items-center gap-1.5">
                  <BedDouble className="h-4 w-4 text-gold" /> {bedroomRange(summary)}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <BedDouble className="h-4 w-4 text-gold" /> {property.bedrooms} Beds
              </span>
              <span className="flex items-center gap-1.5">
                <Bath className="h-4 w-4 text-gold" /> {property.bathrooms} Baths
              </span>
              {property.area_sqft && (
                <span className="flex items-center gap-1.5">
                  <Ruler className="h-4 w-4 text-gold" /> {property.area_sqft.toLocaleString()} sqft
                </span>
              )}
            </>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Link
            to="/properties/$slug"
            params={{ slug: property.slug }}
            className="flex-1 rounded-sm bg-navy px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wider text-ivory transition-colors hover:bg-navy-deep"
          >
            {multiUnit ? "View Units" : "View Details"}
          </Link>
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            aria-label="Ask on WhatsApp"
            className="flex items-center justify-center rounded-sm border border-gold px-3.5 text-gold transition-colors hover:bg-gold hover:text-navy-deep"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}
