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

## Sensory Tracker security setup

The Sensory Tracker uses Supabase Auth and Postgres. It is intentionally unavailable unless both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are configured. With Supabase configured, the local demo credentials are not accepted; student and mentor access is determined by the authenticated user's `public.profiles.role`.

1. Create a Supabase project and configure Email authentication, confirmation, and allowed redirect URLs for the local and deployed app origins.
2. Apply `supabase/migrations/20261008000100_sensory_tracker.sql` using the Supabase CLI or SQL editor.
3. Copy the Supabase URL and publishable/anon key into `.env.local` as the two `VITE_SUPABASE_*` variables. Never put a service-role key in the browser or a `VITE_` variable.
4. Create mentor users through the Supabase Auth dashboard. Promote them to mentor and assign students from the SQL editor using their Auth user IDs:

```sql
update public.profiles
set role = 'mentor'
where id = (select id from auth.users where email = 'mentor@example.com');

insert into public.mentor_student_assignments (mentor_id, student_id)
select mentor.id, student.id
from public.profiles mentor, public.profiles student
where mentor.id = (select id from auth.users where email = 'mentor@example.com')
	and student.id = (select id from auth.users where email = 'student@example.com');
```

The migration installs row-level security: check-ins are private by default, students can read/delete only their own entries, assigned mentors can read only explicitly shared entries, and mentor-help notifications are created only for explicit shared requests. Assignment management is deliberately unavailable to browser users. The student and mentor screens use the Supabase publishable key and rely on these database policies for authorization.

## Student interface languages

The existing **Accessibility → Language** selector is the only language control. Its React state in `src/App.jsx` drives the shared translation dictionary in `src/i18n.js`, including the dashboard, progress cards, session actions, learning assistant UI, and student sign-in/profile forms. English, Hindi, Bengali, Telugu, Marathi, Tamil, Gujarati, Kannada, Malayalam, and Punjabi are supported. The language selection remains in memory, as before, and resets to English on a full page reload. Student names, email addresses, session titles, descriptions, and other session/profile content remain unchanged.
