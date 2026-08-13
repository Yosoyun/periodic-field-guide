import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { electronShells, parsePubChem } from "../src/model.js";
import { makeElementPattern } from "../src/pattern-data.js";
import { HERO_ELEMENT_STORIES, OXYGEN_STRUCTURES, SULFUR_STRUCTURES, getStructuresForElement } from "../src/structure-data.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(SULFUR_STRUCTURES.length === 4, "Expected four sulfur structures");
assert(OXYGEN_STRUCTURES.length === 4, "Expected four oxygen structures");
assert(getStructuresForElement("S") === SULFUR_STRUCTURES, "Sulfur lookup should return the exported collection");
assert(getStructuresForElement("O") === OXYGEN_STRUCTURES, "Oxygen lookup should return the exported collection");
assert(getStructuresForElement("Xe").length === 0, "Elements without curated structures should return an empty collection");

for (const model of SULFUR_STRUCTURES) {
  assert(model.formula && model.geometry?.description, `${model.id}: formula and geometry are required`);
  assert(model.status === "schematic", `${model.id}: model must be visibly marked schematic`);
  assert(model.provenance?.truthClass === "procedural-schematic", `${model.id}: missing truth class`);
  assert(model.provenance?.coordinateStatus === "idealized-not-experimental", `${model.id}: coordinate status is misleading`);

  const atomIds = new Set(model.atoms.map(({ id }) => id));
  assert(atomIds.size === model.atoms.length, `${model.id}: atom IDs must be unique`);
  assert(model.atoms.every(({ symbol, position }) => symbol && position.length === 3 && position.every(Number.isFinite)), `${model.id}: invalid atom`);
  assert(model.bonds.every(({ from, to }) => atomIds.has(from) && atomIds.has(to) && from !== to), `${model.id}: bond references an invalid atom`);
}

for (const model of OXYGEN_STRUCTURES) {
  assert(model.formula && model.geometry?.description, `${model.id}: formula and geometry are required`);
  assert(model.status === "reference-geometry", `${model.id}: oxygen model must expose its reference status`);
  assert(model.provenance?.truthClass === "reference-geometry", `${model.id}: missing reference truth class`);
  assert(model.provenance?.coordinateStatus === "constructed-from-experimental-internal-coordinates", `${model.id}: coordinate status is misleading`);
  assert(model.geometry?.sourceUrl?.includes("nist.gov"), `${model.id}: NIST geometry source is required`);

  const atomIds = new Set(model.atoms.map(({ id }) => id));
  assert(atomIds.size === model.atoms.length, `${model.id}: atom IDs must be unique`);
  assert(model.atoms.every(({ symbol, position }) => symbol && position.length === 3 && position.every(Number.isFinite)), `${model.id}: invalid atom`);
  assert(model.bonds.every(({ from, to }) => atomIds.has(from) && atomIds.has(to) && from !== to), `${model.id}: bond references an invalid atom`);
}

assert(SULFUR_STRUCTURES.find(({ id }) => id === "s8-crown").bonds.length === 8, "S8 should close an eight-bond ring");
assert(new Set(Object.keys(HERO_ELEMENT_STORIES)).size === 8, "Expected eight hero-element stories");
assert(["C", "O", "Na", "Si", "P", "Fe", "U", "S"].every((symbol) => HERO_ELEMENT_STORIES[symbol]), "Hero set is incomplete");

const root = resolve(new URL("..", import.meta.url).pathname);
const payload = JSON.parse(await readFile(resolve(root, "data/pubchem-periodic-table.json"), "utf8"));
const elements = parsePubChem(payload);
const elementMap = new Map(elements.map((element) => [element.symbol, element]));

for (const element of elements) {
  const shells = electronShells(element, elementMap);
  const pattern = makeElementPattern(element, shells);
  assert(pattern.id === `pattern-${element.symbol}`, `${element.symbol}: missing universal pattern ID`);
  assert(pattern.kind === "conceptual-pattern", `${element.symbol}: universal view must be a conceptual pattern`);
  assert(pattern.truthClass === "procedural-concept", `${element.symbol}: universal view must expose its truth class`);
  assert(pattern.provenance.experimentalCoordinates === false, `${element.symbol}: pattern must not claim experimental coordinates`);
  assert(pattern.inputs.shells.reduce((sum, count) => sum + count, 0) === element.atomicNumber, `${element.symbol}: pattern shell total mismatch`);
  assert(pattern.geometry.description && pattern.facts.length >= 2, `${element.symbol}: pattern needs visible interpretation copy`);
}

console.log("Structure checks passed for 118 universal patterns, four oxygen references, four sulfur models, and eight hero stories.");
