# Coconut pitch versions

## 15 seconds

Coconut helps remote-island artisans ship globally as one coordinated network. It pools orders, reduces shared freight costs, recommends products that can travel together, and optimizes pickup and departure routes.

## 30 seconds

Small island makers can sell beautiful products online, but independent shipping makes every order expensive. Coconut connects the storefront to the logistics layer: it packs the cart, shares fixed freight across compatible orders, recommends a +$0 shipping companion when one fits, and gives operators a constrained pickup route. Marine conditions and artisan readiness make the result practical, not just attractive.

## 60 seconds

Meet Coconut: island-made, smarter shipped. A customer adds a $32 Handwoven Coastal Basket and sees shared shipping fall from $28.20 solo to $19.12 pooled. Coconut then recommends Shell Earrings with a $0 shipping delta because it repacks the cart and measures marginal cost. Operators open the same shared batch, compare their baseline pickup loop with a Google OR-Tools route constrained by capacities and time windows, and see marine risk beside the departure choice. Artisans get a production queue, market opportunities, and explainable price guidance. Coconut coordinates the expensive part while each maker stays independent.

## 2 minutes

Remote-island artisans have the product problem and the logistics problem at the same time. They make distinctive goods in small volumes, but packaging, fragmented pickups, fixed freight, limited departures, and weather uncertainty make global orders hard to move efficiently.

Coconut is a shipping-aware marketplace and logistics network. Customers shop across independent island artisans. The cart is not just a checkout: Coconut computationally packs each item using dimensions, rotations, weight, volume, and fragility, assigns a pooled freight share, and compares it with solo shipping. A recommendation is valuable when it is relevant and efficient to ship, so the engine measures a candidate product’s incremental shipping cost. In the demo, Shell Earrings can join the basket at +$0 shipping because the physical packing result supports it.

The operations view turns seller pickups into a real constrained routing problem. A TypeScript Appwrite Function gathers stops and road data, then calls a dedicated Python Appwrite Function running Google OR-Tools. Vehicle capacity, volume, pickup windows, service time, and the batch cutoff are enforced. Marine conditions and vessel profiles help rank departures. The artisan dashboard closes the loop with readiness, market signals, and price guidance.

The whole experience is explainable and resilient. Provider data is labeled live, cached, stale, or demo; fictional scenario data is clearly identified; and missing credentials fall back to deterministic seeded engines. Coconut makes dozens of tiny island exporters behave like one coordinated logistics network.
