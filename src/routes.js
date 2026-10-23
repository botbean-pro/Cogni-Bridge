import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Each student screen has its own URL so the browser's back/forward, refresh and bookmarks work.
export const studentTabPaths = {
  home: "/",
  about: "/about",
  sessions: "/sessions",
  study: "/my-learning",
  flow: "/cogni-flow",
  leaderboard: "/cogni-board",
  sensory: "/journal",
  calm: "/calm-corner",
  mindful: "/mindful-corner",
  relax: "/quiet-space",
  careers: "/careers",
  premium: "/premium-flow",
  settings: "/settings",
  messages: "/messages",
};

export const accountPaths = {
  createAccount: "/create-account",
  profileSetup: "/create-account/profile",
  account: "/account",
};

const tabsByPath = Object.fromEntries(Object.entries(studentTabPaths).map(([tab, path]) => [path, tab]));

export const normalizePath = (pathname) => pathname.replace(/\/+$/, "") || "/";

export const sessionPath = (sessionId) => `${studentTabPaths.sessions}/${encodeURIComponent(sessionId)}`;

export const mindfulActivityPath = (activityPath) => `${studentTabPaths.mindful}/${activityPath}`;

// Returns the student tab (and open session, if any) for a path, or a null tab for anything else.
export function parseStudentPath(pathname) {
  const path = normalizePath(pathname);
  const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
  if (sessionMatch) return { tab: "sessions", sessionId: decodeURIComponent(sessionMatch[1]) };
  if (/^\/mindful-corner\/[^/]+$/.test(path)) return { tab: "mindful", sessionId: null };
  return { tab: tabsByPath[path] || null, sessionId: null };
}

// A student's profile page in the mentor portal, opened from Settings.
export const mentorStudentPath = (studentId) => `/mentor/students/${encodeURIComponent(studentId)}`;

export const parseMentorStudentPath = (pathname) => {
  const match = normalizePath(pathname).match(/^\/mentor\/students\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
};

export const isPortalPath = (pathname, base) => {
  const path = normalizePath(pathname);
  return path === `/${base}` || path.startsWith(`/${base}/`);
};

// Tab state for the mentor and parent portals, kept in the URL (/mentor/notes, /parent/moods, ...).
export function useRouteTab(base, tabs, fallback = tabs[0]) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const requested = normalizePath(pathname).match(new RegExp(`^/${base}/([^/]+)$`))?.[1];
  const tab = tabs.includes(requested) ? requested : fallback;
  const setTab = useCallback((nextTab) => {
    navigate(nextTab === fallback ? `/${base}` : `/${base}/${nextTab}`);
  }, [base, fallback, navigate]);
  return [tab, setTab];
}
