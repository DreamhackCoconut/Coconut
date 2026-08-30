# Coconut

**Island-made. Smarter shipped.**

Coconut is a shipping-aware marketplace for remote-island artisans. It pools orders across independent makers, shares fixed freight costs, recommends products that fit the current parcel, optimizes island pickups, and uses marine conditions to help choose reliable departures.

## The problem

Island businesses often export in small volumes. When every artisan handles fragmented pickups, packaging, freight, and weather risk alone, fixed logistics costs can overwhelm inexpensive handmade products. Customers see the storefront, but not the coordination problem underneath it.

## The solution

1. Customers shop across independent island artisans.
2. Coconut computationally packs the cart within carton, weight, volume, and fragility constraints.
3. Compatible orders join a shared departure batch.
4. Fixed freight is distributed across participating shipments.
5. Products with low marginal shipping cost rise in recommendations.
6. Artisan pickups are optimized with capacity and time-window constraints.
7. Marine conditions influence departure reliability and ranking.
8. Artisans receive production planning and market opportunity signals.

## The Coconut moment

Start with **Handwoven Coastal Basket — $32.00** and choose the default US destination. The deterministic demo computes:

|  | Amount |
| --- | ---: |
| Estimated solo shipping | $28.20 |
| Coconut shared shipping | $19.12 |
| Savings | $9.08 |

Coconut then recommends **Shell Earrings — $14.00** with **+$0.00 estimated shipping**. That result is not a display-only rule: Coconut repacks the candidate cart, checks batch compatibility and readiness, measures marginal shipping, and reranks the recommendation.

## How it matches the challenge

| Challenge requirement | Coconut implementation |
| --- | --- |
| Dynamic pricing | Shared logistics price changes as fixed freight is distributed across a batch. |
| Recommendation engine | Relevance, shipping efficiency, batch benefit, margin quality, readiness, and seller fairness. |
| Local businesses | Independent fictional island artisans. |
| Unique crafts | Basketry, jewelry, ceramics, textiles, woodwork, and prints. |
| Global customers | Destination-aware cart quotes and final-mile enrichment. |
| Shipping optimization | Packing, batching, CVRPTW pickup routing, and weather-aware departures. |

## What is actually intelligent?

- **Packing:** deterministic first-fit cartonization with dimensional rotation, weight limits, stackability, and fragile-item separation.
- **Dynamic shipping:** fixed freight allocation plus variable weight/volume costs; a fuller compatible batch lowers each shipment’s share.
- **Recommendations:** approximately 30% relevance, 25% shipping efficiency, 15% batch benefit, 10% seller margin quality, 10% production readiness, and 10% seller fairness.
- **Route optimization:** road distance/time matrices feed Google OR-Tools for a Capacitated Vehicle Routing Problem with Time Windows.
- **Weather-aware departures:** vessel limits, wave/wind/swell risk, cost, speed, and reliability shape the departure score.
- **Market opportunity:** trade signals, shipping competitiveness, marketplace demand, and public economic/digital indicators produce explainable opportunity scores.

## Architecture

All cloud compute is serverless. Appwrite Cloud hosts the site, data, and exactly two functions:

```text
Customer browser
      ↓
Appwrite Site — Next.js / React / TypeScript
      ↓
Appwrite Cloud
  ├─ TablesDB: Coconut source of truth
  ├─ coconut-api: Node.js / TypeScript business API
  └─ coconut-optimizer: Python 3.12 / Google OR-Tools
                           ↓
                     external providers
```

There is no VM, always-on application server, Redis, persistent worker, Storage, Realtime subscription, or extra API route. Optional Appwrite Account is used only for sign-in, saved carts, and seller workspaces; the browser can run the same deterministic demo engines when backend credentials are absent.

## Tech stack

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS, MapLibre GL, Recharts
- Hosting: Appwrite Sites with the Next.js SSR adapter
- Persistence: Appwrite TablesDB
- Backend: Appwrite Node.js / TypeScript Function (`coconut-api`)
- Optimization: Appwrite Python 3.12 Function (`coconut-optimizer`) and Google OR-Tools
- External data adapters: OpenRouteService, Open-Meteo Marine/Forecast, EasyPost, Frankfurter, UN Comtrade, World Bank, NGA World Port Index, and OpenStreetMap

## Data transparency

**Live or cached when credentials/network are available:** road routing, marine and normal weather, final-mile carrier rates, currencies, trade signals, macro indicators, and port information.

**Seeded scenario data:** fictional artisan businesses and products, marketplace interactions, cooperative schedules, negotiated freight costs, and freight capacities. The repository never presents the fictional merchants as real businesses.

Provider reads follow **live → fresh cache → stale cache → deterministic demo fallback**. Missing optional credentials or an outage cannot destroy the judging path.

## What the backend does

When the public Appwrite function settings are present, the browser sends marketplace requests to `coconut-api`. That Node.js function reads and writes the Appwrite TablesDB repository, validates cart and event payloads, computes cartonization, pooled shipping, recommendations, seller intelligence, and demo orders, and caches optional provider results. The `coconut-optimizer` Python function receives only the validated route matrix and constraints when OR-Tools is available. The site falls back to the same deterministic engines locally whenever those settings are absent or a remote request fails, which is why the demo works without a live backend.

The browser-safe Account SDK is separate from that business API: it handles optional sessions and lightweight saved preferences. It never receives the server API key. The backend boundary also reuses warm Appwrite clients/repositories and runs independent order/reset writes concurrently without changing the fallback behavior.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No credentials are required for the demo. Copy `.env.example` only when connecting an Appwrite project. Keep `APPWRITE_API_KEY` and provider keys in Appwrite Function environment variables; only the `NEXT_PUBLIC_*` Appwrite values are safe for the Site environment.

Useful checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run build:functions
```

For a cloud project, use the checked-in `appwrite.config.json`, `appwrite/functions.json`, `appwrite/sites.json`, and `appwrite/tables.json`, then run `npm run appwrite:provision` and `npm run appwrite:seed`. `DEMO_MODE=true` keeps the canonical state reproducible; the API exposes `/demo/reset` for a reset before judging.

## Canonical demo path

1. Shop: add Handwoven Coastal Basket.
2. Cart: show pooled savings and the Shell Earrings +$0 recommendation; add the earrings.
3. Operations: open the Friday West Coast batch, compare baseline vs optimized pickup route, and expand the data-source/status explanations.
4. Artisan: show the production queue, market opportunities, and price guidance.
5. Close: **Coconut makes dozens of tiny island exporters behave like one coordinated logistics network.**

More presentation-ready material lives in [`docs/`](docs/), including the architecture, algorithm notes, demo script, judge Q&A, submission copy, pitch, source notes, and checklist.

## Product routes

- `/` — marketplace collection and shipping-aware discovery
- `/cart` — cartonization, pooled quote, recommendations, and demo checkout
- `/product/handwoven-coastal-basket` — direct-refreshable product page
- `/operations` — batch metrics, MapLibre route map, weather, and optimizer control
- `/seller` — artisan production plan, price guidance, and market opportunities

The interface uses semantic landmarks, a skip link, labeled search and destination controls, visible keyboard focus, alt text, live status messaging, real empty/loading states, restrained transform/opacity motion, pointer-gated hover effects, and a reduced-motion fallback.

## Limitations and next steps

The marketplace and operator scenario are intentionally seeded for a reliable hackathon demo. The MVP also includes optional Appwrite Account sign-in, saved carts, and a seller workspace for adding listings at arbitrary pickup locations. A production version would add authenticated roles, shared public listing records, carrier/cooperative schedules, larger asynchronous solver jobs, richer event history, learned ranking weights, and stronger browser/E2E coverage.

Remote-island commerce should not require every small merchant to solve global logistics independently.

Coconut lets them coordinate the expensive part while remaining independent businesses.

**Island-made. Smarter shipped.**
