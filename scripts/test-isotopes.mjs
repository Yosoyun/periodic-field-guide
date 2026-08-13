import {
  ISOTOPE_OPTIONS_BY_ELEMENT,
  NATURAL_ISOTOPE_OPTIONS,
  REPRESENTATIVE_ISOTOPES,
  getDefaultIsotope,
  getIsotopeOptions,
  getRepresentativeIsotope,
  makeNeutralAtomComposition,
} from "../src/isotope-data.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const representatives = Object.values(REPRESENTATIVE_ISOTOPES);
assert(representatives.length === 118, `Expected 118 representative isotopes, received ${representatives.length}`);
assert(Object.keys(ISOTOPE_OPTIONS_BY_ELEMENT).length === 118, "Every element needs isotope options");
assert(new Set(representatives.map(({ symbol }) => symbol)).size === 118, "Representative symbols must be unique");
assert(new Set(representatives.map(({ atomicNumber }) => atomicNumber)).size === 118, "Atomic numbers must be unique");

for (const isotope of representatives) {
  assert(isotope.atomicNumber >= 1 && isotope.atomicNumber <= 118, `${isotope.id}: invalid atomic number`);
  assert(Number.isInteger(isotope.massNumber), `${isotope.id}: mass number must be an integer`);
  assert(isotope.protons === isotope.atomicNumber, `${isotope.id}: proton count mismatch`);
  assert(isotope.neutrons === isotope.massNumber - isotope.atomicNumber, `${isotope.id}: neutron count mismatch`);
  assert(isotope.electrons === isotope.protons, `${isotope.id}: neutral atom must have equal electron and proton counts`);
  assert(isotope.charge === 0, `${isotope.id}: representative must be neutral`);
  assert(isotope.scientificStatus && isotope.statusLabel, `${isotope.id}: scientific status is missing`);
  assert(isotope.provenance?.label && isotope.provenance?.url, `${isotope.id}: provenance is missing`);
  assert(getIsotopeOptions(isotope.symbol).length >= 1, `${isotope.id}: options lookup is empty`);
}

const expectedRepresentatives = new Map([
  ["H", 1], ["O", 16], ["Cl", 35], ["Ar", 40], ["Fe", 56], ["Pb", 208],
  ["Tc", 97], ["U", 238], ["Lr", 262], ["Mt", 277], ["Fl", 290], ["Mc", 290], ["Og", 294],
]);

for (const [symbol, massNumber] of expectedRepresentatives) {
  assert(getRepresentativeIsotope(symbol)?.massNumber === massNumber, `${symbol}: expected representative mass ${massNumber}`);
}

assert(getRepresentativeIsotope("Pb").scientificStatus === "curated-natural-display-isotope", "Lead needs its composition caveat");
assert(getRepresentativeIsotope("Mt").provenance.caveat.includes("unique longest-lived"), "Radioactive representatives need an ambiguity caveat");
assert(getDefaultIsotope("O") === NATURAL_ISOTOPE_OPTIONS.O[0], "Oxygen default should be its detailed O-16 option");
assert(getDefaultIsotope("Fe") === getRepresentativeIsotope("Fe"), "Single-option elements should use their representative record directly");
assert(getRepresentativeIsotope("Xx") === null, "Unknown representative lookup should return null");
assert(getIsotopeOptions("Xx").length === 0, "Unknown option lookup should return an empty array");

const neutralOxygen18 = makeNeutralAtomComposition(8, NATURAL_ISOTOPE_OPTIONS.O[2]);
assert(JSON.stringify(neutralOxygen18) === JSON.stringify({ massNumber: 18, protons: 8, neutrons: 10, electrons: 8 }), "Neutral-composition API returned the wrong O-18 counts");
const neutralSulfur34 = makeNeutralAtomComposition(16, 34);
assert(JSON.stringify(neutralSulfur34) === JSON.stringify({ massNumber: 34, protons: 16, neutrons: 18, electrons: 16 }), "Neutral-composition API should accept a mass number");
assertThrows(() => makeNeutralAtomComposition(8, NATURAL_ISOTOPE_OPTIONS.S[0]), "Mismatched isotope element should fail loudly");

const expectedNaturalOptions = new Map([
  ["O", [16, 17, 18]],
  ["S", [32, 33, 34, 36]],
]);

for (const [symbol, expectedMasses] of expectedNaturalOptions) {
  const options = NATURAL_ISOTOPE_OPTIONS[symbol];
  assert(JSON.stringify(options.map(({ massNumber }) => massNumber)) === JSON.stringify(expectedMasses), `${symbol}: natural isotope masses are incomplete`);
  assert(getIsotopeOptions(symbol) === options, `${symbol}: curated options should be returned directly`);

  let lowerTotal = 0;
  let upperTotal = 0;
  for (const isotope of options) {
    const { min, max, unit, displayPercent } = isotope.naturalAbundance;
    assert(isotope.scientificStatus === "natural-isotope", `${isotope.id}: wrong status`);
    assert(isotope.provenance.url.includes("ciaaw.org"), `${isotope.id}: option must cite CIAAW`);
    assert(typeof isotope.atomicMassDa === "string" && isotope.atomicMassDa.length > 0, `${isotope.id}: atomic mass text is missing`);
    assert(min >= 0 && min <= max && max <= 1, `${isotope.id}: invalid abundance interval`);
    assert(unit === "amount fraction" && displayPercent.includes("%"), `${isotope.id}: abundance units are unclear`);
    lowerTotal += min;
    upperTotal += max;
  }
  assert(lowerTotal <= 1 && upperTotal >= 1, `${symbol}: independent CIAAW abundance intervals should enclose a normalized composition`);
}

assert(NATURAL_ISOTOPE_OPTIONS.O[0].protons === 8 && NATURAL_ISOTOPE_OPTIONS.O[0].neutrons === 8 && NATURAL_ISOTOPE_OPTIONS.O[0].electrons === 8, "O-16 particle counts are wrong");
assert(NATURAL_ISOTOPE_OPTIONS.O[2].neutrons === 10, "O-18 should have 10 neutrons");
assert(NATURAL_ISOTOPE_OPTIONS.S[0].protons === 16 && NATURAL_ISOTOPE_OPTIONS.S[0].neutrons === 16 && NATURAL_ISOTOPE_OPTIONS.S[0].electrons === 16, "S-32 particle counts are wrong");
assert(NATURAL_ISOTOPE_OPTIONS.S[3].neutrons === 20, "S-36 should have 20 neutrons");
assert(NATURAL_ISOTOPE_OPTIONS.O[0].atomicMassDa === "15.994 914 619(1)", "O-16 CIAAW atomic mass changed unexpectedly");
assert(NATURAL_ISOTOPE_OPTIONS.S[2].atomicMassDa === "33.967 8670(3)", "S-34 CIAAW atomic mass changed unexpectedly");

console.log("Isotope checks passed for 118 representatives and the curated oxygen/sulfur natural-isotope sets.");

function assertThrows(callback, message) {
  try {
    callback();
  } catch {
    return;
  }
  throw new Error(message);
}
