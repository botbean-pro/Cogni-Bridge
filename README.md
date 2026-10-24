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

The Sensory Tracker appears for signed-in students in both auth modes. Without Supabase, it runs as a demo preview: entries stay in memory for the current session, clear on reload or sign-out, and cannot be shared with mentors. Use test details only in this mode. For persistent check-ins and mentor support, configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. With Supabase configured, the local demo credentials are not accepted; student and mentor access is determined by the authenticated user's `public.profiles.role`.

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

## Career Options by stream

Class 12 students see two tabs on the **Careers** page: **Explore by stream** (the default) and **Match me with a quiz** (the older handwriting-gated quiz). The explorer is a three-step flow: pick a stream (Science PCM, Science PCB, Commerce, Arts & Humanities, Creative & Design, Skills & Vocational), pick one of its six careers, then read the roadmap, skills, "ways in", a "try this week" activity and links to universities and official exam sites. A student can mark a career as their dream; it is saved in this browser only (`cognibridge_career_dream:<encoded-email>`).

The data lives in `src/components/student/pages/careerStreams.js` (streams and careers) and `careerUniversities.js` (institutions, with links to each one's own website). All visible text comes from `src/i18nCareerStreams.js` and `src/i18nCareerPaths*.js`. See "Career Options by stream" in `CLAUDE.md` for how to add a career.

To try it without touching the real Supabase project in `.env.local`, run `VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npx vite`. Demo students have no class, so the Careers tab stays hidden until you add `studentClass: "12"` to a student in the `cognibridge_students` local-storage entry. Do not sign in or create accounts against the real project to test this.

### Needs human verification

An automated build and a headless-Chromium run in demo mode passed (stream → career → roadmap, dream toggle, reduced-motion and low-sensory modes, light and dark theme, Hindi and Malayalam, 390px phone width). Everything below could not be checked that way and needs a person.

**Content accuracy**

- [ ] Translations: all ~360 new strings were machine-written in 10 languages. Have a native speaker read each language, especially Tamil, Malayalam, Kannada, Telugu and Punjabi. The word for "stream" differs by language (for example বিভাগ in Bengali, शाखा in Marathi).
- [ ] Career facts: course and exam names, durations (such as MBBS being about 5½ years), "NEET UG for veterinary", the CUET, JEE and NATA references, and the RPwD Act 2016 wording in the support notes. These came from general knowledge, not official sources.
- [ ] Which institution offers which course: only the existence of each website was checked, not its catalogue. Look closely at SVNIRTAR and NIEPMD for physiotherapy, Presidency and GIPE for economics, and IIMC, ACJ, FTII and SRFTI for journalism and film (some are mostly postgraduate).
- [ ] The six streams, the six careers in each, and the 1–5 "career mix" ratings (thinking, creativity, people, hands) are editorial choices. Confirm they suit your students.

**Links (click each from an Indian network)**

- [ ] These 15 could not be confirmed from the build machine. Thirteen timed out (Council of Architecture, DGT, GIPE, Jamia Hamdard, Handicrafts, IIIT Delhi, JIPMER, Jadavpur University, MDNIY, NIELIT, NIEPMD, PGIMER, TISS) and two returned 403 to a bot (Ashoka, ICT Mumbai). The domains are believed correct; open each one.
- [ ] Spot-check the rest of the ~110 links open the right institution in a new tab.

**Behaviour to click through**

- [ ] Careers is the default tab and the quiz tab still needs a handwriting sample, then still works.
- [ ] Stream cards → career grid → roadmap; the **Change stream** and **Surprise me** buttons; the dream toggle (save, remove, reload keeps it).
- [ ] Switching language mid-flow, in dark and light themes, with no clipped or overlapping text in the longer languages.
- [ ] Phone widths 360×640 and 390×844 with the bottom bar: no horizontal scroll, cards stack, roadmap stacks, university cards go single-column.
- [ ] Keyboard only: Tab order, Enter on a stream card moves focus to the next heading, visible focus ring.
- [ ] Accessibility settings: motion off and reduced, low-sensory mode, and the OS "reduce motion" setting all stop the animations and show every roadmap step.
- [ ] Supabase mode with a real Class 12 student account (only demo mode was tested).
- [ ] Firefox and Safari, and large browser text sizes (only Chromium was tested).
- [ ] A screen reader reads the stream cards, the dream toggle status, the career-mix meters and the "opens in a new tab" link labels sensibly.

**Known issue, not part of this feature**

- The "Explore Career & Vocational Opportunities" section below the explorer overflows the page by 14px at viewport widths of about 900–1024px.
