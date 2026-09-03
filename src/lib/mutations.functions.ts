import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200).optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
  source: z.string().max(60).default("contact"),
  property_id: z.string().uuid().optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-data.server");
    const { error } = await publicClient().from("leads").insert({
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      message: data.message || null,
      source: data.source,
      property_id: data.property_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ email: z.string().email().max(200) }).parse(data))
  .handler(async ({ data }) => {
    const { publicClient } = await import("./public-data.server");
    const { error } = await publicClient()
      .from("newsletter_subscribers")
      .upsert({ email: data.email }, { onConflict: "email" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
