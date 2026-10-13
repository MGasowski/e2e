"use client";

import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons/close-icon";
import { CODE_COLORS } from "./code-colors";
import type { HeroDoc } from "./hero-examples";

export const DOC_TOOLTIP_MAX_WIDTH = 380;

/** Where a doc renders: anchored to its token, or a centered card on small screens. */
export type DocTooltipPlacement =
  | { kind: "anchored"; left: number; top?: number; bottom?: number }
  | { kind: "centered" };

export type DocTooltipState = { doc: HeroDoc; placement: DocTooltipPlacement };

/* Light github-dark coloring for the signature line: 'strings', import/from
   keywords, functionNames( before a paren, primitive types, and Capitalized
   type names. Everything else stays plain. */
const SIGNATURE_TOKEN_RE =
  /('[^']*')|\b(import|from)\b|([A-Za-z_$][\w$]*)(?=\()|\b(string|number|boolean|void)\b|\b([A-Z][A-Za-z0-9_$]*)\b/g;
const SIGNATURE_GROUP_COLORS = [
  CODE_COLORS.str,
  CODE_COLORS.kw,
  CODE_COLORS.fn,
  CODE_COLORS.type,
  CODE_COLORS.name,
];

function Signature({ signature }: { signature: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of signature.matchAll(SIGNATURE_TOKEN_RE)) {
    const index = match.index;
    if (index > cursor) nodes.push(signature.slice(cursor, index));
    const group = match.slice(1).findIndex((value) => value !== undefined);
    nodes.push(
      <span key={index} style={{ color: SIGNATURE_GROUP_COLORS[group] }}>
        {match[0]}
      </span>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < signature.length) nodes.push(signature.slice(cursor));
  return nodes;
}

const CARD_CLASS =
  "animate-[e2e-doc-pop_0.15s_cubic-bezier(0.19,1,0.22,1)] border border-[rgb(78_78_78)] bg-[rgb(37_37_38)] text-left shadow-[0_8px_24px_rgb(0_0_0/0.5)] motion-reduce:animate-none";
const SIGNATURE_CLASS = "px-3 py-2 font-mono text-xs leading-[18px] text-[rgb(230_237_243)]";
const DESCRIPTION_CLASS = "px-3 py-2 text-xs leading-[18px] text-white/70";

/**
 * Hover doc for a hero code token, portaled to the body. The centered card
 * closes via its X or backdrop; the anchored one ignores the pointer.
 */
export function DocTooltip({ doc, placement, onClose }: DocTooltipState & { onClose: () => void }) {
  if (placement.kind === "anchored") {
    return createPortal(
      <div
        role="tooltip"
        className={`pointer-events-none fixed z-50 max-w-[380px] ${CARD_CLASS}`}
        style={{ left: placement.left, top: placement.top, bottom: placement.bottom }}
      >
        <p className={`border-b border-[rgb(78_78_78)] ${SIGNATURE_CLASS}`}>
          <Signature signature={doc.signature} />
        </p>
        <p className={DESCRIPTION_CLASS}>{doc.description}</p>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-3">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default"
      />
      <div role="tooltip" className={`relative w-full max-w-[380px] ${CARD_CLASS}`}>
        <div className="flex items-start justify-between border-b border-[rgb(78_78_78)]">
          <p className={SIGNATURE_CLASS}>
            <Signature signature={doc.signature} />
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-[34px] shrink-0 cursor-pointer items-center pl-2 pr-3 text-white/70 transition-colors hover:text-white"
          >
            <CloseIcon className="size-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <p className={DESCRIPTION_CLASS}>{doc.description}</p>
      </div>
    </div>,
    document.body,
  );
}
