import type { SVGProps } from "react";

/** Close / X glyph. */
export function CloseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth="1.75"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}
