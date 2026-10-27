import React, { useEffect, useRef } from "react";
import "./CursorFollower.css";

const interactiveSelector = "a[href], button, summary, select, input, textarea, label, [role='button'], [role='tab'], [tabindex]:not([tabindex='-1'])";

export function CursorFollower() {
  const ringRef = useRef(null);

  useEffect(() => {
    const ring = ringRef.current;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const root = document.documentElement;
    let frame = 0;
    let x = 0;
    let y = 0;
    let targetX = 0;
    let targetY = 0;
    let visible = false;

    const motionAllowed = () => {
      if (!finePointer.matches) {
        return false;
      }
      if (reducedMotion.matches) {
        return false;
      }
      if (root.dataset.motion === "off" || root.dataset.motion === "reduced") {
        return false;
      }
      if (root.dataset.lowSensory === "true") {
        return false;
      }
      return true;
    };

    const render = () => {
      x += (targetX - x) * 0.16;
      y += (targetY - y) * 0.16;
      ring.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      const distance = Math.abs(targetX - x) + Math.abs(targetY - y);
      if (distance > 0.1) {
        frame = requestAnimationFrame(render);
      } else {
        frame = 0;
      }
    };

    const hide = () => {
      visible = false;
      ring.dataset.state = "hidden";
    };

    const move = (event) => {
      if (event.pointerType !== "mouse" || !motionAllowed()) {
        if (visible) {
          hide();
        }
        return;
      }
      targetX = event.clientX;
      targetY = event.clientY;
      if (!visible) {
        x = targetX;
        y = targetY;
        visible = true;
      }
      if (event.target.closest && event.target.closest(interactiveSelector)) {
        ring.dataset.state = "link";
      } else {
        ring.dataset.state = "idle";
      }
      if (!frame) {
        frame = requestAnimationFrame(render);
      }
    };

    const pressDown = () => {
      ring.dataset.pressed = "true";
    };

    const pressUp = () => {
      ring.dataset.pressed = "false";
    };

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", pressDown, { passive: true });
    document.addEventListener("pointerup", pressUp, { passive: true });
    document.documentElement.addEventListener("mouseleave", hide);
    window.addEventListener("blur", hide);

    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", pressDown);
      document.removeEventListener("pointerup", pressUp);
      document.documentElement.removeEventListener("mouseleave", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return <div className="cursor-follower" ref={ringRef} data-state="hidden" data-pressed="false" aria-hidden="true" />;
}
