// Procedural coastal garden: batched branches, leaf cards, paving and sea.
export function createLandscape(THREE, scene) {
  const group = new THREE.Group();
  group.name = 'Badaguan gardens and coast';
  scene.add(group);
  let seed = 72861;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const range = (a, b) => a + rand() * (b - a);
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  const color = new THREE.Color();
  const textures = [];
  const mat = (c, extras = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.93, ...extras });
  const canvasTexture = (size, draw, repeat = null) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    draw(canvas.getContext('2d'), size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    if (repeat) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(...repeat);
    }
    texture.anisotropy = 8;
    textures.push(texture);
    return texture;
  };
  const noiseTexture = (base, count, stroke = false) => canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < count; i++) {
      const bright = rand() > 0.5;
      ctx.fillStyle = bright ? `rgba(240,236,192,${range(.015,.1)})` : `rgba(31,39,22,${range(.015,.13)})`;
      ctx.fillRect(rand() * s, rand() * s, range(.5, stroke ? 1.3 : 3), range(.5, stroke ? 7 : 3));
    }
  }, [1, 1]);

  const grassMap = noiseTexture('#74805a', 39000, true);
  grassMap.repeat.set(64, 64);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(320, 380), mat('#d5dcba', { map: grassMap }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(-106, -.07, -72);
  ground.receiveShadow = true;
  group.add(ground);

  const asphaltMap = noiseTexture('#8c8a78', 65000);
  asphaltMap.repeat.set(4, 90);
  const asphaltMaterial = mat('#b2b0a0', { map: asphaltMap, roughness: 1 });
  const plane = (w, l, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, l), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  plane(9, 225, 0, .012, -27.5, asphaltMaterial);
  plane(9, 100, 0, .011, -190, asphaltMaterial);
  // A quiet lane turns toward the sea between the gardens.
  plane(54, 5.5, 24.5, .014, -73, asphaltMaterial);

  const pavingMap = canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = '#b2ae99'; ctx.fillRect(0, 0, s, s);
    for (let row = 0; row < 8; row++) {
      for (let col = -1; col < 5; col++) {
        const x = col * 128 + (row % 2) * 64;
        const v = Math.floor(range(168, 187));
        ctx.fillStyle = `rgb(${v + 8},${v + 6},${v - 5})`;
        ctx.fillRect(x + 1.5, row * 64 + 1.5, 125, 61);
        ctx.strokeStyle = 'rgba(255,252,230,.16)'; ctx.strokeRect(x + 3, row * 64 + 3, 121, 57);
      }
    }
    for (let i = 0; i < 19000; i++) {
      ctx.fillStyle = rand() > .5 ? 'rgba(50,48,38,.05)' : 'rgba(255,255,240,.1)';
      ctx.fillRect(rand() * s, rand() * s, range(.2, 2), range(.2, 2));
    }
  }, [1.7, 95]);
  const pavement = mat('#ddd8c4', { map: pavingMap });
  plane(2.8, 225, -5.95, .08, -27.5, pavement);
  plane(2.8, 225, 5.95, .08, -27.5, pavement);
  plane(2.8, 100, -5.95, .078, -190, pavement);
  plane(2.8, 100, 5.95, .078, -190, pavement);
  const curb = new THREE.InstancedMesh(new THREE.BoxGeometry(.21, .19, .95), mat('#bab8a7'), 900);
  let curbIndex = 0;
  for (const x of [-7.44, -4.59, 4.59, 7.44]) {
    for (let z = -140; z < 85; z += 1) {
      dummy.position.set(x, .07, z); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix();
      curb.setMatrixAt(curbIndex++, dummy.matrix);
    }
  }
  curb.count = curbIndex;
  curb.receiveShadow = true;
  group.add(curb);

  const barkMap = canvasTexture(256, (ctx, s) => {
    ctx.fillStyle = '#8b8370'; ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1700; i++) {
      ctx.strokeStyle = rand() < .5 ? `rgba(27,29,21,${range(.1,.4)})` : `rgba(202,191,159,${range(.07,.3)})`;
      ctx.lineWidth = range(.5, 3);
      const x = rand() * s, y = rand() * s;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + range(-3,3), y + range(5,80)); ctx.stroke();
    }
    for (let i = 0; i < 75; i++) {
      ctx.fillStyle = rand()>.45 ? `rgba(213,213,185,${range(.3,.6)})` : `rgba(72,83,61,${range(.13,.35)})`;
      ctx.beginPath(); ctx.ellipse(rand()*s,rand()*s,range(3,15),range(8,35),range(-.3,.3),0,Math.PI*2); ctx.fill();
    }
  }, [2, 3]);
  const bark = mat('#afa28b', { map: barkMap });
  const branchParts = [];
  const leafParts = [];
  const segment = (a, b, radius, taper = .55) => branchParts.push({ a, b, radius, taper });
  // Each card is a small translucent spray of plane-tree leaves, with no solid crown shell.
  const leafMap = canvasTexture(256, (ctx) => {
    const leaf = (x, y, size, angle) => {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
      const gradient=ctx.createLinearGradient(-size*.5,-size*.5,size*.4,size*.5);
      gradient.addColorStop(0,'#fcffe6');gradient.addColorStop(.45,'#ebf0cf');gradient.addColorStop(1,'#a8b19a');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(0, size * .63);
      ctx.quadraticCurveTo(-size*.13,size*.21,-size*.44,size*.32);
      ctx.quadraticCurveTo(-size*.35,size*.08,-size*.67,-size*.12);
      ctx.quadraticCurveTo(-size*.3,-size*.11,-size*.32,-size*.5);
      ctx.lineTo(-size*.07,-size*.31);ctx.quadraticCurveTo(-size*.1,-size*.53,0,-size*.75);
      ctx.quadraticCurveTo(size*.14,-size*.45,size*.19,-size*.3);ctx.lineTo(size*.45,-size*.49);
      ctx.quadraticCurveTo(size*.36,-size*.1,size*.65,size*.04);
      ctx.quadraticCurveTo(size*.3,size*.14,size*.43,size*.43);
      ctx.quadraticCurveTo(size*.1,size*.32,0,size*.63);ctx.closePath();ctx.fill();
      ctx.strokeStyle = 'rgba(96,105,49,.32)';ctx.lineWidth = 1;
      ctx.beginPath();ctx.moveTo(0,size*.62);ctx.lineTo(0,-size*.57);
      ctx.moveTo(0,size*.06);ctx.lineTo(-size*.4,-size*.05);
      ctx.moveTo(0,size*.05);ctx.lineTo(size*.4,-size*.16);ctx.stroke();ctx.restore();
    };
    ctx.strokeStyle = '#b6ab77';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(125,236);ctx.bezierCurveTo(145,165,123,73,155,26);ctx.stroke();
    const blades = [[132,24,46,.1],[83,42,49,-.9],[180,44,46,.8],[112,71,46,-.6],[57,86,40,-1.1],[169,85,49,.9],[211,107,37,1.1],[87,111,48,-.9],[136,120,45,.2],[47,136,37,-1.3],[184,140,49,1.1],[87,153,48,-.8],[135,168,43,.1],[199,181,39,1.2],[62,187,41,-1.1],[108,205,47,-.7],[157,213,44,.8],[134,239,30,.3]];
    for (const v of blades) leaf(...v);
  });
  const foliageMaterial = mat('#ffffff', { map: leafMap, alphaTest: .4, side: THREE.DoubleSide, roughness: .85 });
  const windTime = { value: 0 };
  foliageMaterial.onBeforeCompile = shader => {
    shader.uniforms.uGardenWind = windTime;
    shader.vertexShader = 'uniform float uGardenWind;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(uGardenWind * 1.1 + instanceMatrix[3].x * .3 + instanceMatrix[3].z * .17) * .028;\ntransformed.y += sin(uGardenWind * .9 + instanceMatrix[3].z * .5) * .018;');
  };
  const treePositions = [
    [-8.5, 57, 1.06], [-8.4, 37, 1.10], [-8.6,-17,1.08],[-8.3,-37,1.18],[-8.6,-58,.96],[-8.7,-80,1.1],[-8.5,-102,1.12],[-8.7,-125,.96],
    [8.5,53,1.12],[8.6,29,1.08],[8.6,7,1.10],[8.4,-15,.99],[8.6,-39,1.14],[8.5,-59,1.1],[8.5,-87,1.17],[8.6,-110,1.05],[8.5,-132,1.1],
    [-37,25,1.2],[-37,-1,1.05],[-41,-25,1.18],[-36,-49,.96],[-42,-77,1.2],[-40,-104,1.09],[-28,-123,1.16],
    [37,29,.9],[43,7,1.02],[40,-18,.93],[37,-57,1.1],[49,-120,1],[-60,-57,1.4],[-59,-105,1.4],[-58,18,1.2],[-51,51,1.2],
    // A deeper tree line closes the avenue into the wooded foothills.
    [-10.3,-149,1.15],[11.2,-153,1.27],[-12.6,-173,1.31],[13.3,-178,1.12],
    [-9.8,-197,1.44],[10.8,-208,1.3],[-25,-187,1.5],[27,-191,1.46],
    // Layered garden trees sit behind the houses, clear of their main facades.
    [-46,14,1.09],[-54,-7,1.32],[-60,-29,1.37],[-59,-45,1.16],[-53,-79,1.28],[-49,-108,1.18],
  ];
  const treeInfo = [];
  const addTree = (x, z, scale, treeIndex) => {
    const treeRand = rand();
    const height = range(7.7, 9.2) * scale;
    const trunkRadius = range(.25, .35) * scale;
    const leanX=range(-.45,.45)*scale,leanZ=range(-.4,.4)*scale;
    const trunkKnots=[new THREE.Vector3(x,0,z),new THREE.Vector3(x+leanX*.3,height*.29,z+leanZ*.4),new THREE.Vector3(x+leanX,height*.55,z+leanZ),new THREE.Vector3(x+leanX*.8,height*.82,z+leanZ*1.6)];
    for(let i=0;i<3;i++)segment(trunkKnots[i],trunkKnots[i+1],trunkRadius*(1-i*.2),.76);
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      segment(new THREE.Vector3(x+Math.cos(a)*.76*scale,.045,z+Math.sin(a)*.76*scale),new THREE.Vector3(x,.8*scale,z),trunkRadius*.40,.7);
    }
    const crown = [];
    const limbCount=5+Math.floor(rand()*3);
    for (let i = 0; i < limbCount; i++) {
      const angle = i * 2.39996 + treeRand * 4 + range(-.28,.28);
      const radial = range(3.0,4.8) * scale;
      const start=new THREE.Vector3(x+leanX*.8,height*range(.43,.64),z+leanZ*.8);
      const bend1=new THREE.Vector3(x+Math.cos(angle)*radial*.23,start.y+range(1.4,2.3)*scale,z+Math.sin(angle)*radial*.23);
      const bend2=new THREE.Vector3(x+Math.cos(angle+.15)*radial*.7,height+range(-.4,.65)*scale,z+Math.sin(angle+.15)*radial*.7);
      const branchEnd=new THREE.Vector3(x+Math.cos(angle)*radial,height+range(-.2,1.25)*scale,z+Math.sin(angle)*radial);
      const curve=new THREE.CubicBezierCurve3(start,bend1,bend2,branchEnd);
      const points=curve.getPoints(4);
      for(let j=0;j<4;j++)segment(points[j],points[j+1],trunkRadius*(.62-j*.13),.68);
      crown.push(curve.getPoint(.72),branchEnd);
      for(let j=0;j<3;j++) {
        const theta = angle + range(-1.3,1.3);
        const tip = branchEnd.clone().add(new THREE.Vector3(Math.cos(theta)*range(.3,1.45)*scale,range(-.15,1.4)*scale,Math.sin(theta)*range(.3,1.45)*scale));
        segment(curve.getPoint(range(.62,.9)),tip,trunkRadius*.105,.18);
        crown.push(tip);
      }
    }
    // Interior foliage joins the outer sprays into a broad, irregular crown.
    for(let i=0;i<5;i++)crown.push(new THREE.Vector3(x+range(-1.4,1.4)*scale,height+range(-.15,1.45)*scale,z+range(-1.4,1.4)*scale));
    for (const center of crown) {
      const patchTone=rand();
      const cardCount=treeIndex<33?29:17;
      for(let i=0;i<cardCount;i++) {
        const theta=range(0,Math.PI*2), vertical=range(-1,1), radial=Math.cbrt(rand());
        const r=Math.sqrt(1-vertical*vertical)*radial;
        leafParts.push({ x:center.x+Math.cos(theta)*r*1.75*scale,y:center.y+vertical*radial*1.5*scale,z:center.z+Math.sin(theta)*r*1.75*scale,
          rx:range(-Math.PI,Math.PI),ry:range(0,Math.PI*2),rz:range(0,Math.PI*2),s:range(.85,1.25)*scale, tone:patchTone*.6+rand()*.4,tree:treeIndex });
      }
    }
    treeInfo.push({x,z,scale,green:treeIndex%4!==1});
  };
  treePositions.forEach((p,i)=>addTree(...p,i));

  const branches = new THREE.InstancedMesh(new THREE.CylinderGeometry(.58,1,1,7,1),bark,branchParts.length);
  branchParts.forEach((p,i)=>{
    const delta=p.b.clone().sub(p.a);
    dummy.position.copy(p.a).add(p.b).multiplyScalar(.5);
    dummy.quaternion.setFromUnitVectors(up,delta.clone().normalize());
    dummy.scale.set(p.radius,delta.length(),p.radius);dummy.updateMatrix();branches.setMatrixAt(i,dummy.matrix);
    branches.setColorAt(i,color.setHSL(.1,range(.1,.17),range(.58,.8)));
  });
  branches.castShadow=branches.receiveShadow=true;group.add(branches);
  const foliage = new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),foliageMaterial,leafParts.length);
  leafParts.forEach((p,i)=>{
    dummy.position.set(p.x,p.y,p.z);dummy.rotation.set(p.rx,p.ry,p.rz);dummy.scale.setScalar(p.s);dummy.updateMatrix();foliage.setMatrixAt(i,dummy.matrix);
  });
  foliage.castShadow=foliage.receiveShadow=true;
  foliage.frustumCulled=false;
  group.add(foliage);

  // Loosely planted garden shrubs soften the fences and leave front gates open.
  const shrubBeds=[
    [-10.6,-2.7,1.1],[-10.5,12.5,1.05],[-12.1,14.3,.83],[-12.2,-4.1,.86],
    [-13.8,-36.9,1.07],[-13.4,-23.1,1.12],[-15.1,-39,.9],[-14.7,-21.5,.8],
    [-13.1,-71.5,.93],[-13.2,-59.3,1.07],[-16,-75,.9],[-15.8,-56,.94],
    [-16.4,39,1.05],[-16.3,51.1,.96],[-30.1,17.5,1.34],[-29.2,-11,1.18],
    [-32,-16,1.07],[-31.5,-46,1.26],[-31.7,-82.5,1.27],[-35,-91,1.03],
    [12.8,-45.5,.97],[12.6,-30.7,1.02],[14.4,-47.1,.83],[14,-28.7,.81],
    [28,-24.2,1.09],[30.4,-52,1.12],[34,-61,1.13],[30,-68,1.25],
    [41,18,1.2],[39.8,20.4,.86],[44.3,-5.1,1.26],[43.8,-8.3,.84],
    [-39,3,1.23],[-42,7,1.3],[-42,-18,1.12],[-40,-59,1.27],
  ];
  const shrubCount=shrubBeds.length*83;
  const shrubs=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),foliageMaterial,shrubCount);
  const shrubDark=new THREE.Color('#385b3e'),shrubLight=new THREE.Color('#82975b');
  let shrubIndex=0;
  for(const [x,z,s] of shrubBeds){
    for(let i=0;i<83;i++){
      const theta=rand()*Math.PI*2,vertical=range(-.85,1),r=Math.cbrt(rand());
      const horizontal=Math.sqrt(1-vertical*vertical)*r;
      dummy.position.set(x+Math.cos(theta)*horizontal*s,.58*s+vertical*r*.55*s,z+Math.sin(theta)*horizontal*s*.82);
      dummy.rotation.set(range(0,Math.PI),range(0,Math.PI*2),range(0,Math.PI*2));
      dummy.scale.setScalar(range(.46,.74)*s);dummy.updateMatrix();
      shrubs.setMatrixAt(shrubIndex,dummy.matrix);
      shrubs.setColorAt(shrubIndex++,color.copy(shrubDark).lerp(shrubLight,rand()*.8));
    }
  }
  shrubs.castShadow=shrubs.receiveShadow=true;
  group.add(shrubs);

  const shadowMap = canvasTexture(128, (ctx,s)=>{
    const gradient=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
    gradient.addColorStop(0,'rgba(16,27,13,.30)');gradient.addColorStop(.4,'rgba(20,31,14,.16)');gradient.addColorStop(1,'rgba(20,31,14,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,s,s);
  });
  const shadows = new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:shadowMap,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),treePositions.length);
  treePositions.forEach(([x,z,s],i)=>{
    dummy.position.set(x,.023,z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(13*s,13*s,1);dummy.updateMatrix();shadows.setMatrixAt(i,dummy.matrix);
  });group.add(shadows);

  const fallenMaterial=mat('#d4a348',{map:leafMap,alphaTest:.3,side:THREE.DoubleSide,depthWrite:true});
  const fallen=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),fallenMaterial,1700);
  for(let i=0;i<1700;i++) {
    const x=range(-8,8),z=range(-125,76);
    dummy.position.set(x,Math.abs(x)>4.5?.093:.027,z);dummy.rotation.set(-Math.PI/2,0,range(0,Math.PI*2));
    dummy.scale.setScalar(range(.1,.35));dummy.updateMatrix();fallen.setMatrixAt(i,dummy.matrix);
    fallen.setColorAt(i,color.setHSL(range(.065,.145),range(.45,.68),range(.36,.62)));
  }group.add(fallen);

  // Low grasses soften garden edges, without covering the walkable surfaces.
  const grassCard=canvasTexture(128,(ctx,s)=>{
    for(let i=0;i<23;i++){
      const x=range(20,108),top=range(8,94);ctx.strokeStyle=`rgba(${Math.floor(range(130,185))},${Math.floor(range(150,200))},98,.95)`;ctx.lineWidth=range(1,3);
      ctx.beginPath();ctx.moveTo(x,s);ctx.quadraticCurveTo(x+range(-13,13),top+20,x+range(-25,25),top);ctx.stroke();
    }
  });
  const grasses=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),mat('#8a9960',{map:grassCard,alphaTest:.4,side:THREE.DoubleSide}),1000);
  for(let i=0;i<1000;i++){
    const side=rand()<.5?-1:1;
    const x=side*range(7.7,10.5),z=range(-128,80),s=range(.18,.48);
    dummy.position.set(x,s*.43,z);dummy.rotation.set(0,range(0,Math.PI*2),0);dummy.scale.set(s*1.7,s,1);dummy.updateMatrix();grasses.setMatrixAt(i,dummy.matrix);
  }group.add(grasses);

  const metal=mat('#28332f',{metalness:.65,roughness:.52});
  const bronze=mat('#62624a',{metalness:.68,roughness:.5});
  const timber=mat('#8b6644',{roughness:.84});
  const cylinder=(radiusTop,radiusBottom,height,x,y,z,material,segments=10)=>{
    const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radiusTop,radiusBottom,height,segments),material);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;
  };
  const lampGlow=new THREE.MeshStandardMaterial({color:'#fff0bb',emissive:'#ffcb79',emissiveIntensity:.65,roughness:.3,transparent:true,opacity:.9});
  const addLamp=(x,z)=>{
    cylinder(.15,.25,.24,x,.12,z,metal);
    cylinder(.095,.14,.75,x,.56,z,metal);
    cylinder(.055,.085,3.55,x,2.45,z,metal);
    cylinder(.13,.1,.08,x,4.23,z,bronze);
    cylinder(.16,.09,.25,x,4.39,z,metal);
    const globe=new THREE.Mesh(new THREE.CylinderGeometry(.23,.16,.59,4),lampGlow);globe.position.set(x,4.79,z);globe.rotation.y=Math.PI/4;group.add(globe);
    cylinder(.02,.36,.22,x,5.19,z,metal,4).rotation.y=Math.PI/4;
    cylinder(.04,.08,.2,x,5.38,z,metal);
    cylinder(.22,.26,.08,x,4.47,z,metal,4).rotation.y=Math.PI/4;
    for(const dx of [-.16,.16])for(const dz of [-.16,.16])cylinder(.018,.018,.64,x+dx,4.78,z+dz,metal,5);
  };
  [[-6.7,22],[6.7,-3],[-6.7,-24],[6.7,-52],[-6.7,-91],[6.7,60]].forEach(([x,z])=>addLamp(x,z));

  const box=(w,h,d,x,y,z,material,rotation=0)=>{
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);mesh.position.set(x,y,z);mesh.rotation.y=rotation;mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);return mesh;
  };
  function bench(x,z,angle=0){
    const benchGroup=new THREE.Group();benchGroup.position.set(x,0,z);benchGroup.rotation.y=angle;group.add(benchGroup);
    const part=(w,h,d,px,py,pz,material)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(px,py,pz);m.castShadow=m.receiveShadow=true;benchGroup.add(m);return m;};
    for(let i=0;i<5;i++)part(2.45,.06,.105,0,.54,i*.12-.25,timber);
    for(let i=0;i<3;i++)part(2.45,.14,.065,0,.87+i*.18,-.29,timber).rotation.x=-.10;
    for(const dx of [-.9,.9]){
      part(.085,.56,.08,dx,.28,.19,metal);part(.085,1.24,.08,dx,.62,-.3,metal);part(.1,.065,.69,dx,.48,-.02,metal);
      part(.07,.065,.66,dx,.81,0,metal);part(.07,.3,.07,dx,.65,.23,metal);
    }
  }
  bench(-7.05,15,Math.PI/2);bench(7.1,-24,-Math.PI/2);bench(-7.1,-63,Math.PI/2);

  // Drainage grates and weathered iron bollards are small, familiar street details.
  const grates = new THREE.InstancedMesh(new THREE.BoxGeometry(.38,.015,.025),metal,120);
  let gi=0;
  for(let z=-112;z<70;z+=21)for(const x of [-4.34,4.34])for(let j=0;j<6;j++){
    dummy.position.set(x,.025,z+j*.07);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);dummy.updateMatrix();grates.setMatrixAt(gi++,dummy.matrix);
  }grates.count=gi;group.add(grates);

  // Qingdao's small bay: warm granite sand, dark rocks, and blue-green water.
  const shoreX=z=>57+Math.sin(z*.024)*3.8+Math.sin(z*.063)*1.2;
  const coastalStrip=(offsetA,offsetB,yA,yB,material)=>{
    const positions=[],uv=[],indices=[];
    for(let i=0;i<=140;i++){
      const z=-260+i*3;
      positions.push(shoreX(z)+offsetA,yA,z,shoreX(z)+offsetB,yB,z);
      uv.push(0,i*.14,1,i*.14);
      if(i<140){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();
    const m=new THREE.Mesh(geo,material);m.receiveShadow=true;group.add(m);return m;
  };
  const sandMap=noiseTexture('#c9bc94',30000);sandMap.repeat.set(2,1);
  coastalStrip(-12,0,-.055,-.65,mat('#acaf80',{map:sandMap}));
  coastalStrip(0,8,-.65,-1.25,mat('#e1d3af',{map:sandMap}));
  coastalStrip(8,15,-1.25,-1.46,mat('#9fa793',{map:sandMap}));
  const rockGeo=new THREE.IcosahedronGeometry(1,1);
  const rockPos=rockGeo.attributes.position;
  for(let i=0;i<rockPos.count;i++){
    const factor=range(.87,1.13);rockPos.setXYZ(i,rockPos.getX(i)*factor,rockPos.getY(i)*factor,rockPos.getZ(i)*factor);
  }rockGeo.computeVertexNormals();
  const rocks=new THREE.InstancedMesh(rockGeo,mat('#838477',{roughness:.97}),180);
  for(let i=0;i<180;i++){
    const z=range(-190,95),s=range(.23,1.7);
    dummy.position.set(shoreX(z)+range(4,11),-1.13+s*.19,z);dummy.rotation.set(range(0,1),range(0,6),range(0,1));dummy.scale.set(s*range(1,1.8),s*.58,s);dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
    rocks.setColorAt(i,color.setHSL(.115,.07,range(.61,.94)));
  }rocks.castShadow=rocks.receiveShadow=true;group.add(rocks);

  const waterUniforms={uTime:{value:0},uSun:{value:new THREE.Vector3(-.4,.45,.2).normalize()},uTint:{value:new THREE.Color('#609498')},uHaze:{value:new THREE.Color('#b4c3b7')}};
  const waterMaterial=new THREE.ShaderMaterial({
    uniforms:waterUniforms,
    vertexShader:`varying vec3 vWorld; void main(){vec4 world=modelMatrix*vec4(position,1.);vWorld=world.xyz;gl_Position=projectionMatrix*viewMatrix*world;}`,
    fragmentShader:`
      uniform float uTime; uniform vec3 uSun; uniform vec3 uTint; uniform vec3 uHaze; varying vec3 vWorld;
      void main(){
        vec2 p=vWorld.xz;float t=uTime;
        float a=sin(p.x*.53+p.y*.26-t*.58),b=sin(p.x*1.22-p.y*.61+t*.45),c=sin(p.x*3.1+p.y*1.4-t*.77);
        vec3 normal=normalize(vec3((a*.05+b*.026+c*.008),1.,(cos(p.x*.53+p.y*.26-t*.58)*.046+b*.03)));
        vec3 eye=normalize(cameraPosition-vWorld);float fresnel=pow(1.-max(dot(normal,eye),0.),3.);
        vec3 col=mix(uTint*.72,vec3(.57,.69,.67),fresnel*.7);
        float reflected=pow(max(dot(reflect(-uSun,normal),eye),0.),180.);
        col+=vec3(1.,.87,.58)*reflected*.65;
        float glint=pow(max(0.,sin(p.x*1.8+p.y*.39-t*.8)*sin(p.y*3.8+p.x*.54+t*.32)),14.);
        col+=vec3(.21,.25,.22)*glint*(.13+fresnel*.35);
        float distanceFog=1.-exp(-length(cameraPosition-vWorld)*.0027);
        col=mix(col,uHaze,distanceFog*.83);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const sea=plane(1600,1800,865,-1.28,-380,waterMaterial);
  const foamMaterial=new THREE.MeshBasicMaterial({color:'#e1e4cc',transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide});
  const foamLines=[];
  for(let k=0;k<5;k++){
    const verts=[],indices=[];
    for(let i=0;i<=160;i++){
      const z=-210+i*2.1,x=shoreX(z)+7+k*2.2+Math.sin(z*.27+k)*.25;
      verts.push(x,-1.263,z,x+.13+Math.sin(z*.8)*.07,-1.261,z);
      if(i<160){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);
    const m=new THREE.Mesh(g,foamMaterial.clone());group.add(m);foamLines.push(m);
  }

  // The low, coastal hills remain atmospheric silhouettes rather than high mountains.
  const hillMaterial=mat('#668477',{roughness:1});
  for(let i=0;i<12;i++){
    const x=-270+i*42,z=-265-range(0,55),sx=range(35,80),sy=range(12,30);
    const hill=new THREE.Mesh(new THREE.SphereGeometry(1,32,16),hillMaterial);
    hill.position.set(x,-4,z);hill.scale.set(sx,sy,range(25,48));group.add(hill);
  }

  const birds = [];
  const birdMaterial=new THREE.MeshBasicMaterial({color:'#5a6964',side:THREE.DoubleSide});
  const birdGeo=new THREE.BufferGeometry();
  birdGeo.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,-.7,.16,-.05,-1.4,.02,.16,0,0,0,1.4,.02,.16,.7,.16,-.05],3));
  birdGeo.computeVertexNormals();
  for(let i=0;i<8;i++){
    const bird=new THREE.Mesh(birdGeo,birdMaterial);bird.position.set(range(50,130),range(25,38),range(-180,-60));bird.scale.setScalar(range(.5,.95));group.add(bird);birds.push({mesh:bird,x:bird.position.x,z:bird.position.z,phase:rand()*Math.PI*2});
  }

  const summerDark=new THREE.Color('#456d48'),summerLight=new THREE.Color('#8eaa5c');
  const springDark=new THREE.Color('#6e9853'),springLight=new THREE.Color('#bed07e');
  const autumnDark=new THREE.Color('#547247'),autumnLight=new THREE.Color('#a2ae61');
  const goldenDark=new THREE.Color('#a99943'),goldenLight=new THREE.Color('#d4bd61');
  const setSeason = season => {
    leafParts.forEach((p,i)=>{
      const evergreen=treeInfo[p.tree].green;
      if(season==='summer') color.copy(summerDark).lerp(summerLight,p.tone);
      else if(season==='spring') color.copy(springDark).lerp(springLight,p.tone);
      else if(evergreen) {
        color.copy(autumnDark).lerp(autumnLight,p.tone);
        if(p.tone>.78)color.lerp(goldenLight,(p.tone-.78)*2);
      }
      else color.copy(goldenDark).lerp(goldenLight,p.tone);
      foliage.setColorAt(i,color);
    });
    if(foliage.instanceColor)foliage.instanceColor.needsUpdate=true;
    fallen.visible=season==='autumn';
    ground.material.color.set(season==='summer'?'#cddbbb':season==='spring'?'#d7e1b6':'#d5dcba');
  };
  setSeason('autumn');

  return {
    group,
    update(time, delta) {
      waterUniforms.uTime.value=time;
      windTime.value=time;
      for(let i=0;i<foamLines.length;i++){
        const wave=(time*.10+i*.19)%1;
        foamLines[i].position.x=wave*1.2;
        foamLines[i].material.opacity=Math.sin(wave*Math.PI)*.17;
      }
      birds.forEach(({mesh,x,z,phase},i)=>{
        mesh.position.x=x+Math.sin(time*.025+phase)*18;
        mesh.position.z=z+Math.cos(time*.025+phase)*14;
        mesh.rotation.y=-time*.025-phase;
        mesh.rotation.z=Math.sin(time*.9+phase)*.06;
        mesh.scale.y=.65+Math.sin(time*2.2+phase)*.3;
      });
    },
    setSeason,
    setWeather(weather) {
      waterUniforms.uTint.value.set(weather==='mist'?'#748f8b':'#609498');
    },
  };
}
