import { ArrowRightIcon } from "../arrow-icons";
import { DitheredHeroFade } from "../dithered-hero-fade";
import { E2eFooter } from "../e2e-footer";
import { E2eHeader } from "../e2e-header";
import { FireflyCanvas } from "../particles/firefly-canvas";
import { Reveal } from "../reveal";
import { HostHoloCard } from "./holo-card";
import { SaveSeatLink } from "./session-cards";
import { INTRO_SESSION } from "./sessions-data";
import { SessionsGallery } from "./sessions-gallery";

export function E2eSessionsPage() {
  return (
    <div
      id="top"
      className="ta-landing ta-e2e relative isolate min-h-dvh bg-background text-foreground"
    >
      <E2eHeader />
      <main>
        <div className="relative overflow-x-clip">
          <FireflyCanvas density={0.45} rainPerSecond={4} />
          <DitheredHeroFade />
          <section className="relative z-20 mx-auto flex max-w-[1200px] flex-col gap-14 px-6 pb-4 pt-36 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-8 lg:pb-16 lg:pt-[196px]">
            <div className="flex max-w-[520px] flex-col items-start gap-6">
              <p className="flex items-center gap-2.5 font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white">
                <span aria-hidden="true" className="size-2 bg-ta-red-300" />
                Next live session
              </p>
              <h1 className="type-h2 text-[40px] leading-[44px] tracking-[-0.02em] text-ta-sand-50 sm:text-[56px] sm:leading-[60px]">
                {INTRO_SESSION.title}
              </h1>
              <p className="max-w-[470px] text-base leading-[25px] text-white/70">
                {INTRO_SESSION.summary}
              </p>
              <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
                <SaveSeatLink
                  location="e2e_sessions_page"
                  className="flex h-11 items-center justify-center gap-2.5 bg-white/90 px-6 font-mono text-[13px] font-medium uppercase tracking-[0.08em] text-ta-grey-500 transition-colors inset-ring-[0.5px] inset-ring-white/80 hover:bg-white"
                >
                  Save my seat
                  <ArrowRightIcon />
                </SaveSeatLink>
                <p className="font-mono text-sm uppercase leading-5 tracking-[0.05em] text-white/65">
                  {INTRO_SESSION.dateDayLabel} · Free
                  <br />
                  {INTRO_SESSION.timesLabel}
                </p>
              </div>
            </div>
            <HostHoloCard className="h-[380px] w-[284px] shrink-0 self-center lg:mr-10 lg:h-[460px] lg:w-[349px] lg:self-auto" />
          </section>
        </div>
        <Reveal>
          <SessionsGallery />
        </Reveal>
      </main>
      <E2eFooter />
    </div>
  );
}
