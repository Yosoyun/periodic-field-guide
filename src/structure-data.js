/**
 * Small, dependency-free structure library for the first 3D science stories.
 *
 * Coordinates are hand-authored, idealized teaching geometry in angstrom-scale
 * scene units. They are not experimental conformers and must stay visibly
 * labelled as schematic in the UI.
 */

const SCHEMATIC_PROVENANCE = Object.freeze({
  truthClass: "procedural-schematic",
  coordinateStatus: "idealized-not-experimental",
  coordinateUnit: "angstrom-scale scene unit",
  source: "Hand-authored for this application from standard molecular symmetry and approximate textbook bond geometry; not copied from PubChem or a crystallographic dataset.",
  displayLabel: "Idealized teaching model",
});

const NIST_REFERENCE_PROVENANCE = Object.freeze({
  truthClass: "reference-geometry",
  coordinateStatus: "constructed-from-experimental-internal-coordinates",
  coordinateUnit: "angstrom",
  source: "NIST Computational Chemistry Comparison and Benchmark Database (CCCBDB); molecular identity cross-checked against PubChem.",
  sourceUrls: Object.freeze([
    "https://cccbdb.nist.gov/geometriesx.asp",
    "https://pubchem.ncbi.nlm.nih.gov/",
  ]),
  displayLabel: "Reference geometry",
});

function atom(id, symbol, x, y, z = 0) {
  return Object.freeze({ id, symbol, position: Object.freeze([x, y, z]) });
}

function bond(from, to, representation = "single") {
  return Object.freeze({ from, to, representation });
}

function structure(definition) {
  return Object.freeze({
    ...definition,
    atoms: Object.freeze(definition.atoms),
    bonds: Object.freeze(definition.bonds),
    facts: Object.freeze(definition.facts.map((fact) => Object.freeze(fact))),
    provenance: definition.provenance ?? SCHEMATIC_PROVENANCE,
    status: definition.status ?? "schematic",
  });
}

/**
 * Oxygen-focused reference set.
 *
 * Coordinates are reconstructed from NIST CCCBDB internal coordinates. The
 * ball sizes and bond thicknesses remain illustrative, but atom identity,
 * topology, quoted bond lengths, and quoted bond angles are data-backed.
 */
export const OXYGEN_STRUCTURES = Object.freeze([
  structure({
    id: "dioxygen",
    element: "O",
    name: "Dioxygen",
    formula: "O₂",
    status: "reference-geometry",
    provenance: NIST_REFERENCE_PROVENANCE,
    geometry: {
      label: "Diatomic · 1.208 Å",
      description: "Two oxygen atoms form a linear diatomic molecule. The O–O separation uses the 1.208 Å experimental reference value listed by NIST CCCBDB.",
      bondLengthAngstrom: 1.208,
      sourceUrl: "https://cccbdb.nist.gov/listbondexp3x.asp?bi=0&descript=rOO&mi=24",
    },
    atoms: [
      atom("O1", "O", -0.604, 0, 0),
      atom("O2", "O", 0.604, 0, 0),
    ],
    bonds: [bond("O1", "O2", "double")],
    facts: [
      { label: "Composition", value: "2 oxygen atoms · formula O₂" },
      { label: "Shape", value: "Any two-atom molecule is linear." },
      { label: "Bond picture", value: "The familiar Lewis representation is O=O; the 3D model is not an electron-density map." },
    ],
  }),
  structure({
    id: "water",
    element: "O",
    name: "Water",
    formula: "H₂O",
    status: "reference-geometry",
    provenance: NIST_REFERENCE_PROVENANCE,
    geometry: {
      label: "Bent · 104.48°",
      description: "Two O–H bonds meet at an equilibrium H–O–H angle of 104.48°. This bent geometry makes the bond dipoles add rather than cancel.",
      angleDegrees: 104.48,
      bondLengthAngstrom: 0.958,
      sourceUrl: "https://cccbdb.nist.gov/expangle1ax.asp?descript=aHOH",
    },
    atoms: [
      atom("O1", "O", 0, 0, 0),
      atom("H1", "H", -0.757, 0.587, 0),
      atom("H2", "H", 0.757, 0.587, 0),
    ],
    bonds: [bond("O1", "H1"), bond("O1", "H2")],
    facts: [
      { label: "Composition", value: "2 hydrogen atoms + 1 oxygen atom" },
      { label: "Shape", value: "Bent, not linear · 104.48° equilibrium angle" },
      { label: "Why it matters", value: "The bent arrangement gives an isolated water molecule a net dipole." },
    ],
  }),
  structure({
    id: "carbon-dioxide",
    element: "O",
    name: "Carbon dioxide",
    formula: "CO₂",
    status: "reference-geometry",
    provenance: NIST_REFERENCE_PROVENANCE,
    geometry: {
      label: "Linear · 180°",
      description: "Carbon lies between two oxygen atoms in a straight line. Equal and opposite C–O bond directions make the molecular geometry linear and symmetric.",
      angleDegrees: 180,
      bondLengthAngstrom: 1.162,
      sourceUrl: "https://cccbdb.nist.gov/expbondlengths2x.asp?all=0&descript=rC%3DO",
    },
    atoms: [
      atom("C1", "C", 0, 0, 0),
      atom("O1", "O", -1.162, 0, 0),
      atom("O2", "O", 1.162, 0, 0),
    ],
    bonds: [bond("C1", "O1", "double"), bond("C1", "O2", "double")],
    facts: [
      { label: "Composition", value: "1 carbon atom + 2 oxygen atoms" },
      { label: "Shape", value: "Linear · 180° O–C–O" },
      { label: "Polarity", value: "The two C–O bond dipoles cancel in the symmetric molecule." },
    ],
  }),
  structure({
    id: "ozone",
    element: "O",
    name: "Ozone",
    formula: "O₃",
    status: "reference-geometry",
    provenance: NIST_REFERENCE_PROVENANCE,
    geometry: {
      label: "Bent · 116.8°",
      description: "Three oxygen atoms form a planar bent molecule. NIST CCCBDB lists 1.278 Å O–O distances and a 116.8° O–O–O angle for the reference geometry.",
      angleDegrees: 116.8,
      bondLengthAngstrom: 1.278,
      sourceUrl: "https://cccbdb.nist.gov/expgeom2x.asp?casno=10028156&charge=0",
    },
    atoms: [
      atom("O1", "O", 0, 0, 0),
      atom("O2", "O", -1.0885, 0.6697, 0),
      atom("O3", "O", 1.0885, 0.6697, 0),
    ],
    bonds: [bond("O1", "O2", "resonance-equivalent"), bond("O1", "O3", "resonance-equivalent")],
    facts: [
      { label: "Composition", value: "3 oxygen atoms · formula O₃" },
      { label: "Shape", value: "Bent and planar · 116.8°" },
      { label: "Bond picture", value: "The two O–O links are resonance-equivalent; the model avoids fixing one permanent single/double assignment." },
    ],
  }),
]);

/**
 * Sulfur-focused vertical slice.
 *
 * S8 is drawn as an idealized puckered crown. SO2 and H2S use representative
 * bent angles; SO3 is idealized as trigonal planar. Resonance-equivalent bonds
 * are intentionally described instead of presenting one localized Lewis form
 * as a literal measurement.
 */
export const SULFUR_STRUCTURES = Object.freeze([
  structure({
    id: "s8-crown",
    element: "S",
    name: "Cyclo-octasulfur",
    formula: "S₈",
    geometry: {
      label: "Puckered eight-membered crown",
      description: "Eight sulfur atoms form a non-planar ring. Alternating height gives the familiar crown-like teaching model.",
      pointGroupHint: "Idealized D₄d symmetry",
    },
    atoms: [
      atom("S1", "S", 2.1, 0, 0.65),
      atom("S2", "S", 1.485, 1.485, -0.65),
      atom("S3", "S", 0, 2.1, 0.65),
      atom("S4", "S", -1.485, 1.485, -0.65),
      atom("S5", "S", -2.1, 0, 0.65),
      atom("S6", "S", -1.485, -1.485, -0.65),
      atom("S7", "S", 0, -2.1, 0.65),
      atom("S8", "S", 1.485, -1.485, -0.65),
    ],
    bonds: [
      bond("S1", "S2"),
      bond("S2", "S3"),
      bond("S3", "S4"),
      bond("S4", "S5"),
      bond("S5", "S6"),
      bond("S6", "S7"),
      bond("S7", "S8"),
      bond("S8", "S1"),
    ],
    facts: [
      { label: "Model", value: "8 sulfur atoms, 8 S–S links" },
      { label: "Why puckered?", value: "The non-planar ring avoids forcing all atoms into an unfavorable flat arrangement." },
      { label: "Context", value: "S₈ is the molecular unit commonly used to introduce elemental sulfur." },
    ],
  }),
  structure({
    id: "sulfur-dioxide",
    element: "S",
    name: "Sulfur dioxide",
    formula: "SO₂",
    geometry: {
      label: "Bent · ≈120°",
      description: "Two oxygen atoms surround sulfur in a planar, bent arrangement; this idealized model uses an angle near 120°.",
      angleDegrees: 119.5,
      approximate: true,
    },
    atoms: [
      atom("S1", "S", 0, 0, 0),
      atom("O1", "O", -1.234, 0.721, 0),
      atom("O2", "O", 1.234, 0.721, 0),
    ],
    bonds: [
      bond("S1", "O1", "resonance-equivalent"),
      bond("S1", "O2", "resonance-equivalent"),
    ],
    facts: [
      { label: "Shape", value: "Bent, not linear" },
      { label: "Bond picture", value: "The two S–O links are represented as resonance-equivalent." },
      { label: "Polarity", value: "Its bent geometry gives the molecule a net dipole." },
    ],
  }),
  structure({
    id: "sulfur-trioxide",
    element: "S",
    name: "Sulfur trioxide",
    formula: "SO₃",
    geometry: {
      label: "Trigonal planar · 120° idealized",
      description: "Three oxygen atoms are spaced evenly around sulfur in one plane, with idealized 120° O–S–O angles.",
      angleDegrees: 120,
      approximate: true,
    },
    atoms: [
      atom("S1", "S", 0, 0, 0),
      atom("O1", "O", 1.42, 0, 0),
      atom("O2", "O", -0.71, 1.23, 0),
      atom("O3", "O", -0.71, -1.23, 0),
    ],
    bonds: [
      bond("S1", "O1", "resonance-equivalent"),
      bond("S1", "O2", "resonance-equivalent"),
      bond("S1", "O3", "resonance-equivalent"),
    ],
    facts: [
      { label: "Shape", value: "Trigonal planar" },
      { label: "Symmetry", value: "Three equivalent directions around the central sulfur in this idealized model." },
      { label: "Bond picture", value: "Resonance is shown without assigning a permanent localized double bond." },
    ],
  }),
  structure({
    id: "hydrogen-sulfide",
    element: "S",
    name: "Hydrogen sulfide",
    formula: "H₂S",
    geometry: {
      label: "Bent · ≈92°",
      description: "Two hydrogen atoms form a compact bent molecule around sulfur; this idealized model uses an angle near 92°.",
      angleDegrees: 92.1,
      approximate: true,
    },
    atoms: [
      atom("S1", "S", 0, 0, 0),
      atom("H1", "H", -0.965, 0.929, 0),
      atom("H2", "H", 0.965, 0.929, 0),
    ],
    bonds: [bond("S1", "H1"), bond("S1", "H2")],
    facts: [
      { label: "Shape", value: "Bent, with a smaller angle than water" },
      { label: "Safety", value: "H₂S is highly toxic; the model is for molecular learning only." },
      { label: "Polarity", value: "The bent molecule has a small net dipole." },
    ],
  }),
]);

export const STRUCTURES_BY_ELEMENT = Object.freeze({
  O: OXYGEN_STRUCTURES,
  S: SULFUR_STRUCTURES,
});

/**
 * Short editorial arcs for the first hero-element experiences. They are story
 * prompts for the UI, not substitutes for the quantitative element dataset.
 */
export const HERO_ELEMENT_STORIES = Object.freeze({
  C: Object.freeze({
    symbol: "C",
    title: "One element, radically different frameworks",
    summary: "Carbon can connect into molecules, flat graphite sheets, or a tetrahedral diamond network. The same six-proton element supports strikingly different structures and properties.",
    sceneCue: "Morph from a tetrahedral carbon center into a hexagonal sheet.",
    status: "editorial-summary",
  }),
  O: Object.freeze({
    symbol: "O",
    title: "A reactive partner in air, water, and rock",
    summary: "Oxygen commonly forms two bonds and appears in O₂, water, oxides, and countless biological molecules. Its electron arrangement helps explain why it reacts so readily with many elements.",
    sceneCue: "Pair two oxygen atoms, then branch toward water and oxide motifs.",
    status: "editorial-summary",
  }),
  Na: Object.freeze({
    symbol: "Na",
    title: "One outer electron changes the story",
    summary: "Sodium has one electron beyond a closed shell and commonly forms Na⁺. Metallic sodium is highly reactive, while sodium ions are familiar components of salts and biological fluids.",
    sceneCue: "Release the outer electron and transition from metal to an ion-pair motif.",
    status: "editorial-summary",
  }),
  Si: Object.freeze({
    symbol: "Si",
    title: "From mineral networks to controlled current",
    summary: "Silicon forms robust covalent frameworks in minerals and a crystalline semiconductor whose conductivity can be deliberately tuned—the material bridge from geology to electronics.",
    sceneCue: "Grow a tetrahedral lattice, then illuminate a simplified charge pathway.",
    status: "editorial-summary",
  }),
  P: Object.freeze({
    symbol: "P",
    title: "Stored energy, signals, and contrasting allotropes",
    summary: "Phosphorus appears in biological phosphate groups and in structurally distinct allotropes. Those forms show how bonding arrangement can transform the behavior of one element.",
    sceneCue: "Contrast a P₄ tetrahedron with a layered phosphorus motif.",
    status: "editorial-summary",
  }),
  Fe: Object.freeze({
    symbol: "Fe",
    title: "A transition metal that built worlds",
    summary: "Iron combines metallic bonding, accessible oxidation states, and magnetic behavior. It anchors steels, oxygen-carrying biomolecules, and much of Earth’s core story.",
    sceneCue: "Move from a metallic lattice to Fe²⁺/Fe³⁺ chemistry and a magnetic-domain abstraction.",
    status: "editorial-summary",
  }),
  U: Object.freeze({
    symbol: "U",
    title: "Heavy nuclei and immense stored energy",
    summary: "Uranium is a naturally occurring radioactive actinide. Its isotopes decay over time, and uranium-235 can sustain a fission chain reaction under suitable engineered conditions.",
    sceneCue: "Begin with a restrained decay timeline, then show a clearly labelled schematic fission event.",
    status: "editorial-summary",
  }),
  S: Object.freeze({
    symbol: "S",
    title: "The element of crowns, bridges, and shifting oxidation states",
    summary: "Elemental sulfur is often introduced through puckered S₈ rings, while sulfur chemistry ranges from sulfides to sulfur oxides. Shape and bonding connect its yellow solid form to diverse molecular roles.",
    sceneCue: "Open on the S₈ crown, then slide through H₂S, SO₂, and SO₃.",
    status: "editorial-summary",
  }),
});

export function getStructuresForElement(symbol) {
  return STRUCTURES_BY_ELEMENT[symbol] ?? Object.freeze([]);
}
