# TraveScout — Design Spec

**Date:** 2026-03-18
**Status:** Approved

---

## 1. Product Overview

TraveScout is a travel price comparison app for budget travelers. Users enter a route (origin → destination + dates) and receive ranked results across trains, planes, and buses — all in one place. The goal is to always surface the cheapest way to get from A to B.

**Target user:** Budget-conscious travelers (students, backpackers) for whom price is the primary decision factor.

---

## 2. Platform

| Layer | Technology |
|---|---|
| iOS app | React Native (Expo) |
| Web app | React Native Web (same codebase) |
| Backend API | Node.js / Express |
| Auth | JWT (access + refresh tokens) |
| Payments | Stripe |

A single React Native codebase targets both iOS and web (~80% shared code). Platform-specific overrides are used where native behaviour differs.

---

## 3. Data Sources (Official APIs Only)

| Provider | Coverage |
|---|---|
| Amadeus API | Flights (global) |
| FlixBus API | Buses (Europe + US) |
| Trainline / Deutsche Bahn API | Trains (Europe) |

The Node.js backend calls all providers in parallel, normalises responses into a unified `Trip` schema, and returns a single ranked list to the client. Clients never call provider APIs directly.

---

## 4. Core User Flow

```
Sign Up / Log In
       ↓
Home — Search form (From / To / Dates)
       ↓
Search → Backend fans out to Amadeus + FlixBus + Rail APIs
       ↓
Results — ranked list (Cheapest · Fastest · Balanced)
       ↓
Route Detail — full breakdown, provider info, Book Now CTA
       ↓
Checkout — passenger details → review → payment (Stripe)
       ↓
Confirmation — booking reference, added to My Trips
```

---

## 5. Authentication

- Account required — no guest mode
- JWT-based: short-lived access token + long-lived refresh token
- Stored securely (iOS Keychain / web HttpOnly cookie)
- Account stores: saved searches, trip history, payment methods (Stripe Customer)

---

## 6. Search & Results

### Search form fields
- **From** — city/station autocomplete
- **To** — city/station autocomplete
- **Depart date** — date picker
- **Return date** — optional, date picker
- **Passengers** — adult count (default 1)

### Result ranking
Results default to **smart ranking** (composite score: price 60%, duration 30%, convenience 10%). Three tagged results are always pinned at the top:
- 🟢 **CHEAPEST** — lowest price
- 🔵 **FASTEST** — shortest total journey time
- 🟡 **BALANCED** — best composite score

User can switch to sort by Price, Duration, or Departure time via filter chips.

### Transport types
Flights (✈), Trains (🚆), Buses (🚌) — filterable via chips.

---

## 7. Currency

Three supported currencies, selectable via a dropdown pill in the app header:

| Currency | Symbol |
|---|---|
| Euro | € |
| US Dollar | $ |
| British Pound | £ |

Default: EUR. All prices stored internally in EUR; converted client-side using fixed exchange rates (refreshed daily via the [Frankfurter API](https://www.frankfurter.app/) — free, no key required). Designed to be extended to more currencies in future.

---

## 8. In-App Booking

Booking is completed inside the app (not redirected to provider). Flow:

1. **Passenger details** — name, email, phone, travel document
2. **Review** — itinerary summary, total price
3. **Payment** — Stripe card input (or saved card)
4. **Confirmation** — booking reference, e-ticket delivered by email

The backend proxies the booking request to the relevant provider API using the provider's booking endpoint. Stripe handles all card data — the app never touches raw card numbers.

> **Note:** Not all providers may expose a full programmatic booking API (some offer search-only or redirect flows). Provider booking capability must be validated during planning; providers that don't support in-app booking will fall back to a deep-link redirect to their site.

---

## 9. My Trips

Displays upcoming and past bookings retrieved from the backend. Each trip shows: route, date, transport type, status (Confirmed / Pending / Cancelled), and booking reference.

---

## 10. Price Alerts

Users can set a price threshold on any route. The backend polls provider APIs on a schedule (e.g. every 6 hours) and sends a push notification when the price drops below the threshold. Push delivery uses APNs (iOS) and Web Push API (browser); a notification service such as Firebase Cloud Messaging (FCM) handles both channels.

---

## 11. UI Design

### Theme
- **Dark mode** (default): Navy/slate background (`#1e293b`, `#0f172a`), indigo accents (`#6366f1`), green for cheapest prices (`#22c55e`)
- **Light mode**: White background, same accents — toggled via a 🌙/☀️ switch in the header

### Navigation (bottom tab bar on mobile, top nav on web)
| Tab | Icon |
|---|---|
| Search | 🔍 |
| My Trips | 🧳 |
| Alerts | 🔔 |
| Profile | 👤 |

### Key UI patterns
- Currency dropdown pill (EUR / USD / GBP) always visible in header
- Result cards: transport icon + route + duration on left, price on right, badge top-left
- Bottom sheet for supplementary pickers (future: date picker, passenger count)

---

## 12. Architecture

```
Client (RN iOS + RN Web)
        │
        │ HTTPS REST
        ▼
Node.js API (Express)
  ├── /auth        — register, login, refresh, logout
  ├── /search      — fan-out to providers, normalise, rank, return
  ├── /book        — proxy booking to provider + charge via Stripe
  ├── /trips       — CRUD for user's trip history
  └── /alerts      — CRUD for price alerts + polling scheduler
        │
        ├── Amadeus API
        ├── FlixBus API
        ├── Rail API (Trainline / DB)
        ├── Stripe
        └── PostgreSQL (users, trips, alerts)
```

---

## 13. Data Model (Core Entities)

**User** — id, email, password_hash, stripe_customer_id, created_at

**Trip** — id, user_id, provider, booking_ref, origin, destination, depart_at, return_at, price_eur, currency_display, status, raw_ticket_url

**Alert** — id, user_id, origin, destination, threshold_eur, last_checked_at, active

**SearchResult** (ephemeral, not persisted) — provider, transport_type, origin, destination, depart_at, arrive_at, duration_mins, price_eur, deep_link

---

## 14. Out of Scope (v1)

- Multi-city / open-jaw itineraries
- Seat selection
- Hotel / car hire bundling
- Social features
- More than 3 currencies (designed to extend later)
- Android (React Native ready, not in v1 scope)
