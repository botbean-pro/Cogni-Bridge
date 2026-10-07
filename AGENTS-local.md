# Repository Guidelines

## Project Structure

CogniBridge is a Vite and React application. The app entry and shared state live in `src/App.jsx`; reusable UI and page components are under `src/components/`. Student pages are in `src/components/student/pages/`, shared student UI in `shared/`, and Cogni-Flow chat pieces in `flow/`. Mentor screens are under `src/components/mentor/`. Shared data and translation logic are in `src/constants.js`, `src/studentActivity.js`, and `src/i18n.js`. Global styles are in `src/styles.css`, `src/design-system.css`, and `src/mentor.css`. Static assets are in `src/assets/`; the serverless AI endpoint is `api/chat.js`. There is no test directory or configured test framework.

## Build and Development

- `npm run dev` starts the Vite frontend for UI work.
- `npm run build` creates the production bundle in `dist/` and checks that the app compiles.
- `npm run preview` serves the production bundle locally.
- For local AI chat, use `npx vercel dev` as described in `README.md`; plain Vite does not serve `api/chat.js`.

## Code Style

Use the existing React and JavaScript patterns: functional components, hooks for state and effects, and named exports for page components. Indent JSX and JavaScript with two spaces. Use PascalCase for React component files and names (for example, `SessionsPage.jsx`), camelCase for functions and variables, and descriptive kebab-case class names for CSS. Keep page-specific styles beside their component and shared design rules in the existing global stylesheets. No formatter or linter is configured, so match nearby code and keep changes focused.

## Verification

There are no automated tests configured. Run `npm run build` after code changes. For visual changes, also inspect the affected page at desktop and mobile widths and exercise its main interactions. If you add a test framework, document its command and follow its established file naming convention.

## Commits and Pull Requests

Recent commit subjects use inconsistent styles, so no repository convention is established. Write short, imperative subjects, optionally scoped (for example, `sessions: improve mobile layout`). Pull requests should summarize the user-facing change, list verification performed, link a related issue when available, and include before/after screenshots for UI changes.

## Configuration and Security

Copy `.env.example` to `.env.local` for local secrets. Keep provider keys server-side in `api/`; never place secrets in frontend code or `VITE_` variables, and do not commit `.env.local`.
