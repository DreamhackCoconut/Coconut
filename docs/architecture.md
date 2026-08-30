# Coconut architecture

## Runtime shape

```text
Browser
  ↓
Appwrite Site (Next.js App Router, SSR + client interactions)
  ↓
coconut-api (Appwrite Node.js / TypeScript Function)
  ├─ Appwrite TablesDB
  ├─ packing, batching, quote, recommendation, seller logic
  ├─ provider adapters and persistent cache
  └─ invokes coconut-optimizer when route optimization is requested
                                      ↓
                         coconut-optimizer (Python 3.12)
                                      ↓
                              Google OR-Tools
```

The cloud stack contains one Appwrite Site, one TablesDB database, and exactly two Appwrite Functions. The guest demo does not require authentication; the optional Appwrite Account flow is used only for signed-in saved carts and seller workspaces. No application server, VM, Redis, worker daemon, Storage, Realtime subscription, or duplicate Next.js API route is required.

## Responsibilities

- **Next.js Site:** accessible marketplace, cart, operations, and artisan screens. It owns presentation state, optional client Account sessions, and can use deterministic local data when no credentials exist.
- **`coconut-api`:** the server-only business boundary. It reads/writes TablesDB, runs quote/packing/batching/recommendation logic, records events, handles demo reset, and coordinates providers.
- **TablesDB:** persistent source of truth for sellers, products, orders, order items, departures, batches, batch orders, ports, vessel profiles, carton profiles, marketplace events, market signals, external cache, and shipping-rate cache.
- **`coconut-optimizer`:** only the constrained pickup solver. It accepts a validated matrix, stops, vehicles, capacities, time windows, and cutoff, then returns routes and GeoJSON.
- **Provider adapters:** isolate OpenRouteService, Open-Meteo, EasyPost, Frankfurter, UN Comtrade, World Bank, NGA World Port Index, and OpenStreetMap integrations from business logic.

## Request flows

### Cart quote and recommendation

```text
Cart interaction
  → coconut-api /cart/quote
  → load products and active batch
  → cartonize dimensions, weight, volume, and fragility
  → calculate shared freight and solo comparison
  → rank compatible products by relevance + logistics benefit
  → return quote, packing plan, savings, and explanations
```

### Pickup route

```text
Operations action
  → coconut-api /operations/batches/:id/optimize-route
  → load seller stops, vehicles, and hub from TablesDB/demo data
  → request road matrix/geometry from OpenRouteService when available
  → call coconut-optimizer
  → validate capacity-safe CVRPTW response
  → return baseline, optimized route, GeoJSON, and data-source status
```

### Resilience

Provider results use this order:

```text
live → fresh cache → stale cache → deterministic demo fallback
```

The cache is persisted in TablesDB when Appwrite is connected. In local zero-credential mode, the same repository interfaces resolve to seeded, deterministic demo data, so the core judging flow remains usable offline.

## Security boundary

The browser receives only public Appwrite endpoint/project values and optional public function configuration. Optional Account sessions use Appwrite's browser-safe Account SDK; the Appwrite API key, optimizer invocation, provider keys, database writes, and cache writes stay inside Appwrite Functions. No secret is imported by client components.
