import { E2eConfigurator } from "./configurator/e2e-configurator";
import { E2eCoreFeatures } from "./core-features";
import { E2eFooter } from "./e2e-footer";
import { E2eHeader } from "./e2e-header";
import { E2eHero } from "./e2e-hero";
import { E2eFaq } from "./faq";
import { Reveal } from "./reveal";
import { E2eTestimonials } from "./testimonials";
import { E2eWebinarBanner } from "./webinar-banner";
import { E2eWhy } from "./why-e2e";

export function E2eLandingPage() {
  return (
    <div
      id="top"
      className="ta-landing ta-e2e relative isolate min-h-dvh bg-background text-foreground"
    >
      <E2eHeader />
      <main>
        <E2eHero />
        <Reveal>
          <E2eWhy />
        </Reveal>
        <Reveal>
          <section className="relative mx-auto max-w-[1200px] px-6 pt-[120px] sm:px-10 md:pt-[200px]">
            <E2eConfigurator />
          </section>
        </Reveal>
        <Reveal>
          <E2eCoreFeatures />
        </Reveal>
        <Reveal>
          <E2eTestimonials />
        </Reveal>
        <Reveal>
          <E2eFaq />
        </Reveal>
      </main>
      <E2eFooter />
      <E2eWebinarBanner />
    </div>
  );
}
