import { useEffect } from "react";
import { isReadingLabel, isReadingReply, speak, stopSpeaking } from "./readAloud";

const INTERACTIVE = [
  "button", "a[href]", "summary", "label", "select", "textarea", "input:not([type=\"hidden\"])",
  "[role=\"button\"]", "[role=\"tab\"]", "[role=\"switch\"]", "[role=\"menuitem\"]", "[role=\"option\"]", "[role=\"link\"]",
].join(", ");
// Plain text is read too, so headings and descriptions aren't silent.
const TEXT_BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, dt, dd, th, td, figcaption, blockquote, [data-read-aloud]";
// Long enough that sweeping the mouse across the page reads nothing.
const HOVER_DELAY_MS = 450;
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

// A control wins over the text inside it, so a card button reads as one thing.
const readableFrom = (target) => target?.closest?.(INTERACTIVE) || target?.closest?.(TEXT_BLOCKS) || null;

// While read aloud is on, reads whatever is under the mouse (or given keyboard focus) once it rests there.
export function useHoverReadAloud({ enabled, language, volume }) {
  useEffect(() => {
    if (!enabled) return undefined;
    let timer = null;
    let lastElement = null;

    const stillThere = (element) => element === lastElement && (element.matches(":hover") || element === document.activeElement);

    const read = (element) => {
      // Moving between a button's icon and its text is still the same button.
      if (element === lastElement) return;
      window.clearTimeout(timer);
      lastElement = element;
      // Leaving a label stops it, so nothing is read after the mouse has already moved on.
      if (isReadingLabel()) stopSpeaking();
      if (!element) return;
      timer = window.setTimeout(() => {
        if (isReadingReply() || !stillThere(element)) return;
        const label = labelFor(element);
        if (label) speak(label, { language, volume, kind: "label", stillWanted: () => stillThere(element) });
      }, HOVER_DELAY_MS);
    };

    const onPointerOver = (event) => {
      if (event.pointerType === "touch") return;
      read(readableFrom(event.target));
    };
    const onPointerLeave = () => read(null);
    const onFocusIn = (event) => {
      if (event.target.matches?.(":focus-visible") && event.target.matches(INTERACTIVE)) read(event.target);
    };

    document.addEventListener("pointerover", onPointerOver);
    document.documentElement.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerover", onPointerOver);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, [enabled, language, volume]);
}
