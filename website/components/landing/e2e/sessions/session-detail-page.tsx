import Link from "next/link";
import { LinkedInIcon } from "@/components/icons/linkedin-icon";
import { XIcon } from "@/components/icons/x-icon";
import { ArrowLeftIcon, ArrowRightIcon } from "../arrow-icons";
import { E2eFooter } from "../e2e-footer";
import { E2eHeader } from "../e2e-header";
import { Reveal } from "../reveal";
import { HostHoloCard } from "./holo-card";
import { SaveSeatCard } from "./save-seat-card";
import { RecordingCard, SuggestTopicCard } from "./session-cards";
import { E2E_SESSIONS_PATH, INTRO_SESSION } from "./sessions-data";

const META_SEPARATOR = (
  <span aria-hidden="true" className="hidden h-3.5 w-px bg-white/20 sm:block" />
);

const HOST_SOCIALS = {
  linkedin: { label: "LinkedIn", Icon: LinkedInIcon },
  x: { label: "X", Icon: XIcon },
} as const;

export function E2eSessionDetailPage() {
  return (
    <div
      id="top"
      className="ta-landing ta-e2e relative isolate min-h-dvh bg-background text-foreground"
    >
      <E2eHeader />
      <main>
        <div className="relative overflow-x-clip">
          <section className="relative z-20 mx-auto max-w-[1200px] px-6 pb-4 pt-[124px] sm:px-10 sm:pt-[136px]">
            <Link
              href={E2E_SESSIONS_PATH}
              className="flex w-max items-center gap-2.5 font-mono text-xs uppercase leading-4 tracking-[0.08em] text-white/65 transition-colors hover:text-white"
            >
              <ArrowLeftIcon />
              All sessions
            </Link>
            <div className="flex flex-col gap-14 pt-10 lg:flex-row lg:gap-[72px]">
              <div className="flex min-w-0 flex-1 flex-col items-start gap-7">
                <p className="flex items-center gap-2.5 font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white">
                  <span aria-hidden="true" className="size-2 bg-ta-red-300" />
                  Live session + Q&amp;A
                </p>
                <h1 className="type-h2 text-[clamp(44px,5.5vw,72px)] leading-[1.06] tracking-[-0.02em] text-ta-sand-50">
                  {INTRO_SESSION.title}
                </h1>
                {/* Two rows: when, then format. One row would wrap mid-list next to the times. */}
                <div className="flex flex-col gap-2 font-mono text-sm uppercase leading-[18px] tracking-[0.05em]">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-white/90">{INTRO_SESSION.dateLabel}</span>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <span className="text-white/65">45 min + Q&amp;A</span>
                    {META_SEPARATOR}
                    <span className="text-white/65">Free · Online</span>
                  </div>
                </div>
                <div className="mt-4 h-px w-full bg-white/15" />
                <p className="max-w-[640px] text-base leading-7 text-white/70">
                  {INTRO_SESSION.description}
                </p>
                <div className="mt-3 flex flex-col gap-6">
                  <p className="font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white/50">
                    Agenda
                  </p>
                  {INTRO_SESSION.agenda.map((item) => (
                    <div key={item.title} className="flex max-w-[640px] gap-4">
                      <span aria-hidden="true" className="mt-[7px] size-2 shrink-0 bg-white" />
                      <div className="flex flex-col gap-1">
                        <p className="text-base font-medium leading-[22px] text-ta-sand-50">
                          {item.title}
                        </p>
                        <p className="text-[15px] leading-[23px] text-white/70">{item.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="max-w-[640px] text-base leading-7 text-white/70">
                  {INTRO_SESSION.closing}
                </p>
                <div className="mt-6 flex flex-col gap-5">
                  <p className="font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white/50">
                    Your host
                  </p>
                  <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
                    <HostHoloCard caption={false} className="h-[224px] w-[180px] shrink-0" />
                    <div className="flex flex-col gap-1.5">
                      <p className="type-h2 text-[22px] leading-[26px] tracking-[-0.01em] text-ta-sand-50">
                        {INTRO_SESSION.host.name}
                      </p>
                      <p className="font-mono text-xs uppercase leading-4 tracking-[0.08em] text-white/65">
                        {INTRO_SESSION.host.role}
                      </p>
                      <div className="mt-3 flex gap-2">
                        {INTRO_SESSION.host.socials.map(({ platform, href }) => {
                          const { label, Icon } = HOST_SOCIALS[platform];
                          return (
                            <a
                              key={platform}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              aria-label={`${INTRO_SESSION.host.name} on ${label}`}
                              className="flex size-9 items-center justify-center border border-white/20 text-white/65 transition-colors hover:border-white/40 hover:text-white"
                            >
                              <Icon aria-hidden className="size-4" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <SaveSeatCard />
            </div>
          </section>
        </div>
        <Reveal>
          <section className="relative mx-auto max-w-[1200px] px-6 pt-[120px] sm:px-10">
            <div data-reveal className="flex items-center justify-between">
              <p className="font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white/50">
                More sessions
              </p>
              <Link
                href={E2E_SESSIONS_PATH}
                className="flex items-center gap-2.5 font-mono text-xs font-medium uppercase tracking-[0.08em] text-white transition-colors hover:text-white/80"
              >
                View all
                <ArrowRightIcon />
              </Link>
            </div>
            <div data-reveal className="mt-6 h-px w-full bg-white/15" />
            <div
              data-reveal
              className="grid auto-cols-fr grid-cols-1 gap-5 pt-10 sm:grid-cols-2 lg:grid-cols-3"
            >
              <RecordingCard location="e2e_session_detail" />
              <SuggestTopicCard />
            </div>
          </section>
        </Reveal>
      </main>
      <E2eFooter />
    </div>
  );
}
