import { useEffect } from "react";

// Browser tab title for the screen on show, e.g. "CogniBridge · Mentor · Schedule".
export function usePageTitle(...parts) {
  const title = ["CogniBridge", ...parts].filter(Boolean).join(" · ");
  useEffect(() => {
    document.title = title;
  }, [title]);
}
