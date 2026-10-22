# Vexel Phase 1 implementation notes

## Implemented in this bootstrap
- Manifest V3 Chrome extension with a side panel.
- Element picker with hover and selected outlines.
- Live preview editing for text and curated CSS properties.
- Property editor for typography, color, dimensions, spacing, borders, and layout.
- Undo latest edit, reset preview, and pending-edit counter.
- Test for model property definitions.
- No AI, backend, OAuth, or source-code publishing in Phase 1.

## Safety boundaries
- Text replacement uses `textContent`, never `innerHTML`.
- Browser-internal and other protected pages are not editable.
- These edits affect the live DOM only and disappear on refresh.
- Source editing and GitHub push are deferred until safe source mapping exists.
- Complex nested components are best-effort; replacing a container's text can replace its children, so use text edits on leaf elements/headings where possible.

## Build and install
1. Run `npm install`.
2. Run `npm test` and `npm run build`.
3. Open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `dist`.
4. Open a normal HTTP/HTTPS website and reload it once after installing the extension.
5. Open Vexel from the toolbar, click **Pick element**, select a page element, and edit its properties.

Some sensitive browser pages intentionally block extension scripts.
