import Image from "next/image";
import { XIcon } from "@/components/icons/x-icon";
import { cn } from "@/lib/utils";
import { revealDelay } from "./reveal-style";
import { type E2eTestimonial, E2E_TESTIMONIALS } from "./testimonials-data";
import { TestimonialsExpander } from "./testimonials-expander";

const LANGUAGE_NAMES: Record<E2eTestimonial["lang"], string> = {
  en: "English",
  es: "Spanish",
  ar: "Arabic",
};

function TestimonialCard({
  testimonial,
  revealIndex,
}: {
  testimonial: E2eTestimonial;
  revealIndex: number;
}) {
  const { quote, lang, translation, author, handle, url, avatar, featured, wide } = testimonial;

  return (
    // Each card draws its own 1px outline over the list's gap-px and p-px, so a
    // card reveals with its hairlines instead of over a pre-drawn grid.
    <li
      data-testimonial-extra={featured ? undefined : ""}
      data-reveal={featured ? "" : undefined}
      style={featured ? revealDelay(revealIndex) : undefined}
      className={cn(
        "flex bg-background outline outline-white/10",
        wide && "md:col-span-2",
        !featured && "hidden group-data-expanded/testimonials:flex",
      )}
    >
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group/card flex w-full flex-col gap-8 p-6 outline-none transition-colors duration-200 hover:bg-white/[0.03] focus-visible:bg-white/[0.03] focus-visible:inset-ring-1 focus-visible:inset-ring-white/60 motion-reduce:transition-none md:p-8"
      >
        <blockquote className="flex flex-col gap-4">
          <p
            lang={lang}
            dir={lang === "ar" ? "rtl" : undefined}
            className="whitespace-pre-line text-[15px] leading-[24px] text-white/85 transition-colors duration-200 group-hover/card:text-white group-focus-visible/card:text-white motion-reduce:transition-none"
          >
            {quote}
          </p>
          {translation ? (
            <p className="flex flex-col gap-1.5 text-[13px] leading-[22px] text-white/55">
              <span className="font-mono text-[11px] uppercase leading-4 tracking-[0.05em] text-white/40">
                Translated from {LANGUAGE_NAMES[lang]}
              </span>
              {translation}
            </p>
          ) : null}
        </blockquote>
        <div className="mt-auto flex items-center gap-3">
          <Image
            src={avatar}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 bg-white/5"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] leading-5 text-white">{author}</p>
            <p className="truncate font-mono text-[12px] leading-5 text-white/50">@{handle}</p>
          </div>
          <XIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-white/35 transition-colors duration-200 group-hover/card:text-white/80 group-focus-visible/card:text-white/80 motion-reduce:transition-none"
          />
          <span className="sr-only">(opens on X in a new tab)</span>
        </div>
      </a>
    </li>
  );
}

export function E2eTestimonials() {
  const hiddenCount = E2E_TESTIMONIALS.filter((testimonial) => !testimonial.featured).length;

  return (
    <section
      aria-labelledby="e2e-testimonials-heading"
      className="mx-auto max-w-[1200px] px-6 pt-[120px] sm:px-10 md:pt-[200px]"
    >
      <div className="flex flex-col items-start gap-5 text-left md:items-center md:text-center">
        <p
          data-reveal
          className="font-mono text-xs uppercase leading-[23px] tracking-[0.05em] text-white/70"
        >
          [04] Testimonials
        </p>
        <h2
          id="e2e-testimonials-heading"
          data-reveal
          style={revealDelay(1)}
          className="type-h2 text-balance text-[clamp(34px,4vw,48px)] font-normal leading-[1.17] text-ta-sand-50"
        >
          Loved by developers.
        </h2>
      </div>
      <TestimonialsExpander hiddenCount={hiddenCount}>
        {E2E_TESTIMONIALS.map((testimonial, index) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} revealIndex={index + 2} />
        ))}
      </TestimonialsExpander>
    </section>
  );
}
