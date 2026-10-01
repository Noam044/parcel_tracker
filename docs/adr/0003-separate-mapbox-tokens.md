# 0003. Use a separate, server-only Mapbox token for geocoding

- Status: accepted
- Date: 2026-09-28 (`f7b655d`)

## Context

The map in the browser needs a public Mapbox token, which anyone can read from the page. Mapbox lets you restrict a token to some URLs, checked against the `Referer` header, so that a copied token is useless elsewhere.

Geocoding (turning "Guangzhou, China" into coordinates) runs on the server, which sends no `Referer`. A URL-restricted token is therefore rejected there.

## Decision

Two tokens:

- `NEXT_PUBLIC_MAPBOX_TOKEN`: public, restricted to the site's URLs (and `http://localhost:3000` for development), used only by the browser;
- `MAPBOX_GEOCODING_TOKEN`: unrestricted, never sent to the browser, used only by `lib/tracking.ts`.

The server falls back to the public token when the second one is not set, so a local setup works with a single unrestricted token.

## Consequences

- A token copied from the page cannot be used from another site.
- The unrestricted token must never get a `NEXT_PUBLIC_` prefix, or Next.js would include it in the browser bundle.
- One more variable to set on Netlify. Without it, geocoding fails silently on a restricted public token: events without coordinates from the carrier then have no position on the map.
