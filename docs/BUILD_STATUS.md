# TraveScout — Build Status

_Last updated: 2026-09-27. Read this first when resuming with fresh context._

## What the app is
A multi-modal travel app: search flights + buses + trains in one place, book
single trips or stitched multi-leg **itineraries** (bus → flight → train with
connections), and keep every ticket/QR in one place ("My Trips"). Backend is an
Express + Postgres API; the app is Expo React Native (SDK 54) run in Expo Go.

- **Backend:** `backend/` (Express, `pg`, Stripe). Tests: `npm test` (Jest, 178 passing; needs Postgres running — `brew services start postgresql@17`).
- **Mobile:** `mobile/` (Expo Router, SDK 54). Tests: `npm test` (Jest, 326 passing); `npm run typecheck`; `npm run lint`.
- **Branch:** `feature/multi-modal-routing`. Not yet merged to `master`.

## How to run (local)
1. Backend: `cd backend && npm run migrate && node src/index.js` (port 3000).
   - Needs `backend/.env` with `DATABASE_URL`, JWT secrets, `STRIPE_SECRET_KEY`.
   - Dev DB `travescout`, test DB `travescout_test` (both migrated).
2. Mobile: `cd mobile && EXPO_PUBLIC_API_URL=http://localhost:3000 npx expo start --clear`
   then open `exp://127.0.0.1:8081` in Expo Go (simulator uses Expo Go 54.0.7).
   - **Always use `--clear`** after code changes — Metro caches stale bundles in
     this setup and silently serves old code (bit us 3× this session). Verify a
     change shipped: `curl -s "http://localhost:8081/node_modules/expo-router/entry.bundle?platform=ios&dev=true" | grep -c <symbol>`.
- Demo login: `demo@travescout.app` / `demo12345`.

## Environment constraints (important)
- **Expo SDK 54, pinned** to match the simulator's Expo Go 54.0.7. Do NOT upgrade
  to SDK 55 — Expo Go rejects it. Native `expo run:ios` build fails (xcodebuild 65).
- **No real Stripe key:** `backend/.env` has a placeholder `sk_test_…`, so live
  Stripe calls fail (402). The money-path *logic* is proven by tests against a
  mocked Stripe + real DB. Drop in a real `sk_test_…` to complete real charges.
- **Real card tokenization is not wired** — needs native `@stripe/stripe-react-native`
  + a dev build (can't run in Expo Go). Currently the entered card is mapped by
  brand to a Stripe *test* PaymentMethod token (test mode only).
- Can't drive taps into the simulator from the terminal (no Accessibility perm,
  no `idb`/`cliclick`); screenshots via `xcrun simctl io booted screenshot` work.

## Where things live
- Booking money path: `backend/src/services/booking.js`, `itineraryBooking.js`,
  `stripe.js`, `offerStore.js` (server re-quote), `models/bookingAttempt.js`
  (idempotency ledger), `db.js` (`withTransaction`).
- Search/providers: `backend/src/providers/*` (amadeus real+stub, flixbus/rail
  stubs), `normalizers/*`, `ranker.js`, `services/search.js` + `connectionSearch.js`.
- Migrations: `backend/migrations/*.sql`, runner `backend/scripts/migrate.js`
  (`npm run migrate`; tracks applied in `schema_migrations`).
- Mobile input formatters (all unit-tested): `mobile/src/utils/payment.ts`
  (card number spacing, smart MM/YY expiry, CVC) and `mobile/src/utils/date.ts`
  (smart YYYY-MM-DD with month/day clamping + leap years).
- Maps deep-link: `mobile/src/utils/maps.ts` + `components/RouteMapMenu.tsx`.
- Checkout state: `mobile/src/stores/checkoutStore.ts` (per-attempt idempotency
  key). API client + refresh logic: `mobile/src/api/client.ts`.

## Round trips milestone (2026-09-27)
Spec: `docs/superpowers/specs/2026-09-26-round-trips-design.md`, plan:
`docs/superpowers/plans/2026-09-26-round-trips.md`.
- Search: One-way / Return toggle, return date (default depart + 3), recents keep it.
- Results: pick outbound (`/results`), then return (`/results?leg=return`, cities
  swapped, pinned outbound, returns < 60 min after arrival hidden, overnight
  outbound moves the return search to its arrival day).
- Checkout: a round trip is one itinerary with `direction`-tagged legs; optional
  connections run per direction (Step n of 6); review/confirmation grouped by
  direction; route map reverses home ↔ stay for the return (`RouteMapMenu reversed`).
- Backend: migration `010_round_trips.sql` (`itineraries.trip_type`,
  `trips.direction`); `/book/itinerary` accepts `tripType`, up to 3 legs per
  direction, server-side check that the return departs after the outbound arrives.
- One direction failing at the provider → partial capture (only booked legs
  charged); confirmation offers "Search return again".
- Walkthrough: `node scripts/web-walkthrough.mjs <outDir> [light|dark] [oneway|roundtrip]`.

## Modern redesign milestone (2026-09-26)
Omio/Trainline-inspired redesign + bug sweep, all within Expo Go 54 (added only
Expo-Go-bundled `expo-haptics`, `expo-linear-gradient`, `@expo/vector-icons`).
- Design system: `src/constants/colors.ts` (navy ink / teal / grey canvas + dark),
  `src/constants/theme.ts` (spacing, radius, type, elevation), primitives in
  `src/components/ui/` (Button, Card, SegmentedControl, Sheet, Skeleton,
  EmptyState, Toast, BottomBar). Theme follows the OS; System/Light/Dark in Account.
- Search: gradient hero, city picker sheet (recent/popular, fuzzy), calendar sheet
  (replaced typed YYYY-MM-DD), swap, per-user recent searches, popular routes.
- Results: instant nav + skeletons, date strip with cheapest fare/day
  (`GET /search/prices`, cached 10 min), mode tabs with cheapest per mode,
  Best/Cheapest/Fastest/Earliest, timeline cards with +1 day, price-alert bell.
- Alerts tab works (on-device, `src/utils/priceAlerts.ts`, re-quoted on focus).
- My Trips: Upcoming/Past, ticket cards, QR on expand, pull-to-refresh.
- Checkout: consistent "Step n of N" (`checkoutSteps()` in Stepper), sticky
  BottomBar, price breakdown, live card preview; confirmation with share + QR.
- Bugs fixed: backend accepted impossible dates (2030-02-30); currency fell back
  to 1:1 on a bad rates payload; "1 stops"; mismatched connections stepper;
  passenger/transfer inputs lost on back-navigation; My Trips spinner flash that
  collapsed open tickets; dark status-bar text on hero screens; white flash on launch.
- Visual check without simulator taps: `mobile/scripts/web-walkthrough.mjs` drives
  the Expo web build in headless Chrome over CDP and screenshots every step.

## Done previous milestone (chronological, latest first)
- `df3f47e` smart departure-date input (auto dashes; month≤12, day≤days-in-month,
  leap-aware; single-digit padding; backspace-safe).
- `e73c6f6` card number auto-spaces every 4 digits; smart MM/YY expiry (8→08/); CVC digits-only.
- `fcc206e` "View route on map" dropdown → Apple/Google Maps (trip detail + My Trips).
- `7f2d140` mobile hardening: card→test-token mapping, per-attempt idempotency key,
  stack reset after pay, AuthGate redirect on forced sign-out, refresh only-401
  terminal, clear stores on expiry, request timeouts, results re-read on focus,
  standalone QR tickets, partial-fail display, retry buttons, keyboard, round-trip removed.
- `a20878e` backend money-path: DB transactions + capture-after-commit + cancel/refund
  on failure; server-side price re-quote (offer store); idempotency ledger;
  arrive_at in itineraries; unique/longer refs; case-insensitive email; rate limits
  on search/book; trust-proxy; logout-all; timezone-consistent stub flights (UTC).
- `863d45d` audits fixed, eslint added both packages, GitHub Actions CI, test hygiene.
- Earlier: SDK 54 downgrade, UI modernization, safe-area header, flight stub fallback.

## Pre-launch audit status
A 4-lens principal-engineer audit (security, data integrity, edge cases, auth/state)
was run and **every Critical/High/Medium finding was fixed** across `a20878e` +
`7f2d140`. Verified: backend 147 tests, mobile 186 tests, tsc + eslint clean, and
the money-path re-quote/idempotency proven live (unknown offer → 409, tampered
price ignored → would charge real €200, NaN → 400).

## Known limitations / next steps
- Real Stripe key + native Stripe SDK (dev build) to take real payments.
- Provider `book()` for FlixBus/rail/Amadeus are stubs (gated off in production
  unless `MOCK_PROVIDERS=true`); wire real partner APIs when credentials exist.
- Round-trip price alerts and round-trip fares (cheaper than two singles) are not modelled.
- Price alerts are on-device and checked when the Alerts tab opens; no push
  notifications/background checks yet (needs expo-notifications + a server job).
- In-memory offer store + idempotency assume single backend instance; use Redis/DB
  for multi-instance.
- Mobile 14 moderate npm advisories are transitive via the Expo SDK 54 toolchain
  (fixing needs an SDK upgrade → blocked by the Expo Go 54 constraint).
