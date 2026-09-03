import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, User } from "lucide-react";

import { LeadForm } from "@/components/site/LeadForm";
import { formatDate } from "@/lib/format";
import { getPost } from "@/lib/public.functions";

export const Route = createFileRoute("/_public/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Article not found | Universal Golden Homes" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = loaderData.meta_title || `${loaderData.title} | Universal Golden Homes`;
    const description = loaderData.meta_description || loaderData.excerpt || "";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const post = Route.useLoaderData();

  return (
    <>
      <section className="bg-gradient-navy pb-14 pt-32">
        <div className="container-luxe max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold">
            <ArrowLeft className="h-3.5 w-3.5" /> All Insights
          </Link>
          <p className="eyebrow mt-6">{post.category}</p>
          <h1 className="mt-3 font-display text-3xl font-semibold text-ivory sm:text-4xl">{post.title}</h1>
          <div className="mt-5 flex flex-wrap items-center gap-5 text-xs text-ivory/60">
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gold" /> {post.author}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-gold" /> {formatDate(post.published_at)}
            </span>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container-luxe grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <article>
            <img
              src={post.cover_image || "/images/blog-1.jpg"}
              alt={post.title}
              className="aspect-[16/9] w-full rounded-md object-cover shadow-card"
            />
            <p className="mt-8 text-base font-medium leading-relaxed text-foreground">{post.excerpt}</p>
            <div className="mt-6 space-y-5 text-sm leading-loose text-muted-foreground">
              {(post.content ?? "").split(/\n+/).filter(Boolean).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </article>

          <aside className="h-fit rounded-md border border-border bg-card p-6 shadow-card lg:sticky lg:top-28">
            <LeadForm source="blog" title="Talk to a Consultant" />
          </aside>
        </div>
      </section>
    </>
  );
}
