import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, User } from "lucide-react";

import { SectionHeading } from "@/components/site/Section";
import { formatDate } from "@/lib/format";
import { listPosts } from "@/lib/public.functions";

export const Route = createFileRoute("/_public/blog/")({
  loader: () => listPosts(),
  head: () => ({
    meta: [
      { title: "Property Insights & Market Reports | Universal Golden Homes Kenya" },
      {
        name: "description",
        content:
          "Kenyan real estate guides, Nairobi neighbourhood reports and mortgage advice from the Universal Golden Homes research team.",
      },
      { property: "og:title", content: "Universal Golden Homes Property Insights" },
      {
        property: "og:description",
        content: "Buying guides, market reports and finance advice for Kenyan property buyers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BlogPage,
});

function BlogPage() {
  const posts = Route.useLoaderData();

  return (
    <>
      <section className="bg-gradient-navy pb-16 pt-32">
        <div className="container-luxe">
          <p className="eyebrow">Insights</p>
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold text-ivory sm:text-5xl">
            Research, guides and honest market commentary.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ivory/70">
            Practical reading for buyers, investors and landlords in the Kenyan residential market.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe">
          <SectionHeading eyebrow="Latest Articles" title="From the Universal Golden Homes Desk" />

          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article key={post.id} className="overflow-hidden rounded-md bg-card shadow-card hover-lift">
                <Link to="/blog/$slug" params={{ slug: post.slug }} className="block aspect-[16/10] overflow-hidden">
                  <img
                    src={post.cover_image || "/images/blog-1.jpg"}
                    alt={post.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-110"
                  />
                </Link>
                <div className="p-6">
                  <p className="eyebrow">{post.category}</p>
                  <h2 className="mt-2 font-display text-lg font-semibold leading-snug text-card-foreground">
                    <Link
                      to="/blog/$slug"
                      params={{ slug: post.slug }}
                      className="transition-colors hover:text-gold"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                    {post.excerpt}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-gold" /> {post.author}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-gold" /> {formatDate(post.published_at)}
                    </span>
                  </div>
                  <Link
                    to="/blog/$slug"
                    params={{ slug: post.slug }}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold"
                  >
                    Read Article <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          {posts.length === 0 && (
            <p className="mt-12 text-center text-sm text-muted-foreground">No articles published yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
