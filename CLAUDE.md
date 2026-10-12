# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm install` — install dependencies.
- `npx vercel dev` — run the app **and** the local Vercel serverless function at `/api/chat`. Use this whenever you're touching Cogni-Flow AI or anything that calls the chat API.
- `npm run dev` — Vite only, no API routes. Fine for UI-only work that doesn't touch `/api/chat`.
- `npm run build` — production build to `dist/` (do not edit `dist/` directly).
- `npm run preview` — serve the built bundle for a visual check.

There is no lint or test script configured. Verify changes by running the affected screen with `npx vercel dev` (required when API behavior changes) and, for build-affecting changes, confirming `npm run build` succeeds.

## Architecture

### Dual auth system — know which mode you're in

The app runs in one of two auth modes, decided entirely by whether `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set (`src/supabaseClient.js` exports `supabaseConfigured`):

- **Not configured (default/demo mode):** student accounts live in `localStorage` (`cognibridge_students`, seeded from `demoStudents` in `src/constants.js`), and mentor login is a hardcoded check against `MENTOR_EMAIL`/`MENTOR_PASSWORD` in `src/components/mentor/MentorPortal.jsx`. This is prototype-only — not secure, not multi-device.
- **Configured:** real Supabase Auth drives sign-in; `src/App.jsx` subscribes to `supabase.auth.onAuthStateChange`, then looks up the user's row in `public.profiles` to get `role` (`student` or `mentor`) and routes accordingly. With Supabase configured, the demo credentials stop working.

`src/App.jsx` is the root state machine: it holds `signedIn`, `authRole`, `mentorOpen`, `activeTab`, etc., and branches at the top level between the mentor portal, profile-setup flows, and the main `StudentPage`. When changing auth/session logic, this file is the place to look — do not assume route-based navigation; it's all conditional rendering driven by this state.

### Feature gating pattern

Features are gated by derived booleans rather than route guards. The Sensory Tracker appears for signed-in students in demo mode using in-memory-only preview data; in Supabase mode it requires a real authenticated student profile. `src/App.jsx` gates both the student nav tab and page content. Follow this pattern when adding features that depend on auth state.

### Sensory Tracker (Supabase-backed feature)

`src/studentSensory.js` wraps Supabase table access for sensory check-ins (`sensory_checkins`, `sensory_notifications`, `mentor_student_assignments`, `profiles`) and provides a demo-only in-memory preview when Supabase is not configured. Demo entries are cleared on sign-out/reload and cannot be shared. The schema and row-level security policies are defined in `supabase/migrations/20261008000100_sensory_tracker.sql`: check-ins are private by default; a student must explicitly share a check-in before an assigned mentor can read it; mentor-help notifications are only created for explicit shared requests. Mentor-student assignment is deliberately not exposed to any UI — it's done via SQL in the Supabase dashboard. If you touch the Supabase path, read the migration file to understand its RLS policies before changing client queries.

### Cogni-Flow AI chat

The browser never talks to OpenRouter directly. `src/components/student/flow/flowApi.js` posts to `/api/chat`; `api/chat.js` (a Vercel serverless function) holds `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` server-side and proxies to OpenRouter. The endpoint supports three internal task modes (`chat`, `mcq`, and an internal `translate` used to re-localize chat results): each has its own system-prompt instructions and expects a specific JSON shape back from the model, with fallback handling if the model's output doesn't parse as JSON. When editing prompts or response shape, update both `api/chat.js` (the contract) and `flowApi.js`/`PracticeQuestion.jsx` (the consumers) together — they share an implicit JSON schema that isn't type-checked.

### Student activity / stats

`src/studentActivity.js` is a pure, localStorage-backed module (key: `cognibridge_learning_activity:<encoded-email>`) that records self-reported session attendance and derives stats (sessions attended, total learning time, subjects explored, consecutive-day streak) via `calculateStudentStats`. This is independent of the Supabase sensory tracker and exists even in demo mode. It's self-reported and client-side only — not server-verified attendance.

### Component layout

- `src/components/student/` — student-facing shell (`StudentPage.jsx`, `StudentSidebar.jsx`, `StudentTopBar.jsx`) and `pages/` for individual screens (Home, Sessions, Flow, Leaderboard, Settings, SensoryTracker, etc.).
- `src/components/student/flow/` — Cogni-Flow chat UI, split into header/message-list/composer/quick-prompts/MCQ pieces plus `flowApi.js`.
- `src/components/mentor/` — mentor portal (`MentorPortal.jsx` as the login/dashboard switch, `pages/MentorDashboard.jsx`, `pages/MentorLoginPage.jsx`, `SensorySupportInbox.jsx`).
- `src/components/LearningPages.jsx` is a **compatibility re-export shim** — it just re-exports from `src/components/student/pages/*` and `src/components/student/shared/*` under old names (e.g. `StudyPage` is actually `SessionsPage`). Don't add new logic here; add it to the real module under `student/pages/` or `student/shared/` and re-export if something still imports the old name.
- `src/constants.js` holds demo credentials, seed session data, and the subject/language lookup tables used across student and mentor UI.

### Internationalization

`src/i18n.js` exports a flat `catalog` object keyed by string ID, where each value is a fixed-order array of translations (English, Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi — see `localeIndexes`), plus a `translate(language, key, values)` lookup used as `t(key)` throughout the app. `src/App.jsx` owns the single `studentLanguage` state that drives `t`, passed down as a prop — there's no context/provider for it. The language selector lives only in the Accessibility panel (`AccessAndAuth.jsx`); it resets to English on reload (in-memory only, not persisted). When adding new UI strings, add a new catalog entry with all 10 translations rather than hardcoding English text. Note `learningLanguages` (in `constants.js`) extends the 10 Indian languages with French/German for a different purpose (the AI chat's response language) — don't confuse it with the UI's `indianLanguages`/i18n catalog, which only covers the 10.

## Security & Configuration

- Copy `.env.example` to `.env.local` for local secrets. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for Cogni-Flow AI. Never expose these through `VITE_`-prefixed variables or commit `.env.local` — only the server-side function may read them.
- Persistent Sensory Tracker entries and mentor sharing need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. Demo mode uses only in-memory preview data. Never put a Supabase service-role key in the browser or a `VITE_` variable.
- Treat browser localStorage and the demo auth path as prototype-only — not secure storage for real student records, and not server-verified.

## Coding conventions

Two-space indentation, semicolons, single-quoted JS strings. React components and their files are PascalCase (`StudentPage.jsx`); utilities/hooks are camelCase; CSS files use descriptive names (`flow.css`). Keep student and mentor code in their respective folders. No formatter or linter is configured — match the style of nearby code.
