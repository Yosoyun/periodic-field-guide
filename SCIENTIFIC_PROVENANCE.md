# Scientific provenance

This project separates exact/data-backed quantities from visual teaching cues.

## Element property snapshot

- Source: PubChem PUG REST periodic-table JSON (`https://pubchem.ncbi.nlm.nih.gov/rest/pug/periodictable/JSON`)
- Local file: `data/pubchem-periodic-table.json`
- Retrieved for this project: 2026-08-02
- SHA-256: `ff0f75976583b8a6493b18d0b42e83e1b68bd6e112b45d33578d98494ed5d321`
- Transformation: parsed locally in `src/model.js`; no runtime API call

The PubChem `AtomicMass` scalar is displayed as a “PubChem atomic-mass entry.” It is not relabelled as a CIAAW standard atomic weight and is not necessarily the mass number of the selected display isotope. The bundled `AtomicRadius` field is shown as van der Waals radius, and electronegativity is labelled as Pauling-scale.

Electron shell totals are calculated from the bundled electron configuration. For entries explicitly marked predicted, the neutral electron total remains exactly the atomic number while the configuration and derived occupancy retain a prediction qualifier.

## Isotopes

- Stable natural-isotope abundance intervals: CIAAW, `https://ciaaw.org/isotopic-abundances.htm`
- Radioactive display representatives and caveats: CIAAW/NIST references documented in `src/isotope-data.js`

Every atom view uses exact integer arithmetic for the selected record: proton count is the atomic number, neutron count is mass number minus atomic number, and neutral electron count is the atomic number. Oxygen and sulfur expose curated natural isotope examples. Other elements expose one representative display isotope; that is not a complete isotope inventory.

## Molecules and concept art

Oxygen molecule coordinates and quoted measurements are reconstructed from the direct NIST CCCBDB pages linked in `src/structure-data.js`. Atom identity, topology, and the quoted bond measurements are data-backed; sphere radii, bond thickness, colors, lighting, and scene motion are illustrative.

Sulfur models are hand-authored idealized teaching geometry. Decimal-like angle inputs are rendered with an approximation mark where appropriate. S₈ is an idealized crown. These coordinates are not asserted to be experimental conformers.

Universal concept views are procedural artwork driven by atomic number, element family, and shell totals. They are not molecules, allotropes, crystal lattices, phases, orbitals, or electron-density maps.

## Schematic spatial language

Nucleon counts and electron counts are exact for the chosen neutral atom. Nucleon packing, particle size and color, classical electron tracks, direction, glow trails, speed, distance, and camera scale are schematic and not to scale. Quantum electrons do not orbit nuclei on the displayed paths.
