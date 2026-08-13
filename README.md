# Element Field

An original, API-free 3D periodic-table experience. Every element has an isotope-aware interactive atom and a deterministic category/shell-driven concept structure. Oxygen adds four data-backed reference molecules; sulfur adds four explicitly idealized molecular teaching models.

The project includes automated scientific-model tests and a repository deployment workflow. A full reproducibility record is in [SCIENTIFIC_PROVENANCE.md](./SCIENTIFIC_PROVENANCE.md).

## Run locally

```bash
pnpm install
pnpm start
```

Open `http://127.0.0.1:4174/`.

`pnpm start` and `pnpm dev` both run the source application on the canonical
local URL above. The port is strict, so a conflict is reported instead of
silently opening the app somewhere else.

## Verify and build

```bash
pnpm test
pnpm build
pnpm preview
```

The production artifact is written to `dist/`.

## Primary interaction

- Search all 118 elements with ranked autocomplete by symbol, name, category, or atomic number.
- Open the semantic periodic table from the table button and navigate with arrow keys.
- Drag the Three.js subject to orbit and scroll/pinch to zoom.
- Switch between Atom and Structures for every element.
- Choose O-16/O-17/O-18 or S-32/S-33/S-34/S-36 and see exact neutral-atom proton, neutron, and electron counts.
- Every element receives one locally generated artistic concept pattern based only on atomic number, element category, and electron-shell totals.
- Oxygen includes O₂, H₂O, CO₂, and O₃ reference geometries with fixed atom identities and a shared bundled CPK palette.
- Sulfur includes S₈, SO₂, SO₃, and H₂S.
- Reset the camera, pause ambient motion, hide labels, or enter fullscreen.
- Use arrow keys to move through the periodic table and Enter to select.

## Truth and spectacle

- Element properties use a bundled, checksummed PubChem periodic-table snapshot retrieved on 2026-08-02 from `https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON`.
- Period and group positions use the conventional 18-column layout, with lanthanides and actinides in detached rows.
- Electron totals per principal shell are derived from the bundled electron configurations and tested for all 118 elements.
- The selected isotope controls exact proton and neutron instance counts; neutral-atom electron counts equal atomic number. Curated defaults are bundled for all 118 elements, without rounding average atomic weights.
- Oxygen and sulfur natural-isotope ranges use CIAAW evaluations; radioactive display representatives follow the bundled NIST-referenced table and retain ambiguity caveats.
- Each visible nucleus sphere represents one nucleon. Nucleon packing, particle size/color, electron tracks, alternating direction, speed, lighting, and camera scale remain schematic; electrons do not physically orbit on those paths.
- Universal Structure views are explicitly labelled procedural concepts—not molecules, allotropes, crystal lattices, or phase simulations. Tests guarantee one for each of the 118 elements.
- Oxygen coordinates are reconstructed from NIST CCCBDB experimental internal coordinates; radii and bond rendering remain illustrative.
- The sulfur coordinates are hand-authored idealized teaching geometry in angstrom-scale scene units. They are not PubChem conformers or experimental structures.
- All decorative lab, botanical, and crystal illustrations are original local SVG assets in `assets/illustrations/`.
- No API key, backend, generated image service, or generated 3D service is required at development time or runtime.

## Stack

- Semantic HTML and modern CSS
- Vanilla JavaScript modules
- Three.js
- Vite
- Node-based data/model checks

The app dynamically loads its Three.js scene after the accessible interface and element data are ready. If WebGL is unavailable, the scientific text interface remains usable with a static schematic fallback.
