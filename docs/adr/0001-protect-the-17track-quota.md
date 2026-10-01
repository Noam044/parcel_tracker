# 0001. Guard every 17TRACK registration with a shared, fail-closed quota check

- Status: accepted
- Date: 2026-09-28 (`f7b655d`)

## Context

Looking up a number with 17TRACK is free, but registering a new one costs one unit of a small quota (200 on the free plan), and anyone can type any number into the site. Without a guard, one visitor or a script could empty the quota in minutes and break the site for everybody.

Netlify runs the API route on several short-lived instances that share no memory, so an in-memory counter alone cannot enforce a global limit.

## Decision

Before every registration, `lib/quota.ts` asks 17TRACK for the remaining quota (`getquota`, free). 17TRACK is the only state that all instances share. Registration is refused when:

- today's registrations reach the stricter of `TRACK17_DAILY_REGISTER_LIMIT` (default 5) and the account's own daily limit;
- the remaining quota is down to `TRACK17_QUOTA_RESERVE` (default 20);
- the check itself fails or returns something unexpected (**fail closed**).

On top of that, in memory and per instance: 30 requests per minute and 3 registrations per hour per IP, no re-registration of a number registered in the last hour, and concurrent searches for the same number share one call.

## Consequences

- One extra request to 17TRACK per registration, never per lookup.
- When the budget is spent, new numbers show a neutral "daily limit reached" banner; numbers already tracked keep working.
- If 17TRACK's quota endpoint is down, nobody can register, even with quota left. This is accepted: losing the quota is worse than a few minutes without registrations.
- The per-IP limits can be exceeded by spreading requests across instances. They are a first barrier, not the guarantee.
- The daily limit set in the 17TRACK dashboard remains the last line of defence, whatever happens on the site.

Covered by `tests/quota.test.ts` and `tests/route.test.ts`.
