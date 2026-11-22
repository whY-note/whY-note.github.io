import * as THREE from "three";

// A tree seen through a small window needs connected, tapering branches and
// gaps between individual leaves. Keep both meshes batched and deterministic.
export function refineWindowScenery(model) {
  const window = model.getObjectByName("Window");
  const sky = model.getObjectByName("WindowSky_NoShadow");
  const sun = model.getObjectByName("Sun_NoShadow");
  if (!window || !sky || !sun) throw new Error("Missing window scenery objects");
  const oldTree = [];
  window.traverse((object) => { if (/^Tree[ _]/.test(object.name)) oldTree.push(object); });
  for (const object of oldTree) object.removeFromParent();

  sun.geometry = new THREE.CircleGeometry(1, 64);
  // Unlit, without tone mapping: the disk stays gold instead of washing out
  // under the room's exposure and strong daytime illumination.
  sun.material = new THREE.MeshBasicMaterial({ color: 0xffc12f, toneMapped: false });
  sun.material.name = "Golden sun";

  sky.updateMatrix();
  sky.geometry.computeBoundingBox();
  const bounds = sky.geometry.boundingBox.clone().applyMatrix4(sky.matrix);
  const width = bounds.max.x - bounds.min.x;
  const height = bounds.max.y - bounds.min.y;
  const depth = bounds.max.z + .045;
  const point = (x, y, z = 0) => new THREE.Vector3(bounds.min.x + x * width, bounds.min.y + y * height, depth + z);
  let seed = 2147;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + (b - a) * random();
  const bark = { positions: [], colors: [], indices: [] };
  const leaves = { positions: [], colors: [], indices: [] };
  const palette = [0x536a3f, 0x667c45, 0x78894e, 0x8f9b5e, 0xa2ab6b, 0x455d38].map((hex) => new THREE.Color(hex));

  function branch(curve, radius, tipRadius, segments) {
    const frames = curve.computeFrenetFrames(segments, false);
    const offset = bark.positions.length / 3;
    const twig = radius < .01;
    const sides = twig ? 2 : 6;
    const phase = range(0, Math.PI * 2);
    for (let i = 0; i <= segments; i++) {
      const centre = curve.getPointAt(i / segments);
      const r = THREE.MathUtils.lerp(radius, tipRadius, i / segments);
      for (let j = 0; j < sides; j++) {
        const angle = j / sides * Math.PI * 2 + phase;
        const tangent = curve.getTangentAt(i / segments);
        const vertex = twig
          ? centre.clone().addScaledVector(new THREE.Vector3(-tangent.y, tangent.x, 0).normalize(), j === 0 ? -r : r)
          : centre.clone().addScaledVector(frames.normals[i], Math.cos(angle) * r)
            .addScaledVector(frames.binormals[i], Math.sin(angle) * r);
        bark.positions.push(...vertex.toArray());
        const shade = range(.82, 1.06) * (.86 + .14 * Math.sin(angle));
        const tint = new THREE.Color(0x665846).multiplyScalar(shade);
        bark.colors.push(tint.r, tint.g, tint.b);
        if (i < segments && (!twig || j === 0)) {
          const a = offset + i * sides + j, b = offset + i * sides + (j + 1) % sides;
          bark.indices.push(a, b, a + sides, b, b + sides, a + sides);
        }
      }
    }
  }

  function leaf(base, angle, length) {
    // Leave an opening around the sun, with foliage below and to its right.
    const nx = (base.x - bounds.min.x) / width, ny = (base.y - bounds.min.y) / height;
    if (((nx - .125) / .12) ** 2 + ((ny - .85) / .15) ** 2 < 1) return;
    const along = new THREE.Vector3(Math.cos(angle), Math.sin(angle), range(-.17, .17)).normalize();
    const across = new THREE.Vector3(-along.y, along.x, range(-.35, .35)).normalize();
    const halfWidth = length * range(.20, .31);
    const middle = base.clone().addScaledVector(along, length * .48);
    const vertices = [base, middle.clone().addScaledVector(across, halfWidth).add(new THREE.Vector3(0,0,-.004)),
      base.clone().addScaledVector(along, length), middle.clone().addScaledVector(across, -halfWidth).add(new THREE.Vector3(0,0,-.004))];
    const tint = palette[Math.floor(random() * palette.length)];
    const offset = leaves.positions.length / 3;
    for (const [i, vertex] of vertices.entries()) {
      vertex.x = THREE.MathUtils.clamp(vertex.x, bounds.min.x + .02, bounds.max.x - .02);
      vertex.y = THREE.MathUtils.clamp(vertex.y, bounds.min.y + .015, bounds.max.y - .015);
      leaves.positions.push(...vertex.toArray());
      const shade = i === 1 ? .90 : i === 3 ? 1.08 : 1;
      leaves.colors.push(tint.r * shade, tint.g * shade, tint.b * shade);
    }
    leaves.indices.push(offset,offset+1,offset+2,offset,offset+2,offset+3);
  }

  function foliage(curve, pairs) {
    for (let i = 0; i < pairs; i++) {
      const t = .20 + i / pairs * .77;
      for (const side of [-1, 1]) {
        const at = Math.min(.99, t + range(-.025, .025));
        const tangent = curve.getTangentAt(at);
        const angle = Math.atan2(tangent.y, tangent.x) + side * range(.55, 1.45);
        leaf(curve.getPointAt(at), angle, range(.055, .115));
      }
    }
    const end = curve.getPointAt(1), tangent = curve.getTangentAt(1);
    leaf(end, Math.atan2(tangent.y, tangent.x), .075);
  }

  const trunk = new THREE.CatmullRomCurve3([
    point(.91,.015), point(.89,.18,.003), point(.86,.34,-.006), point(.82,.52,.004),
    point(.84,.69,-.003), point(.79,.84,.002), point(.80,.98)
  ]);
  branch(trunk, .042, .004, 18);
  const limbs = [[.22,.37,.40],[.39,.13,.72],[.56,.38,.95],[.72,.63,.97],[.34,.96,.56],[.62,.96,.85]];
  for (const [at, x, y] of limbs) {
    const start = trunk.getPointAt(at), end = point(x, y, range(-.008,.008));
    const delta = end.clone().sub(start);
    const limb = new THREE.CatmullRomCurve3([start,
      start.clone().addScaledVector(delta, .3).add(new THREE.Vector3(.035,-.055,range(-.006,.006))),
      start.clone().addScaledVector(delta, .70).add(new THREE.Vector3(-.035,.025,range(-.006,.006))), end]);
    branch(limb, .023 * (1 - at * .5), .002, 7);
    foliage(limb, 9);
    for (let i = 0; i < 5; i++) {
      const t = .24 + i * .145;
      for (const side of [-1, 1]) {
        const base = limb.getPointAt(t + range(-.02,.02));
        const tangent = limb.getTangentAt(t);
        const angle = Math.atan2(tangent.y, tangent.x) + side * range(.50,1.10);
        const length = range(.16,.33) * (1 - t * .25);
        const tip = base.clone().add(new THREE.Vector3(Math.cos(angle) * length, Math.sin(angle) * length, range(-.013,.013)));
        tip.x = THREE.MathUtils.clamp(tip.x, bounds.min.x + .12, bounds.max.x - .10);
        tip.y = THREE.MathUtils.clamp(tip.y, bounds.min.y + .30, bounds.max.y - .10);
        const middle = base.clone().lerp(tip,.5).add(new THREE.Vector3(range(-.02,.02),.018,0));
        const twig = new THREE.CatmullRomCurve3([base,middle,tip]);
        branch(twig,.0048,.0008,3);
        foliage(twig, 5 + Math.floor(random() * 4));
      }
    }
  }

  const tree = new THREE.Group();
  tree.name = "WindowTree";
  function mesh(name, data, material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(data.colors, 3));
    geometry.setIndex(data.indices);
    geometry.computeVertexNormals();
    const object = new THREE.Mesh(geometry, material);
    object.name = name;
    tree.add(object);
  }
  mesh("Tree branches_NoShadow", bark, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .95, side: THREE.DoubleSide }));
  const leafMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .92, side: THREE.DoubleSide });
  leafMaterial.name = "Leaves";
  mesh("Tree leaves_NoShadow", leaves, leafMaterial);
  window.add(tree);
}
