# Repository Guidelines

## Project Structure & Module Organization

CogniBridge is a React 18 single-page app built with Vite. `src/App.jsx` and `src/main.jsx` are the frontend entry points. Shared components and screens live in `src/components/`; student pages are in `src/components/student/pages/`, shared student UI in `src/components/student/shared/`, and Cogni-Flow chat components in `src/components/student/flow/`. Mentor screens are in `src/components/mentor/`. Shared data and translations live in `src/constants.js`, `src/studentActivity.js`, and `src/i18n.js`. Styles and static assets are under `src/`. The Vercel chat endpoint is `api/chat.js`; database migrations are in `supabase/migrations/`. `dist/` is generated output; do not edit it.

## Build, Test, and Development Commands

- `npm install` installs locked dependencies.
- `npm run dev` starts the Vite frontend; API routes are not available in this mode.
- `npx vercel dev` runs the app with local Vercel functions, including `/api/chat`.
- `npm run build` creates the production bundle in `dist/`.
- `npm run preview` serves the production bundle locally.

## Coding Style & Naming Conventions

Follow nearby JavaScript, JSX, and CSS conventions: two-space indentation, semicolons, single quotes in JavaScript, and functional React components. Use PascalCase for component filenames and names (for example, `SessionsPage.jsx`), camelCase for utilities and variables, and descriptive CSS filenames. Keep feature code in the existing student or mentor directories and put page-specific styles beside their components. No formatter or linter is configured.

## Testing Guidelines

No test framework or test script is configured. For code changes, run `npm run build`; for UI changes, inspect the affected screen at desktop and mobile widths. Use `npx vercel dev` when verifying the chat API locally. Include manual verification steps in the pull request.

## Configuration & Security

Use `.env.example` as the template for `.env.local`. Keep `OPENROUTER_API_KEY` server-side; never put secrets in frontend code or `VITE_` variables. Supabase browser configuration uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`; never expose a service-role key. Do not commit `.env.local`.

## Commits & Pull Requests

Recent commit subjects are informal and inconsistent. Write a short imperative subject describing the change. Pull requests should summarize user-visible changes, include verification steps, link a related issue when applicable, and provide screenshots for visual changes. Call out configuration or deployment changes.
