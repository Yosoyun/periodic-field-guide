/**
 * Pure geometry helpers for exact-isotope teaching models.
 *
 * This module intentionally has no Three.js dependency. Consumers can feed the
 * packed Float32Array positions directly into proton, neutron, and electron
 * InstancedMesh matrices without allocating one JavaScript object per particle.
 */

const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const MAX_RENDER_NUCLEONS = 512;
const EPSILON = 1e-10;

export const NUCLEUS_LAYOUT_TRUTH = Object.freeze({
  countsExact: true,
  spatialStatus: "schematic",
  model: "deterministic low-discrepancy volume packing",
  note: "Proton and neutron counts are exact for the selected isotope. Nucleon positions, sizes, packing, colors, and any motion are schematic and do not represent a measured nuclear wavefunction.",
});

export const ELECTRON_TRACK_MOTION = Object.freeze({
  spatialStatus: "schematic",
  directionStatus: "teaching-only",
  note: "Clockwise and counterclockwise travel along elliptical tracks is a schematic teaching animation. Quantum electrons do not orbit the nucleus like planets.",
});

function assertIntegerInRange(value, minimum, maximum, label) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new RangeError(`${label} must be an integer from ${minimum} to ${maximum}; received ${value}.`);
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function greatestCommonDivisor(a, b) {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right) [left, right] = [right, left % right];
  return left;
}

function coprimeStride(count) {
  if (count <= 2) return 1;
  let stride = Math.max(1, Math.floor(count * 0.6180339887498948));
  if (stride % 2 === 0) stride += 1;
  while (greatestCommonDivisor(stride, count) !== 1) stride += 2;
  return stride;
}

function vectorLength(vector) {
  return Math.hypot(vector[0], vector[1], vector[2]);
}

function normalize(vector) {
  const length = vectorLength(vector);
  if (length <= EPSILON) throw new RangeError("Cannot normalize a zero-length vector.");
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function recommendedNucleusRadius(totalCount) {
  return 0.55 + 0.22 * Math.cbrt(totalCount);
}

/**
 * Produces exact, spatially mixed proton/neutron instance positions.
 *
 * Positions are centered, deterministic, and distributed through a sphere by
 * combining a cubic radial law with a permuted Fibonacci direction sequence.
 * The distribution is visual packing only; see NUCLEUS_LAYOUT_TRUTH.
 */
export function createNucleonLayout({ protonCount, neutronCount, radius } = {}) {
  assertIntegerInRange(protonCount, 0, MAX_RENDER_NUCLEONS, "protonCount");
  assertIntegerInRange(neutronCount, 0, MAX_RENDER_NUCLEONS, "neutronCount");

  const totalCount = protonCount + neutronCount;
  assertIntegerInRange(totalCount, 1, MAX_RENDER_NUCLEONS, "total nucleon count");

  const visualRadius = radius ?? recommendedNucleusRadius(totalCount);
  if (!Number.isFinite(visualRadius) || visualRadius <= 0) {
    throw new RangeError(`radius must be a positive finite number; received ${visualRadius}.`);
  }

  const nucleonRadius = clamp(visualRadius * 0.6 / Math.cbrt(totalCount), 0.105, 0.32);
  const centerRadius = Math.max(0, visualRadius - nucleonRadius);
  const packed = new Float64Array(totalCount * 3);

  if (totalCount > 1) {
    const stride = coprimeStride(totalCount);
    for (let index = 0; index < totalCount; index += 1) {
      const directionIndex = (index * stride) % totalCount;
      const radialFraction = Math.cbrt((index + 0.5) / totalCount);
      const z = 1 - 2 * ((directionIndex + 0.5) / totalCount);
      const planarRadius = Math.sqrt(Math.max(0, 1 - z * z));
      const azimuth = directionIndex * GOLDEN_ANGLE;
      const offset = index * 3;
      packed[offset] = Math.cos(azimuth) * planarRadius * radialFraction;
      packed[offset + 1] = z * radialFraction;
      packed[offset + 2] = Math.sin(azimuth) * planarRadius * radialFraction;
    }

    // Remove the small finite-sample bias so every isotope is centered exactly
    // before scaling it into the requested visual radius.
    const centroid = [0, 0, 0];
    for (let index = 0; index < packed.length; index += 3) {
      centroid[0] += packed[index];
      centroid[1] += packed[index + 1];
      centroid[2] += packed[index + 2];
    }
    centroid[0] /= totalCount;
    centroid[1] /= totalCount;
    centroid[2] /= totalCount;

    let maximumDistance = 0;
    for (let index = 0; index < packed.length; index += 3) {
      packed[index] -= centroid[0];
      packed[index + 1] -= centroid[1];
      packed[index + 2] -= centroid[2];
      maximumDistance = Math.max(
        maximumDistance,
        Math.hypot(packed[index], packed[index + 1], packed[index + 2]),
      );
    }

    const scale = maximumDistance > EPSILON ? centerRadius / maximumDistance : 0;
    for (let index = 0; index < packed.length; index += 1) packed[index] *= scale;
  }

  const positions = new Float32Array(packed);
  const types = new Uint8Array(totalCount); // 1 = proton, 0 = neutron
  const protonPositions = new Float32Array(protonCount * 3);
  const neutronPositions = new Float32Array(neutronCount * 3);
  let protonOffset = 0;
  let neutronOffset = 0;
  let protonAccumulator = Math.floor(totalCount / 2);

  // A balanced accumulator avoids placing all protons in the center and all
  // neutrons at the edge while guaranteeing the exact requested counts.
  for (let index = 0; index < totalCount; index += 1) {
    protonAccumulator += protonCount;
    const isProton = protonAccumulator >= totalCount;
    if (isProton) protonAccumulator -= totalCount;
    types[index] = isProton ? 1 : 0;

    const sourceOffset = index * 3;
    if (isProton) {
      protonPositions.set(positions.subarray(sourceOffset, sourceOffset + 3), protonOffset);
      protonOffset += 3;
    } else {
      neutronPositions.set(positions.subarray(sourceOffset, sourceOffset + 3), neutronOffset);
      neutronOffset += 3;
    }
  }

  return Object.freeze({
    protonCount,
    neutronCount,
    totalCount,
    radius: visualRadius,
    centerRadius,
    nucleonRadius,
    positions,
    types,
    protonPositions,
    neutronPositions,
    truth: NUCLEUS_LAYOUT_TRUTH,
  });
}

/** Returns a point on an orbit without importing or allocating Three.js types. */
export function pointOnShellOrbit(orbit, angle, target = new Float32Array(3)) {
  if (!orbit?.center || !orbit?.majorAxis || !orbit?.minorAxis) {
    throw new TypeError("orbit must be a descriptor returned by createShellOrbitDescriptors().");
  }
  if (!Number.isFinite(angle)) throw new RangeError(`angle must be finite; received ${angle}.`);
  if (!target || target.length < 3) throw new TypeError("target must provide at least three numeric slots.");

  const majorScale = Math.cos(angle) * orbit.semiMajor;
  const minorScale = Math.sin(angle) * orbit.semiMinor;
  for (let axis = 0; axis < 3; axis += 1) {
    target[axis] = orbit.center[axis]
      + orbit.majorAxis[axis] * majorScale
      + orbit.minorAxis[axis] * minorScale;
  }
  return target;
}

/**
 * Creates centered elliptical teaching tracks and exact per-shell occupancies.
 * Alternating directions are decorative and explicitly marked schematic.
 */
export function createShellOrbitDescriptors(shellOccupancies, options = {}) {
  if (!Array.isArray(shellOccupancies) || shellOccupancies.length < 1 || shellOccupancies.length > 7) {
    throw new RangeError("shellOccupancies must contain one to seven occupied principal shells.");
  }
  shellOccupancies.forEach((count, index) => {
    assertIntegerInRange(count, 1, 32, `shellOccupancies[${index}]`);
  });

  const electronTotal = shellOccupancies.reduce((sum, count) => sum + count, 0);
  if (options.expectedElectronCount !== undefined && electronTotal !== options.expectedElectronCount) {
    throw new RangeError(`Shell occupancies total ${electronTotal}; expected ${options.expectedElectronCount}.`);
  }

  const nucleusRadius = options.nucleusRadius ?? 0.9;
  if (!Number.isFinite(nucleusRadius) || nucleusRadius <= 0) {
    throw new RangeError(`nucleusRadius must be positive and finite; received ${nucleusRadius}.`);
  }
  const trackSegments = options.trackSegments ?? 96;
  assertIntegerInRange(trackSegments, 24, 512, "trackSegments");
  const baseAngularSpeed = options.baseAngularSpeed ?? 0.24;
  if (!Number.isFinite(baseAngularSpeed) || baseAngularSpeed < 0) {
    throw new RangeError(`baseAngularSpeed must be finite and non-negative; received ${baseAngularSpeed}.`);
  }

  const innerRadius = options.innerRadius ?? nucleusRadius + Math.max(0.58, nucleusRadius * 0.3);
  const naturalOuterRadius = innerRadius + Math.max(0, shellOccupancies.length - 1) * 0.62;
  const maxOrbitRadius = options.maxOrbitRadius ?? naturalOuterRadius;
  if (!Number.isFinite(innerRadius) || innerRadius <= nucleusRadius) {
    throw new RangeError("innerRadius must be finite and larger than nucleusRadius.");
  }
  if (!Number.isFinite(maxOrbitRadius) || maxOrbitRadius < innerRadius) {
    throw new RangeError("maxOrbitRadius must be finite and no smaller than innerRadius.");
  }

  const radiusStep = shellOccupancies.length === 1
    ? 0
    : (maxOrbitRadius - innerRadius) / (shellOccupancies.length - 1);

  return Object.freeze(shellOccupancies.map((electronCount, index) => {
    const shellNumber = index + 1;
    const semiMajor = innerRadius + radiusStep * index;
    const semiMinor = semiMajor * (0.72 + 0.035 * (index % 3));
    const azimuth = 0.37 + index * 1.137;
    const polarTilt = 0.44 + 0.07 * (index % 3);
    const normal = normalize([
      Math.sin(polarTilt) * Math.cos(azimuth),
      Math.sin(polarTilt) * Math.sin(azimuth),
      Math.cos(polarTilt),
    ]);
    const reference = Math.abs(normal[1]) < 0.94 ? [0, 1, 0] : [1, 0, 0];
    const majorAxis = normalize(cross(reference, normal));
    const minorAxis = normalize(cross(normal, majorAxis));
    const center = Object.freeze([0, 0, 0]);
    const phaseOffset = (index * 0.371) % TAU;
    const directionSign = index % 2 === 0 ? -1 : 1;
    const direction = directionSign < 0 ? "clockwise" : "counterclockwise";
    const angularSpeed = directionSign * baseAngularSpeed / Math.sqrt(shellNumber);
    const electronPhases = new Float32Array(electronCount);
    for (let electron = 0; electron < electronCount; electron += 1) {
      electronPhases[electron] = phaseOffset + electron / electronCount * TAU;
    }

    const orbit = {
      shellNumber,
      electronCount,
      center,
      semiMajor,
      semiMinor,
      majorAxis: Object.freeze(majorAxis),
      minorAxis: Object.freeze(minorAxis),
      normal: Object.freeze(normal),
      direction,
      directionSign,
      angularSpeed,
      phaseOffset,
      electronPhases,
      trackSegments,
      trackPoints: null,
      motion: ELECTRON_TRACK_MOTION,
    };

    const trackPoints = new Float32Array(trackSegments * 3);
    const point = new Float32Array(3);
    for (let segment = 0; segment < trackSegments; segment += 1) {
      pointOnShellOrbit(orbit, segment / trackSegments * TAU, point);
      trackPoints.set(point, segment * 3);
    }
    orbit.trackPoints = trackPoints;
    return Object.freeze(orbit);
  }));
}

/** Builds the complete pure-data geometry packet for one neutral isotope. */
export function createIsotopeGeometry({
  atomicNumber,
  massNumber,
  shellOccupancies,
  nucleusRadius,
  maxOrbitRadius,
  trackSegments,
  baseAngularSpeed,
} = {}) {
  assertIntegerInRange(atomicNumber, 1, 118, "atomicNumber");
  assertIntegerInRange(massNumber, atomicNumber, MAX_RENDER_NUCLEONS, "massNumber");

  const neutronCount = massNumber - atomicNumber;
  const nucleus = createNucleonLayout({
    protonCount: atomicNumber,
    neutronCount,
    radius: nucleusRadius,
  });
  const orbits = createShellOrbitDescriptors(shellOccupancies, {
    expectedElectronCount: atomicNumber,
    nucleusRadius: nucleus.radius,
    maxOrbitRadius,
    trackSegments,
    baseAngularSpeed,
  });

  return Object.freeze({
    isotope: Object.freeze({
      atomicNumber,
      massNumber,
      protonCount: atomicNumber,
      neutronCount,
      electronCount: atomicNumber,
    }),
    nucleus,
    orbits,
    truth: Object.freeze({
      countsExact: true,
      neutralAtomAssumption: true,
      nucleus: NUCLEUS_LAYOUT_TRUTH,
      electronMotion: ELECTRON_TRACK_MOTION,
    }),
  });
}
