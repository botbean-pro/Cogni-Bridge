import React, { useEffect, useRef } from "react";
import "./CursorFollower.css";

const interactiveSelector = "a[href], button, summary, select, input, textarea, label, [role='button'], [role='tab'], [tabindex]:not([tabindex='-1'])";

// A soft ring that trails the pointer a moment behind it. It is decoration only: the real cursor stays visible,
// the ring ignores clicks, and it never appears on touch screens or when motion is turned down
// (system setting, the Accessibility motion choice or low-sensory mode).
export function CursorFollower() {
  const ringRef = useRef(null);

  useEffect(() => {
    const ring = ringRef.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    const motionAllowed = () => finePointer.matches && !reducedMotion.matches
      && !["off", "reduced"].includes(root.dataset.motion) && root.dataset.lowSensory !== "true";
    let frame = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let visible = false;

    const render = () => {
      x += (targetX - x) * 0.16;
      y += (targetY - y) * 0.16;
      ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      frame = Math.abs(targetX - x) + Math.abs(targetY - y) > 0.1 ? requestAnimationFrame(render) : 0;
    };
    const hide = () => {
      visible = false;
      ring.dataset.state = "hidden";
    };
    const move = (event) => {
      if (event.pointerType !== "mouse" || !motionAllowed()) {
        if (visible) hide();
        return;
      }
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        // Start under the pointer so the ring doesn't sweep in from the corner.
        x = targetX;
        y = targetY;
        visible = true;
      }
      ring.dataset.state = event.target.closest?.(interactiveSelector) ? "link" : "idle";
      if (!frame) frame = requestAnimationFrame(render);
    };
    const press = (pressed) => () => { ring.dataset.pressed = String(pressed); };
    const pressDown = press(true);
    const pressUp = press(false);

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", pressDown, { passive: true });
    document.addEventListener("pointerup", pressUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", hide);
    window.addEventListener("blur", hide);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", pressDown);
      document.removeEventListener("pointerup", pressUp);
      document.documentElement.removeEventListener("mouseleave", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return <div className="cursor-follower" ref={ringRef} data-state="hidden" data-pressed="false" aria-hidden="true" />;
}
