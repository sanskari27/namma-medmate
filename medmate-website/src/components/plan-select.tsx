"use client";

import { useEffect } from "react";

/** "Get started" on a pricing card pre-selects that plan in the demo form below. */
export function PlanSelect() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLElement>("[data-plan]");
      const select = document.querySelector<HTMLSelectElement>("select[name=plan]");
      if (!a || !select) return;
      const match = [...select.options].find((o) => o.value.startsWith(a.dataset.plan!));
      if (match) select.value = match.value;
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  return null;
}
