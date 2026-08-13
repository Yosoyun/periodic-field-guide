import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { electronShells, parsePubChem } from "../src/model.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const payload = JSON.parse(await readFile(resolve(root, "data/pubchem-periodic-table.json"), "utf8"));
const elements = parsePubChem(payload);
const bySymbol = new Map(elements.map((element) => [element.symbol, element]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(elements.length === 118, "Dataset must contain 118 elements");
assert(new Set(elements.map((element) => element.atomicNumber)).size === 118, "Atomic numbers must be unique");
assert(new Set(elements.map((element) => element.symbol)).size === 118, "Symbols must be unique");
assert(elements.every((element) => element.atomicNumber >= 1 && element.atomicNumber <= 118), "Atomic numbers must be in range");
assert(elements.every((element) => element.period >= 1 && element.period <= 7), "Periods must be in range");
assert(elements.every((element) => element.row >= 1 && element.row <= 9), "Grid rows must be in range");
assert(elements.every((element) => element.column >= 1 && element.column <= 18), "Grid columns must be in range");

const expectedShells = new Map([
  ["H", [1]],
  ["C", [2, 4]],
  ["Na", [2, 8, 1]],
  ["Fe", [2, 8, 14, 2]],
  ["Xe", [2, 8, 18, 18, 8]],
  ["U", [2, 8, 18, 32, 21, 9, 2]],
  ["Og", [2, 8, 18, 32, 32, 18, 8]],
]);

for (const [symbol, expected] of expectedShells) {
  const actual = electronShells(bySymbol.get(symbol), bySymbol);
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${symbol}: expected shells ${expected}, got ${actual}`);
}

for (const element of elements) {
  const shellTotal = electronShells(element, bySymbol).reduce((sum, count) => sum + count, 0);
  assert(shellTotal === element.atomicNumber, `${element.symbol}: shell total ${shellTotal} does not equal atomic number`);
}

console.log("Model checks passed for all 118 elements.");
