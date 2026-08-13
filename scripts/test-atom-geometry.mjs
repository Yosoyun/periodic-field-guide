import {
  ELECTRON_TRACK_MOTION,
  NUCLEUS_LAYOUT_TRUTH,
  createIsotopeGeometry,
  createNucleonLayout,
  createShellOrbitDescriptors,
  pointOnShellOrbit,
} from "../src/atom-geometry.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function approximatelyEqual(left, right, tolerance = 1e-6) {
  return Math.abs(left - right) <= tolerance;
}

function expectThrow(callback, message) {
  let threw = false;
  try {
    callback();
  } catch {
    threw = true;
  }
  assert(threw, message);
}

function arraysEqual(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}

function vectorLength(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function dot(left, right) {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cross(left, right) {
  return [
    left[1] * right[2] - left[2] * right[1],
    left[2] * right[0] - left[0] * right[2],
    left[0] * right[1] - left[1] * right[0],
  ];
}

const isotopeFixtures = [
  { name: "hydrogen-1", atomicNumber: 1, massNumber: 1, shells: [1], neutrons: 0 },
  { name: "carbon-12", atomicNumber: 6, massNumber: 12, shells: [2, 4], neutrons: 6 },
  { name: "iron-56", atomicNumber: 26, massNumber: 56, shells: [2, 8, 14, 2], neutrons: 30 },
  { name: "uranium-235", atomicNumber: 92, massNumber: 235, shells: [2, 8, 18, 32, 21, 9, 2], neutrons: 143 },
  { name: "oganesson-294", atomicNumber: 118, massNumber: 294, shells: [2, 8, 18, 32, 32, 18, 8], neutrons: 176 },
];

for (const fixture of isotopeFixtures) {
  const first = createIsotopeGeometry({
    atomicNumber: fixture.atomicNumber,
    massNumber: fixture.massNumber,
    shellOccupancies: fixture.shells,
  });
  const second = createIsotopeGeometry({
    atomicNumber: fixture.atomicNumber,
    massNumber: fixture.massNumber,
    shellOccupancies: fixture.shells,
  });

  assert(first.isotope.protonCount === fixture.atomicNumber, `${fixture.name}: incorrect proton count`);
  assert(first.isotope.neutronCount === fixture.neutrons, `${fixture.name}: incorrect neutron count`);
  assert(first.isotope.electronCount === fixture.atomicNumber, `${fixture.name}: neutral electron count must equal Z`);
  assert(first.nucleus.totalCount === fixture.massNumber, `${fixture.name}: total nucleon count must equal A`);
  assert(first.nucleus.protonPositions.length === fixture.atomicNumber * 3, `${fixture.name}: proton instance buffer length`);
  assert(first.nucleus.neutronPositions.length === fixture.neutrons * 3, `${fixture.name}: neutron instance buffer length`);
  assert(first.nucleus.positions instanceof Float32Array, `${fixture.name}: packed positions must be Float32Array`);
  assert(first.nucleus.types instanceof Uint8Array, `${fixture.name}: particle types must be Uint8Array`);
  assert(arraysEqual(first.nucleus.positions, second.nucleus.positions), `${fixture.name}: positions must be deterministic`);
  assert(arraysEqual(first.nucleus.types, second.nucleus.types), `${fixture.name}: types must be deterministic`);
  assert(first.orbits.length === fixture.shells.length, `${fixture.name}: orbit count must equal occupied shell count`);
  assert(first.truth.countsExact === true, `${fixture.name}: exact-count truth metadata missing`);

  const centroid = [0, 0, 0];
  let maximumDistance = 0;
  const uniquePositions = new Set();
  for (let offset = 0; offset < first.nucleus.positions.length; offset += 3) {
    const point = [
      first.nucleus.positions[offset],
      first.nucleus.positions[offset + 1],
      first.nucleus.positions[offset + 2],
    ];
    centroid[0] += point[0];
    centroid[1] += point[1];
    centroid[2] += point[2];
    maximumDistance = Math.max(maximumDistance, vectorLength(point));
    uniquePositions.add(point.map((value) => value.toFixed(7)).join(","));
  }
  centroid[0] /= fixture.massNumber;
  centroid[1] /= fixture.massNumber;
  centroid[2] /= fixture.massNumber;
  assert(vectorLength(centroid) < 1e-6, `${fixture.name}: nucleus must be centered`);
  assert(maximumDistance <= first.nucleus.centerRadius + 1e-5, `${fixture.name}: nucleons exceed fitted radius`);
  assert(uniquePositions.size === fixture.massNumber || fixture.massNumber === 1, `${fixture.name}: duplicate nucleon positions`);

  const protonTypeCount = first.nucleus.types.reduce((sum, value) => sum + value, 0);
  assert(protonTypeCount === fixture.atomicNumber, `${fixture.name}: type buffer must contain exactly Z protons`);
}

const oganesson = createIsotopeGeometry({
  atomicNumber: 118,
  massNumber: 294,
  shellOccupancies: [2, 8, 18, 32, 32, 18, 8],
  trackSegments: 128,
});
assert(oganesson.nucleus.positions.byteLength <= 294 * 3 * 4, "Packed nucleon buffer should remain compact");
assert(oganesson.nucleus.protonPositions.length / 3 === 118, "Oganesson must expose 118 proton instances");
assert(oganesson.nucleus.neutronPositions.length / 3 === 176, "Oganesson-294 must expose 176 neutron instances");

const orbits = createShellOrbitDescriptors([2, 8, 18, 32, 32, 18, 8], {
  expectedElectronCount: 118,
  nucleusRadius: oganesson.nucleus.radius,
  maxOrbitRadius: 7.25,
  trackSegments: 128,
});

for (let index = 0; index < orbits.length; index += 1) {
  const orbit = orbits[index];
  assert(orbit.center.every((value) => value === 0), `shell ${index + 1}: track must be centered`);
  assert(approximatelyEqual(vectorLength(orbit.majorAxis), 1), `shell ${index + 1}: major axis must be unit length`);
  assert(approximatelyEqual(vectorLength(orbit.minorAxis), 1), `shell ${index + 1}: minor axis must be unit length`);
  assert(approximatelyEqual(vectorLength(orbit.normal), 1), `shell ${index + 1}: normal must be unit length`);
  assert(Math.abs(dot(orbit.majorAxis, orbit.minorAxis)) < 1e-6, `shell ${index + 1}: ellipse axes must be orthogonal`);
  assert(dot(cross(orbit.majorAxis, orbit.minorAxis), orbit.normal) > 0.999999, `shell ${index + 1}: basis must be right handed`);
  assert(orbit.semiMinor < orbit.semiMajor, `shell ${index + 1}: teaching track must be elliptical`);
  assert(orbit.electronPhases.length === orbit.electronCount, `shell ${index + 1}: exact electron phases required`);
  assert(orbit.trackPoints.length === orbit.trackSegments * 3, `shell ${index + 1}: fitted line-loop buffer length`);
  assert(orbit.motion === ELECTRON_TRACK_MOTION, `shell ${index + 1}: motion must be explicitly marked schematic`);

  const expectedDirection = index % 2 === 0 ? "clockwise" : "counterclockwise";
  assert(orbit.direction === expectedDirection, `shell ${index + 1}: directions must alternate`);
  assert(Math.sign(orbit.angularSpeed) === orbit.directionSign, `shell ${index + 1}: speed sign must match direction`);
  if (index > 0) assert(orbit.semiMajor > orbits[index - 1].semiMajor, `shell ${index + 1}: tracks must expand outward`);

  const trackCentroid = [0, 0, 0];
  let farthestTrackPoint = 0;
  for (let offset = 0; offset < orbit.trackPoints.length; offset += 3) {
    const point = [orbit.trackPoints[offset], orbit.trackPoints[offset + 1], orbit.trackPoints[offset + 2]];
    trackCentroid[0] += point[0];
    trackCentroid[1] += point[1];
    trackCentroid[2] += point[2];
    farthestTrackPoint = Math.max(farthestTrackPoint, vectorLength(point));
  }
  trackCentroid[0] /= orbit.trackSegments;
  trackCentroid[1] /= orbit.trackSegments;
  trackCentroid[2] /= orbit.trackSegments;
  assert(vectorLength(trackCentroid) < 1e-6, `shell ${index + 1}: sampled track must remain centered`);
  assert(farthestTrackPoint <= orbit.semiMajor + 1e-5, `shell ${index + 1}: track exceeds fitted semi-major radius`);

  const atZero = pointOnShellOrbit(orbit, 0);
  const expectedZero = orbit.majorAxis.map((value, axis) => orbit.center[axis] + value * orbit.semiMajor);
  assert(atZero.every((value, axis) => approximatelyEqual(value, expectedZero[axis], 1e-5)), `shell ${index + 1}: orbit evaluation mismatch`);
}

assert(orbits.at(-1).semiMajor <= 7.25 + 1e-9, "Outermost track must respect the fit radius");
assert(NUCLEUS_LAYOUT_TRUTH.spatialStatus === "schematic", "Nucleus positions must be labelled schematic");
assert(ELECTRON_TRACK_MOTION.directionStatus === "teaching-only", "Electron direction must be labelled teaching-only");

expectThrow(
  () => createIsotopeGeometry({ atomicNumber: 6, massNumber: 5, shellOccupancies: [2, 4] }),
  "Mass number smaller than atomic number must fail",
);
expectThrow(
  () => createIsotopeGeometry({ atomicNumber: 26, massNumber: 56, shellOccupancies: [2, 8, 13, 2] }),
  "Electron total different from Z must fail",
);
expectThrow(
  () => createNucleonLayout({ protonCount: -1, neutronCount: 1 }),
  "Negative nucleon counts must fail",
);
expectThrow(
  () => createShellOrbitDescriptors([2, 0, 1]),
  "Empty inner shell descriptors must fail",
);

console.log("Atom geometry checks passed: exact deterministic isotope counts through Oganesson-294, centered dense packing, and seven fitted alternating schematic shell tracks.");
