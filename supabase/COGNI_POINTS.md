# Cogni Points rewards

Apply `migrations/20261022000200_cogni_points_rewards.sql` to the configured Supabase project before enabling the wallet in production. The app intentionally keeps the store disabled in local demo mode because browser storage cannot safely validate balances or redeem rewards.

## Default earning rule

The migration awards 10 points when the existing `mark_session_attended` RPC records a session as completed after its scheduled end. Students must have registered before the session ended. Attendance still follows the app's existing student check-in flow; the project does not connect to a meeting provider that can independently verify presence. The RPC is idempotent, and the award value is stored in `cogni_reward_settings`.

Change the default award from a trusted SQL session:

```sql
update public.cogni_reward_settings
set session_completion_points = 15, updated_at = now()
where id = true;
```

The subscription catalog seeds 7-day access for 500 points and 30-day access for 1,500 points. These are editable example prices:

```sql
update public.cogni_rewards set points_cost = 600 where reward_key = 'premium-7-days';
update public.cogni_rewards set enabled = false where reward_key = 'premium-30-days';
```

## Workshop setup

There is no separate workshop catalog in the app. A mentor's scheduled sessions are the source of truth. A trusted database administrator can make a session redeemable and optionally enforce seats:

```sql
update public.sessions
set is_cogni_workshop = true, reward_points = 1000, max_attendees = 20
where id = '<session-uuid>';
```

Only explicitly configured future sessions appear in the store. Session registration and points redemption both check a configured seat limit. `max_attendees = null` means capacity is not tracked.

Catalog and award changes are database configuration, not a public admin API. The current profile roles only include `student` and `mentor`; there is no administrator UI or role, so catalog writes are intentionally restricted to trusted SQL/migration access.

## Entitlements

Subscription reward redemptions create persistent `cogni_entitlements`. If a student redeems while a previous reward is active, the new duration starts at the current entitlement's latest expiry. `get_cogni_wallet` returns only the current unexpired entitlement; the account settings show the entitlement and expiry. This project does not currently implement feature-level premium authorization checks or integrate a payment provider, so a premium reward is persisted as an entitlement but does not unlock new gated application features until those gates are added.
