# Round Trips — Design

_Date: 2026-09-26 · Branch: `feature/multi-modal-routing` · Status: approved in brainstorming, pending spec review_

## Goal

Let a traveller search, book and keep a round trip (outbound + return) end to end:
return date in search, pick outbound then return, one checkout and one payment
for both directions (including optional feeder connections on each direction),
and one round-trip entry in My Trips.

Round trips were removed from the mobile app in `7f2d140` because they were not
supported end to end. The backend search validator still accepts `returnDate`,
but providers ignore it.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| How the return is picked | **Two-step** (Omio/Trainline): choose outbound, then a return-results screen. Modes can be mixed. |
| Connections with round trips | **Both directions**: the connections step runs for outbound, then for return. |
| One direction fails to book after payment auth | **Keep what booked, charge only that** (existing itinerary partial-failure behaviour). |
| Storage / booking model | **One itinerary with direction-tagged legs**, booked through the existing `POST /itineraries/book`. |

Rejected: paired outbound+return combos in one list (N×M, needs backend pairing);
two linked itineraries under one payment (payment spans records, new money code);
two separate one-way bookings from the client (two charges, no atomicity).

## Out of scope

- Price alerts for round trips (the results bell keeps alerting a single direction, as one-way).
- Round-trip fares cheaper than two singles (no provider supports it here).
- Provider-side cancellation / all-or-nothing booking.
- Multi-city / open-jaw trips.

---

## 1. Search and selection (mobile)

### Search tab — `app/(tabs)/index.tsx`
- `SegmentedControl` "One-way / Return" above the form.
- Return reveals a second date row. `CalendarSheet` opens with minimum date = departure date.
- Default return date = departure + 3 days. If departure moves past return, return moves to departure + 3 days.
- `SearchQuery` (in `src/stores/searchStore.ts`) gains `returnDate?: string`.
- Recent searches store `returnDate`; the chip shows "12 Oct – 15 Oct". Popular routes stay one-way.
- Validation: return date must be on or after departure date.

### Results — outbound phase (`/results`)
- When `query.returnDate` is set, header reads "Choose outbound · London → Paris" and the subtitle shows both dates.
- Date strip, mode tabs and sort work as today. The outbound date strip cannot select a day after `returnDate`.
- Tapping a card opens trip detail (`/trip/[id]`). For a round trip, the trip detail CTA is **"Choose return"**; the Book and Add Connections buttons are hidden. Choosing stores the trip as `searchStore.selectedOutbound` and pushes `/results?leg=return`.

### Results — return phase (`/results?leg=return`)
- Pushed on the stack; Back returns to the outbound list.
- Searches with swapped cities and `departDate = returnDate` (plain one-way `GET /search`; date strip uses `GET /search/prices` with swapped cities).
- Header "Choose return · Paris → London".
- Pinned card at the top: "Outbound · Tue 12 Oct 08:10 → 11:30 · €45 · Change". Change pops back to the outbound list.
- Results that depart less than 60 minutes after the outbound's arrival are hidden.
- Date strip disables days before the outbound's arrival date. Changing the date updates `query.returnDate`.
- Empty after filtering: "No returns after your outbound arrives — try another date".
- Return-phase search results are kept separately from outbound results in `searchStore` (`returnResults`, `returnMeta`), so going back shows the outbound list unchanged.

### Trip detail with a return picked — `app/trip/[id].tsx`
- Opened from the return phase: shows the return trip plus a compact outbound summary card.
- BottomBar caption "Total · round trip" with outbound + return price (× adults, as today).
- CTA **"Book round trip"** → `setCheckoutRoundTrip(outbound, ret, adults)` → `/checkout/transfer`.
- **Add Connections** row → `setCheckoutRoundTrip(...)` → `/checkout/connections?direction=outbound`.

### Types
- `Leg` gains `direction?: 'outbound' | 'return'` (absent means outbound).
- `CheckoutItinerary` gains `tripType: 'one_way' | 'round_trip'`.

---

## 2. Checkout (mobile)

### Checkout store — `src/stores/checkoutStore.ts`
- Keeps main legs per direction: `mainLegs: { outbound: Leg; return?: Leg }`, and feeders per direction: `{ departure?: Leg; arrival?: Leg }` for each.
- `setCheckoutRoundTrip(outbound, ret, adults)` builds a 2-leg round-trip itinerary (no feeders), a new idempotency key, and clears transfer prefs. Round trips always use the itinerary booking path, even without connections.
- `setDirectionConnections(direction, departureLeg?, arrivalLeg?)` sets one direction's feeders and rebuilds the leg list in order: outbound departure feeder, outbound main, outbound arrival feeder, return departure feeder, return main, return arrival feeder. Every leg is tagged with its `direction`. It keeps the idempotency key (same checkout attempt).
- `getCheckoutMainLeg(direction = 'outbound')`.
- One-way behaviour of `setCheckoutTrip` / `setCheckoutItinerary` is unchanged.

### Steps — `src/components/Stepper.tsx`
`checkoutSteps(flow)` takes a flow kind instead of a boolean:

| Flow | Steps |
|---|---|
| `one_way` | Getting there · Passengers · Review · Pay |
| `one_way_connections` | Connections · Getting there · Passengers · Review · Pay |
| `round_trip` | Getting there · Passengers · Review · Pay |
| `round_trip_connections` | Outbound connections · Return connections · Getting there · Passengers · Review · Pay |

A helper `checkoutFlow()` in the store derives the flow; screens compute their index from the step name instead of hard-coded numbers.

### Connections — `app/checkout/connections.tsx`
- Takes `?direction=outbound|return` (default outbound).
- Outbound: as today (origin city → departure hub; arrival hub → destination city).
- Return: main leg = return main leg; cities swapped (destination city → return departure hub; return arrival hub → origin city).
- Continue on outbound (round trip) pushes `?direction=return`; continue on return (or one-way) pushes `/checkout/transfer`.
- Screen state is initialised from the store's saved feeders for that direction, so Back from the return pass keeps outbound choices.

### Connection warnings — `src/utils/connections.ts`
`computeConnections` still returns one entry per consecutive leg pair (index `i` = gap between legs `i` and `i+1`), so existing consumers keep working. `Connection` gains `stay?: boolean`: the entry between the outbound's last leg and the return's first leg is `{ transferMins, stay: true }` with no warning — it is the stay, not a connection. Review renders a `stay` entry as the break between the Outbound and Return sections.

### Route endpoints
Passengers, transfer, review and payment currently derive the route as `legs[0]` → `legs[last]`, which for a round trip is London → London. New helper `itineraryEndpoints(itinerary)` returns the first outbound leg's origin and the last outbound leg's destination (with names). All four screens and the booking request's `origin`/`destination` use it.

### Getting there — `app/checkout/transfer.tsx`
One step for both directions. Start address = home, end address = where you're staying. Outbound routes use home → stay; the return route reverses it. No second form.

### Review — `app/checkout/review.tsx`
- Two grouped sections: "Outbound · Tue 12 Oct" and "Return · Fri 15 Oct", each listing its legs and connection warnings.
- One price breakdown (per leg, total).
- "You'll receive N separate tickets" note stays.
- `RouteMapMenu` gets an Outbound/Return toggle for round trips; return uses reversed transfer prefs.

### Payment — `app/checkout/payment.tsx`
Same path: `bookItinerary({ legs, passengers, paymentMethodId, origin, destination, tripType, idempotencyKey })`. Same idempotency key, same 402/409 handling. Pay button shows the combined total. Expired-offer 409 message tells the user to search again.

### Confirmation — `app/confirmation.tsx`
- Legs grouped by direction.
- Partial failure: the failed direction reads "Return not booked — you weren't charged for it" with a **Search return again** button that pre-fills a one-way search (cities swapped, date = original return date).

---

## 3. Backend

### Migration — `backend/migrations/010_round_trips.sql`
```sql
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS trip_type TEXT NOT NULL DEFAULT 'one_way'
  CHECK (trip_type IN ('one_way', 'round_trip'));
ALTER TABLE trips ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound'
  CHECK (direction IN ('outbound', 'return'));
```
Existing rows become one-way / outbound.

### Validator — `backend/src/validators/itineraryBooking.js`
- Accepts `tripType` (`one_way` default | `round_trip`) and per-leg `direction` (`outbound` default | `return`). Unknown values → 400.
- `one_way`: every leg outbound, else 400.
- `round_trip`: at least one outbound and one return leg, and all outbound legs come before all return legs in the array, else 400.

### Service — `backend/src/services/itineraryBooking.js`
- After re-quote, checks with **server-side offer times**: the first return leg departs after the last outbound leg arrives, else 400 "Return must depart after the outbound arrives".
- Stores `trip_type` on the itinerary and `direction` on each leg (models `Itinerary.create`, `Trip.create` take the new fields).
- Itinerary `origin`/`destination` come from the request (outbound endpoints); `depart_at` = first leg, `arrive_at` = last leg (unchanged).
- Stripe description: "TraveScout Round trip: LON ⇄ PAR (N legs)".
- Re-quote, idempotency ledger, auth → book → commit → capture ordering, and partial capture are unchanged.

### Read path — `backend/src/models/itinerary.js`
`findByUserId` returns `trip_type` (via `i.*`) and adds `direction` to each leg's JSON.

### Search
No change. The return phase is a plain one-way search.

---

## 4. My Trips — `app/(tabs)/trips.tsx`
- Round-trip itinerary card: "London ⇄ Paris · Round trip", date range "12 – 15 Oct", one booking ref.
- Expanded: Outbound and Return groups, each leg with its QR and route map entry.
- Stays in Upcoming until the last return leg arrives (already true: `arrive_at` = last leg).
- Partially failed: failed legs greyed with "Not booked · not charged".
- `BookedTrip` gains `direction`; `BookedItinerary` gains `trip_type`.

---

## 5. Error handling summary

| Case | Behaviour |
|---|---|
| Outbound offer expired before payment | Existing 409 → "One of your fares is no longer available — please search again." |
| No returns after filtering | Empty state with date-strip hint |
| Return date before outbound arrival date | Those days disabled on the return date strip |
| Client sends return legs departing before outbound arrives | 400 from server (offer-time check) |
| One direction fails at the provider | Partial capture; confirmation + My Trips show "not booked · not charged" and Search return again |
| All legs fail | Existing: auth released, 502 |

## 6. Testing

TDD per unit.

**Backend (Jest, real Postgres, mocked Stripe):**
- Validator: tripType/direction defaults, bad values, one-way with return legs, round trip missing a direction, return before outbound in array.
- Service: round-trip happy path stores `trip_type` + `direction`; return leg provider failure → `partially_failed`, capture = outbound amount only; return departing before outbound arrival (server offers) → 400; idempotent replay returns the same response.
- Migration: old itineraries read back as `one_way` / legs `outbound`.
- `GET /itineraries` includes `trip_type` and leg `direction`.

**Mobile (Jest + RNTL):**
- `checkoutStore`: `setCheckoutRoundTrip`, `setDirectionConnections` leg order and tags, idempotency key kept across connection edits, `checkoutFlow()`.
- `checkoutSteps` for all four flows.
- `itineraryEndpoints` for one-way, one-way with feeders, round trip with feeders.
- `computeConnections` does not flag the stay gap.
- Search screen: toggle shows return date, validation, query carries `returnDate`.
- Results: return phase swaps cities, hides returns departing < 60 min after outbound arrival, pinned outbound card.
- Trip detail: "Choose return" vs "Book round trip" CTAs.
- Review / confirmation grouping and partial-failure copy; My Trips round-trip card.

**End to end:** extend `mobile/scripts/web-walkthrough.mjs` with a round-trip run (search with return → outbound → return → connections ×2 → review → pay) and check screenshots in light and dark mode. Pay will 402 with the placeholder Stripe key, as today.
