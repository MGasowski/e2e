"use client";

import { type ComponentProps, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { revealDelay } from "../reveal-style";
import { type ChipOption, CONFIG_STEPS } from "./config-options";

const FIELD_INPUT_CLASS =
  "w-full border border-white/30 bg-[rgb(26_26_26)] px-4 py-3 font-mono text-[13px] leading-5 text-white caret-white outline-none transition-colors placeholder:text-white/30 hover:border-white/45 focus:border-white/80 focus:bg-[rgb(30_30_30)]";

/** Matches every StepBlock root, in document order. */
export const STEP_SELECTOR = "[data-config-step]";

export function SectionHeader() {
  return (
    <>
      <p
        data-reveal
        className="font-mono text-xs uppercase leading-[23px] tracking-[0.05em] text-white/70"
      >
        [02] Configure e2e
      </p>
      <h2
        data-reveal
        style={revealDelay(1)}
        className="type-h2 text-[clamp(34px,4vw,48px)] font-normal leading-[1.17] tracking-[-0.04em] text-ta-sand-50"
      >
        Your testing stack. Your call.
      </h2>
      <p data-reveal style={revealDelay(2)} className="text-[13px] leading-[22px] text-white/65">
        Pick every layer. The config writes itself.
      </p>
    </>
  );
}

const stepTag = (index: number) =>
  `${String(index + 1).padStart(2, "0")}/${String(CONFIG_STEPS.length).padStart(2, "0")}`;

/**
 * One configurator step. Once `revealed`, its tag, headline, description, and
 * controls move in one by one, each dissolving while rising into place.
 */
export function StepBlock({
  index,
  revealed,
  children,
  className,
}: {
  index: number;
  revealed: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const { headline, description } = CONFIG_STEPS[index];
  const part = (delay: string) =>
    cn(
      "transition-[opacity,translate] duration-500 ease-out motion-reduce:translate-y-0 motion-reduce:transition-none",
      revealed ? cn("translate-y-0 opacity-100", delay) : "translate-y-6 opacity-0 delay-0",
    );

  return (
    <div data-config-step="" className={cn("flex flex-col gap-3.5", className)}>
      <p
        className={cn(
          "font-mono text-xs uppercase leading-4 tracking-[0.1em] text-white/50",
          part("delay-0"),
        )}
      >
        {stepTag(index)}
      </p>
      <h3
        className={cn(
          "text-[27px] font-normal leading-[34px] text-ta-sand-50",
          part("delay-[70ms]"),
        )}
      >
        {headline}
      </h3>
      <p
        className={cn(
          "max-w-[480px] text-[15px] leading-6 text-white/70 lg:whitespace-pre-line",
          part("delay-[140ms]"),
        )}
      >
        {description}
      </p>
      <div className={cn("mt-2.5", part("delay-[210ms]"))}>{children}</div>
    </div>
  );
}

/** Single-choice row of option chips. */
export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const selected = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            aria-pressed={selected}
            className={cn(
              "flex h-10 cursor-pointer items-center gap-2.5 px-4 font-mono text-[13px] leading-5 transition-[color,box-shadow]",
              selected
                ? "bg-white/[0.07] font-medium text-white shadow-[0_0_16px_rgb(255_255_255/0.12)] inset-ring inset-ring-white/90"
                : "bg-[rgb(22_22_22/0.9)] text-white/70 inset-ring-[0.5px] inset-ring-white/25 hover:text-white/90 hover:inset-ring-white/50",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function StepFieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-2.5 flex flex-col gap-2">
      <span className="font-mono text-[11px] uppercase leading-4 tracking-[0.1em] text-white/50">
        {label}
      </span>
      {children}
    </label>
  );
}

/** Labeled single-line step input. */
export function StepInput({ label, ...props }: { label: string } & ComponentProps<"input">) {
  return (
    <StepFieldLabel label={label}>
      <input type="text" spellCheck={false} {...props} className={FIELD_INPUT_CLASS} />
    </StepFieldLabel>
  );
}

/** Labeled step textarea that grows downward with its content. */
export function StepTextarea({
  label,
  value,
  ...props
}: { label: string; value: string } & Omit<ComponentProps<"textarea">, "value">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <StepFieldLabel label={label}>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        spellCheck={false}
        {...props}
        className={cn(FIELD_INPUT_CLASS, "resize-none overflow-hidden")}
      />
    </StepFieldLabel>
  );
}
