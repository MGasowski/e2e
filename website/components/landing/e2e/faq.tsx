"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { E2E_DOCS_URL } from "./links";
import { E2E_OUTLINE_BUTTON } from "./outline-button";
import { revealDelay } from "./reveal-style";

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Which AI models can I use?",
    answer:
      "Any AI SDK model works. Sign in with the ChatGPT, GitHub Copilot, or SuperGrok subscription you already pay for, bring a Vercel AI Gateway or OpenRouter key, or point the runner at a local server. The config selects the model; e2e adds no markup.",
  },
  {
    question: "Can the model see my secrets?",
    answer:
      "Secrets stay in environment variables: the config references named credentials and the runner fills them at run time, so values never live in your test code or transcripts.",
  },
  {
    question: "Does it test mobile apps?",
    answer:
      "Yes. @e2e-dev/mobile drives iOS simulators and Android emulators through agent-device, with the same tests, fixtures, and assertions you write for the web.",
  },
  {
    question: "Does it run in CI?",
    answer:
      "Yes. CI mode switches on automatically: one retry, a read-only trace cache, and agent steps replay verified actions without model calls when nothing changed. Pass your model key as a secret and run it like any other test job.",
  },
  {
    question: "Can I migrate from another framework?",
    answer:
      "Yes: the docs include migration guides for Playwright, Cypress, Selenium, Detox, and Maestro. Locators and assertions map closely, and agent steps replace the most brittle parts first.",
  },
  {
    question: "What happens when a run fails?",
    answer:
      "You get a report with the exact failing step, a screenshot, a trace, and logs under .e2e. Re-run with --headed or --debug to watch it live; every error code maps to a fix in the docs.",
  },
];

/**
 * The homepage FAQ's plus glyph, restated for the dark /e2e surface: hairline
 * plus whose vertical bar collapses into a minus, inside bracket corners that
 * step outward on row hover.
 */
function PlusBracketIcon({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex size-7 shrink-0 items-center justify-center text-white/45 transition-colors group-hover:text-white/80"
    >
      <span className="absolute left-0 top-0 size-1.5 border-l border-t border-current transition-transform duration-200 ease-out group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:-translate-x-0.5 group-focus-visible:-translate-y-0.5 motion-reduce:transition-none" />
      <span className="absolute right-0 top-0 size-1.5 border-r border-t border-current transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:-translate-y-0.5 motion-reduce:transition-none" />
      <span className="absolute bottom-0 left-0 size-1.5 border-b border-l border-current transition-transform duration-200 ease-out group-hover:-translate-x-0.5 group-hover:translate-y-0.5 group-focus-visible:-translate-x-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transition-none" />
      <span className="absolute bottom-0 right-0 size-1.5 border-b border-r border-current transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-focus-visible:translate-x-0.5 group-focus-visible:translate-y-0.5 motion-reduce:transition-none" />
      <span className="relative flex size-3 items-center justify-center">
        <span className="absolute h-px w-2.5 bg-current" />
        <span
          className={cn(
            "absolute h-2.5 w-px bg-current transition-transform duration-200 ease-out motion-reduce:transition-none",
            open && "scale-y-0",
          )}
        />
      </span>
    </span>
  );
}

function FaqRow({
  question,
  answer,
  open,
  onToggle,
  revealIndex,
}: {
  question: string;
  answer: string;
  open: boolean;
  onToggle: () => void;
  revealIndex: number;
}) {
  return (
    <div
      data-reveal
      style={revealDelay(revealIndex)}
      className="border-t border-white/10 last:border-b"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="group flex w-full cursor-pointer items-center justify-between gap-6 py-[26px] text-left"
      >
        <span className="text-[20px] leading-[34px] tracking-[-0.02em] text-ta-sand-50">
          {question}
        </span>
        <PlusBracketIcon open={open} />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <p
            className={cn(
              "max-w-[640px] pb-[26px] text-[13px] leading-[22px] text-white/65 transition-opacity duration-200 ease-out motion-reduce:transition-none",
              open ? "opacity-100" : "opacity-0",
            )}
          >
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export function E2eFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-[120px] sm:px-10 md:pt-[200px]">
      <div className="flex flex-col gap-14 lg:flex-row lg:justify-between">
        <div data-reveal className="flex max-w-[380px] flex-col items-start gap-5">
          <p className="font-mono text-xs uppercase leading-[23px] tracking-[0.05em] text-white/70">
            [05] FAQ
          </p>
          <h2 className="type-h2 text-[clamp(34px,4vw,48px)] font-normal leading-[1.17] text-ta-sand-50">
            Questions, answered.
          </h2>
          <p className="max-w-[300px] text-[13px] leading-[22px] text-white/65">
            The short version. When in doubt, the docs win.
          </p>
          <a
            href={E2E_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className={cn(
              E2E_OUTLINE_BUTTON,
              "mt-2 flex h-10 w-full items-center justify-center px-5 text-[13px] leading-5 sm:w-auto",
            )}
          >
            Read the docs
          </a>
        </div>

        <div className="w-full lg:max-w-[740px]">
          {FAQ_ITEMS.map((item, index) => (
            <FaqRow
              key={item.question}
              question={item.question}
              answer={item.answer}
              open={openIndex === index}
              onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
              revealIndex={index + 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
