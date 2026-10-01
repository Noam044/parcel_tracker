# 0002. Put the tracking number in the API path so the CDN can cache ready responses

- Status: accepted
- Date: 2026-09-28 (`f6d5408`)

## Context

A parcel's data changes a few times a day at most, but people refresh the page, share links and come back to the same parcel. Each lookup that reaches the server wakes up a Netlify function, calls 17TRACK (limited to 3 requests per second per account) and possibly Mapbox.

Netlify's CDN cache key always contains the URL path. A request body is never part of it, so a `POST` with the number in the body could not be cached per parcel.

## Decision

The API is `GET /api/track/{number}`, with the normalised number in the path. A ready response is sent with:

- `Netlify-CDN-Cache-Control: public, durable, s-maxage=180, stale-while-revalidate=60`: shared by the CDN nodes for 3 minutes;
- `Cache-Control: public, max-age=0, must-revalidate`: never kept by the browser, so a refresh after 3 minutes always gets fresh data.

Pending responses (`202`) and errors are `no-store`. The function also keeps ready results in memory for 3 minutes, for requests that reach it anyway.

## Consequences

- Repeated lookups of a parcel cost no function call, no 17TRACK request and no geocoding.
- Data can be up to about 4 minutes old. This is acceptable for parcel tracking.
- Numbers must be normalised (spaces removed, upper case) before building the URL, or the same parcel would have several cache entries.
- Tracking numbers appear in CDN and access logs. This is acceptable: they are already in the page URL (`?n=`).
