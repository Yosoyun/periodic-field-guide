const PERIODS = [
  ["H", null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, "He"],
  ["Li", "Be", null, null, null, null, null, null, null, null, null, null, "B", "C", "N", "O", "F", "Ne"],
  ["Na", "Mg", null, null, null, null, null, null, null, null, null, null, "Al", "Si", "P", "S", "Cl", "Ar"],
  ["K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr"],
  ["Rb", "Sr", "Y", "Zr", "Nb", "Mo", "Tc", "Ru", "Rh", "Pd", "Ag", "Cd", "In", "Sn", "Sb", "Te", "I", "Xe"],
  ["Cs", "Ba", "57–71", "Hf", "Ta", "W", "Re", "Os", "Ir", "Pt", "Au", "Hg", "Tl", "Pb", "Bi", "Po", "At", "Rn"],
  ["Fr", "Ra", "89–103", "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl", "Mc", "Lv", "Ts", "Og"],
];

const LANTHANIDES = ["La", "Ce", "Pr", "Nd", "Pm", "Sm", "Eu", "Gd", "Tb", "Dy", "Ho", "Er", "Tm", "Yb", "Lu"];
const ACTINIDES = ["Ac", "Th", "Pa", "U", "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr"];

export const FAMILY_META = [
  ["All elements", "all", "#474238"],
  ["Alkali metal", "alkali-metal", "#d96243"],
  ["Alkaline earth metal", "alkaline-earth-metal", "#d99b3d"],
  ["Transition metal", "transition-metal", "#527fb0"],
  ["Post-transition metal", "post-transition-metal", "#8a73a8"],
  ["Metalloid", "metalloid", "#4f8b78"],
  ["Nonmetal", "nonmetal", "#3f8eaa"],
  ["Halogen", "halogen", "#b58b27"],
  ["Noble gas", "noble-gas", "#8667a0"],
  ["Lanthanide", "lanthanide", "#b56f8a"],
  ["Actinide", "actinide", "#a85f59"],
];

const COLUMNS = [
  "atomicNumber",
  "symbol",
  "name",
  "atomicMass",
  "cpkHexColor",
  "electronConfiguration",
  "electronegativity",
  "atomicRadius",
  "ionizationEnergy",
  "electronAffinity",
  "oxidationStates",
  "standardState",
  "meltingPoint",
  "boilingPoint",
  "density",
  "groupBlock",
  "yearDiscovered",
];

const CORE_SYMBOLS = new Set(["He", "Ne", "Ar", "Kr", "Xe", "Rn"]);

export function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function normalizeCategory(groupBlock, symbol) {
  if (LANTHANIDES.includes(symbol)) return "Lanthanide";
  if (ACTINIDES.includes(symbol)) return "Actinide";
  return groupBlock;
}

function positionFor(symbol) {
  for (let periodIndex = 0; periodIndex < PERIODS.length; periodIndex += 1) {
    const groupIndex = PERIODS[periodIndex].indexOf(symbol);
    if (groupIndex >= 0) {
      return { period: periodIndex + 1, group: groupIndex + 1, row: periodIndex + 1, column: groupIndex + 1 };
    }
  }

  const lanthanideIndex = LANTHANIDES.indexOf(symbol);
  if (lanthanideIndex >= 0) {
    return { period: 6, group: symbol === "La" ? 3 : null, row: 8, column: lanthanideIndex + 3 };
  }

  const actinideIndex = ACTINIDES.indexOf(symbol);
  if (actinideIndex >= 0) {
    return { period: 7, group: symbol === "Ac" ? 3 : null, row: 9, column: actinideIndex + 3 };
  }

  throw new Error(`No table position for ${symbol}`);
}

export function parsePubChem(payload) {
  const elements = payload.Table.Row.map(({ Cell }) => {
    const element = Object.fromEntries(COLUMNS.map((key, index) => [key, Cell[index] ?? ""]));
    const position = positionFor(element.symbol);
    return {
      ...element,
      ...position,
      atomicNumber: Number(element.atomicNumber),
      category: normalizeCategory(element.groupBlock, element.symbol),
    };
  });

  if (elements.length !== 118) throw new Error(`Expected 118 elements, received ${elements.length}`);
  return elements;
}

export function tablePlaceholders() {
  return [
    { label: "57–71", sublabel: "lanthanides", period: 6, row: 6, column: 3, family: "lanthanide" },
    { label: "89–103", sublabel: "actinides", period: 7, row: 7, column: 3, family: "actinide" },
  ];
}

function expandConfiguration(element, elementMap, seen = new Set()) {
  if (seen.has(element.symbol)) return "";
  seen.add(element.symbol);

  let configuration = element.electronConfiguration.replace(/\(predicted\)/gi, "").trim();
  const match = configuration.match(/^\[([A-Za-z]{1,2})\]/);
  if (!match) return configuration;

  const core = elementMap.get(match[1]);
  if (!core || !CORE_SYMBOLS.has(core.symbol)) return configuration.replace(match[0], "");
  return `${expandConfiguration(core, elementMap, seen)} ${configuration.slice(match[0].length)}`.trim();
}

export function electronShells(element, elementMap) {
  const expanded = expandConfiguration(element, elementMap);
  const shells = Array.from({ length: 7 }, () => 0);
  const orbitalPattern = /(\d)[spdfg]\s*(\d+)/gi;
  let match;

  while ((match = orbitalPattern.exec(expanded)) !== null) {
    shells[Number(match[1]) - 1] += Number(match[2]);
  }

  while (shells.length && shells[shells.length - 1] === 0) shells.pop();
  const total = shells.reduce((sum, count) => sum + count, 0);
  if (total !== element.atomicNumber) {
    console.warn(`Electron configuration for ${element.symbol} resolves to ${total}, expected ${element.atomicNumber}.`);
  }
  return shells;
}

export function formatElectronConfiguration(value) {
  return value
    .replace(/\s*\(predicted\)/i, " (predicted)")
    .replace(/([spdfg])(\d+)/gi, (_, orbital, count) => `${orbital}${toSuperscript(count)}`)
    .replace(/\s+/g, " ")
    .trim();
}

function toSuperscript(value) {
  const map = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  return String(value).split("").map((digit) => map[digit] ?? digit).join("");
}

export function formatDiscovery(value) {
  if (!value) return "Discovery date not listed";
  if (value.toLowerCase() === "ancient") return "Known since ancient times";
  return `Discovered in ${value}`;
}
