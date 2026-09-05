import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A small, walkable interpretation of Badaguan's garden architecture. */
export function createArchitecture(THREE, scene) {
  const group = new THREE.Group();
  group.name = 'Badaguan heritage gardens';
  const buckets = new Map();
  const colliders = [];
  const landmarks = [];
  let transform = new THREE.Matrix4();
  let seed = 73;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  function texture(kind) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (kind === 'stone') {
      ctx.fillStyle = '#726f62'; ctx.fillRect(0, 0, 512, 512);
      for (let row = 0; row < 9; row++) {
        let x = row % 2 ? -30 : -70;
        while (x < 512) {
          const width = 50 + random() * 50;
          const light = 48 + random() * 14;
          ctx.fillStyle = `hsl(38, ${6 + random() * 8}%, ${light}%)`;
          ctx.fillRect(x + 2, row * 57 + 2, width - 4, 52);
          ctx.strokeStyle = 'rgba(232,226,205,.25)';
          ctx.strokeRect(x + 3, row * 57 + 3, width - 6, 50);
          for (let i = 0; i < 35; i++) {
            ctx.fillStyle = random() > .5 ? 'rgba(255,255,244,.12)' : 'rgba(35,33,26,.09)';
            ctx.fillRect(x + random() * width, row * 57 + random() * 51 + 3, 1 + random() * 4, 1);
          }
          x += width;
        }
      }
    } else if (kind === 'roof') {
      ctx.fillStyle = '#894630'; ctx.fillRect(0, 0, 512, 512);
      for (let y = -1; y < 13; y++) {
        for (let x = -1; x < 9; x++) {
          const xx = x * 64 + (y % 2) * 32;
          const yy = y * 43;
          const light = 33 + random() * 13;
          ctx.fillStyle = `hsl(${12 + random() * 7}, ${38 + random() * 12}%, ${light}%)`;
          ctx.fillRect(xx + 1, yy + 1, 62, 42);
          const shade = ctx.createLinearGradient(xx, 0, xx + 64, 0);
          shade.addColorStop(0, 'rgba(45,15,10,.25)');
          shade.addColorStop(.38, 'rgba(255,191,130,.13)');
          shade.addColorStop(1, 'rgba(30,15,9,.16)');
          ctx.fillStyle = shade; ctx.fillRect(xx + 1, yy + 1, 62, 42);
          ctx.strokeStyle = 'rgba(53,28,17,.4)';
          ctx.beginPath(); ctx.moveTo(xx + 1, yy + 40); ctx.quadraticCurveTo(xx + 32, yy + 48, xx + 63, yy + 40); ctx.stroke();
          ctx.fillStyle = 'rgba(243,191,137,.18)'; ctx.fillRect(xx + 3, yy + 2, 58, 1);
        }
      }
    } else {
      ctx.fillStyle = '#eee5cf'; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 16000; i++) {
        ctx.fillStyle = random() > .5 ? 'rgba(255,255,245,.16)' : 'rgba(84,69,39,.055)';
        ctx.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
      }
    }
    const map = new THREE.CanvasTexture(canvas);
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return map;
  }
  const plaster = texture('plaster');
  const stone = texture('stone');
  const roof = texture('roof');
  const material = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: .86, ...options });
  const m = {
    cream: material('#e5d3ac', { map: plaster }),
    ivory: material('#e7ddc8', { map: plaster }),
    mint: material('#a9b9a0', { map: plaster }),
    peach: material('#cbb29b', { map: plaster }),
    trim: material('#f1e8d2'),
    trimShade: material('#b8ac90'),
    stone: material('#d4cbbb', { map: stone }),
    paleStone: material('#ebe0c7', { map: stone }),
    roof: material('#f7d4b4', { map: roof, roughness: .94, side: THREE.DoubleSide }),
    roofEdge: material('#874732'),
    glass: material('#203e40', { roughness: .22, metalness: .28 }),
    glassSoft: material('#53645c', { roughness: .34, metalness: .2 }),
    shutter: material('#495c4c'),
    wood: material('#59462f'),
    iron: material('#343d35', { roughness: .65, metalness: .35 }),
    brass: material('#978060', { roughness: .5, metalness: .6 }),
    paving: material('#b9b39c', { map: stone }),
    light: material('#f3d8a1', { emissive: '#eab977', emissiveIntensity: .25 }),
  };

  function add(geometry, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const local = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
      new THREE.Vector3(1, 1, 1),
    );
    geometry.applyMatrix4(transform.clone().multiply(local));
    const nonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    if (nonIndexed !== geometry) geometry.dispose();
    if (!buckets.has(mat)) buckets.set(mat, []);
    buckets.get(mat).push(nonIndexed);
  }
  function box(w, h, d, mat, x, y, z, ry = 0) {
    add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, 0, ry);
  }
  function cylinder(rTop, rBottom, h, mat, x, y, z, segments = 16) {
    add(new THREE.CylinderGeometry(rTop, rBottom, h, segments), mat, x, y, z);
  }
  function scope(x, y, z, ry, callback) {
    const saved = transform;
    transform = transform.clone().multiply(new THREE.Matrix4().makeTranslation(x, y, z)).multiply(new THREE.Matrix4().makeRotationY(ry));
    callback();
    transform = saved;
  }
  function beam(a, b, width, depth, mat) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const mid = start.clone().add(end).multiplyScalar(.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    const geo = new THREE.BoxGeometry(width, start.distanceTo(end), depth);
    geo.applyQuaternion(q); add(geo, mat, mid.x, mid.y, mid.z);
  }
  function triangle(w, h, z, y, mat) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, 0, 0, w / 2, 0, 0, 0, h, 0], 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, .5, 1], 2));
    geo.computeVertexNormals();
    add(geo, mat, 0, y, z);
  }
  function gable(w, d, y, rise, wallMat, x = 0, z = 0) {
    scope(x, 0, z, 0, () => {
      triangle(w, rise, d / 2, y, wallMat);
      scope(0, 0, 0, Math.PI, () => triangle(w, rise, d / 2, y, wallMat));
      const half = w / 2 + .38, extent = d / 2 + .45;
      const apex = y + rise + .08;
      const slopeLength = Math.sqrt(half * half + rise * rise);
      for (const side of [-1, 1]) {
        const positions = [0, apex, -extent, side * half, y - .12, -extent, side * half, y - .12, extent, 0, apex, extent];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, slopeLength / 4, 0, slopeLength / 4, d / 4, 0, d / 4], 2));
        geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals(); add(geo, m.roof);
        box(.16, .22, d + 1, m.roofEdge, side * half, y - .12, 0);
        for (const end of [-1, 1]) beam([0, apex - .04, end * extent], [side * half, y - .15, end * extent], .17, .18, m.trim);
      }
      box(.25, .18, d + 1, m.roofEdge, 0, apex + .04, 0);
      // Small terracotta ridge caps catch the low coastal light.
      for (let zz = -extent; zz <= extent; zz += .45) {
        add(new THREE.CylinderGeometry(.17, .17, .42, 8, 1, true, 0, Math.PI), m.roofEdge, 0, apex + .025, zz, Math.PI / 2);
      }
    });
  }
  function window(w, h, x, y, z, options = {}) {
    const { shutters = false, arched = false, soft = false } = options;
    const glassMat = soft ? m.glassSoft : m.glass;
    box(w + .2, h + .2, .12, m.trimShade, x, y, z + .03);
    box(w, h, .12, glassMat, x, y, z + .12);
    box(w + .28, .12, .28, m.trim, x, y + h / 2 + .03, z + .17);
    box(w + .4, .15, .43, m.trim, x, y - h / 2 - .02, z + .23);
    box(.105, h, .23, m.trim, x - w / 2 + .045, y, z + .19);
    box(.105, h, .23, m.trim, x + w / 2 - .045, y, z + .19);
    box(.075, h, .16, m.trim, x, y, z + .2);
    box(w, .07, .17, m.trim, x, y + h * .13, z + .21);
    box(w, .065, .17, m.trim, x, y - h * .25, z + .21);
    // A pulled-back pale curtain gives glazing depth without transparency sorting.
    box(w * .1, h * .9, .012, m.trimShade, x - w * .34, y, z + .185);
    if (arched) {
      const shape = new THREE.Shape();
      shape.moveTo(-w / 2, 0); shape.absarc(0, 0, w / 2, Math.PI, 0, true); shape.lineTo(-w / 2, 0);
      add(new THREE.ShapeGeometry(shape, 20), glassMat, x, y + h / 2, z + .13);
      const arch = new THREE.TorusGeometry(w / 2 + .045, .095, 5, 22, Math.PI);
      add(arch, m.trim, x, y + h / 2, z + .2);
      box(.075, w * .48, .13, m.trim, x, y + h / 2 + w * .24, z + .21);
    }
    if (shutters) {
      for (const side of [-1, 1]) {
        const sx = x + side * (w * .75 + .13);
        box(w * .43, h + .08, .095, m.shutter, sx, y, z + .14);
        for (let yy = -h / 2 + .17; yy < h / 2; yy += .19) box(w * .37, .035, .05, m.wood, sx, y + yy, z + .21);
        box(.045, h + .1, .07, m.trimShade, sx + side * w * .21, y, z + .19);
      }
    }
  }
  function railing(w, x, y, z, h = .9) {
    box(w, .08, .075, m.iron, x, y + h, z);
    box(w, .055, .065, m.iron, x, y + .16, z);
    for (let xx = -w / 2; xx <= w / 2 + .01; xx += .32) {
      box(.035, h, .035, m.iron, x + xx, y + h / 2, z);
      if (Math.round((xx + w / 2) / .32) % 3 === 0) cylinder(.055, .055, .1, m.brass, x + xx, y + h + .04, z, 6);
    }
  }
  function chimney(x, y, z, h = 2) {
    box(.85, h, .85, m.paleStone, x, y + h / 2, z);
    box(1.02, .15, 1.02, m.trimShade, x, y + h - .05, z);
    cylinder(.16, .2, .42, m.roofEdge, x - .2, y + h + .15, z);
    cylinder(.16, .2, .42, m.roofEdge, x + .2, y + h + .15, z);
  }
  function steps(w, depth, x, z, count = 4) {
    for (let i = 0; i < count; i++) box(w + (count - i) * .18, .16 * (i + 1), depth - i * .32, m.paleStone, x, .08 * (i + 1), z - i * .16);
  }
  function door(x, z, h = 2.55, w = 1.45) {
    box(w + .38, h + .24, .16, m.trim, x, h / 2 + .55, z + .13);
    box(w, h, .18, m.wood, x, h / 2 + .55, z + .24);
    for (const s of [-1, 1]) {
      box(w * .38, h * .35, .04, m.glass, x + s * w * .24, h * .76 + .55, z + .35);
      box(w * .31, h * .32, .045, m.shutter, x + s * w * .24, h * .29 + .55, z + .35);
    }
    cylinder(.035, .035, .25, m.brass, x + .16, 1.65, z + .4, 8);
    box(w + .55, .16, .54, m.trim, x, h + .75, z + .2);
  }
  function lamp(x, y, z) {
    box(.07, .55, .07, m.iron, x, y + .16, z);
    box(.07, .07, .35, m.iron, x, y + .39, z + .13);
    box(.28, .39, .25, m.light, x, y + .12, z + .32);
    for (const s of [-1, 1]) box(.035, .44, .29, m.iron, x + s * .145, y + .12, z + .32);
    box(.37, .055, .34, m.iron, x, y + .35, z + .32);
    add(new THREE.ConeGeometry(.3, .15, 4), m.iron, x, y + .46, z + .32, 0, Math.PI / 4);
  }
  function garden(w, d, frontZ) {
    // Low granite enclosures, with a broad opening to the lane.
    for (const side of [-1, 1]) {
      const len = (w - 3.3) / 2;
      const xx = side * (1.65 + len / 2);
      box(len, .52, .5, m.stone, xx, .26, frontZ);
      box(len + .06, .11, .6, m.trimShade, xx, .575, frontZ);
      railing(len, xx, .61, frontZ, .72);
      for (const px of [side * 1.7, side * w / 2]) {
        box(.6, 1.35, .65, m.stone, px, .675, frontZ);
        box(.78, .13, .79, m.trim, px, 1.42, frontZ);
      }
      box(.45, .54, d, m.stone, side * w / 2, .27, frontZ - d / 2);
      box(.57, .1, d, m.trimShade, side * w / 2, .59, frontZ - d / 2);
    }
    box(2.9, .055, 5.5, m.paving, 0, .035, frontZ - 2.7);
  }
  function villa({ x, z, rotation = 0, w = 14, d = 10, wall = m.cream, floors = 2, hero = false, id }) {
    const h = floors === 2 ? 7.4 : 10.1;
    scope(x, 0, z, rotation, () => {
      box(w + .35, .68, d + .3, m.stone, 0, .34, 0);
      box(w, h, d, wall, 0, h / 2 + .6, 0);
      box(w + .38, .22, d + .35, m.trimShade, 0, .72, 0);
      box(w + .24, .2, d + .24, m.trim, 0, 4.18, 0);
      box(w + .5, .24, d + .5, m.trim, 0, h + .48, 0);
      box(w + .68, .2, d + .68, m.trimShade, 0, h + .68, 0);
      for (const xx of [-w / 2, w / 2]) for (const zz of [-d / 2, d / 2]) {
        for (let yy = .98; yy < h + .5; yy += .5) box(.45 + (Math.round(yy * 2) % 2) * .2, .28, .36, m.trim, xx, yy, zz + Math.sign(zz) * .04);
      }
      gable(w, d, h + .73, w * .31, wall);
      if (hero || w > 13.5) {
        for (const side of [-1, 1]) for (const zz of [-d * .24, d * .24]) {
          const roofY = h + .73 + w * .31 * .43;
          scope(side * w * .285, 0, zz, side * Math.PI / 2, () => {
            box(1.85, 1.65, 1.65, wall, 0, roofY + .64, -.14);
            window(1.12, 1.25, 0, roofY + .8, .72);
            gable(2.12, 1.9, roofY + 1.53, .9, wall, 0, -.14);
          });
        }
      }
      // Slim painted rainwater pipes and zinc gutters are visible at street level.
      for (const xx of [-w / 2 - .13, w / 2 + .13]) {
        cylinder(.055, .055, h - .1, m.iron, xx, h / 2 + .7, d / 2 - .33, 7);
        for (let yy = 1.2; yy < h; yy += 2) box(.19, .05, .12, m.iron, xx, yy, d / 2 - .33);
      }
      for (const zz of [-1, 1]) scope(0, 0, zz * d / 2, zz < 0 ? Math.PI : 0, () => {
        const columns = w > 13 ? [-w * .34, -w * .115, w * .115, w * .34] : [-w * .3, 0, w * .3];
        for (let floor = 0; floor < floors; floor++) {
          const yy = 2.47 + floor * 3.22;
          for (const xx of columns) {
            if (zz > 0 && floor === 0 && Math.abs(xx) < 2) continue;
            window(1.35, 2.05, xx, yy, .035, { shutters: !hero && Math.abs(xx) > 2, arched: hero && floor === 0, soft: random() > .77 });
          }
        }
        window(1.12, 1.5, 0, h + 1.76, .055, { arched: hero });
        if (zz > 0) {
          door(0, 0); lamp(-1.6, 2.7, .05); lamp(1.6, 2.7, .05);
          steps(3, 1.8, 0, 1);
          if (hero) {
            box(5, .28, 2.05, m.trim, 0, 4.17, .78);
            railing(4.8, 0, 4.31, 1.74);
            scope(-2.35, 0, .75, Math.PI / 2, () => railing(2, 0, 4.31, 0));
            scope(2.35, 0, .75, Math.PI / 2, () => railing(2, 0, 4.31, 0));
            for (const px of [-2, 2]) {
              cylinder(.14, .18, 3.35, m.trim, px, 2.46, 1.5);
              box(.47, .2, .47, m.trim, px, .86, 1.5);
              box(.45, .19, .45, m.trim, px, 4.05, 1.5);
            }
          }
        }
      });
      for (const s of [-1, 1]) scope(s * w / 2, 0, 0, s * Math.PI / 2, () => {
        for (const zz of [-d * .29, d * .29]) for (let floor = 0; floor < floors; floor++) window(1.4, 2.05, zz, 2.47 + floor * 3.22, .035, { shutters: true });
      });
      chimney(-w * .27, h + w * .21, -d * .24, 1.7);
      chimney(w * .29, h + w * .2, d * .25, 1.45);
      if (hero) {
        // An offset projecting bay breaks the symmetrical garden-villa massing.
        const bx = -w * .33;
        box(3.3, 3.75, 1.6, wall, bx, 2.52, d / 2 + .65);
        box(3.55, .22, 1.87, m.trim, bx, 4.43, d / 2 + .72);
        window(1.5, 2.05, bx, 2.6, d / 2 + 1.48, { arched: true });
        scope(bx, 0, d / 2 + .7, 0, () => gable(3.65, 2.1, 4.55, 1.5, wall));
      }
      garden(w + 7, d + 6.5, d / 2 + 5.5);
    });
    const swap = Math.abs(Math.sin(rotation)) > .5;
    colliders.push({ minX: x - (swap ? d : w) / 2 - .4, maxX: x + (swap ? d : w) / 2 + .4, minZ: z - (swap ? w : d) / 2 - .4, maxZ: z + (swap ? w : d) / 2 + .4 });
    if (id) landmarks.push({ id, position: new THREE.Vector3(x, h + 3, z) });
  }

  villa({ x: -19, z: 5, rotation: Math.PI / 2, w: 15.2, d: 11.5, hero: true, id: 'garden-villa' });
  villa({ x: -22, z: -30, rotation: Math.PI / 2, w: 13.5, d: 11, wall: m.ivory });
  villa({ x: -21, z: -65, rotation: Math.PI / 2, w: 12.6, d: 10.5, wall: m.peach });
  villa({ x: -24, z: 45, rotation: Math.PI / 2, w: 12, d: 10, wall: m.ivory });
  villa({ x: -48, z: -40, rotation: .17, w: 14, d: 10, wall: m.cream });

  // Princess House: pale green stucco, steep warm roofs and a small Gothic turret.
  villa({ x: 20, z: -38, rotation: -Math.PI / 2, w: 13.5, d: 10, wall: m.mint, hero: true, id: 'princess-house' });
  scope(20, 0, -38, -Math.PI / 2, () => {
    const tx = 5.8, tz = 3.75;
    cylinder(2.05, 2.1, 9.5, m.mint, tx, 5.2, tz, 8);
    cylinder(2.15, 2.15, .3, m.trim, tx, 9.8, tz, 8);
    cylinder(0, 2.65, 5.7, m.roof, tx, 12.73, tz, 8);
    cylinder(.025, .07, 1.1, m.iron, tx, 16.12, tz, 8);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      scope(tx + Math.sin(a) * 1.92, 0, tz + Math.cos(a) * 1.92, a, () => window(.82, 1.65, 0, 7.9, 0, { arched: true }));
    }
  });

  // Huashi House: mottled granite, an articulated stone wing and a crenellated
  // round observation tower, as seen in the Qingdao Daily architectural record.
  const graniteCanvas = document.createElement('canvas');
  graniteCanvas.width = graniteCanvas.height = 512;
  const graniteCtx = graniteCanvas.getContext('2d');
  graniteCtx.fillStyle = '#575951'; graniteCtx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 8; row++) {
    let xx = row % 2 ? -36 : -9;
    while (xx < 512) {
      const ww = 44 + random() * 40, yy = row * 64;
      const lightness = 49 + random() * 19;
      graniteCtx.fillStyle = `hsl(${35 + random() * 35},${3 + random() * 7}%,${lightness}%)`;
      graniteCtx.beginPath();
      graniteCtx.moveTo(xx + 5, yy + 3); graniteCtx.lineTo(xx + ww - 6, yy + 2 + random() * 5);
      graniteCtx.lineTo(xx + ww - 2, yy + 54); graniteCtx.lineTo(xx + ww - 9, yy + 61);
      graniteCtx.lineTo(xx + 3, yy + 59); graniteCtx.closePath(); graniteCtx.fill();
      graniteCtx.strokeStyle = 'rgba(223,224,216,.3)'; graniteCtx.lineWidth = 1.5; graniteCtx.stroke();
      for (let dot = 0; dot < 300; dot++) {
        graniteCtx.fillStyle = random() > .48 ? 'rgba(237,238,229,.24)' : 'rgba(29,32,27,.20)';
        graniteCtx.fillRect(xx + 5 + random() * (ww - 12), yy + 7 + random() * 47, 1 + random() * 3, 1 + random() * 2);
      }
      xx += ww;
    }
  }
  const graniteMap = new THREE.CanvasTexture(graniteCanvas);
  graniteMap.colorSpace = THREE.SRGBColorSpace;
  graniteMap.wrapS = graniteMap.wrapT = THREE.RepeatWrapping;
  graniteMap.repeat.set(2.5, 2.5); graniteMap.anisotropy = 8;
  const granite = material('#d1d4cf', { map: graniteMap, bumpMap: graniteMap, bumpScale: .13, roughness: .99 });
  const graniteTrim = material('#9a9d91', { map: stone, bumpMap: stone, bumpScale: .04 });
  function stoneRing(radius, thickness, height, x, y, z) {
    const outline = new THREE.Shape(); outline.absarc(0, 0, radius, 0, Math.PI * 2, false);
    const inner = new THREE.Path(); inner.absarc(0, 0, radius - thickness, 0, Math.PI * 2, true); outline.holes.push(inner);
    const ring = new THREE.ExtrudeGeometry(outline, { depth: height, bevelEnabled: false, curveSegments: 32 });
    ring.rotateX(-Math.PI / 2); add(ring, graniteTrim, x, y, z);
  }
  function battlements(radius, y, x, z, count) {
    stoneRing(radius, .38, .45, x, y, z);
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      box(.76, .63, .43, granite, x + Math.sin(angle) * (radius - .19), y + .69, z + Math.cos(angle) * (radius - .19), angle);
      box(.83, .11, .53, graniteTrim, x + Math.sin(angle) * (radius - .19), y + 1.06, z + Math.cos(angle) * (radius - .19), angle);
    }
  }
  scope(35, 0, -91, -.22, () => {
    box(14, .8, 12, granite, 0, .4, 0);
    box(13.5, 8.9, 11.5, granite, 0, 5.2, 0);
    box(13.8, .28, 11.8, graniteTrim, 0, 5.15, 0);
    box(14, .32, 12, graniteTrim, 0, 9.7, 0);
    box(13.5, .16, 11.5, m.paving, 0, 9.94, 0);
    for (const side of [-1, 1]) {
      box(13.8, .8, .42, granite, 0, 10.34, side * 5.75);
      box(.42, .8, 11.7, granite, side * 6.75, 10.34, 0);
      box(14, .12, .56, graniteTrim, 0, 10.79, side * 5.75);
      box(.56, .12, 11.7, graniteTrim, side * 6.75, 10.79, 0);
      for (const xx of [-6.6, -3.3, 0, 3.3, 6.6]) box(.72, .35, .6, granite, xx, 10.99, side * 5.75);
    }
    for (const side of [-1, 1]) scope(0, 0, side * 5.75, side === 1 ? 0 : Math.PI, () => {
      for (const xx of [-4.6, -.3, 3.6]) {
        window(1.35, 2.2, xx, 3.1, .06, { arched: true });
        window(1.35, 2.3, xx, 7.35, .06, { arched: true });
      }
    });
    scope(-6.75, 0, 0, -Math.PI / 2, () => {
      for (const xx of [-3.4, 1.3, 3.6]) { window(1.25, 2.2, xx, 3.1, .04, { arched: true }); window(1.25, 2.3, xx, 7.35, .04, { arched: true }); }
    });
    const tx = 5.7, tz = 3.8;
    cylinder(3.5, 3.7, 1.2, graniteTrim, tx, .6, tz, 32);
    cylinder(3.4, 3.45, 13.3, granite, tx, 7.65, tz, 32);
    for (const yy of [1.3, 5.2, 9.75, 13.65, 14.1]) cylinder(3.58, 3.58, .21, graniteTrim, tx, yy, tz, 32);
    cylinder(3.56, 3.56, .16, m.paving, tx, 14.27, tz, 32);
    battlements(3.62, 14.3, tx, tz, 16);
    // The projecting circular balcony forms the distinctive heavy stone cornice.
    cylinder(3.96, 3.48, .36, graniteTrim, tx, 9.86, tz, 32);
    stoneRing(3.98, .22, .42, tx, 10.02, tz);
    for (let i = 0; i < 24; i++) {
      const angle = i / 24 * Math.PI * 2;
      box(.13, .72, .15, graniteTrim, tx + Math.sin(angle) * 3.84, 10.63, tz + Math.cos(angle) * 3.84, angle);
    }
    stoneRing(4.02, .29, .14, tx, 10.99, tz);
    for (let i = 0; i < 10; i++) {
      const angle = i / 10 * Math.PI * 2;
      scope(tx + Math.sin(angle) * 3.39, 0, tz + Math.cos(angle) * 3.39, angle, () => {
        window(.84, 1.62, 0, 12.05, .005, { arched: true });
        if (i % 2 === 0) window(1.08, 2.1, 0, 7.3, .02, { arched: true });
      });
    }
    // A lower round stair turret and square wing give the castle its layered outline.
    cylinder(2.22, 2.4, 10.6, granite, -5.75, 5.7, 4.2, 24);
    cylinder(2.4, 2.4, .23, graniteTrim, -5.75, 11.05, 4.2, 24);
    battlements(2.44, 11.18, -5.75, 4.2, 11);
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      scope(-5.75 + Math.sin(angle) * 2.22, 0, 4.2 + Math.cos(angle) * 2.22, angle, () => {
        window(.85, 1.95, 0, 7.95, .035, { arched: true });
        if (i % 2 === 0) window(.85, 1.95, 0, 3.8, .04, { arched: true });
      });
    }
    // Stone entrance porch and its balustraded terrace.
    box(4.5, 4.35, 3.7, granite, -2.9, 2.85, 6.7);
    door(-2.9, 8.56, 2.8, 1.8);
    steps(3.2, 2.3, -2.9, 9.75, 5);
    box(4.9, .3, 4.1, graniteTrim, -2.9, 5.14, 6.8);
    for (const xx of [-4.9, -4.4, -3.9, -3.4, -2.9, -2.4, -1.9, -1.4, -.9]) cylinder(.075, .12, .72, graniteTrim, xx, 5.7, 8.6, 8);
    box(4.9, .16, .4, graniteTrim, -2.9, 6.12, 8.6);
    for (const xx of [-4.5, -1.3]) {
      cylinder(.18, .23, 3.8, graniteTrim, xx, 2.95, 8.4, 12);
      box(.64, .24, .64, graniteTrim, xx, 4.91, 8.4);
    }
    box(.8, 2.5, .9, granite, -4.1, 11.2, -2.4);
    box(1.04, .18, 1.14, graniteTrim, -4.1, 12.5, -2.4);
    garden(24, 19, 13);
  });
  colliders.push({ minX: 26.5, maxX: 45, minZ: -98, maxZ: -81.5 });
  landmarks.push({ id: 'huashi-house', position: new THREE.Vector3(35, 16, -91) });

  for (const [mat, geometries] of buckets) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    for (const geo of geometries) geo.dispose();
  }
  scene.add(group);
  return { group, colliders, landmarks };
}
