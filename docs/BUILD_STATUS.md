# TraveScout — Build Status

_Last updated: 2026-07-04. Read this first when resuming with fresh context._

## What the app is
A multi-modal travel app: search flights + buses + trains in one place, book
single trips or stitched multi-leg **itineraries** (bus → flight → train with
connections), and keep every ticket/QR in one place ("My Trips"). Backend is an
Express + Postgres API; the app is Expo React Native (SDK 54) run in Expo Go.

- **Backend:** `backend/` (Express, `pg`, Stripe). Tests: `npm test` (Jest, 147 passing).
- **Mobile:** `mobile/` (Expo Router, SDK 54). Tests: `npm test` (Jest, 186 passing); `npm run typecheck`; `npm run lint`.
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

## Done this milestone (chronological, latest first)
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
- Round trips not modelled end-to-end (return date removed from search for now).
- In-memory offer store + idempotency assume single backend instance; use Redis/DB
  for multi-instance.
- Mobile 14 moderate npm advisories are transitive via the Expo SDK 54 toolchain
  (fixing needs an SDK upgrade → blocked by the Expo Go 54 constraint).
