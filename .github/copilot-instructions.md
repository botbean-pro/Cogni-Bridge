# Copilot instructions

## Commands

Run these from `cogni-bridge/`:

- `npm install` installs dependencies from the lockfile.
- `npm run dev` starts Vite for frontend-only work; it does not serve `/api/chat`.
- `npx vercel dev` runs the app with the local Vercel function and is required to exercise Cogni-Flow chat locally.
- `npm run build` builds the production bundle in `dist/`; do not edit generated output.
- `npm run preview` serves the production build.

There is no configured test runner, test script, or linter. For code changes, use `npm run build`; for API changes, also verify with `npx vercel dev`.

## Architecture

- This is a React 18 single-page app built with Vite. `src/main.jsx` mounts `src/App.jsx`; `App.jsx` owns shared application state and conditionally renders the student and mentor experiences. Navigation is state-driven, not route-driven.
- Authentication has two modes, determined by `supabaseConfigured` in `src/supabaseClient.js`. Without Supabase environment variables, the prototype uses browser local storage and demo accounts. With `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, Supabase Auth and `public.profiles.role` determine student or mentor access; demo login is not used.
- Student UI lives under `src/components/student/` (individual pages in `pages/`, reusable UI in `shared/`, and Cogni-Flow chat in `flow/`). Mentor UI lives under `src/components/mentor/`. `src/components/LearningPages.jsx` is a compatibility re-export shim: put implementation in the real student page/shared module, not in the shim.
- Cogni-Flow requests go from `src/components/student/flow/flowApi.js` to `/api/chat`, implemented by `api/chat.js`, which calls OpenRouter server-side. The `chat`, `mcq`, and `translate` tasks have response contracts shared by the endpoint and browser consumers. Update the producer and its consumers together when changing a prompt or response shape.
- Data has distinct storage paths: `src/studentActivity.js` derives self-reported learning stats from browser local storage; Supabase-backed sensory check-ins and mentor content use their helpers in `src/studentSensory.js` and `src/mentorContent.js`. Sensory authorization relies on the row-level security policies in `supabase/migrations/`; read the relevant migration before changing its queries or access behavior. Apply schema changes through migrations.
- UI translations are in `src/i18n.js`; `src/App.jsx` owns the language state and passes translation behavior down. Catalog entries are fixed-order arrays for the ten supported UI languages. Add translated catalog entries for new UI text instead of hardcoding English in a translated screen.

## Codebase conventions and configuration

- Follow nearby code formatting (two-space indentation, semicolons, functional React components and hooks); quote style varies across existing files. Keep student and mentor features in their respective component trees, and keep page-specific styles beside their page.
- Use `.env.example` to configure local `.env.local`. `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` are server-side settings for `api/chat.js`; never expose them through frontend code or `VITE_` variables. Only the Supabase URL and publishable/anon key belong in `VITE_SUPABASE_*`; never expose a service-role key.
- Browser local storage and demo authentication are prototype-only, not secure or cross-device persistence for real student records.
