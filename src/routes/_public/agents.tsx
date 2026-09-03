import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageCircle, Phone } from "lucide-react";

import { SectionHeading } from "@/components/site/Section";
import { listAgents } from "@/lib/public.functions";
import { whatsappLink } from "@/lib/site";

export const Route = createFileRoute("/_public/agents")({
  loader: () => listAgents(),
  head: () => ({
    meta: [
      { title: "Meet Our Agents | Universal Golden Homes Kenya" },
      {
        name: "description",
        content:
          "Speak directly to the Universal Golden Homes property consultants covering Nairobi, Karen, Runda, Westlands, Kiambu and the Kenyan coast.",
      },
      { property: "og:title", content: "Meet the Universal Golden Homes Property Team" },
      {
        property: "og:description",
        content: "Experienced Kenyan property consultants for sales, off-plan and executive lettings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsPage,
});

function AgentsPage() {
  const agents = Route.useLoaderData();

  return (
    <>
      <section className="bg-gradient-navy pb-16 pt-32">
        <div className="container-luxe">
          <p className="eyebrow">Our Team</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold text-ivory sm:text-5xl">
            The people who will actually pick up the phone.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ivory/70">
            Every Universal Golden Homes consultant is licensed, area-specialised and accountable for your
            transaction from the first viewing to the title transfer.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe">
          <SectionHeading
            eyebrow="Property Consultants"
            title="Talk to a Specialist"
            body="Choose the consultant closest to the area or service you need."
          />

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <article key={agent.id} className="overflow-hidden rounded-md bg-card shadow-card hover-lift">
                <div className="aspect-[4/5] overflow-hidden bg-secondary">
                  <img
                    src={agent.photo_url || "/images/agent-1.jpg"}
                    alt={`${agent.name}, ${agent.title ?? "property consultant"} at Universal Golden Homes`}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-6">
                  <h2 className="font-display text-xl font-semibold text-card-foreground">{agent.name}</h2>
                  <p className="eyebrow mt-1">{agent.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{agent.bio}</p>

                  <div className="mt-5 space-y-2 border-t border-border pt-5 text-sm text-muted-foreground">
                    {agent.phone && (
                      <a href={`tel:${agent.phone}`} className="flex items-center gap-2 hover:text-gold">
                        <Phone className="h-4 w-4 text-gold" /> {agent.phone}
                      </a>
                    )}
                    {agent.email && (
                      <a href={`mailto:${agent.email}`} className="flex items-center gap-2 hover:text-gold">
                        <Mail className="h-4 w-4 text-gold" /> {agent.email}
                      </a>
                    )}
                  </div>

                  {agent.whatsapp && (
                    <a
                      href={whatsappLink(
                        `Hello ${agent.name}, I would like to speak to you about a property.`,
                        agent.whatsapp,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 flex items-center justify-center gap-2 rounded-sm bg-navy px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-ivory transition-colors hover:bg-navy-deep"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp {agent.name.split(" ")[0]}
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
