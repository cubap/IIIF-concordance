# concordance tool upgrade — change log

This document records every change made to the **concordance** tool during its
2025 upgrade and explains how it maps to the same upgrades applied to the
**aybee** viewer (`CenterForDigitalHumanities/aybee`) and the **read** viewer
(`CenterForDigitalHumanities/read`), which share the same architecture
(manifesto.js / jQuery, `index.html`/`app.js`/`js/`/`css/`).

Each section lists: **What changed**, **Why**, and **How it maps to aybee/read**.

---

## 1. Framework migration: manifesto.js + jQuery → Web Component + plain ES modules

**What changed**

- Removed manifesto.js, jQuery, and the `js/` directory (`main.js`,
  `modules/concordance.js`, `modules/wordList.js`, `modules/iiif.js`,
  `modules/imageViewer.js`, `modules/manifesto.js`, `utils/wordUtils.js`,
  `utils/debounce.js`) and `css/concordance.css`.
- `index.html` now contains a single `<concordance-viewer>` custom element and
  `<script type="module" src="app.js">`.
- `app.js` defines `class ConcordanceViewer extends HTMLElement` (light DOM, no
  Shadow DOM) and registers it with `customElements.define('concordance-viewer',
  ConcordanceViewer)`.
- All event handling is delegated: `click`/`change`/`input` listeners on the host
  element dispatch on `data-action` attributes.
- No build step, no bundler, no dependencies. `package.json` only declares
  `"type": "module"` and a `node --test` script for the pure-function modules.
- `index.html` CDN links were refreshed: Skeleton moved from dead `rawgit.com`
  to `cdnjs.cloudflare.com/ajax/libs/skeleton/2.0.4/skeleton.min.css`; Font Awesome
  moved from `maxcdn` to `cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/...`.

**Why**

manifesto.js is unmaintained and the other tools in the org are plain JS / Web
Components with no build step, so this matches the ecosystem and removes a large
dependency.

**How it maps to aybee/read**

Same migration as aybee §1 and read §1. The concordance keeps its own identity:
a word list with filters, index letters, and line peek modals, instead of a
transcription list or a single-canvas reader.

---

## 2. IIIF Presentation API 2 / 3 / 4 support

**What changed**

- New `iiif.js` module with a hand-rolled normalizer that converts any of
  Presentation API 2.0, 3.0, or 4.0 into one internal model.
- `detectVersion(data)`:
  - `@context` containing `presentation/2`, `presentation/3`, or `presentation/4`
    wins (the `@context` change is the primary signal for v4).
  - Structural fallback: `sequences` or `@id`/`@type` → v2; otherwise v3.
- `normalize()` handles v2 (`sequences[0].canvases`, `canvas.otherContent`,
  `a.on` with `#xywh=`, `oa:Annotation`, `cnt:chars`/`chars`/`@value`/`value`,
  `canvas.images[0].resource['@id']`) and v3/v4 (`items`, `id`/`type`,
  `motivation`, `target`, `body`).
- `getLabel`/`getDescription`/`getMetadata`/`getText`/`getSelector` are the
  version-agnostic accessors used by the UI.
- `getMetadata` wraps label/value objects in `{ label: ... }` before calling
  `getLabel`, so v3 language-map metadata renders correctly.

**Why**

Presentation API 4.0 is released; the tool previously only understood v2 via
manifesto.js.

**How it maps to aybee/read**

`iiif.js` is copied verbatim from read (identical to aybee's). The concordance
replaces every manifesto.js access (`manifesto.create`, `sequence.canvases`,
`canvas.getContent()`, `annotation.getBody()`) with the normalizer output.

---

## 3. Resource types: Manifest, Canvas, AnnotationCollection, AnnotationPage, Collection

**What changed**

- The tool no longer assumes a Manifest. `loadResource` dispatches on the
  normalized `type`:
  - `Collection` → `collectionTemplate` (list of manifests).
  - `Manifest` → viewer with canvases.
  - `Canvas` → viewer with that single canvas.
  - `AnnotationCollection` / `AnnotationPage` → `resolveAnnotationResource`:
    groups annotations by `target`, fetches each target, and attaches the
    annotations to the matching canvas.
- `loadExternalAnnotations` fetches `otherContent`/`seeAlso`-style external
  annotation lists for each canvas of a Manifest.

**Why**

Users may be handed a Canvas or an annotation resource directly (e.g. from
oh-my-rerum or a share link).

**How it maps to aybee/read**

Same as aybee §3 / read §3. The concordance additionally keeps the
`canvasIndex: -1` "all canvases" mode (like aybee) so the word list spans every
canvas, with a canvas selector.

---

## 4. LDN Inbox integration (Rerum Inbox by default)

**What changed**

- New `ldn.js` module:
  - `getInboxes()`/`saveInboxes()` — localStorage-backed list of inbox URLs,
    defaulting to `https://inbox.rerum.io/messages`.
  - `getOptIn()`/`setOptIn()` — persisted opt-in flag (default off).
  - `queryInbox(inbox, target)` — `GET <inbox>?target=<uri>`.
  - `extractMessages()` — defensive parsing of the response (array, `.messages`,
    or `.items`).
- Settings modal (gear icon) lets the user add/remove inboxes and toggle the
  opt-in checkbox. The choice persists in localStorage.
- When opt-in is on, `checkLdn()` queries every configured inbox for annotations
  targeting the current canvas or manifest. Results appear in an LDN panel with
  an **Include** button per result; included annotations are merged into the
  canvas and visually distinguished with the `ldn-annotation` class.
- The inbox list is user-configurable so a fork can point at a different LDN
  without code changes.

**Why**

The user asked for a registry of LDN inboxes with Rerum as the default, opt-in
like the Mirador LDN plugin, surfacing annotations that target the rendered
resource and asking whether to include them.

**How it maps to aybee/read**

`ldn.js` is copied from read; the localStorage keys are namespaced to
`concordance.ldn.inboxes` / `concordance.ldn.optin` so the tools do not share
state.

---

## 5. Shareable query string

**What changed**

- New `query.js` module:
  - `parseQueryString(search)` / `parseQuery()` read `window.location.search`
    directly.
  - `safeDecode()` handles percent-encoded URIs (including double-encoded ones
    from oh-my-rerum).
  - `buildUrl(base, params)` builds shareable URLs; passing `null` removes a
    parameter.
- Supported parameters:
  - `iiif-content` — the resource URI (Manifest, Canvas, AnnotationCollection,
    AnnotationPage, or Collection).
  - `manifest` — legacy convenience alias for a Manifest URI.
  - `canvas` — canvas index or canvas `@id` to select.
  - `region` — `xywh=x,y,w,h` to render a bounded area as an image.
  - `annotation` — annotation `@id` to focus/select.
- Precedence: `iiif-content` > `manifest`.
- `updateUrl()` uses `history.pushState` so the URL always reflects the current
  state (canvas, region, annotation) and is shareable; `popstate` re-initializes.
- The canonical `iiif-content` is the **requested URI**, not the resource's
  declared `@id` — some servers (e.g. T-PEN) declare an `@id` that returns an
  empty body, so shareable URLs must point at the URI that actually loaded.

**Why**

Shareable, meaningful URLs; oh-my-rerum sends a percent-encoded URI in the
pre-hash query string.

**How it maps to aybee/read**

`query.js` is copied verbatim from read. The concordance's old `?url=` handling
is replaced by `iiif-content`/`manifest`.

---

## 6. Shareable single annotation (share modal)

**What changed**

- A share icon in the viewer toolbar opens a modal with up to three options:
  1. **Bounded area as image** — URL with `region` + `annotation` params; the
     viewer renders just the bounded area (`region-view` with a `<canvas>` crop),
     plus a **Download PNG** button and a provenance link back to the full
     resource.
  2. **Full resource with annotation selected** — URL with `annotation` param;
     the annotation is highlighted and scrolled into view.
  3. **Deep link to annotation** — URL with `iiif-content` set to the annotation
     `@id` (renders the annotation resource directly).
- `copyLink` copies the chosen URL; `downloadCrop` downloads the cropped PNG.
- `cropImage` in `utils.js` draws the region to a canvas (CORS `anonymous`), with
  a tainted-canvas fallback that returns the canvas element for display.
- Selecting an annotation (`selectAnnotation`) updates the URL and toggles the
  `active` class **in place** — it does not re-render the concordance or re-crop
  the line images.
- `focusAnnotationElement` centers the selected annotation with a custom
  `requestAnimationFrame` scroll animation (`smoothScrollTo`).

**Why**

Any single annotation should be shareable, with provenance to the whole resource.

**How it maps to aybee/read**

Same as aybee §6 / read §6. The concordance's line peek modal is preserved: the
share modal lives in `#modal-root` so opening it does not destroy the peek
modal, and clicking a line both opens the peek and selects the annotation.

---

## 7. oh-my-rerum compatibility

**What changed**

- Root causes fixed:
  1. Pre-hash query parameters are now read from `window.location.search` (§5).
  2. `fetchJSON` now **rejects** `http://` with a clear error message instead of
     silently breaking.
  3. Canvas resources without `sequences` no longer crash — the normalizer
     handles all resource types (§3).

**Why**

The same incompatibility documented for read (`CenterForDigitalHumanities/read#3`)
and aybee (`CenterForDigitalHumanities/aybee#3`) applies to the concordance.

**How it maps to aybee/read**

Same as aybee §7 / read §7.

---

## 8. HTML sanitizer

**What changed**

- `utils.js` now exports `escapeHtml` and `sanitizeHtml`.
- `sanitizeHtml` uses a whitelist: tags `em`, `strong`, `i`, `b`, `u`, `s`,
  `span`, `br`, `p`, `code`, `sub`, `sup`, `monogram`, `a`, `small`, `mark`;
  attributes `class`, `decoration`, `shape`, `title`, `href`; strips `on*` and
  `style`; unwraps disallowed tags.
- The `em[decoration]` and `monogram[shape]` cases are preserved because
  transcriptions use them.

**Why**

Transcriptions contain markup that must render, but untrusted annotation text
must not inject scripts.

**How it maps to aybee/read**

`utils.js` is copied verbatim from read. The concordance sanitizes each line
once with `sanitizeHtml` before extracting words, so word positions are computed
on the sanitized text.

---

## 9. Tests

**What changed**

- `package.json` adds `"test": "node --test"`.
- `tests/iiif.test.mjs` — 17 tests covering v2/v3/v4 normalization, version
  detection, labels/descriptions/metadata (including v3 language maps),
  annotation collection, selectors, and canvas extraction.
- `tests/query.test.mjs` — query parsing (including percent-encoded and
  double-encoded URIs) and URL building.

**How it maps to aybee/read**

Test files are copied verbatim from read. Run with `node --test` (note:
`node --test tests/` fails on Node 22 — use the bare `node --test`).

---

## Concordance-specific behavior (not in aybee/read)

- **Word list across all canvases**: the concordance flattens every canvas's
  annotations into one word list (`canvasIndex: -1` = all canvases), with a
  canvas selector so the `canvas` parameter is meaningful.
- **Word filters**: minimum word length, minimum occurrence count, and
  alphabetical/occurrence sorting are preserved; the search box supports
  starts-with and contains modes. Filter changes re-apply the search filter so
  the two never conflict.
- **Index letters**: `#indices` links jump to the first word of each letter.
- **Line peek modals**: clicking a line opens a peek modal with the cropped
  image (`line:selected` event on `window.top`); clicking a word opens a peek
  modal listing every line containing that word (`word:selected` event on
  `window.top`).
- **postMessage support for T-PEN**: `MANIFEST_CANVAS_ANNOTATIONPAGE_ANNOTATION`
  messages (and any type containing `ANNOTATIONPAGE`) load the manifest and
  merge the annotation page's annotations, including `partOf` collection
  pagination via `first`/`next`.
- **Landing examples**: T-PEN
  (`https://t-pen.org/TPEN/manifest/4080`) and Bzommar
  (`https://tpen-project-examples.habesoftware.app/Bzommar_pretty_pictures/manifest.json`).

---

## Verification performed

- `node --test` — 17/17 pass.
- `node --check` on `app.js`, `wordUtils.js`, `iiif.js`, `query.js`, `ldn.js`,
  `utils.js`.
- Normalizer smoke-tested against a real T-PEN v2 manifest and a IIIF cookbook
  v3 manifest.
- Headless Chrome (local HTTPS server, self-signed cert):
  - Landing page renders.
  - `?iiif-content=` loads a Manifest, renders canvas selector and the word list.
  - `?iiif-content=http://...` shows the HTTP rejection error.
  - `?region=xywh=...` renders the bounded-area view with provenance link.
