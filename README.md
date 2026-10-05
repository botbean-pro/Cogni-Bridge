# CogniBridge

CogniBridge is a Vite and React learning app. Cogni-Flow's chat interface is split into small components in `src/components/student/flow/`: the header, message list, composer, quick prompts, and interactive MCQ. The MCQ is generated from the conversation so it follows the student's question.

## Configure Cogni-Flow AI

The browser sends requests to `/api/chat`. That server endpoint calls OpenRouter, so the OpenRouter key stays on the server and is never included in the built JavaScript.

For local development, copy `.env.example` to `.env.local` and fill in:

```env
OPENROUTER_API_KEY=your_real_key
OPENROUTER_MODEL=your_provider_model_id
APP_URL=http://localhost:5173
```

Run the app with `npx vercel dev` so the local `/api/chat` serverless function is available. A plain `npm run dev` starts Vite only and does not run the API function.

For a deployed Vercel site, add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` under **Project Settings → Environment Variables**, then redeploy. `APP_URL` is optional. Never put the AI key in a `VITE_` variable, frontend code, or a committed file. `.env.local` is ignored by Git.

The example model value is intentionally a placeholder: set it to a model ID available to your OpenRouter account.

## Student learning stats

Student progress is currently stored in the browser, consistent with the prototype's existing student-profile storage. When a signed-in student marks a past session as attended, CogniBridge saves that session's ID, subject, scheduled date, and scheduled duration in a `cognibridge_learning_activity:<encoded-email>` local-storage entry. The dashboard derives attended session count, total duration, unique subjects, and the consecutive-day streak from those records. No database or environment-variable changes are required.

This is self-reported attendance and local browser storage, not server-verified attendance or secure cross-device persistence. The current prototype's client-side demo login cannot enforce server-side data isolation; Google identity is used only to scope the browser entry and is not server-verified. Use a verified authenticated backend and enforce per-student access there before deploying real student records.
