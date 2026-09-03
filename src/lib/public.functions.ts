import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type {
  AboutContent,
  Agent,
  BlogPost,
  CompanyContent,
  HomeContent,
  Property,
  PropertyListing,
  PublicUnit,
  Testimonial,
} from "./types";


export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./public-data.server");
  const supabase = publicClient();

  const [properties, testimonials, posts, content] = await Promise.all([
    supabase
      .from("properties")
      .select("*")
      .eq("is_published", true)
      .eq("is_archived", false)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(6),
    supabase.from("testimonials").select("*").eq("is_approved", true).limit(6),
    supabase.from("blog_posts").select("*").eq("is_published", true).limit(3),
    supabase.from("site_content").select("*"),
  ]);

  const byKey = Object.fromEntries((content.data ?? []).map((row) => [row.key, row.value]));
  const { withSignedImages } = await import("./storage.server");
  const { attachUnitSummaries } = await import("./public-units.server");

  return {
    properties: await attachUnitSummaries(
      supabase,
      (await withSignedImages((properties.data ?? []) as Property[])) as Property[],
    ),
    testimonials: (testimonials.data ?? []) as Testimonial[],
    posts: (posts.data ?? []) as BlogPost[],
    home: byKey["home"] as HomeContent,
    company: byKey["company"] as CompanyContent,
  };
});

export const getSiteContent = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./public-data.server");
  const { data } = await publicClient().from("site_content").select("*");
  const byKey = Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
  return {
    home: byKey["home"] as HomeContent,
    company: byKey["company"] as CompanyContent,
    about: byKey["about"] as AboutContent,
  };
});

export const listProperties = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./public-data.server");
  const supabase = publicClient();
  const { data } = await supabase
    .from("properties")
    .select("*")
    .eq("is_published", true)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });
  const { withSignedImages } = await import("./storage.server");
  const { attachUnitSummaries } = await import("./public-units.server");
  const signed = (await withSignedImages((data ?? []) as Property[])) as Property[];
  return attachUnitSummaries(supabase, signed);
});

export const getProperty = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-data.server");
    const supabase = publicClient();
    const { data: property } = await supabase
      .from("properties")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!property)
      return {
        property: null,
        related: [] as PropertyListing[],
        agents: [] as Agent[],
        units: [] as PublicUnit[],
      };

    const [related, agents] = await Promise.all([
      supabase
        .from("properties")
        .select("*")
        .eq("is_published", true)
        .eq("is_archived", false)
        .neq("id", property.id)
        .limit(3),
      supabase.from("agents").select("*").eq("is_published", true).order("sort_order").limit(1),
    ]);

    const { withSignedImages } = await import("./storage.server");
    const { attachUnitSummaries, loadPublicUnits } = await import("./public-units.server");
    const [signedProperty] = await withSignedImages([property as Property]);
    const [listing] = await attachUnitSummaries(supabase, [signedProperty as Property]);

    return {
      property: listing as PropertyListing,
      related: await attachUnitSummaries(
        supabase,
        (await withSignedImages((related.data ?? []) as Property[])) as Property[],
      ),
      agents: (agents.data ?? []) as Agent[],
      units:
        (property as Property).structure === "multi_unit"
          ? await loadPublicUnits(supabase, (property as Property).id)
          : ([] as PublicUnit[]),
    };
  });

export const getPublicUnit = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ slug: z.string().min(1).max(200), unitId: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-data.server");
    const supabase = publicClient();
    const { data: property } = await supabase
      .from("properties")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .eq("is_archived", false)
      .maybeSingle();

    if (!property) return { property: null, unit: null, agents: [] as Agent[] };

    const { withSignedImages } = await import("./storage.server");
    const { loadPublicUnit } = await import("./public-units.server");
    const [signedProperty] = await withSignedImages([property as Property]);
    const unit = await loadPublicUnit(supabase, (property as Property).id, data.unitId);
    if (!unit) return { property: null, unit: null, agents: [] as Agent[] };

    const { data: agents } = await supabase
      .from("agents")
      .select("*")
      .eq("is_published", true)
      .order("sort_order")
      .limit(1);

    return {
      property: signedProperty as Property,
      unit,
      agents: (agents ?? []) as Agent[],
    };
  });


export const listAgents = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./public-data.server");
  const { data } = await publicClient()
    .from("agents")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  return (data ?? []) as Agent[];
});

export const listPosts = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./public-data.server");
  const { data } = await publicClient()
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  return (data ?? []) as BlogPost[];
});

export const getPost = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ slug: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-data.server");
    const { data: post } = await publicClient()
      .from("blog_posts")
      .select("*")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    return (post ?? null) as BlogPost | null;
  });

export const listTestimonials = createServerFn({ method: "GET" }).handler(async () => {
  const { publicClient } = await import("./public-data.server");
  const { data } = await publicClient()
    .from("testimonials")
    .select("*")
    .eq("is_approved", true)
    .order("created_at", { ascending: false });
  return (data ?? []) as Testimonial[];
});
