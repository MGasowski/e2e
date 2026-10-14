import type { SVGProps } from "react";

/** LinkedIn brand icon (simpleicons.org). */
export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="currentColor"
      role="img"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <title>LinkedIn</title>
      <path d="M20.447 20.452H16.9v-5.569c0-1.328-.026-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.356V9h3.412v1.561h.048c.477-.9 1.637-1.85 3.37-1.85 3.6 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.063 2.063 0 112.063 2.065zm1.782 13.019H3.552V9h3.567v11.452z" />
    </svg>
  );
}
