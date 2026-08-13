# Element Field — 3D Upgrade Blueprint

Status: planning approved in principle; implementation has not started.

This blueprint follows the Visual Science & Engineering Builder workflow. The new experience will be an original implementation inspired by the interaction grammar of Dilum Sanjaya's June 2026 demo. It will not copy his layout, code, prompts, illustrations, or assets.

## 1. Concept card

**Phenomenon:** each element is defined by proton count, while electron configuration, isotopes, molecules, allotropes, and crystal structures reveal different kinds of chemical behavior.

**User action:** select an element or one of its verified structures, then rotate, inspect, compare, or change the visualization layer.

**Visible consequence:** the current 3D subject leaves the stage, the camera reframes, and a new atom, molecule, or lattice enters while the surrounding facts update as one coordinated state.

**Memorable moment:** sulfur's atom collapses into a glowing nucleus, then resolves into the crown-shaped S8 ring while its isotope, bonding, and discovery story slide into view.

**Primary audience:** curious secondary-school, university, and self-directed learners.

## 2. Scope decision

### Recommended first release

- Procedural, interactive atom views for all 118 elements.
- Eight deep "hero" stories: sulfur, carbon, oxygen, sodium, silicon, phosphorus, iron, and uranium.
- 24 source-validated molecular conformers.
- 12 source-validated allotrope or crystal structures.
- About 18 curated discovery events with explicit event types.
- Up to four GPT Image 2 illustration sheets for edge scenery and empty/loading states.
- One Tripo image-to-3D pilot, then no more than eight decorative lab/mineral props if the pilot passes quality, license, size, and performance checks.

### Explicit non-goal

Do not generate one opaque Tripo model per element. An element is defined by atomic number, not by an AI-invented surface. Many elements have no visually unique ambient object, and 118 unoptimized models would create hundreds of megabytes of decorative—not scientific—content.

At current Tripo P1 pricing, a single standard-texture image-to-3D attempt costs 50 credits. A literal 118-asset batch is therefore at least 5,900 credits before retries; two or three candidates per asset would be 11,800–17,700 credits.

## 3. Truth and spectacle contract

Every rendered subject has one of three visible provenance classes:

| Class | Meaning | Allowed use |
| --- | --- | --- |
| Validated | Coordinates or values came from an authoritative source and passed local validation. | Scientific structure and quantitative claims. |
| Procedural schematic | Geometry is generated from documented rules and intentionally compresses scale. | Atom shells, nuclei, electron probability cues, labels. |
| Generated decorative | GPT Image 2 or Tripo output with no scientific claim. | Peripheral lab props, botanical/lab framing, loading art. |

Rules:

- Never label generated geometry as a validated molecule or crystal.
- State that atomic radii, nucleus size, electron size, orbital distance, time, and camera motion are not to scale.
- Use proton count as the invariant identity of an element.
- Preserve atomic-weight intervals, uncertainty, units, conditions, and source; never silently coerce an interval into one float.
- Treat discovery as a typed event: known, identified, isolated, synthesized, named, or IUPAC-recognized.
- Do not use PubChem's `YearDiscovered` field as historical truth without manual verification.

Primary data sources:

- IUPAC Gold Book and CIAAW for terminology, standard atomic weights, and isotopic composition.
- PubChem PUG REST / PubChem3D for cached, pinned molecular conformers.
- NNDC NuDat for nuclear/isotope facts.
- Crystallography Open Database for CC0 crystal structures.
- Materials Project only when its API key and CC BY attribution requirements are satisfied.

## 4. Primary interaction loop

1. Select an element from the semantic periodic-table rail, search, or keyboard navigation.
2. Keep the current subject visible while the next scene prepares.
3. Exit the old subject left and slightly backward over 220 ms.
4. Swap scene data only after readiness or an 800 ms timeout.
5. Enter the new subject from the right/front over 360 ms with a restrained camera dolly.
6. Stagger supporting facts by 30–50 ms so the scientific subject remains dominant.
7. Rotate/zoom the subject, toggle labels or motion, compare a verified structure, then reset the camera.

Transition state machine:

`idle -> preparing -> exiting -> swap -> entering -> idle`

The latest user request wins. A failed model or conformer falls back to the procedural atom instead of leaving an empty stage. Reduced-motion mode swaps immediately without camera travel.

## 5. Visual specification

### Mood

A refined natural-history field guide meets a contemporary science instrument: warm mineral paper, deep cobalt navigation, restrained category colors, precise typography, and tactile scientific objects. It should feel authored and calm—not like a generic analytics dashboard.

### Composition

- Desktop: 250–280 px collapsible periodic-table rail, 65–75% central 3D stage, 330–360 px contextual inspector.
- Tablet: full central stage with a slide-over element rail and compact inspector.
- Mobile: approximately 52dvh canvas plus a snap-point bottom sheet; no tiny three-column layout.
- Decorative generated scenery lives only at outer edges and never competes with labels or the central object.

### Palette and materials

- Background: warm porcelain / mineral paper.
- Navigation and focus: deep cobalt.
- Element families: a restrained, color-blind-aware categorical palette.
- Atoms: softly rough ceramic or enamel, not mirror chrome.
- Bonds: satin neutral cylinders with clear depth cues.
- Light: large soft key, gentle cool rim, very low ambient occlusion, no excessive bloom.

### Camera and motion

- Three-quarter orthographic-like perspective for atoms and molecules.
- Smooth focus framing based on verified bounds.
- Rotation is user-led; idle motion is subtle and stops after interaction.
- Motion explains state change. No continuous ornamental particle storm.
- Include reset camera, pause motion, reduced motion, and fullscreen controls.

### GPT Image 2 concept prompt

Create a single-screen visual-development frame for an original responsive web app called “Element Field.” Show a dominant central interactive 3D sulfur S8 ring made from softly rough golden ceramic spheres and satin bonds, framed by a compact semantic periodic-table rail on the left and a concise scientific story panel on the right. Use warm mineral-paper surfaces, deep cobalt navigation, restrained botanical and vintage laboratory illustrations only at the far outer edges, precise readable interface typography, shallow physical shadows, and generous negative space. The interface should look buildable in React and Three.js, not like a poster. Preserve an unobstructed 65–75% central 3D stage. Avoid copied branding, dense dashboards, neon cyberpunk, glossy glassmorphism, excessive cards, illegible text, and scientifically misleading orbital imagery. Landscape 16:9, high-fidelity product design style frame.

Image output is a style reference and illustration source only. It is not the UI implementation.

## 6. Technical architecture

Migrate the existing vanilla application to:

- React + TypeScript + Vite.
- Three.js through `@react-three/fiber` and `@react-three/drei`.
- Lightweight local state with a reducer/state machine; no large global-state package initially.
- Native CSS transitions or Web Animations for interface panels.
- Timestamp-driven React Three Fiber transition controller for the 3D stage.
- Vitest for domain/state tests and Playwright for interaction/accessibility smoke tests.

Do not add a router, physics engine, postprocessing stack, GSAP, or animation framework until a measured need appears.

The periodic table remains semantic HTML. The canvas is a visual companion and `aria-hidden`; committed selection is announced through a live region.

### Proposed file tree

```text
src/
  app/
    App.tsx
    appState.ts
    routes.ts
  domain/
    elements/
      element.types.ts
      element.repository.ts
      element.validation.ts
    structures/
      structure.types.ts
      structure.repository.ts
      provenance.ts
  components/
    element-table/
    element-search/
    inspector/
    story-shelf/
    controls/
    accessibility/
  scene/
    ElementStage.tsx
    transitionMachine.ts
    cameraController.ts
    atom/
    molecule/
    crystal/
    decorative/
  styles/
  tests/
data/
  elements/
  conformers/
  crystals/
  stories/
public/
  generated/
    images/
    models/
scripts/
  fetch-pubchem-conformers.mjs
  validate-science-data.mjs
  generate-tripo-assets.mjs
  optimize-gltf.mjs
  validate-assets.mjs
```

### Rendering model

- Atom mode: procedural nucleus and shell/electron cues for all 118 elements, using shared instanced geometry.
- Molecule mode: spheres and cylinders generated from cached PubChem conformer coordinates.
- Crystal mode: instanced unit cells generated from a verified CIF-derived representation.
- Decorative mode: optional optimized GLB props, never placed at the scientific focal point.
- Keep two permanent scene slots so incoming data can prepare while outgoing content remains visible.

## 7. Asset pipelines

### GPT Image 2

1. Generate one 16:9 style frame from the concept prompt.
2. Review composition, scientific legibility, originality, and buildability.
3. Generate at most three more coherent illustration sheets: left-edge lab vignette, right-edge specimen vignette, and loading/empty-state cutouts.
4. Crop intentionally, remove accidental text, export AVIF/WebP, and target 250 KB or less per in-app image.
5. Record model, prompt, date, output hash, edits, and purpose in the asset manifest.

### Tripo

1. Use a paid Platform API account and a server/build-time `TRIPO_API_KEY`; never expose it to the browser.
2. Pilot one decorative prop from an approved GPT Image 2 cutout.
3. Request P1 image-to-3D with fixed seeds, standard texture, and roughly 3k–8k faces.
4. Download immediately because task URLs are temporary.
5. Record task ID, Tripo model version, seed, prompt/input hash, credit cost, date, and license status.
6. Optimize offline with glTF transform, Meshopt/Draco where appropriate, KTX2 textures, sane pivots, and normalized scale.
7. Validate topology, texture references, bounding box, triangle count, draw calls, and fallback poster.
8. Continue to a maximum of eight props only if the pilot is visually useful and stays within budget.

## 8. Performance budget

| Area | Target |
| --- | --- |
| DOM/app shell | under 150 KB gzip JavaScript |
| Lazy R3F/Three chunk | under 350 KB gzip |
| Initial route transfer | under 800 KB |
| First usable scene | under 1.5 MB |
| Typical decorative GLB | 750 KB or less; 1.5 MB hard cap |
| Molecule coordinate JSON | 100 KB or less per subject |
| Mobile scene | 75k triangles, 45 draw calls, DPR 1–1.25 |
| Desktop scene | 200k triangles, 80 draw calls, DPR 1–1.5 |
| Total Tripo props | 10 MB or less |

Use content hashes, lazy loading, an LRU of three decoded models, demand rendering after motion settles, and pause animation when the page is hidden.

## 9. Loading, failure, and accessibility

- Render the scientific label and summary before the 3D chunk finishes loading.
- Use a lightweight procedural atom or poster while a structure loads.
- Show provenance and a clear retry action if source data fails validation.
- Preserve last valid state on failed transitions.
- Support roving keyboard focus across the periodic table, search, Escape to close panels, and visible focus rings.
- Provide non-canvas text equivalents, high-contrast labels, reduced motion, paused motion, and a no-WebGL fallback.
- Announce only committed selections, not every animation frame.

## 10. Milestones

### M0 — Visual and truth contract

- Pin source snapshots and hashes.
- Approve this scope.
- Generate and approve one GPT Image 2 style frame.
- Define the provenance manifest.

### M1 — React parity migration

- Reproduce current 118-element browsing and search in React/TypeScript.
- Keep the existing data working while the rendering layer changes.
- Add tests before removing the old entry point.

### M2 — Sulfur vertical slice

- Build atom mode plus S8, SO2, SO3, and H2S.
- Implement one primary selector, orbit/reset, annotation, and the full enter/exit choreography.
- Validate keyboard access, reduced motion, mobile composition, and fallback behavior.

### M3 — All-element atom mode

- Generate and validate procedural atom views for all 118 elements.
- Add virtualization/lazy rendering to the element rail where needed.

### M4 — Curated structure library

- Add 24 verified molecules and 12 verified allotrope/crystal structures.
- Complete eight hero-element narratives and approximately 18 historical events.

### M5 — Decorative asset pilot

- Add the approved GPT Image 2 edge illustrations.
- Generate, optimize, and validate one Tripo prop.
- Expand to at most eight only after budget review.

### M6 — Hardening and launch

- Run data, unit, interaction, accessibility, performance, and visual-regression tests.
- Verify every license/attribution and generated-asset manifest entry.
- Produce a 20-second demo and deploy.

## 11. Acceptance checklist

- All 118 elements select correctly and retain atomic-number truth.
- Sulfur vertical slice works without broken placeholders.
- Molecules/crystals render only from pinned, validated coordinates.
- Transition cancellation and rapid selection never show stale data.
- Reduced-motion and no-WebGL modes remain complete and readable.
- Mobile first usable scene stays inside the transfer/render budget.
- Every external datum and asset has source, license, hash, and provenance.
- Generated decorative assets are visibly distinguished from validated science.
- The final composition is recognizably original and credits Dilum only as inspiration.

## 12. Current blocker

The environment currently has neither `OPENAI_API_KEY` nor `TRIPO_API_KEY`. Exact GPT Image 2 generation and Tripo Platform API generation cannot begin until those are configured securely outside the repository. Keys must not be pasted into chat or shipped in frontend code.

Once both keys exist, the first implementation run should stop after the GPT Image 2 style frame and one Tripo pilot for visual/cost approval before any batch generation.

## 13. Research and licensing notes

- Dilum Sanjaya's June 2026 Element Explorer demo has no attributable public source repository or asset license as of 2 August 2026.
- His separate 2023 `animated-periodic-table` is MIT licensed, but it is an older D3/SVG experiment and does not contain the 2026 interface or 3D work.
- The new application should be original. Reuse from the 2023 repository is unnecessary unless a specific MIT-licensed mechanism is deliberately selected and attributed.
- A public repository is not automatically reusable without an explicit license.

## 14. Planned disclosure

When the artifact ships, disclose only tools actually used, for example:

> Interactive chemistry experiments — Element Field 3D
> Built an element explorer that moves from atomic identity to verified molecules and crystals.
> Design: GPT Image 2 visual development plus original UI implementation
> Code: GPT-5.6-sol (ultra reasoning) + React Three Fiber / Three.js
> Generated props: Tripo P1, labeled decorative
> Scientific data: CIAAW, PubChem, NNDC, and COD

## 15. Reference links

- Inspiration only: [Dilum Sanjaya's June 2026 post](https://x.com/DilumSanjaya/status/2061490330361589849)
- Distinct older project: [Dilum's MIT-licensed 2023 animated periodic table](https://github.com/dilums/animated-periodic-table)
- Atomic weights: [CIAAW Standard Atomic Weights 2024](https://www.ciaaw.org/atomic-weights.htm)
- Isotopic composition: [CIAAW Isotopic Abundances](https://www.ciaaw.org/isotopic-abundances.htm)
- Molecular data: [PubChem PUG REST](https://pubchem.ncbi.nlm.nih.gov/docs/pug-rest) and [PubChem3D](https://pubchem.ncbi.nlm.nih.gov/docs/pubchem3d)
- Nuclear data: [NNDC NuDat](https://www.nndc.bnl.gov/nudat3/guide/)
- Crystal data: [Crystallography Open Database](https://www.crystallography.net/cod/new.html)
- Tripo pipeline: [Generation](https://platform.tripo3d.ai/docs/generation), [billing](https://platform.tripo3d.ai/docs/billing), and [terms](https://www.tripo3d.ai/terms)
