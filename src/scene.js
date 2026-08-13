import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createIsotopeGeometry, pointOnShellOrbit } from "./atom-geometry.js";
import { PARTICLE_COLORS, atomColor } from "./chemistry-colors.js";

const ATOM_RADII = Object.freeze({ H: 0.26, C: 0.49, N: 0.47, O: 0.44, P: 0.57, S: 0.56 });
const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
const easeOutCubic = (value) => 1 - Math.pow(1 - value, 3);
const easeInOutCubic = (value) => value < 0.5 ? 4 * value ** 3 : 1 - Math.pow(-2 * value + 2, 3) / 2;

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function safeColor(value, fallback = "#446fb6") {
  try {
    return new THREE.Color(value || fallback);
  } catch {
    return new THREE.Color(fallback);
  }
}

function materialList(material) {
  return Array.isArray(material) ? material : [material];
}

function rememberOpacity(group) {
  group.traverse((object) => {
    if (!object.material) return;
    materialList(object.material).forEach((material) => {
      material.transparent = true;
      material.userData.baseOpacity = material.opacity;
      material.userData.baseDepthWrite = material.depthWrite;
    });
  });
}

function setOpacity(group, value) {
  group.traverse((object) => {
    if (!object.material) return;
    materialList(object.material).forEach((material) => {
      const baseOpacity = material.userData.baseOpacity ?? 1;
      material.opacity = baseOpacity * value;
      material.depthWrite = (material.userData.baseDepthWrite ?? true) && value > 0.72;
    });
  });
}

function disposeGroup(group) {
  group.traverse((object) => {
    object.geometry?.dispose?.();
    if (!object.material) return;
    materialList(object.material).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) value.dispose();
      });
      material.dispose?.();
    });
  });
}

function makeHaloTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,.9)");
  gradient.addColorStop(0.22, "rgba(255,231,151,.42)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeParticleGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const context = canvas.getContext("2d");
  const gradient = context.createRadialGradient(48, 48, 2, 48, 48, 48);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.16, "rgba(255,255,255,.82)");
  gradient.addColorStop(0.52, "rgba(255,255,255,.22)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 96, 96);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeLabelSprite(text, options = {}) {
  const size = 160;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, size, size);
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.31, 0, Math.PI * 2);
  context.fillStyle = options.disc ?? "rgba(35,39,52,.78)";
  context.fill();
  context.font = `700 ${text.length > 1 ? 46 : 58}px ui-sans-serif, system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = options.color ?? "#fffdf7";
  context.fillText(text, size / 2, size / 2 + 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, opacity: 0.96 });
  material.userData.baseOpacity = 0.96;
  const sprite = new THREE.Sprite(material);
  const scale = options.scale ?? 0.64;
  sprite.scale.set(scale, scale, 1);
  sprite.renderOrder = 8;
  sprite.userData.isAtomLabel = true;
  return sprite;
}

function cylinderBetween(start, end, radius, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, 18, 1, false);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}

function addBondMeshes(group, start, end, bond, material) {
  if (bond.representation !== "double") {
    const bondMaterial = material.clone();
    if (bond.representation === "resonance-equivalent") {
      bondMaterial.transparent = true;
      bondMaterial.opacity = 0.58;
      bondMaterial.userData.baseOpacity = 0.58;
    }
    const radius = bond.representation === "resonance-equivalent" ? 0.095 : 0.082;
    const cylinder = cylinderBetween(start, end, radius, bondMaterial);
    cylinder.castShadow = false;
    cylinder.userData.bondRepresentation = bond.representation;
    group.add(cylinder);
    return;
  }

  const direction = new THREE.Vector3().subVectors(end, start).normalize();
  const reference = Math.abs(direction.z) < 0.92 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const offset = new THREE.Vector3().crossVectors(direction, reference).normalize().multiplyScalar(0.075);
  [-1, 1].forEach((sign) => {
    const cylinder = cylinderBetween(
      start.clone().addScaledVector(offset, sign),
      end.clone().addScaledVector(offset, sign),
      0.055,
      material.clone(),
    );
    cylinder.castShadow = false;
    group.add(cylinder);
  });
}

export class ElementStage {
  constructor(mount, { onFallback, elementMap } = {}) {
    this.mount = mount;
    this.onFallback = onFallback;
    this.elementMap = elementMap;
    this.current = null;
    this.pending = null;
    this.transitionId = 0;
    this.motionEnabled = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.labelsVisible = true;
    this.visible = !document.hidden;
    this.userInteracting = false;
    this.destroyed = false;

    try {
      this.setup();
      this.ready = true;
    } catch (error) {
      console.error("Three.js stage could not start", error);
      this.ready = false;
      this.mount.classList.add("has-webgl-fallback");
      this.onFallback?.(error);
    }
  }

  setup() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(31, 1, 0.1, 80);
    this.camera.position.set(0.35, 1.05, 10);

    this.renderer = new THREE.WebGLRenderer({
      antialias: window.devicePixelRatio <= 1.5,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.2 : 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.97;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = "three-canvas";
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.mount.prepend(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 28;
    this.controls.minPolarAngle = 0.45;
    this.controls.maxPolarAngle = Math.PI - 0.45;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener("start", () => { this.userInteracting = true; });
    this.controls.addEventListener("end", () => { this.userInteracting = false; });

    const hemisphere = new THREE.HemisphereLight(0xf8f3e8, 0x37405e, 1.18);
    this.scene.add(hemisphere);

    const key = new THREE.DirectionalLight(0xfff4d6, 3.35);
    key.position.set(-5.5, 7.5, 7.5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    this.scene.add(key);

    const rim = new THREE.PointLight(0x6f85ff, 8.5, 20, 2);
    rim.position.set(5.5, 1.5, -4);
    this.scene.add(rim);

    const warm = new THREE.PointLight(0xffc46b, 3.8, 18, 2);
    warm.position.set(-4, -2, 4);
    this.scene.add(warm);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(6.2, 64),
      new THREE.ShadowMaterial({ color: 0x596074, opacity: 0.12, transparent: true }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -3.15;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.mount);
    this.resize();

    this.visibilityHandler = () => { this.visible = !document.hidden; };
    document.addEventListener("visibilitychange", this.visibilityHandler);
    this.contextLostHandler = (event) => {
      event.preventDefault();
      this.mount.classList.add("has-webgl-fallback");
      this.onFallback?.(new Error("WebGL context lost"));
    };
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLostHandler, false);

    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this.animate();
  }

  resize() {
    if (!this.renderer) return;
    const width = Math.max(1, this.mount.clientWidth);
    const height = Math.max(1, this.mount.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  }

  animate() {
    if (this.destroyed || !this.renderer) return;
    this.animationFrame = requestAnimationFrame(() => this.animate());
    this.timer.update();
    const delta = Math.min(this.timer.getDelta(), 0.05);
    const elapsed = this.timer.getElapsed();

    if (this.visible) {
      if (this.motionEnabled && !this.userInteracting && this.current) {
        if (this.current.userData.kind !== "atom") this.current.rotation.y += delta * 0.085;
        this.current.userData.update?.(elapsed, delta);
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
  }

  showAtom(element, shells, accent, composition) {
    if (!this.ready) return Promise.resolve(false);
    return this.transitionTo(() => this.createAtomGroup(element, shells, accent, composition), "atom");
  }

  showMolecule(structure, accent) {
    if (!this.ready) return Promise.resolve(false);
    return this.transitionTo(() => this.createMoleculeGroup(structure, accent), "molecule");
  }

  showElementPattern(element, shells, pattern, accent) {
    if (!this.ready) return Promise.resolve(false);
    return this.transitionTo(() => this.createElementPatternGroup(element, shells, pattern, accent), "conceptual-pattern");
  }

  async transitionTo(factory, kind) {
    const token = ++this.transitionId;
    if (this.pending && this.pending !== this.current) {
      this.scene.remove(this.pending);
      disposeGroup(this.pending);
    }
    this.pending = null;

    if (this.current) {
      this.current.position.set(0, 0, 0);
      this.current.scale.setScalar(1);
      setOpacity(this.current, 1);
    }

    const incoming = factory();
    incoming.userData.kind = kind;
    rememberOpacity(incoming);
    incoming.position.set(3.4, 0.05, -0.9);
    incoming.scale.setScalar(0.82);
    setOpacity(incoming, 0);
    this.scene.add(incoming);
    this.pending = incoming;

    const outgoing = this.current;
    if (this.reducedMotion || !outgoing) {
      if (outgoing) {
        this.scene.remove(outgoing);
        disposeGroup(outgoing);
      }
      this.commitIncoming(incoming);
      this.applyFittedCamera(incoming, false);
      return true;
    }

    await this.tween(220, token, (progress) => {
      const eased = easeInOutCubic(progress);
      outgoing.position.x = -2.8 * eased;
      outgoing.position.z = -0.9 * eased;
      outgoing.scale.setScalar(1 - eased * 0.14);
      setOpacity(outgoing, 1 - eased);
    });

    if (token !== this.transitionId) {
      if (incoming.parent) this.scene.remove(incoming);
      disposeGroup(incoming);
      return false;
    }

    this.scene.remove(outgoing);
    disposeGroup(outgoing);
    this.current = incoming;
    this.pending = null;
    const cameraTarget = this.cameraFor(incoming);
    const cameraStart = this.camera.position.clone();

    await this.tween(520, token, (progress) => {
      const eased = easeOutCubic(progress);
      incoming.position.x = 3.4 * (1 - eased);
      incoming.position.y = 0.05 * (1 - eased);
      incoming.position.z = -0.9 * (1 - eased);
      incoming.scale.setScalar(0.82 + 0.18 * eased);
      setOpacity(incoming, eased);
      this.camera.position.lerpVectors(cameraStart, cameraTarget, eased);
      this.controls.target.lerp(new THREE.Vector3(0, 0, 0), 0.18);
    });

    if (token === this.transitionId) {
      incoming.position.set(0, 0, 0);
      incoming.scale.setScalar(1);
      setOpacity(incoming, 1);
      this.controls.update();
    }
    return token === this.transitionId;
  }

  commitIncoming(incoming) {
    this.current = incoming;
    this.pending = null;
    incoming.position.set(0, 0, 0);
    incoming.scale.setScalar(1);
    setOpacity(incoming, 1);
  }

  tween(duration, token, update) {
    return new Promise((resolve) => {
      const started = performance.now();
      const frame = (now) => {
        if (token !== this.transitionId || this.destroyed) {
          resolve(false);
          return;
        }
        const progress = clamp((now - started) / duration, 0, 1);
        update(progress);
        if (progress < 1) requestAnimationFrame(frame);
        else resolve(true);
      };
      requestAnimationFrame(frame);
    });
  }

  cameraFor(group) {
    const ignored = [];
    group.traverse((object) => {
      if (object.userData.ignoreCameraFit && object.visible) {
        ignored.push(object);
        object.visible = false;
      }
    });
    const box = new THREE.Box3().setFromObject(group);
    ignored.forEach((object) => { object.visible = true; });
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const verticalHalfFov = THREE.MathUtils.degToRad(this.camera.fov * 0.5);
    const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * Math.max(0.35, this.camera.aspect));
    const limitingHalfFov = Math.max(0.12, Math.min(verticalHalfFov, horizontalHalfFov));
    const fitPadding = group.userData.cameraFitPadding ?? 0.92;
    const minimumDistance = group.userData.cameraMinDistance ?? 5.4;
    const distance = clamp((sphere.radius / Math.sin(limitingHalfFov)) * fitPadding, minimumDistance, 25);
    return new THREE.Vector3(0.2, Math.min(0.68, sphere.radius * 0.1), distance);
  }

  applyFittedCamera(group, animate = true) {
    const target = this.cameraFor(group);
    if (!animate || this.reducedMotion) {
      this.camera.position.copy(target);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
      return;
    }
    const token = this.transitionId;
    const start = this.camera.position.clone();
    this.tween(360, token, (progress) => this.camera.position.lerpVectors(start, target, easeOutCubic(progress)));
  }

  resetCamera() {
    if (!this.current) return;
    this.current.rotation.set(0, 0, 0);
    this.applyFittedCamera(this.current, true);
  }

  setMotion(enabled) {
    this.motionEnabled = enabled && !this.reducedMotion;
  }

  setLabels(visible) {
    this.labelsVisible = visible;
    [this.current, this.pending].filter(Boolean).forEach((group) => {
      group.traverse((object) => {
        if (object.userData.isAtomLabel) object.visible = visible;
      });
    });
  }

  createElementPatternGroup(element, shells, pattern, accent) {
    const group = new THREE.Group();
    group.name = `pattern-${element.symbol}`;
    const sculpture = new THREE.Group();
    const rings = new THREE.Group();
    const random = seededRandom(element.atomicNumber * 7919 + shells.length * 101);
    const accentColor = safeColor(accent);
    const highlightColor = accentColor.clone().lerp(new THREE.Color("#f4d98b"), 0.42);
    const family = pattern.visualFamily;
    const outerShellElectrons = shells.at(-1) ?? 0;
    const points = [];

    if (family === "collective-field") {
      const count = 13 + (element.atomicNumber % 5);
      for (let index = 0; index < count; index += 1) {
        const y = 1 - (index / Math.max(1, count - 1)) * 2;
        const radial = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = Math.PI * (3 - Math.sqrt(5)) * index + random() * 0.3;
        const radius = 2.05 + random() * 0.48;
        points.push(new THREE.Vector3(Math.cos(theta) * radial * radius, y * 2.12, Math.sin(theta) * radial * radius));
      }
    } else if (family === "connected-network") {
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          points.push(new THREE.Vector3(
            (column - 1.5) * 1.25,
            (row - 1) * 1.35,
            Math.sin(column * 1.7 + row + element.atomicNumber) * 0.78,
          ));
        }
      }
    } else if (family === "shared-electron-constellation") {
      points.push(new THREE.Vector3(0, 0, 0));
      const count = clamp(outerShellElectrons + 5, 8, 15);
      for (let index = 1; index < count; index += 1) {
        const side = index % 2 ? -1 : 1;
        const lane = Math.floor(index / 2);
        const angle = lane * 0.92 + element.atomicNumber * 0.04;
        points.push(new THREE.Vector3(
          side * (1.25 + Math.cos(angle) * 1.15),
          Math.sin(angle) * 2.05,
          Math.cos(angle * 1.3) * 0.92,
        ));
      }
    } else if (family === "near-full-shell-motif") {
      const capacity = 8;
      for (let index = 0; index < capacity - 1; index += 1) {
        const angle = ((index + 1) / capacity) * Math.PI * 2 - Math.PI / 2;
        points.push(new THREE.Vector3(Math.cos(angle) * 2.4, Math.sin(angle) * 2.4, Math.sin(angle * 2) * 0.5));
      }
    } else {
      const count = 5 + (element.atomicNumber % 2);
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * Math.PI * 2 + element.atomicNumber * 0.03;
        points.push(new THREE.Vector3(Math.cos(angle) * 2.55, Math.sin(angle) * 1.9, (index % 2 ? 1 : -1) * 0.72));
      }
    }

    const nodeGeometry = family === "connected-network"
      ? new THREE.OctahedronGeometry(0.43, 2)
      : new THREE.IcosahedronGeometry(0.43, 3);
    const materials = [0, 1, 2].map((index) => new THREE.MeshPhysicalMaterial({
      color: index === 1 ? highlightColor : accentColor.clone().lerp(new THREE.Color("#ffffff"), index * 0.09),
      roughness: 0.2 + index * 0.055,
      metalness: family === "collective-field" ? 0.32 : 0.08,
      clearcoat: 0.72,
      clearcoatRoughness: 0.18,
      iridescence: 0.18,
      emissive: accentColor,
      emissiveIntensity: 0.055,
    }));

    points.forEach((position, index) => {
      const node = new THREE.Mesh(nodeGeometry, materials[index % materials.length]);
      node.position.copy(position);
      const scale = index === 0 && family === "shared-electron-constellation" ? 1.42 : 0.74 + random() * 0.55;
      node.scale.setScalar(scale);
      node.castShadow = true;
      node.receiveShadow = true;
      sculpture.add(node);
    });

    const bondMaterial = new THREE.MeshStandardMaterial({
      color: accentColor.clone().lerp(new THREE.Color("#e9edf7"), 0.72),
      roughness: 0.34,
      metalness: 0.15,
      transparent: true,
      opacity: 0.72,
    });
    bondMaterial.userData.baseOpacity = 0.72;

    const connections = [];
    if (family === "collective-field") {
      for (let index = 1; index < points.length; index += 1) connections.push([index, Math.floor((index - 1) / 2)]);
    } else if (family === "connected-network") {
      for (let index = 0; index < points.length; index += 1) {
        if (index % 4) connections.push([index, index - 1]);
        if (index >= 4) connections.push([index, index - 4]);
      }
    } else if (family === "shared-electron-constellation") {
      for (let index = 1; index < points.length; index += 1) connections.push([0, index]);
    } else if (family === "near-full-shell-motif") {
      for (let index = 1; index < points.length; index += 1) connections.push([index - 1, index]);
    }

    connections.forEach(([from, to]) => {
      const bond = cylinderBetween(points[from], points[to], 0.052, bondMaterial.clone());
      bond.castShadow = false;
      sculpture.add(bond);
    });

    const ringCount = clamp(shells.length, 2, 4);
    for (let index = 0; index < ringCount; index += 1) {
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: index % 2 ? highlightColor : accentColor,
        transparent: true,
        opacity: 0.11 - index * 0.012,
        depthWrite: false,
      });
      ringMaterial.userData.baseOpacity = ringMaterial.opacity;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.75 + index * 0.42, 0.012, 6, 80), ringMaterial);
      ring.rotation.x = 0.72 + index * 0.34;
      ring.rotation.y = -0.52 + index * 0.3;
      rings.add(ring);
    }

    const markerGeometry = new THREE.IcosahedronGeometry(0.072, 2);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#fff5cf") });
    for (let index = 0; index < outerShellElectrons; index += 1) {
      const angle = (index / Math.max(1, outerShellElectrons)) * Math.PI * 2 + 0.35;
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(Math.cos(angle) * 3.08, Math.sin(angle) * 3.08, 0.12 * Math.sin(angle * 3));
      rings.add(marker);
    }

    const centralOrb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.7, 4),
      new THREE.MeshPhysicalMaterial({
        color: accentColor.clone().lerp(new THREE.Color("#ffffff"), 0.12),
        roughness: 0.16,
        metalness: 0.08,
        clearcoat: 0.85,
        clearcoatRoughness: 0.12,
        iridescence: 0.24,
        emissive: accentColor,
        emissiveIntensity: 0.08,
      }),
    );
    centralOrb.castShadow = true;
    sculpture.add(centralOrb);

    const label = makeLabelSprite(element.symbol, { scale: 0.92, disc: "rgba(24,29,43,.82)" });
    label.position.set(0, 0, 0.75);
    label.visible = this.labelsVisible;
    sculpture.add(label);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeHaloTexture(),
      color: accentColor,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    halo.material.userData.baseOpacity = 0.08;
    halo.userData.ignoreCameraFit = true;
    halo.scale.set(7.8, 7.8, 1);
    halo.position.z = -1.8;
    group.add(halo);
    group.add(rings, sculpture);

    sculpture.rotation.set(-0.24, 0.42, -0.08);
    group.userData.update = (_elapsed, delta) => {
      sculpture.rotation.y += delta * 0.045;
      rings.rotation.z -= delta * 0.024;
      rings.rotation.y += delta * 0.018;
    };
    return group;
  }

  createAtomGroup(element, shells, accent, composition) {
    const group = new THREE.Group();
    group.name = `atom-${element.symbol}-${composition.massNumber}`;
    const accentColor = safeColor(accent);
    const nucleusRadius = clamp(1.05 + Math.cbrt(composition.massNumber) * 0.3, 1.38, 2.72);
    const outerRadius = clamp(3.08 + Math.max(0, shells.length - 1) * 0.4, 3.08, 5.75);
    const geometryPacket = createIsotopeGeometry({
      atomicNumber: element.atomicNumber,
      massNumber: composition.massNumber,
      shellOccupancies: shells,
      nucleusRadius,
      maxOrbitRadius: outerRadius,
      trackSegments: window.innerWidth < 700 ? 64 : 96,
      baseAngularSpeed: 0.32,
    });
    group.userData.cameraFitPadding = 0.82;
    group.userData.cameraMinDistance = 5.4;

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeHaloTexture(),
      color: accentColor,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(geometryPacket.nucleus.radius * 4.8, geometryPacket.nucleus.radius * 4.8, 1);
    halo.position.z = -0.8;
    halo.material.userData.baseOpacity = 0.13;
    halo.userData.ignoreCameraFit = true;
    group.add(halo);

    const nucleus = new THREE.Group();
    nucleus.name = `exact-nucleus-${element.symbol}-${composition.massNumber}`;
    const particleGeometry = new THREE.IcosahedronGeometry(geometryPacket.nucleus.nucleonRadius, window.innerWidth < 700 ? 1 : 2);
    const protonMaterial = new THREE.MeshPhysicalMaterial({
      color: safeColor(PARTICLE_COLORS.proton),
      roughness: 0.24,
      metalness: 0.02,
      clearcoat: 0.7,
      clearcoatRoughness: 0.2,
      emissive: safeColor(PARTICLE_COLORS.proton),
      emissiveIntensity: 0.035,
    });
    const neutronMaterial = new THREE.MeshPhysicalMaterial({
      color: safeColor(PARTICLE_COLORS.neutron),
      roughness: 0.26,
      metalness: 0.02,
      clearcoat: 0.68,
      clearcoatRoughness: 0.21,
      emissive: safeColor(PARTICLE_COLORS.neutron),
      emissiveIntensity: 0.035,
    });
    const instanceMatrix = new THREE.Matrix4();

    const addNucleons = (positions, material, role) => {
      const count = positions.length / 3;
      if (!count) return;
      const mesh = new THREE.InstancedMesh(particleGeometry, material, count);
      mesh.name = `${role}-${count}`;
      mesh.userData.particleRole = role;
      for (let index = 0; index < count; index += 1) {
        const offset = index * 3;
        instanceMatrix.makeTranslation(positions[offset], positions[offset + 1], positions[offset + 2]);
        mesh.setMatrixAt(index, instanceMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      nucleus.add(mesh);
    };

    addNucleons(geometryPacket.nucleus.protonPositions, protonMaterial, "protons");
    addNucleons(geometryPacket.nucleus.neutronPositions, neutronMaterial, "neutrons");
    nucleus.rotation.set(-0.16, 0.32, -0.04);
    group.add(nucleus);

    const electronGeometry = new THREE.IcosahedronGeometry(window.innerWidth < 700 ? 0.125 : 0.14, 2);
    const electronMaterial = new THREE.MeshPhysicalMaterial({
      color: safeColor(PARTICLE_COLORS.electron),
      roughness: 0.18,
      metalness: 0.01,
      clearcoat: 0.72,
      clearcoatRoughness: 0.15,
      emissive: safeColor(PARTICLE_COLORS.electron),
      emissiveIntensity: 0.28,
    });
    const ringColor = accentColor.clone().lerp(new THREE.Color("#596a91"), 0.38);
    const electronGlowTexture = makeParticleGlowTexture();
    const orbiters = [];
    const electronPoint = new Float32Array(3);
    const electronPosition = new THREE.Vector3();

    geometryPacket.orbits.forEach((orbit, orbitIndex) => {
      const ringGeometry = new THREE.BufferGeometry();
      ringGeometry.setAttribute("position", new THREE.BufferAttribute(orbit.trackPoints, 3));
      const ringMaterial = new THREE.LineBasicMaterial({
        color: ringColor.clone().lerp(new THREE.Color("#ffffff"), orbitIndex * 0.035),
        transparent: true,
        opacity: clamp(0.56 - orbitIndex * 0.035, 0.28, 0.56),
        depthWrite: false,
      });
      ringMaterial.userData.baseOpacity = ringMaterial.opacity;
      const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
      ring.name = `shell-${orbit.shellNumber}-${orbit.direction}`;
      group.add(ring);

      const electrons = new THREE.InstancedMesh(electronGeometry, electronMaterial.clone(), orbit.electronCount);
      electrons.name = `shell-${orbit.shellNumber}-electrons-${orbit.electronCount}`;
      electrons.castShadow = false;
      electrons.userData.orbit = orbit;

      const glowPositions = new Float32Array(orbit.electronCount * 3);
      const glowGeometry = new THREE.BufferGeometry();
      glowGeometry.setAttribute("position", new THREE.BufferAttribute(glowPositions, 3));
      const glowMaterial = new THREE.PointsMaterial({
        map: electronGlowTexture,
        color: safeColor(PARTICLE_COLORS.electron).lerp(new THREE.Color("#ffffff"), 0.18),
        size: window.innerWidth < 700 ? 0.46 : 0.54,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.62,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        alphaTest: 0.015,
      });
      glowMaterial.userData.baseOpacity = 0.62;
      const glows = new THREE.Points(glowGeometry, glowMaterial);
      glows.name = `shell-${orbit.shellNumber}-electron-glow`;
      glows.renderOrder = 4;

      const trailSteps = window.innerWidth < 700 ? 2 : 4;
      const trailPositions = new Float32Array(orbit.electronCount * trailSteps * 3);
      const trailGeometry = new THREE.BufferGeometry();
      trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
      const trailMaterial = new THREE.PointsMaterial({
        map: electronGlowTexture,
        color: safeColor(PARTICLE_COLORS.electron),
        size: window.innerWidth < 700 ? 0.16 : 0.2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        alphaTest: 0.01,
      });
      trailMaterial.userData.baseOpacity = 0.2;
      const trails = new THREE.Points(trailGeometry, trailMaterial);
      trails.name = `shell-${orbit.shellNumber}-schematic-trails`;
      electrons.userData.updateMatrices = (elapsed) => {
        for (let index = 0; index < orbit.electronCount; index += 1) {
          const angle = orbit.electronPhases[index] + elapsed * orbit.angularSpeed;
          pointOnShellOrbit(orbit, angle, electronPoint);
          electronPosition.set(electronPoint[0], electronPoint[1], electronPoint[2]);
          instanceMatrix.makeTranslation(electronPosition.x, electronPosition.y, electronPosition.z);
          electrons.setMatrixAt(index, instanceMatrix);
          glowPositions.set(electronPoint, index * 3);

          for (let trailIndex = 0; trailIndex < trailSteps; trailIndex += 1) {
            const trailAngle = angle - Math.sign(orbit.angularSpeed || 1) * (trailIndex + 1) * 0.045;
            pointOnShellOrbit(orbit, trailAngle, electronPoint);
            trailPositions.set(electronPoint, (index * trailSteps + trailIndex) * 3);
          }
        }
        electrons.instanceMatrix.needsUpdate = true;
        glowGeometry.attributes.position.needsUpdate = true;
        trailGeometry.attributes.position.needsUpdate = true;
      };
      electrons.userData.updateMatrices(0);
      group.add(trails, glows, electrons);
      orbiters.push(electrons);
    });

    group.userData.truth = geometryPacket.truth;
    group.userData.update = (elapsed, delta) => {
      orbiters.forEach((electrons) => electrons.userData.updateMatrices(elapsed));
      nucleus.rotation.y += delta * 0.052;
      nucleus.rotation.x += delta * 0.009;
    };
    return group;
  }

  createMoleculeGroup(structure, accent) {
    const group = new THREE.Group();
    group.name = `molecule-${structure.id}`;
    group.userData.cameraFitPadding = 0.76;
    group.userData.cameraMinDistance = 4.7;
    const atomMap = new Map();
    const center = new THREE.Vector3();
    structure.atoms.forEach((atom) => center.add(new THREE.Vector3(...atom.position)));
    center.multiplyScalar(1 / structure.atoms.length);

    structure.atoms.forEach((atom) => {
      const position = new THREE.Vector3(...atom.position).sub(center);
      atomMap.set(atom.id, position);
    });

    structure.bonds.forEach((bond) => {
      const start = atomMap.get(bond.from);
      const end = atomMap.get(bond.to);
      if (!start || !end) return;
      const startSymbol = structure.atoms.find(({ id }) => id === bond.from)?.symbol;
      const endSymbol = structure.atoms.find(({ id }) => id === bond.to)?.symbol;
      const middle = start.clone().lerp(end, 0.5);
      const makeBondMaterial = (symbol) => new THREE.MeshPhysicalMaterial({
        color: safeColor(atomColor(symbol, this.elementMap), "#c2c6d2").lerp(new THREE.Color("#d8dce6"), 0.58),
        roughness: 0.3,
        metalness: 0.18,
        clearcoat: 0.38,
        clearcoatRoughness: 0.3,
      });
      const startMaterial = makeBondMaterial(startSymbol);
      const endMaterial = makeBondMaterial(endSymbol);
      addBondMeshes(group, start, middle, bond, startMaterial);
      addBondMeshes(group, middle, end, bond, endMaterial);
      startMaterial.dispose();
      endMaterial.dispose();
    });

    structure.atoms.forEach((atom, index) => {
      const color = atomColor(atom.symbol, this.elementMap);
      const material = new THREE.MeshPhysicalMaterial({
        color: safeColor(color),
        roughness: 0.27,
        metalness: 0.02,
        clearcoat: 0.58,
        clearcoatRoughness: 0.22,
        emissive: safeColor(color).multiplyScalar(0.22),
        emissiveIntensity: 0.03,
      });
      const radius = ATOM_RADII[atom.symbol] ?? 0.55;
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, window.innerWidth < 700 ? 2 : 3), material);
      mesh.position.copy(atomMap.get(atom.id));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      const label = makeLabelSprite(atom.symbol, {
        scale: radius * 0.94,
        disc: atom.symbol === "H" ? "rgba(41,45,55,.72)" : "rgba(41,45,55,.62)",
      });
      label.position.copy(mesh.position).add(new THREE.Vector3(0, 0, radius * 1.02));
      label.visible = this.labelsVisible;
      label.userData.atomIndex = index;
      group.add(label);
    });

    const aura = new THREE.Sprite(new THREE.SpriteMaterial({
      map: makeHaloTexture(),
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      color: safeColor(accent || "#d4ac3d"),
    }));
    aura.material.userData.baseOpacity = 0.08;
    aura.userData.ignoreCameraFit = true;
    const spread = new THREE.Box3().setFromObject(group).getBoundingSphere(new THREE.Sphere()).radius;
    aura.scale.setScalar(Math.max(4.2, spread * 2.25));
    aura.position.z = -1.4;
    group.add(aura);

    group.rotation.x = structure.id === "s8-crown" ? -0.46 : -0.18;
    group.userData.update = (_elapsed, delta) => {
      if (structure.id === "s8-crown") group.rotation.z += delta * 0.018;
    };
    return group;
  }

  destroy() {
    this.destroyed = true;
    this.transitionId += 1;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    document.removeEventListener("visibilitychange", this.visibilityHandler);
    this.renderer?.domElement.removeEventListener("webglcontextlost", this.contextLostHandler);
    this.controls?.dispose();
    this.timer?.dispose();
    if (this.current) disposeGroup(this.current);
    if (this.pending && this.pending !== this.current) disposeGroup(this.pending);
    this.renderer?.dispose();
    this.renderer?.domElement.remove();
  }
}
