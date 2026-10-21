import { useEffect } from "react";
import { isReadingReply, isSpeaking, speak } from "./readAloud";

const READABLE = [
  "button", "a[href]", "summary", "label", "select", "textarea", "input:not([type=\"hidden\"])",
  "[role=\"button\"]", "[role=\"tab\"]", "[role=\"switch\"]", "[role=\"menuitem\"]", "[role=\"option\"]", "[role=\"link\"]",
].join(", ");
const HOVER_DELAY_MS = 200;
const MAX_LABEL_LENGTH = 300;

function labelFor(element) {
  const inputLabel = element.labels?.[0]?.innerText;
  const text = element.getAttribute("aria-label")
    || (element.matches("input, select, textarea") ? inputLabel || element.placeholder : element.innerText)
    || element.title
    || element.querySelector("img[alt]")?.alt
    || "";
  const label = text.replace(/\s+/g, " ").trim();
  if (label.length <= MAX_LABEL_LENGTH) return label;
  // Stop at a word boundary so long labels (session rows) don't end mid-word.
  return label.slice(0, label.lastIndexOf(" ", MAX_LABEL_LENGTH) > 0 ? label.lastIndexOf(" ", MAX_LABEL_LENGTH) : MAX_LABEL_LENGTH);
}

// While read aloud is on, reads the button, link or field under the mouse (or given keyboard focus).
export function useHoverReadAloud({ enabled, language, volume }) {
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let lastElement = null;
    let waiting = null;

    const readNow = (element) => {
      const label = labelFor(element);
      if (!label) return;
      speak(label, {
        language,
        volume,
        kind: "label",
        onEnd: () => {
          // Read whatever the mouse moved onto while this label was playing, if it's still there.
          const next = waiting;
          waiting = null;
          if (next && next === lastElement && next.matches(":hover")) readNow(next);
        },
      });
    };

    const read = (element) => {
      // Moving between a button's icon and its text is still the same button.
      if (element === lastElement) return;
      window.clearTimeout(timer);
      lastElement = element;
      if (!element) return;
      timer = window.setTimeout(() => {
        // A quick pass over a button shouldn't read it.
        if (isReadingReply() || (!element.matches(":hover") && element !== document.activeElement)) return;
        if (isSpeaking()) waiting = element;
        else readNow(element);
      }, HOVER_DELAY_MS);
    };

    const onPointerOver = (event) => {
      if (event.pointerType === "touch") return;
      read(event.target.closest?.(READABLE) || null);
    };
    const onFocusIn = (event) => {
      if (event.target.matches?.(":focus-visible") && event.target.matches(READABLE)) read(event.target);
    };

    document.addEventListener("pointerover", onPointerOver);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [enabled, language, volume]);
}
