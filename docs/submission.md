# Hackathon submission copy

## Project name

Coconut

## Tagline

Island-made. Smarter shipped.

## One-sentence summary

Coconut turns dozens of small island merchants into one coordinated logistics network, lowering shipping costs while recommending products that can travel efficiently together.

## 100-word description

Coconut is a shipping-aware marketplace for remote-island artisans. Customers shop handmade basketry, jewelry, ceramics, textiles, woodwork, and prints from independent makers. Coconut computes cartonization, pools compatible orders into shared departures, dynamically allocates freight, and recommends products based on both relevance and incremental shipping cost. Operators can compare a baseline pickup loop with a capacity- and time-window-constrained Google OR-Tools route, while marine conditions influence departure reliability. Artisans receive production planning, price guidance, and explainable market opportunities. The demo is deterministic and resilient: live providers, cache, stale cache, and seeded fallback data keep the full experience working without credentials.

## 250-word description

Remote-island commerce has a coordination problem. Small artisans can make distinctive products, but fragmented pickups, inefficient packaging, limited departures, fixed freight, and marine uncertainty make global fulfillment expensive. Customers usually see a storefront, not the logistics network required to move small orders across an ocean.

Coconut makes that network visible and useful. A customer can browse independent fictional island workshops, add a Handwoven Coastal Basket, and immediately see the difference between solo and shared shipping. Coconut runs a real packing engine using dimensions, rotations, weight, volume, and fragility. It then calculates pooled logistics pricing and searches for products that fit the existing parcel. Shell Earrings can appear as a +$0 shipping recommendation because the candidate cart is repacked and its marginal shipping effect is measured.

On the operations side, Coconut turns artisan pickup locations into a constrained routing problem. Road matrices, seller time windows, vehicle capacities, service time, and a departure cutoff are passed to a dedicated Python Appwrite Function running Google OR-Tools. Marine conditions and vessel profiles add reliability context to departure choices. On the artisan side, production queues, market signals, and price guidance turn logistics data into practical next steps.

The product is intentionally explainable and demo-safe. External routing, weather, carrier, currency, trade, macro, and port data are labeled and cached. Fictional businesses, products, marketplace events, schedules, and negotiated freight are clearly seeded scenario data. If credentials or connectivity disappear, the same core engines resolve to deterministic demo data. Coconut makes dozens of tiny island exporters behave like one coordinated logistics network.

## Problem

Independent island businesses face small export volumes, costly fixed freight, fragmented pickup operations, packaging constraints, limited departures, and weather uncertainty.

## Solution

Coordinate discovery, packing, pooled freight, recommendations, pickup routing, departures, and artisan intelligence in one explainable workflow.

## What we built

Marketplace, direct product pages, cart quote, dynamic pooled shipping, packing engine, shipping-aware recommendations, operations dashboard, MapLibre route map, Python OR-Tools optimizer, weather/departure signals, artisan dashboard, Appwrite persistence, provider cache, demo reset, and deterministic fallback mode.

## How it works

Shop local → ship together → pack smarter → route smarter → help artisans plan what can move.

## Tech stack

Next.js, React, TypeScript, Tailwind CSS, MapLibre, Recharts, Appwrite Sites, Appwrite TablesDB, Appwrite Node.js/TypeScript Function, Appwrite Python Function, Google OR-Tools, and external provider adapters.

## What makes it different

Packing and logistics are part of the recommendation itself. The product is not only a storefront; it is a coordination layer for independent remote-island exporters.

## Challenges

Making the shipping result understandable while preserving real constraints, keeping the demo responsive when providers fail, and separating server-only credentials from a zero-configuration local experience.

## What we learned

The most persuasive “AI” moment is concrete: a product recommendation becomes more useful when the user can see why it fits physically and financially.

## What’s next

Shared public merchant records, authenticated roles, cooperative schedules, carrier integrations at production depth, larger asynchronous solver jobs, richer event history, learned ranking weights, and demand forecasting. The MVP already provides optional Appwrite Account sign-in, saved carts, and a seller listing workspace.
