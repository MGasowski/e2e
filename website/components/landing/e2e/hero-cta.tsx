import { CopyCommandButton } from "./copy-command-button";
import { ButtonDust } from "./particles/button-dust";

export function HeroCta() {
  return (
    <div className="relative w-full sm:w-auto">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-x-72 -bottom-44 -top-44"
      >
        <ButtonDust density={0.14} />
      </div>
      <CopyCommandButton location="e2e_hero" className="w-full" />
    </div>
  );
}
