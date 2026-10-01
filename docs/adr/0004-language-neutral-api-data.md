# 0004. Keep API data language-neutral and write all text in the browser

- Status: accepted
- Date: 2026-09-22 (`71124b1`)

## Context

The site is in French and English, and the language can be switched at any time. Ready responses are cached by the CDN per URL (see [0002](0002-tracking-number-in-the-path-for-cdn-caching.md)), and the URL does not contain the language.

## Decision

The API never returns text written by the site:

- carrier text (places, event descriptions) is returned as is, never translated;
- the site's own fallbacks (unknown carrier, unknown place) are left empty;
- a place known only by its country is returned as an ISO code (`locationCountryCode: "FR"`);
- errors carry a `code` (and sometimes a numeric `detail`), with a French message only as a fallback.

The browser writes all of this text from `lib/dictionary.ts`, in the current language.

## Consequences

- One cached response serves every language, and switching language needs no new request.
- Every new piece of text shown to the user must be added to the dictionary, in both languages, rather than produced by the server.
- Carrier text stays in the carrier's language (often English or Chinese). Translating it is out of scope.
