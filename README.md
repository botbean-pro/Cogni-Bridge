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
