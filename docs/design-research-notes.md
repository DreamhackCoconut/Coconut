# Coconut design research and improvement record

The interface is being shaped as an island logistics product rather than a generic analytics dashboard. The useful island cues are practical ones—makers, ports, shared departures, sea distance, and the Avatiu hub—so the visual system supports the story without turning the page into a themed illustration.

The corrected color system uses warm paper and charcoal neutrals with one restrained ocean accent for action, route emphasis, and selected state. There is no green treatment and no competing coral/orange accent. Solid tonal layers leave enough restraint for product photography and route data to lead.

The header returns to the earlier three-island treatment: brand, primary navigation, and utilities are separate floating rounded surfaces. It stays close to the viewport edge, keeps its hit areas large enough for touch, and remains visually quiet while the page scrolls underneath it. The layout collapses into a wrapped floating bar on narrow screens.

Typography uses the platform sans-serif stack with comfortable body leading, normal sentence case, and size-specific heading spacing. This is more readable than decorative mono labels or tightly tracked all-caps microcopy, and it lets the same UI adapt to zoom, larger text settings, and different operating systems.

Cards do not use outlines as their default structure, glass, or translucent network effects. Solid tonal blocks, a small shadow hierarchy, circular radii, proximity, and whitespace now establish grouping. Product cards use a quiet lift, primary map and shipping surfaces use a raised shadow, and dialogs use the floating shadow. A focused control still receives a strong outline because accessibility feedback is functional state, not decoration.

The map has a dependable visual fallback. A solid blue sea-colored map field contains a high-contrast schematic route, numbered artisan stops, a labeled Avatiu hub, and an explicit optimized-versus-baseline comparison. Map tiles can add geographic context when available, but their network state can never erase the route story.

The composition follows the strongest pattern found while reviewing popular flat web work on Dribbble and calm product interfaces: one dominant message, one obvious action, a compact set of supporting facts, and repeated modules with consistent sizing. Operations gives the map the largest visual area with a stable comparison column beside it; shop lets imagery carry the richness; cart makes pooled freight the hero. The implementation borrows those principles rather than copying any screenshot or downloading unlicensed artwork into the repository.

Motion is limited to useful feedback: a press response, a short rise or fade for new content, and a route status indication. Transitions name the properties they animate, use a responsive ease-out curve, and are gated for pointer hover. Reduced-motion users receive the same state information without travel or looping movement.

The accessibility contract is built into the visual tokens. Primary and supporting text use darker light-theme values, inverse panels use explicit light text, buttons use high-contrast fills, controls retain visible focus outlines, and state is paired with labels or icons rather than color alone. These are implementation guardrails for WCAG 2.2 AA work, not a substitute for a final assistive-technology audit.

The final improvement is operational: the design rules are executable. `npm run lint:design` rejects gradients, arbitrary shadow values, blur, all-caps styling, unbounded transitions, and scale-from-zero entrances; browser review checks the shop, cart, operations map, seller workspace, account flow, mobile layout, and console behavior before the branch is sent to PR #8.
