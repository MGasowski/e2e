"use client";

import { useReducer, useState } from "react";
import { analytics, analyticsEvents } from "@/lib/analytics";
import { dispatchBurstFrom } from "../particles/burst";
import { ButtonDust } from "../particles/button-dust";
import { TerminalFrame } from "../terminal-frame";
import { useCopyFeedback } from "../use-copy-feedback";
import {
  buildConfigLines,
  type CodeLine,
  type ConfiguratorState,
  customModelPlaceholder,
  type EditableField,
  linesToText,
  readOnlyLine,
  snippetLines,
} from "./config-code";
import { ConfigCodeLines } from "./config-code-lines";
import {
  CONFIG_STEPS,
  CONNECTION_OPTIONS,
  ENGINE_OPTIONS,
  modelOptions,
  stepLineKeys,
} from "./config-options";
import {
  configuratorReducer,
  INITIAL_VIEW,
  MAX_CUSTOM_ENGINE_LENGTH,
  MAX_CUSTOM_MODEL_LENGTH,
  MAX_INSTRUCTIONS_LENGTH,
} from "./configurator-state";
import { ChipGroup, SectionHeader, StepBlock, StepInput, StepTextarea } from "./step-controls";
import { useStepScroll } from "./use-step-scroll";

export function E2eConfigurator() {
  const [{ config, flashKeys }, dispatch] = useReducer(configuratorReducer, INITIAL_VIEW);
  const [promptFocused, setPromptFocused] = useState(false);
  const { stepsRef, revealedThrough, activeStep } = useStepScroll();
  const [flashStep, setFlashStep] = useState(activeStep);
  if (flashStep !== activeStep) {
    setFlashStep(activeStep);
    dispatch({ type: "clear-flash" });
  }
  const { copied, copy } = useCopyFeedback(1600);

  const configLines = buildConfigLines(config);
  const highlightedKeys = new Set([...flashKeys, ...stepLineKeys(activeStep)]);
  const set = (patch: Partial<ConfiguratorState>) => dispatch({ type: "set", patch });
  const editToken = (field: EditableField, value: string) =>
    dispatch({ type: "edit", field, value });
  const stepSnippet = (index: number) => (
    <StepSnippet
      index={index}
      lines={configLines}
      flashKeys={flashKeys}
      onEditToken={editToken}
      emphasizedField={promptFocused ? "instructions" : undefined}
    />
  );

  const copyConfig = async (button: HTMLElement) => {
    dispatchBurstFrom(button);
    if (!(await copy(linesToText(configLines)))) return;
    analytics.track(analyticsEvents.e2eConfigCopied, {
      location: "e2e_configurator",
      model: config.model,
      connection: config.connection,
      engine: config.engine,
    });
  };

  return (
    <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[640px_minmax(0,480px)] lg:justify-between lg:gap-14">
      {/* in the flow on mobile, inside the sticky stack on desktop */}
      <div className="flex max-w-[640px] flex-col gap-5 lg:hidden">
        <SectionHeader />
      </div>
      <div className="sticky top-[max(4rem,calc(50vh-330px))] z-30 hidden transform-gpu self-start lg:block">
        <div className="mb-10 flex max-w-[640px] flex-col gap-5">
          <SectionHeader />
        </div>
        <div className="[transform:perspective(2200px)_rotateY(-2.5deg)]">
          <TerminalFrame
            className="min-h-[431px] w-full max-w-[640px]"
            title="e2e.config.ts"
            bottomFade
          >
            <ConfigCodeLines
              lines={configLines}
              highlightedKeys={highlightedKeys}
              onEditToken={editToken}
              emphasizedField={promptFocused ? "instructions" : undefined}
              className="relative z-20 overflow-y-auto"
            />
          </TerminalFrame>
        </div>
      </div>

      {/* the clip box bleeds past the column so the copy burst is not cut at its edges */}
      <div className="relative -mx-6 overflow-x-clip px-6 sm:-mx-10 sm:px-10 lg:-ml-80 lg:pl-80">
        {/* sticky blend bands (desktop only): steps dissolve into the
            background at the viewport edges instead of clipping */}
        <div
          aria-hidden="true"
          className="pointer-events-none sticky top-0 z-20 -mb-32 hidden h-32 bg-gradient-to-b from-background to-transparent lg:block"
        />
        <div ref={stepsRef} className="flex flex-col gap-24 lg:gap-48 lg:pb-8 lg:pt-72">
          <StepBlock index={0} revealed={revealedThrough >= 0}>
            <ChipGroup
              options={CONNECTION_OPTIONS}
              value={config.connection}
              onChange={(connection) => set({ connection })}
            />
            {stepSnippet(0)}
          </StepBlock>

          <StepBlock index={1} revealed={revealedThrough >= 1}>
            <div className="relative">
              <ChipGroup
                options={modelOptions(config.connection)}
                value={config.model}
                onChange={(model) => set({ model })}
              />
              {config.model === "custom" && (
                <div className="lg:absolute lg:inset-x-0 lg:top-full">
                  <StepInput
                    label="Model id"
                    value={config.customModel}
                    maxLength={MAX_CUSTOM_MODEL_LENGTH}
                    placeholder={customModelPlaceholder(config.connection)}
                    onChange={(event) => set({ customModel: event.target.value })}
                  />
                </div>
              )}
            </div>
            {stepSnippet(1)}
          </StepBlock>

          <StepBlock index={2} revealed={revealedThrough >= 2}>
            <StepTextarea
              label="System prompt"
              value={config.instructions}
              maxLength={MAX_INSTRUCTIONS_LENGTH}
              placeholder="You are a QA testing agent…"
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
              onChange={(event) => set({ instructions: event.target.value.replace(/\n/g, " ") })}
            />
            {stepSnippet(2)}
          </StepBlock>

          <StepBlock index={3} revealed={revealedThrough >= 3}>
            <div className="relative">
              <ChipGroup
                options={ENGINE_OPTIONS}
                value={config.engine}
                onChange={(engine) => set({ engine })}
              />
              {config.engine === "custom" && (
                <div className="lg:absolute lg:inset-x-0 lg:top-full">
                  <StepInput
                    label="Engine"
                    value={config.customEngine}
                    maxLength={MAX_CUSTOM_ENGINE_LENGTH}
                    placeholder="yourEngine"
                    onChange={(event) => set({ customEngine: event.target.value })}
                  />
                </div>
              )}
            </div>
            {stepSnippet(3)}
          </StepBlock>

          <StepBlock index={4} revealed={revealedThrough >= 4} className="lg:pb-44">
            {stepSnippet(4)}
            <div className="relative mt-6 lg:mt-0">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-80 -bottom-64 -top-52"
              >
                <ButtonDust />
              </div>
              <button
                type="button"
                onClick={(event) => void copyConfig(event.currentTarget)}
                className="relative flex h-10 w-full cursor-pointer items-center justify-center bg-ta-sand-50 font-mono text-[13px] font-medium uppercase leading-5 text-[rgb(13_13_13)] transition-colors hover:bg-white sm:max-w-[324px]"
              >
                {copied ? "Copied" : "Copy config"}
              </button>
            </div>
          </StepBlock>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none sticky bottom-0 z-20 -mt-32 hidden h-32 bg-gradient-to-t from-background to-transparent lg:block"
        />
      </div>
    </div>
  );
}

/**
 * A step's slice of the config, shown under its controls below lg in place of
 * the pinned terminal: the step's own lines stay lit and flash as in the full
 * file. Only the step that owns a value keeps it inline-editable, so each
 * field appears once to assistive tech. See docs/decisions.md, "/e2e configurator:
 * per-step snippets below lg, no pinned terminal".
 */
function StepSnippet({
  index,
  lines,
  flashKeys,
  onEditToken,
  emphasizedField,
}: {
  index: number;
  lines: CodeLine[];
  flashKeys: ReadonlySet<string>;
  onEditToken: (field: EditableField, value: string) => void;
  emphasizedField?: EditableField;
}) {
  const keys = CONFIG_STEPS[index].snippetKeys;
  const owned = new Set(stepLineKeys(index));
  const snippet = (keys ? snippetLines(lines, keys) : lines).map((line) =>
    owned.has(line.key) ? line : readOnlyLine(line),
  );
  return (
    <TerminalFrame className="mt-6 w-full lg:hidden" title="e2e.config.ts">
      <ConfigCodeLines
        lines={snippet}
        highlightedKeys={new Set([...flashKeys, ...owned])}
        onEditToken={onEditToken}
        emphasizedField={emphasizedField}
      />
    </TerminalFrame>
  );
}
