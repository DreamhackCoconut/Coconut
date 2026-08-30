# Coconut design guardrails

This document is the visual contract for Coconut. It exists to keep parallel contributions coherent when the product is moving quickly.

## Surface and type rules

- Surfaces use solid, opaque tokens only. No gradients, glassmorphism, backdrop blur, or drop shadows.
- Depth comes from tonal surface blocks, spacing, grouping, and contrast rather than effects. Container borders are off by default; outlines are reserved for focus and clear errors.
- Controls may use the shared circular radius tokens. Cards and panels use the same radius scale; do not introduce one-off corner values without a reason.
- Use the system sans-serif stack for readable text. Labels, status text, and metadata inherit the same readable family.
- Write interface copy in normal sentence case. Avoid all-caps labels, lowercase labels used as styling, small caps, and decorative tracking.
- State must remain legible without color alone: pair color with text, icons, a focus outline, or a changed control state.

## Motion rules

Use the animation vocabulary consistently:

- `rise` / `fade` for a short content entrance when it prevents a jarring change.
- `press` for immediate control feedback.
- `state indication` for the live route pulse and moving corridor line.
- `spatial consistency` for the add-to-cart particle traveling to the cart.

Motion implementation rules:

- Choose motion only when it has a purpose. Frequent or keyboard-driven actions should be instant or nearly imperceptible.
- Animate `transform` and `opacity` where possible. Name transition properties; never use `transition: all`.
- Enter and exit with `ease-out` or the shared `--ease-out` curve. Keep ordinary UI motion under 300ms.
- Gate hover motion behind `@media (hover: hover) and (pointer: fine)`.
- Always provide a `prefers-reduced-motion: reduce` path that removes movement while preserving useful state changes.
- Use CSS transitions for rapid, interruptible interactions. Use keyframes only for deliberate, self-contained ambient motion.

## Enforcement

Keep the final visual rules in the `Flat visual contract` section of `app/globals.css`. Run:

```bash
npm run lint:design
```

The check rejects gradients, non-empty shadows, backdrop blur, all-caps/small-caps declarations, unbounded transitions, and scale-from-zero entrances. It also requires hover and reduced-motion accessibility guards.

## Research references

- [Dribbble flat dashboard search](https://dribbble.com/search/flat-design-dashboard) — visual research for composition, spacing, and repeated modules; no Dribbble artwork is shipped in Coconut.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) — normative accessibility reference.
- [W3C contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) — the text and control contrast checks used during browser review.
