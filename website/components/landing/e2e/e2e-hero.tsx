import Image from "next/image";
import { GithubIcon } from "@/components/icons/github-icon";
import { DitheredHeroFade } from "./dithered-hero-fade";
import { HeroCta } from "./hero-cta";
import { HeroTerminal } from "./hero-terminal";
import { E2E_GITHUB_URL } from "./links";
import { FireflyCanvas } from "./particles/firefly-canvas";

export function E2eHero() {
  return (
    <>
      {/* Decorative bleed (dust halos, canvas) is clipped per region instead of
          on the page root: an overflow-clipping ancestor of the configurator's
          sticky terminal makes iOS Safari reposition it a frame late while
          scrolling, which reads as the pinned panel shaking. */}
      <div className="relative overflow-x-clip">
        <FireflyCanvas />
        <DitheredHeroFade />
        <section className="relative z-20 flex flex-col items-center px-6 pt-40 text-center sm:pt-[187px]">
          <h1 className="type-h2 text-[clamp(38px,4.5vw,60px)] font-normal leading-[1.13] text-ta-sand-50">
            Open Source AI
            <br />
            testing framework
          </h1>
          <p className="mt-4 max-w-[320px] text-balance text-base leading-6 text-white/70 sm:max-w-[640px]">
            Customizable TypeScript testing framework for web, mobile apps and more.
          </p>
          <div className="mt-10 flex w-full max-w-[324px] flex-col gap-5 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-end sm:justify-center sm:gap-4">
            <HeroCta />
            <a
              href={E2E_GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 w-full items-center justify-center gap-1.5 bg-white/90 px-3.5 font-mono text-base leading-6 text-ta-grey-500 transition-colors inset-ring-[0.5px] inset-ring-white/80 hover:bg-white sm:w-auto"
            >
              <GithubIcon aria-hidden="true" className="size-4" />
              GITHUB
            </a>
          </div>
          <div className="mt-20 w-full max-w-[720px] pb-10">
            <HeroTerminal />
          </div>
        </section>
      </div>

      <div
        aria-hidden="true"
        className="e2e-meadow-band pointer-events-none relative z-30 -mt-[60px] h-[130px] overflow-hidden [mask-image:url(/e2e/fade-bottom.png)] [mask-repeat:repeat-x] [mask-size:32px_100%] md:-mt-[348px] md:h-[620px]"
      >
        {/* The sky is masked off inside the moving layer, so the meadow can
            rise over the terminal without its black sky dimming the code.
            Mobile starts the sweep on the lit meadow (not the masked sky) so
            the band is visible the moment it enters the viewport. */}
        <div className="e2e-meadow-parallax absolute inset-x-0 -bottom-[60px] -top-[100px] [--e2e-meadow-from:40px] [--e2e-meadow-to:-60px] [mask-image:url(/e2e/fade-sky.png)] [mask-repeat:repeat-x] [mask-size:32px_100%] md:-bottom-48 md:-top-[392px] md:[--e2e-meadow-from:392px] md:[--e2e-meadow-to:-180px]">
          <Image
            src="/e2e/meadow.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-[50%_68%]"
          />
        </div>
      </div>
    </>
  );
}
