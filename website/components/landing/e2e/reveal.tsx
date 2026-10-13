"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Section entrance trigger: flips data-shown once as the section approaches
 * the viewport. Elements inside opt in with data-reveal (dissolve + rise) or
 * data-reveal-slide (rise only, for elements whose opacity is scroll-driven),
 * staggered via --reveal-i; the styles live in globals.css under .ta-e2e.
 * The wrapper itself never carries a transform, keeping position: sticky
 * inside the section intact.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} data-shown={shown ? "" : undefined} className={className}>
      {children}
    </div>
  );
}
