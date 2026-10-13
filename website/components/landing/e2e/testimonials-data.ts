import { z } from "zod";
import raw from "./testimonials.json";

const testimonialSchema = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9-]+$/),
    quote: z.string().min(1),
    lang: z.enum(["en", "es", "ar"]),
    translation: z.string().min(1).optional(),
    author: z.string().min(1),
    handle: z.string().regex(/^\w{1,15}$/),
    followerCount: z.number().int().nonnegative(),
    url: z.url().startsWith("https://x.com/"),
    avatar: z.string().regex(/^\/e2e\/testimonials\/[a-z0-9_]+\.jpg$/),
    featured: z.boolean(),
    wide: z.boolean().optional(),
  })
  // Non-English quotes render with a labelled English translation, so one must
  // ship with every such quote, and English quotes must not carry one.
  .superRefine(({ lang, translation }, ctx) => {
    if ((lang !== "en") !== (translation !== undefined)) {
      ctx.addIssue({
        code: "custom",
        path: ["translation"],
        message:
          lang === "en"
            ? "English quotes must not have a translation"
            : `A ${lang} quote needs an English translation`,
      });
    }
  });

export type E2eTestimonial = z.infer<typeof testimonialSchema>;

/** Ranked by X follower counts checked on 2026-10-05 (X rounds large counts). */
export const E2E_TESTIMONIALS: readonly E2eTestimonial[] = z.array(testimonialSchema).parse(raw);
