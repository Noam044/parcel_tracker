# 0006. Let visitors name the carrier when 17TRACK cannot, and ask for the postal code it needs

- Status: accepted
- Date: 2026-10-11

## Context

17TRACK tracks most parcels from the number alone, but not all of them:

- a **Mondial Relay** number (8 digits) cannot be tracked without the recipient's postal code: 17TRACK lists `postal_code` as a required additional parameter for this carrier;
- a **Vinted Go** number (16 digits) is auto-detected as another carrier's (APC Postal Logistics), which has no events for it. The parcel then stays "pending" forever.

Visitors expect to paste a number, as for every other carrier, not a link. Making them pick the carrier first was considered and rejected: 17TRACK recognises almost every number on its own, visitors often do not know which carrier holds their parcel (it changes along the way), a wrong pick costs quota, and a list of 3,500 carriers is unusable. Carrier logos were left out too: they are trademarks, and the site is not affiliated with any carrier.

## Decision

**Optional carrier menu.** Under the number field, a menu set to "automatic detection" by default lists only the carriers 17TRACK cannot handle from the number alone: Mondial Relay and Vinted Go, by name. Choosing Mondial Relay shows a postal code field, required for that carrier.

**Postal code as a second step.** For visitors who leave the menu alone, when a number has to be registered and needs a postal code that was not given, the API answers `422 postal_code_required`, with the carrier when it is known, and registers nothing. The form then selects that carrier and shows the postal code field, and the search runs again with `?carrier=…&postcode=…` once it is filled in. This happens:

- before calling `register`, for an unregistered number in the Mondial Relay format (8 digits, `lib/track17.ts:guessCarrier`). The guess only applies to registration: a number already tracked is shown as is, whatever its format;
- when `register` is refused with `-18010018` or `-18010019` (postal code required), whatever the carrier.

The carrier and postal code then travel with the parcel:

- the page URL carries them as `?n=…&c=…&cp=…`, so links, reloads and recent parcels keep them;
- the API takes them as `GET /api/track/{number}?carrier=…&postcode=…`. The carrier is an allow-listed name (`mondial-relay`, `vinted-go`), mapped to its 17TRACK key on the server. The CDN cache key includes these two parameters only (`Netlify-Vary: query=carrier|postcode`), so the caching of [0002](0002-tracking-number-in-the-path-for-cdn-caching.md) still applies;
- `register` is sent the carrier and `destination_postal_code`.

**Tracking links.** The search field also accepts a Mondial Relay (`…?numeroExpedition=…&codePostal=…`) or Vinted Go (`vintedgo.com/…/tracking/{number}`) link, read in the browser into a number, a carrier and a postal code; it takes precedence over the menu. A number already registered under another carrier than the chosen one (`gettrackinfo` answers `-18019910`) is moved with `changecarrier`, then given the postal code with `changeinfo`. This goes through the per-IP registration limit but not the quota check of [0001](0001-protect-the-17track-quota.md): only a number already registered, and so already counted, can be moved, and 17TRACK allows 5 changes per number.

## Consequences

- Mondial Relay and Vinted Go parcels are tracked from the bare number. Asking for the postal code costs no quota and no `register` call.
- A wrong pick in the menu for a number already tracked moves it to that carrier (5 times at most); choosing is optional and the default stays automatic detection.
- Any 8-digit number that 17TRACK does not know yet is treated as Mondial Relay. Another carrier's 8-digit number would be registered under Mondial Relay and show no events.
- A wrong postal code is sent to 17TRACK as is: the parcel is registered but may show no events.
- The postal code appears in the page URL and in CDN logs, as it does in the carrier's own tracking link.

Covered by `tests/tracking-number.test.ts`, `tests/track17.test.ts` and `tests/route.test.ts`.
