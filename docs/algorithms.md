# Coconut algorithms

## 1. Packing

- **Inputs:** cart lines, product dimensions, weight, fragility, stackability, and carton profiles.
- **Process:** expand quantities, try permitted dimensional rotations, then place items with deterministic first-fit decreasing volume. Reject cartons that exceed inner dimensions, weight, or fragile-item rules.
- **Output:** cartons, item assignments, utilization, total packed weight/volume, and packaging cost.
- **Assumptions:** seeded carton profiles represent the cooperative’s available packaging; fragile products are separated when the rule requires it.
- **Why:** packing is a commerce input because the physical parcel changes shipping and recommendation cost.

## 2. Shared freight allocation

- **Inputs:** packed volume/weight, destination, departure fixed cost, variable rates, and current batch utilization.
- **Process:** allocate a proportional share of fixed freight, then add weight/volume and packaging components. Calculate an independent solo estimate for comparison.
- **Output:** pooled shipping, solo estimate, savings, utilization, and a per-component breakdown.
- **Assumptions:** the demo cooperative shares fixed freight fairly across compatible shipments.
- **Why:** the dynamic price is the logistics price; artisan product prices remain seller-controlled.

## 3. Recommendation score

- **Inputs:** current cart, candidate product, destination, sellers, batch, production readiness, and packing quotes.
- **Process:** combine approximately 30% product relevance, 25% shipping efficiency, 15% batch benefit, 10% seller margin quality, 10% production readiness, and 10% seller fairness. Repack the candidate cart to measure marginal shipping.
- **Output:** ranked recommendations, score, shipping delta, and plain-language reasons.
- **Assumptions:** weights are transparent demo defaults, not a trained model.
- **Why:** a good recommendation should be desirable and efficient to ship, not merely similar.

## 4. Departure ranking

- **Inputs:** departure cutoff, arrival estimate, fixed/variable cost, capacity, utilization, weather risk, and destination fit.
- **Process:** score cost, speed, capacity headroom, and reliability; penalize risk beyond the vessel profile’s preferred limits.
- **Output:** recommended departure, alternatives, risk label, and explanation.
- **Assumptions:** schedules and negotiated freight costs are seeded scenario data.
- **Why:** the best departure balances customer promise with island operating reality.

## 5. Weather risk

- **Inputs:** wave height, wind, swell, vessel limits, and forecast horizon.
- **Process:** normalize each condition against operator-defined limits, combine weighted wave/wind/swell exposure, and map the result to calm, watch, or rough.
- **Output:** risk score, label, and source mode.
- **Assumptions:** weather is a decision signal, not a guarantee of vessel safety.
- **Why:** marine conditions affect reliability and should be visible to operators and customers.

## 6. OR-Tools CVRPTW

- **Inputs:** road distance/time matrix, hub, seller stops, pickup time windows, vehicle weight/volume capacities, service time, and cutoff.
- **Process:** Google OR-Tools RoutingModel minimizes distance while enforcing time, weight, and volume dimensions. The function caps requests at 25 stops and 5 vehicles.
- **Output:** per-vehicle stop order, load, distance, duration, and GeoJSON route.
- **Assumptions:** the matrix is supplied by an adapter; if a live matrix is unavailable, the deterministic route fallback is used.
- **Why:** the pickup problem is a constrained vehicle route, not a simple nearest-neighbor path.

## 7. Production scheduling

- **Inputs:** product production hours, inventory, seller capacity, batch cutoff, and current demand signals.
- **Process:** prioritize ready-to-move products, fit work into the next available seller capacity, and flag deadline or inventory risk.
- **Output:** production jobs with quantity, start, deadline, hours, and risk label.
- **Assumptions:** artisan capacity is seeded and directional.
- **Why:** recommendations should respect whether a maker can prepare the product before the shared departure.

## 8. Market opportunity

- **Inputs:** category, trade demand, purchasing power, digital access, existing marketplace demand, shipping competitiveness, and seller context.
- **Process:** normalize market components, combine them into a bounded score, and retain the highest-contributing reasons.
- **Output:** ranked markets, score, components, and explanations.
- **Assumptions:** public indicators and seeded event history are signals, not forecasts.
- **Why:** artisans need actionable market direction, not a black-box score.
