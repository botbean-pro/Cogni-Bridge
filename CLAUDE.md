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
- **Configured:** real Supabase Auth drives sign-in; `src/App.jsx` subscribes to `supabase.auth.onAuthStateChange`, then looks up the user's row in `public.profiles` to get `role` (`student` or `mentor`) and routes accordingly. With Supabase configured, the demo credentials stop working. The session is stored per browser tab (`sessionStorage` plus a per-tab storage key in `src/supabaseClient.js`), so a student, mentor and parent can be signed in side by side in different tabs; closing a tab signs that tab out.

`src/App.jsx` is the root state machine: it holds `signedIn`, `authRole`, `mentorOpen`, `activeTab`, etc., and branches at the top level between the mentor portal, profile-setup flows, and the main `StudentPage`. When changing auth/session logic, this file is the place to look.

### Routing

React Router (`BrowserRouter` in `src/main.jsx`) owns the URL, but auth is still App state: the URL decides *which page* shows, App state decides *who may see it*. `src/routes.js` maps student tabs to paths (`studentTabPaths`: `/my-learning`, `/sessions`, `/sessions/:id`, `/cogni-flow`, `/journal`, …); App derives `activeTab` and the open session from the URL, and its `setActiveTab` navigates. The mentor and parent portals keep their tab under `/mentor/:tab` and `/parent/:tab` via `useRouteTab`. Gated (`/journal`, `/careers`) or unknown URLs redirect home only after auth has settled, so reloads keep their page. `vercel.json` rewrites non-`/api` paths to `index.html` so deep links work in production. Add a new student page by adding a path to `studentTabPaths` and an entry in App's `pageContent`.

### Feature gating pattern

Features are gated by derived booleans rather than route guards. The Sensory Tracker appears for signed-in students in demo mode using in-memory-only preview data; in Supabase mode it requires a real authenticated student profile. `src/App.jsx` gates both the student nav tab and page content. Follow this pattern when adding features that depend on auth state.

Signed-out visitors only get tabs whose pages work without an account (Home, Sessions, Quiet space, Premium Flow, set in `StudentSidebar.jsx`); a tab that would only show a "sign in" wall belongs in the signed-in list. Student-only URLs (`/my-learning`, `/settings`, `/messages`, plus the existing `/journal` and `/careers`) redirect guests home in the gate effect in `App.jsx`.

### Phone layout

At 640px and below the side rails (student, parent, mentor) become a fixed bottom bar whose height is `--rail-h` (set in the phone block of `styles.css`, `0px` otherwise). Pages, toasts and full-height chats (`.wa-shell`, Cogni-Flow) size themselves from that variable, so don't hard-code the bar's height. A signed-in student's bar shows four tabs (`phoneBarTabs` in `StudentSidebar.jsx`) plus a **More** button; the other tabs and the account actions (bell, accessibility, settings, my account, log out) live in `StudentMoreSheet.jsx`, and the rail's own copies of them are hidden at this width. The mentor bar does the same (`MentorNavigation` in `MentorDashboard.jsx`, four tabs plus **More**); both sheets render `shared/RailMoreSheet.jsx`, which owns the open/close, Escape and focus behaviour. The bell's state is lifted into `useStudentNotifications` so the sheet and the rail share one badge and popup. Keep `backdrop-filter` off the bar on phones: it turns the bar into the containing block for `position:fixed` children and hides the student profile menu. When adding phone rules, put them after the base rule they override (equal specificity means the later one wins), and check with a real narrow viewport (360×640 and 390×844) because overflow only shows up there.

### Sensory Tracker (Supabase-backed feature)

`src/studentSensory.js` wraps Supabase table access for sensory check-ins (`sensory_checkins`, `sensory_notifications`, `mentor_student_assignments`, `profiles`) and provides a demo-only in-memory preview when Supabase is not configured. Demo entries are cleared on sign-out/reload and cannot be shared. The schema and row-level security policies are defined in `supabase/migrations/20261008000100_sensory_tracker.sql`: check-ins are private by default; a student must explicitly share a check-in before an assigned mentor can read it; mentor-help notifications are only created for explicit shared requests. Mentor-student assignment is deliberately not exposed to any UI — it's done via SQL in the Supabase dashboard. If you touch the Supabase path, read the migration file to understand its RLS policies before changing client queries.

### Parent portal (Supabase only)

Parents sign up from the sign-in modal's Parent tab (`account_type: "parent"` metadata makes the profile trigger create a `parent` role), then link to a child with a one-time code the student creates in Settings (`connect_parent_with_code`). `src/components/parent/` renders the portal with the same collapsible rail as the student shell; `src/parentPortal.js` is its data layer. Parents never query student tables directly: `child_checkins()` returns mood/emotion/energy/comfort/cause ratings only (written notes stay private to the student) and `child_sessions()` returns registrations with attendance and the mentor's 1–5 `attention_level`. Schema: `20261012000300_parent_portal.sql` (links, codes, parent–mentor messages) and `20261012000600_parent_portal.sql` (attention rating and the parent view functions). Parent–teacher messages (`parent_teacher_messages`) show on the parent's Teachers tab and the mentor's Parent messages tab (`/mentor/messages`); both re-read them every 5 seconds while visible, so there's no realtime subscription to maintain. Attendance lives in `session_registrations`; the older `student_learning_activity` table is no longer written by the app.

### Cogni-Flow AI chat

The browser never talks to OpenRouter directly. `src/components/student/flow/flowApi.js` posts to `/api/chat`; `api/chat.js` (a Vercel serverless function) holds `OPENROUTER_API_KEY`/`OPENROUTER_MODEL` server-side and proxies to OpenRouter. The endpoint supports three internal task modes (`chat`, `mcq`, and an internal `translate` used to re-localize chat results): each has its own system-prompt instructions and expects a specific JSON shape back from the model, with fallback handling if the model's output doesn't parse as JSON. When editing prompts or response shape, update both `api/chat.js` (the contract) and `flowApi.js`/`PracticeQuestion.jsx` (the consumers) together — they share an implicit JSON schema that isn't type-checked.

Handwriting analysis also goes through `/api/chat` (`task: "handwriting"`, with an `image` data URL instead of `messages`). The browser side is `classifyHandwritingSample` in `src/handwritingAnalysis.js`: it finds the writing on-device (ink compared with the paper around it, ignoring the sheet's edge against a table), crops to it, and sends that crop. The server asks `OPENROUTER_VISION_MODEL` (no default, so the OpenRouter key is only used with `OPENROUTER_MODEL` unless one is set; the chat model may be text-only) to measure spacing in letter widths and return one of the stored values `Open spacing` / `Balanced spacing` / `Compact spacing` via a strict JSON schema, retrying once on a transient failure. If the API is unreachable or no vision model is set (for example under `npm run dev`) the on-device ink-density check decides instead. Usage is recorded but never blocked by the daily chat limit.

### Google Meet links

The mentor schedule form's "Create Meet link" button calls `createMeetLink` (`src/mentorContent.js`), which posts to `api/meet.js`. That function checks the caller is a signed-in mentor, swaps `GOOGLE_REFRESH_TOKEN` (with `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`) for an access token and calls the Google Meet REST API (`POST /v2/spaces`), so every meeting belongs to one shared Google account. The refresh token comes from signing in once on the OAuth Playground with scope `meetings.space.created`; if the Google Auth Platform app is left in "Testing" it expires after 7 days. Pasting a link by hand still works when the API isn't configured.

### Student activity / stats

`src/studentActivity.js` is a pure, localStorage-backed module (key: `cognibridge_learning_activity:<encoded-email>`) that records self-reported session attendance and derives stats (sessions attended, total learning time, subjects explored, consecutive-day streak) via `calculateStudentStats`. This is independent of the Supabase sensory tracker and exists even in demo mode. It's self-reported and client-side only — not server-verified attendance.

### Screen-break timer

A signed-in student gets a 5-minute screen break after 30 minutes on the site. `src/breakTimer.js` keeps the timer in localStorage (`cognibridge_break_timer:<encoded-email-or-user-id>`), so it spans every page and open tab and a reload doesn't skip a break. It only counts while the tab is visible and the student has interacted in the last 5 minutes, and being away for 5 minutes starts it over. `useBreakTimer` in `src/components/student/BreakLockScreen.jsx` gives a toast 2 minutes ahead, sends a browser notification when the break starts (permission is asked once, on the first click after sign-in) and renders `BreakLockScreen`, which makes `#root` inert and shows a countdown with a new break idea every 30 seconds. App renders `{breakLock}` in each student-facing return, so add it to any new one. It's a nudge, not a secure lock: clearing site data skips it.

### Career Options by stream

`CareerOptionsPage.jsx` has two tabs: "Explore by stream" (default, `CareerStreamExplorer.jsx`) and the older handwriting-gated match quiz. The explorer is a three-step flow (stream → career → roadmap). `careerStreams.js` holds the data (6 streams × 6 careers: ids, icons, skills, entry routes, 1–5 "career mix" ratings) and `careerUniversities.js` lists the universities and institutes for each career, each linking to the institution's own website; entries with `body: true` are regulators or exam portals, shown in a separate "official sites" group. All visible text comes from the i18n catalog by naming convention (`cs_s_<stream>`, `cs_c_<career>` plus `_s`, `_try`, `_r1`–`_r4`, `cs_sk_<skill>`; see the comment at the top of `careerStreams.js`) in `i18nCareerStreams.js` and `i18nCareerPaths*.js`. Course, exam and institution names stay in English in every language on purpose. To add a career: add it to `careerStreams.js`, add its institution ids to `careerUniversities.js`, and add all 10 translations of its seven keys. A student's "dream career" is stored per student in localStorage (`cognibridge_career_dream:<encoded-email>`) and is only a preference. Motion follows `prefers-reduced-motion`, the Accessibility motion setting (`data-motion`) and low-sensory mode (`data-low-sensory`); keep any new animation behind the off-switch blocks at the bottom of `CareerStreamExplorer.css`. Re-check institution links now and then: many `.nic.in`/`.gov.in` sites block bots or non-Indian networks, so a failed check there is not proof a link is wrong, but a domain that doesn't resolve is.

### Component layout

- `src/components/student/` — student-facing shell (`StudentPage.jsx`, `StudentSidebar.jsx`, `StudentTopBar.jsx`) and `pages/` for individual screens (Home, Sessions, Flow, Leaderboard, Settings, SensoryTracker, etc.).
- `src/components/student/flow/` — Cogni-Flow chat UI, split into header/message-list/composer/quick-prompts/MCQ pieces plus `flowApi.js`.
- `src/components/mentor/` — mentor portal (`MentorPortal.jsx` as the login/dashboard switch, `pages/MentorDashboard.jsx`, `pages/MentorLoginPage.jsx`, `SensorySupportInbox.jsx`).
- `src/components/LearningPages.jsx` is a **compatibility re-export shim** — it just re-exports from `src/components/student/pages/*` and `src/components/student/shared/*` under old names (e.g. `StudyPage` is actually `SessionsPage`). Don't add new logic here; add it to the real module under `student/pages/` or `student/shared/` and re-export if something still imports the old name.
- `src/constants.js` holds demo credentials, seed session data, and the subject/language lookup tables used across student and mentor UI.

### Internationalization

`src/i18n.js` exports a flat `catalog` object keyed by string ID, where each value is a fixed-order array of translations (English, Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, Punjabi — see `localeIndexes`), plus a `translate(language, key, values)` lookup used as `t(key)` throughout the app. `src/App.jsx` owns the single `studentLanguage` state that drives `t`, passed down as a prop — there's no context/provider for it. The language selector lives only in the Accessibility panel (`AccessAndAuth.jsx`); the choice is saved in localStorage (`cognibridge_language`) so it survives reloads. When adding new UI strings, add a new catalog entry with all 10 translations rather than hardcoding English text. Note `learningLanguages` (in `constants.js`) extends the 10 Indian languages with French/German for a different purpose (the AI chat's response language) — don't confuse it with the UI's `indianLanguages`/i18n catalog, which only covers the 10.

## Security & Configuration

- Copy `.env.example` to `.env.local` for local secrets. Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` for Cogni-Flow AI. Never expose these through `VITE_`-prefixed variables or commit `.env.local` — only the server-side function may read them.
- Persistent Sensory Tracker entries and mentor sharing need `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`. Demo mode uses only in-memory preview data. Never put a Supabase service-role key in the browser or a `VITE_` variable.
- Treat browser localStorage and the demo auth path as prototype-only — not secure storage for real student records, and not server-verified.

## Coding conventions

Two-space indentation, semicolons, single-quoted JS strings. React components and their files are PascalCase (`StudentPage.jsx`); utilities/hooks are camelCase; CSS files use descriptive names (`flow.css`). Keep student and mentor code in their respective folders. No formatter or linter is configured — match the style of nearby code.
