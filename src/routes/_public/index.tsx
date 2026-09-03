import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Award, Handshake, KeyRound, ShieldCheck, Star } from "lucide-react";
import { useEffect, useState } from "react";

import { PropertyCard } from "@/components/site/PropertyCard";
import { SectionHeading } from "@/components/site/Section";
import { getHomeData } from "@/lib/public.functions";
import { PROPERTY_TYPES } from "@/lib/site";

export const Route = createFileRoute("/_public/")({
  loader: () => getHomeData(),
  head: () => ({
    meta: [
      { title: "Universal Golden Homes | Prime Residential Property in Kenya" },
      {
        name: "description",
        content:
          "Universal Golden Homes helps you find dream homes, luxury apartments and investment property across Nairobi and Kenya. Browse listings, book site visits.",
      },
      { property: "og:title", content: "Universal Golden Homes | Find Your Dream Home in Kenya" },
      {
        property: "og:description",
        content: "Luxury apartments, villas and townhouses across Nairobi. Trusted Kenyan real estate agency.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

const WHY_ICONS = [ShieldCheck, KeyRound, Handshake, Award];

function HomePage() {
  const { properties, testimonials, posts, home, company } = Route.useLoaderData();
  const navigate = useNavigate();
  const slides = ["/images/hero.jpg", ...properties.map((p) => p.featured_image).filter(Boolean)] as string[];
  const [slide, setSlide] = useState(0);
  const [search, setSearch] = useState({ location: "", type: "", bedrooms: "", maxPrice: "" });

  useEffect(() => {
    const t = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(t);
  }, [slides.length]);

  const why = home?.whyChooseUs?.length
    ? home.whyChooseUs
    : [
        { title: "Verified Listings", body: "Every property is physically inspected and legally vetted before listing." },
        { title: "End-to-End Support", body: "From search to keys — we handle negotiation, paperwork and handover." },
        { title: "Trusted Partners", body: "We work with Kenya's top developers, banks and law firms." },
        { title: "Award-Winning Team", body: "Recognized for excellence in customer service and sales." },
      ];

  const stats = home?.stats?.length
    ? home.stats
    : [
        { label: "Properties Sold", value: "850+" },
        { label: "Happy Clients", value: "1,200+" },
        { label: "Years Experience", value: "12" },
        { label: "Active Projects", value: "24" },
      ];

  return (
    <div>
      {/* HERO */}
      <section className="relative flex min-h-[96vh] items-center overflow-hidden bg-navy-deep">
        {slides.map((src, i) => (
          <img
            key={src}
            src={src}
            alt="Luxury home in Kenya"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-[2000ms] ${
              i === slide ? "opacity-45 animate-slow-zoom" : "opacity-0"
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-navy-deep/70 via-navy-deep/35 to-navy-deep" />
        <div className="pointer-events-none absolute -left-40 top-1/3 h-[36rem] w-[36rem] rounded-full bg-gold/15 blur-[140px]" />
        <div className="pointer-events-none absolute -right-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-gold/10 blur-[120px]" />

        <div className="container-luxe relative py-32">
          <div className="max-w-3xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-ivory/10 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-gold backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" />
              Universal Golden Homes · Kenya
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.03] text-ivory sm:text-6xl lg:text-[4.75rem]">
              {home?.heroHeading ?? (
                <>
                  Find Your <span className="text-gradient-gold">Dream Home</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ivory/70">
              {home?.heroSubheading ??
                "Discover luxury apartments, villas and family homes in Nairobi's most sought-after neighbourhoods."}
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                to="/properties"
                className="group inline-flex items-center gap-2 rounded-full bg-gradient-gold px-8 py-4 text-xs font-bold uppercase tracking-[0.16em] text-navy-deep shadow-luxe transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                {home?.primaryCta ?? "Explore Properties"}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="#featured"
                className="inline-flex items-center rounded-full border border-ivory/25 bg-ivory/5 px-8 py-4 text-xs font-bold uppercase tracking-[0.16em] text-ivory backdrop-blur transition-colors hover:border-gold hover:text-gold"
              >
                {home?.secondaryCta ?? "Featured Projects"}
              </a>
            </div>
          </div>

          {/* SEARCH */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const searchParams: { q?: string; type?: string; beds?: string; max?: string } = {};
              if (search.location) searchParams.q = search.location;
              if (search.type) searchParams.type = search.type;
              if (search.bedrooms) searchParams.beds = search.bedrooms;
              if (search.maxPrice) searchParams.max = search.maxPrice;
              navigate({ to: "/properties", search: searchParams });
            }}
            className="mt-14 rounded-2xl border border-ivory/15 bg-navy-deep/45 p-5 shadow-luxe backdrop-blur-xl"
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <input
                placeholder="Location (e.g. Karen, Westlands)"
                value={search.location}
                onChange={(e) => setSearch({ ...search, location: e.target.value })}
                className="rounded-xl border border-ivory/15 bg-ivory/5 px-4 py-3.5 text-sm text-ivory placeholder:text-ivory/40 transition-colors focus:border-gold focus:outline-none"
              />
              <select
                value={search.type}
                onChange={(e) => setSearch({ ...search, type: e.target.value })}
                className="rounded-xl border border-ivory/15 bg-ivory/5 px-4 py-3.5 text-sm text-ivory transition-colors focus:border-gold focus:outline-none"
              >
                <option value="">Property Type</option>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <select
                value={search.bedrooms}
                onChange={(e) => setSearch({ ...search, bedrooms: e.target.value })}
                className="rounded-xl border border-ivory/15 bg-ivory/5 px-4 py-3.5 text-sm text-ivory transition-colors focus:border-gold focus:outline-none"
              >
                <option value="">Bedrooms</option>
                {[1, 2, 3, 4, 5, 6].map((b) => (
                  <option key={b} value={b}>{b}+ Beds</option>
                ))}
              </select>
              <select
                value={search.maxPrice}
                onChange={(e) => setSearch({ ...search, maxPrice: e.target.value })}
                className="rounded-xl border border-ivory/15 bg-ivory/5 px-4 py-3.5 text-sm text-ivory transition-colors focus:border-gold focus:outline-none"
              >
                <option value="">Max Price</option>
                {[10, 25, 50, 100, 200].map((m) => (
                  <option key={m} value={m * 1_000_000}>KES {m}M</option>
                ))}
              </select>
              <button className="rounded-xl bg-gradient-gold px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-navy-deep transition-transform hover:scale-[1.02]">
                Search
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* STATS */}
      <section className="relative z-10 border-b border-border bg-card">
        <div className="container-luxe grid grid-cols-2 gap-8 py-14 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group relative text-center after:absolute after:inset-y-2 after:right-[-1rem] after:hidden after:w-px after:bg-border lg:after:block lg:last:after:hidden"
            >
              <p className="font-display text-4xl font-bold text-gradient-gold transition-transform group-hover:scale-105 sm:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>


      {/* FEATURED PROPERTIES */}
      <section id="featured" className="py-20">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="Handpicked For You"
            title="Featured Properties"
            body="A curated selection of our finest homes and investment opportunities across Kenya."
          />
          <div className="mt-12 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {properties.slice(0, 6).map((p) => (
              <PropertyCard key={p.id} property={p} />
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              to="/properties"
              className="inline-flex items-center gap-2 rounded-sm border border-navy px-8 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-navy transition-colors hover:bg-navy hover:text-ivory dark:border-gold dark:text-gold dark:hover:bg-gold dark:hover:text-navy-deep"
            >
              View All Properties <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="bg-gradient-navy py-20">
        <div className="container-luxe">
          <SectionHeading
            light
            eyebrow="Why Choose Us"
            title="The Universal Golden Homes Difference"
            body="We combine deep local knowledge with world-class service to make buying property in Kenya simple and secure."
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {why.map((w, i) => {
              const Icon = WHY_ICONS[i % WHY_ICONS.length] ?? ShieldCheck;
              return (
                <div
                  key={w.title}
                  className="rounded-md border border-ivory/10 bg-ivory/5 p-7 backdrop-blur transition-colors hover:border-gold/40"
                >
                  <Icon className="h-8 w-8 text-gold" />
                  <h3 className="mt-4 font-display text-lg font-semibold text-ivory">{w.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ivory/65">{w.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="py-20">
          <div className="container-luxe">
            <SectionHeading
              eyebrow="Client Stories"
              title="What Our Clients Say"
              body="Real reviews from families and investors we've helped find home."
            />
            <div className="mt-12 grid gap-7 md:grid-cols-3">
              {testimonials.slice(0, 3).map((t) => (
                <figure key={t.id} className="rounded-md bg-card p-7 shadow-card">
                  <div className="flex gap-1 text-gold">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <blockquote className="mt-4 text-sm leading-relaxed text-muted-foreground">
                    "{t.message}"
                  </blockquote>
                  <figcaption className="mt-5 flex items-center gap-3">
                    {t.photo_url && (
                      <img src={t.photo_url} alt={t.name} className="h-11 w-11 rounded-full object-cover" loading="lazy" />
                    )}
                    <div>
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* LATEST INSIGHTS */}
      {posts.length > 0 && (
        <section className="bg-secondary/50 py-20">
          <div className="container-luxe">
            <SectionHeading
              eyebrow="Insights"
              title="From Our Blog"
              body="Market trends, buying guides and neighbourhood spotlights."
            />
            <div className="mt-12 grid gap-7 md:grid-cols-3">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  to="/blog/$slug"
                  params={{ slug: post.slug }}
                  className="group overflow-hidden rounded-md bg-card shadow-card hover-lift"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    <img
                      src={post.cover_image ?? "/images/blog-1.jpg"}
                      alt={post.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-6">
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-gold">
                      {post.category}
                    </p>
                    <h3 className="mt-2 line-clamp-2 font-display text-lg font-semibold text-foreground group-hover:text-gold">
                      {post.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden bg-navy-deep py-20">
        <div className="container-luxe text-center">
          <h2 className="font-display text-3xl font-semibold text-ivory sm:text-4xl">
            Ready to find your dream home?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm text-ivory/65">
            Talk to our team today at {company?.phone ?? "+254 712 345 678"} — or browse the full
            catalogue and book a site visit online.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              to="/properties"
              className="rounded-sm bg-gradient-gold px-8 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-navy-deep transition-transform hover:scale-105"
            >
              Browse Properties
            </Link>
            <Link
              to="/contact"
              className="rounded-sm border border-ivory/30 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-ivory hover:border-gold hover:text-gold"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
