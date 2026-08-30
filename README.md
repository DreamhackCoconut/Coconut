# Coconut

<img src="./public/coconut-logo.jpg" alt="Coconut logo" width="144" />

**Made close. Moved together.**

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

## What is calculated?

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

### Account MVP

Accounts are optional. Guests can browse, build a cart, receive quotes, and complete the demo checkout without signing in. A signed-in buyer can keep a cart and seller location across visits. A signed-in seller can add listings with a name, category, price, inventory, dimensions, and pickup coordinates; the listing is immediately available in that browser and is synced to Appwrite Account preferences when an Appwrite session is available. The interface falls back to browser-local persistence when Account is not configured, so account setup never blocks the judging path.

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

When the public Appwrite function settings are present, the browser sends marketplace requests to `coconut-api`. That Node.js function reads and writes the Appwrite TablesDB repository, validates catalog inventory and event payloads, computes cartonization, pooled shipping, recommendations, maker planning data, and demo orders, and caches optional provider results. Successful persistent demo orders update order items, inventory, and the selected batch snapshot; failed multi-row writes are compensated and surfaced instead of returning a fabricated success. The `coconut-optimizer` Python function receives only the validated route matrix and constraints when OR-Tools is available. The site falls back to the same deterministic engines locally whenever those settings are absent or a remote request fails, which is why the demo works without a live backend.

The browser-safe Account SDK is separate from that business API: it handles optional sessions and lightweight saved preferences. It never receives the server API key. Remote calls have bounded timeouts and validate the Appwrite function response envelope before the local fallback is used. The backend boundary reuses warm Appwrite clients/repositories while keeping business algorithms independent of SDK calls.

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
npm run lint:design
npm test
npm run build
npm run build:functions
```

For a cloud project, use the checked-in `appwrite.config.json`, `appwrite/functions.json`, `appwrite/sites.json`, and `appwrite/tables.json`, then run `npm run appwrite:provision` and `npm run appwrite:seed`. Provisioning creates the canonical `coconut` database when needed, adds missing tables, columns, and indexes, and preserves existing rows; `APPWRITE_DATABASE_ID` is optional and only needed if a project deliberately uses another database ID. It does not silently change incompatible live columns. `DEMO_MODE=true` keeps the canonical state reproducible; the API exposes `/demo/reset` for a reset before judging. For a deployed operator-only reset, set the server-side `DEMO_RESET_TOKEN`; the browser reset still restores the local judging state immediately.

### Automatic Appwrite deployment

The `Coconut checks` workflow validates every pull request and push to `main`. A push to `main` first compares the changed paths, then deploys only the affected Appwrite resource groups: `appwrite/tables.json` or schema-provisioning changes deploy TablesDB, function or shared backend changes deploy the Functions, and app or frontend changes deploy the Site. Changes to `appwrite.config.json` deploy all three. Documentation-only changes do not start an Appwrite deployment; workflow-only changes can be deployed intentionally with the `workflow_dispatch` `deploy_all` input when recovering from a partial deployment. The workflow installs a pinned Appwrite CLI version, pushes the checked-in TablesDB manifest, then runs the idempotent schema reconciler so existing tables receive missing columns and indexes. It uses the project’s configured `s-2vcpu-2gb` build tier and `s-0.5vcpu-512mb` runtime tier, treats CLI-reported push errors as failures, and never deploys from pull requests. A pull-request check showing `Deploy to Appwrite: skipped` is expected; deployment runs after the change reaches `main`.

In the repository's **Settings → Secrets and variables → Actions**, add these secrets:

- `APPWRITE_ENDPOINT` — the regional project endpoint, such as `https://<REGION>.cloud.appwrite.io/v1`
- `APPWRITE_PROJECT_ID` — the Appwrite project ID
- `APPWRITE_API_KEY` — a server-side deployment key with the TablesDB, columns, indexes, Functions, and Sites read/write scopes needed to push and reconcile resources; the canonical database ID is read from the checked-in manifest

Keep runtime variables such as `EASYPOST_API_KEY`, `OPENROUTESERVICE_API_KEY`, `COMTRADE_API_KEY`, and `DEMO_RESET_TOKEN` in Appwrite Function/Site environment settings or local untracked environment files. They are not committed or printed by the workflow. Run `npm run appwrite:seed` intentionally once after a new project is provisioned; schema deployment is automatic, while seed data is kept explicit so normal deploys do not overwrite live account data.

## Canonical demo path

1. Shop: add Handwoven Coastal Basket.
2. Cart: show pooled savings and the Shell Earrings +$0 recommendation; add the earrings.
3. Operations: open the Friday West Coast batch, compare baseline vs optimized pickup route, and expand the data-source/status explanations.
4. Artisan: show the production queue, market opportunities, and price guidance.
5. Close: **Coconut makes dozens of tiny island exporters behave like one coordinated logistics network.**

More presentation-ready material lives in [`docs/`](docs/), including the architecture, algorithm notes, design guardrails, demo script, judge Q&A, submission copy, pitch, source notes, and checklist.

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

**Made close. Moved together.**
