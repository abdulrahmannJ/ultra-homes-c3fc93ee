import { createFileRoute } from "@tanstack/react-router";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { LeadForm } from "@/components/site/LeadForm";
import { SectionHeading } from "@/components/site/Section";
import { getSiteContent } from "@/lib/public.functions";
import { whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/_public/contact")({
  loader: () => getSiteContent(),
  head: () => ({
    meta: [
      { title: "Contact Universal Golden Homes | Nairobi Property Office" },
      {
        name: "description",
        content:
          "Call, WhatsApp, email or visit the Universal Golden Homes office on Riverside Drive, Nairobi. Book a viewing or request a property valuation.",
      },
      { property: "og:title", content: "Contact Universal Golden Homes" },
      {
        property: "og:description",
        content: "Riverside Drive, Nairobi. Call +254 712 345 678 or send an enquiry online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { company } = Route.useLoaderData();

  const items = [
    { icon: Phone, label: "Phone", value: company?.phone, href: `tel:${company?.phone?.replace(/\s/g, "")}` },
    { icon: Mail, label: "Email", value: company?.email, href: `mailto:${company?.email}` },
    { icon: MapPin, label: "Office", value: company?.address },
    { icon: Clock, label: "Opening Hours", value: company?.hours },
  ];

  return (
    <>
      <section className="bg-gradient-navy pb-16 pt-32">
        <div className="container-luxe">
          <p className="eyebrow">Contact</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold text-ivory sm:text-5xl">
            Let's find the right address for you.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ivory/70">
            Tell us what you are looking for and a consultant will respond within one working day.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Reach Us" title="Universal Golden Homes" center={false} />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <div key={item.label} className="rounded-md border border-border bg-card p-5 shadow-card">
                  <item.icon className="h-5 w-5 text-gold" />
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {item.label}
                  </p>
                  {item.href ? (
                    <a href={item.href} className="mt-1 block text-sm text-card-foreground hover:text-gold">
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-1 text-sm text-card-foreground">{item.value}</p>
                  )}
                </div>
              ))}
            </div>

            <a
              href={whatsappLink("Hello Universal Golden Homes, I would like to speak to a consultant.", company?.whatsapp)}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-sm bg-gradient-gold px-6 py-3 text-xs font-bold uppercase tracking-wider text-navy-deep"
            >
              <MessageCircle className="h-4 w-4" /> Chat on WhatsApp
            </a>

            {company?.mapEmbed && (
              <div className="mt-8 overflow-hidden rounded-md border border-border shadow-card">
                <iframe
                  src={company.mapEmbed}
                  title="Universal Golden Homes office location"
                  loading="lazy"
                  className="h-72 w-full border-0"
                />
              </div>
            )}
          </div>

          <div className="h-fit rounded-md border border-border bg-card p-7 shadow-card">
            <LeadForm source="contact" title="Send Us a Message" />
          </div>
        </div>
      </section>
    </>
  );
}
