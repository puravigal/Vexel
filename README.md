# Vexel

**Universal Visual Website Editor** — a Chrome extension for selecting webpage elements and previewing visual edits directly in the browser.

## Phase 1 scope

- Pick an element from the active webpage.
- Live preview edits for text and common CSS properties.
- Pending-change list with undo, redo, and reset.
- No AI, backend, or GitHub publishing in Phase 1.
- Preview edits are temporary and will be lost on page refresh.
- Source editing and GitHub push are intentionally deferred until source mapping can be implemented safely.

## Tech stack

- Chrome Extension Manifest V3
- TypeScript
- React + Vite
- Vitest for unit tests

## Development

```bash
npm install
npm run dev
npm run build
npm test
```

Load the generated `dist` folder via `chrome://extensions` with Developer mode enabled.

## Current status

Phase 1 bootstrap. See `docs/PHASE-1.md` for implementation boundaries and testing notes.
