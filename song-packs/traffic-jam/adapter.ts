// @ts-nocheck

const DEFAULT_DESIGN = {
  assets: {
    vehicleProxies: "assets/vehicle-proxies.json"
  },
  scenes: {
    chorus: [
      { start: 41.1, end: 56.6, intensity: 1 },
      { start: 101.1, end: 116.8, intensity: 1 },
      { start: 164.8, end: 179.6, intensity: 1 }
    ],
    bashing: [
      { start: 41.1, end: 56.6, intensity: 0.95 },
      { start: 101.1, end: 116.8, intensity: 1 },
      { start: 164.8, end: 179.6, intensity: 1 }
    ],
    interlude: [{ start: 146.3, end: 159.3, intensity: 1 }]
  },
  impacts: [
    { time: 41.1, kind: "stamp", intensity: 1 },
    { time: 101.1, kind: "stamp", intensity: 1 },
    { time: 158.9, kind: "align", intensity: 0.9 },
    { time: 164.8, kind: "stamp", intensity: 1 }
  ],
  labels: ["FAULT", "STOP", "NOTICE", "EVIDENCE", "WATCH", "QUEUE", "SIGNAL", "NO EXIT"]
};

const DEFAULT_VEHICLE_MODELS = [
  { id: "sedan", kind: "sedan", color: "graphite", width: 1.12, length: 1.95, height: 0.72 },
  { id: "taxi", kind: "taxi", color: "amber", width: 1.12, length: 2.08, height: 0.78 },
  { id: "police", kind: "police", color: "cream", width: 1.14, length: 2.02, height: 0.76 },
  { id: "hatchback-sports", kind: "hatchback", color: "red", width: 1.08, length: 1.86, height: 0.68 },
  { id: "suv", kind: "suv", color: "olive", width: 1.18, length: 2.08, height: 0.86 },
  { id: "race", kind: "race", color: "red", width: 1.08, length: 1.86, height: 0.58 },
  { id: "van", kind: "van", color: "road", width: 1.18, length: 2.18, height: 0.92 },
  { id: "delivery", kind: "delivery", color: "cream", width: 1.2, length: 2.45, height: 1 },
  { id: "firetruck", kind: "firetruck", color: "red", width: 1.22, length: 2.48, height: 1.02 },
  { id: "garbage-truck", kind: "garbage", color: "olive", width: 1.24, length: 2.62, height: 1.04 },
  { id: "truck-flat", kind: "truck", color: "graphite", width: 1.18, length: 2.32, height: 0.88 }
];

const VEHICLE_PROFILES = {
  sedan: { cabin: 0.38, cabinOffset: -0.08, cabinHeight: 0.42, hood: 0.32, rear: 0.3, wheelScale: 1 },
  taxi: { cabin: 0.42, cabinOffset: -0.06, cabinHeight: 0.44, hood: 0.3, rear: 0.28, wheelScale: 1, roofSign: true },
  police: { cabin: 0.42, cabinOffset: -0.04, cabinHeight: 0.43, hood: 0.3, rear: 0.28, wheelScale: 1, lightBar: true, stripe: true },
  hatchback: { cabin: 0.46, cabinOffset: -0.16, cabinHeight: 0.4, hood: 0.28, rear: 0.18, wheelScale: 0.95 },
  suv: { cabin: 0.5, cabinOffset: -0.08, cabinHeight: 0.5, hood: 0.26, rear: 0.28, wheelScale: 1.06, stripe: true },
  race: { cabin: 0.28, cabinOffset: -0.1, cabinHeight: 0.28, hood: 0.46, rear: 0.24, wheelScale: 0.92, spoiler: true },
  van: { box: true, cabin: 0.58, cabinOffset: -0.04, cabinHeight: 0.56, hood: 0.16, wheelScale: 1.02 },
  delivery: { cargo: true, cabin: 0.34, cabinOffset: 0.34, cabinHeight: 0.48, cargoLength: 0.52, wheelScale: 1.04, stripe: true },
  firetruck: { cargo: true, cabin: 0.34, cabinOffset: 0.34, cabinHeight: 0.5, cargoLength: 0.56, wheelScale: 1.08, lightBar: true, stripe: true },
  garbage: { cargo: true, cabin: 0.32, cabinOffset: 0.38, cabinHeight: 0.48, cargoLength: 0.6, wheelScale: 1.12, stripe: true },
  truck: { truck: true, cabin: 0.32, cabinOffset: 0.34, cabinHeight: 0.46, bedLength: 0.56, wheelScale: 1.06 }
};

const FOV_RADIANS = Math.PI / 3;
const TAU = Math.PI * 2;
const FLOOR_Y = -0.82;
const THEME = {
  ink: [13, 13, 11],
  asphalt: [48, 48, 48],
  road: [47, 46, 24],
  gold: [192, 168, 24],
  ocher: [216, 184, 42],
  paper: [240, 238, 218],
  olive: [24, 48, 24],
  rust: [178, 53, 38],
  wine: [73, 31, 27]
};

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (edge0, edge1, value) => {
  const t = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const pulse = (age, decay) => (age < 0 ? 0 : Math.exp(-age * decay));
const fract = (value) => value - Math.floor(value);
const rgba = (name, alpha = 1) => `rgba(${THEME[name].join(",")},${alpha})`;
const rgb = (name) => `rgb(${THEME[name].join(",")})`;
const depthFactor = (z) => clamp((z - 11) / 22);
const depthAlpha = (z, alpha, strength = 0.38) => alpha * (1 - depthFactor(z) * strength);
const localPoint = (center, yaw, x, y, z) => {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  return {
    x: center.x + x * cos - z * sin,
    y: center.y + y,
    z: center.z + x * sin + z * cos
  };
};

const hash = (seed) => {
  let value = seed >>> 0;
  return () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    return ((value >>> 0) % 10000) / 10000;
  };
};

const rangeValue = (time, ranges, fade = 1.2) => {
  let value = 0;
  for (const range of ranges ?? []) {
    const inValue = smoothstep(range.start, range.start + fade, time);
    const outValue = 1 - smoothstep(range.end - fade, range.end, time);
    value = Math.max(value, inValue * outValue * (range.intensity ?? 1));
  }
  return clamp(value);
};

const latestPulse = (time, items, decay, kind = null) => {
  let value = 0;
  for (const item of items ?? []) {
    if (kind && item.kind !== kind) continue;
    value = Math.max(value, pulse(time - item.time, decay) * (item.intensity ?? 1));
  }
  return value;
};

const findBeat = (time, beats) => {
  let lo = 0;
  let hi = beats.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid].time <= time) lo = mid + 1;
    else hi = mid - 1;
  }
  const index = Math.max(0, hi);
  return { index, beat: beats[index] };
};

const loadDesign = async (context) => {
  const effectPath = context.manifest.design?.effect;
  if (!effectPath) return DEFAULT_DESIGN;
  try {
    const design = await context.assets.readJson(effectPath);
    return design ? { ...DEFAULT_DESIGN, ...design } : DEFAULT_DESIGN;
  } catch {
    return DEFAULT_DESIGN;
  }
};

const normalizeVehicleModel = (model, index) => {
  const fallback = DEFAULT_VEHICLE_MODELS[index % DEFAULT_VEHICLE_MODELS.length];
  const candidate = model ?? {};
  const kind = typeof candidate.kind === "string" ? candidate.kind : fallback.kind;
  const profile = VEHICLE_PROFILES[kind] ? kind : fallback.kind;
  return {
    id: typeof candidate.id === "string" ? candidate.id : fallback.id,
    kind: profile,
    asset: typeof candidate.asset === "string" ? candidate.asset : fallback.asset,
    color: typeof candidate.color === "string" ? candidate.color : fallback.color,
    width: clamp(Number(candidate.width) || fallback.width, 0.8, 1.5),
    length: clamp(Number(candidate.length) || fallback.length, 1.4, 3),
    height: clamp(Number(candidate.height) || fallback.height, 0.5, 1.25)
  };
};

const loadVehicleModels = async (context, design) => {
  const proxyPath = design.assets?.vehicleProxies ?? DEFAULT_DESIGN.assets.vehicleProxies;
  try {
    const payload = await context.assets.readJson(proxyPath);
    const models = Array.isArray(payload?.models) ? payload.models : [];
    if (!models.length) return DEFAULT_VEHICLE_MODELS;
    return models.map(normalizeVehicleModel);
  } catch {
    return DEFAULT_VEHICLE_MODELS;
  }
};

const VEHICLE_INK = {
  red: 0x35110d,
  amber: 0x3d2e07,
  cream: 0x302d24,
  graphite: 0x111313,
  black: 0x080808,
  olive: 0x11190f,
  road: 0x15140f
};

const vehicleInkColor = (model) => VEHICLE_INK[model.color] ?? VEHICLE_INK.graphite;

const VEHICLE_RIM = {
  red: 0xc84d34,
  amber: 0xd5b734,
  cream: 0xf2e5c5,
  graphite: 0xcfc6ad,
  black: 0xb9b09a,
  olive: 0xa8b86e,
  road: 0xb4ad8f
};

const vehicleRimColor = (model) => VEHICLE_RIM[model.color] ?? VEHICLE_RIM.graphite;

const configureVehicleMaterials = (THREE, root, model) => {
  const bodyColor = vehicleInkColor(model);
  const rimColor = vehicleRimColor(model);
  const meshes = [];
  root.traverse((child) => {
    if (!child?.isMesh) return;
    meshes.push(child);
  });

  for (const child of meshes) {
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = false;

    child.material = new THREE.MeshBasicMaterial({
      color: bodyColor,
      fog: true,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
      depthWrite: true
    });

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(child.geometry, 24),
      new THREE.LineBasicMaterial({
        color: rimColor,
        fog: true,
        transparent: true,
        opacity: 0.32,
        depthTest: true,
        depthWrite: false
      })
    );
    edges.renderOrder = 2;
    child.add(edges);

    const silhouette = new THREE.Mesh(
      child.geometry,
      new THREE.MeshBasicMaterial({
        color: rimColor,
        side: THREE.BackSide,
        fog: true,
        transparent: true,
        opacity: 0.18,
        depthTest: true,
        depthWrite: false
      })
    );
    silhouette.scale.setScalar(1.035);
    silhouette.renderOrder = 1;
    child.add(silhouette);
  }
};

const normalizeVehicleScene = (THREE, source, model) => {
  const root = source.clone(true);
  configureVehicleMaterials(THREE, root, model);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  root.position.set(-center.x, -box.min.y, -center.z);
  const scaled = new THREE.Group();
  scaled.scale.set(
    model.width / Math.max(0.001, size.x),
    model.height / Math.max(0.001, size.y),
    model.length / Math.max(0.001, size.z)
  );
  scaled.userData.vehicleBounds = {
    minX: -model.width * 0.5,
    maxX: model.width * 0.5,
    minY: 0,
    maxY: model.height,
    minZ: -model.length * 0.5,
    maxZ: model.length * 0.5,
    width: model.width,
    height: model.height,
    length: model.length
  };
  scaled.add(root);
  return scaled;
};

const createSurfaceMarker = (THREE, color, width, height, opacity = 0.9) => {
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    fog: false,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  return new THREE.Mesh(geometry, material);
};

const createProfileLine = (THREE, color, points, opacity = 0.32) => {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(point.x, point.y, point.z)));
  const material = new THREE.LineBasicMaterial({
    color,
    fog: true,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false
  });
  return new THREE.Line(geometry, material);
};

const addVehicleProfileLines = (THREE, group, box, car) => {
  const rim = vehicleRimColor(car.model ?? {});
  const roofY = box.height * 0.78;
  const beltY = box.height * 0.44;
  const sillY = box.height * 0.18;
  const frontZ = box.maxZ + 0.018;
  const rearZ = box.minZ - 0.018;
  const sideGap = 0.018;
  const sideZInset = box.length * 0.09;
  for (const side of [-1, 1]) {
    const x = side * (box.width * 0.5 + sideGap);
    const line = createProfileLine(
      THREE,
      rim,
      [
        { x, y: sillY, z: rearZ + sideZInset },
        { x, y: beltY, z: rearZ + box.length * 0.26 },
        { x, y: roofY, z: rearZ + box.length * 0.42 },
        { x, y: roofY, z: frontZ - box.length * 0.34 },
        { x, y: beltY, z: frontZ - box.length * 0.18 },
        { x, y: sillY, z: frontZ - sideZInset }
      ],
      0.32
    );
    group.add(line);

    const windowFill = createSurfaceMarker(THREE, 0xf1e7c9, box.length * 0.28, box.height * 0.16, 0.18);
    windowFill.position.set(x, box.height * 0.56, -box.length * 0.02);
    windowFill.rotation.y = side > 0 ? Math.PI / 2 : -Math.PI / 2;
    group.add(windowFill);
  }

  const frontLine = createProfileLine(
    THREE,
    rim,
    [
      { x: box.minX + box.width * 0.14, y: sillY, z: frontZ },
      { x: box.minX + box.width * 0.25, y: beltY, z: frontZ },
      { x: box.maxX - box.width * 0.25, y: beltY, z: frontZ },
      { x: box.maxX - box.width * 0.14, y: sillY, z: frontZ }
    ],
    0.3
  );
  group.add(frontLine);
};

const addVehicleSurfaceDetails = (THREE, group, car, bounds) => {
  const box = bounds ?? {
    minX: -car.width * 0.5,
    maxX: car.width * 0.5,
    minY: 0,
    maxY: car.height,
    minZ: -car.length * 0.5,
    maxZ: car.length * 0.5,
    width: car.width,
    height: car.height,
    length: car.length
  };
  const gap = clamp(box.length * 0.008, 0.012, 0.028);
  const frontZ = box.maxZ + gap;
  const rearZ = box.minZ - gap;
  const lightX = box.width * 0.3;
  const headY = Math.max(0.13, box.height * 0.25);
  const tailY = Math.max(0.12, box.height * 0.23);
  const headWidth = clamp(box.width * 0.11, 0.08, 0.14);
  const tailWidth = clamp(box.width * 0.1, 0.07, 0.13);
  const lampHeight = clamp(box.height * 0.052, 0.03, 0.055);

  addVehicleProfileLines(THREE, group, box, car);

  for (const side of [-1, 1]) {
    const head = createSurfaceMarker(THREE, 0xfff4d6, headWidth, lampHeight, 0.88);
    head.position.set(side * lightX, headY, frontZ);
    group.add(head);

    const tail = createSurfaceMarker(THREE, 0xd33527, tailWidth, lampHeight, 0.9);
    tail.position.set(side * lightX, tailY, rearZ);
    tail.rotation.y = Math.PI;
    group.add(tail);
  }

  const plateWidth = clamp(box.width * 0.25, 0.18, 0.34);
  const plateHeight = clamp(box.height * 0.07, 0.045, 0.07);
  const plateY = Math.max(0.12, box.height * 0.17);
  const frontPlate = createSurfaceMarker(THREE, 0xe5dcc1, plateWidth, plateHeight, 0.74);
  frontPlate.position.set(0, plateY, frontZ + gap * 0.3);
  group.add(frontPlate);

  const rearPlate = createSurfaceMarker(THREE, 0xd5ccb3, plateWidth, plateHeight, 0.78);
  rearPlate.position.set(0, plateY, rearZ - gap * 0.3);
  rearPlate.rotation.y = Math.PI;
  group.add(rearPlate);
};

const vehicleLayerPose = (car, time, pressure, beatPulse, chorus) => {
  const zShift = Math.sin(time * 0.7 + car.z) * 0.06 - pressure * car.dir * 0.22;
  return {
    center: {
      x: car.x + zShift,
      y: FLOOR_Y + 0.015 + beatPulse * 0.018,
      z: car.z + pressure * 0.24
    },
    yaw: car.yaw + Math.sin(time * 0.33 + car.z) * chorus * 0.035
  };
};

const setThreeCameraFromCanvasCamera = (threeCamera, state, camera) => {
  const aspect = Math.max(0.1, state.width / Math.max(1, state.height));
  threeCamera.fov = (2 * Math.atan(Math.tan(FOV_RADIANS / 2) / aspect) * 180) / Math.PI;
  threeCamera.aspect = aspect;
  threeCamera.near = camera.near;
  threeCamera.far = 90;
  threeCamera.position.set(0, 0, 0);
  threeCamera.rotation.set(0, 0, 0);
  threeCamera.updateProjectionMatrix();
  threeCamera.projectionMatrix.elements[8] = ((camera.cx / Math.max(1, state.width)) - 0.5) * 2;
  threeCamera.projectionMatrix.elements[9] = 1 - (camera.horizon / Math.max(1, state.height)) * 2;
};

const resolveThreeServices = async (services) => {
  const loaders = [
    () => services.three,
    () => (typeof services.loadThree === "function" ? services.loadThree() : null)
  ];
  let lastError = null;
  for (const loader of loaders) {
    try {
      const candidate = await loader();
      if (candidate?.THREE && candidate?.GLTFLoader) return candidate;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastError) console.warn("[traffic-jam] 3D vehicle layer unavailable", lastError);
  return null;
};

const createVehicleThreeLayer = async (context, services, vehicleModels, traffic) => {
  const threeServices = await resolveThreeServices(services);
  if (!threeServices?.THREE || !threeServices?.GLTFLoader) return null;
  const { THREE, GLTFLoader } = threeServices;
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    premultipliedAlpha: false,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x030303, 8.5, 25);
  const threeCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 90);
  scene.add(threeCamera);

  const hemi = new THREE.HemisphereLight(0xffe5bd, 0x020202, 0.35);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xfff0d0, 0.45);
  key.position.set(-2.6, 1.6, 4.2);
  scene.add(key);
  const chorusLight = new THREE.PointLight(0xd43b2d, 0, 7);
  chorusLight.position.set(0, 0.7, -5.2);
  scene.add(chorusLight);

  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    if (!url.endsWith("Textures/colormap.png")) return url;
    return context.assets.resolve("assets/vendor/kenney-car-kit/textures/colormap.png") ?? url;
  });
  const loader = new GLTFLoader(manager);
  loader.setCrossOrigin?.("anonymous");
  const templates = new Map();
  await Promise.all(
    vehicleModels.map(async (model) => {
      const url = context.assets.resolve(model.asset);
      if (!url) return;
      try {
        const gltf = await loader.loadAsync(url);
        templates.set(model.id, normalizeVehicleScene(THREE, gltf.scene, model));
      } catch (error) {
        console.warn(`Traffic Jam vehicle model failed to load: ${model.id}`, error);
      }
    })
  );

  const carObjects = traffic.flatMap((car) => {
    const template = templates.get(car.model?.id);
    if (!template) return [];
    const group = new THREE.Group();
    const body = template.clone(true);
    group.add(body);
    addVehicleSurfaceDetails(THREE, group, car, body.userData.vehicleBounds);
    scene.add(group);
    return [{ car, group }];
  });

  if (!carObjects.length) {
    renderer.dispose();
    return null;
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  const resize = (nextWidth, nextHeight, nextDpr) => {
    const safeWidth = Math.max(1, Math.round(nextWidth));
    const safeHeight = Math.max(1, Math.round(nextHeight));
    const safeDpr = Math.min(nextDpr || 1, 2);
    if (safeWidth === width && safeHeight === height && safeDpr === dpr) return;
    width = safeWidth;
    height = safeHeight;
    dpr = safeDpr;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
  };

  const render = ({ state, camera, time, pressure, beatPulse, chorus }) => {
    resize(state.width, state.height, state.dpr);
    setThreeCameraFromCanvasCamera(threeCamera, state, camera);
    const cos = Math.cos(camera.yaw);
    const sin = Math.sin(camera.yaw);
    chorusLight.intensity = chorus * 5.5;
    for (const { car, group } of carObjects) {
      const pose = vehicleLayerPose(car, time, pressure, beatPulse, chorus);
      const viewX = pose.center.x * cos - pose.center.z * sin;
      const depth = pose.center.x * sin + pose.center.z * cos + camera.depthOffset;
      group.visible = depth > camera.near && depth < threeCamera.far;
      group.position.set(viewX, pose.center.y, -depth);
      group.rotation.set(0, pose.yaw + camera.yaw + (car.front > 0 ? Math.PI : 0), 0);
      const pulseScale = 1 + chorus * 0.02 + beatPulse * 0.012;
      group.scale.set(pulseScale, pulseScale, pulseScale);
    }
    renderer.render(scene, threeCamera);
    return canvas;
  };

  const dispose = () => {
    scene.traverse((object) => {
      if (!object?.isMesh) return;
      object.geometry?.dispose?.();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of materials) material?.dispose?.();
    });
    renderer.dispose();
  };

  return {
    canvas,
    render,
    resize,
    dispose,
    readyCount: templates.size
  };
};

const path3 = (ctx, points) => {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
  ctx.closePath();
};

const makeCamera = (state, time, shock) => {
  return {
    focal: state.width / (2 * Math.tan(FOV_RADIANS / 2)),
    cx: state.width * 0.5 + Math.sin(time * 12.7) * shock * 4,
    horizon: state.height * 0.51 + Math.cos(time * 9.4) * shock * 2.2,
    yaw: -0.045 + Math.sin(time * 0.23) * 0.018,
    depthOffset: 3.9,
    near: 0.85
  };
};

const projectPoint = (camera, point) => {
  const cos = Math.cos(camera.yaw);
  const sin = Math.sin(camera.yaw);
  const x = point.x * cos - point.z * sin;
  const z = point.x * sin + point.z * cos + camera.depthOffset;
  const safeZ = Math.max(camera.near, z);
  const scale = camera.focal / safeZ;
  return {
    x: camera.cx + x * scale,
    y: camera.horizon - point.y * scale,
    z: safeZ,
    scale
  };
};

const drawWorldLine = (ctx, camera, a, b, color, width = 1, alpha = 1) => {
  const pa = projectPoint(camera, a);
  const pb = projectPoint(camera, b);
  const depth = depthFactor((pa.z + pb.z) * 0.5);
  ctx.save();
  ctx.globalAlpha = alpha * (1 - depth * 0.54);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pa.x, pa.y);
  ctx.lineTo(pb.x, pb.y);
  ctx.stroke();
  ctx.restore();
};

const drawWorldQuad = (ctx, camera, points, fill, stroke = null, alpha = 1) => {
  const projected = points.map((point) => projectPoint(camera, point));
  const depth = depthFactor(projected.reduce((sum, point) => sum + point.z, 0) / projected.length);
  ctx.save();
  ctx.globalAlpha = alpha;
  path3(ctx, projected);
  ctx.fillStyle = fill;
  ctx.fill();
  if (depth > 0.01) {
    ctx.globalAlpha = alpha * depth * 0.48;
    ctx.fillStyle = rgb("ink");
    ctx.fill();
  }
  if (stroke) {
    ctx.globalAlpha = alpha * (1 - depth * 0.5);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
};

const faceColor = (base, light) => {
  const colors = {
    red: THEME.rust,
    amber: THEME.gold,
    green: THEME.olive,
    cream: THEME.paper,
    graphite: THEME.asphalt,
    black: THEME.ink,
    olive: THEME.olive,
    road: THEME.road
  };
  const rgb = colors[base] ?? colors.graphite;
  const r = Math.round(mix(rgb[0] * 0.36, rgb[0], light));
  const g = Math.round(mix(rgb[1] * 0.36, rgb[1], light));
  const b = Math.round(mix(rgb[2] * 0.36, rgb[2], light));
  return `rgb(${r},${g},${b})`;
};

const boxCorners = (center, size, yaw = 0) => {
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const sx = size.x * 0.5;
  const sy = size.y * 0.5;
  const sz = size.z * 0.5;
  return [
    [-sx, -sy, -sz],
    [sx, -sy, -sz],
    [sx, sy, -sz],
    [-sx, sy, -sz],
    [-sx, -sy, sz],
    [sx, -sy, sz],
    [sx, sy, sz],
    [-sx, sy, sz]
  ].map(([x, y, z]) => ({
    x: center.x + x * cos - z * sin,
    y: center.y + y,
    z: center.z + x * sin + z * cos
  }));
};

const drawBox = (ctx, camera, center, size, yaw, colors, alpha = 1) => {
  const corners = boxCorners(center, size, yaw);
  const faces = [
    { ids: [0, 1, 2, 3], fill: colors.front },
    { ids: [4, 7, 6, 5], fill: colors.back },
    { ids: [3, 2, 6, 7], fill: colors.top },
    { ids: [0, 4, 5, 1], fill: colors.bottom },
    { ids: [1, 5, 6, 2], fill: colors.side },
    { ids: [0, 3, 7, 4], fill: colors.sideDark }
  ].map((face) => ({
    ...face,
    avgZ: face.ids.reduce((sum, id) => sum + corners[id].z, 0) / face.ids.length
  }));
  faces.sort((a, b) => b.avgZ - a.avgZ);

  ctx.save();
  for (const face of faces) {
    const projected = face.ids.map((id) => projectPoint(camera, corners[id]));
    const projectedZ = projected.reduce((sum, point) => sum + point.z, 0) / projected.length;
    const depth = depthFactor(projectedZ);
    ctx.globalAlpha = depthAlpha(projectedZ, alpha, 0.32);
    path3(ctx, projected);
    ctx.fillStyle = face.fill;
    ctx.fill();
    if (depth > 0.01) {
      ctx.globalAlpha = alpha * depth * 0.42;
      ctx.fillStyle = rgb("ink");
      ctx.fill();
    }
    ctx.globalAlpha = alpha * (1 - depth * 0.46);
    ctx.strokeStyle = rgba("paper", 0.16);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
};

const drawBillboard = (ctx, camera, point, width, height, angle, fill, stroke, alpha, drawContent) => {
  const projected = projectPoint(camera, point);
  const w = width * projected.scale;
  const h = height * projected.scale;
  const depth = depthFactor(projected.z);
  ctx.save();
  ctx.translate(projected.x, projected.y);
  ctx.rotate(angle);
  ctx.globalAlpha = depthAlpha(projected.z, alpha, 0.28);
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = Math.max(1, projected.scale * 0.018);
  ctx.beginPath();
  ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(8, h * 0.12));
  ctx.fill();
  ctx.stroke();
  if (drawContent) drawContent(projected, w, h);
  if (depth > 0.01) {
    ctx.globalAlpha = alpha * depth * 0.46;
    ctx.fillStyle = rgb("ink");
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, Math.min(8, h * 0.12));
    ctx.fill();
  }
  ctx.restore();
};

const drawEyeBillboard = (ctx, camera, point, size, intensity, red = false) => {
  drawBillboard(
    ctx,
    camera,
    point,
    size,
    size * 0.48,
    Math.sin(point.z * 0.7) * 0.08,
    rgba("ink", 0.52),
    red ? rgba("rust", 0.9) : rgba("paper", 0.74),
    0.55 + intensity * 0.42,
    (_projected, w, h) => {
      ctx.strokeStyle = red ? rgba("rust", 0.95) : rgba("paper", 0.78);
      ctx.lineWidth = Math.max(1.2, h * 0.08);
      ctx.beginPath();
      ctx.ellipse(0, 0, w * 0.34, h * (0.25 + intensity * 0.08), 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = red ? rgba("rust", 0.96) : rgba("paper", 0.86);
      ctx.beginPath();
      ctx.arc(0, 0, h * 0.12, 0, TAU);
      ctx.fill();
    }
  );
};

const drawSignalPost = (ctx, camera, x, z, alert, scale = 1) => {
  const poleHeight = 1.7 * scale;
  drawWorldLine(
    ctx,
    camera,
    { x, y: FLOOR_Y, z },
    { x, y: FLOOR_Y + poleHeight, z },
    rgba("paper", 0.64),
    2
  );
  drawBillboard(
    ctx,
    camera,
    { x, y: FLOOR_Y + poleHeight, z },
    0.42 * scale,
    1.08 * scale,
    0,
    rgba("ink", 0.9),
    rgba("paper", 0.32),
    1,
    (_projected, w, h) => {
      const colors = [
        `rgba(${THEME.rust.join(",")},${0.46 + alert * 0.54})`,
        rgba("gold", 0.76),
        rgba("olive", 0.58)
      ];
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = colors[i];
        ctx.beginPath();
        ctx.arc(0, -h * 0.28 + i * h * 0.28, h * 0.08 * (i === 0 ? 1 + alert * 0.45 : 1), 0, TAU);
        ctx.fill();
      }
    }
  );
};

const makeTraffic = (vehicleModels) => {
  const lanes = [-3.35, -1.62, 1.18, 2.92, 4.38];
  const cars = [];
  for (let z = 3.2; z < 24.5; z += 2.55) {
    const lane = lanes[cars.length % lanes.length];
    const model = vehicleModels[cars.length % vehicleModels.length] ?? DEFAULT_VEHICLE_MODELS[0];
    cars.push({
      x: lane + ((cars.length % 3) - 1) * 0.1,
      z: z + (cars.length % 4 === 0 ? 0.35 : 0),
      color: model.color,
      model,
      yaw: cars.length % 2 ? 0.035 : -0.025,
      dir: cars.length % 2 ? 1 : -1,
      front: lane < 0 ? 1 : -1,
      width: model.width,
      length: model.length,
      height: model.height
    });
  }
  return cars;
};

const makeFlyingSigns = (labels) => {
  const rand = hash(70481);
  return Array.from({ length: 34 }, (_, index) => {
    const supported = index % 5 === 0;
    const side = index % 4;
    const startX = side === 0 ? -8 - rand() * 3 : side === 1 ? 8 + rand() * 3 : (rand() - 0.5) * 9;
    const endX = -0.2 + (rand() - 0.5) * 2.8;
    const startZ = 5 + rand() * 18;
    const endZ = 5.3 + rand() * 6.2;
    const startY = supported ? FLOOR_Y + 0.62 + rand() * 0.45 : -0.3 + rand() * 3.6;
    const lift = supported ? 0.06 : 2.2 + rand() * 2.6;
    return {
      label: labels[index % labels.length],
      color: index % 7 === 0 ? "red" : index % 4 === 0 ? "olive" : index % 3 === 0 ? "amber" : "cream",
      supported,
      phase: rand(),
      speed: 0.08 + rand() * 0.08,
      start: { x: startX, y: startY, z: startZ },
      end: { x: endX, y: supported ? startY : 0.1 + rand() * 1.5, z: endZ },
      lift,
      spin: (rand() - 0.5) * 1.2,
      size: 0.72 + rand() * 0.46
    };
  });
};

const makeEvidence = () => {
  const rand = hash(24821);
  const types = ["paper", "mirror", "signal", "bumper", "lane", "eye", "tag", "glass"];
  return Array.from({ length: 38 }, (_, index) => {
    const supported = index % 6 === 0;
    return {
      type: types[index % types.length],
      x: -6.2 + rand() * 12.4,
      y: supported ? FLOOR_Y + 0.42 : -0.2 + rand() * 4.2,
      z: 4.2 + rand() * 19.5,
      alignX: -5 + (index % 8) * 1.42,
      alignY: FLOOR_Y + 0.55 + Math.floor(index / 8) * 0.72,
      alignZ: 7 + Math.floor(index / 8) * 3.2,
      supported,
      size: 0.5 + rand() * 0.8,
      yaw: (rand() - 0.5) * 1.5,
      drift: rand() * TAU,
      color: index % 7 === 0 ? "red" : index % 3 === 0 ? "amber" : index % 4 === 0 ? "olive" : "cream"
    };
  });
};

const drawBackdrop = (ctx, state, pressure, interlude, chorus = 0) => {
  const { width: w, height: h } = state;
  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, chorus > 0.2 ? "#030303" : interlude ? "#363018" : "#303030");
  gradient.addColorStop(0.42, chorus > 0.2 ? "#0b0905" : interlude ? "#302e18" : "#302e18");
  gradient.addColorStop(1, chorus > 0.2 ? "#000000" : interlude ? "#141209" : "#1d120d");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = (0.1 + pressure * 0.08) * (1 - chorus * 0.72);
  ctx.fillStyle = "#c0a818";
  for (let y = 0; y < h; y += 5) ctx.fillRect(0, y, w, 1);
  ctx.globalAlpha = 0.035 * (1 - chorus * 0.55);
  ctx.fillStyle = "#183018";
  for (let x = 0; x < w; x += 64) ctx.fillRect(x, 0, 1, h);
  if (chorus > 0.01) {
    ctx.globalAlpha = chorus * 0.34;
    ctx.fillStyle = "rgba(0,0,0,1)";
    ctx.fillRect(0, 0, w, h * (0.16 + pressure * 0.04));
    ctx.fillRect(0, h * (0.84 - pressure * 0.04), w, h * 0.18);
  }
  ctx.restore();
};

const drawWindowFrame = (ctx, state, time, alert) => {
  const { width: w, height: h } = state;
  ctx.save();
  ctx.strokeStyle = alert ? rgba("rust", 0.9) : rgba("paper", 0.58);
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);
  ctx.strokeStyle = rgba("gold", 0.28);
  ctx.lineWidth = 1;
  ctx.strokeRect(34, 34, w - 68, h - 68);
  ctx.fillStyle = alert ? rgba("rust", 0.95) : rgba("paper", 0.88);
  ctx.font = "12px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`CAM 04 / 60deg / ${time.toFixed(2).padStart(6, "0")}s`, 36, 52);
  ctx.fillText(alert ? "SIGNAL LOCK" : "QUEUE WATCH", 36, h - 34);
  ctx.restore();
};

const drawEnvironment = (ctx, camera, pressure, interlude, chorus = 0) => {
  const floorA = chorus > 0.2 ? rgba("ink", 0.98) : interlude ? rgba("road", 0.94) : rgba("asphalt", 0.96);
  const floorB = chorus > 0.2 ? rgba("wine", 0.78) : interlude ? rgba("wine", 0.95) : rgba("road", 0.96);
  const gridAlpha = 0.62 - chorus * 0.38;
  drawWorldQuad(
    ctx,
    camera,
    [
      { x: -8.2, y: FLOOR_Y, z: 2.3 },
      { x: 8.2, y: FLOOR_Y, z: 2.3 },
      { x: 11.8, y: FLOOR_Y, z: 30 },
      { x: -11.8, y: FLOOR_Y, z: 30 }
    ],
    floorA,
    chorus > 0.2 ? rgba("paper", 0.08) : rgba("paper", 0.16)
  );
  drawWorldQuad(
    ctx,
    camera,
    [
      { x: -8.2, y: FLOOR_Y, z: 2.3 },
      { x: -11.8, y: FLOOR_Y, z: 30 },
      { x: -11.8, y: 4.4, z: 30 },
      { x: -8.2, y: 3.4, z: 2.3 }
    ],
    chorus > 0.2 ? "rgba(8,8,7,0.84)" : "rgba(47,46,24,0.62)",
    rgba("paper", chorus > 0.2 ? 0.08 : 0.16)
  );
  drawWorldQuad(
    ctx,
    camera,
    [
      { x: 8.2, y: FLOOR_Y, z: 2.3 },
      { x: 11.8, y: FLOOR_Y, z: 30 },
      { x: 11.8, y: 4.4, z: 30 },
      { x: 8.2, y: 3.4, z: 2.3 }
    ],
    chorus > 0.2 ? "rgba(20,3,2,0.82)" : "rgba(73,31,27,0.6)",
    rgba("rust", chorus > 0.2 ? 0.18 : 0.14)
  );
  drawWorldQuad(
    ctx,
    camera,
    [
      { x: -2.1, y: FLOOR_Y + 0.01, z: 2.2 },
      { x: 2.1, y: FLOOR_Y + 0.01, z: 2.2 },
      { x: 3.25, y: FLOOR_Y + 0.01, z: 30 },
      { x: -3.25, y: FLOOR_Y + 0.01, z: 30 }
    ],
    floorB,
    chorus > 0.2 ? rgba("rust", 0.22) : rgba("paper", 0.18)
  );

  for (let x = -6; x <= 6; x += 2) {
    drawWorldLine(ctx, camera, { x, y: FLOOR_Y + 0.018, z: 2.35 }, { x: x * 1.18, y: FLOOR_Y + 0.018, z: 28 }, rgba("paper", 0.18 + chorus * 0.22), chorus > 0.2 ? 1.45 : 1, gridAlpha);
  }
  for (let z = 3.5; z <= 29; z += 2.2) {
    const alpha = 0.16 + (z % 4.4 < 0.1 ? 0.12 : 0);
    drawWorldLine(ctx, camera, { x: -7.2, y: FLOOR_Y + 0.02, z }, { x: 7.2, y: FLOOR_Y + 0.02, z }, chorus > 0.2 ? rgba("rust", 0.4) : rgba("paper", 0.34), chorus > 0.2 ? 2.1 : 1.55, alpha * gridAlpha);
  }
  for (let z = 4; z <= 28; z += 4) {
    drawWorldLine(ctx, camera, { x: -8.2, y: 0.38, z }, { x: 8.2, y: 0.38, z }, chorus > 0.2 ? rgba("paper", 0.16) : rgba("olive", 0.28), 1.2, 0.55 * gridAlpha);
  }

  const lightPulse = 0.45 + pressure * 0.55;
  for (const x of [-5.8, -1.8, 1.8, 5.8]) {
    for (const z of [5.2, 11.5, 18.5, 25.2]) {
      drawSignalPost(ctx, camera, x, z, lightPulse, 0.75);
    }
  }
};

const drawCarLight = (ctx, camera, center, yaw, localX, localY, localZ, color, alpha, wide = false) => {
  const point = localPoint(center, yaw, localX, localY, localZ);
  drawBillboard(ctx, camera, point, wide ? 0.18 : 0.13, 0.08, yaw * 0.18, color, rgba("paper", 0.34), alpha, null);
};

const drawLowPolyWheel = (ctx, camera, center, yaw, x, z, scale, alpha) => {
  drawBox(
    ctx,
    camera,
    localPoint(center, yaw, x, -0.33 * scale, z),
    { x: 0.18 * scale, y: 0.28 * scale, z: 0.34 * scale },
    yaw,
    {
      front: rgb("ink"),
      back: rgb("ink"),
      top: faceColor("graphite", 0.45),
      bottom: rgb("ink"),
      side: faceColor("black", 0.82),
      sideDark: rgb("ink")
    },
    alpha
  );
};

const vehicleColors = (base, topBoost = 0) => ({
  front: faceColor(base, 0.78 + topBoost),
  back: faceColor(base, 0.56),
  top: faceColor(base, 0.98 + topBoost),
  bottom: rgba("ink", 0.92),
  side: faceColor(base, 0.82 + topBoost * 0.4),
  sideDark: faceColor(base, 0.5)
});

const drawVehicleBox = (ctx, camera, center, yaw, car, local, size, baseColor, alpha, topBoost = 0) => {
  drawBox(
    ctx,
    camera,
    localPoint(center, yaw, local.x ?? 0, local.y ?? 0, car.front * (local.z ?? 0)),
    size,
    yaw,
    vehicleColors(baseColor, topBoost),
    alpha
  );
};

const drawVehicleQuad = (ctx, camera, center, yaw, car, points, fill, stroke, alpha) => {
  drawWorldQuad(
    ctx,
    camera,
    points.map((point) => localPoint(center, yaw, point.x, point.y, car.front * point.z)),
    fill,
    stroke,
    alpha
  );
};

const drawVehicleSideWindows = (ctx, camera, center, yaw, car, zCenter, zLength, yCenter, height, alpha) => {
  const windowFill = chorusWindowFill(alpha);
  for (const side of [-1, 1]) {
    const x = side * car.width * 0.51;
    drawVehicleQuad(
      ctx,
      camera,
      center,
      yaw,
      car,
      [
        { x, y: yCenter - height * 0.44, z: zCenter - zLength * 0.5 },
        { x, y: yCenter - height * 0.24, z: zCenter + zLength * 0.5 },
        { x, y: yCenter + height * 0.36, z: zCenter + zLength * 0.38 },
        { x, y: yCenter + height * 0.42, z: zCenter - zLength * 0.42 }
      ],
      windowFill,
      rgba("paper", 0.3),
      alpha
    );
  }
};

const chorusWindowFill = (alpha) => `rgba(${THEME.ink.join(",")},${0.46 + alpha * 0.1})`;

const drawVehicleFrontGlass = (ctx, camera, center, yaw, car, z, yCenter, width, height, alpha) => {
  drawVehicleQuad(
    ctx,
    camera,
    center,
    yaw,
    car,
    [
      { x: -width * 0.5, y: yCenter - height * 0.42, z },
      { x: width * 0.5, y: yCenter - height * 0.42, z },
      { x: width * 0.42, y: yCenter + height * 0.42, z: z - 0.08 },
      { x: -width * 0.42, y: yCenter + height * 0.42, z: z - 0.08 }
    ],
    rgba("ink", 0.54),
    rgba("paper", 0.28),
    alpha
  );
};

const drawVehicleStripe = (ctx, camera, center, yaw, car, zCenter, zLength, y, color, alpha) => {
  for (const side of [-1, 1]) {
    const x = side * car.width * 0.515;
    drawVehicleQuad(
      ctx,
      camera,
      center,
      yaw,
      car,
      [
        { x, y: y - 0.035, z: zCenter - zLength * 0.5 },
        { x, y: y - 0.035, z: zCenter + zLength * 0.5 },
        { x, y: y + 0.035, z: zCenter + zLength * 0.5 },
        { x, y: y + 0.035, z: zCenter - zLength * 0.5 }
      ],
      color,
      null,
      alpha
    );
  }
};

const drawVehicleRoofMarker = (ctx, camera, center, yaw, car, profile, chorus) => {
  const roofY = car.height * 0.7;
  if (profile.roofSign) {
    drawBillboard(
      ctx,
      camera,
      localPoint(center, yaw, 0, roofY, car.front * -0.05),
      car.width * 0.34,
      0.16,
      yaw * 0.12,
      rgba("gold", 0.92),
      rgba("ink", 0.72),
      0.9,
      (_projected, w, h) => {
        ctx.fillStyle = rgba("ink", 0.76);
        ctx.font = `${Math.max(6, h * 0.48)}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("TAXI", 0, 0);
      }
    );
  }
  if (profile.lightBar) {
    drawVehicleBox(
      ctx,
      camera,
      center,
      yaw,
      car,
      { x: 0, y: roofY, z: -0.04 },
      { x: car.width * 0.36, y: 0.08, z: 0.12 },
      "black",
      0.92,
      chorus * 0.2
    );
    for (const x of [-car.width * 0.11, car.width * 0.11]) {
      drawCarLight(ctx, camera, center, yaw, x, roofY + 0.02, -0.04, x < 0 ? rgba("rust", 0.92) : rgba("paper", 0.9), 0.78 + chorus * 0.18, true);
    }
  }
};

const drawVehicleFaceDetails = (ctx, camera, center, yaw, car, profile, chorus) => {
  const frontZ = car.front * car.length * 0.56;
  const rearZ = -frontZ;
  const frontPoint = localPoint(center, yaw, 0, car.height * 0.02, frontZ);
  const rearPoint = localPoint(center, yaw, 0, car.height * 0.01, rearZ);
  const plateLabel = car.model?.kind === "taxi" ? "TAXI" : car.model?.kind === "police" ? "POL" : car.model?.kind === "firetruck" ? "FIRE" : "";
  const panelAlpha = 0.72 + chorus * 0.12;

  drawBillboard(
    ctx,
    camera,
    frontPoint,
    car.width * 0.72,
    car.height * 0.34,
    yaw * 0.14,
    rgba("ink", 0.22),
    rgba("paper", 0.42),
    panelAlpha,
    (_projected, w, h) => {
      ctx.fillStyle = rgba("paper", 0.84);
      for (const x of [-w * 0.3, w * 0.3]) {
        ctx.beginPath();
        ctx.roundRect(x - w * 0.09, -h * 0.18, w * 0.18, h * (chorus > 0.2 ? 0.2 : 0.15), 3);
        ctx.fill();
      }
      ctx.fillStyle = rgba("ink", 0.82);
      ctx.beginPath();
      ctx.roundRect(-w * 0.2, h * 0.06, w * 0.4, h * 0.14, 3);
      ctx.fill();
      ctx.strokeStyle = rgba("paper", 0.34);
      ctx.lineWidth = Math.max(1, h * 0.035);
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-w * 0.15 + i * w * 0.1, h * 0.07);
        ctx.lineTo(-w * 0.15 + i * w * 0.1, h * 0.19);
        ctx.stroke();
      }
      if (plateLabel) {
        ctx.fillStyle = rgba("gold", 0.86);
        ctx.font = `${Math.max(6, h * 0.18)}px ui-monospace, Consolas, monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(plateLabel, 0, h * 0.34);
      }
    }
  );

  drawBillboard(
    ctx,
    camera,
    rearPoint,
    car.width * 0.64,
    car.height * 0.26,
    yaw * 0.1,
    rgba("ink", 0.18),
    rgba("paper", 0.26),
    0.5,
    (_projected, w, h) => {
      ctx.fillStyle = rgba("rust", 0.8);
      for (const x of [-w * 0.32, w * 0.32]) {
        ctx.beginPath();
        ctx.roundRect(x - w * 0.065, -h * 0.12, w * 0.13, h * 0.18, 3);
        ctx.fill();
      }
      ctx.fillStyle = rgba("paper", 0.42);
      ctx.beginPath();
      ctx.roundRect(-w * 0.18, h * 0.06, w * 0.36, h * 0.1, 2);
      ctx.fill();
    }
  );
};

const drawVehicleWheels = (ctx, camera, center, yaw, car, profile, alpha) => {
  const wheelX = car.width * 0.55;
  const wheelScale = profile.wheelScale ?? 1;
  const positions = profile.cargo || profile.truck
    ? [-car.length * 0.34, car.length * 0.02, car.length * 0.36]
    : [-car.length * 0.32, car.length * 0.32];
  for (const wx of [-wheelX, wheelX]) {
    for (const wz of positions) drawLowPolyWheel(ctx, camera, center, yaw, wx, wz, wheelScale, alpha);
  }
};

const drawPassengerVehicle = (ctx, camera, center, yaw, car, profile, chorus) => {
  const bodyColor = car.color;
  const bodyHeight = car.height * 0.54;
  const bodyCenterY = 0;
  drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyCenterY, z: 0 }, { x: car.width, y: bodyHeight, z: car.length }, bodyColor, 0.9, chorus * 0.08);

  const hoodZ = car.length * (0.5 - profile.hood * 0.5);
  const rearZ = -car.length * (0.5 - profile.rear * 0.5);
  drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyHeight * 0.25, z: hoodZ }, { x: car.width * 0.82, y: car.height * 0.2, z: car.length * profile.hood }, bodyColor, 0.82, 0.08);
  drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyHeight * 0.23, z: rearZ }, { x: car.width * 0.8, y: car.height * 0.18, z: car.length * profile.rear }, bodyColor, 0.78, 0.04);

  const cabinLength = car.length * profile.cabin;
  const cabinCenterZ = car.length * profile.cabinOffset;
  const cabinCenterY = bodyHeight * 0.48 + car.height * 0.18;
  drawVehicleBox(ctx, camera, center, yaw, car, { y: cabinCenterY, z: cabinCenterZ }, { x: car.width * 0.64, y: car.height * profile.cabinHeight, z: cabinLength }, "black", 0.78, chorus * 0.16);
  drawVehicleSideWindows(ctx, camera, center, yaw, car, cabinCenterZ, cabinLength * 0.78, cabinCenterY, car.height * profile.cabinHeight, 0.68);
  drawVehicleFrontGlass(ctx, camera, center, yaw, car, cabinCenterZ + cabinLength * 0.48, cabinCenterY, car.width * 0.52, car.height * 0.28, 0.68);

  if (profile.stripe) drawVehicleStripe(ctx, camera, center, yaw, car, 0, car.length * 0.76, bodyHeight * 0.58, rgba(car.model?.kind === "police" ? "ink" : "paper", 0.54), 0.72);
  if (profile.spoiler) {
    drawVehicleBox(ctx, camera, center, yaw, car, { y: car.height * 0.78, z: -car.length * 0.48 }, { x: car.width * 0.72, y: 0.07, z: 0.1 }, "black", 0.82, 0.02);
  }
};

const drawUtilityVehicle = (ctx, camera, center, yaw, car, profile, chorus) => {
  const bodyHeight = car.height * 0.66;
  if (profile.box) {
    drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyHeight * 0.08, z: 0 }, { x: car.width, y: bodyHeight, z: car.length }, car.color, 0.9, chorus * 0.08);
    drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyHeight * 0.46, z: -car.length * 0.02 }, { x: car.width * 0.78, y: car.height * 0.36, z: car.length * 0.58 }, "black", 0.76, 0.08);
    drawVehicleSideWindows(ctx, camera, center, yaw, car, 0.02, car.length * 0.46, bodyHeight * 0.46, car.height * 0.32, 0.62);
  } else {
    const cargoLength = car.length * (profile.cargoLength ?? 0.54);
    const cargoZ = -car.length * 0.18;
    const cabLength = car.length * 0.34;
    const cabZ = car.length * 0.34;
    drawVehicleBox(ctx, camera, center, yaw, car, { y: -bodyHeight * 0.02, z: 0 }, { x: car.width, y: bodyHeight * 0.55, z: car.length }, car.color, 0.86, chorus * 0.08);
    drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyHeight * 0.28, z: cargoZ }, { x: car.width * 0.92, y: car.height * 0.62, z: cargoLength }, car.color, 0.86, chorus * 0.1);
    drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyHeight * 0.26, z: cabZ }, { x: car.width * 0.82, y: car.height * profile.cabinHeight, z: cabLength }, "black", 0.76, 0.08);
    drawVehicleSideWindows(ctx, camera, center, yaw, car, cabZ, cabLength * 0.68, bodyHeight * 0.26, car.height * 0.32, 0.62);
    if (profile.truck) {
      drawVehicleBox(ctx, camera, center, yaw, car, { y: bodyHeight * 0.28, z: -car.length * 0.18 }, { x: car.width * 0.86, y: car.height * 0.18, z: car.length * 0.52 }, "road", 0.74, 0.04);
    }
  }

  if (profile.stripe) drawVehicleStripe(ctx, camera, center, yaw, car, -car.length * 0.08, car.length * 0.68, bodyHeight * 0.2, rgba(car.model?.kind === "firetruck" ? "gold" : "paper", 0.58), 0.74);
};

const drawCar3D = (ctx, camera, car, time, pressure, beatPulse, chorus = 0) => {
  const zShift = Math.sin(time * 0.7 + car.z) * 0.08 - pressure * car.dir * 0.32;
  const y = FLOOR_Y + 0.32 + beatPulse * 0.025;
  const center = { x: car.x + zShift, y, z: car.z + pressure * 0.35 };
  const yaw = car.yaw + Math.sin(time * 0.33 + car.z) * chorus * 0.035;
  const profile = VEHICLE_PROFILES[car.model?.kind] ?? VEHICLE_PROFILES.sedan;
  const frontZ = car.front * car.length * 0.54;
  const rearZ = -frontZ;

  if (profile.box || profile.cargo || profile.truck) drawUtilityVehicle(ctx, camera, center, yaw, car, profile, chorus);
  else drawPassengerVehicle(ctx, camera, center, yaw, car, profile, chorus);

  drawVehicleWheels(ctx, camera, center, yaw, car, profile, 0.88);
  drawVehicleRoofMarker(ctx, camera, center, yaw, car, profile, chorus);
  drawVehicleFaceDetails(ctx, camera, center, yaw, car, profile, chorus);

  for (const lx of [-car.width * 0.27, car.width * 0.27]) {
    drawCarLight(ctx, camera, center, yaw, lx, 0.02, frontZ, rgba("paper", 0.95), 0.9 + chorus * 0.1, chorus > 0.15);
    drawCarLight(ctx, camera, center, yaw, lx, 0.01, rearZ, rgba("rust", 0.82), 0.66, false);
  }

  const platePoint = localPoint(center, yaw, 0, -0.02, frontZ + car.front * 0.02);
  drawBillboard(ctx, camera, platePoint, 0.34, 0.08, yaw * 0.12, rgba("paper", 0.62), rgba("ink", 0.6), 0.62, null);
};

const drawSubject = (ctx, camera, time, pressure, stampPulse) => {
  const squeeze = pressure * 0.12 + stampPulse * 0.16;
  drawBox(
    ctx,
    camera,
    { x: 0.15, y: FLOOR_Y + 0.47, z: 7.5 },
    { x: 1.62 - squeeze, y: 0.78 + squeeze * 0.5, z: 2.1 },
    -0.12 + Math.sin(time * 2.2) * 0.03,
    {
      front: rgb("asphalt"),
      back: rgb("ink"),
      top: faceColor("road", 0.8),
      bottom: "rgb(3,4,5)",
      side: "rgb(35,35,31)",
      sideDark: rgb("ink")
    },
    1
  );
  drawBillboard(
    ctx,
    camera,
    { x: 0.15, y: FLOOR_Y + 1.14, z: 6.38 },
    1.95,
    0.42,
    -0.08,
    `rgba(${THEME.rust.join(",")},${0.18 + pressure * 0.34})`,
    rgba("rust", 0.92),
    0.95,
    (_projected, w, h) => {
      ctx.fillStyle = rgba("paper", 0.95);
      ctx.font = `${Math.max(10, h * 0.32)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("SUBJECT", 0, 0);
    }
  );
};

const drawFlyingSigns = (ctx, camera, signs, time, pressure, beatPulse) => {
  for (const sign of signs) {
    const move = fract(time * sign.speed + sign.phase);
    const surge = clamp(pressure * 1.2 + beatPulse * 0.15);
    const t = sign.supported ? move : clamp(move + surge * 0.25);
    const arc = Math.sin(t * Math.PI) * sign.lift;
    const drop = sign.supported ? 0 : t * t * 0.95;
    const point = {
      x: mix(sign.start.x, sign.end.x, t) + Math.sin(time * 1.2 + sign.phase * TAU) * 0.25,
      y: mix(sign.start.y, sign.end.y, t) + arc - drop,
      z: mix(sign.start.z, sign.end.z, t)
    };
    const angle = sign.spin * t + Math.sin(time * 2 + sign.phase * 9) * (sign.supported ? 0.03 : 0.2);
    const fill =
      sign.color === "red"
        ? rgba("rust", 0.94)
        : sign.color === "amber"
          ? rgba("gold", 0.92)
          : sign.color === "olive"
            ? rgba("olive", 0.86)
            : rgba("paper", 0.9);
    const stroke = sign.color === "red" ? rgba("ocher", 0.82) : rgba("ink", 0.58);

    if (!sign.supported) {
      drawWorldLine(
        ctx,
        camera,
        { x: point.x, y: FLOOR_Y + 0.05, z: point.z },
        { x: point.x, y: point.y - 0.18, z: point.z },
        rgba("paper", 0.12),
        1,
        0.55
      );
    } else {
      drawWorldLine(
        ctx,
        camera,
        { x: point.x - 0.62, y: point.y - 0.42, z: point.z },
        { x: point.x + 0.62, y: point.y - 0.42, z: point.z },
        rgba("gold", 0.34),
        2,
        0.72
      );
    }

    drawBillboard(ctx, camera, point, 1.35 * sign.size, 0.46 * sign.size, angle, fill, stroke, 0.86 + pressure * 0.14, (_projected, w, h) => {
      ctx.fillStyle = sign.color === "red" || sign.color === "olive" ? rgba("paper", 0.92) : rgba("ink", 0.9);
      ctx.font = `${Math.max(9, h * 0.33)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(sign.label, 0, 0);
    });
  }
};

const drawEyes = (ctx, camera, time, pressure) => {
  const points = [
    { x: -7.5, y: 1.25, z: 5.2 },
    { x: 7.6, y: 1.9, z: 8.8 },
    { x: -8.2, y: 2.6, z: 15.4 },
    { x: 8.4, y: 0.55, z: 17.7 },
    { x: -6.8, y: 0.2, z: 24.5 },
    { x: 6.5, y: 2.8, z: 25.2 }
  ];
  for (const point of points) {
    drawEyeBillboard(ctx, camera, { ...point, y: point.y + Math.sin(time * 0.8 + point.z) * 0.04 }, 0.75, pressure, pressure > 0.45);
  }
};

const drawImpactStamp = (ctx, camera, time, pressure, stampPulse) => {
  const amount = clamp(stampPulse + pressure * 0.45);
  if (amount <= 0.04) return;
  const point = { x: 0.1, y: 0.92 + amount * 0.2, z: 5.8 - amount * 0.55 };
  drawBillboard(
    ctx,
    camera,
    point,
    2.8,
    1.02,
    -0.14 + Math.sin(time * 14) * 0.04,
    `rgba(${THEME.rust.join(",")},0.2)`,
    rgba("rust", 0.95),
    clamp(amount * 1.2),
    (_projected, w, h) => {
      ctx.strokeStyle = rgba("rust", 0.95);
      ctx.lineWidth = Math.max(2, h * 0.06);
      ctx.strokeRect(-w * 0.42, -h * 0.32, w * 0.84, h * 0.64);
      ctx.fillStyle = rgba("rust", 0.96);
      ctx.font = `700 ${Math.max(18, h * 0.35)}px ui-monospace, Consolas, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(amount > 0.68 ? "FAULT" : "STOP", 0, 0);
    }
  );
};

const drawChorusOverlay = (ctx, camera, state, time, chorus, beatPulse) => {
  if (chorus <= 0.02) return;
  const flash = clamp(beatPulse * 1.8 + chorus * 0.22);
  ctx.save();
  ctx.globalAlpha = chorus * 0.24;
  ctx.fillStyle = "rgba(0,0,0,1)";
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.globalAlpha = chorus * (0.18 + flash * 0.18);
  ctx.strokeStyle = rgba("paper", 0.86);
  ctx.lineWidth = 2 + flash * 2;
  ctx.beginPath();
  ctx.moveTo(state.width * 0.12, state.height * 0.22);
  ctx.lineTo(state.width * 0.88, state.height * 0.17);
  ctx.moveTo(state.width * 0.15, state.height * 0.78);
  ctx.lineTo(state.width * 0.85, state.height * 0.84);
  ctx.stroke();
  ctx.globalAlpha = chorus * (0.16 + flash * 0.28);
  ctx.strokeStyle = rgba("rust", 0.9);
  ctx.lineWidth = 3 + flash * 3;
  ctx.strokeRect(state.width * 0.28, state.height * 0.28, state.width * 0.44, state.height * 0.28);
  ctx.restore();

  for (const z of [5.6, 8.4, 12.2]) {
    drawWorldLine(ctx, camera, { x: -7.4, y: FLOOR_Y + 0.04, z }, { x: 7.4, y: FLOOR_Y + 0.04, z }, rgba("paper", 0.44 + flash * 0.32), 2.4 + flash * 2.4, chorus * 0.7);
  }
};

const drawEvidenceItem = (ctx, camera, item, point, angle, alpha, alert) => {
  if (item.type === "signal") {
    drawSignalPost(ctx, camera, point.x, point.z, alert ? 1 : 0.35, 0.55 * item.size);
    return;
  }
  if (item.type === "bumper") {
    drawBox(
      ctx,
      camera,
      point,
      { x: 1.1 * item.size, y: 0.12 * item.size, z: 0.24 * item.size },
      angle,
      {
        front: faceColor("red", 0.85),
        back: faceColor("red", 0.5),
        top: faceColor("cream", 0.9),
        bottom: rgba("ink", 0.75),
        side: faceColor("red", 0.66),
        sideDark: faceColor("red", 0.4)
      },
      alpha
    );
    return;
  }
  if (item.type === "lane") {
    drawWorldLine(ctx, camera, { x: point.x - 0.65, y: point.y, z: point.z }, { x: point.x + 0.65, y: point.y, z: point.z + 0.1 }, rgba("paper", 0.82), 4, alpha);
    return;
  }
  if (item.type === "eye") {
    drawEyeBillboard(ctx, camera, point, 0.72 * item.size, alert ? 1 : 0.35, alert);
    return;
  }

  const fill =
    item.type === "tag"
      ? rgba("gold", 0.88)
      : item.type === "mirror"
        ? rgba("paper", 0.48)
        : item.type === "glass"
          ? "rgba(216,184,42,0.32)"
          : rgba("paper", 0.86);
  drawBillboard(ctx, camera, point, 0.92 * item.size, 0.56 * item.size, angle, fill, rgba("paper", 0.42), alpha, (_projected, w, h) => {
    ctx.strokeStyle = rgba("ink", 0.48);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.22, -h * 0.08);
    ctx.lineTo(w * 0.22, h * 0.05);
    ctx.moveTo(-w * 0.2, h * 0.12);
    ctx.lineTo(w * 0.14, h * 0.2);
    ctx.stroke();
  });
};

const drawBashing = (ctx, camera, state, traffic, signs, time, dt, intensity, bashing, chorus, beatPulse, stampPulse, design, vehicleLayer) => {
  const pressure = clamp((0.22 + bashing * 0.72 + chorus * 0.32 + latestPulse(time, design.impacts, 5.5) * 0.32) * intensity);
  state.shock = Math.max(0, state.shock - dt * 2.6, beatPulse * pressure * 0.82, state.manualHit * 0.78);
  state.manualHit = Math.max(0, state.manualHit - dt * 2.5);

  drawBackdrop(ctx, state, pressure, 0, chorus);
  drawEnvironment(ctx, camera, pressure, 0, chorus);

  if (vehicleLayer) {
    const vehicleCanvas = vehicleLayer.render({ state, camera, time, pressure, beatPulse, chorus });
    ctx.drawImage(vehicleCanvas, 0, 0, state.width, state.height);
  } else {
    const cars = traffic
      .map((car) => ({ type: "car", z: car.z, car }))
      .sort((a, b) => b.z - a.z);
    for (const entry of cars) drawCar3D(ctx, camera, entry.car, time, pressure, beatPulse, chorus);
  }

  drawSubject(ctx, camera, time, pressure, stampPulse);
  drawFlyingSigns(ctx, camera, signs, time, pressure, beatPulse);
  drawEyes(ctx, camera, time, pressure);
  drawImpactStamp(ctx, camera, time, pressure, stampPulse);
  drawChorusOverlay(ctx, camera, state, time, chorus, beatPulse);
  drawWindowFrame(ctx, state, time, pressure > 0.54 || stampPulse > 0.22);
};

const drawEvidenceFreeze = (ctx, camera, state, evidence, time, dt, intensity, interlude, alignPulse, design) => {
  const interludeRange = (design.scenes.interlude ?? [])[0] ?? { start: 146.3, end: 159.3 };
  const align = Math.max(smoothstep(interludeRange.end - 1.5, interludeRange.end - 0.15, time), alignPulse * 0.85);
  const lowPulse = latestPulse(time, design.impacts, 2.2) * 0.55;
  state.shock = Math.max(0, state.shock - dt * 1.7, alignPulse * 0.42);

  drawBackdrop(ctx, state, 0.18 + align * 0.3, 1, 0);
  drawEnvironment(ctx, camera, 0.1 + align * 0.28, 1, 0);

  const entries = evidence
    .map((item) => {
      const wave = Math.sin(time * 0.42 + item.drift) * (item.supported ? 0.04 : 0.22) * intensity;
      const gravityDrop = item.supported ? 0 : lowPulse * 0.26;
      const raw = {
        x: item.x + Math.sin(time * 0.28 + item.drift) * (item.supported ? 0.08 : 0.32),
        y: item.y + wave - gravityDrop,
        z: item.z + Math.cos(time * 0.22 + item.drift) * 0.22
      };
      return {
        item,
        point: {
          x: mix(raw.x, item.alignX, align),
          y: mix(raw.y, item.alignY, align),
          z: mix(raw.z, item.alignZ, align)
        },
        angle: mix(item.yaw + Math.sin(time * 0.18 + item.drift) * 0.06, 0, align),
        alpha: (0.64 + interlude * 0.28) * (0.88 + Math.sin(time * 1.7 + item.drift) * 0.08)
      };
    })
    .sort((a, b) => b.point.z - a.point.z);

  for (const entry of entries) {
    if (!entry.item.supported) {
      drawWorldLine(
        ctx,
        camera,
        { x: entry.point.x, y: FLOOR_Y + 0.04, z: entry.point.z },
        { x: entry.point.x, y: entry.point.y - 0.08, z: entry.point.z },
        rgba("paper", 0.16),
        1,
        0.55
      );
    } else {
      drawWorldLine(
        ctx,
        camera,
        { x: entry.point.x - 0.75, y: entry.point.y - 0.22, z: entry.point.z },
        { x: entry.point.x + 0.75, y: entry.point.y - 0.22, z: entry.point.z },
        rgba("gold", 0.32),
        2,
        0.8
      );
    }
    drawEvidenceItem(ctx, camera, entry.item, entry.point, entry.angle, entry.alpha, align > 0.34);
  }

  ctx.save();
  ctx.fillStyle = rgba("gold", 0.88);
  ctx.font = "12px ui-monospace, Consolas, monospace";
  ctx.fillText("EVIDENCE FREEZE", state.width * 0.1, state.height * 0.12);
  ctx.fillStyle = align > 0.28 ? rgba("rust", 0.92) : rgba("paper", 0.82);
  ctx.fillText(align > 0.28 ? "RE-ORDERING" : "TIME HELD", state.width * 0.1, state.height * 0.88);
  ctx.restore();

  drawWindowFrame(ctx, state, time, align > 0.3);
};

export const createSongApp = async (context, services) => {
  const { musicMap } = context;
  const { canvas, ctx } = services;
  const design = await loadDesign(context);
  const vehicleModels = await loadVehicleModels(context, design);
  const traffic = makeTraffic(vehicleModels);
  const vehicleLayer = await createVehicleThreeLayer(context, services, vehicleModels, traffic);
  const signs = makeFlyingSigns(design.labels ?? DEFAULT_DESIGN.labels);
  const evidence = makeEvidence();
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    pointer: { x: 0.5, y: 0.5, active: false, down: false },
    lastBeat: -1,
    shock: 0,
    manualHit: 0
  };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(1, rect.width);
    state.height = Math.max(1, rect.height);
    canvas.width = Math.round(state.width * state.dpr);
    canvas.height = Math.round(state.height * state.dpr);
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    vehicleLayer?.resize(state.width, state.height, state.dpr);
  };

  const updatePointer = (event) => {
    const rect = canvas.getBoundingClientRect();
    state.pointer.x = clamp((event.clientX - rect.left) / rect.width);
    state.pointer.y = clamp((event.clientY - rect.top) / rect.height);
    state.pointer.active = true;
  };

  const render = ({ time, dt, userGlow }) => {
    if (!state.width || !state.height) resize();
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    const intensity = userGlow ?? 1;
    const beats = musicMap.beats ?? [];
    const { index, beat } = findBeat(time, beats);
    if (index !== state.lastBeat) {
      const downbeat = beat?.position === 1 || index % 4 === 0;
      state.shock = Math.max(state.shock, downbeat ? 0.5 : 0.22);
      state.lastBeat = index;
    }
    const beatPulse = beat ? pulse(time - beat.time, beat.position === 1 ? 8 : 10) : 0;
    const bashing = rangeValue(time, design.scenes.bashing, 1.4);
    const chorus = rangeValue(time, design.scenes.chorus ?? design.scenes.bashing, 0.9);
    const interlude = rangeValue(time, design.scenes.interlude, 1.1);
    const stampPulse = latestPulse(time, design.impacts, 5.8, "stamp");
    const alignPulse = latestPulse(time, design.impacts, 3.8, "align");
    const camera = makeCamera(state, time, state.shock);

    if (interlude > 0.02) {
      drawEvidenceFreeze(ctx, camera, state, evidence, time, dt, intensity, interlude, alignPulse, design);
      return;
    }
    drawBashing(ctx, camera, state, traffic, signs, time, dt, intensity, bashing, chorus, beatPulse, stampPulse, design, vehicleLayer);
  };

  resize();

  return {
    id: `${context.manifest.id}:projector-window-3d`,
    status: `traffic jam 60deg black chorus view / ${vehicleLayer ? `Kenney GLB WebGL vehicles x${vehicleLayer.readyCount}` : "Canvas vehicle fallback"}`,
    render,
    resize,
    pointerMove(event) {
      updatePointer(event);
    },
    pointerLeave() {
      state.pointer.active = false;
    },
    pointerDown(event) {
      state.pointer.down = true;
      state.manualHit = 1;
      updatePointer(event);
    },
    pointerUp() {
      state.pointer.down = false;
    },
    resetVisualTiming() {
      state.shock = 0;
      state.manualHit = 0;
      state.lastBeat = -1;
    },
    dispose() {
      vehicleLayer?.dispose();
    }
  };
};
