# TraveScout UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete TraveScout UI — all screens, navigation, and interactions — using static mock data, ready for a real backend to be wired in later.

**Architecture:** React 18 + TypeScript SPA (Vite), with React Router v6 for navigation. All data comes from local mock files. No API calls in this phase. Each screen is a focused component; shared UI primitives live in `src/components/ui/`.

**Tech Stack:** Vite · React 18 · TypeScript · Tailwind CSS · React Router v6 · Lucide React (icons)

---

## File Map

```
src/
  main.tsx                         # App entry point
  App.tsx                          # Router setup, root layout
  theme.ts                         # Design token constants (colors)

  mock/
    deals.ts                       # Mock hot deals data
    results.ts                     # Mock search results (flights/trains/buses)
    trips.ts                       # Mock My Trips data
    cities.ts                      # Mock city autocomplete data

  types/
    index.ts                       # Shared TypeScript types

  components/
    ui/
      Badge.tsx                    # Best price / Fastest / Balance tag
      TransportIcon.tsx            # ✈ 🚆 🚌 icon selector
      Button.tsx                   # Primary CTA button
      Card.tsx                     # Surface card wrapper
      FilterChip.tsx               # All / Flight / Train / Bus chip
      StepIndicator.tsx            # Checkout step 1-2-3 progress
      StatusBadge.tsx              # Confirmed / Pending / Cancelled
    layout/
      BottomTabBar.tsx             # Mobile bottom nav (Home/Search/Trips/Settings)
      TopNav.tsx                   # Web top navigation
      Shell.tsx                    # Responsive shell — renders BottomTabBar or TopNav

  screens/
    HomeScreen.tsx                 # Deals feed + search bar
    SearchScreen.tsx               # Standalone search form
    ResultsScreen.tsx              # One-way results list
    ResultsReturnScreen.tsx        # Return trip: outbound → inbound selection
    ResultsFlexibleScreen.tsx      # Flexible: date-price grid
    RouteDetailScreen.tsx          # Full route breakdown + Book now CTA
    CheckoutPassengersScreen.tsx   # Checkout step 1 — passenger details
    CheckoutReviewScreen.tsx       # Checkout step 2 — review
    CheckoutPaymentScreen.tsx      # Checkout step 3 — payment
    ConfirmationScreen.tsx         # Booking confirmed
    MyTripsScreen.tsx              # Upcoming + past trips
    SettingsScreen.tsx             # Region, account, about
    OnboardingScreen.tsx           # First-launch: sign up / guest choice

  hooks/
    useResultTags.ts               # Best price / Fastest / Balance tag logic
    useRecentSearches.ts           # localStorage recent searches
    useAuth.ts                     # Mock auth state (guest / signed-in)
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `index.html`
- Create: `src/main.tsx`

- [ ] **Step 1: Scaffold Vite + React + TypeScript project**

```bash
cd "/Users/alexorban/Downloads/Claude projects/best trave transport price"
npm create vite@latest . -- --template react-ts
```

Answer prompts: select `React` and `TypeScript`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install react-router-dom lucide-react
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 3: Configure Tailwind**

Edit `tailwind.config.ts` — set `content` to scan all source files:

```ts
import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config
```

- [ ] **Step 4: Add Tailwind directives to CSS**

Replace contents of `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Clean boilerplate**

Delete `src/App.css`. Replace `src/App.tsx` with a minimal placeholder:

```tsx
export default function App() {
  return <div className="text-white bg-[#0f172a] min-h-screen p-4">TraveScout loading…</div>
}
```

- [ ] **Step 6: Verify dev server starts**

```bash
npm run dev
```

Expected: browser opens, shows "TraveScout loading…" on dark background. No console errors.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Vite + React + TypeScript + Tailwind"
```

---

## Task 2: Types and Design Tokens

**Files:**
- Create: `src/types/index.ts`
- Create: `src/theme.ts`

- [ ] **Step 1: Write shared TypeScript types**

Create `src/types/index.ts`:

```ts
export type TransportType = 'flight' | 'train' | 'bus'

export type TripType = 'one-way' | 'return' | 'flexible'

export type ResultTag = 'best-price' | 'fastest' | 'balance' | null

export interface City {
  id: string
  name: string
  countryCode: string
  stations: Station[]
}

export interface Station {
  id: string
  name: string
  type: TransportType
}

export interface SearchParams {
  origin: City | null
  destination: City | null
  passengers: number
  tripType: TripType
  departDate: string       // ISO date string YYYY-MM-DD
  returnDate?: string
  flexDays?: number        // ±days for flexible mode
}

export interface Stop {
  stationName: string
  cityName: string
  arrivalTime?: string     // ISO datetime
  departureTime?: string
  layoverMinutes?: number
}

export interface Route {
  id: string
  operator: string
  type: TransportType
  pricePerPerson: number
  durationMinutes: number
  stops: Stop[]
  departureTime: string    // ISO datetime
  arrivalTime: string
  ticketClass?: string
  tag?: ResultTag
}

export interface Deal {
  id: string
  routeName: string
  type: TransportType
  operator: string
  durationMinutes: number
  departureTime: string
  priceNow: number
  priceOriginal: number
}

export interface Passenger {
  fullName: string
  email: string
}

export type BookingStatus = 'confirmed' | 'pending' | 'completed' | 'cancelled'

export interface Booking {
  id: string                  // e.g. TS-XXXXXX
  operatorRef?: string
  route: Route
  passengers: Passenger[]
  bookedAt: string            // ISO datetime
  status: BookingStatus
}
```

- [ ] **Step 2: Write design tokens**

Create `src/theme.ts`:

```ts
export const colors = {
  bg: '#0f172a',
  surface: '#1e293b',
  input: '#334155',
  accent: '#6366f1',
  tagBestPrice: '#10b981',
  tagFastest: '#f59e0b',
  tagBalance: '#475569',
  textPrimary: '#f8fafc',
  textMuted: '#94a3b8',
} as const
```

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts src/theme.ts
git commit -m "feat: add shared types and design tokens"
```

---

## Task 3: Mock Data

**Files:**
- Create: `src/mock/cities.ts`
- Create: `src/mock/deals.ts`
- Create: `src/mock/results.ts`
- Create: `src/mock/trips.ts`

- [ ] **Step 1: Create city autocomplete mock data**

Create `src/mock/cities.ts`:

```ts
import type { City } from '../types'

export const CITIES: City[] = [
  {
    id: 'lon', name: 'London', countryCode: 'GB',
    stations: [
      { id: 'lon-st-pancras', name: 'St Pancras International', type: 'train' },
      { id: 'lon-heathrow', name: 'Heathrow Airport', type: 'flight' },
      { id: 'lon-victoria', name: 'Victoria Coach Station', type: 'bus' },
    ],
  },
  {
    id: 'par', name: 'Paris', countryCode: 'FR',
    stations: [
      { id: 'par-nord', name: 'Gare du Nord', type: 'train' },
      { id: 'par-cdg', name: 'Charles de Gaulle Airport', type: 'flight' },
      { id: 'par-bercy', name: 'Bercy Bus Terminal', type: 'bus' },
    ],
  },
  {
    id: 'ams', name: 'Amsterdam', countryCode: 'NL',
    stations: [
      { id: 'ams-centraal', name: 'Amsterdam Centraal', type: 'train' },
      { id: 'ams-schiphol', name: 'Schiphol Airport', type: 'flight' },
    ],
  },
  {
    id: 'bru', name: 'Brussels', countryCode: 'BE',
    stations: [
      { id: 'bru-midi', name: 'Brussels-Midi / Zuid', type: 'train' },
      { id: 'bru-airport', name: 'Brussels Airport', type: 'flight' },
    ],
  },
  {
    id: 'ber', name: 'Berlin', countryCode: 'DE',
    stations: [
      { id: 'ber-hbf', name: 'Berlin Hauptbahnhof', type: 'train' },
      { id: 'ber-ber', name: 'Berlin Brandenburg Airport', type: 'flight' },
    ],
  },
  {
    id: 'mad', name: 'Madrid', countryCode: 'ES',
    stations: [
      { id: 'mad-atocha', name: 'Madrid Atocha', type: 'train' },
      { id: 'mad-barajas', name: 'Adolfo Suárez Barajas Airport', type: 'flight' },
    ],
  },
  {
    id: 'rom', name: 'Rome', countryCode: 'IT',
    stations: [
      { id: 'rom-termini', name: 'Roma Termini', type: 'train' },
      { id: 'rom-fco', name: 'Fiumicino Airport', type: 'flight' },
    ],
  },
]
```

- [ ] **Step 2: Create deals mock data**

Create `src/mock/deals.ts`:

```ts
import type { Deal } from '../types'

export const MOCK_DEALS: Deal[] = [
  {
    id: 'd1',
    routeName: 'London → Paris',
    type: 'train',
    operator: 'Eurostar',
    durationMinutes: 135,
    departureTime: '2026-03-20T07:01:00',
    priceNow: 29,
    priceOriginal: 89,
  },
  {
    id: 'd2',
    routeName: 'Amsterdam → Brussels',
    type: 'train',
    operator: 'Thalys',
    durationMinutes: 105,
    departureTime: '2026-03-21T09:15:00',
    priceNow: 19,
    priceOriginal: 55,
  },
  {
    id: 'd3',
    routeName: 'Paris → Berlin',
    type: 'bus',
    operator: 'FlixBus',
    durationMinutes: 870,
    departureTime: '2026-03-22T21:00:00',
    priceNow: 14,
    priceOriginal: 39,
  },
  {
    id: 'd4',
    routeName: 'Madrid → Rome',
    type: 'flight',
    operator: 'Vueling',
    durationMinutes: 155,
    departureTime: '2026-03-23T06:30:00',
    priceNow: 42,
    priceOriginal: 110,
  },
  {
    id: 'd5',
    routeName: 'London → Amsterdam',
    type: 'flight',
    operator: 'easyJet',
    durationMinutes: 80,
    departureTime: '2026-03-25T11:45:00',
    priceNow: 35,
    priceOriginal: 78,
  },
]
```

- [ ] **Step 3: Create search results mock data**

Create `src/mock/results.ts`:

```ts
import type { Route } from '../types'

export const MOCK_RESULTS: Route[] = [
  {
    id: 'r1',
    operator: 'Eurostar',
    type: 'train',
    pricePerPerson: 29,
    durationMinutes: 135,
    departureTime: '2026-03-20T07:01:00',
    arrivalTime: '2026-03-20T09:16:00',
    ticketClass: 'Standard',
    stops: [
      { cityName: 'London', stationName: 'St Pancras International', departureTime: '2026-03-20T07:01:00' },
      { cityName: 'Paris', stationName: 'Gare du Nord', arrivalTime: '2026-03-20T09:16:00' },
    ],
  },
  {
    id: 'r2',
    operator: 'easyJet',
    type: 'flight',
    pricePerPerson: 45,
    durationMinutes: 80,
    departureTime: '2026-03-20T09:30:00',
    arrivalTime: '2026-03-20T10:50:00',
    ticketClass: 'Economy',
    stops: [
      { cityName: 'London', stationName: 'Heathrow Airport', departureTime: '2026-03-20T09:30:00' },
      { cityName: 'Paris', stationName: 'Charles de Gaulle Airport', arrivalTime: '2026-03-20T10:50:00' },
    ],
  },
  {
    id: 'r3',
    operator: 'FlixBus',
    type: 'bus',
    pricePerPerson: 12,
    durationMinutes: 480,
    departureTime: '2026-03-20T22:00:00',
    arrivalTime: '2026-03-21T06:00:00',
    stops: [
      { cityName: 'London', stationName: 'Victoria Coach Station', departureTime: '2026-03-20T22:00:00' },
      { cityName: 'Paris', stationName: 'Bercy Bus Terminal', arrivalTime: '2026-03-21T06:00:00' },
    ],
  },
  {
    id: 'r4',
    operator: 'Thalys',
    type: 'train',
    pricePerPerson: 59,
    durationMinutes: 150,
    departureTime: '2026-03-20T14:13:00',
    arrivalTime: '2026-03-20T16:43:00',
    ticketClass: 'Standard',
    stops: [
      { cityName: 'London', stationName: 'St Pancras International', departureTime: '2026-03-20T14:13:00' },
      { cityName: 'Paris', stationName: 'Gare du Nord', arrivalTime: '2026-03-20T16:43:00' },
    ],
  },
]

// Flexible date price grid: cheapest price per day (±7 from preferred)
export const MOCK_FLEXIBLE_PRICES: Record<string, number> = {
  '2026-03-13': 55,
  '2026-03-14': 42,
  '2026-03-15': 38,
  '2026-03-16': 61,
  '2026-03-17': 29,
  '2026-03-18': 35,
  '2026-03-19': 44,
  '2026-03-20': 29,  // preferred date
  '2026-03-21': 33,
  '2026-03-22': 48,
  '2026-03-23': 27,  // cheapest
  '2026-03-24': 39,
  '2026-03-25': 52,
  '2026-03-26': 41,
  '2026-03-27': 36,
}
```

- [ ] **Step 4: Create My Trips mock data**

Create `src/mock/trips.ts`:

```ts
import type { Booking } from '../types'

export const MOCK_TRIPS: Booking[] = [
  {
    id: 'TS-001234',
    operatorRef: 'EUR-9182736',
    status: 'confirmed',
    bookedAt: '2026-03-15T10:00:00',
    passengers: [{ fullName: 'Alex Orban', email: 'alex@example.com' }],
    route: {
      id: 'r1',
      operator: 'Eurostar',
      type: 'train',
      pricePerPerson: 29,
      durationMinutes: 135,
      departureTime: '2026-03-20T07:01:00',
      arrivalTime: '2026-03-20T09:16:00',
      ticketClass: 'Standard',
      stops: [
        { cityName: 'London', stationName: 'St Pancras International', departureTime: '2026-03-20T07:01:00' },
        { cityName: 'Paris', stationName: 'Gare du Nord', arrivalTime: '2026-03-20T09:16:00' },
      ],
    },
  },
  {
    id: 'TS-000891',
    operatorRef: 'FLX-4455667',
    status: 'completed',
    bookedAt: '2026-01-10T08:30:00',
    passengers: [{ fullName: 'Alex Orban', email: 'alex@example.com' }],
    route: {
      id: 'r3',
      operator: 'FlixBus',
      type: 'bus',
      pricePerPerson: 14,
      durationMinutes: 870,
      departureTime: '2026-01-15T21:00:00',
      arrivalTime: '2026-01-16T10:30:00',
      stops: [
        { cityName: 'Paris', stationName: 'Bercy Bus Terminal', departureTime: '2026-01-15T21:00:00' },
        { cityName: 'Berlin', stationName: 'Berlin ZOB', arrivalTime: '2026-01-16T10:30:00' },
      ],
    },
  },
]
```

- [ ] **Step 5: Commit**

```bash
git add src/mock/ src/types/
git commit -m "feat: add mock data and shared types"
```

---

## Task 4: Shared UI Primitives

**Files:**
- Create: `src/components/ui/TransportIcon.tsx`
- Create: `src/components/ui/Badge.tsx`
- Create: `src/components/ui/Button.tsx`
- Create: `src/components/ui/Card.tsx`
- Create: `src/components/ui/FilterChip.tsx`
- Create: `src/components/ui/StepIndicator.tsx`
- Create: `src/components/ui/StatusBadge.tsx`

- [ ] **Step 1: TransportIcon**

Create `src/components/ui/TransportIcon.tsx`:

```tsx
import { Plane, Train, Bus } from 'lucide-react'
import type { TransportType } from '../../types'

interface Props { type: TransportType; size?: number }

export function TransportIcon({ type, size = 16 }: Props) {
  if (type === 'flight') return <Plane size={size} />
  if (type === 'train') return <Train size={size} />
  return <Bus size={size} />
}
```

- [ ] **Step 2: Badge (result tags)**

Create `src/components/ui/Badge.tsx`:

```tsx
import type { ResultTag } from '../../types'

interface Props { tag: ResultTag }

const TAG_CONFIG = {
  'best-price': { label: 'Best price', bg: 'bg-[#10b981]' },
  'fastest':    { label: 'Fastest',    bg: 'bg-[#f59e0b]' },
  'balance':    { label: 'Balance',    bg: 'bg-[#475569]' },
}

export function Badge({ tag }: Props) {
  if (!tag) return null
  const { label, bg } = TAG_CONFIG[tag]
  return (
    <span className={`${bg} text-white text-xs font-semibold px-2 py-0.5 rounded-full`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 3: Button**

Create `src/components/ui/Button.tsx`:

```tsx
interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
}

export function Button({ variant = 'primary', fullWidth, className = '', children, ...rest }: Props) {
  const base = 'font-semibold rounded-xl py-3 px-6 transition-opacity disabled:opacity-50'
  const v = variant === 'primary'
    ? 'bg-[#6366f1] text-white hover:opacity-90'
    : 'bg-[#334155] text-[#f8fafc] hover:opacity-90'
  return (
    <button className={`${base} ${v} ${fullWidth ? 'w-full' : ''} ${className}`} {...rest}>
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Card**

Create `src/components/ui/Card.tsx`:

```tsx
interface Props { children: React.ReactNode; className?: string; onClick?: () => void }

export function Card({ children, className = '', onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1e293b] rounded-2xl p-4 ${onClick ? 'cursor-pointer hover:bg-[#253347] transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  )
}
```

- [ ] **Step 5: FilterChip**

Create `src/components/ui/FilterChip.tsx`:

```tsx
interface Props {
  label: string
  active: boolean
  onClick: () => void
}

export function FilterChip({ label, active, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
        active ? 'bg-[#6366f1] text-white' : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#253347]'
      }`}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 6: StepIndicator**

Create `src/components/ui/StepIndicator.tsx`:

```tsx
interface Props { current: 1 | 2 | 3; labels: [string, string, string] }

export function StepIndicator({ current, labels }: Props) {
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => {
        const step = i + 1
        const done = step < current
        const active = step === current
        return (
          <div key={step} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
              done ? 'bg-[#10b981] text-white' : active ? 'bg-[#6366f1] text-white' : 'bg-[#334155] text-[#94a3b8]'
            }`}>
              {done ? '✓' : step}
            </div>
            <span className={`text-xs ${active ? 'text-[#f8fafc]' : 'text-[#94a3b8]'}`}>{label}</span>
            {i < 2 && <div className="w-6 h-px bg-[#334155]" />}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 7: StatusBadge**

Create `src/components/ui/StatusBadge.tsx`:

```tsx
import type { BookingStatus } from '../../types'

const CONFIG: Record<BookingStatus, { label: string; className: string }> = {
  confirmed:  { label: 'Confirmed',  className: 'bg-[#10b981]/20 text-[#10b981]' },
  pending:    { label: 'Pending',    className: 'bg-[#f59e0b]/20 text-[#f59e0b]' },
  completed:  { label: 'Completed',  className: 'bg-[#475569]/30 text-[#94a3b8]' },
  cancelled:  { label: 'Cancelled',  className: 'bg-red-900/30 text-red-400' },
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, className } = CONFIG[status]
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${className}`}>{label}</span>
}
```

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/
git commit -m "feat: add shared UI primitives"
```

---

## Task 5: App Shell and Navigation

**Files:**
- Create: `src/components/layout/BottomTabBar.tsx`
- Create: `src/components/layout/TopNav.tsx`
- Create: `src/components/layout/Shell.tsx`
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: BottomTabBar**

Create `src/components/layout/BottomTabBar.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { Home, Search, Briefcase, Settings } from 'lucide-react'

const TABS = [
  { to: '/',        label: 'Home',     Icon: Home },
  { to: '/search',  label: 'Search',   Icon: Search },
  { to: '/trips',   label: 'My Trips', Icon: Briefcase },
  { to: '/settings',label: 'Settings', Icon: Settings },
]

export function BottomTabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1e293b] border-t border-[#334155] flex pb-safe">
      {TABS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center py-3 gap-1 text-xs transition-colors ${
              isActive ? 'text-[#6366f1]' : 'text-[#94a3b8]'
            }`
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 2: TopNav**

Create `src/components/layout/TopNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'
import { Plane } from 'lucide-react'

const LINKS = [
  { to: '/',         label: 'Home' },
  { to: '/search',   label: 'Search' },
  { to: '/trips',    label: 'My Trips' },
  { to: '/settings', label: 'Settings' },
]

export function TopNav() {
  return (
    <nav className="bg-[#1e293b] border-b border-[#334155] px-6 flex items-center gap-8 h-14">
      <div className="flex items-center gap-2 text-[#6366f1] font-bold text-lg mr-6">
        <Plane size={20} />
        TraveScout
      </div>
      {LINKS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `text-sm font-medium transition-colors ${isActive ? 'text-[#6366f1]' : 'text-[#94a3b8] hover:text-[#f8fafc]'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
```

- [ ] **Step 3: Shell — responsive layout wrapper**

Create `src/components/layout/Shell.tsx`:

```tsx
import { Outlet, useNavigate } from 'react-router-dom'
import { BottomTabBar } from './BottomTabBar'
import { TopNav } from './TopNav'
import { useEffect, useState } from 'react'

export function Shell() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f8fafc] font-sans">
      {!isMobile && <TopNav />}
      <main className={`max-w-2xl mx-auto px-4 ${isMobile ? 'pb-24 pt-4' : 'py-6'}`}>
        <Outlet />
      </main>
      {isMobile && <BottomTabBar />}
    </div>
  )
}
```

- [ ] **Step 4: Wire up router in App.tsx**

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { HomeScreen } from './screens/HomeScreen'
import { SearchScreen } from './screens/SearchScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import { ResultsReturnScreen } from './screens/ResultsReturnScreen'
import { ResultsFlexibleScreen } from './screens/ResultsFlexibleScreen'
import { RouteDetailScreen } from './screens/RouteDetailScreen'
import { CheckoutPassengersScreen } from './screens/CheckoutPassengersScreen'
import { CheckoutReviewScreen } from './screens/CheckoutReviewScreen'
import { CheckoutPaymentScreen } from './screens/CheckoutPaymentScreen'
import { ConfirmationScreen } from './screens/ConfirmationScreen'
import { MyTripsScreen } from './screens/MyTripsScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route element={<Shell />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/results" element={<ResultsScreen />} />
          <Route path="/results/return" element={<ResultsReturnScreen />} />
          <Route path="/results/flexible" element={<ResultsFlexibleScreen />} />
          <Route path="/route/:routeId" element={<RouteDetailScreen />} />
          <Route path="/checkout/passengers" element={<CheckoutPassengersScreen />} />
          <Route path="/checkout/review" element={<CheckoutReviewScreen />} />
          <Route path="/checkout/payment" element={<CheckoutPaymentScreen />} />
          <Route path="/confirmation" element={<ConfirmationScreen />} />
          <Route path="/trips" element={<MyTripsScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 5: Update main.tsx to import CSS**

Ensure `src/main.tsx`:

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 6: Create stub screens so app compiles**

For each missing screen, create a minimal stub. Example pattern for all screens not yet built:

```tsx
// src/screens/HomeScreen.tsx
export function HomeScreen() {
  return <div className="text-white">Home Screen — coming soon</div>
}
```

Create stubs for: `HomeScreen`, `SearchScreen`, `ResultsScreen`, `ResultsReturnScreen`, `ResultsFlexibleScreen`, `RouteDetailScreen`, `CheckoutPassengersScreen`, `CheckoutReviewScreen`, `CheckoutPaymentScreen`, `ConfirmationScreen`, `MyTripsScreen`, `SettingsScreen`, `OnboardingScreen`.

- [ ] **Step 7: Verify navigation works**

```bash
npm run dev
```

Expected: dark app shell loads. Bottom tab bar visible on narrow viewport. Top nav on wide viewport. Clicking tabs navigates between stub screens.

- [ ] **Step 8: Commit**

```bash
git add src/components/layout/ src/App.tsx src/main.tsx src/screens/
git commit -m "feat: app shell, navigation, and screen stubs"
```

---

## Task 6: Hooks — useResultTags and useRecentSearches

**Files:**
- Create: `src/hooks/useResultTags.ts`
- Create: `src/hooks/useRecentSearches.ts`
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: useResultTags — tag assignment logic**

Create `src/hooks/useResultTags.ts`:

```ts
import type { Route, ResultTag } from '../types'

export function assignTags(routes: Route[]): Route[] {
  if (routes.length === 0) return routes

  const cheapest = routes.reduce((a, b) => a.pricePerPerson <= b.pricePerPerson ? a : b)
  const fastest  = routes.reduce((a, b) => a.durationMinutes <= b.durationMinutes ? a : b)

  // Normalize for balance score
  const minPrice = Math.min(...routes.map(r => r.pricePerPerson))
  const maxPrice = Math.max(...routes.map(r => r.pricePerPerson))
  const minDur   = Math.min(...routes.map(r => r.durationMinutes))
  const maxDur   = Math.max(...routes.map(r => r.durationMinutes))

  const normalizePrice = (p: number) =>
    maxPrice === minPrice ? 0 : (p - minPrice) / (maxPrice - minPrice)
  const normalizeDur = (d: number) =>
    maxDur === minDur ? 0 : (d - minDur) / (maxDur - minDur)

  const scored = routes.map(r => ({
    id: r.id,
    score: normalizePrice(r.pricePerPerson) + normalizeDur(r.durationMinutes),
  }))
  const balance = scored.reduce((a, b) => a.score <= b.score ? a : b)

  return routes.map(r => {
    let tag: ResultTag = null
    if (r.id === cheapest.id) {
      tag = 'best-price'
    } else if (r.id === fastest.id) {
      tag = 'fastest'
    } else if (r.id === balance.id) {
      tag = 'balance'
    }
    return { ...r, tag }
  })
}
```

- [ ] **Step 2: Write unit tests for assignTags**

Create `src/hooks/useResultTags.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { assignTags } from './useResultTags'
import type { Route } from '../types'

const base: Omit<Route, 'id' | 'pricePerPerson' | 'durationMinutes'> = {
  operator: 'Test', type: 'train',
  departureTime: '', arrivalTime: '',
  stops: [],
}

function makeRoute(id: string, price: number, duration: number): Route {
  return { ...base, id, pricePerPerson: price, durationMinutes: duration }
}

describe('assignTags', () => {
  it('marks cheapest as best-price', () => {
    const routes = [makeRoute('a', 10, 200), makeRoute('b', 50, 100), makeRoute('c', 30, 150)]
    const result = assignTags(routes)
    expect(result.find(r => r.id === 'a')?.tag).toBe('best-price')
  })

  it('marks fastest as fastest (when not cheapest)', () => {
    const routes = [makeRoute('a', 10, 200), makeRoute('b', 50, 100), makeRoute('c', 30, 150)]
    const result = assignTags(routes)
    expect(result.find(r => r.id === 'b')?.tag).toBe('fastest')
  })

  it('assigns balance to the best composite score result', () => {
    const routes = [makeRoute('a', 10, 200), makeRoute('b', 50, 100), makeRoute('c', 30, 150)]
    const result = assignTags(routes)
    expect(result.find(r => r.id === 'c')?.tag).toBe('balance')
  })

  it('only shows best-price if one route is both cheapest and fastest', () => {
    const routes = [makeRoute('a', 10, 80), makeRoute('b', 50, 200)]
    const result = assignTags(routes)
    expect(result.find(r => r.id === 'a')?.tag).toBe('best-price')
    expect(result.find(r => r.id === 'b')?.tag).toBeNull()
  })

  it('handles a single route with no tag', () => {
    const routes = [makeRoute('a', 10, 100)]
    const result = assignTags(routes)
    expect(result[0].tag).toBe('best-price')
  })
})
```

- [ ] **Step 3: Install Vitest and run tests**

```bash
npm install -D vitest @vitest/ui
```

Add to `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom' },
})
```

Run:

```bash
npx vitest run src/hooks/useResultTags.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 4: useRecentSearches — localStorage**

Create `src/hooks/useRecentSearches.ts`:

```ts
import { useState } from 'react'

const KEY = 'travescout_recent_searches'
const MAX = 5

export function useRecentSearches() {
  const [recents, setRecents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
  })

  function add(cityName: string) {
    setRecents(prev => {
      const next = [cityName, ...prev.filter(c => c !== cityName)].slice(0, MAX)
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }

  function clear() {
    localStorage.removeItem(KEY)
    setRecents([])
  }

  return { recents, add, clear }
}
```

- [ ] **Step 5: useAuth — mock auth state**

Create `src/hooks/useAuth.ts`:

```ts
import { useState } from 'react'

type AuthState = { mode: 'guest' } | { mode: 'signed-in'; name: string; email: string }

const INITIAL: AuthState = { mode: 'guest' }

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>(INITIAL)

  function signIn(name: string, email: string) {
    setAuth({ mode: 'signed-in', name, email })
  }

  function signOut() {
    setAuth({ mode: 'guest' })
  }

  return { auth, signIn, signOut, isGuest: auth.mode === 'guest' }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/
git commit -m "feat: add useResultTags, useRecentSearches, useAuth hooks with tests"
```

---

## Task 7: Onboarding Screen

**Files:**
- Modify: `src/screens/OnboardingScreen.tsx`

- [ ] **Step 1: Implement OnboardingScreen**

Replace the stub `src/screens/OnboardingScreen.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { Plane } from 'lucide-react'
import { Button } from '../components/ui/Button'

export function OnboardingScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[#6366f1] mb-6">
        <Plane size={56} />
      </div>
      <h1 className="text-3xl font-bold text-[#f8fafc] mb-2">TraveScout</h1>
      <p className="text-[#94a3b8] mb-10 text-base">
        Find the cheapest flights, trains, and buses across Europe.
      </p>
      <div className="w-full max-w-xs flex flex-col gap-3">
        <Button fullWidth onClick={() => navigate('/')}>Create a free account</Button>
        <Button fullWidth variant="secondary" onClick={() => navigate('/')}>Sign in</Button>
        <button
          className="text-[#94a3b8] text-sm mt-2 hover:text-[#f8fafc] transition-colors"
          onClick={() => navigate('/')}
        >
          Continue as guest
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/onboarding`. Expected: logo, tagline, three options. Clicking any navigates to Home.

- [ ] **Step 3: Commit**

```bash
git add src/screens/OnboardingScreen.tsx
git commit -m "feat: onboarding screen"
```

---

## Task 8: Home Screen — Deals Feed

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Implement HomeScreen**

Replace stub `src/screens/HomeScreen.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ChevronRight } from 'lucide-react'
import { MOCK_DEALS } from '../mock/deals'
import { CITIES } from '../mock/cities'
import { TransportIcon } from '../components/ui/TransportIcon'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import type { TripType } from '../types'

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m}m`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function HomeScreen() {
  const navigate = useNavigate()
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [tripType, setTripType] = useState<TripType>('one-way')
  const [passengers, setPassengers] = useState(1)
  const [date, setDate] = useState('')

  const TRIP_TYPES: TripType[] = ['one-way', 'return', 'flexible']

  function handleSearch() {
    if (!origin || !destination) return
    const path = tripType === 'flexible' ? '/results/flexible'
      : tripType === 'return' ? '/results/return'
      : '/results'
    navigate(path, { state: { origin, destination, tripType, passengers, date } })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#f8fafc]">TraveScout</h1>
        <p className="text-[#94a3b8] text-sm mt-1">Find the cheapest routes across Europe</p>
      </div>

      {/* Search Card */}
      <Card>
        {/* Trip type toggle */}
        <div className="flex gap-1 mb-4 bg-[#0f172a] rounded-xl p-1">
          {TRIP_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTripType(t)}
              className={`flex-1 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors ${
                tripType === t ? 'bg-[#6366f1] text-white' : 'text-[#94a3b8]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Origin */}
        <input
          className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 mb-2 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
          placeholder="From — city or station"
          value={origin}
          onChange={e => setOrigin(e.target.value)}
        />

        {/* Destination */}
        <input
          className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 mb-2 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
          placeholder="To — city or station"
          value={destination}
          onChange={e => setDestination(e.target.value)}
        />

        {/* Date + passengers row */}
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            className="flex-1 bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6366f1]"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <div className="flex items-center gap-2 bg-[#334155] rounded-xl px-4 py-3">
            <button
              className="text-[#94a3b8] hover:text-white w-5 text-center"
              onClick={() => setPassengers(p => Math.max(1, p - 1))}
            >−</button>
            <span className="text-[#f8fafc] w-4 text-center font-medium">{passengers}</span>
            <button
              className="text-[#94a3b8] hover:text-white w-5 text-center"
              onClick={() => setPassengers(p => Math.min(9, p + 1))}
            >+</button>
          </div>
        </div>

        {tripType === 'return' && (
          <input
            type="date"
            className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-[#6366f1]"
            placeholder="Return date"
          />
        )}

        <Button fullWidth onClick={handleSearch} disabled={!origin || !destination}>
          <span className="flex items-center justify-center gap-2">
            <Search size={16} /> Search routes
          </span>
        </Button>
      </Card>

      {/* Hot Deals */}
      <div>
        <h2 className="text-lg font-semibold text-[#f8fafc] mb-3">Hot Deals</h2>
        {MOCK_DEALS.length === 0 ? (
          <div className="text-center text-[#94a3b8] py-10">
            <p>No deals right now — check back soon</p>
            <button className="text-[#6366f1] mt-2 text-sm" onClick={() => navigate('/search')}>
              Search routes →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {MOCK_DEALS.map(deal => (
              <Card key={deal.id} onClick={() => navigate('/results', { state: { fromDeal: deal } })}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-[#6366f1]">
                      <TransportIcon type={deal.type} size={20} />
                    </div>
                    <div>
                      <div className="font-semibold text-[#f8fafc] text-sm">{deal.routeName}</div>
                      <div className="text-xs text-[#94a3b8] mt-0.5">
                        {deal.operator} · {formatDuration(deal.durationMinutes)} · {formatTime(deal.departureTime)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#10b981] font-bold">€{deal.priceNow}</div>
                    <div className="text-xs text-[#94a3b8] line-through">€{deal.priceOriginal}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `/`. Expected: search form with trip type toggle, city inputs, date picker, passenger selector. Hot deals list below. Filling origin and destination enables Search button.

- [ ] **Step 3: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: home screen with search form and deals feed"
```

---

## Task 9: Search Screen (Dedicated)

**Files:**
- Modify: `src/screens/SearchScreen.tsx`

- [ ] **Step 1: Implement SearchScreen**

Replace stub `src/screens/SearchScreen.tsx`. This screen is identical in function to the search form on Home but autofocuses the origin field and has no deals feed:

```tsx
import { useRef, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { CITIES } from '../mock/cities'
import { useRecentSearches } from '../hooks/useRecentSearches'
import type { TripType } from '../types'

export function SearchScreen() {
  const navigate = useNavigate()
  const originRef = useRef<HTMLInputElement>(null)
  const { recents } = useRecentSearches()

  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [tripType, setTripType] = useState<TripType>('one-way')
  const [passengers, setPassengers] = useState(1)
  const [date, setDate] = useState('')
  const [originFocus, setOriginFocus] = useState(false)
  const [destFocus, setDestFocus] = useState(false)

  useEffect(() => { originRef.current?.focus() }, [])

  const TRIP_TYPES: TripType[] = ['one-way', 'return', 'flexible']

  function filterCities(query: string) {
    if (query.length < 2) return []
    const q = query.toLowerCase()
    return CITIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.stations.some(s => s.name.toLowerCase().includes(q))
    ).slice(0, 5)
  }

  function handleSearch() {
    if (!origin || !destination) return
    const path = tripType === 'flexible' ? '/results/flexible'
      : tripType === 'return' ? '/results/return'
      : '/results'
    navigate(path, { state: { origin, destination, tripType, passengers, date } })
  }

  const originSuggestions = filterCities(origin)
  const destSuggestions = filterCities(destination)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-[#f8fafc]">Search routes</h1>

      <Card>
        {/* Trip type */}
        <div className="flex gap-1 mb-4 bg-[#0f172a] rounded-xl p-1">
          {TRIP_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setTripType(t)}
              className={`flex-1 py-1.5 text-sm rounded-lg font-medium capitalize transition-colors ${
                tripType === t ? 'bg-[#6366f1] text-white' : 'text-[#94a3b8]'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Origin with autocomplete */}
        <div className="relative mb-2">
          <input
            ref={originRef}
            className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
            placeholder="From — city or station"
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            onFocus={() => setOriginFocus(true)}
            onBlur={() => setTimeout(() => setOriginFocus(false), 150)}
          />
          {originFocus && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden">
              {origin.length < 2 && recents.length > 0 && recents.map(r => (
                <button
                  key={r}
                  className="w-full text-left px-4 py-3 text-sm text-[#94a3b8] hover:bg-[#334155]"
                  onMouseDown={() => setOrigin(r)}
                >
                  Recent: {r}
                </button>
              ))}
              {originSuggestions.map(city => (
                <button
                  key={city.id}
                  className="w-full text-left px-4 py-3 text-sm text-[#f8fafc] hover:bg-[#334155]"
                  onMouseDown={() => setOrigin(city.name)}
                >
                  <div className="font-medium">{city.name}</div>
                  <div className="text-xs text-[#94a3b8]">{city.countryCode} · {city.stations.length} terminals</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination with autocomplete */}
        <div className="relative mb-2">
          <input
            className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
            placeholder="To — city or station"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            onFocus={() => setDestFocus(true)}
            onBlur={() => setTimeout(() => setDestFocus(false), 150)}
          />
          {destFocus && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-[#1e293b] border border-[#334155] rounded-xl overflow-hidden">
              {destSuggestions.map(city => (
                <button
                  key={city.id}
                  className="w-full text-left px-4 py-3 text-sm text-[#f8fafc] hover:bg-[#334155]"
                  onMouseDown={() => setDestination(city.name)}
                >
                  <div className="font-medium">{city.name}</div>
                  <div className="text-xs text-[#94a3b8]">{city.countryCode}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Date + passengers */}
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            className="flex-1 bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6366f1]"
            value={date}
            onChange={e => setDate(e.target.value)}
          />
          <div className="flex items-center gap-2 bg-[#334155] rounded-xl px-4 py-3">
            <button className="text-[#94a3b8] hover:text-white" onClick={() => setPassengers(p => Math.max(1, p - 1))}>−</button>
            <span className="text-[#f8fafc] w-4 text-center font-medium">{passengers}</span>
            <button className="text-[#94a3b8] hover:text-white" onClick={() => setPassengers(p => Math.min(9, p + 1))}>+</button>
          </div>
        </div>

        {tripType === 'return' && (
          <input
            type="date"
            className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-[#6366f1]"
          />
        )}

        <Button fullWidth onClick={handleSearch} disabled={!origin || !destination}>
          <span className="flex items-center justify-center gap-2"><Search size={16} /> Search</span>
        </Button>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Verify autocomplete**

Navigate to `/search`. Expected: origin field auto-focused. Typing 2+ characters shows matching city dropdown. Recent searches shown when field focused and empty.

- [ ] **Step 3: Commit**

```bash
git add src/screens/SearchScreen.tsx
git commit -m "feat: search screen with city autocomplete"
```

---

## Task 10: Results Screens

**Files:**
- Modify: `src/screens/ResultsScreen.tsx`
- Modify: `src/screens/ResultsReturnScreen.tsx`
- Modify: `src/screens/ResultsFlexibleScreen.tsx`

- [ ] **Step 1: ResultsScreen — one-way**

Replace stub `src/screens/ResultsScreen.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import { MOCK_RESULTS } from '../mock/results'
import { assignTags } from '../hooks/useResultTags'
import { FilterChip } from '../components/ui/FilterChip'
import { Badge } from '../components/ui/Badge'
import { TransportIcon } from '../components/ui/TransportIcon'
import { Card } from '../components/ui/Card'
import type { TransportType, Route } from '../types'

type SortKey = 'price' | 'duration' | 'departure'

function formatDuration(m: number) {
  return `${Math.floor(m / 60)}h ${m % 60}m`
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function ResultsScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { origin: string; destination: string; passengers: number; date: string } | null

  const [filter, setFilter] = useState<TransportType | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('price')

  const filtered = MOCK_RESULTS.filter(r => filter === 'all' || r.type === filter)

  const tagged = assignTags(filtered)

  const sorted = [...tagged].sort((a, b) => {
    if (sort === 'price') return a.pricePerPerson - b.pricePerPerson
    if (sort === 'duration') return a.durationMinutes - b.durationMinutes
    return new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime()
  })

  const SORT_OPTIONS: SortKey[] = ['price', 'duration', 'departure']

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#94a3b8] hover:text-white">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="font-bold text-[#f8fafc]">
            {state?.origin ?? 'Origin'} → {state?.destination ?? 'Destination'}
          </div>
          <div className="text-xs text-[#94a3b8]">{state?.date ?? 'Any date'} · {state?.passengers ?? 1} passenger</div>
        </div>
      </div>

      {/* Flexible nudge (mock) */}
      <div className="bg-[#6366f1]/10 border border-[#6366f1]/30 rounded-xl px-4 py-2 text-sm text-[#6366f1]">
        Cheapest nearby date: <strong>23 Mar</strong> at <strong>€27</strong> — tap to switch
      </div>

      {/* Filters + Sort */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['all', 'flight', 'train', 'bus'] as const).map(f => (
          <FilterChip
            key={f}
            label={f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            active={filter === f}
            onClick={() => setFilter(f)}
          />
        ))}
        <div className="ml-auto flex gap-1 shrink-0">
          {SORT_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                sort === s ? 'bg-[#334155] text-white' : 'text-[#94a3b8]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 text-[#94a3b8]">
          <p className="mb-2">No routes found for this date.</p>
          <button className="text-[#6366f1] text-sm" onClick={() => navigate('/results/flexible')}>
            Try flexible dates →
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(route => (
            <Card key={route.id} onClick={() => navigate(`/route/${route.id}`, { state: { route } })}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-[#94a3b8]"><TransportIcon type={route.type} size={18} /></div>
                  <div>
                    <div className="text-sm font-semibold text-[#f8fafc]">{route.operator}</div>
                    <div className="text-xs text-[#94a3b8] mt-0.5">
                      {formatTime(route.departureTime)} · {formatDuration(route.durationMinutes)} ·{' '}
                      {route.stops.length <= 2 ? 'Direct' : `${route.stops.length - 2} stop${route.stops.length - 2 > 1 ? 's' : ''}`}
                    </div>
                    <div className="mt-1"><Badge tag={route.tag ?? null} /></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[#f8fafc] font-bold">€{route.pricePerPerson}</div>
                  <div className="text-xs text-[#94a3b8]">per person</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: ResultsReturnScreen — outbound → inbound selection**

Replace stub `src/screens/ResultsReturnScreen.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MOCK_RESULTS } from '../mock/results'
import { assignTags } from '../hooks/useResultTags'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { TransportIcon } from '../components/ui/TransportIcon'
import type { Route } from '../types'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function formatDuration(m: number) {
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function ResultsReturnScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { origin: string; destination: string } | null

  const [outbound, setOutbound] = useState<Route | null>(null)

  const outboundOptions = assignTags(MOCK_RESULTS)
  const inboundOptions = assignTags([...MOCK_RESULTS].reverse())

  function handleSelectInbound(inbound: Route) {
    navigate(`/route/${outbound!.id}`, { state: { route: outbound, inbound } })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#94a3b8]"><ArrowLeft size={20} /></button>
        <div>
          <div className="font-bold text-[#f8fafc]">
            {outbound ? `Return: ${state?.destination} → ${state?.origin}` : `${state?.origin} → ${state?.destination}`}
          </div>
          <div className="text-xs text-[#94a3b8]">
            {outbound ? 'Select your return journey' : 'Select your outbound journey'}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {(outbound ? inboundOptions : outboundOptions).map(route => (
          <Card
            key={route.id}
            onClick={() => outbound ? handleSelectInbound(route) : setOutbound(route)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-[#94a3b8]"><TransportIcon type={route.type} size={18} /></div>
                <div>
                  <div className="text-sm font-semibold text-[#f8fafc]">{route.operator}</div>
                  <div className="text-xs text-[#94a3b8] mt-0.5">
                    {formatTime(route.departureTime)} · {formatDuration(route.durationMinutes)}
                  </div>
                  <div className="mt-1"><Badge tag={route.tag ?? null} /></div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[#f8fafc] font-bold">€{route.pricePerPerson}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: ResultsFlexibleScreen — date price grid**

Replace stub `src/screens/ResultsFlexibleScreen.tsx`:

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { MOCK_FLEXIBLE_PRICES } from '../mock/results'

export function ResultsFlexibleScreen() {
  const navigate = useNavigate()
  const days = Object.entries(MOCK_FLEXIBLE_PRICES)
  const cheapestPrice = Math.min(...days.map(([, p]) => p))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#94a3b8]"><ArrowLeft size={20} /></button>
        <div>
          <div className="font-bold text-[#f8fafc]">Flexible dates</div>
          <div className="text-xs text-[#94a3b8]">Cheapest price per day</div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {days.map(([date, price]) => {
          const isMin = price === cheapestPrice
          const d = new Date(date)
          const dayLabel = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
          return (
            <button
              key={date}
              onClick={() => navigate('/results', { state: { date } })}
              className={`rounded-xl p-2 text-center transition-colors ${
                isMin ? 'bg-[#10b981] text-white' : 'bg-[#1e293b] text-[#f8fafc] hover:bg-[#253347]'
              }`}
            >
              <div className="text-xs text-current opacity-70">{dayLabel}</div>
              <div className="text-sm font-bold mt-0.5">€{price}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify all three results screens**

Navigate to `/results`, `/results/return`, `/results/flexible`. Verify filters, sorting, tag badges, and navigation work.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ResultsScreen.tsx src/screens/ResultsReturnScreen.tsx src/screens/ResultsFlexibleScreen.tsx
git commit -m "feat: results screens — one-way, return, flexible"
```

---

## Task 11: Route Detail Screen

**Files:**
- Modify: `src/screens/RouteDetailScreen.tsx`

- [ ] **Step 1: Implement RouteDetailScreen**

Replace stub `src/screens/RouteDetailScreen.tsx`:

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { TransportIcon } from '../components/ui/TransportIcon'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { Route } from '../types'
import { MOCK_RESULTS } from '../mock/results'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
function formatDuration(m: number) {
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function RouteDetailScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { route?: Route; inbound?: Route } | null
  const route: Route = state?.route ?? MOCK_RESULTS[0]
  const inbound: Route | undefined = state?.inbound

  const totalPrice = route.pricePerPerson + (inbound?.pricePerPerson ?? 0)
  const legs = inbound ? [{ label: 'Outbound', route }, { label: 'Return', route: inbound }] : [{ label: '', route }]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#94a3b8]"><ArrowLeft size={20} /></button>
        <div className="flex items-center gap-2 text-[#f8fafc] font-bold">
          <TransportIcon type={route.type} size={18} />
          {route.operator}
        </div>
      </div>

      {legs.map(({ label, route: leg }) => (
        <Card key={leg.id + label}>
          {label && <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-3">{label}</div>}

          {/* Stop timeline */}
          <div className="space-y-3">
            {leg.stops.map((stop, i) => {
              const isFirst = i === 0
              const isLast = i === leg.stops.length - 1
              const time = isFirst ? stop.departureTime : stop.arrivalTime
              return (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 ${
                      isFirst || isLast ? 'border-[#6366f1] bg-[#6366f1]' : 'border-[#475569] bg-[#0f172a]'
                    }`} />
                    {!isLast && <div className="w-px flex-1 bg-[#334155] mt-1 mb-1 min-h-[24px]" />}
                  </div>
                  <div className="pb-3">
                    <div className="text-sm font-semibold text-[#f8fafc]">{formatTime(time ?? '')}</div>
                    <div className="text-xs text-[#94a3b8]">{stop.cityName} · {stop.stationName}</div>
                    {stop.layoverMinutes && (
                      <div className="text-xs text-[#f59e0b] mt-1">Layover: {stop.layoverMinutes} min</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Stats */}
          <div className="flex gap-4 mt-3 pt-3 border-t border-[#334155] text-sm">
            <div><span className="text-[#94a3b8]">Duration</span><br /><span className="font-semibold">{formatDuration(leg.durationMinutes)}</span></div>
            <div><span className="text-[#94a3b8]">Stops</span><br /><span className="font-semibold">{leg.stops.length <= 2 ? 'Direct' : leg.stops.length - 2}</span></div>
            <div><span className="text-[#94a3b8]">Class</span><br /><span className="font-semibold">{leg.ticketClass ?? '—'}</span></div>
          </div>
        </Card>
      ))}

      {/* Sticky CTA */}
      <div className="sticky bottom-20 pt-2">
        <Button fullWidth onClick={() => navigate('/checkout/passengers', { state: { route, inbound } })}>
          Book now · €{totalPrice} per person
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify**

Click a result card from Results screen. Expected: stop timeline, stats row, Book now CTA. Return trips show two stacked timelines.

- [ ] **Step 3: Commit**

```bash
git add src/screens/RouteDetailScreen.tsx
git commit -m "feat: route detail screen with stop timeline"
```

---

## Task 12: Checkout Screens

**Files:**
- Modify: `src/screens/CheckoutPassengersScreen.tsx`
- Modify: `src/screens/CheckoutReviewScreen.tsx`
- Modify: `src/screens/CheckoutPaymentScreen.tsx`
- Modify: `src/screens/ConfirmationScreen.tsx`

- [ ] **Step 1: CheckoutPassengersScreen**

Replace stub `src/screens/CheckoutPassengersScreen.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { StepIndicator } from '../components/ui/StepIndicator'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { Route, Passenger } from '../types'

export function CheckoutPassengersScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { route: Route; inbound?: Route; passengers?: number }
  const count = state?.passengers ?? 1

  const [passengerData, setPassengerData] = useState<Passenger[]>(
    Array.from({ length: count }, () => ({ fullName: '', email: '' }))
  )

  function update(i: number, field: keyof Passenger, value: string) {
    setPassengerData(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  const valid = passengerData.every(p => p.fullName.trim() && p.email.trim())

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#94a3b8]"><ArrowLeft size={20} /></button>
        <span className="font-bold text-[#f8fafc]">Checkout</span>
      </div>

      <StepIndicator current={1} labels={['Passengers', 'Review', 'Payment']} />

      {passengerData.map((p, i) => (
        <Card key={i}>
          <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-3">
            Passenger {count > 1 ? i + 1 : ''}
          </div>
          <input
            className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 mb-2 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
            placeholder="Full name"
            value={p.fullName}
            onChange={e => update(i, 'fullName', e.target.value)}
          />
          <input
            type="email"
            className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
            placeholder="Email address"
            value={p.email}
            onChange={e => update(i, 'email', e.target.value)}
          />
        </Card>
      ))}

      {/* Guest nudge */}
      <div className="text-center text-sm text-[#94a3b8]">
        Save your trip —{' '}
        <button className="text-[#6366f1]" onClick={() => navigate('/onboarding')}>create a free account</button>
      </div>

      <Button
        fullWidth
        disabled={!valid}
        onClick={() => navigate('/checkout/review', { state: { ...state, passengers: passengerData } })}
      >
        Continue to review →
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: CheckoutReviewScreen**

Replace stub `src/screens/CheckoutReviewScreen.tsx`:

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { StepIndicator } from '../components/ui/StepIndicator'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { TransportIcon } from '../components/ui/TransportIcon'
import type { Route, Passenger } from '../types'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function CheckoutReviewScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { route: Route; inbound?: Route; passengers: Passenger[] }
  const { route, passengers } = state

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#94a3b8]"><ArrowLeft size={20} /></button>
        <span className="font-bold text-[#f8fafc]">Review your trip</span>
      </div>

      <StepIndicator current={2} labels={['Passengers', 'Review', 'Payment']} />

      {/* Route summary */}
      <Card>
        <div className="flex items-center gap-2 mb-3">
          <TransportIcon type={route.type} size={16} />
          <span className="font-semibold text-[#f8fafc]">{route.operator}</span>
        </div>
        <div className="text-sm text-[#94a3b8]">
          {route.stops[0]?.cityName} → {route.stops[route.stops.length - 1]?.cityName}
        </div>
        <div className="text-sm text-[#f8fafc] mt-1">
          {formatDate(route.departureTime)} · {formatTime(route.departureTime)} → {formatTime(route.arrivalTime)}
        </div>
        <div className="text-xs text-[#94a3b8] mt-1">{route.ticketClass ?? '—'}</div>
      </Card>

      {/* Passengers */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-2">Passengers</div>
        {passengers.map((p, i) => (
          <div key={i} className="text-sm text-[#f8fafc] py-1">{p.fullName} · {p.email}</div>
        ))}
      </Card>

      {/* Fare conditions */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-2">Fare conditions</div>
        <div className="text-sm text-[#94a3b8]">Non-refundable · Changes not permitted</div>
      </Card>

      <Button fullWidth onClick={() => navigate('/checkout/payment', { state })}>
        Looks good — continue to payment →
      </Button>
    </div>
  )
}
```

- [ ] **Step 3: CheckoutPaymentScreen**

Replace stub `src/screens/CheckoutPaymentScreen.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CreditCard } from 'lucide-react'
import { StepIndicator } from '../components/ui/StepIndicator'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { Route, Passenger } from '../types'

const SERVICE_FEE = 1.5

export function CheckoutPaymentScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { route: Route; inbound?: Route; passengers: Passenger[] }
  const { route, inbound, passengers } = state

  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [cvc, setCvc] = useState('')
  const [nameOnCard, setNameOnCard] = useState('')
  const [error, setError] = useState('')

  const ticketSubtotal = (route.pricePerPerson + (inbound?.pricePerPerson ?? 0)) * passengers.length
  const total = ticketSubtotal + SERVICE_FEE

  function handlePay() {
    // Mock: card number starting with 4 succeeds, anything else fails
    if (!cardNumber.startsWith('4')) {
      setError('Your card was declined — try another card')
      return
    }
    setError('')
    navigate('/confirmation', {
      state: {
        bookingRef: 'TS-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
        operatorRef: 'EUR-' + Math.floor(Math.random() * 9000000 + 1000000),
        route,
        passengers,
        total,
      },
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-[#94a3b8]"><ArrowLeft size={20} /></button>
        <span className="font-bold text-[#f8fafc]">Payment</span>
      </div>

      <StepIndicator current={3} labels={['Passengers', 'Review', 'Payment']} />

      {/* Price summary */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-3">Price summary</div>
        <div className="flex justify-between text-sm text-[#f8fafc] mb-1">
          <span>Tickets × {passengers.length}</span>
          <span>€{ticketSubtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm text-[#94a3b8] mb-3">
          <span>Service fee</span>
          <span>€{SERVICE_FEE.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-[#f8fafc] border-t border-[#334155] pt-3">
          <span>Total</span>
          <span>€{total.toFixed(2)}</span>
        </div>
      </Card>

      {/* Card form */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-3 flex items-center gap-2">
          <CreditCard size={14} /> Card details
        </div>
        <input
          className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 mb-2 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
          placeholder="Card number"
          value={cardNumber}
          onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
          inputMode="numeric"
        />
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
            placeholder="MM / YY"
            value={expiry}
            onChange={e => setExpiry(e.target.value)}
          />
          <input
            className="w-24 bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
            placeholder="CVC"
            value={cvc}
            onChange={e => setCvc(e.target.value.slice(0, 4))}
            inputMode="numeric"
          />
        </div>
        <input
          className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 placeholder-[#64748b] outline-none focus:ring-2 focus:ring-[#6366f1]"
          placeholder="Name on card"
          value={nameOnCard}
          onChange={e => setNameOnCard(e.target.value)}
        />
      </Card>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button fullWidth onClick={handlePay} disabled={!cardNumber || !expiry || !cvc || !nameOnCard}>
        Pay €{total.toFixed(2)} — confirm booking
      </Button>

      <p className="text-center text-xs text-[#94a3b8]">
        Cards starting with 4 succeed (mock). All others decline.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: ConfirmationScreen**

Replace stub `src/screens/ConfirmationScreen.tsx`:

```tsx
import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import type { Route, Passenger } from '../types'

export function ConfirmationScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as {
    bookingRef: string
    operatorRef: string
    route: Route
    passengers: Passenger[]
    total: number
  } | null

  if (!state) {
    navigate('/')
    return null
  }

  return (
    <div className="space-y-5 text-center">
      <div className="text-[#10b981] flex justify-center mt-6">
        <CheckCircle size={64} />
      </div>
      <h1 className="text-2xl font-bold text-[#f8fafc]">Booking confirmed!</h1>

      <Card className="text-left">
        <div className="mb-2">
          <div className="text-xs text-[#94a3b8]">Booking reference</div>
          <div className="font-mono font-bold text-[#f8fafc] text-lg">{state.bookingRef}</div>
        </div>
        <div className="mb-2">
          <div className="text-xs text-[#94a3b8]">Operator reference</div>
          <div className="font-mono text-[#f8fafc]">{state.operatorRef}</div>
        </div>
        <div>
          <div className="text-xs text-[#94a3b8]">Route</div>
          <div className="text-[#f8fafc] text-sm">
            {state.route.stops[0]?.cityName} → {state.route.stops[state.route.stops.length - 1]?.cityName}
          </div>
          <div className="text-xs text-[#94a3b8]">{state.route.operator}</div>
        </div>
      </Card>

      <div className="space-y-3">
        <Button fullWidth onClick={() => navigate('/trips')}>View in My Trips</Button>
        <Button fullWidth variant="secondary" onClick={() => navigate('/')}>Back to home</Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Verify full checkout flow**

Navigate home → search → results → route detail → checkout → payment (use a card number starting with 4) → confirmation screen. Verify booking refs appear, "View in My Trips" navigates correctly.

- [ ] **Step 6: Commit**

```bash
git add src/screens/CheckoutPassengersScreen.tsx src/screens/CheckoutReviewScreen.tsx src/screens/CheckoutPaymentScreen.tsx src/screens/ConfirmationScreen.tsx
git commit -m "feat: full checkout flow — passengers, review, payment, confirmation"
```

---

## Task 13: My Trips and Settings Screens

**Files:**
- Modify: `src/screens/MyTripsScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`

- [ ] **Step 1: MyTripsScreen**

Replace stub `src/screens/MyTripsScreen.tsx`:

```tsx
import { useNavigate } from 'react-router-dom'
import { MOCK_TRIPS } from '../mock/trips'
import { Card } from '../components/ui/Card'
import { StatusBadge } from '../components/ui/StatusBadge'
import { TransportIcon } from '../components/ui/TransportIcon'

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function MyTripsScreen() {
  const navigate = useNavigate()
  const upcoming = MOCK_TRIPS.filter(t => t.status === 'confirmed' || t.status === 'pending')
  const past = MOCK_TRIPS.filter(t => t.status === 'completed' || t.status === 'cancelled')

  if (MOCK_TRIPS.length === 0) {
    return (
      <div className="text-center py-20 text-[#94a3b8]">
        <p>No trips yet — search for your first route</p>
        <button className="text-[#6366f1] mt-2 text-sm" onClick={() => navigate('/search')}>
          Search routes →
        </button>
      </div>
    )
  }

  function TripCard({ booking }: { booking: typeof MOCK_TRIPS[0] }) {
    const { route } = booking
    const isPast = booking.status === 'completed' || booking.status === 'cancelled'
    return (
      <Card className={isPast ? 'opacity-60' : ''}>
        <div className="flex items-center gap-3">
          <div className="text-[#6366f1]"><TransportIcon type={route.type} size={20} /></div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-[#f8fafc] text-sm">
                {route.stops[0]?.cityName} → {route.stops[route.stops.length - 1]?.cityName}
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <div className="text-xs text-[#94a3b8] mt-0.5">
              {route.operator} · {formatDate(route.departureTime)} · {formatTime(route.departureTime)}
            </div>
            <div className="text-xs text-[#94a3b8]">Ref: {booking.id}</div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Guest nudge */}
      <div className="bg-[#1e293b] border border-[#334155] rounded-xl px-4 py-3 text-sm text-[#94a3b8] flex items-center justify-between">
        Sign up to sync trips across devices
        <button className="text-[#6366f1] text-sm ml-3 whitespace-nowrap" onClick={() => navigate('/onboarding')}>Sign up</button>
      </div>

      {upcoming.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc] mb-3">Upcoming</h2>
          <div className="space-y-3">{upcoming.map(t => <TripCard key={t.id} booking={t} />)}</div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-[#f8fafc] mb-3">Past trips</h2>
          <div className="space-y-3">{past.map(t => <TripCard key={t.id} booking={t} />)}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: SettingsScreen**

Replace stub `src/screens/SettingsScreen.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

const REGIONS = ['United Kingdom', 'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium', 'Other']

export function SettingsScreen() {
  const navigate = useNavigate()
  const [region, setRegion] = useState('United Kingdom')
  const isGuest = true // will be wired to useAuth in backend phase

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-[#f8fafc]">Settings</h1>

      {/* Region */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-2">Region</div>
        <select
          className="w-full bg-[#334155] text-[#f8fafc] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#6366f1]"
          value={region}
          onChange={e => setRegion(e.target.value)}
        >
          {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Card>

      {/* Language */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-2">Language</div>
        <div className="text-sm text-[#f8fafc]">English</div>
        <div className="text-xs text-[#94a3b8] mt-1">Additional languages coming soon</div>
      </Card>

      {/* Account */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-2">Account</div>
        {isGuest ? (
          <Button fullWidth onClick={() => navigate('/onboarding')}>Sign up / Sign in</Button>
        ) : (
          <div>
            <div className="text-sm text-[#f8fafc]">Alex Orban</div>
            <div className="text-xs text-[#94a3b8]">alex@example.com</div>
            <button className="text-[#6366f1] text-sm mt-3">Sign out</button>
          </div>
        )}
      </Card>

      {/* Notifications */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-2">Notifications</div>
        <div className="text-sm text-[#94a3b8]">Coming soon</div>
      </Card>

      {/* About */}
      <Card>
        <div className="text-xs font-semibold text-[#94a3b8] uppercase mb-2">About</div>
        <div className="text-sm text-[#94a3b8]">TraveScout v0.1.0</div>
        <div className="flex gap-4 mt-2">
          <button className="text-[#6366f1] text-sm">Terms of service</button>
          <button className="text-[#6366f1] text-sm">Privacy policy</button>
        </div>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/MyTripsScreen.tsx src/screens/SettingsScreen.tsx
git commit -m "feat: My Trips and Settings screens"
```

---

## Task 14: Final Polish and Verification

**Files:** No new files. Verification only.

- [ ] **Step 1: Run the test suite**

```bash
npx vitest run
```

Expected: all tests pass (at minimum the useResultTags tests).

- [ ] **Step 2: Build for production**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Walk through all screens manually**

Checklist:
- [ ] `/onboarding` — logo, sign up, sign in, continue as guest
- [ ] `/` — search form, trip type toggle, passenger counter, deals feed
- [ ] `/search` — autofocus, city autocomplete dropdown
- [ ] `/results` — filter chips, sort buttons, result cards with tags, flexible nudge
- [ ] `/results/return` — outbound selection → inbound selection
- [ ] `/results/flexible` — date grid with prices, cheapest day highlighted green
- [ ] `/route/:id` — stop timeline, stats, Book now CTA
- [ ] `/checkout/passengers` → `/checkout/review` → `/checkout/payment` → `/confirmation`
- [ ] `/trips` — upcoming + past sections, status badges
- [ ] `/settings` — region selector, account section, about

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete TraveScout UI — all screens implemented"
```
