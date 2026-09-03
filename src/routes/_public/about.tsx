import { createFileRoute } from "@tanstack/react-router";
import { Award, Compass, Heart, Target } from "lucide-react";

import { SectionHeading } from "@/components/site/Section";
import { getSiteContent } from "@/lib/public.functions";

export const Route = createFileRoute("/_public/about")({
  loader: () => getSiteContent(),
  head: () => ({
    meta: [
      { title: "About Universal Golden Homes | Kenyan Property Since 2008" },
      {
        name: "description",
        content:
          "Our story, mission and values. Universal Golden Homes has handled over 1,200 residential transactions across Nairobi, Kiambu, Machakos and the Kenyan coast since 2008.",
      },
      { property: "og:title", content: "About Universal Golden Homes" },
      {
        property: "og:description",
        content: "Verified titles, honest pricing and agents who answer the phone. Kenyan property since 2008.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const VALUE_ICONS = [Heart, Compass, Award];

function AboutPage() {
  const { about, company } = Route.useLoaderData();

  return (
    <>
      <section className="bg-gradient-navy pb-16 pt-32">
        <div className="container-luxe">
          <p className="eyebrow">About Us</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold text-ivory sm:text-5xl">
            A Kenyan property company built on verified titles and straight answers.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ivory/70">{about?.story}</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe grid gap-8 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-8 shadow-card">
            <Target className="h-8 w-8 text-gold" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-card-foreground">Our Mission</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{about?.mission}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-8 shadow-card">
            <Compass className="h-8 w-8 text-gold" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-card-foreground">Our Vision</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{about?.vision}</p>
          </div>
        </div>
      </section>

      <section className="bg-secondary py-20">
        <div className="container-luxe">
          <SectionHeading eyebrow="What We Stand For" title="Our Values" />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {(about?.values ?? []).map((value, i) => {
              const Icon = VALUE_ICONS[i % VALUE_ICONS.length] ?? VALUE_ICONS[0]!;
              return (
                <div key={value.title} className="rounded-md bg-card p-7 shadow-card hover-lift">
                  <Icon className="h-7 w-7 text-gold" />
                  <h3 className="mt-4 font-display text-lg font-semibold text-card-foreground">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe grid gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our Journey" title="Milestones" center={false} />
            <ol className="mt-8 space-y-6 border-l border-border pl-6">
              {(about?.timeline ?? []).map((item) => (
                <li key={item.year} className="relative">
                  <span className="absolute -left-[1.9rem] top-1 h-3 w-3 rounded-full bg-gradient-gold" />
                  <p className="font-display text-lg font-semibold text-gold">{item.year}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.event}</p>
                </li>
              ))}
            </ol>
          </div>

          <div>
            <SectionHeading eyebrow="Recognition" title="Awards" center={false} />
            <ul className="mt-8 space-y-4">
              {(about?.awards ?? []).map((award) => (
                <li
                  key={award}
                  className="flex items-start gap-3 rounded-md border border-border bg-card p-5 text-sm text-card-foreground shadow-card"
                >
                  <Award className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                  {award}
                </li>
              ))}
            </ul>
            <div className="mt-8 rounded-md bg-gradient-navy p-7 text-ivory">
              <p className="eyebrow">Visit Us</p>
              <p className="mt-3 text-sm text-ivory/80">{company?.address}</p>
              <p className="mt-1 text-sm text-ivory/60">{company?.hours}</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
