# Architecture decision records

Short notes on decisions that the code alone does not explain: what was decided, why, and what it costs. Each record is kept once accepted; a decision that changes gets a new record that supersedes the old one.

| # | Decision | Date |
|---|---|---|
| [0001](0001-protect-the-17track-quota.md) | Guard every 17TRACK registration with a shared, fail-closed quota check | 2026-09-28 |
| [0002](0002-tracking-number-in-the-path-for-cdn-caching.md) | Put the tracking number in the API path so the CDN can cache ready responses | 2026-09-28 |
| [0003](0003-separate-mapbox-tokens.md) | Use a separate, server-only Mapbox token for geocoding | 2026-09-28 |
| [0004](0004-language-neutral-api-data.md) | Keep API data language-neutral and write all text in the browser | 2026-09-22 |
| [0005](0005-netlify-deploys-from-a-production-branch.md) | Netlify builds from a `production` branch; GitHub Actions only checks | 2026-09-20 |

New record: copy the most recent one, take the next number, and add it to this table.
