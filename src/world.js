import * as THREE from 'three';
import { createArchitecture } from './architecture.js';
import { createLandscape } from './landscape.js';

export const views = {
  lane: { position: [3, 4.8, 38], target: [-5, 4.5, -38], name: '武胜关路 · 梧桐树下' },
  princess: { position: [2, 4.5, -16], target: [20, 6, -38], name: '公主楼 · 一座童话' },
  coast: { position: [14, 7, -56], target: [40, 8, -97], name: '花石楼 · 听见海的方向' },
};

export function createWorld(container, callbacks = {}) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2('#c5d6d2', 0.0028);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute('aria-label', '青岛八大关互动三维风景。拖动鼠标环顾，使用 W A S D 或方向键移动。');
  renderer.domElement.tabIndex = 0;
  container.prepend(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(53, container.clientWidth / container.clientHeight, 0.15, 1200);
  camera.rotation.order = 'YXZ';
  camera.position.fromArray(views.lane.position);
  camera.lookAt(new THREE.Vector3(...views.lane.target));

  const hemi = new THREE.HemisphereLight('#cce3f0', '#838157', 2.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffe1a6', 3.3);
  sun.position.set(-40, 55, 36);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 1, far: 220 });
  sun.shadow.normalBias = 0.055;
  sun.shadow.bias = -0.00015;
  sun.shadow.radius = 3;
  sun.target.position.set(0, 0, -25);
  scene.add(sun, sun.target);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(850, 32, 20), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { top: { value: new THREE.Color('#77aabd') }, bottom: { value: new THREE.Color('#e9e8d9') }, sunColor: { value: new THREE.Color('#fff1c5') } },
    vertexShader: `varying vec3 vDirection; void main(){vDirection=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec3 vDirection; uniform vec3 top; uniform vec3 bottom; uniform vec3 sunColor;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 d=normalize(vDirection);float h=max(d.y,0.); vec3 c=mix(bottom,top,pow(h,.35));
      vec2 p=d.xz/(max(d.y,.08))*2.3; float n=noise(p)*.55+noise(p*2.)*.25+noise(p*4.)*.13+noise(p*8.)*.07;
      float cloud=smoothstep(.49,.78,n)*smoothstep(0.,.22,d.y)*.3; c=mix(c,vec3(.99,.98,.91),cloud);
      float s=pow(max(0.,dot(d,normalize(vec3(-.6,.65,.45)))),13.); c=mix(c,sunColor,s*.3);gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`,
  }));
  scene.add(sky);
  const architecture = createArchitecture(THREE, scene);
  const landscape = createLandscape(THREE, scene);

  const motesCount = 70;
  const positions = new Float32Array(motesCount * 3);
  for (let i = 0; i < motesCount; i++) { positions[i * 3] = (Math.random() - .5) * 60; positions[i * 3 + 1] = Math.random() * 18; positions[i * 3 + 2] = Math.random() * 150 - 110; }
  const motesGeo = new THREE.BufferGeometry();
  motesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const motes = new THREE.Points(motesGeo, new THREE.PointsMaterial({ color: '#ffedbd', size: .06, transparent: true, opacity: .7, depthWrite: false }));
  scene.add(motes);

  let running = true, roam = false, guided = false, transitioning = null, currentView = 'lane';
  let dragging = false, yaw = camera.rotation.y, pitch = camera.rotation.x;
  let lastPointer = { x: 0, y: 0 };
  const keys = new Set();
  const clock = new THREE.Clock();
  const canvas = renderer.domElement;
  const interruptGuide = () => {
    transitioning = null;
    if (guided) { guided = false; callbacks.onGuideStop?.(); }
  };
  const press = (key) => { interruptGuide(); keys.add(key); };
  const onPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    canvas.focus({ preventScroll: true }); dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging'); interruptGuide();
  };
  const onPointerMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastPointer.x, dy = e.clientY - lastPointer.y;
    yaw -= dx * .0028; pitch = THREE.MathUtils.clamp(pitch - dy * .0028, -1.15, 1.15);
    camera.rotation.set(pitch, yaw, 0); lastPointer = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = () => { dragging = false; canvas.classList.remove('dragging'); };
  const isInput = (e) => /INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.target.isContentEditable;
  const movementKeys = ['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyQ','KeyE','ShiftLeft','ShiftRight'];
  const onKeyDown = (e) => {
    if (isInput(e) || document.querySelector('dialog[open]')) return;
    if (movementKeys.includes(e.code)) { e.preventDefault(); press(e.code); }
    if (e.code === 'Escape') { interruptGuide(); roam = false; keys.clear(); onPointerUp(); callbacks.onRoamStop?.(); }
  };
  const onKeyUp = (e) => keys.delete(e.code);
  const blur = () => { keys.clear(); onPointerUp(); };
  const wheel = (e) => { e.preventDefault(); interruptGuide(); move(0, Math.sign(e.deltaY) * -2.2, 0); };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('wheel', wheel, { passive: false });
  window.addEventListener('keydown', onKeyDown); window.addEventListener('keyup', onKeyUp); window.addEventListener('blur', blur);

  function move(strafe, forward, up) {
    const next = camera.position.clone();
    next.x += Math.cos(yaw) * strafe - Math.sin(yaw) * forward;
    next.z += -Math.sin(yaw) * strafe - Math.cos(yaw) * forward;
    next.y = THREE.MathUtils.clamp(next.y + up, 1.8, 38);
    next.x = THREE.MathUtils.clamp(next.x, -65, 100); next.z = THREE.MathUtils.clamp(next.z, -135, 85);
    const collide = (x,z) => (architecture.colliders || []).some(b => x > b.minX-.6 && x < b.maxX+.6 && z > b.minZ-.6 && z < b.maxZ+.6 && next.y < (b.height || 16));
    if (!collide(next.x,next.z)) camera.position.copy(next);
    else if (!collide(next.x,camera.position.z)) camera.position.set(next.x,next.y,camera.position.z);
    else if (!collide(camera.position.x,next.z)) camera.position.set(camera.position.x,next.y,next.z);
  }

  function goTo(id, instant = false) {
    const view = views[id]; if (!view) return;
    currentView = id;
    const pos = new THREE.Vector3(...view.position), look = new THREE.Vector3(...view.target);
    const temp = camera.clone(); temp.position.copy(pos); temp.lookAt(look);
    if (instant) { camera.position.copy(pos); camera.quaternion.copy(temp.quaternion); yaw = camera.rotation.y; pitch = camera.rotation.x; }
    else transitioning = { from: camera.position.clone(), to: pos, fromQ: camera.quaternion.clone(), toQ: temp.quaternion.clone(), elapsed: 0, duration: 2.2 };
    callbacks.onView?.(id);
  }
  let guideTime = 0, guideIndex = 0;
  function setGuided(value) {
    guided = value; guideTime = 0; guideIndex = Object.keys(views).indexOf(currentView);
    keys.clear();
    if (guided) { roam = false; goTo(currentView); }
    else transitioning = null;
  }
  function setRoam(value) { roam = value; guided = false; if (value) { canvas.focus({ preventScroll: true }); } }
  function setTime(value) {
    const t = (value - 6) / 13;
    sun.position.set(-65 + t * 35, Math.max(8, Math.sin(t * Math.PI) * 75), 48);
    const warmth = Math.abs(t - .48) * 1.8;
    sun.color.set('#fff2dc').lerp(new THREE.Color('#ffba72'), Math.min(1, warmth));
    sun.intensity = 2.9 + Math.sin(t * Math.PI) * .7;
    hemi.intensity = 1.45 + Math.sin(t * Math.PI) * .7;
    sky.material.uniforms.top.value.set('#5ba5cf').lerp(new THREE.Color('#9399b0'), Math.max(0, t-.8)*3);
    sky.material.uniforms.bottom.value.set('#d9e6e2').lerp(new THREE.Color('#edbc92'), Math.max(0, t-.72)*2.5);
    renderer.shadowMap.needsUpdate = true;
    scene.fog.color.copy(sky.material.uniforms.bottom.value).lerp(new THREE.Color('#bdd3d5'), .55);
  }
  function screenshots() {
    const p = camera.position.clone(), q = camera.quaternion.clone(), size = renderer.getSize(new THREE.Vector2());
    const oldAspect = camera.aspect; const oldRatio = renderer.getPixelRatio();
    renderer.setPixelRatio(1); renderer.setSize(320, 200, false); camera.aspect = 1.6; camera.updateProjectionMatrix();
    const images = {};
    Object.entries(views).forEach(([id,v]) => { camera.position.fromArray(v.position); camera.lookAt(new THREE.Vector3(...v.target)); renderer.render(scene,camera); images[id] = canvas.toDataURL('image/jpeg', .82); });
    renderer.setPixelRatio(oldRatio); renderer.setSize(size.x,size.y,false); camera.aspect = oldAspect; camera.updateProjectionMatrix(); camera.position.copy(p); camera.quaternion.copy(q);
    renderer.render(scene,camera); return images;
  }
  const resize = new ResizeObserver(() => { const w = container.clientWidth,h = container.clientHeight; renderer.setSize(w,h); camera.aspect=w/h; camera.updateProjectionMatrix(); });
  resize.observe(container);
  let frameId, hudTime = 0;
  function animate() {
    if (!running) return;
    frameId = requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), .05), time = clock.elapsedTime;
    if (transitioning) {
      transitioning.elapsed += delta;
      const t = Math.min(transitioning.elapsed/transitioning.duration,1), ease=t*t*(3-2*t);
      camera.position.lerpVectors(transitioning.from,transitioning.to,ease);
      camera.quaternion.slerpQuaternions(transitioning.fromQ,transitioning.toQ,ease);
      yaw=camera.rotation.y; pitch=camera.rotation.x;
      if(t===1) transitioning=null;
    }
    const speed = (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 19 : 8) * delta;
    const forward = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const strafe = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
    const up = (keys.has('KeyE') ? 1 : 0) - (keys.has('KeyQ') ? 1 : 0);
    if (forward || strafe || up) { const norm=Math.max(1,Math.hypot(forward,strafe)); move(strafe*speed/norm,forward*speed/norm,up*speed); }
    if (guided) { guideTime += delta; if (!transitioning) { camera.position.x += Math.cos(yaw)*delta*.16; } if(guideTime>14){guideTime=0;guideIndex=(guideIndex+1)%3;goTo(Object.keys(views)[guideIndex]);} }
    landscape.update?.(time,delta);
    motes.rotation.y = Math.sin(time*.03)*.04;
    renderer.render(scene,camera);
    hudTime += delta;
    if(hudTime>.1){ callbacks.onMove?.({x:camera.position.x,z:camera.position.z,yaw,view:currentView}); hudTime=0; }
  }
  setTime(16.5);
  animate();
  return { scene, camera, renderer, goTo, setGuided, setRoam, setTime, screenshots,
    setSeason: (season) => { landscape.setSeason?.(season); motes.visible=season!=='summer'; },
    press, release: (key) => keys.delete(key),
    capture: () => { renderer.render(scene,camera); return canvas.toDataURL('image/png'); },
    dispose: () => { running=false; cancelAnimationFrame(frameId);resize.disconnect(); window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('blur',blur); scene.traverse(o=>{o.geometry?.dispose();if(o.material){for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.dispose();}});renderer.dispose(); },
  };
}
