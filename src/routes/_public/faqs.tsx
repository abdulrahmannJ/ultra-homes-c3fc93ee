import { Link, createFileRoute } from "@tanstack/react-router";

import { SectionHeading } from "@/components/site/Section";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_GROUPS = [
  {
    group: "Buying Property",
    items: [
      {
        q: "How do I confirm a title deed is genuine in Kenya?",
        a: "Every Universal Golden Homes listing is search-verified at the relevant Lands Registry before we market it. Once you express interest we share the official search result, the deed plan and the seller's identification so your advocate can carry out an independent confirmation.",
      },
      {
        q: "What deposit do I need to reserve a home?",
        a: "Reservation deposits usually range from KES 200,000 to 10% of the purchase price depending on the development. The deposit is held in the advocate's client account and is credited against the purchase price on completion.",
      },
      {
        q: "Can I buy property in Kenya as a diaspora or foreign buyer?",
        a: "Yes. Kenyan citizens abroad can buy freehold or leasehold property. Non-citizens may hold leasehold interests of up to 99 years. We handle virtual viewings, power of attorney documentation and remote signing for buyers outside the country.",
      },
    ],
  },
  {
    group: "Costs & Finance",
    items: [
      {
        q: "What extra costs should I budget for?",
        a: "Plan for stamp duty (4% in municipalities, 2% outside), legal fees of roughly 1–1.5%, Lands Registry search and registration fees, and valuation costs where a mortgage is involved.",
      },
      {
        q: "Do you assist with mortgage applications?",
        a: "We work with KCB, Absa, Stanbic, NCBA and HF Group. Our finance desk prepares your income pack, compares indicative offers and follows the application through to letter of offer at no additional charge.",
      },
      {
        q: "Are off-plan payment plans available?",
        a: "Most of our off-plan developments offer 12 to 36 month instalment plans with an initial deposit of 10–20%. Payment schedules are milestone-based and written into the sale agreement.",
      },
    ],
  },
  {
    group: "Selling & Letting",
    items: [
      {
        q: "How long does a sale usually take?",
        a: "A cash transaction typically completes within 45 to 60 days. Mortgage-financed sales average 90 days, largely driven by bank valuation and Lands Registry turnaround.",
      },
      {
        q: "What commission does Universal Golden Homes charge?",
        a: "Sales are charged at a standard market rate agreed in writing before instruction. Letting and full property management are quoted separately based on the portfolio size.",
      },
      {
        q: "Do you manage rental properties?",
        a: "Yes. Universal Golden Homes Property Management handles tenant vetting, rent collection, statutory compliance, maintenance coordination and monthly owner statements.",
      },
    ],
  },
];

export const Route = createFileRoute("/_public/faqs")({
  head: () => {
    const faqLd = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_GROUPS.flatMap((g) =>
        g.items.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: { "@type": "Answer", text: item.a },
        })),
      ),
    };

    return {
      meta: [
        { title: "Property FAQs | Buying & Selling in Kenya | Universal Golden Homes" },
        {
          name: "description",
          content:
            "Answers on title deed verification, stamp duty, mortgages, off-plan payment plans and letting fees for property buyers and owners in Kenya.",
        },
        { property: "og:title", content: "Kenyan Property FAQs | Universal Golden Homes" },
        {
          property: "og:description",
          content: "Title verification, transaction costs, mortgages and off-plan payment plans explained.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(faqLd) }],
    };
  },
  component: FaqsPage,
});

function FaqsPage() {
  return (
    <>
      <section className="bg-gradient-navy pb-16 pt-32">
        <div className="container-luxe">
          <p className="eyebrow">Help Centre</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold text-ivory sm:text-5xl">
            Frequently asked questions.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ivory/70">
            The questions our consultants answer every week, written out plainly.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe max-w-3xl space-y-14">
          {FAQ_GROUPS.map((group) => (
            <div key={group.group}>
              <SectionHeading eyebrow="Questions" title={group.group} center={false} />
              <Accordion type="single" collapsible className="mt-6">
                {group.items.map((item) => (
                  <AccordionItem key={item.q} value={item.q}>
                    <AccordionTrigger className="text-left font-display text-base font-semibold">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}

          <div className="rounded-md bg-gradient-navy p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-ivory">Still have a question?</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-ivory/70">
              Our consultants respond to every enquiry within one working day.
            </p>
            <Link
              to="/contact"
              className="mt-6 inline-flex rounded-sm bg-gradient-gold px-7 py-3 text-xs font-bold uppercase tracking-wider text-navy-deep"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
