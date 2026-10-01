# Security policy

## Supported versions

Only the live site ([noam-s-parcel-tracker.netlify.app](https://noam-s-parcel-tracker.netlify.app)) and the latest commit on `main` are supported. There are no released versions.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub instead: go to the repository's **Security** tab and click **Report a vulnerability**.

Include what you can of:

- what an attacker can do, and what they need beforehand;
- the steps or the request needed to reproduce it;
- the affected URL, file or endpoint.

You should get an answer within a week. Once the issue is confirmed, a fix is deployed and the advisory is published, with credit if you want it.

## Scope

Particularly welcome:

- reading the 17TRACK API key or the server-side Mapbox geocoding token;
- getting `/api/track` to register numbers (spending 17TRACK quota) from another site, or beyond the limits described in the [README](README.md#protecting-the-free-17track-quota);
- script injection, for example through carrier text shown in the history or in map popups;
- bypassing the Content Security Policy or the other security headers set in `next.config.ts`.

Known and accepted, so out of scope:

- the public Mapbox token is visible in the browser: it is meant to be, and is restricted to the site's URLs;
- the per-IP rate limits live in memory on each server instance, so several instances each apply their own (the shared protection is the daily quota check, see [ADR 0001](docs/adr/0001-protect-the-17track-quota.md));
- volumetric denial of service against Netlify or 17TRACK.

Please test against your own local copy (`npm run dev` with your own keys) rather than the live site, whose 17TRACK quota is small.
