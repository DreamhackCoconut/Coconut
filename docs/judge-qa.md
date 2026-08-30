# Judge Q&A

### Where is the AI?

Coconut uses algorithmic intelligence rather than a generic chatbot: packing, recommendation ranking, shared-freight pricing, constrained vehicle routing, and weather-aware logistics decisions.

### Where is the dynamic pricing?

Product prices remain seller-controlled. Coconut dynamically recalculates logistics pricing as shared-batch economics change. More compatible freight can reduce each order’s share of fixed costs.

### Why not Etsy or Shopify?

Those systems primarily solve storefront, discovery, and payment. Coconut’s core problem is coordinating logistics across independent island merchants.

### Is the +$0 recommendation hardcoded?

No. Coconut repacks the candidate cart and calculates the marginal shipping effect. The demo dimensions make some products naturally fit without changing the shipping bracket.

### Why OR-Tools?

The pickup problem includes vehicle capacity, package volume, seller windows, readiness, and cutoff constraints, making it a CVRPTW rather than a simple shortest path.

### What data is real?

The interface labels live, cached, stale, and demo data. External routing, weather, carrier, currency, trade, macro, and port data can be live; merchants, products, marketplace history, schedules, and negotiated freight are seeded demo scenario data.

### What happens if APIs fail?

Provider reads degrade from live to fresh cache to stale cache to deterministic demo fallback. The wow interaction stays usable.

### How would this scale?

A production system could add real cooperative schedules, richer merchant history, larger solver budgets, asynchronous optimization, learned ranking weights, and demand forecasting.

### Does Coconut claim machine learning?

No. The current product uses explainable algorithms, optimization, ranking, and public/live data. Learned weights, embeddings, and contextual bandits are future possibilities.
