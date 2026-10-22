# Pushed changes — 22 Oct 2026 (temporary)

Temporary note on what is now on `main` (and `harsh-dev`). Delete this file once everyone has caught up.

## Student

- **Cogni-Flow documents**: the 📎 button in the chat accepts PDF, Word (.docx), .txt and .md files and turns them into a study pack with Summary, Mind map, Outline and Flashcards tabs. Files are read in the browser; only the text is sent to the AI (first 8,000 characters).
- **Voice input** (from the remote) now sits next to the upload button.
- **Premium Flow unlocks unlimited Cogni-Flow**: the purchase is stored in Supabase and `/api/chat` skips the daily token limit while a plan is active. Premium redeemed with Cogni-Points counts too. The usage meter shows "Premium Flow · Unlimited Cogni-Flow".
- **Register is a toggle**: tapping "Registered" again cancels the registration. Sessions already attended stay registered.
- **Handwriting** analysis only appears for new accounts and lives in Settings (Type 1–4). The handwriting card was removed from the Sessions page.
- **Mindful Corner**: the Music and Sound Explorer and its Sound setting were removed.
- **Settings**: account cards have proper padding; pop-up messages have a close (×) button.

## Mentor and parent

- **WhatsApp-style chat on both sides**: mentors see every linked parent in a sidebar; parents see every mentor of each of their children. Unread badges, date dividers, search and a phone layout.
- **Fake parent accounts** for demos: `supabase/demo_parent_seed.sql` (logins `parent.N@cognibridge.test` / `Parent@1234`, skips harsh@cognibridge.com).

## Everywhere

- **Dark mode fixes** for Mindful Corner, the Relaxation Room, the Cogni Board points card, the journal (including its low-sensory switch), the home page learning-path section, session buttons and pastel chips. Harsh's minimalist dark palette is merged on top.
- **Browser tab titles** follow the portal and page, e.g. "CogniBridge · Mentor · Schedule".
- **Merged harsh-dev**: Cogni-Points wallet and rewards.

## SQL to run in the Supabase SQL Editor (in this order)

1. `20261022000100_mentor_parent_chat.sql` — lets mentors list the parents of their students.
2. `20261022000200_cogni_points_rewards.sql` — Harsh's Cogni-Points wallet and rewards.
3. `20261022000250_premium_flow.sql` — Premium Flow storage and the unlimited-token check (safe to re-run).
4. `20261022000300_unregister_from_session.sql` — needed for cancelling a registration.
5. Optional: `supabase/demo_parent_seed.sql` for the fake parents.

## Still in progress

- Session publishing failing for some mentors, notifications popup, Cogni-Flow adapting to check-ins, Mindful Corner crash.
