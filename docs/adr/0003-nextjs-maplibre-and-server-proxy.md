# ADR 0003: Use Next.js App Router with a client-side MapLibre map and a server-side vessel proxy

- Status: Accepted
- Date: 2026-09-13
- Reconstructed from: `README.md`, `src/components/map/ferry-map.tsx`, `src/app/api/vessels/route.ts`

## Context

The product is a web map with a rich client-side renderer, but it also needs a
small amount of server-side behavior for optional live vessel data so the WSDOT
API key never reaches the browser.

## Decision

Use Next.js App Router as the application shell, render the interactive map in
the browser with MapLibre GL JS, and expose live WSF vessel data through a
server-side route handler that proxies and normalizes the upstream API.

## Consequences

- The map can stay interactive and tile-driven in the browser.
- Optional live vessel support can be added without turning the whole product into a feed-driven system.
- Runtime architecture stays small: one web app, one optional API route, and a static dataset.

## Evidence

- `README.md` names Next.js App Router, TypeScript, and MapLibre GL JS as the core stack.
- `src/components/map/ferry-map.tsx` builds the client-side MapLibre experience.
- `src/app/api/vessels/route.ts` proxies the WSDOT API and keeps the API key server-side.
