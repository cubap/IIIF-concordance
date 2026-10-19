# concordance

Rerum IIIF concordance tool. Loads and displays IIIF Presentation API 2.0, 3.0,
and 4.0 resources — Manifests, Canvases, AnnotationCollections, AnnotationPages,
and Collections — as a plain Web Component with no build step, and builds a
searchable word list (concordance) from the transcriptions.

## Usage

Open `index.html` (or the deployed site) and paste a resource URI, or use a
shareable URL:

- `?iiif-content=<uri>` — the resource to load (Manifest, Canvas,
  AnnotationCollection, AnnotationPage, or Collection)
- `?manifest=<uri>` — legacy convenience parameter for a Manifest
- `?canvas=<index|id>` — select a canvas
- `?region=xywh=x,y,w,h` — render a bounded area as an image
- `?annotation=<id>` — focus a specific annotation

The word list can be filtered by minimum word length, minimum occurrence count,
and sorted alphabetically or by frequency. Clicking a line opens a peek modal
with the cropped image; clicking a word lists every line containing it.

## Development

- `npm test` — run the unit tests (`node --test`)
- No build step: edit the ES modules directly

## Upgrading the similar AyBee and read viewers

See [docs/UPGRADE.md](docs/UPGRADE.md) for a per-change checklist of everything
in this upgrade and how the same changes were applied to
[CenterForDigitalHumanities/aybee](https://github.com/CenterForDigitalHumanities/aybee)
and [CenterForDigitalHumanities/read](https://github.com/CenterForDigitalHumanities/read).
