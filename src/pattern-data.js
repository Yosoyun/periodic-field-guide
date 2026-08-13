import { slugify } from "./model.js";

const PATTERN_META = Object.freeze({
  "alkali-metal": {
    family: "collective-field",
    title: "Collective metallic field",
    arrangement: "drifting-cluster",
    description: "A shared-light sculpture derived from category and shell data. It suggests collective metallic behavior without depicting a literal lattice.",
  },
  "alkaline-earth-metal": {
    family: "collective-field",
    title: "Collective metallic field",
    arrangement: "drifting-cluster",
    description: "A shared-light sculpture derived from category and shell data. It suggests collective metallic behavior without depicting a literal lattice.",
  },
  "transition-metal": {
    family: "collective-field",
    title: "Collective metallic field",
    arrangement: "faceted-cluster",
    description: "A faceted, connected field derived from category and shell data. It is a metallic-behavior metaphor, not a measured crystal structure.",
  },
  "post-transition-metal": {
    family: "collective-field",
    title: "Collective metallic field",
    arrangement: "faceted-cluster",
    description: "A faceted, connected field derived from category and shell data. It is a metallic-behavior metaphor, not a measured crystal structure.",
  },
  lanthanide: {
    family: "collective-field",
    title: "Layered metallic field",
    arrangement: "layered-cluster",
    description: "A layered light field derived from category and shell data. Spacing and connections are artistic, not crystallographic.",
  },
  actinide: {
    family: "collective-field",
    title: "Layered metallic field",
    arrangement: "layered-cluster",
    description: "A layered light field derived from category and shell data. Spacing and connections are artistic, not crystallographic.",
  },
  metalloid: {
    family: "connected-network",
    title: "Connected network",
    arrangement: "warped-network",
    description: "A directional network derived from category and shell data. It is a bonding-theme sketch, not an allotrope or crystal.",
  },
  nonmetal: {
    family: "shared-electron-constellation",
    title: "Shared-electron constellation",
    arrangement: "arc-clusters",
    description: "A constellation derived from category and outer-shell occupancy. It has no molecular identity or stoichiometry.",
  },
  halogen: {
    family: "near-full-shell-motif",
    title: "Near-full-shell motif",
    arrangement: "open-halo",
    description: "An outer-shell light study with one emphasized gap. It is not a diatomic molecule or phase simulation.",
  },
  "noble-gas": {
    family: "closed-shell-drift",
    title: "Closed-shell drift",
    arrangement: "separated-halos",
    description: "Separated glowing forms evoke a filled outer shell. The scene is not a gas or phase simulation.",
  },
});

export function makeElementPattern(element, shells) {
  const category = slugify(element.category);
  const meta = PATTERN_META[category] ?? PATTERN_META.nonmetal;
  const outerShellElectrons = shells.at(-1) ?? 0;
  const superheavyNote = element.atomicNumber >= 104
    ? " Category-based concept only; it does not assert observed bulk behavior for this short-lived superheavy element."
    : "";

  return Object.freeze({
    id: `pattern-${element.symbol}`,
    kind: "conceptual-pattern",
    element: element.symbol,
    name: meta.title,
    formula: element.symbol,
    visualFamily: meta.family,
    arrangement: meta.arrangement,
    status: "procedural-concept",
    truthClass: "procedural-concept",
    seed: element.atomicNumber,
    inputs: Object.freeze({
      atomicNumber: element.atomicNumber,
      category: element.category,
      shells: Object.freeze([...shells]),
      outerShellElectrons,
    }),
    geometry: Object.freeze({
      label: meta.title,
      description: `${meta.description}${superheavyNote}`,
    }),
    facts: Object.freeze([
      Object.freeze({ label: "Driven by", value: `${element.category} · shells ${shells.join(" · ")}` }),
      Object.freeze({ label: "Interpretation", value: "Concept model — not a molecule, allotrope, crystal lattice, or phase simulation." }),
    ]),
    provenance: Object.freeze({
      truthClass: "procedural-concept",
      generatedLocally: true,
      experimentalCoordinates: false,
      inputFields: Object.freeze(["atomicNumber", "category", "electronShells"]),
      displayLabel: "Category + shell data",
    }),
  });
}
