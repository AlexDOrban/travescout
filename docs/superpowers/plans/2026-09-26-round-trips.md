# Round Trips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Search, book and keep a round trip (outbound + return, optional feeder connections on each direction) end to end, with one checkout and one payment.

**Architecture:** A round trip is one itinerary whose legs are tagged `direction: 'outbound' | 'return'`, booked through the existing `POST /book/itinerary` (one Stripe authorization, existing re-quote / idempotency / partial-capture logic). The mobile app searches outbound and return as two plain one-way searches (two-step selection), keeps per-direction legs in the checkout store, and runs the connections screen once per direction.

**Tech Stack:** Backend: Node/Express, `pg`, Jest + supertest (real Postgres, mocked Stripe/providers). Mobile: Expo SDK 54 (Expo Router), React Native, TypeScript, Jest + @testing-library/react-native.

**Spec:** `docs/superpowers/specs/2026-09-26-round-trips-design.md`

## Global Constraints

- Expo SDK 54 stays pinned (Expo Go 54.0.7). **No new npm dependencies** in either package.
- Backend tests need Postgres running: `brew services start postgresql@17`.
- Every new migration must be applied to **both** DBs: dev (`cd backend && npm run migrate`) and test (`cd backend && DATABASE_URL="$(grep '^DATABASE_URL=' .env.test | cut -d= -f2-)" npm run migrate`).
- Existing one-way behaviour must not change: requests without `tripType` / `direction` behave exactly as today.
- Max 3 legs per direction (1 main + 2 feeders); round trips up to 6 legs.
- Return results must depart at least **60 minutes** after the outbound arrives (`RETURN_BUFFER_MINS = 60`).
- Default return date = departure + 3 days.
- Charges are always EUR; prices already cover all adults (no client multiplication).
- Commit after each task. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Verification commands: backend `cd backend && npm test && npm run lint`; mobile `cd mobile && npm test && npm run typecheck && npm run lint`.

## Review Focus

1. **User goes back from the return list and picks a different outbound** → the return list must re-filter against the *new* outbound (never the stale one). Pinned in Task 9 ("re-filters when the selected outbound changes").
2. **Overnight outbound arriving after the chosen return date** (e.g. return date = 15th, outbound lands 16th 09:00) → return search runs for the arrival date, not an impossible earlier date. Pinned in Task 6 (`returnSearchQuery`) and Task 9.
3. **User sets a return date, then flips the toggle back to One-way** → the search must be one-way (no `returnDate` in the query). Pinned in Task 8.
4. **Back from return connections to outbound connections, change the outbound feeder** → return feeders chosen earlier must survive. Pinned in Task 5 (`setDirectionConnections` keeps the other direction).
5. **Recent round-trip search whose dates have partly passed / conflict** → filling it must never produce return < departure. Pinned in Task 8.

---

## File map

**Backend**
- Create `backend/migrations/010_round_trips.sql` — `trip_type`, `direction` columns.
- Modify `backend/src/models/itinerary.js` — persist/read `trip_type`; legs JSON gains `direction`.
- Modify `backend/src/models/trip.js` — persist `direction`.
- Modify `backend/src/validators/itineraryBooking.js` — `tripType`, per-leg `direction`, leg caps.
- Modify `backend/src/services/itineraryBooking.js` — store new fields, server-side time order check, description.
- Modify `backend/src/controllers/itineraryBooking.js` — pass `tripType`.
- Tests: create `backend/tests/validators/itineraryBooking.test.js`; modify `backend/tests/itineraryBooking.test.js`, `backend/tests/itineraries.test.js`.

**Mobile**
- Modify `mobile/src/types/itinerary.ts`, `mobile/src/types/booking.ts` — direction / trip type fields.
- Modify `mobile/src/utils/connections.ts` — `stay` entry at the direction boundary.
- Create `mobile/src/utils/itinerary.ts` — `toLeg`, `itineraryEndpoints`, `legsByDirection`.
- Create `mobile/src/utils/roundTrip.ts` — `RETURN_BUFFER_MINS`, `defaultReturnDate`, `returnSearchQuery`, `returnsAfter`, `reversePrefs`.
- Modify `mobile/src/stores/checkoutStore.ts` — per-direction legs, `setCheckoutRoundTrip`, `setDirectionConnections`, `getDirectionConnections`.
- Modify `mobile/src/stores/searchStore.ts` — `returnDate`, per-leg results, selected outbound.
- Modify `mobile/src/utils/recentSearches.ts` — `returnDate` on `RecentSearch`.
- Modify `mobile/src/components/Stepper.tsx` — `CheckoutFlow`, `checkoutFlow`, `checkoutSteps(flow)`, `stepIndex`.
- Create `mobile/src/components/OutboundSummary.tsx` — pinned outbound card.
- Modify `mobile/src/components/RouteMapMenu.tsx` — `reversed` prop.
- Modify `mobile/src/components/ExpandableLeg.tsx` — "Not booked · not charged".
- Modify screens: `app/(tabs)/index.tsx`, `app/results.tsx`, `app/trip/[id].tsx`, `app/checkout/{connections,transfer,passengers,review,payment}.tsx`, `app/confirmation.tsx`, `app/(tabs)/trips.tsx`.
- Modify `mobile/scripts/web-walkthrough.mjs` — `roundtrip` run.
- Modify `docs/BUILD_STATUS.md`.

---

### Task 1: Migration + models persist `trip_type` and `direction`

**Files:**
- Create: `backend/migrations/010_round_trips.sql`
- Modify: `backend/src/models/itinerary.js`
- Modify: `backend/src/models/trip.js`
- Test: `backend/tests/itineraries.test.js`

**Interfaces:**
- Produces: `Itinerary.create({ ..., tripType = 'one_way' }, executor)`; `Trip.create({ ..., direction = 'outbound' }, executor)`; `Itinerary.findByUserId` rows include `trip_type` and each leg includes `direction`.

- [ ] **Step 1: Write the failing test** — in `backend/tests/itineraries.test.js`, inside the existing `it('returns itineraries after booking', …)` test, after its current assertions, add:

```js
    const listed = res.body.itineraries[0];
    // Rows booked without a tripType read back as one-way / outbound.
    expect(listed.trip_type).toBe('one_way');
    expect(listed.legs[0].direction).toBe('outbound');
```

(If the test names its response variable differently, use that name; the listing response is the `GET /itineraries` call.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest tests/itineraries.test.js`
Expected: FAIL — `expect(received).toBe(expected)` with `received: undefined` for `trip_type`.

- [ ] **Step 3: Write the migration**

`backend/migrations/010_round_trips.sql`:

```sql
-- Round trips: an itinerary is one-way or a round trip, and each leg belongs
-- to the outbound or the return direction. Existing rows are one-way/outbound.
ALTER TABLE itineraries ADD COLUMN IF NOT EXISTS trip_type TEXT NOT NULL DEFAULT 'one_way';
ALTER TABLE itineraries DROP CONSTRAINT IF EXISTS itineraries_trip_type_check;
ALTER TABLE itineraries ADD CONSTRAINT itineraries_trip_type_check
  CHECK (trip_type IN ('one_way', 'round_trip'));

ALTER TABLE trips ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound';
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_direction_check;
ALTER TABLE trips ADD CONSTRAINT trips_direction_check
  CHECK (direction IN ('outbound', 'return'));
```

Apply to both DBs:

```bash
cd backend && npm run migrate
DATABASE_URL="$(grep '^DATABASE_URL=' .env.test | cut -d= -f2-)" npm run migrate
```

Expected: `applied 010_round_trips.sql` twice.

- [ ] **Step 4: Update the models**

`backend/src/models/itinerary.js` — replace `create` and add `direction` to the legs JSON:

```js
async function create(
  { userId, bookingRef, origin, destination, departAt, arriveAt, totalPriceEur, status, tripType = 'one_way' },
  executor = db
) {
  const result = await executor.query(
    `INSERT INTO itineraries (user_id, booking_ref, origin, destination, depart_at, arrive_at, total_price_eur, status, trip_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [userId, bookingRef, origin, destination, departAt, arriveAt, totalPriceEur, status, tripType]
  );
  return result.rows[0];
}
```

In `findByUserId`, inside `json_build_object(...)`, after `'leg_order', t.leg_order,` add:

```sql
           'direction', t.direction,
```

`backend/src/models/trip.js` — add `direction` as the 16th column:

```js
    `INSERT INTO trips
       (user_id, provider, booking_ref, origin, destination,
        depart_at, arrive_at, return_at, price_eur, currency_display, status, raw_ticket_url,
        itinerary_id, leg_order, ticket_qr_data, direction)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
```

and append to the values array after `data.ticketQrData || null,`:

```js
      data.direction || 'outbound',
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && npx jest tests/itineraries.test.js tests/models/trip.test.js tests/itineraryBooking.test.js`
Expected: PASS. (If `tests/models/trip.test.js` asserts the exact SQL param array, extend its expectation with `'outbound'` as the last element.)

- [ ] **Step 6: Commit**

```bash
git add backend/migrations/010_round_trips.sql backend/src/models/itinerary.js backend/src/models/trip.js backend/tests/itineraries.test.js backend/tests/models/trip.test.js
git commit -m "feat(backend): trip_type on itineraries and direction on legs"
```

---

### Task 2: Validator accepts `tripType` and per-leg `direction`

**Files:**
- Modify: `backend/src/validators/itineraryBooking.js`
- Test (create): `backend/tests/validators/itineraryBooking.test.js`

**Interfaces:**
- Produces: `validateItineraryBookingBody(body)` returns `{ legs, passengers, paymentMethodId, origin, destination, tripType }`, where `tripType ∈ {'one_way','round_trip'}` (default `'one_way'`) and every returned leg has `direction ∈ {'outbound','return'}` (default `'outbound'`). Throws `Error` with `status: 400` on invalid input.

- [ ] **Step 1: Write the failing tests**

`backend/tests/validators/itineraryBooking.test.js`:

```js
const { validateItineraryBookingBody } = require('../../src/validators/itineraryBooking');

const leg = (id, over = {}) => ({
  id, provider: 'flixbus', origin: 'BUD', destination: 'VIE', priceEur: 10, ...over,
});

const base = {
  legs: [leg('a')],
  passengers: [{ name: 'Ann', email: 'ann@example.com' }],
  paymentMethodId: 'pm_card_visa',
  origin: 'BUD',
  destination: 'VIE',
};

const status400 = fn => {
  try {
    fn();
  } catch (e) {
    return e.status;
  }
  return 'no error';
};

describe('validateItineraryBookingBody — trip type and direction', () => {
  it('defaults to one_way with outbound legs', () => {
    const out = validateItineraryBookingBody(base);
    expect(out.tripType).toBe('one_way');
    expect(out.legs[0].direction).toBe('outbound');
  });

  it('rejects an unknown tripType', () => {
    expect(status400(() => validateItineraryBookingBody({ ...base, tripType: 'multi_city' }))).toBe(400);
  });

  it('rejects an unknown leg direction', () => {
    expect(status400(() => validateItineraryBookingBody({ ...base, legs: [leg('a', { direction: 'sideways' })] }))).toBe(400);
  });

  it('rejects return legs on a one-way itinerary', () => {
    const legs = [leg('a'), leg('b', { direction: 'return' })];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs }))).toBe(400);
  });

  it('accepts a round trip with outbound then return legs', () => {
    const legs = [leg('a'), leg('b', { direction: 'return' })];
    const out = validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' });
    expect(out.tripType).toBe('round_trip');
    expect(out.legs.map(l => l.direction)).toEqual(['outbound', 'return']);
  });

  it('rejects a round trip without return legs', () => {
    expect(status400(() => validateItineraryBookingBody({ ...base, legs: [leg('a')], tripType: 'round_trip' }))).toBe(400);
  });

  it('rejects a round trip that starts with a return leg', () => {
    const legs = [leg('a', { direction: 'return' }), leg('b')];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }))).toBe(400);
  });

  it('rejects an outbound leg after a return leg', () => {
    const legs = [leg('a'), leg('b', { direction: 'return' }), leg('c')];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }))).toBe(400);
  });

  it('allows 6 legs on a round trip (3 per direction)', () => {
    const legs = [leg('a'), leg('b'), leg('c'), leg('d', { direction: 'return' }), leg('e', { direction: 'return' }), leg('f', { direction: 'return' })];
    expect(validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }).legs).toHaveLength(6);
  });

  it('rejects more than 3 legs in one direction', () => {
    const legs = [leg('a'), leg('b'), leg('c'), leg('d'), leg('e', { direction: 'return' })];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs, tripType: 'round_trip' }))).toBe(400);
  });

  it('still caps one-way itineraries at 3 legs', () => {
    const legs = [leg('a'), leg('b'), leg('c'), leg('d')];
    expect(status400(() => validateItineraryBookingBody({ ...base, legs }))).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest tests/validators/itineraryBooking.test.js`
Expected: FAIL — `out.tripType` undefined, round-trip cases throw "legs must be an array of 1-3 items" or return 'no error'.

- [ ] **Step 3: Implement**

Replace `backend/src/validators/itineraryBooking.js` with:

```js
const KNOWN_PROVIDERS = ['amadeus', 'flixbus', 'rail'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TRIP_TYPES = ['one_way', 'round_trip'];
const DIRECTIONS = ['outbound', 'return'];
// 1 main leg + up to 2 feeder connections per direction.
const MAX_LEGS_PER_DIRECTION = 3;

const badRequest = message => Object.assign(new Error(message), { status: 400 });

function validateItineraryBookingBody(body) {
  const { legs, passengers, paymentMethodId, origin, destination } = body;
  const tripType = body.tripType ?? 'one_way';

  if (!TRIP_TYPES.includes(tripType)) {
    throw badRequest('tripType must be one_way or round_trip');
  }

  const maxLegs = tripType === 'round_trip' ? MAX_LEGS_PER_DIRECTION * 2 : MAX_LEGS_PER_DIRECTION;
  if (!Array.isArray(legs) || legs.length === 0 || legs.length > maxLegs) {
    throw badRequest(`legs must be an array of 1-${maxLegs} items`);
  }

  legs.forEach((leg, i) => {
    if (!leg.id || !leg.provider || !leg.origin || !leg.destination) {
      throw badRequest(`leg ${i} missing required fields`);
    }
    if (!KNOWN_PROVIDERS.includes(leg.provider)) {
      throw badRequest(`leg ${i} has unknown provider: ${leg.provider}`);
    }
    if (typeof leg.priceEur !== 'number' || !Number.isFinite(leg.priceEur) || leg.priceEur <= 0) {
      throw badRequest(`leg ${i} priceEur must be a positive number`);
    }
    if (leg.direction !== undefined && !DIRECTIONS.includes(leg.direction)) {
      throw badRequest(`leg ${i} direction must be outbound or return`);
    }
  });

  const directions = legs.map(l => l.direction ?? 'outbound');
  if (tripType === 'one_way' && directions.includes('return')) {
    throw badRequest('one-way itineraries cannot have return legs');
  }
  if (tripType === 'round_trip') {
    const firstReturn = directions.indexOf('return');
    if (firstReturn <= 0 || directions.slice(firstReturn).includes('outbound')) {
      throw badRequest('round trips need outbound legs followed by return legs');
    }
    if (firstReturn > MAX_LEGS_PER_DIRECTION || directions.length - firstReturn > MAX_LEGS_PER_DIRECTION) {
      throw badRequest(`at most ${MAX_LEGS_PER_DIRECTION} legs per direction`);
    }
  }

  if (!Array.isArray(passengers) || passengers.length === 0) {
    throw badRequest('passengers must be a non-empty array');
  }

  passengers.forEach((p, i) => {
    if (!p.name || !p.email) {
      throw badRequest(`passenger ${i} missing name or email`);
    }
    if (typeof p.email !== 'string' || !EMAIL_RE.test(p.email)) {
      throw badRequest(`passenger ${i} email is invalid`);
    }
  });

  if (!paymentMethodId || typeof paymentMethodId !== 'string') {
    throw badRequest('paymentMethodId is required');
  }

  if (!origin || !destination) {
    throw badRequest('origin and destination are required');
  }

  return {
    legs: legs.map((l, i) => ({ ...l, direction: directions[i] })),
    passengers,
    paymentMethodId,
    origin,
    destination,
    tripType,
  };
}

module.exports = { validateItineraryBookingBody };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npx jest tests/validators/itineraryBooking.test.js tests/itineraryBooking.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/validators/itineraryBooking.js backend/tests/validators/itineraryBooking.test.js
git commit -m "feat(backend): validate round-trip itineraries (tripType, leg direction)"
```

---

### Task 3: Book round trips (service + controller)

**Files:**
- Modify: `backend/src/services/itineraryBooking.js`
- Modify: `backend/src/controllers/itineraryBooking.js`
- Test: `backend/tests/itineraryBooking.test.js`

**Interfaces:**
- Consumes: Task 1 `Itinerary.create({ tripType })`, `Trip.create({ direction })`; Task 2 validator output `{ ..., tripType, legs[i].direction }`.
- Produces: `POST /book/itinerary` accepts `tripType: 'round_trip'`; response `itinerary.trip_type`, `itinerary.legs[i].direction`. 400 `"Return must depart after the outbound arrives"` when (by server-side offers) the first return leg departs at or before the last outbound leg arrives.

- [ ] **Step 1: Write the failing tests** — append to `backend/tests/itineraryBooking.test.js`:

```js
describe('POST /book/itinerary — round trips', () => {
  const flixbus = require('../src/providers/flixbus');
  const amadeus = require('../src/providers/amadeus');
  const StripeService = require('../src/services/stripe');

  const RETURN_LEGS = [
    {
      id: 'amadeus:ret-1', provider: 'amadeus', transportType: 'flight',
      origin: 'NCE', destination: 'VIE', originName: "Nice Côte d'Azur",
      destinationName: 'Vienna Schwechat', departAt: '2030-06-20T09:00:00Z',
      arriveAt: '2030-06-20T11:10:00Z', durationMins: 130, priceEur: 70,
      stops: 0, deepLink: 'https://amadeus.com', direction: 'return',
    },
    {
      id: 'flixbus:ret-2', provider: 'flixbus', transportType: 'bus',
      origin: 'VIE', destination: 'BUD', originName: 'Vienna Erdberg',
      destinationName: 'Budapest Népliget', departAt: '2030-06-20T14:00:00Z',
      arriveAt: '2030-06-20T16:30:00Z', durationMins: 150, priceEur: 14,
      stops: 0, deepLink: 'https://flixbus.com', direction: 'return',
    },
  ];
  const OUT_LEGS = MOCK_LEGS.map(l => ({ ...l, direction: 'outbound' }));
  const body = (legs, over = {}) => ({
    legs,
    passengers: [{ name: 'Test User', email: 'test@test.com' }],
    paymentMethodId: 'pm_card_visa',
    origin: 'BUD',
    destination: 'NCE',
    tripType: 'round_trip',
    ...over,
  });

  // Provider refs must be unique (trips.booking_ref has a unique index).
  let seq = 0;
  const okBooking = async () => ({ bookingRef: `RT-${Date.now()}-${++seq}`, status: 'confirmed', ticketUrl: null });

  beforeEach(() => {
    offerStore.remember([...MOCK_LEGS, ...RETURN_LEGS]);
    flixbus.book.mockImplementation(okBooking);
    amadeus.book.mockImplementation(okBooking);
    StripeService.authorize.mockClear();
    StripeService.capture.mockClear();
  });

  it('books both directions under one reference and stores trip_type + direction', async () => {
    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send(body([...OUT_LEGS, ...RETURN_LEGS]));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.itinerary.trip_type).toBe('round_trip');
    expect(res.body.itinerary.legs.map(l => l.direction)).toEqual(['outbound', 'outbound', 'return', 'return']);
    expect(res.body.itinerary.origin).toBe('BUD');
    expect(res.body.itinerary.destination).toBe('NCE');
    expect(res.body.itinerary.arrive_at).toBe(new Date('2030-06-20T16:30:00Z').toISOString());
    expect(StripeService.authorize).toHaveBeenCalledWith(
      expect.objectContaining({ amountEur: 15 + 62 + 70 + 14, description: expect.stringContaining('Round trip') })
    );
  });

  it('captures only the outbound when the return fails at the provider', async () => {
    amadeus.book.mockImplementation(async ({ trip }) => {
      if (trip.id === 'amadeus:ret-1') throw new Error('Sold out');
      return okBooking();
    });

    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send(body([...OUT_LEGS, ...RETURN_LEGS]));

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('partially_failed');
    expect(res.body.failedLegs).toEqual([{ legOrder: 2, error: 'Sold out' }]);
    // Outbound 15 + 62 and the return bus 14 booked; the failed flight (70) is not charged.
    expect(StripeService.capture).toHaveBeenCalledWith('pi_test_123', 15 + 62 + 14);
  });

  it('rejects a return that departs before the outbound arrives (server offer times)', async () => {
    const early = { ...RETURN_LEGS[0], id: 'amadeus:ret-early', departAt: '2030-06-15T15:00:00Z', arriveAt: '2030-06-15T17:10:00Z' };
    offerStore.remember([early]);

    const res = await request(app)
      .post('/book/itinerary')
      .set('Authorization', `Bearer ${token}`)
      .send(body([...OUT_LEGS, early]));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Return must depart after the outbound arrives/);
    expect(StripeService.authorize).not.toHaveBeenCalled();
  });

  it('replays the same response for a repeated idempotency key', async () => {
    const payload = body([...OUT_LEGS, ...RETURN_LEGS], { idempotencyKey: `rt-idem-${Date.now()}` });
    const first = await request(app).post('/book/itinerary').set('Authorization', `Bearer ${token}`).send(payload);
    const second = await request(app).post('/book/itinerary').set('Authorization', `Bearer ${token}`).send(payload);

    expect(first.status).toBe(201);
    expect(second.body.bookingRef).toBe(first.body.bookingRef);
    expect(StripeService.authorize).toHaveBeenCalledTimes(1);
  });
});
```

(`backend/src/middleware/errorHandler.js` returns `{ error: err.message }` with the error's `status`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && npx jest tests/itineraryBooking.test.js`
Expected: FAIL — `trip_type` is `'one_way'`, early-return test gets 201, description lacks "Round trip".

- [ ] **Step 3: Implement**

`backend/src/controllers/itineraryBooking.js` — destructure and pass `tripType`:

```js
    const { legs, passengers, paymentMethodId, origin, destination, tripType } = validateItineraryBookingBody(req.body);
    const result = await bookItinerary({
      userId: req.userId,
      legs,
      passengers,
      paymentMethodId,
      origin,
      destination,
      tripType,
      idempotencyKey: req.get('Idempotency-Key') || req.body.idempotencyKey || undefined,
    });
```

`backend/src/services/itineraryBooking.js`:

1. Add after `requoteLegOrThrow`:

```js
// Uses the server-side offers, never client times: the return's first leg must
// leave after the outbound's last leg arrives.
function assertReturnAfterOutbound(legs, offers) {
  const firstReturn = legs.findIndex(l => l.direction === 'return');
  const outboundArrive = new Date(offers[firstReturn - 1].arriveAt).getTime();
  const returnDepart = new Date(offers[firstReturn].departAt).getTime();
  if (!(returnDepart > outboundArrive)) {
    throw Object.assign(new Error('Return must depart after the outbound arrives'), { status: 400 });
  }
}
```

2. Change the signature and add the check right after the re-quote (step 2), before any money moves:

```js
async function bookItinerary({ userId, legs, passengers, paymentMethodId, origin, destination, idempotencyKey, tripType = 'one_way' }) {
  // 1. Resolve all leg providers before any money moves
  const legProviders = legs.map(leg => providers.getProvider(leg.provider));

  // 2. Re-quote every leg against the authoritative server-side offers
  const offers = legs.map(requoteLegOrThrow);
  if (tripType === 'round_trip') assertReturnAfterOutbound(legs, offers);
  const totalPriceEur = offers.reduce((sum, o) => sum + o.priceEur, 0);
```

3. Stripe description:

```js
      description: tripType === 'round_trip'
        ? `TraveScout Round trip: ${origin} ⇄ ${destination} (${legs.length} legs)`
        : `TraveScout Itinerary: ${origin} → ${destination} (${legs.length} legs)`,
```

4. In `Itinerary.create({...})` add `tripType,` after `status,`.
5. In `Trip.create({...})` add `direction: leg.direction || 'outbound',` after `legOrder: i,`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && npm test && npm run lint`
Expected: all suites PASS (161 + new), lint clean.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/itineraryBooking.js backend/src/controllers/itineraryBooking.js backend/tests/itineraryBooking.test.js
git commit -m "feat(backend): book round trips as one itinerary with direction-tagged legs"
```

---

### Task 4: Mobile types, per-direction connections, itinerary helpers

**Files:**
- Modify: `mobile/src/types/itinerary.ts`
- Modify: `mobile/src/types/booking.ts`
- Modify: `mobile/src/utils/connections.ts`
- Create: `mobile/src/utils/itinerary.ts`
- Test: `mobile/__tests__/utils/connections.test.ts`, create `mobile/__tests__/utils/itinerary.test.ts`

**Interfaces:**
- Produces (types): `Direction = 'outbound' | 'return'`; `TripType = 'one_way' | 'round_trip'`; `Leg.direction?: Direction`; `Connection.stay?: boolean`; `CheckoutItinerary.tripType?: TripType`, `CheckoutItinerary.viaConnections?: boolean`; `ItineraryBookingRequest.tripType?: TripType`; `BookedItinerary.trip_type?: TripType`; `BookedTrip.direction?: 'outbound' | 'return'`.
- Produces (functions, `src/utils/itinerary.ts`):
  - `toLeg(trip: Trip, direction?: Direction): Leg`
  - `itineraryEndpoints(it: CheckoutItinerary): { origin: string; destination: string; originName: string; destinationName: string }`
  - `legsByDirection<T extends { direction?: Direction }>(legs: T[]): { outbound: T[]; return: T[] }`
- `computeConnections(legs)` still returns `legs.length - 1` entries; the entry between legs of different directions is `{ transferMins, stay: true }` with no warning.

- [ ] **Step 1: Write the failing tests**

Append to `mobile/__tests__/utils/connections.test.ts` (inside the file; reuse its existing leg factory if it has one, otherwise use this local one):

```ts
describe('computeConnections — round trips', () => {
  const mk = (over: Partial<Leg>): Leg => ({
    id: 'x', provider: 'rail', transportType: 'train', origin: 'A', destination: 'B',
    originName: 'A', destinationName: 'B', departAt: '2030-06-15T08:00:00Z', arriveAt: '2030-06-15T10:00:00Z',
    durationMins: 120, priceEur: 10, stops: 0, deepLink: '', ...over,
  });

  it('marks the gap between outbound and return as the stay, without a warning', () => {
    const out = mk({ direction: 'outbound', arriveAt: '2030-06-15T10:00:00Z' });
    const ret = mk({ direction: 'return', departAt: '2030-06-15T10:20:00Z', arriveAt: '2030-06-15T12:00:00Z' });
    const [c] = computeConnections([out, ret]);
    expect(c.stay).toBe(true);
    expect(c.warning).toBeUndefined();
  });

  it('still warns on a tight connection inside one direction', () => {
    const a = mk({ direction: 'return', transportType: 'bus', arriveAt: '2030-06-20T10:00:00Z' });
    const b = mk({ direction: 'return', departAt: '2030-06-20T10:10:00Z' });
    const [c] = computeConnections([a, b]);
    expect(c.stay).toBeUndefined();
    expect(c.warning).toMatch(/Tight connection/);
  });
});
```

(Make sure `Leg` is imported at the top: `import type { Leg } from '../../src/types/itinerary';`.)

`mobile/__tests__/utils/itinerary.test.ts`:

```ts
import { toLeg, itineraryEndpoints, legsByDirection } from '../../src/utils/itinerary';
import type { CheckoutItinerary, Leg } from '../../src/types/itinerary';
import type { Trip } from '../../src/types/trip';

const trip: Trip = {
  id: 'rail:1', provider: 'rail', transportType: 'train', origin: 'LON', destination: 'PAR',
  departAt: '2030-06-15T08:00:00Z', arriveAt: '2030-06-15T10:30:00Z', durationMins: 150,
  priceEur: 50, stops: 0, deepLink: '',
};
const leg = (origin: string, destination: string, direction?: Leg['direction']): Leg => ({
  ...trip, origin, destination, originName: `${origin} name`, destinationName: `${destination} name`, direction,
});
const itin = (legs: Leg[]): CheckoutItinerary => ({ legs, connections: [], totalPriceEur: 0, adults: 1 });

describe('toLeg', () => {
  it('uses codes as names and tags the direction', () => {
    expect(toLeg(trip, 'return')).toMatchObject({ originName: 'LON', destinationName: 'PAR', direction: 'return' });
  });
});

describe('itineraryEndpoints', () => {
  it('one-way: first origin to last destination', () => {
    expect(itineraryEndpoints(itin([leg('BRI', 'LON'), leg('LON', 'PAR')]))).toEqual({
      origin: 'BRI', destination: 'PAR', originName: 'BRI name', destinationName: 'PAR name',
    });
  });

  it('round trip: outbound endpoints only, not back home', () => {
    const legs = [
      leg('BRI', 'LON', 'outbound'), leg('LON', 'PAR', 'outbound'),
      leg('PAR', 'LON', 'return'), leg('LON', 'BRI', 'return'),
    ];
    expect(itineraryEndpoints(itin(legs))).toMatchObject({ origin: 'BRI', destination: 'PAR' });
  });
});

describe('legsByDirection', () => {
  it('treats legs without a direction as outbound', () => {
    const groups = legsByDirection([leg('A', 'B'), leg('B', 'A', 'return')]);
    expect(groups.outbound).toHaveLength(1);
    expect(groups.return).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/utils/connections.test.ts __tests__/utils/itinerary.test.ts`
Expected: FAIL — `Cannot find module '../../src/utils/itinerary'`, `stay` undefined.

- [ ] **Step 3: Implement types**

`mobile/src/types/itinerary.ts` — add at the top (after imports) and extend interfaces:

```ts
export type Direction = 'outbound' | 'return';
export type TripType = 'one_way' | 'round_trip';

export interface Leg extends Trip {
  originName: string;
  destinationName: string;
  /** Absent means outbound (one-way itineraries). */
  direction?: Direction;
}

export interface Connection {
  transferMins: number;
  warning?: string;
  /** The gap between the outbound and the return — the stay, not a transfer. */
  stay?: boolean;
}

export interface CheckoutItinerary {
  legs: Leg[];
  connections: Connection[];
  totalPriceEur: number;
  adults: number;
  /** Absent means one-way. */
  tripType?: TripType;
  /** Round trips only: the user chose "Add Connections" (connection steps shown). */
  viaConnections?: boolean;
}
```

In `ItineraryBookingRequest` add `tripType?: TripType;`. In `BookedItinerary` add `trip_type?: TripType;`.

`mobile/src/types/booking.ts` — in `BookedTrip` add after `leg_order?: number;`:

```ts
  direction?: 'outbound' | 'return';
```

- [ ] **Step 4: Implement `computeConnections` stay entries**

In `mobile/src/utils/connections.ts`, inside the `for` loop right after `const transferMins = …;`:

```ts
    // Outbound → return is the stay at the destination, not a connection.
    if ((legs[i].direction ?? 'outbound') !== (legs[i + 1].direction ?? 'outbound')) {
      connections.push({ transferMins, stay: true });
      continue;
    }
```

- [ ] **Step 5: Create `mobile/src/utils/itinerary.ts`**

```ts
import type { Trip } from '../types/trip';
import type { CheckoutItinerary, Direction, Leg } from '../types/itinerary';

// Search results carry codes only; use them as display names like the rest of checkout.
export function toLeg(trip: Trip, direction?: Direction): Leg {
  return { ...trip, originName: trip.origin, destinationName: trip.destination, ...(direction ? { direction } : {}) };
}

export function legsByDirection<T extends { direction?: Direction }>(legs: T[]): { outbound: T[]; return: T[] } {
  return {
    outbound: legs.filter(l => (l.direction ?? 'outbound') === 'outbound'),
    return: legs.filter(l => l.direction === 'return'),
  };
}

// Where the trip goes: for a round trip that is the outbound's start and end,
// never legs[0] → legs[last] (which would read "London → London").
export function itineraryEndpoints(it: CheckoutItinerary): {
  origin: string;
  destination: string;
  originName: string;
  destinationName: string;
} {
  const outbound = legsByDirection(it.legs).outbound;
  const first = outbound[0] ?? it.legs[0];
  const last = outbound[outbound.length - 1] ?? it.legs[it.legs.length - 1];
  return {
    origin: first.origin,
    destination: last.destination,
    originName: first.originName,
    destinationName: last.destinationName,
  };
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/utils && npm run typecheck`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/types mobile/src/utils/connections.ts mobile/src/utils/itinerary.ts mobile/__tests__/utils/connections.test.ts mobile/__tests__/utils/itinerary.test.ts
git commit -m "feat(mobile): round-trip types, stay-aware connections, itinerary endpoint helpers"
```

---

### Task 5: Checkout store holds legs per direction

**Files:**
- Modify: `mobile/src/stores/checkoutStore.ts`
- Test: `mobile/__tests__/stores/checkoutStore.test.ts`

**Interfaces:**
- Consumes: Task 4 types, `computeConnections`.
- Produces:
  - `setCheckoutRoundTrip(outbound: Leg, ret: Leg, adults: number, viaConnections: boolean): void`
  - `setDirectionConnections(direction: Direction, departureLeg?: Leg, arrivalLeg?: Leg): void` — keeps the idempotency key and the other direction's feeders.
  - `getDirectionConnections(direction: Direction): { departure?: Leg; arrival?: Leg }`
  - `getCheckoutMainLeg(direction: Direction = 'outbound'): Leg | null`
  - Unchanged signatures: `setCheckoutTrip`, `setCheckoutItinerary(mainLeg, adults, departureLeg?, arrivalLeg?)`, `getCheckoutItinerary`, `clearCheckout`, `getCheckoutIdempotencyKey`.
  - Built itinerary legs order: outbound departure feeder, outbound main, outbound arrival feeder, return departure feeder, return main, return arrival feeder. Every leg carries `direction`. `tripType` is `'round_trip'` or `'one_way'`.

- [ ] **Step 1: Write the failing tests** — add to the imports of `mobile/__tests__/stores/checkoutStore.test.ts`: `setCheckoutRoundTrip, setDirectionConnections, getDirectionConnections, getCheckoutMainLeg, getCheckoutIdempotencyKey`, then append:

```ts
describe('checkoutStore — round trips', () => {
  const out = makeLeg({ id: 'out', origin: 'LON', destination: 'PAR', priceEur: 50, arriveAt: '2030-06-15T10:30:00Z' });
  const ret = makeLeg({ id: 'ret', origin: 'PAR', destination: 'LON', priceEur: 40, departAt: '2030-06-18T17:00:00Z', arriveAt: '2030-06-18T19:30:00Z' });
  const feeder = (id: string) => makeLeg({ id, priceEur: 5 });

  it('builds a two-leg round-trip itinerary', () => {
    setCheckoutRoundTrip(out, ret, 2, false);
    const it = getCheckoutItinerary()!;
    expect(it.tripType).toBe('round_trip');
    expect(it.viaConnections).toBe(false);
    expect(it.legs.map(l => [l.id, l.direction])).toEqual([['out', 'outbound'], ['ret', 'return']]);
    expect(it.totalPriceEur).toBe(90);
    expect(it.adults).toBe(2);
    expect(it.connections[0].stay).toBe(true);
    expect(getCheckoutMainLeg('return')!.id).toBe('ret');
    expect(getCheckoutMainLeg()!.id).toBe('out');
  });

  it('orders feeders per direction and keeps the idempotency key', () => {
    setCheckoutRoundTrip(out, ret, 1, true);
    const key = getCheckoutIdempotencyKey();
    setDirectionConnections('outbound', feeder('out-dep'), undefined);
    setDirectionConnections('return', undefined, feeder('ret-arr'));
    const ids = getCheckoutItinerary()!.legs.map(l => l.id);
    expect(ids).toEqual(['out-dep', 'out', 'ret', 'ret-arr']);
    expect(getCheckoutItinerary()!.totalPriceEur).toBe(100);
    expect(getCheckoutIdempotencyKey()).toBe(key);
  });

  it('keeps the return feeders when the outbound feeders change (back navigation)', () => {
    setCheckoutRoundTrip(out, ret, 1, true);
    setDirectionConnections('outbound', feeder('dep-1'), undefined);
    setDirectionConnections('return', feeder('ret-dep'), undefined);
    setDirectionConnections('outbound', feeder('dep-2'), undefined);
    expect(getCheckoutItinerary()!.legs.map(l => l.id)).toEqual(['dep-2', 'out', 'ret-dep', 'ret']);
    expect(getDirectionConnections('return').departure!.id).toBe('ret-dep');
  });

  it('one-way itineraries stay one-way and tag outbound', () => {
    setCheckoutItinerary(out, 1);
    const it = getCheckoutItinerary()!;
    expect(it.tripType).toBe('one_way');
    expect(it.legs[0].direction).toBe('outbound');
    expect(getCheckoutMainLeg('return')).toBeNull();
  });

  it('clearCheckout forgets both directions', () => {
    setCheckoutRoundTrip(out, ret, 1, false);
    clearCheckout();
    expect(getCheckoutMainLeg()).toBeNull();
    expect(getCheckoutMainLeg('return')).toBeNull();
    expect(getDirectionConnections('outbound')).toEqual({});
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/stores/checkoutStore.test.ts`
Expected: FAIL — `setCheckoutRoundTrip is not a function`.

- [ ] **Step 3: Implement** — edit `mobile/src/stores/checkoutStore.ts`:

Change the itinerary type import to `import type { Leg, CheckoutItinerary, ItineraryBookingResponse, Direction, TripType } from '../types/itinerary';`

Replace `let _mainLeg: Leg | null = null;` with:

```ts
interface DirectionLegs {
  main: Leg;
  departure?: Leg;
  arrival?: Leg;
}
// Main leg + optional feeders for each direction; the itinerary's flat leg
// list is always rebuilt from this, so either direction can be edited alone.
let _directions: Partial<Record<Direction, DirectionLegs>> = {};
let _tripType: TripType = 'one_way';
let _viaConnections = false;
```

Add below `newIdempotencyKey`:

```ts
const DIRECTIONS: Direction[] = ['outbound', 'return'];

function rebuildItinerary(adults: number): void {
  const legs: Leg[] = [];
  for (const dir of DIRECTIONS) {
    const d = _directions[dir];
    if (!d) continue;
    for (const leg of [d.departure, d.main, d.arrival]) {
      if (leg) legs.push({ ...leg, direction: dir });
    }
  }
  _itinerary = {
    legs,
    connections: computeConnections(legs),
    totalPriceEur: legs.reduce((sum, leg) => sum + leg.priceEur, 0),
    adults,
    tripType: _tripType,
    viaConnections: _viaConnections,
  };
}
```

In `setCheckoutTrip` and `clearCheckout`, replace `_mainLeg = null;` with:

```ts
  _directions = {};
  _tripType = 'one_way';
  _viaConnections = false;
```

Replace `setCheckoutItinerary` body and the main-leg getter, and add the new functions:

```ts
export function setCheckoutItinerary(
  mainLeg: Leg,
  adults: number,
  departureLeg?: Leg,
  arrivalLeg?: Leg,
): void {
  _directions = { outbound: { main: mainLeg, departure: departureLeg, arrival: arrivalLeg } };
  _tripType = 'one_way';
  _viaConnections = true;
  _adults = adults;
  rebuildItinerary(adults);
  _trip = null;
  _bookingResult = null;
  _transfer = EMPTY_TRANSFER;
  _idempotencyKey = newIdempotencyKey();
}

export function setCheckoutRoundTrip(outbound: Leg, ret: Leg, adults: number, viaConnections: boolean): void {
  _directions = { outbound: { main: outbound }, return: { main: ret } };
  _tripType = 'round_trip';
  _viaConnections = viaConnections;
  _adults = adults;
  _passengers = [];
  rebuildItinerary(adults);
  _trip = null;
  _bookingResult = null;
  _transfer = EMPTY_TRANSFER;
  _idempotencyKey = newIdempotencyKey();
}

// Same checkout attempt: the idempotency key is kept.
export function setDirectionConnections(direction: Direction, departureLeg?: Leg, arrivalLeg?: Leg): void {
  const d = _directions[direction];
  if (!d) return;
  _directions = { ..._directions, [direction]: { main: d.main, departure: departureLeg, arrival: arrivalLeg } };
  rebuildItinerary(_adults);
}

export function getDirectionConnections(direction: Direction): { departure?: Leg; arrival?: Leg } {
  const d = _directions[direction];
  if (!d) return {};
  return {
    ...(d.departure ? { departure: d.departure } : {}),
    ...(d.arrival ? { arrival: d.arrival } : {}),
  };
}

// The itinerary's leg order changes as connections are added; screens that
// need a direction's main leg must not derive it from legs[0].
export function getCheckoutMainLeg(direction: Direction = 'outbound'): Leg | null {
  return _directions[direction]?.main ?? null;
}
```

Remove the old `getCheckoutMainLeg` and any remaining `_mainLeg` references.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/stores/checkoutStore.test.ts && npm run typecheck`
Expected: PASS (old + new tests).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/stores/checkoutStore.ts mobile/__tests__/stores/checkoutStore.test.ts
git commit -m "feat(mobile): checkout store keeps outbound and return legs per direction"
```

---

### Task 6: Search store per-leg results + round-trip helpers + recent searches

**Files:**
- Modify: `mobile/src/stores/searchStore.ts`
- Create: `mobile/src/utils/roundTrip.ts`
- Modify: `mobile/src/utils/recentSearches.ts`
- Test: `mobile/__tests__/stores/searchStore.test.ts`, create `mobile/__tests__/utils/roundTrip.test.ts`, `mobile/__tests__/utils/recentSearches.test.ts`

**Interfaces:**
- Produces (`searchStore`):
  - `SearchQuery.returnDate?: string`; `type SearchLeg = 'outbound' | 'return'`
  - `setSearchResults(results, meta, leg: SearchLeg = 'outbound')`, `getSearchResults(leg = 'outbound')`, `getSearchMeta(leg = 'outbound')`, `getResultById(id, leg = 'outbound')`
  - `setSelectedOutbound(trip: RankedTrip | null)`, `getSelectedOutbound(): RankedTrip | null`
  - `clearSearchResults()` clears both legs, the query and the selected outbound.
- Produces (`src/utils/roundTrip.ts`):
  - `RETURN_BUFFER_MINS = 60`
  - `defaultReturnDate(departDate: string): string` (= +3 days)
  - `returnSearchQuery(q: SearchQuery, outbound: Trip | null): SearchQuery | null` — `null` for one-way; otherwise cities swapped, `departDate = max(q.returnDate, local arrival date of outbound)`, no `returnDate`.
  - `returnsAfter<T extends Trip>(trips: T[], outbound: Trip | null, bufferMins = RETURN_BUFFER_MINS): T[]`
  - `reversePrefs(p: TransferPrefs): TransferPrefs` (swaps start/end addresses)
- `RecentSearch.returnDate?: string`.

- [ ] **Step 1: Write the failing tests**

`mobile/__tests__/utils/roundTrip.test.ts`:

```ts
import { defaultReturnDate, returnSearchQuery, returnsAfter, reversePrefs, RETURN_BUFFER_MINS } from '../../src/utils/roundTrip';
import { parseISODate } from '../../src/utils/format';
import type { Trip } from '../../src/types/trip';

const LON = { name: 'London', code: 'LON', country: 'UK' } as any;
const PAR = { name: 'Paris', code: 'PAR', country: 'FR' } as any;
// Local wall-clock time on a calendar day (tests run in any timezone).
const at = (iso: string, h: number, m = 0) => {
  const d = parseISODate(iso);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const trip = (departAt: string, arriveAt: string, id = 't'): Trip => ({
  id, provider: 'rail', transportType: 'train', origin: 'PAR', destination: 'LON',
  departAt, arriveAt, durationMins: 120, priceEur: 40, stops: 0, deepLink: '',
});

describe('defaultReturnDate', () => {
  it('is three days after departure', () => {
    expect(defaultReturnDate('2030-02-27')).toBe('2030-03-02');
  });
});

describe('returnSearchQuery', () => {
  const q = { from: LON, to: PAR, departDate: '2030-06-15', returnDate: '2030-06-18', adults: 2 };

  it('is null for one-way searches', () => {
    expect(returnSearchQuery({ ...q, returnDate: undefined }, null)).toBeNull();
  });

  it('swaps the cities and searches the return date', () => {
    const outbound = trip(at('2030-06-15', 8), at('2030-06-15', 11));
    expect(returnSearchQuery(q, outbound)).toEqual({ from: PAR, to: LON, departDate: '2030-06-18', adults: 2 });
  });

  it('moves to the outbound arrival day when an overnight outbound lands after the return date', () => {
    const outbound = trip(at('2030-06-15', 22), at('2030-06-16', 9));
    const sameDay = { ...q, returnDate: '2030-06-15' };
    expect(returnSearchQuery(sameDay, outbound)!.departDate).toBe('2030-06-16');
  });
});

describe('returnsAfter', () => {
  const outbound = trip(at('2030-06-15', 8), at('2030-06-15', 10));

  it(`hides returns departing less than ${RETURN_BUFFER_MINS} min after the outbound arrives`, () => {
    const tooSoon = trip(at('2030-06-15', 10, 30), at('2030-06-15', 12), 'soon');
    const ok = trip(at('2030-06-15', 11), at('2030-06-15', 13), 'ok');
    expect(returnsAfter([tooSoon, ok], outbound).map(t => t.id)).toEqual(['ok']);
  });

  it('keeps everything when no outbound is selected', () => {
    expect(returnsAfter([outbound], null)).toHaveLength(1);
  });
});

describe('reversePrefs', () => {
  it('swaps start and end, keeps the mode', () => {
    expect(reversePrefs({ startAddress: 'Home', endAddress: 'Hotel', travelMode: 'walking' })).toEqual({
      startAddress: 'Hotel', endAddress: 'Home', travelMode: 'walking',
    });
  });
});
```

Append to `mobile/__tests__/stores/searchStore.test.ts` (add the new names to its import from `../../src/stores/searchStore`: `setSelectedOutbound, getSelectedOutbound`):

```ts
describe('searchStore — return leg', () => {
  const r = (id: string) => ({ id } as any);
  const m = (from: string) => ({ from, to: 'X', departDate: '2030-06-18', adults: 1, providersQueried: [], providersFailed: [] });

  it('keeps outbound and return results apart', () => {
    setSearchResults([r('out-1')], m('LON'));
    setSearchResults([r('ret-1')], m('PAR'), 'return');
    expect(getSearchResults().map(t => t.id)).toEqual(['out-1']);
    expect(getSearchResults('return').map(t => t.id)).toEqual(['ret-1']);
    expect(getSearchMeta('return')!.from).toBe('PAR');
    expect(getResultById('ret-1', 'return')).toBeDefined();
    expect(getResultById('ret-1')).toBeUndefined();
  });

  it('remembers the selected outbound until cleared', () => {
    setSelectedOutbound(r('out-1'));
    expect(getSelectedOutbound()!.id).toBe('out-1');
    clearSearchResults();
    expect(getSelectedOutbound()).toBeNull();
    expect(getSearchResults('return')).toEqual([]);
  });
});
```

`mobile/__tests__/utils/recentSearches.test.ts` already exists — append:

```ts
it('keeps the return date of a round-trip search', async () => {
  const LON = { name: 'London', code: 'LON', country: 'UK' } as any;
  const PAR = { name: 'Paris', code: 'PAR', country: 'FR' } as any;
  await addRecentSearch('rt@x.com', { from: LON, to: PAR, departDate: '2030-06-15', returnDate: '2030-06-18', adults: 1 });
  const [first] = await getRecentSearches('rt@x.com');
  expect(first.returnDate).toBe('2030-06-18');
});
```

(Import `addRecentSearch, getRecentSearches` if not already imported.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/utils/roundTrip.test.ts __tests__/stores/searchStore.test.ts __tests__/utils/recentSearches.test.ts`
Expected: FAIL — missing module `roundTrip`, `setSelectedOutbound` not a function, TS error on `returnDate` in RecentSearch.

- [ ] **Step 3: Implement the search store**

Replace `mobile/src/stores/searchStore.ts` with:

```ts
import { RankedTrip, SearchMeta } from '../types/trip';
import type { City } from '../data/cities';

// The query behind the current results, with full city objects so the results
// screen can show names and re-run the search for another date.
export interface SearchQuery {
  from: City;
  to: City;
  departDate: string;
  /** Set for round trips; the return leg is searched as a one-way back. */
  returnDate?: string;
  adults: number;
}

export type SearchLeg = 'outbound' | 'return';

interface LegResults {
  results: RankedTrip[];
  meta: SearchMeta | null;
}

const empty = (): LegResults => ({ results: [], meta: null });

let _legs: Record<SearchLeg, LegResults> = { outbound: empty(), return: empty() };
let _query: SearchQuery | null = null;
let _selectedOutbound: RankedTrip | null = null;

export function setSearchResults(results: RankedTrip[], meta: SearchMeta, leg: SearchLeg = 'outbound'): void {
  _legs = { ..._legs, [leg]: { results, meta } };
}

export function getSearchResults(leg: SearchLeg = 'outbound'): RankedTrip[] {
  return _legs[leg].results;
}

export function getSearchMeta(leg: SearchLeg = 'outbound'): SearchMeta | null {
  return _legs[leg].meta;
}

export function getResultById(id: string, leg: SearchLeg = 'outbound'): RankedTrip | undefined {
  return _legs[leg].results.find(t => t.id === id);
}

export function setSearchQuery(query: SearchQuery): void {
  _query = query;
}

export function getSearchQuery(): SearchQuery | null {
  return _query;
}

export function setSelectedOutbound(trip: RankedTrip | null): void {
  _selectedOutbound = trip;
}

export function getSelectedOutbound(): RankedTrip | null {
  return _selectedOutbound;
}

export function clearSearchResults(): void {
  _legs = { outbound: empty(), return: empty() };
  _query = null;
  _selectedOutbound = null;
}
```

- [ ] **Step 4: Implement `mobile/src/utils/roundTrip.ts`**

```ts
import type { Trip } from '../types/trip';
import type { SearchQuery } from '../stores/searchStore';
import type { TransferPrefs } from './transferPrefs';
import { addDays, toISODate } from './format';

// A return must leave at least this long after the outbound arrives.
export const RETURN_BUFFER_MINS = 60;

export function defaultReturnDate(departDate: string): string {
  return addDays(departDate, 3);
}

// The return leg is a plain one-way search back. An overnight outbound can
// land after the chosen return date; then search from its arrival day.
export function returnSearchQuery(q: SearchQuery, outbound: Trip | null): SearchQuery | null {
  if (!q.returnDate) return null;
  const arrivalDay = outbound ? toISODate(new Date(outbound.arriveAt)) : q.returnDate;
  return {
    from: q.to,
    to: q.from,
    departDate: q.returnDate < arrivalDay ? arrivalDay : q.returnDate,
    adults: q.adults,
  };
}

export function returnsAfter<T extends Trip>(trips: T[], outbound: Trip | null, bufferMins = RETURN_BUFFER_MINS): T[] {
  if (!outbound) return trips;
  const earliest = new Date(outbound.arriveAt).getTime() + bufferMins * 60_000;
  return trips.filter(t => new Date(t.departAt).getTime() >= earliest);
}

// Transfer prefs are stored outbound-oriented (home → stay); the return runs backwards.
export function reversePrefs(p: TransferPrefs): TransferPrefs {
  return { startAddress: p.endAddress, endAddress: p.startAddress, travelMode: p.travelMode };
}
```

- [ ] **Step 5: Recent searches type** — in `mobile/src/utils/recentSearches.ts` add to `RecentSearch`:

```ts
  /** Round trips only. */
  returnDate?: string;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd mobile && npm test && npm run typecheck`
Expected: all PASS. (Existing callers of `getSearchResults()` / `getSearchMeta()` / `getResultById(id)` keep working through the default `'outbound'` argument.)

- [ ] **Step 7: Commit**

```bash
git add mobile/src/stores/searchStore.ts mobile/src/utils/roundTrip.ts mobile/src/utils/recentSearches.ts mobile/__tests__/stores/searchStore.test.ts mobile/__tests__/utils/roundTrip.test.ts mobile/__tests__/utils/recentSearches.test.ts
git commit -m "feat(mobile): per-leg search results, selected outbound, round-trip helpers"
```

---

### Task 7: Checkout flows in the Stepper + endpoints in checkout screens + payment request

**Files:**
- Modify: `mobile/src/components/Stepper.tsx`
- Modify: `mobile/app/checkout/transfer.tsx`, `passengers.tsx`, `review.tsx`, `payment.tsx`, `connections.tsx` (Stepper usage only in this task)
- Test: create `mobile/__tests__/components/Stepper.test.ts`; modify `mobile/__tests__/screens/PaymentScreen.test.tsx`, `mobile/__tests__/screens/PassengersScreen.test.tsx`

**Interfaces:**
- Consumes: Task 4 `itineraryEndpoints`, `CheckoutItinerary.tripType/viaConnections`.
- Produces (`Stepper.tsx`):
  - `type CheckoutStep = 'Connections' | 'Outbound connections' | 'Return connections' | 'Getting there' | 'Passengers' | 'Review' | 'Pay'`
  - `type CheckoutFlow = 'one_way' | 'one_way_connections' | 'round_trip' | 'round_trip_connections'`
  - `checkoutFlow(itinerary: CheckoutItinerary | null | undefined): CheckoutFlow`
  - `checkoutSteps(flow: CheckoutFlow): CheckoutStep[]`
  - `stepIndex(flow: CheckoutFlow, step: CheckoutStep): number`
- Payment: round trips send `tripType: 'round_trip'`; `origin`/`destination` fall back to `itineraryEndpoints` (one-way requests unchanged — no `tripType` field).

Note: screen tests auto-mock the stores, so screens must derive the flow from the itinerary object (a pure function in `Stepper.tsx`), never from a new store getter.

- [ ] **Step 1: Write the failing tests**

`mobile/__tests__/components/Stepper.test.ts`:

```ts
import { checkoutFlow, checkoutSteps, stepIndex } from '../../src/components/Stepper';
import type { CheckoutItinerary } from '../../src/types/itinerary';

const itin = (over: Partial<CheckoutItinerary> = {}): CheckoutItinerary => ({
  legs: [], connections: [], totalPriceEur: 0, adults: 1, ...over,
});

describe('checkoutFlow', () => {
  it('derives the flow from the itinerary', () => {
    expect(checkoutFlow(null)).toBe('one_way');
    expect(checkoutFlow(itin())).toBe('one_way_connections');
    expect(checkoutFlow(itin({ tripType: 'round_trip', viaConnections: false }))).toBe('round_trip');
    expect(checkoutFlow(itin({ tripType: 'round_trip', viaConnections: true }))).toBe('round_trip_connections');
  });
});

describe('checkoutSteps', () => {
  it('lists the steps for every flow', () => {
    expect(checkoutSteps('one_way')).toEqual(['Getting there', 'Passengers', 'Review', 'Pay']);
    expect(checkoutSteps('one_way_connections')).toEqual(['Connections', 'Getting there', 'Passengers', 'Review', 'Pay']);
    expect(checkoutSteps('round_trip')).toEqual(['Getting there', 'Passengers', 'Review', 'Pay']);
    expect(checkoutSteps('round_trip_connections')).toEqual([
      'Outbound connections', 'Return connections', 'Getting there', 'Passengers', 'Review', 'Pay',
    ]);
  });

  it('indexes a step within its flow', () => {
    expect(stepIndex('round_trip_connections', 'Passengers')).toBe(3);
    expect(stepIndex('one_way', 'Pay')).toBe(3);
  });
});
```

`mobile/__tests__/screens/PaymentScreen.test.tsx` has no itinerary mocks yet. Add `getCheckoutItinerary` to its checkout-store import, and below the existing `jest.mock(...)` lines:

```ts
import { bookItinerary } from '../../src/api/itinerary';
jest.mock('../../src/api/itinerary');
const mockGetItinerary = getCheckoutItinerary as jest.Mock;
const mockBookItinerary = bookItinerary as jest.Mock;
```

Then append (it uses the file's existing `fillValidCard` helper):

```ts
it('books a round trip with tripType and the outbound endpoints', async () => {
  const base = {
    provider: 'rail', transportType: 'train', durationMins: 120, priceEur: 45, stops: 0, deepLink: '',
    departAt: '2030-06-15T08:00:00Z', arriveAt: '2030-06-15T10:00:00Z',
  };
  const legs = [
    { ...base, id: 'out', origin: 'LON', destination: 'PAR', originName: 'LON', destinationName: 'PAR', direction: 'outbound' },
    { ...base, id: 'ret', origin: 'PAR', destination: 'LON', originName: 'PAR', destinationName: 'LON', direction: 'return' },
  ];
  mockGetTrip.mockReturnValue(null);
  mockGetItinerary.mockReturnValue({
    legs, connections: [{ transferMins: 4000, stay: true }], totalPriceEur: 90, adults: 1,
    tripType: 'round_trip', viaConnections: false,
  });
  mockBookItinerary.mockResolvedValue({ bookingRef: 'TS-RT', status: 'confirmed', itinerary: { legs: [] } });

  const { getByTestId, getByText } = render(<PaymentScreen />);
  expect(getByText('LON ⇄ PAR')).toBeTruthy();
  fillValidCard(getByTestId);
  fireEvent.press(getByTestId('pay-btn'));

  await waitFor(() =>
    expect(mockBookItinerary).toHaveBeenCalledWith(
      expect.objectContaining({ tripType: 'round_trip', origin: 'LON', destination: 'PAR', idempotencyKey: 'bk_test_key' }),
    ),
  );
});
```

(`getSearchMeta` is auto-mocked to return `undefined`, so the endpoints come from `itineraryEndpoints`.)

In `mobile/__tests__/screens/PassengersScreen.test.tsx`, add `getCheckoutItinerary` to its checkout-store import, `const mockGetItinerary = getCheckoutItinerary as jest.Mock;` next to the other mock constants, and append:

```ts
it('shows the outbound route for a round trip, not back home', () => {
  mockGetTrip.mockReturnValue(null);
  mockGetAdults.mockReturnValue(1);
  mockGetItinerary.mockReturnValue({
    legs: [
      { id: 'o', origin: 'LON', destination: 'PAR', originName: 'London', destinationName: 'Paris', direction: 'outbound' },
      { id: 'r', origin: 'PAR', destination: 'LON', originName: 'Paris', destinationName: 'London', direction: 'return' },
    ],
    connections: [], totalPriceEur: 0, adults: 1, tripType: 'round_trip',
  });
  const { getByText } = render(<PassengersScreen />);
  expect(getByText('London ⇄ Paris')).toBeTruthy();
});
```

(`AppHeader` renders `subtitle` as a text node.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/components/Stepper.test.ts __tests__/screens/PaymentScreen.test.tsx __tests__/screens/PassengersScreen.test.tsx`
Expected: FAIL — `checkoutFlow is not a function`; payment call lacks `tripType`; subtitle reads "London → London".

- [ ] **Step 3: Implement the Stepper helpers** — replace the type + `checkoutSteps` at the top of `mobile/src/components/Stepper.tsx`:

```ts
import type { CheckoutItinerary } from '../types/itinerary';

export type CheckoutStep =
  | 'Connections'
  | 'Outbound connections'
  | 'Return connections'
  | 'Getting there'
  | 'Passengers'
  | 'Review'
  | 'Pay';

export type CheckoutFlow = 'one_way' | 'one_way_connections' | 'round_trip' | 'round_trip_connections';

// A one-way itinerary only exists via "Add Connections"; a round trip is always
// an itinerary and remembers whether the user asked for connections.
export function checkoutFlow(itinerary: CheckoutItinerary | null | undefined): CheckoutFlow {
  if (!itinerary) return 'one_way';
  if (itinerary.tripType === 'round_trip') {
    return itinerary.viaConnections ? 'round_trip_connections' : 'round_trip';
  }
  return 'one_way_connections';
}

const BASE_STEPS: CheckoutStep[] = ['Getting there', 'Passengers', 'Review', 'Pay'];

// Every screen shows a consistent "Step n of N" for its flow.
export function checkoutSteps(flow: CheckoutFlow): CheckoutStep[] {
  switch (flow) {
    case 'one_way_connections':
      return ['Connections', ...BASE_STEPS];
    case 'round_trip_connections':
      return ['Outbound connections', 'Return connections', ...BASE_STEPS];
    default:
      return BASE_STEPS;
  }
}

export function stepIndex(flow: CheckoutFlow, step: CheckoutStep): number {
  return checkoutSteps(flow).indexOf(step);
}
```

- [ ] **Step 4: Use the helpers in the checkout screens**

In each screen replace the `Stepper` import with `import { Stepper, checkoutFlow, checkoutSteps, stepIndex } from '../../src/components/Stepper';`, compute `const flow = checkoutFlow(itinerary);` after `itinerary` is read (before any early return that renders a Stepper), and replace the `<Stepper …/>` line:

| Screen | New Stepper line |
|---|---|
| `transfer.tsx` | `<Stepper steps={checkoutSteps(flow)} current={stepIndex(flow, 'Getting there')} colors={colors} />` |
| `passengers.tsx` | `<Stepper steps={checkoutSteps(flow)} current={stepIndex(flow, 'Passengers')} colors={colors} />` |
| `review.tsx` | `<Stepper steps={checkoutSteps(flow)} current={stepIndex(flow, 'Review')} colors={colors} />` |
| `payment.tsx` | `<Stepper steps={checkoutSteps(flow)} current={stepIndex(flow, 'Pay')} colors={colors} />` |
| `connections.tsx` | `<Stepper steps={checkoutSteps(flow)} current={stepIndex(flow, 'Connections')} colors={colors} />` (Task 11 makes this direction-aware) |

In `transfer.tsx` and `passengers.tsx`, add `import { itineraryEndpoints } from '../../src/utils/itinerary';` and replace the `routeOrigin`/`routeDestination` block with:

```tsx
  const ends = itinerary ? itineraryEndpoints(itinerary) : null;
  const routeOrigin = trip ? trip.origin : ends!.originName;
  const routeDestination = trip ? trip.destination : ends!.destinationName;
  const arrow = itinerary?.tripType === 'round_trip' ? '⇄' : '→';
```

and change the header subtitle to ``subtitle={`${routeOrigin} ${arrow} ${routeDestination}`}``.

In `payment.tsx`, add `import { itineraryEndpoints } from '../../src/utils/itinerary';`, then replace `routeLabel`:

```tsx
  const ends = itinerary ? itineraryEndpoints(itinerary) : null;
  const roundTrip = itinerary?.tripType === 'round_trip';
  const routeLabel = ends
    ? `${ends.origin} ${roundTrip ? '⇄' : '→'} ${ends.destination}`
    : `${trip!.origin} → ${trip!.destination}`;
```

and the `bookItinerary` call:

```tsx
        result = await bookItinerary({
          legs: itinerary.legs,
          passengers,
          paymentMethodId,
          origin: searchMeta?.from ?? ends!.origin,
          destination: searchMeta?.to ?? ends!.destination,
          ...(roundTrip ? { tripType: 'round_trip' as const } : {}),
          idempotencyKey,
        });
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mobile && npm test && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/Stepper.tsx mobile/app/checkout mobile/__tests__/components/Stepper.test.ts mobile/__tests__/screens/PaymentScreen.test.tsx mobile/__tests__/screens/PassengersScreen.test.tsx
git commit -m "feat(mobile): checkout flows for round trips; outbound endpoints in checkout"
```

---

### Task 8: Search tab — One-way / Return toggle and return date

**Files:**
- Modify: `mobile/app/(tabs)/index.tsx`
- Modify: `mobile/src/components/CalendarSheet.tsx` (optional `title` prop)
- Test: `mobile/__tests__/screens/SearchFormScreen.test.tsx`

**Interfaces:**
- Consumes: Task 6 `SearchQuery.returnDate`, `RecentSearch.returnDate`, `defaultReturnDate`.
- Produces: testIDs `trip-type-one_way`, `trip-type-return` (SegmentedControl prefix `trip-type`), `return-date`, `return-date-value`, calendar sheet testID `return-calendar` when picking the return. `setSearchQuery` receives `returnDate` only when Return is selected.

- [ ] **Step 1: Write the failing tests** — append to `mobile/__tests__/screens/SearchFormScreen.test.tsx` (it already has `renderSettled`, `pickCity`, `mockSetQuery`, the format helpers and `AsyncStorage`; the auth mock user is `alex.orban@example.com`, so recents live under `recent:alex.orban@example.com`):

```tsx
describe('round trips', () => {
  async function londonParis() {
    const utils = await renderSettled(<SearchScreen />);
    pickCity(utils, 'from', 'Lon', 'LON');
    fireEvent.changeText(utils.getByTestId('to-picker-input'), 'Par');
    fireEvent.press(utils.getByTestId('to-picker-option-PAR'));
    return utils;
  }

  it('hides the return date for one-way searches', async () => {
    const utils = await renderSettled(<SearchScreen />);
    expect(utils.queryByTestId('return-date')).toBeNull();
  });

  it('searches with a return date three days after departure by default', async () => {
    const utils = await londonParis();
    fireEvent.press(utils.getByTestId('trip-type-return'));
    expect(utils.getByTestId('return-date-value').props.children).toBe(formatDayLabel(addDays(todayISO(), 4)));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery).toHaveBeenCalledWith(
      expect.objectContaining({ departDate: addDays(todayISO(), 1), returnDate: addDays(todayISO(), 4) }),
    );
  });

  it('drops the return date when switched back to one-way', async () => {
    const utils = await londonParis();
    fireEvent.press(utils.getByTestId('trip-type-return'));
    fireEvent.press(utils.getByTestId('trip-type-one_way'));
    fireEvent.press(utils.getByTestId('search-btn'));
    expect(mockSetQuery.mock.calls.at(-1)[0].returnDate).toBeUndefined();
  });

  it('moves the return date when departure moves past it', async () => {
    const utils = await renderSettled(<SearchScreen />);
    fireEvent.press(utils.getByTestId('trip-type-return'));
    fireEvent.press(utils.getByTestId('depart-date'));
    const later = addDays(todayISO(), 10);
    fireEvent.press(utils.getByTestId(`calendar-day-${later}`));
    expect(utils.getByTestId('return-date-value').props.children).toBe(formatDayLabel(addDays(later, 3)));
  });

  it('titles the return picker and never offers days before departure', async () => {
    const utils = await renderSettled(<SearchScreen />);
    fireEvent.press(utils.getByTestId('trip-type-return'));
    fireEvent.press(utils.getByTestId('return-date'));
    expect(utils.getByText('Return date')).toBeTruthy();
    // departure defaults to tomorrow; today must not be selectable for the return
    const today = utils.queryByTestId(`return-calendar-day-${todayISO()}`);
    expect(today === null || today.props.accessibilityState?.disabled).toBeTruthy();
  });

  it('restores a recent round trip without a return before departure', async () => {
    const depart = addDays(todayISO(), 5);
    await AsyncStorage.setItem('recent:alex.orban@example.com', JSON.stringify([
      {
        from: { name: 'London', code: 'LON', country: 'GB' },
        to: { name: 'Paris', code: 'PAR', country: 'FR' },
        departDate: depart,
        returnDate: addDays(todayISO(), 2), // before its departure
        adults: 1,
      },
    ]));
    const utils = await renderSettled(<SearchScreen />);
    fireEvent.press(await utils.findByTestId('recent-LON-PAR'));
    expect(utils.getByTestId('return-date-value').props.children).toBe(formatDayLabel(addDays(depart, 3)));
  });
});
```

(If a disabled calendar day in `CalendarSheet` is exposed differently than `accessibilityState.disabled`, assert with that — `grep -n "disabled" mobile/src/components/CalendarSheet.tsx`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/screens/SearchFormScreen.test.tsx`
Expected: FAIL — `Unable to find an element with testID: trip-type-return`.

- [ ] **Step 3: Implement**

`mobile/src/components/CalendarSheet.tsx` hard-codes the sheet title "Departure date". Add an optional prop and use it:

```tsx
  /** Sheet title; defaults to "Departure date". */
  title?: string;
```

Destructure `title = 'Departure date'` in the component signature and change the `Sheet` line to `<Sheet visible={visible} onClose={onClose} title={title} testID={testID}>`.

In `mobile/app/(tabs)/index.tsx`:

Imports:

```tsx
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { defaultReturnDate } from '../../src/utils/roundTrip';
```

State (after `departDate`):

```tsx
  const [tripType, setTripType] = useState<'one_way' | 'return'>('one_way');
  const [returnDate, setReturnDate] = useState(() => defaultReturnDate(addDays(todayISO(), 1)));
```

and widen the picker state: `useState<'from' | 'to' | 'date' | 'return' | null>(null)`.

Replace `fill`:

```tsx
  // ret: a string restores a round trip, null restores a one-way search,
  // undefined (popular routes) leaves the trip type alone.
  function fill(from: City, to: City, date?: string, pax?: number, ret?: string | null) {
    haptic.tap();
    setFromCity(from);
    setToCity(to);
    // A recent search's date may have passed; keep the current date then.
    const nextDepart = date && date >= todayISO() ? date : departDate;
    setDepartDate(nextDepart);
    if (pax) setAdults(pax);
    if (ret === null) setTripType('one_way');
    if (typeof ret === 'string') {
      setTripType('return');
      setReturnDate(ret >= nextDepart ? ret : defaultReturnDate(nextDepart));
    }
    setError('');
  }
```

In `handleSearch`, after the past-date check:

```tsx
    const isReturn = tripType === 'return';
    if (isReturn && returnDate < departDate) return setError('Return date must be on or after departure');

    const query = { from: fromCity, to: toCity, departDate, adults, ...(isReturn ? { returnDate } : {}) };
```

(replacing the old `const query = …` line).

In the search `Card`, insert before `<View style={styles.odWrap}>`:

```tsx
          <View style={styles.tripType}>
            <SegmentedControl
              segments={[
                { value: 'one_way', label: 'One-way' },
                { value: 'return', label: 'Return' },
              ]}
              value={tripType}
              onChange={v => {
                setTripType(v);
                setError('');
              }}
              testIDPrefix="trip-type"
            />
          </View>
```

After the closing `</View>` of `styles.bottomRow`, insert:

```tsx
          {tripType === 'return' && (
            <>
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
              <Pressable
                testID="return-date"
                onPress={() => setPicker('return')}
                accessibilityRole="button"
                accessibilityLabel={`Return date ${formatDayLabel(returnDate)}`}
                style={styles.field}
              >
                <Ionicons name="return-down-back-outline" size={18} color={colors.textSecondary} />
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Return</Text>
                  <Text testID="return-date-value" style={[styles.fieldValue, { color: colors.text }]}>
                    {formatDayLabel(returnDate)}
                  </Text>
                </View>
              </Pressable>
            </>
          )}
```

Recent chips: pass the return date and show it:

```tsx
                  onPress={() => fill(r.from, r.to, r.departDate, r.adults, r.returnDate ?? null)}
```

```tsx
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                    {formatDayLabel(r.departDate)}
                    {r.returnDate ? ` – ${formatDayLabel(r.returnDate)}` : ''} · {r.adults} {r.adults === 1 ? 'adult' : 'adults'}
                  </Text>
```

Replace the `CalendarSheet` (one sheet for both dates — iOS can't swap two Modals in one frame; `key` remounts it so its month cursor starts on the right date):

```tsx
      <CalendarSheet
        key={picker === 'return' ? 'return' : 'depart'}
        visible={picker === 'date' || picker === 'return'}
        testID={picker === 'return' ? 'return-calendar' : 'calendar'}
        title={picker === 'return' ? 'Return date' : 'Departure date'}
        value={picker === 'return' ? returnDate : departDate}
        minDate={picker === 'return' ? departDate : undefined}
        onClose={() => setPicker(null)}
        onSelect={iso => {
          if (picker === 'return') {
            setReturnDate(iso);
          } else {
            setDepartDate(iso);
            if (returnDate < iso) setReturnDate(defaultReturnDate(iso));
          }
          setError('');
          setPicker(null);
        }}
      />
```

Style: add `tripType: { paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8 },` to `styles`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/screens/SearchFormScreen.test.tsx && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "mobile/app/(tabs)/index.tsx" mobile/src/components/CalendarSheet.tsx mobile/__tests__/screens/SearchFormScreen.test.tsx
git commit -m "feat(mobile): one-way / return toggle with return date on search"
```

---

### Task 9: Results — outbound and return phases

**Files:**
- Create: `mobile/src/components/OutboundSummary.tsx`
- Modify: `mobile/app/results.tsx`
- Test: `mobile/__tests__/screens/ResultsScreen.test.tsx`

**Interfaces:**
- Consumes: Task 6 store (`getSelectedOutbound`, per-leg results) and `returnSearchQuery`, `returnsAfter`.
- Produces: route `/results?leg=return`; trip cards in the return phase push `/trip/<id>?leg=return`. `OutboundSummary({ trip: Trip; onChange?: () => void; testID?: string })` renders testID `outbound-summary` and, with `onChange`, a `outbound-summary-change` button.

- [ ] **Step 1: Write the failing tests** — in `mobile/__tests__/screens/ResultsScreen.test.tsx`:

Change the router mock to expose params:

```tsx
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn() }),
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    router: { canGoBack: () => false, back: jest.fn() },
  };
});
```

and reset it in `beforeEach`: `mockParams = {};`. Add `setSelectedOutbound` to the searchStore import and `parseISODate` to the format import. Append:

```tsx
describe('round trips', () => {
  const RET = addDays(DATE, 1);
  const at = (iso: string, h: number, m = 0) => {
    const d = parseISODate(iso);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const OUTBOUND = trip('rail:out', { departAt: at(DATE, 8), arriveAt: at(DATE, 10, 15) });

  it('labels the outbound phase and hides dates after the return date', async () => {
    setSearchQuery({ from: LON, to: PAR, departDate: DATE, returnDate: RET, adults: 1 });
    const { findByText, queryByTestId } = render(<ResultsScreen />);
    expect(await findByText(/^Outbound · /)).toBeTruthy();
    // The strip would show DATE-3 … DATE+3; days after the return date are dropped.
    expect(queryByTestId(`date-${RET}`)).toBeTruthy();
    expect(queryByTestId(`date-${addDays(RET, 1)}`)).toBeNull();
  });

  it('searches the way back on the return date and pins the outbound', async () => {
    mockParams = { leg: 'return' };
    setSearchQuery({ from: LON, to: PAR, departDate: DATE, returnDate: RET, adults: 1 });
    setSelectedOutbound(OUTBOUND);
    mockSearch.mockResolvedValue({
      results: [trip('rail:back', { origin: 'PAR', destination: 'LON', departAt: at(RET, 17) })],
      meta: meta(RET, { from: 'PAR', to: 'LON' }),
    });
    const { findByTestId, getByTestId } = render(<ResultsScreen />);
    await findByTestId('trip-rail:back');
    expect(mockSearch).toHaveBeenCalledWith({ from: 'PAR', to: 'LON', departDate: RET, adults: 1 });
    expect(getByTestId('outbound-summary')).toBeTruthy();
    fireEvent.press(getByTestId('trip-rail:back'));
    expect(mockPush).toHaveBeenCalledWith('/trip/rail:back?leg=return');
  });

  it('hides returns leaving within 60 minutes of the outbound arrival', async () => {
    mockParams = { leg: 'return' };
    setSearchQuery({ from: LON, to: PAR, departDate: DATE, returnDate: DATE, adults: 1 });
    setSelectedOutbound(OUTBOUND);
    mockSearch.mockResolvedValue({
      results: [
        trip('rail:soon', { departAt: at(DATE, 10, 45) }),
        trip('rail:later', { departAt: at(DATE, 11, 30) }),
      ],
      meta: meta(DATE, { from: 'PAR', to: 'LON' }),
    });
    const { findByTestId, queryByTestId } = render(<ResultsScreen />);
    await findByTestId('trip-rail:later');
    expect(queryByTestId('trip-rail:soon')).toBeNull();
  });

  it('re-filters cached returns when the user goes back and picks a later outbound', async () => {
    mockParams = { leg: 'return' };
    setSearchQuery({ from: LON, to: PAR, departDate: DATE, returnDate: DATE, adults: 1 });
    setSelectedOutbound(OUTBOUND); // arrives 10:15
    mockSearch.mockResolvedValue({
      results: [trip('rail:back', { departAt: at(DATE, 13) })],
      meta: meta(DATE, { from: 'PAR', to: 'LON' }),
    });
    const first = render(<ResultsScreen />);
    await first.findByTestId('trip-rail:back');
    first.unmount();

    // Back to the outbound list, pick one landing at 14:00, open the returns again.
    setSelectedOutbound(trip('rail:late-out', { departAt: at(DATE, 12), arriveAt: at(DATE, 14) }));
    const second = render(<ResultsScreen />);
    expect(await second.findByText('No returns after your outbound arrives')).toBeTruthy();
    expect(mockSearch).toHaveBeenCalledTimes(1); // same query → cached results, filtered anew
  });

  it('searches the arrival day when an overnight outbound lands after the return date', async () => {
    mockParams = { leg: 'return' };
    setSearchQuery({ from: LON, to: PAR, departDate: DATE, returnDate: DATE, adults: 1 });
    setSelectedOutbound(trip('rail:night', { departAt: at(DATE, 22), arriveAt: at(addDays(DATE, 1), 7) }));
    render(<ResultsScreen />);
    await waitFor(() =>
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({ departDate: addDays(DATE, 1) })),
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/screens/ResultsScreen.test.tsx`
Expected: FAIL — searches LON→PAR on the depart date, no `outbound-summary`.

- [ ] **Step 3: Create `mobile/src/components/OutboundSummary.tsx`**

```tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatDayLabel, formatTime, toISODate } from '../utils/format';
import { radius } from '../constants/theme';
import type { Trip } from '../types/trip';

interface Props {
  trip: Trip;
  /** Shows a "Change" action (e.g. back to the outbound list). */
  onChange?: () => void;
  testID?: string;
}

// The already-chosen outbound, pinned while the return is being picked.
export function OutboundSummary({ trip, onChange, testID = 'outbound-summary' }: Props) {
  const { colors } = useTheme();
  const { format } = useCurrency();
  return (
    <View testID={testID} style={[styles.wrap, { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
      <Ionicons name="arrow-forward-circle" size={20} color={colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: colors.accent }]}>OUTBOUND</Text>
        <Text numberOfLines={1} style={[styles.line, { color: colors.text }]}>
          {formatDayLabel(toISODate(new Date(trip.departAt)))} · {formatTime(trip.departAt)} → {formatTime(trip.arriveAt)} · {format(trip.priceEur)}
        </Text>
      </View>
      {onChange ? (
        <Pressable testID={`${testID}-change`} onPress={onChange} hitSlop={8} accessibilityRole="button" accessibilityLabel="Change outbound">
          <Text style={{ color: colors.accent, fontWeight: '700' }}>Change</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  line: { fontSize: 14, fontWeight: '600', marginTop: 2 },
});
```

- [ ] **Step 4: Implement the phases in `mobile/app/results.tsx`**

Imports: `useLocalSearchParams` from `expo-router`; from the search store add `getSelectedOutbound` and `type SearchLeg`; add

```tsx
import { OutboundSummary } from '../src/components/OutboundSummary';
import { returnSearchQuery, returnsAfter } from '../src/utils/roundTrip';
import { toISODate } from '../src/utils/format';   // merge into the existing format import
```

Replace `dateWindow`:

```tsx
// Seven days around the selected date, never before today (or `min`) and
// never after `max` (a round trip's outbound can't go past its return).
function dateWindow(selected: string, min?: string, max?: string): string[] {
  const today = todayISO();
  const floor = min && min > today ? min : today;
  let start = addDays(selected, -3);
  if (start < floor) start = floor;
  return Array.from({ length: 7 }, (_, i) => addDays(start, i)).filter(d => !max || d <= max);
}
```

At the top of `ResultsScreen`, before the state hooks:

```tsx
  const params = useLocalSearchParams<{ leg?: string }>();
  const phase: SearchLeg = params.leg === 'return' ? 'return' : 'outbound';
  const outbound = phase === 'return' ? getSelectedOutbound() : null;
  // The query this screen actually searches: the base query, or the way back.
  const phaseQueryFor = (q: SearchQuery | null): SearchQuery | null =>
    q && phase === 'return' ? returnSearchQuery(q, outbound) : q;
```

State initialisation now reads the phase:

```tsx
  const [results, setResults] = useState<RankedTrip[]>(getSearchResults(phase));
  const [meta, setMeta] = useState<SearchMeta | null>(getSearchMeta(phase));
  const [loading, setLoading] = useState(!metaMatches(getSearchMeta(phase), phaseQueryFor(getSearchQuery())));
```

In `runSearch`, store per phase: `setSearchResults(data.results, data.meta, phase);` and add `phase` to its `useCallback` deps.

First-load effect:

```tsx
    const pq = phaseQueryFor(query);
    if (pq && !metaMatches(getSearchMeta(phase), pq)) void runSearch(pq);
```

Focus effect body:

```tsx
      const storedQuery = getSearchQuery();
      if (storedQuery && query && storedQuery !== query) setQuery(storedQuery);
      if (metaMatches(getSearchMeta(phase), phaseQueryFor(storedQuery))) {
        setResults(getSearchResults(phase));
        setMeta(getSearchMeta(phase));
      }
```

(deps `[query, phase]` — `phaseQueryFor` only closes over `phase`/`outbound`; add an `// eslint-disable-next-line react-hooks/exhaustive-deps` if lint asks for it.)

Derived values (replace the `dates` memo):

```tsx
  const pq = useMemo(() => phaseQueryFor(query), [query]); // eslint-disable-line react-hooks/exhaustive-deps
  const dates = useMemo(() => {
    if (!pq) return [];
    if (phase === 'return') return dateWindow(pq.departDate, outbound ? toISODate(new Date(outbound.arriveAt)) : undefined);
    return dateWindow(pq.departDate, undefined, query?.returnDate);
  }, [pq, phase, outbound, query?.returnDate]);
  const visible = useMemo(() => (phase === 'return' ? returnsAfter(results, outbound) : results), [phase, results, outbound]);
```

In the prices effect use `pq` instead of `query` (`pq.from.code`, `pq.to.code`, `pq.adults`; guard `if (!pq || dates.length === 0) return;`; deps `[pq, dates]`).

Alerts: build the key without `returnDate`:

```tsx
  const alertKey = useMemo(
    () => (pq ? { from: pq.from, to: pq.to, departDate: pq.departDate, adults: pq.adults } : null),
    [pq],
  );
```

and use `alertKey` in place of `query` in the `findAlert` effect and `toggleWatch` (`removeAlert(userKey, alertId(alertKey))`, `addAlert(userKey, { ...alertKey, priceEur: cheapestOverall })`).

`changeDate`:

```tsx
  function changeDate(iso: string) {
    if (!query || !pq || iso === pq.departDate) return;
    const next = phase === 'return' ? { ...query, returnDate: iso } : { ...query, departDate: iso };
    setSearchQuery(next);
    setQuery(next);
    const nextPq = phaseQueryFor(next);
    if (nextPq) void runSearch(nextPq);
  }
```

Use `visible` instead of `results` in `cheapestOverall`, `cheapestByMode`, `filtered`, and the empty state:

```tsx
      ) : filtered.length === 0 ? (
        <EmptyState
          testID="empty-text"
          icon="search-outline"
          title={
            visible.length === 0
              ? phase === 'return' && results.length > 0
                ? 'No returns after your outbound arrives'
                : 'No trips found'
              : `No ${transport === 'all' ? '' : `${transport} `}trips`
          }
          subtitle={visible.length === 0 ? 'Try another date from the strip above.' : 'Try another mode or clear the filter.'}
          actionLabel={visible.length > 0 ? 'Show all modes' : undefined}
          onAction={visible.length > 0 ? () => setTransport('all') : undefined}
        />
```

Title / subtitle:

```tsx
  const title = pq ? `${pq.from.name} → ${pq.to.name}` : meta ? `${meta.from} → ${meta.to}` : 'Results';
  const adults = pq?.adults ?? meta?.adults ?? 1;
  const phaseLabel = query?.returnDate ? (phase === 'return' ? 'Return · ' : 'Outbound · ') : '';
  const subtitle = pq || meta
    ? `${phaseLabel}${formatDayLabel(pq?.departDate ?? meta!.departDate)} · ${adults} ${adults === 1 ? 'adult' : 'adults'}`
    : undefined;
```

Date strip: `<DateStrip dates={dates} selected={pq.departDate} …/>` guarded by `{pq && (…)}`.

Pinned outbound — directly before `<View style={styles.filters}>`:

```tsx
      {outbound && (
        <View style={styles.pinned}>
          <OutboundSummary trip={outbound} onChange={() => router.back()} />
        </View>
      )}
```

Card press:

```tsx
            <TripCard
              trip={item}
              testID={`trip-${item.id}`}
              onPress={() => router.push(phase === 'return' ? `/trip/${item.id}?leg=return` : `/trip/${item.id}`)}
            />
```

Style: `pinned: { paddingHorizontal: 16, paddingTop: 12 },`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/screens/ResultsScreen.test.tsx && npm run typecheck && npm run lint`
Expected: PASS (existing one-way tests unchanged).

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/OutboundSummary.tsx mobile/app/results.tsx mobile/__tests__/screens/ResultsScreen.test.tsx
git commit -m "feat(mobile): results pick the outbound, then the return"
```

---

### Task 10: Trip detail — "Choose return" and "Book round trip"

**Files:**
- Modify: `mobile/app/trip/[id].tsx`
- Test: `mobile/__tests__/screens/RouteDetailScreen.test.tsx`

**Interfaces:**
- Consumes: `getResultById(id, leg)`, `getSelectedOutbound`, `setSelectedOutbound` (Task 6); `setCheckoutRoundTrip` (Task 5); `toLeg` (Task 4); `OutboundSummary` (Task 9).
- Produces: testIDs `choose-return-btn`, `book-round-trip-btn`; navigation `/results?leg=return`, `/checkout/transfer`, `/checkout/connections?direction=outbound`.

- [ ] **Step 1: Write the failing tests** — in `mobile/__tests__/screens/RouteDetailScreen.test.tsx`:

Make the params mutable:

```tsx
let mockParams: Record<string, string> = { id: 'amadeus:1' };
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: jest.fn(), push: mockPush }),
  router: { canGoBack: () => false, back: jest.fn() },
}));
```

Reset `mockParams = { id: 'amadeus:1' };` in `beforeEach`. Import `getSearchQuery, getSelectedOutbound, setSelectedOutbound` from the search store and `setCheckoutRoundTrip` from the checkout store. Append:

```tsx
describe('round trips', () => {
  const LON = { name: 'London', code: 'LON', country: 'UK' };
  const PAR = { name: 'Paris', code: 'PAR', country: 'FR' };
  const RT_QUERY = { from: LON, to: PAR, departDate: '2030-04-15', returnDate: '2030-04-18', adults: 1 };
  const RETURN_TRIP = { ...MOCK_TRIP, id: 'rail:ret', provider: 'rail', transportType: 'train', origin: 'PAR', destination: 'LON', priceEur: 30 };

  it('outbound: offers "Choose return" instead of booking', () => {
    (getSearchQuery as jest.Mock).mockReturnValue(RT_QUERY);
    mockGetById.mockReturnValue(MOCK_TRIP);
    const { getByTestId, queryByTestId } = render(<TripDetailScreen />);
    expect(queryByTestId('book-btn')).toBeNull();
    expect(queryByTestId('add-connections-btn')).toBeNull();
    fireEvent.press(getByTestId('choose-return-btn'));
    expect(setSelectedOutbound).toHaveBeenCalledWith(MOCK_TRIP);
    expect(mockPush).toHaveBeenCalledWith('/results?leg=return');
  });

  it('return: shows the round-trip total and books both directions', () => {
    mockParams = { id: 'rail:ret', leg: 'return' };
    (getSearchQuery as jest.Mock).mockReturnValue(RT_QUERY);
    (getSelectedOutbound as jest.Mock).mockReturnValue(MOCK_TRIP);
    mockGetById.mockReturnValue(RETURN_TRIP);
    const { getByTestId, getByText } = render(<TripDetailScreen />);
    expect(mockGetById).toHaveBeenCalledWith('rail:ret', 'return');
    expect(getByTestId('outbound-summary')).toBeTruthy();
    expect(getByText('€72.50')).toBeTruthy(); // 42.50 + 30
    fireEvent.press(getByTestId('book-round-trip-btn'));
    expect(setCheckoutRoundTrip).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'amadeus:1', direction: 'outbound' }),
      expect.objectContaining({ id: 'rail:ret', direction: 'return' }),
      1,
      false,
    );
    expect(mockPush).toHaveBeenCalledWith('/checkout/transfer');
  });

  it('return: Add Connections starts the outbound connections step', () => {
    mockParams = { id: 'rail:ret', leg: 'return' };
    (getSearchQuery as jest.Mock).mockReturnValue(RT_QUERY);
    (getSelectedOutbound as jest.Mock).mockReturnValue(MOCK_TRIP);
    mockGetById.mockReturnValue(RETURN_TRIP);
    const { getByTestId } = render(<TripDetailScreen />);
    fireEvent.press(getByTestId('add-connections-btn'));
    expect(setCheckoutRoundTrip).toHaveBeenCalledWith(expect.anything(), expect.anything(), 1, true);
    expect(mockPush).toHaveBeenCalledWith('/checkout/connections?direction=outbound');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/screens/RouteDetailScreen.test.tsx`
Expected: FAIL — no `choose-return-btn`.

- [ ] **Step 3: Implement** — in `mobile/app/trip/[id].tsx`:

Imports:

```tsx
import { getResultById, getSearchMeta, getSearchQuery, getSelectedOutbound, setSelectedOutbound, type SearchLeg } from '../../src/stores/searchStore';
import { setCheckoutTrip, setCheckoutItinerary, setCheckoutRoundTrip } from '../../src/stores/checkoutStore';
import { OutboundSummary } from '../../src/components/OutboundSummary';
import { toLeg } from '../../src/utils/itinerary';
```

(Remove the now-unused `Leg` type import if `toLeg` replaces its only use.)

Top of the component:

```tsx
  const { id, leg } = useLocalSearchParams<{ id: string; leg?: string }>();
  const phase: SearchLeg = leg === 'return' ? 'return' : 'outbound';
  …
  const trip = getResultById(id ?? '', phase);
  const meta = getSearchMeta();
  const query = getSearchQuery();
  const roundTrip = !!query?.returnDate;
  const outbound = phase === 'return' ? getSelectedOutbound() : null;

  if (!trip || (phase === 'return' && !outbound)) {
    …existing "Trip not found" empty state…
  }
```

Names — works for both directions:

```tsx
  // Prefer city names from the search; flights carry airport codes.
  const cityName = (code: string) => [query?.from, query?.to].find(c => c?.code === code)?.name ?? code;
  const originName = cityName(trip.origin);
  const destName = cityName(trip.destination);
```

Above the first `<Card>` in the ScrollView:

```tsx
        {outbound && (
          <View style={{ marginBottom: 12 }}>
            <OutboundSummary trip={outbound} />
          </View>
        )}
```

Add Connections row: render only when `!(roundTrip && phase === 'outbound')`, and change its `onPress`:

```tsx
          onPress={() => {
            if (outbound) {
              setCheckoutRoundTrip(toLeg(outbound, 'outbound'), toLeg(trip, 'return'), adults, true);
              router.push('/checkout/connections?direction=outbound');
              return;
            }
            setCheckoutItinerary(toLeg(trip), adults);
            router.push('/checkout/connections');
          }}
```

Replace the `BottomBar` with:

```tsx
      {roundTrip && phase === 'outbound' ? (
        <BottomBar
          caption="Outbound"
          amount={format(trip.priceEur)}
          ctaTitle="Choose return"
          ctaTestID="choose-return-btn"
          onPress={() => {
            setSelectedOutbound(trip);
            router.push('/results?leg=return');
          }}
        />
      ) : outbound ? (
        <BottomBar
          caption={adults === 1 ? 'Total · round trip' : `Total · round trip · ${adults} adults`}
          amount={format(outbound.priceEur + trip.priceEur)}
          ctaTitle="Book round trip"
          ctaTestID="book-round-trip-btn"
          onPress={() => {
            setCheckoutRoundTrip(toLeg(outbound, 'outbound'), toLeg(trip, 'return'), adults, false);
            router.push('/checkout/transfer');
          }}
        />
      ) : (
        …existing one-way BottomBar unchanged…
      )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/screens/RouteDetailScreen.test.tsx && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "mobile/app/trip/[id].tsx" mobile/__tests__/screens/RouteDetailScreen.test.tsx
git commit -m "feat(mobile): trip detail chooses the return and books round trips"
```

---

### Task 11: Connections screen runs per direction

**Files:**
- Modify: `mobile/app/checkout/connections.tsx`
- Test: `mobile/__tests__/screens/ConnectionsScreen.test.tsx`

**Interfaces:**
- Consumes: `getCheckoutMainLeg(direction)`, `setDirectionConnections`, `getDirectionConnections` (Task 5); `checkoutFlow`, `stepIndex` (Task 7).
- Produces: route param `direction=outbound|return`. Round trip: outbound continue → `/checkout/connections?direction=return`; return continue → `/checkout/transfer`. One-way behaviour unchanged.

- [ ] **Step 1: Write the failing tests** — in `mobile/__tests__/screens/ConnectionsScreen.test.tsx`:

Router mock with params:

```tsx
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  router: { canGoBack: () => false, back: jest.fn() },
}));
```

Reset `mockParams = {};` in `beforeEach`. Add `setDirectionConnections, getDirectionConnections` to the checkout-store import. Append:

```tsx
describe('round trips', () => {
  const RT_ITIN = { legs: [], connections: [], totalPriceEur: 0, adults: 1, tripType: 'round_trip', viaConnections: true };

  beforeEach(() => {
    mockGetCheckoutItinerary.mockReturnValue(RT_ITIN);
    mockGetSearchMeta.mockReturnValue({ from: 'BUD', to: 'NCE', adults: 1 });
    (getDirectionConnections as jest.Mock).mockReturnValue({});
  });

  it('outbound pass continues to the return pass', () => {
    mockGetCheckoutMainLeg.mockImplementation((dir = 'outbound') => ({ ...MOCK_MAIN_LEG, id: dir }));
    mockNeedsDeparture.mockReturnValue(false);
    mockNeedsArrival.mockReturnValue(false);
    const { getByTestId } = render(<ConnectionsScreen />);
    fireEvent.press(getByTestId('continue-btn'));
    expect(setDirectionConnections).toHaveBeenCalledWith('outbound', undefined, undefined);
    expect(mockPush).toHaveBeenCalledWith('/checkout/connections?direction=return');
  });

  it('return pass uses the return main leg with the cities swapped', () => {
    mockParams = { direction: 'return' };
    mockGetCheckoutMainLeg.mockImplementation((dir = 'outbound') => ({ ...MOCK_MAIN_LEG, id: dir, origin: 'NCE', destination: 'VIE' }));
    mockNeedsDeparture.mockReturnValue(false);
    mockNeedsArrival.mockReturnValue(false);
    const { getByTestId } = render(<ConnectionsScreen />);
    expect(mockGetCheckoutMainLeg).toHaveBeenCalledWith('return');
    // departure feeder is checked from the destination city (NCE) to the return's hub
    expect(mockNeedsDeparture).toHaveBeenCalledWith('NCE', 'NCE');
    expect(mockNeedsArrival).toHaveBeenCalledWith('BUD', 'VIE');
    fireEvent.press(getByTestId('continue-btn'));
    expect(setDirectionConnections).toHaveBeenCalledWith('return', undefined, undefined);
    expect(mockPush).toHaveBeenCalledWith('/checkout/transfer');
  });
});
```

(`MOCK_MAIN_LEG`, `mockNeedsDeparture`, `mockNeedsArrival`, `mockGetCheckoutItinerary`, `mockGetSearchMeta` and the `continue-btn` testID already exist in this file.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/screens/ConnectionsScreen.test.tsx`
Expected: FAIL — `setDirectionConnections` not called; push goes to `/checkout/transfer`.

- [ ] **Step 3: Implement** — in `mobile/app/checkout/connections.tsx`:

Imports: `useLocalSearchParams` from `expo-router`; from the checkout store add `getDirectionConnections, setDirectionConnections`; `import { Stepper, checkoutFlow, checkoutSteps, stepIndex } from '../../src/components/Stepper';`; `import type { Direction, Leg } from '../../src/types/itinerary';`.

Replace the top of the component down to the `useState` hooks:

```tsx
  const params = useLocalSearchParams<{ direction?: string }>();
  const direction: Direction = params.direction === 'return' ? 'return' : 'outbound';

  const itinerary = getCheckoutItinerary();
  const roundTrip = itinerary?.tripType === 'round_trip';
  const flow = checkoutFlow(itinerary);
  const searchMeta = getSearchMeta();
  // Never derive the main leg from legs[0]: once connections are added the
  // first leg is the departure feeder, not the main leg.
  const mainLeg = getCheckoutMainLeg(direction);
  const adults = itinerary?.adults ?? 1;

  // The return runs from the destination city back to the origin city.
  const originCityCode = (direction === 'return' ? searchMeta?.to : searchMeta?.from) ?? '';
  const destCityCode = (direction === 'return' ? searchMeta?.from : searchMeta?.to) ?? '';
  // Coming back to this pass keeps what was picked before.
  const saved = roundTrip ? getDirectionConnections(direction) : undefined;
```

Seed the selections: `useState<Leg | null>(saved?.departure ?? null)` and `useState<Leg | null>(saved?.arrival ?? null)`.

In the two "Bus & train options from …" subtitles use `originCityCode` / `destCityCode` instead of `searchMeta?.from` / `searchMeta?.to`.

`handleContinue`:

```tsx
  function handleContinue() {
    if (!mainLeg) return;
    const depLeg = skipDeparture ? undefined : (selectedDeparture ?? undefined);
    const arrLeg = skipArrival ? undefined : (selectedArrival ?? undefined);
    if (roundTrip) {
      setDirectionConnections(direction, depLeg, arrLeg);
      router.push(direction === 'outbound' ? '/checkout/connections?direction=return' : '/checkout/transfer');
      return;
    }
    setCheckoutItinerary(mainLeg, adults, depLeg, arrLeg);
    router.push('/checkout/transfer');
  }
```

Header + Stepper:

```tsx
      <AppHeader
        title={roundTrip ? (direction === 'return' ? 'Return connections' : 'Outbound connections') : 'Add Connections'}
        showBack
      />
      <Stepper
        steps={checkoutSteps(flow)}
        current={stepIndex(flow, roundTrip ? (direction === 'return' ? 'Return connections' : 'Outbound connections') : 'Connections')}
        colors={colors}
      />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/screens/ConnectionsScreen.test.tsx && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/checkout/connections.tsx mobile/__tests__/screens/ConnectionsScreen.test.tsx
git commit -m "feat(mobile): connections step for both directions of a round trip"
```

---

### Task 12: Review groups by direction; map menu can run in reverse

**Files:**
- Modify: `mobile/src/components/RouteMapMenu.tsx`
- Modify: `mobile/app/checkout/review.tsx`
- Test: `mobile/__tests__/components/RouteMapMenu.test.tsx`, `mobile/__tests__/screens/ReviewScreen.test.tsx`

**Interfaces:**
- Consumes: `Connection.stay` (Task 4), `reversePrefs` (Task 6).
- Produces: `RouteMapMenu` prop `reversed?: boolean` — shows start/end swapped; persisted prefs (`saveTransferPrefs`) and `onChange` payloads stay outbound-oriented. Review testIDs `section-outbound`, `section-return`, map toggle `map-dir-outbound` / `map-dir-return`.

- [ ] **Step 1: Write the failing tests**

`mobile/__tests__/components/RouteMapMenu.test.tsx` — append inside its `describe` (the file already has `openMenu(ui)` and imports `DARK`; the start input's testID is `route-start-address`):

```tsx
it('in reverse, shows the stay as the start and reports outbound-oriented prefs', () => {
  const onChange = jest.fn();
  const utils = render(
    <RouteMapMenu
      legs={[{ origin: 'PAR', destination: 'LON', transportType: 'train' }]}
      initialPrefs={{ startAddress: 'Home', endAddress: 'Hotel', travelMode: 'transit' }}
      onChange={onChange}
      reversed
      colors={DARK}
    />,
  );
  openMenu(utils);
  expect(utils.getByTestId('route-start-address').props.value).toBe('Hotel');
  fireEvent.changeText(utils.getByTestId('route-start-address'), 'Hotel Lutetia');
  expect(onChange).toHaveBeenLastCalledWith({ startAddress: 'Home', endAddress: 'Hotel Lutetia', travelMode: 'transit' });
});
```

`mobile/__tests__/screens/ReviewScreen.test.tsx` — append:

```tsx
describe('round trips', () => {
  const L = (id: string, origin: string, destination: string, direction: 'outbound' | 'return', departAt: string) => ({
    id, provider: 'rail', transportType: 'train', origin, destination, originName: origin, destinationName: destination,
    departAt, arriveAt: departAt, durationMins: 120, priceEur: 40, stops: 0, deepLink: '', direction,
  });

  it('groups legs into Outbound and Return sections without a transfer row between them', () => {
    mockGetTrip.mockReturnValue(null);
    mockGetItinerary.mockReturnValue({
      legs: [L('o', 'LON', 'PAR', 'outbound', '2030-06-15T08:00:00Z'), L('r', 'PAR', 'LON', 'return', '2030-06-18T17:00:00Z')],
      connections: [{ transferMins: 4860, stay: true }],
      totalPriceEur: 80, adults: 1, tripType: 'round_trip',
    });
    const { getByTestId, queryByTestId, getByText } = render(<ReviewScreen />);
    expect(getByTestId('section-outbound')).toBeTruthy();
    expect(getByTestId('section-return')).toBeTruthy();
    expect(queryByTestId('transfer-0')).toBeNull();
    expect(getByText('ROUND TRIP · 2 LEGS')).toBeTruthy();
    expect(getByTestId('map-dir-return')).toBeTruthy();
  });
});
```

(Use the file's mock names for trip/itinerary/passengers getters; make sure `getPassengers` returns `[]` and `getCheckoutTransfer` returns `{ startAddress: '', endAddress: '', travelMode: 'transit' }` for this test if the file doesn't already.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/components/RouteMapMenu.test.tsx __tests__/screens/ReviewScreen.test.tsx`
Expected: FAIL — `reversed` ignored; no `section-outbound`.

- [ ] **Step 3: Implement `reversed` in `RouteMapMenu`**

Add to `Props`:

```tsx
  /** Return direction: edit/show the addresses swapped; stored prefs stay home → stay. */
  reversed?: boolean;
```

Import `reversePrefs` from `'../utils/roundTrip'`. In the component (signature gains `reversed = false`):

```tsx
  const flip = (p: TransferPrefs): TransferPrefs => (reversed ? reversePrefs(p) : p);
  const seed = initialPrefs ? flip(initialPrefs) : undefined;
  const [startAddress, setStartAddress] = useState(seed?.startAddress ?? '');
  const [endAddress, setEndAddress] = useState(seed?.endAddress ?? '');
  const [mode, setMode] = useState<MapTravelMode>(seed?.travelMode ?? 'transit');
```

In the storage effect: `const shown = flip(prefs);` then set state from `shown`; add `reversed` to its deps.

In `update`, after computing `merged`:

```tsx
    const stored = flip(merged);
    if (storageKey) void saveTransferPrefs(storageKey, stored);
    onChange?.(stored);
```

(replacing the two lines that used `merged`).

- [ ] **Step 4: Implement review grouping** — in `mobile/app/checkout/review.tsx`:

Imports: `useState` from react; `SegmentedControl` from `'../../src/components/ui/SegmentedControl'`; `type Direction` from the itinerary types.

After `const first = legs[0];`:

```tsx
  const roundTrip = itinerary?.tripType === 'round_trip';
  const firstReturn = legs.find(l => (l as { direction?: Direction }).direction === 'return');
  const [mapDir, setMapDir] = useState<Direction>('outbound');
  const mapLegs = roundTrip
    ? legs.filter(l => ((l as { direction?: Direction }).direction ?? 'outbound') === mapDir)
    : legs;
```

Hooks must run before the early return — move the `useState` line above the `if (!itinerary && !trip)` block.

Header subtitle:

```tsx
      <AppHeader
        title="Review booking"
        subtitle={
          roundTrip && firstReturn
            ? `${formatDayLabel(toISODate(new Date(first.departAt)))} – ${formatDayLabel(toISODate(new Date(firstReturn.departAt)))}`
            : formatDayLabel(toISODate(new Date(first.departAt)))
        }
        showBack
      />
```

Overline: `{roundTrip ? `ROUND TRIP · ${legs.length} LEGS` : itinerary ? `YOUR ROUTE · ${legs.length} LEGS` : 'YOUR TRIP'}` and directly after it:

```tsx
          {roundTrip && (
            <Text testID="section-outbound" style={[styles.overline, styles.section, { color: colors.accent }]}>
              OUTBOUND · {formatDayLabel(toISODate(new Date(first.departAt)))}
            </Text>
          )}
```

Replace the connection block inside `legs.map`:

```tsx
              {itinerary && i < itinerary.connections.length && (
                itinerary.connections[i].stay ? (
                  <Text testID="section-return" style={[styles.overline, styles.section, { color: colors.accent }]}>
                    RETURN · {formatDayLabel(toISODate(new Date(legs[i + 1].departAt)))}
                  </Text>
                ) : (
                  …existing transferRow View unchanged…
                )
              )}
```

Replace the `RouteMapMenu`:

```tsx
        {roundTrip && (
          <SegmentedControl
            segments={[
              { value: 'outbound', label: 'Outbound route' },
              { value: 'return', label: 'Return route' },
            ]}
            value={mapDir}
            onChange={setMapDir}
            testIDPrefix="map-dir"
          />
        )}
        <RouteMapMenu
          key={mapDir}
          legs={mapLegs.map(l => ({ origin: l.origin, destination: l.destination, transportType: l.transportType }))}
          initialPrefs={getCheckoutTransfer()}
          onChange={setCheckoutTransfer}
          reversed={roundTrip && mapDir === 'return'}
          colors={colors}
        />
```

Price details label: `{(leg as { direction?: Direction }).direction === 'return' ? 'Return · ' : ''}{providerName(leg.provider)} · {leg.origin} → {leg.destination}`.

Style: `section: { marginTop: 10, marginBottom: 2 },`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/components/RouteMapMenu.test.tsx __tests__/screens/ReviewScreen.test.tsx && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/RouteMapMenu.tsx mobile/app/checkout/review.tsx mobile/__tests__/components/RouteMapMenu.test.tsx mobile/__tests__/screens/ReviewScreen.test.tsx
git commit -m "feat(mobile): review groups a round trip by direction; reversible route map"
```

---

### Task 13: Confirmation groups by direction, "Search … again" on a failed direction

**Files:**
- Modify: `mobile/app/confirmation.tsx`
- Test: `mobile/__tests__/screens/ConfirmationScreen.test.tsx`

**Interfaces:**
- Consumes: `BookedItinerary.trip_type`, `BookedTrip.direction` (Task 4); `legsByDirection` (Task 4); `getSearchQuery`, `setSearchQuery` (real search store).
- Produces: testIDs `confirm-section-outbound`, `confirm-section-return`, `search-return-again`, `search-outbound-again`. "Search return again" sets a one-way query (cities swapped, `departDate` = original `returnDate`) and replaces to `/results`.

- [ ] **Step 1: Write the failing tests** — in `mobile/__tests__/screens/ConfirmationScreen.test.tsx` (the search store is real here; import `setSearchQuery, getSearchQuery` from it):

```tsx
describe('round trips', () => {
  const LON = { name: 'London', code: 'LON', country: 'UK' } as any;
  const PAR = { name: 'Paris', code: 'PAR', country: 'FR' } as any;
  const leg = (id: string, order: number, direction: 'outbound' | 'return', status = 'confirmed') => ({
    id, provider: 'rail', booking_ref: status === 'confirmed' ? `REF-${id}` : null,
    origin: direction === 'outbound' ? 'LON' : 'PAR', destination: direction === 'outbound' ? 'PAR' : 'LON',
    depart_at: '2030-06-15T08:00:00Z', arrive_at: '2030-06-15T10:00:00Z', return_at: null,
    price_eur: '40.00', currency_display: 'EUR', status, raw_ticket_url: null, created_at: '',
    leg_order: order, direction,
  });
  const booking = (retStatus: string) => ({
    bookingRef: 'TS-RT',
    status: retStatus === 'confirmed' ? 'confirmed' : 'partially_failed',
    itinerary: {
      id: 'i', booking_ref: 'TS-RT', origin: 'LON', destination: 'PAR', depart_at: '2030-06-15T08:00:00Z',
      arrive_at: '2030-06-18T19:00:00Z', total_price_eur: '40.00', status: 'x', trip_type: 'round_trip',
      legs: [leg('o', 0, 'outbound'), leg('r', 1, 'return', retStatus)],
    },
    ...(retStatus === 'confirmed' ? {} : { failedLegs: [{ legOrder: 1, error: 'Sold out' }] }),
  });

  it('shows both directions and a round-trip route', () => {
    mockGetBookingResult.mockReturnValue(booking('confirmed'));
    const { getByTestId, getByText } = render(<ConfirmationScreen />);
    expect(getByTestId('confirm-section-outbound')).toBeTruthy();
    expect(getByTestId('confirm-section-return')).toBeTruthy();
    expect(getByText('LON ⇄ PAR')).toBeTruthy();
  });

  it('offers to search the return again when it failed', () => {
    setSearchQuery({ from: LON, to: PAR, departDate: '2030-06-15', returnDate: '2030-06-18', adults: 2 });
    mockGetBookingResult.mockReturnValue(booking('failed'));
    const { getByTestId, getByText } = render(<ConfirmationScreen />);
    expect(getByText(/Return not booked — you weren’t charged for it/)).toBeTruthy();
    fireEvent.press(getByTestId('search-return-again'));
    expect(getSearchQuery()).toEqual({ from: PAR, to: LON, departDate: '2030-06-18', adults: 2 });
    expect(mockClearCheckout).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/results');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/screens/ConfirmationScreen.test.tsx`
Expected: FAIL — no `confirm-section-outbound`.

- [ ] **Step 3: Implement** — in `mobile/app/confirmation.tsx`:

Imports:

```tsx
import { getSearchQuery, setSearchQuery } from '../src/stores/searchStore';
import { legsByDirection } from '../src/utils/itinerary';
import type { Direction } from '../src/types/itinerary';
```

After `const singleQr = …`:

```tsx
  const roundTrip = itineraryBooking?.itinerary.trip_type === 'round_trip';
  const groups = legsByDirection(legs);
  const failedIn = (dir: Direction) => groups[dir].some(l => l.status !== 'confirmed');

  // Re-search just the direction that didn't book, as a one-way.
  function searchAgain(dir: Direction) {
    const q = getSearchQuery();
    clearCheckout();
    if (!q) {
      router.replace('/(tabs)');
      return;
    }
    setSearchQuery(
      dir === 'return' && q.returnDate
        ? { from: q.to, to: q.from, departDate: q.returnDate, adults: q.adults }
        : { from: q.from, to: q.to, departDate: q.departDate, adults: q.adults },
    );
    router.replace('/results');
  }
```

Route line: `{origin} {roundTrip ? '⇄' : '→'} {destination}`.

Subtitle for partial failure:

```tsx
            {partiallyFailed
              ? roundTrip && failedIn('return') && !failedIn('outbound')
                ? 'Your outbound is booked. Return not booked — you weren’t charged for it.'
                : roundTrip && failedIn('outbound') && !failedIn('return')
                  ? 'Your return is booked. Outbound not booked — you weren’t charged for it.'
                  : 'Some legs could not be booked. Please review the details below.'
              : `Tickets sent to your email and saved in My Trips.`}
```

Extract the existing per-leg row JSX into a local `renderLeg(leg: BookedTrip, index: number)` function (same markup; the failure lookup becomes `itineraryBooking!.failedLegs?.find(f => f.legOrder === (leg.leg_order ?? index))`). Then replace the `LEGS` block with:

```tsx
          {itineraryBooking && !roundTrip && (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>LEGS</Text>
              {legs.map(renderLeg)}
            </View>
          )}
          {roundTrip &&
            (['outbound', 'return'] as Direction[]).map(dir => (
              <View key={dir} testID={`confirm-section-${dir}`} style={{ marginTop: 8 }}>
                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 4 }]}>
                  {dir === 'outbound' ? 'OUTBOUND' : 'RETURN'}
                </Text>
                {groups[dir].map(l => renderLeg(l, legs.indexOf(l)))}
                {failedIn(dir) && (
                  <Button
                    testID={`search-${dir}-again`}
                    title={`Search ${dir} again`}
                    icon="search"
                    variant="secondary"
                    onPress={() => searchAgain(dir)}
                    style={{ marginTop: 8 }}
                  />
                )}
              </View>
            ))}
```

(`Button` supports `variant: 'primary' | 'secondary' | 'ghost' | 'danger'`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npx jest __tests__/screens/ConfirmationScreen.test.tsx && npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mobile/app/confirmation.tsx mobile/__tests__/screens/ConfirmationScreen.test.tsx
git commit -m "feat(mobile): round-trip confirmation with search-again for a failed direction"
```

---

### Task 14: My Trips round-trip card

**Files:**
- Modify: `mobile/app/(tabs)/trips.tsx`
- Modify: `mobile/src/components/ExpandableLeg.tsx`
- Test: `mobile/__tests__/screens/MyTripsScreen.test.tsx`

**Interfaces:**
- Consumes: `trip_type`, `direction`, `legsByDirection`, `RouteMapMenu reversed`.
- Produces: testIDs `trips-section-outbound`, `trips-section-return`; failed legs read "Not booked · not charged".

- [ ] **Step 1: Write the failing test** — append inside the `describe` of `mobile/__tests__/screens/MyTripsScreen.test.tsx` (it already has `mockGetTrips`, `mockGetItineraries` and `renderSettled`):

```tsx
it('renders a round trip with outbound and return sections', async () => {
  const future = (days: number, h = 8) => new Date(Date.now() + days * 86_400_000 + h * 3_600_000).toISOString();
  const leg = (id: string, order: number, direction: 'outbound' | 'return', status = 'confirmed') => ({
    id, provider: 'rail', booking_ref: status === 'confirmed' ? `R-${id}` : null,
    origin: direction === 'outbound' ? 'LON' : 'PAR', destination: direction === 'outbound' ? 'PAR' : 'LON',
    depart_at: future(direction === 'outbound' ? 5 : 8), arrive_at: future(direction === 'outbound' ? 5 : 8, 11),
    return_at: null, price_eur: '40.00', currency_display: 'EUR', status, raw_ticket_url: null, created_at: '',
    leg_order: order, direction,
  });
  mockGetItineraries.mockResolvedValue({
    itineraries: [{
      id: 'rt', booking_ref: 'TS-RT', origin: 'LON', destination: 'PAR', depart_at: future(5), arrive_at: future(8, 11),
      total_price_eur: '40.00', status: 'partially_failed', trip_type: 'round_trip',
      legs: [leg('o', 0, 'outbound'), leg('r', 1, 'return', 'failed')],
    }],
  });
  mockGetTrips.mockResolvedValue({ trips: [] });

  const { findByText, getByTestId, getByText } = await renderSettled(<MyTripsScreen />);
  expect(await findByText('LON ⇄ PAR')).toBeTruthy();
  expect(getByTestId('trips-section-outbound')).toBeTruthy();
  expect(getByTestId('trips-section-return')).toBeTruthy();
  expect(getByText('Not booked · not charged')).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd mobile && npx jest __tests__/screens/MyTripsScreen.test.tsx`
Expected: FAIL — "LON → PAR" rendered, no sections.

- [ ] **Step 3: Implement**

`mobile/src/components/ExpandableLeg.tsx` — replace the status `<Text>` content `{leg.status}` with:

```tsx
            {leg.status === 'failed' ? 'Not booked · not charged' : leg.status}
```

`mobile/app/(tabs)/trips.tsx` — imports: `legsByDirection` from `'../../src/utils/itinerary'`, `formatDayLabel, toISODate` from the format utils (merge with existing import), `type Direction` from the itinerary types.

Inside `renderBooking`, after `const ok = …`:

```tsx
    const roundTrip = iti?.trip_type === 'round_trip';
    const groups = legsByDirection(legs);
    const firstReturn = groups.return[0];
    const mapLegs = (ls: BookedTrip[]) =>
      ls.map(l => ({ origin: l.origin, destination: l.destination, transportType: PROVIDER_TRANSPORT[l.provider] }));
```

Route line: `{origin} {roundTrip ? '⇄' : '→'} {destination}`. The `iti` sub-line:

```tsx
            {iti ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                {roundTrip && firstReturn
                  ? `${iti.booking_ref} · Round trip · ${formatDayLabel(toISODate(new Date(iti.depart_at)))} – ${formatDayLabel(toISODate(new Date(firstReturn.depart_at)))}`
                  : `${iti.booking_ref} · ${legs.length} ${legs.length === 1 ? 'leg' : 'legs'}`}
              </Text>
            ) : null}
```

Replace the legs map + route menu with:

```tsx
        {roundTrip ? (
          (['outbound', 'return'] as Direction[]).map(dir => (
            <View key={dir} testID={`trips-section-${dir}`}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                {dir === 'outbound' ? 'OUTBOUND' : 'RETURN'}
              </Text>
              {groups[dir].map((leg, idx) => (
                <ExpandableLeg key={`${leg.id}-${idx}`} leg={leg} colors={colors} format={format} />
              ))}
              {tab === 'upcoming' && groups[dir].length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <RouteMapMenu
                    legs={mapLegs(groups[dir])}
                    storageKey={item.data.booking_ref}
                    reversed={dir === 'return'}
                    colors={colors}
                  />
                </View>
              )}
            </View>
          ))
        ) : (
          <>
            {legs.map((leg, idx) => (
              <ExpandableLeg key={`${leg.id}-${idx}`} leg={leg} colors={colors} format={format} />
            ))}
            {tab === 'upcoming' && (
              <View style={{ marginTop: 12 }}>
                <RouteMapMenu
                  legs={legs.length ? mapLegs(legs) : [{ origin, destination }]}
                  storageKey={item.data.booking_ref}
                  colors={colors}
                />
              </View>
            )}
          </>
        )}
```

Style: `sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 10, marginBottom: 4 },`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd mobile && npm test && npm run typecheck && npm run lint`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add "mobile/app/(tabs)/trips.tsx" mobile/src/components/ExpandableLeg.tsx mobile/__tests__/screens/MyTripsScreen.test.tsx
git commit -m "feat(mobile): round-trip tickets in My Trips"
```

---

### Task 15: End-to-end walkthrough, docs, final verification

**Files:**
- Modify: `mobile/scripts/web-walkthrough.mjs`
- Modify: `docs/BUILD_STATUS.md`

- [ ] **Step 1: Add a `roundtrip` run to the walkthrough script**

Usage line becomes `// Usage: node scripts/web-walkthrough.mjs <outDir> [light|dark] [oneway|roundtrip]`, add `const FLOW = process.argv[4] ?? 'oneway';` below `SCHEME`, and change the screenshot filename to include the flow: ```${OUT}/${SCHEME}-${FLOW}-${name}.png` ``.

After `await click('to-picker-option-PAR');` insert:

```js
  if (FLOW === 'roundtrip') await click('trip-type-return');
```

Replace everything from `const firstTrip = …` through `await shot('13-after-pay');` with:

```js
  const pickFirstTrip = () =>
    evaluate(`[...document.querySelectorAll('[data-testid^="trip-"]:not([data-testid="trip-skeleton"])')].pop().getAttribute('data-testid')`);

  await click(await pickFirstTrip());
  if (FLOW === 'roundtrip') {
    await waitFor('choose-return-btn');
    await shot('08-outbound-detail');
    await click('choose-return-btn');
    await waitFor('outbound-summary', 20000);
    await waitFor('results-list', 20000);
    await sleep(1500);
    await shot('08b-return-results');
    await click(await pickFirstTrip());
    await waitFor('book-round-trip-btn');
    await shot('08c-return-detail');
    await click('add-connections-btn');
    await sleep(3000);
    await shot('08d-outbound-connections');
    await click('continue-btn');
    await sleep(3000);
    await shot('08e-return-connections');
    await click('continue-btn');
  } else {
    await waitFor('book-btn');
    await shot('08-trip-detail');
    await click('book-btn');
  }
  await waitFor('transfer-continue');
  await shot('09-transfer');
  await click('transfer-skip');
  await waitFor('next-btn');
  await type('name-0', 'Demo Traveller');
  await shot('10-passengers');
  await click('next-btn');
  await waitFor('pay-btn');
  await shot('11-review');
  await click('pay-btn');
  await waitFor('card-number');
  await type('card-number', '4242 4242 4242 4242');
  await type('card-expiry', '12/30');
  await type('card-cvc', '123');
  await shot('12-payment');
  await click('pay-btn');
  await sleep(4000);
  await shot('13-after-pay');
```

(`pickFirstTrip` takes the *last* match because expo web keeps earlier stack screens in the DOM. Use the real connections continue testID if it isn't `continue-btn`.)

- [ ] **Step 2: Run the app and the walkthrough**

```bash
brew services start postgresql@17
cd backend && npm run migrate && (node src/index.js &)
cd ../mobile && (EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --clear &)
# wait until Metro is up, then:
mkdir -p /tmp/rt-walk
node scripts/web-walkthrough.mjs /tmp/rt-walk light roundtrip
node scripts/web-walkthrough.mjs /tmp/rt-walk dark roundtrip
node scripts/web-walkthrough.mjs /tmp/rt-walk light oneway
```

Expected: each run prints `shot …` lines and exits 0; `13-after-pay` shows the known 402 (placeholder Stripe key). Open the PNGs and check: search card with toggle + return row; "Outbound · …" subtitle; pinned outbound on return results; trip detail round-trip total; two connections steps with "Step 1 of 6" / "Step 2 of 6"; review with OUTBOUND/RETURN sections; payment subtitle `LON ⇄ PAR`. Use your scratchpad instead of `/tmp` if one is configured.

- [ ] **Step 3: Update `docs/BUILD_STATUS.md`**

- Header date stays 2026-09-26; update test counts to the new totals from Step 4.
- Add a section:

```markdown
## Round trips milestone (2026-09-26)
Spec: `docs/superpowers/specs/2026-09-26-round-trips-design.md`.
- Search: One-way / Return toggle, return date (default depart + 3), recents keep it.
- Results: pick outbound (`/results`), then return (`/results?leg=return`, cities
  swapped, pinned outbound, returns < 60 min after arrival hidden).
- Checkout: round trips are one itinerary with `direction`-tagged legs; optional
  connections run per direction (Step n of 6); review/confirmation grouped by
  direction; route map reverses home ↔ stay for the return.
- Backend: migration `010_round_trips.sql` (`itineraries.trip_type`,
  `trips.direction`); `/book/itinerary` accepts `tripType`, up to 3 legs per
  direction, server-side check that the return departs after the outbound arrives.
- One direction failing at the provider → partial capture (only booked legs
  charged), "Search return again" on confirmation.
```

- In "Known limitations / next steps", replace the round-trip bullet with: `- Round-trip price alerts and round-trip fares (cheaper than two singles) are not modelled.`

- [ ] **Step 4: Final verification**

```bash
cd backend && npm test && npm run lint
cd ../mobile && npm test && npm run typecheck && npm run lint
```

Expected: all green. Record the new test counts in `BUILD_STATUS.md`.

- [ ] **Step 5: Commit**

```bash
git add mobile/scripts/web-walkthrough.mjs docs/BUILD_STATUS.md
git commit -m "docs: round-trip milestone status; round-trip web walkthrough"
```
