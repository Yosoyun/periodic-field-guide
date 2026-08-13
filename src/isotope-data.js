/**
 * Curated isotope truth layer for the local, API-free experience.
 *
 * Important: a mass number is not an average atomic weight. No value in this
 * module is produced by rounding the `atomicMass` field in the periodic-table
 * dataset. Natural representatives are selected from CIAAW isotope-composition
 * evaluations; radioactive representatives follow NIST's parenthesized
 * mass-number convention.
 *
 * Primary sources:
 * - CIAAW Isotopic Compositions of the Elements 2024:
 *   https://www.ciaaw.org/isotopic-abundances.htm
 * - CIAAW oxygen isotope table:
 *   https://ciaaw.org/oxygen.htm
 * - CIAAW sulfur isotope table:
 *   https://ciaaw.org/sulfur.htm
 * - CIAAW radioactive-elements notes (based on NUBASE2020):
 *   https://ciaaw.org/radioactive-elements.htm
 * - NIST SP 966, Periodic Table of the Elements, Version 15 (June 2024):
 *   https://www.nist.gov/document/periodic-table-2024
 * - NIST version history:
 *   https://www.nist.gov/pml/periodic-table-version-history
 */

export const ISOTOPE_SOURCES = Object.freeze({
  ciaaw2024: Object.freeze({
    label: "CIAAW Isotopic Compositions of the Elements 2024",
    url: "https://www.ciaaw.org/isotopic-abundances.htm",
    dataVersion: "2024",
  }),
  ciaawOxygen: Object.freeze({
    label: "CIAAW oxygen isotope table",
    url: "https://ciaaw.org/oxygen.htm",
    dataVersion: "current CIAAW element review",
  }),
  ciaawSulfur: Object.freeze({
    label: "CIAAW sulfur isotope table",
    url: "https://ciaaw.org/sulfur.htm",
    dataVersion: "current CIAAW element review",
  }),
  ciaawRadioactive: Object.freeze({
    label: "CIAAW Radioactive Elements, based on NUBASE2020",
    url: "https://ciaaw.org/radioactive-elements.htm",
    dataVersion: "NUBASE2020 compilation",
  }),
  nist2024: Object.freeze({
    label: "NIST SP 966 Periodic Table, Version 15",
    url: "https://www.nist.gov/document/periodic-table-2024",
    dataVersion: "June 2024",
  }),
  nistVersionHistory: Object.freeze({
    label: "NIST Periodic Table version history",
    url: "https://www.nist.gov/pml/periodic-table-version-history",
    dataVersion: "Version 15 notes",
  }),
});

// Ordered by atomic number. For elements with a characteristic natural
// composition, the chosen mass is normally the most abundant isotope in the
// CIAAW 2024 table. Pb-208 is handled as an explicit exception because lead's
// isotope composition can vary enough that no isotope is universally dominant.
// Parenthesized NIST representatives are identified separately below.
const REPRESENTATIVE_MASS_ROWS = Object.freeze([
  ["H", 1], ["He", 4],
  ["Li", 7], ["Be", 9], ["B", 11], ["C", 12], ["N", 14], ["O", 16], ["F", 19], ["Ne", 20],
  ["Na", 23], ["Mg", 24], ["Al", 27], ["Si", 28], ["P", 31], ["S", 32], ["Cl", 35], ["Ar", 40],
  ["K", 39], ["Ca", 40], ["Sc", 45], ["Ti", 48], ["V", 51], ["Cr", 52], ["Mn", 55], ["Fe", 56],
  ["Co", 59], ["Ni", 58], ["Cu", 63], ["Zn", 64], ["Ga", 69], ["Ge", 74], ["As", 75], ["Se", 80],
  ["Br", 79], ["Kr", 84], ["Rb", 85], ["Sr", 88], ["Y", 89], ["Zr", 90], ["Nb", 93], ["Mo", 98],
  ["Tc", 97], ["Ru", 102], ["Rh", 103], ["Pd", 106], ["Ag", 107], ["Cd", 114], ["In", 115], ["Sn", 120],
  ["Sb", 121], ["Te", 130], ["I", 127], ["Xe", 132], ["Cs", 133], ["Ba", 138],
  ["La", 139], ["Ce", 140], ["Pr", 141], ["Nd", 142], ["Pm", 145], ["Sm", 152], ["Eu", 153], ["Gd", 158],
  ["Tb", 159], ["Dy", 164], ["Ho", 165], ["Er", 166], ["Tm", 169], ["Yb", 174], ["Lu", 175],
  ["Hf", 180], ["Ta", 181], ["W", 184], ["Re", 187], ["Os", 192], ["Ir", 193], ["Pt", 195], ["Au", 197],
  ["Hg", 202], ["Tl", 205], ["Pb", 208], ["Bi", 209], ["Po", 209], ["At", 210], ["Rn", 222],
  ["Fr", 223], ["Ra", 226], ["Ac", 227], ["Th", 232], ["Pa", 231], ["U", 238],
  ["Np", 237], ["Pu", 244], ["Am", 243], ["Cm", 247], ["Bk", 247], ["Cf", 251], ["Es", 252],
  ["Fm", 257], ["Md", 258], ["No", 259], ["Lr", 262], ["Rf", 267], ["Db", 268], ["Sg", 269],
  ["Bh", 270], ["Hs", 269], ["Mt", 277], ["Ds", 281], ["Rg", 282], ["Cn", 285], ["Nh", 286],
  ["Fl", 290], ["Mc", 290], ["Lv", 293], ["Ts", 294], ["Og", 294],
]);

const NIST_RADIOACTIVE_REPRESENTATIVES = new Set([
  "Tc", "Pm", "Po", "At", "Rn", "Fr", "Ra", "Ac",
  "Np", "Pu", "Am", "Cm", "Bk", "Cf", "Es", "Fm", "Md", "No", "Lr",
  "Rf", "Db", "Sg", "Bh", "Hs", "Mt", "Ds", "Rg", "Cn", "Nh", "Fl",
  "Mc", "Lv", "Ts", "Og",
]);

function neutralParticleCounts(atomicNumber, massNumber) {
  if (!Number.isInteger(atomicNumber) || atomicNumber < 1) throw new TypeError("atomicNumber must be a positive integer");
  if (!Number.isInteger(massNumber) || massNumber < atomicNumber) throw new TypeError("massNumber must be an integer at least as large as atomicNumber");
  return Object.freeze({
    protons: atomicNumber,
    neutrons: massNumber - atomicNumber,
    electrons: atomicNumber,
  });
}

function representativeProvenance(symbol) {
  if (NIST_RADIOACTIVE_REPRESENTATIVES.has(symbol)) {
    return Object.freeze({
      label: "NIST long-lived radioisotope representative",
      source: ISOTOPE_SOURCES.nist2024.label,
      url: ISOTOPE_SOURCES.nist2024.url,
      supportingSource: ISOTOPE_SOURCES.ciaawRadioactive.label,
      supportingUrl: ISOTOPE_SOURCES.ciaawRadioactive.url,
      selectionMethod: "NIST SP 966 Version 15 parenthesized mass-number representative; not derived from average atomic weight.",
      caveat: "CIAAW notes that uncertainty can prevent a unique longest-lived choice for some radioactive elements; treat this as a curated display representative.",
    });
  }

  if (symbol === "Pb") {
    return Object.freeze({
      label: "Curated natural lead isotope",
      source: ISOTOPE_SOURCES.ciaaw2024.label,
      url: ISOTOPE_SOURCES.ciaaw2024.url,
      selectionMethod: "Pb-208 selected as a common natural display isotope from the CIAAW isotope list; not derived from average atomic weight.",
      caveat: "Natural lead isotope proportions vary strongly, so Pb-208 is not asserted to be the most abundant isotope in every sample.",
    });
  }

  return Object.freeze({
    label: "CIAAW most-abundant natural-isotope representative",
    source: ISOTOPE_SOURCES.ciaaw2024.label,
    url: ISOTOPE_SOURCES.ciaaw2024.url,
    selectionMethod: "Mass number selected from the greatest representative isotopic composition listed by CIAAW 2024; not derived from average atomic weight.",
    caveat: "Natural isotope proportions can vary by sample; this is a display default, not a sample-specific composition.",
  });
}

function makeRepresentative(symbol, atomicNumber, massNumber) {
  const particles = neutralParticleCounts(atomicNumber, massNumber);
  const isRadioactiveRepresentative = NIST_RADIOACTIVE_REPRESENTATIVES.has(symbol);
  const isLeadException = symbol === "Pb";

  return Object.freeze({
    id: `${symbol}-${massNumber}`,
    symbol,
    notation: `${symbol}-${massNumber}`,
    atomicNumber,
    massNumber,
    ...particles,
    charge: 0,
    scientificStatus: isRadioactiveRepresentative
      ? "radioactive-display-representative"
      : isLeadException
        ? "curated-natural-display-isotope"
        : "most-abundant-natural-isotope",
    statusLabel: isRadioactiveRepresentative
      ? "Radioactive representative · no characteristic natural composition"
      : isLeadException
        ? "Natural display isotope · composition varies"
        : "Most-abundant natural-isotope representative",
    provenance: representativeProvenance(symbol),
  });
}

export const REPRESENTATIVE_ISOTOPES = Object.freeze(Object.fromEntries(
  REPRESENTATIVE_MASS_ROWS.map(([symbol, massNumber], index) => [
    symbol,
    makeRepresentative(symbol, index + 1, massNumber),
  ]),
));

function naturalIsotope({ symbol, atomicNumber, massNumber, atomicMassDa, abundanceMin, abundanceMax, abundanceLabel, source }) {
  return Object.freeze({
    id: `${symbol}-${massNumber}`,
    symbol,
    notation: `${symbol}-${massNumber}`,
    atomicNumber,
    massNumber,
    ...neutralParticleCounts(atomicNumber, massNumber),
    charge: 0,
    atomicMassDa,
    naturalAbundance: Object.freeze({
      kind: "interval",
      min: abundanceMin,
      max: abundanceMax,
      unit: "amount fraction",
      displayPercent: abundanceLabel,
    }),
    scientificStatus: "natural-isotope",
    statusLabel: "Natural isotope · terrestrial abundance varies",
    provenance: Object.freeze({
      label: source.label,
      source: source.label,
      url: source.url,
      compositionTableUrl: ISOTOPE_SOURCES.ciaaw2024.url,
      selectionMethod: "Mass number, atomic mass, and natural amount-fraction interval transcribed from CIAAW; not derived from average atomic weight.",
      caveat: "The interval describes variation among normal terrestrial materials and should not be presented as one exact percentage for every sample.",
    }),
  });
}

const OXYGEN_ISOTOPES = Object.freeze([
  naturalIsotope({
    symbol: "O", atomicNumber: 8, massNumber: 16,
    atomicMassDa: "15.994 914 619(1)",
    abundanceMin: 0.99738, abundanceMax: 0.99776, abundanceLabel: "99.738–99.776%",
    source: ISOTOPE_SOURCES.ciaawOxygen,
  }),
  naturalIsotope({
    symbol: "O", atomicNumber: 8, massNumber: 17,
    atomicMassDa: "16.999 131 757(5)",
    abundanceMin: 0.000367, abundanceMax: 0.0004, abundanceLabel: "0.0367–0.0400%",
    source: ISOTOPE_SOURCES.ciaawOxygen,
  }),
  naturalIsotope({
    symbol: "O", atomicNumber: 8, massNumber: 18,
    atomicMassDa: "17.999 159 613(5)",
    abundanceMin: 0.00187, abundanceMax: 0.00222, abundanceLabel: "0.187–0.222%",
    source: ISOTOPE_SOURCES.ciaawOxygen,
  }),
]);

const SULFUR_ISOTOPES = Object.freeze([
  naturalIsotope({
    symbol: "S", atomicNumber: 16, massNumber: 32,
    atomicMassDa: "31.972 071 174(9)",
    abundanceMin: 0.9441, abundanceMax: 0.9529, abundanceLabel: "94.41–95.29%",
    source: ISOTOPE_SOURCES.ciaawSulfur,
  }),
  naturalIsotope({
    symbol: "S", atomicNumber: 16, massNumber: 33,
    atomicMassDa: "32.971 458 91(1)",
    abundanceMin: 0.00729, abundanceMax: 0.00797, abundanceLabel: "0.729–0.797%",
    source: ISOTOPE_SOURCES.ciaawSulfur,
  }),
  naturalIsotope({
    symbol: "S", atomicNumber: 16, massNumber: 34,
    atomicMassDa: "33.967 8670(3)",
    abundanceMin: 0.0396, abundanceMax: 0.0477, abundanceLabel: "3.96–4.77%",
    source: ISOTOPE_SOURCES.ciaawSulfur,
  }),
  naturalIsotope({
    symbol: "S", atomicNumber: 16, massNumber: 36,
    atomicMassDa: "35.967 081(2)",
    abundanceMin: 0.000129, abundanceMax: 0.000187, abundanceLabel: "0.0129–0.0187%",
    source: ISOTOPE_SOURCES.ciaawSulfur,
  }),
]);

export const NATURAL_ISOTOPE_OPTIONS = Object.freeze({
  O: OXYGEN_ISOTOPES,
  S: SULFUR_ISOTOPES,
});

export const ISOTOPE_OPTIONS_BY_ELEMENT = Object.freeze(Object.fromEntries(
  REPRESENTATIVE_MASS_ROWS.map(([symbol]) => [
    symbol,
    NATURAL_ISOTOPE_OPTIONS[symbol] ?? Object.freeze([REPRESENTATIVE_ISOTOPES[symbol]]),
  ]),
));

const EMPTY_ISOTOPE_OPTIONS = Object.freeze([]);

export function getRepresentativeIsotope(symbol) {
  return REPRESENTATIVE_ISOTOPES[symbol] ?? null;
}

export function getDefaultIsotope(symbol) {
  const representative = getRepresentativeIsotope(symbol);
  if (!representative) return null;
  return getIsotopeOptions(symbol).find(({ massNumber }) => massNumber === representative.massNumber) ?? representative;
}

export function getIsotopeOptions(symbol) {
  return ISOTOPE_OPTIONS_BY_ELEMENT[symbol] ?? EMPTY_ISOTOPE_OPTIONS;
}

export function makeNeutralAtomComposition(atomicNumber, isotope) {
  const massNumber = typeof isotope === "number" ? isotope : isotope?.massNumber;
  if (isotope && typeof isotope === "object" && isotope.atomicNumber != null && isotope.atomicNumber !== atomicNumber) {
    throw new RangeError(`Isotope atomic number ${isotope.atomicNumber} does not match element atomic number ${atomicNumber}`);
  }

  return Object.freeze({
    massNumber,
    ...neutralParticleCounts(atomicNumber, massNumber),
  });
}
