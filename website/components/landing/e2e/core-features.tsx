import { revealDelay } from "./reveal-style";

const FEATURES: {
  headline: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    headline: "Don't make AI think twice.",
    description: "Replay compatible cached actions without unnecessary model calls.",
    icon: (
      <>
        <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
      </>
    ),
  },
  {
    headline: "Goals, not scripts.",
    description:
      "Describe your testing goals in plain language. Let your agent handle the actions.",
    icon: (
      <>
        <path d="M12 3l1.9 7.1L21 12l-7.1 1.9L12 21l-1.9-7.1L3 12l7.1-1.9Z" />
        <path d="M19 2.5v4 M21 4.5h-4" />
      </>
    ),
  },
  {
    headline: "Exact when it matters.",
    description: "Combine AI-driven actions with precise locators and deterministic assertions.",
    icon: (
      <>
        <circle cx="12" cy="12" r="7" />
        <path d="M12 2v4 M12 18v4 M2 12h4 M18 12h4" />
      </>
    ),
  },
  {
    headline: "Your AI. Your choice.",
    description: "Choose your preferred AI model and customize your testing agent.",
    icon: (
      <>
        <circle cx="12" cy="5" r="2.3" />
        <circle cx="5" cy="19" r="2.3" />
        <circle cx="19" cy="19" r="2.3" />
        <path d="M10.9 7 L6.1 17 M13.1 7 L17.9 17 M7.3 19 H16.7" />
      </>
    ),
  },
  {
    headline: "One API. Multiple environments.",
    description: "Test web and mobile applications through one shared API.",
    icon: (
      <>
        <rect x="2.5" y="4.5" width="13" height="11" />
        <path d="M2.5 8h13" />
        <rect x="15.5" y="9.5" width="6" height="11" />
        <path d="M17.5 18h2" />
      </>
    ),
  },
  {
    headline: "Bring your own engine.",
    description: "Extend the framework with your own execution backend.",
    icon: <path d="M4 8 H8 a2 2 0 1 1 4 0 H16 V12 a2 2 0 1 1 0 4 V20 H4 Z" />,
  },
];

export function E2eCoreFeatures() {
  return (
    <section className="mx-auto max-w-[1200px] px-6 pt-[120px] sm:px-10 md:pt-[200px]">
      <div className="flex flex-col items-start gap-5 text-left md:items-center md:text-center">
        <p
          data-reveal
          className="font-mono text-xs uppercase leading-[23px] tracking-[0.05em] text-white/70"
        >
          [03] Core features
        </p>
        <h2
          data-reveal
          style={revealDelay(1)}
          className="type-h2 text-balance text-[clamp(34px,4vw,48px)] font-normal leading-[1.17] text-ta-sand-50"
        >
          AI where it helps. Code where it counts.
        </h2>
      </div>
      <div className="mt-12 grid gap-y-12 md:grid-cols-3 md:gap-x-[83px]">
        {FEATURES.map((feature, index) => (
          <div
            key={feature.headline}
            data-reveal
            style={revealDelay(index + 2)}
            className="pt-1 md:pl-6"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="rgb(255 255 255 / 0.7)"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              {feature.icon}
            </svg>
            <h3 className="mt-6 text-[22px] font-normal leading-7 text-white">
              {feature.headline}
            </h3>
            <p className="mt-3 max-w-[295px] text-[13px] leading-[22px] text-white/60">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
