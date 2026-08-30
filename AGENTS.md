# Coconut contributor guidance

## Product and architecture

- The product is called **Coconut**. Do not reintroduce the retired product name in UI copy, docs, comments, routes, or commit messages.
- Keep the working demo usable with no credentials. The deterministic seeded repository is the fallback and must remain authoritative for local judging.
- Appwrite Cloud is the only hosted platform in scope: Appwrite Sites for the Next.js app, Appwrite TablesDB for persistent data, and exactly two Functions (`coconut-api` and `coconut-optimizer`). Do not add Vercel, Neon, Supabase, a persistent server, a worker, Redis, Storage, Realtime, or Auth unless the feature explicitly requires it.
- Application compute stays stateless. Keep business logic in `lib/engines`, providers, and repository/data-access boundaries rather than coupling algorithms to SDK calls.
- Optional account features should degrade gracefully to browser-local demo persistence when Appwrite credentials or the Account service are unavailable. Guests must be able to browse, build a cart, and use the core demo flow without an account.

## Design and interaction standards

For UI work, use the local design guidance when relevant:

- `emil-design-eng`: prefer calm, intentional interfaces; clear hierarchy; strong typography; restrained color; and interaction details that communicate state instead of decorative noise.
- `animate`: choose a small number of purposeful animations, use transform/opacity where possible, and make motion support the product story.
- `animation-vocabulary`: use precise motion language when naming or reviewing transitions (for example, rise, fade, press, drawer, or shared-element movement).
- `review-animations` and `improve-animations`: inspect existing motion before adding more, remove jank or redundant effects, and preserve a useful reduced-motion path.
- Product Design guidance: prototype against the actual browser, keep layout responsive, and validate the primary user journey rather than polishing isolated screens.

Accessibility is part of the design, not a follow-up task:

- Use semantic headings, landmarks, labels, button names, focus-visible states, live status messages, and keyboard-operable controls.
- Do not communicate state with color alone. Maintain readable contrast for text, controls, status badges, and active states.
- Make interactive elements visibly distinct in default, hover, focus, active, loading, success, and error states.
- Keep guest actions available and explain when an account is optional versus required.
- Respect `prefers-reduced-motion` and avoid layout-shifting animations.

Flat visual contract:

- Use solid, opaque color tokens for surfaces. Do not add gradients, glass effects, backdrop blur, or drop shadows.
- Use tonal surface blocks, spacing, grouping, and type hierarchy to create depth. Container borders are off by default; reserve outlines for keyboard focus and clear error states. Keep rounded corners intentional and consistent with the shared radius tokens.
- Use normal sentence-case text. Do not add `text-transform: uppercase`, lowercase, small caps, tracked-out microcopy, or decorative monospace labels.
- Motion must be purposeful: use short `transform`/`opacity` transitions with named properties, pointer-gated hover states, and a reduced-motion fallback.
- Run `npm run lint:design` whenever changing CSS or UI copy. It is a required CI guardrail for this contract.

## Data and account behavior

- Keep SDK access behind `lib/account.ts`, `lib/client-gateway.ts`, or the repository layer. UI components should receive typed data and callbacks.
- Never expose server credentials in client code. Browser auth may use only public Appwrite endpoint/project values; privileged keys remain server-only.
- When adding a persistent field or table, update the reviewable Appwrite manifest and the repeatable provisioning/seed path.
- Reset behavior must restore the canonical demo state immediately in the UI. Remote cleanup may run in the background and must not block the judging flow.

## Verification and commits

Before committing a meaningful change, run the checks that match the risk:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run build:functions
```

Use the in-app browser for visual changes: check the shop, cart, operations, account, and seller flows at a representative desktop and narrow viewport. Look for broken images, clipping, stuck loading states, color collisions, keyboard/focus regressions, and console warnings.

Commit messages should be concise but descriptive. Mention the user-visible capability and the important boundary it touches, for example:

```text
Add optional accounts and seller listing workspace
```

Do not commit generated secrets, local environment files, or unrelated worktree changes.
