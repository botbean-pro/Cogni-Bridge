import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Apple, Eye, Footprints, GlassWater, PersonStanding, Smile, Sun, Wind } from "lucide-react";
import { BREAK_MS, breakStorageKey, readBreakState, tickBreakTimer } from "../../breakTimer";
import { stopSpeaking } from "./flow/readAloud";
import "./BreakLockScreen.css";

const TICK_MS = 5000;
const TIP_MS = 30 * 1000;
// Without a click, key press or scroll for this long the student has probably walked away, so the
// timer pauses instead of locking an empty room.
const INACTIVE_MS = 5 * 60 * 1000;
const PERMISSION_ASKED_KEY = "cognibridge_break_notify_asked";
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll", "mousemove"];

const tips = [
  { key: "breakTipWalk", Icon: Footprints },
  { key: "breakTipWater", Icon: GlassWater },
  { key: "breakTipStretch", Icon: PersonStanding },
  { key: "breakTipEyes", Icon: Eye },
  { key: "breakTipBreathe", Icon: Wind },
  { key: "breakTipAir", Icon: Sun },
  { key: "breakTipSnack", Icon: Apple },
  { key: "breakTipFamily", Icon: Smile },
];

function askNotificationPermission() {
  try {
    if (!("Notification" in window) || Notification.permission !== "default") return;
    if (localStorage.getItem(PERMISSION_ASKED_KEY)) return;
    localStorage.setItem(PERMISSION_ASKED_KEY, "1");
    Notification.requestPermission()?.catch?.(() => {});
  } catch { /* Notifications are optional; the lock screen still appears. */ }
}

function sendBreakNotification(t) {
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    // The tag stops two open tabs from stacking two notifications.
    new Notification(t("breakNotifyTitle"), { body: t("breakNotifyBody"), tag: "cognibridge-break" });
  } catch { /* Some mobile browsers only allow notifications from a service worker. */ }
}

// Counts a signed-in student's on-screen time across every page and tab, warns two minutes ahead,
// sends a notification at 30 minutes and returns when the 5-minute break ends (0 when unlocked).
export function useBreakTimer({ studentKey, enabled, t, onNotice }) {
  const [lockUntil, setLockUntil] = useState(0);
  const latest = useRef({ t, onNotice });
  latest.current = { t, onNotice };

  useEffect(() => {
    if (!enabled || !studentKey) {
      setLockUntil(0);
      return undefined;
    }
    let lastInteraction = Date.now();
    let wasLocked = false;
    let unlockTimer = 0;
    const apply = (until) => {
      const locked = until > Date.now();
      if (wasLocked && !locked) latest.current.onNotice(latest.current.t("breakOverToast"));
      wasLocked = locked;
      setLockUntil(locked ? until : 0);
      window.clearTimeout(unlockTimer);
      // Unlock on the second the break ends instead of waiting for the next tick.
      if (locked) unlockTimer = window.setTimeout(tick, until - Date.now() + 50);
    };
    function tick() {
      const now = Date.now();
      const visible = document.visibilityState === "visible" && now - lastInteraction < INACTIVE_MS;
      const result = tickBreakTimer(studentKey, { visible, now });
      if (result.event === "warning") latest.current.onNotice(latest.current.t("breakSoonToast"));
      if (result.event === "lockStarted") sendBreakNotification(latest.current.t);
      apply(result.lockUntil);
    }
    const interact = () => { lastInteraction = Date.now(); };
    const askOnce = () => {
      window.removeEventListener("pointerdown", askOnce);
      askNotificationPermission();
    };
    const visibility = () => { if (document.visibilityState === "visible") interact(); tick(); };
    // Another tab started or finished the break.
    const storage = (event) => { if (event.key === breakStorageKey(studentKey)) apply(readBreakState(studentKey).lockUntil); };

    tick();
    const interval = window.setInterval(tick, TICK_MS);
    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, interact, { passive: true }));
    window.addEventListener("pointerdown", askOnce);
    window.addEventListener("storage", storage);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(unlockTimer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, interact));
      window.removeEventListener("pointerdown", askOnce);
      window.removeEventListener("storage", storage);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [enabled, studentKey]);

  return lockUntil;
}

const formatRemaining = (ms) => {
  const seconds = Math.ceil(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
};

// Full-screen break that can't be dismissed. Rendered into <body> and the app behind it made inert,
// so clicks, keyboard focus and screen readers can't reach the page until the timer runs out.
export function BreakLockScreen({ lockUntil, t }) {
  const [now, setNow] = useState(Date.now());
  const [skipped, setSkipped] = useState(0);
  const dialog = useRef(null);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const root = document.getElementById("root");
    const previousFocus = document.activeElement;
    if (root) root.inert = true;
    document.documentElement.classList.add("break-locked");
    stopSpeaking();
    document.querySelectorAll("video, audio").forEach((media) => media.pause());
    dialog.current?.focus();
    return () => {
      if (root) root.inert = false;
      document.documentElement.classList.remove("break-locked");
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, []);

  const remaining = Math.max(0, lockUntil - now);
  const progress = Math.min(1, 1 - remaining / BREAK_MS);
  // Start on a different idea each break, then show a new one every 30 seconds.
  const tipIndex = (Math.floor(lockUntil / 1000) + Math.floor((BREAK_MS - remaining) / TIP_MS) + skipped) % tips.length;
  const { key: tipKey, Icon: TipIcon } = tips[tipIndex];
  const radius = 54;
  const circumference = 2 * Math.PI * radius;

  return createPortal(
    <div className="break-lock" role="dialog" aria-modal="true" aria-labelledby="break-lock-title" aria-describedby="break-lock-intro" tabIndex={-1} ref={dialog}>
      <div className="break-lock-card">
        <h2 id="break-lock-title">{t("breakTitle")}</h2>
        <p id="break-lock-intro">{t("breakIntro")}</p>
        <div className="break-lock-timer">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle className="break-lock-track" cx="60" cy="60" r={radius} />
            <circle className="break-lock-progress" cx="60" cy="60" r={radius} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} />
          </svg>
          <div>
            <span>{t("breakUnlocksIn")}</span>
            <strong>{formatRemaining(remaining)}</strong>
          </div>
        </div>
        <div className="break-lock-tip-slot" aria-live="polite">
          <div className="break-lock-tip" key={tipIndex}>
            <span className="break-lock-tip-icon"><TipIcon size={26} aria-hidden="true" /></span>
            <div>
              <span className="break-lock-tip-label">{t("breakTryThis")}</span>
              <p>{t(tipKey)}</p>
            </div>
          </div>
        </div>
        <button type="button" className="break-lock-next" onClick={() => setSkipped((count) => count + 1)}>{t("breakAnotherIdea")}</button>
      </div>
    </div>,
    document.body,
  );
}
