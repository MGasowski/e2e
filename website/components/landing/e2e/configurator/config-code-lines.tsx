"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { CODE_COLORS } from "../code-colors";
import type { CodeLine, EditableField } from "./config-code";

/**
 * Inline-editable value inside a code line, marked by a faint tint and
 * wrapping like the surrounding code. Uncontrolled while focused: React never
 * rewrites its text (which would reset the caret); external changes (chips,
 * the step inputs) sync in only when the field is not being edited.
 */
function EditableToken({
  value,
  color,
  label,
  emphasized,
  onChange,
}: {
  value: string;
  color: string;
  label: string;
  /** Stronger tint while the matching step input is focused. */
  emphasized?: boolean;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || document.activeElement === el) return;
    if (el.textContent !== value) el.textContent = value;
  }, [value]);
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-label={label}
      className={cn(
        "cursor-text whitespace-pre px-1 lg:whitespace-pre-wrap outline-none transition-colors hover:bg-white/[0.17] focus:bg-white/[0.17]",
        emphasized ? "bg-white/[0.2]" : "bg-white/[0.12]",
      )}
      style={{ color }}
      onInput={(event) => onChange(event.currentTarget.textContent ?? "")}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * The configurator's live e2e.config.ts: highlighted lines flash and carry a
 * left rule, and editable tokens render as inline fields. Below lg lines never
 * wrap and the block scrolls sideways; the inner column grows to the widest
 * line so highlights span the scrolled width.
 */
export function ConfigCodeLines({
  lines,
  highlightedKeys,
  className,
  onEditToken,
  emphasizedField,
}: {
  lines: CodeLine[];
  highlightedKeys: ReadonlySet<string>;
  className?: string;
  onEditToken: (field: EditableField, value: string) => void;
  /** Field whose inline value shows a stronger tint (its step input is focused). */
  emphasizedField?: EditableField;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <div className="flex w-max min-w-full flex-col p-5 lg:w-auto">
        {lines.map((codeLine) => {
          const highlighted = highlightedKeys.has(codeLine.key);
          return (
            <div
              key={codeLine.key}
              data-line={codeLine.key}
              className={cn(
                "min-h-[22px] shrink-0 whitespace-pre font-mono lg:whitespace-pre-wrap text-[13px] leading-[22px] sm:min-h-[23px] sm:text-[13.5px] sm:leading-[23px]",
                highlighted &&
                  "-mx-5 animate-[e2e-line-flash_0.9s_ease-out] border-l-2 border-white/90 bg-white/5 pl-[18px] pr-5 motion-reduce:animate-none",
              )}
            >
              {codeLine.tokens.map((token, index) => {
                const color = CODE_COLORS[token.color ?? "plain"];
                if (token.editable) {
                  const field = token.editable;
                  return (
                    <EditableToken
                      key={field}
                      value={token.text}
                      color={color}
                      label={`Edit ${field}`}
                      emphasized={emphasizedField === field}
                      onChange={(value) => onEditToken(field, value)}
                    />
                  );
                }
                return (
                  <span key={index} style={{ color }}>
                    {token.text}
                  </span>
                );
              })}
              {codeLine.tokens.length === 0 && <br />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
