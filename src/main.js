import './style.css';
import { createIcons, ArrowUpRight, ArrowRight, ArrowLeft, MapPin, Compass, Sun, Sunrise, Sunset, Volume2, VolumeX, Maximize, Minimize, Camera, RotateCcw, Map, X, Mouse, Move, Info, Play, Pause, Check, ChevronRight, Leaf, Headphones, Navigation, Wind, BookOpen, Footprints, ChevronDown, Expand, Keyboard, HelpCircle, SlidersHorizontal } from 'lucide';
import { createWorld, views } from './world.js';
import { AmbientAudio } from './audio.js';

const icon = (name, cls = '') => `<i data-lucide="${name}" ${cls ? `class="${cls}"` : ''}></i>`;
const brand = `<svg class="brand-mark" viewBox="0 0 44 44" fill="none" aria-hidden="true"><path d="M4 27 15 11l12 16M23 23l7-10 10 15M4 34c6-7 12 7 19 0s12 5 17 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="34" cy="7" r="2.5" fill="currentColor"/></svg>`;

document.querySelector('#app').innerHTML = `
  <header class="header">
    <a class="brand" href="./" aria-label="山海之间，返回首页">${brand}<span class="brand-name">山海之间<small>WANDER QINGDAO</small></span></a>
    <nav class="top-nav" aria-label="主导航"><button class="nav-button active" id="nav-wander">漫游八大关<span class="nav-dot"></span></button><button class="nav-button" id="nav-notes">风景手记${icon('arrow-up-right')}</button></nav>
    <div class="header-right"><span class="slow-note">给自己一段，慢下来的时光。</span><span class="header-line"></span><button class="text-button" id="help-button">${icon('help-circle')}<span>漫游指南</span></button></div>
  </header>
  <main class="app-layout">
    <aside class="sidebar" aria-label="漫游设置">
      <section class="intro"><div class="eyebrow"><span class="little-line"></span>一城一境 · 青岛</div><h1>转角，<br>遇见八大关<span class="title-dot">。</span></h1><p class="intro-english">A little wander. A slower life.</p><p class="intro-copy">红瓦掩映，梧桐低语。<br>沿着光与树影，走到海风里。</p><div class="coordinates">${icon('map-pin')} 36°03′ N &nbsp; 120°20′ E</div></section>
      <section class="explore-section"><div class="mode-tabs" role="tablist" aria-label="漫游方式"><button class="mode-tab active" id="free-mode" role="tab" aria-selected="true">${icon('footprints')}自由漫游</button><button class="mode-tab" id="guide-mode" role="tab" aria-selected="false">${icon('play')}自动导览</button></div><button id="start-button" class="start-button"><span>${icon('navigation')}<span id="start-label">开始漫游</span></span>${icon('arrow-up-right')}</button><div class="start-caption" id="start-caption">无需目的地，随心走走。</div></section>
      <section class="destinations"><div class="section-label"><h2>寻一处风景</h2><span>PLACES TO WANDER</span></div>
        <button class="place-card active" data-view="lane" aria-pressed="true"><div class="place-image lane-image"><img id="thumb-lane" alt="梧桐树影下的红瓦别墅" /></div><div class="place-text"><span class="place-index">01 / TREE-LINED LANE</span><h3>梧桐树下</h3><p>光影斑驳的林荫慢道</p></div><span class="place-arrow">${icon('arrow-up-right')}</span></button>
        <button class="place-card" data-view="princess" aria-pressed="false"><div class="place-image princess-image"><img id="thumb-princess" alt="薄荷绿的公主楼" /></div><div class="place-text"><span class="place-index">02 / PRINCESS VILLA</span><h3>转角的童话</h3><p>藏在绿树里的公主楼</p></div><span class="place-arrow">${icon('arrow-up-right')}</span></button>
        <button class="place-card" data-view="coast" aria-pressed="false"><div class="place-image coast-image"><img id="thumb-coast" alt="海岸旁的花石楼" /></div><div class="place-text"><span class="place-index">03 / BY THE SEA</span><h3>听海，花石楼</h3><p>石墙之外，是无边的蓝</p></div><span class="place-arrow">${icon('arrow-up-right')}</span></button>
      </section>
      <section class="atmosphere"><div class="section-label"><h2>此刻的八大关</h2>${icon('sliders-horizontal')}</div><div class="time-label"><span>${icon('sun')}<span id="time-description">日光渐暖</span></span><span class="time-number" id="time-number">16:30 <small>PM</small></span></div><input type="range" id="time-slider" aria-label="调整场景时间" min="6" max="19" step="0.25" value="16.5"/><div class="time-ends"><span>晨光</span><span>日暮</span></div><div class="season-tabs" aria-label="选择季节"><button data-season="spring" aria-pressed="false">春光</button><button data-season="summer" aria-pressed="false">盛夏</button><button class="active" data-season="autumn" aria-pressed="true">${icon('leaf')}秋日</button></div><div class="sound-row"><span>${icon('headphones')}听见自然<span class="sound-description">海风与鸟鸣</span></span><button class="switch" id="sound-switch" role="switch" aria-checked="false" aria-label="开启自然声音"><span></span></button></div></section>
      <div class="sidebar-footer"><span class="live-dot"></span>身未动，心已远行。<span>EST. 2026</span></div>
    </aside>
    <section class="experience" aria-label="八大关虚拟景观">
      <div class="scene-wrap" id="scene-wrap">
        <div id="scene"></div><div class="scene-vignette"></div>
        <div class="scene-top"><div class="scene-breadcrumb"><span class="live-dot"></span><span>青岛 · 八大关</span><span class="breadcrumb-divider">/</span><span id="scene-location">武胜关路</span><span class="three-badge">3D 沉浸漫游</span></div><div class="weather-pill">${icon('sun')}<span id="weather-text">秋日晴时</span><span class="weather-divider"></span>${icon('wind')}<span>海风轻拂</span></div></div>
        <div class="scene-caption"><span class="scene-kicker">THE BEAUTY OF UNHURRIED MOMENTS</span><h2 id="scene-poem">一条路，一整个秋天。</h2><span class="caption-line"></span></div>
        <div class="scene-tools"><button class="tool-button" id="reset-button" aria-label="回到初始视角" data-tooltip="回到初始视角">${icon('rotate-ccw')}</button><button class="tool-button" id="map-button" aria-label="切换漫游地图" aria-pressed="true" data-tooltip="漫游地图">${icon('map')}</button><span class="tool-divider"></span><button class="tool-button" id="photo-button" aria-label="拍照并保存风景" data-tooltip="留住这一刻">${icon('camera')}</button><button class="tool-button" id="fullscreen-button" aria-label="进入全屏" data-tooltip="全屏沉浸">${icon('maximize')}</button></div>
        <div class="loading-screen" id="loading-screen"><span class="loading-logo">${brand}</span><p>风景正在路上</p><span>让海风先来一会儿…</span><div class="loading-track"><i></i></div></div>
        <div class="compass" title="视角方向"><span>N</span><svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="25" fill="none" stroke="currentColor" stroke-width=".7" stroke-dasharray="1 7"/><g id="compass-needle"><path d="m30 10 6 21-6-3-6 3Z" fill="#f7f5e9"/><path d="m30 50 6-21-6 3-6-3Z" fill="#f7f5e9" opacity=".35"/></g></svg></div>
        <div class="map-card" id="map-card"><div class="map-title"><span>${icon('map-pin')}漫游地图</span><span class="map-scale">N ↑</span></div><svg id="mini-map" viewBox="0 0 210 130" role="group" aria-label="景点示意地图，可点击圆点切换景点"><defs><pattern id="map-trees" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="5" cy="5" r="1.3" fill="#85917a" opacity=".23"/></pattern></defs><rect width="210" height="130" fill="#e8e8da"/><path d="M156 0q-20 30-8 52t-1 38q-1 22 16 40h47V0Z" fill="#bdced0"/><path d="M149 0q-20 30-8 52t-1 38q-1 22 16 40" stroke="#f8f3df" stroke-width="8" fill="none"/><path d="M0 0h143v130H0z" fill="url(#map-trees)"/><g fill="none" stroke="#faf9f1" stroke-width="5"><path d="m63-5 13 141M0 35l145-11M0 92l148-14M23-5l7 140M110-5l10 140"/></g><g fill="#c5b69a"><path d="M36 44h20v14H36zM37 67h16v14H37zM87 40h19v16H87zM89 98h18v14H89zM3 45h17v20H3zM3 101h18v16H3z"/><path d="M118 42h16v19h-16z" fill="#8daba0"/><path d="M125 90h16v16h-16z" fill="#a9a48f"/></g><text x="85" y="20" fill="#8c9384" font-size="7" transform="rotate(85,85,20)">武胜关路</text><text x="166" y="88" fill="#7c999e" font-size="9" letter-spacing="3">黄海</text><g class="map-point" data-map-view="princess" role="button" tabindex="0" aria-label="前往公主楼"><circle cx="97" cy="54" r="5" fill="#f7f6ed" stroke="#6d8975" stroke-width="1.5"/><circle cx="97" cy="54" r="1.5" fill="#6d8975"/></g><g class="map-point" data-map-view="coast" role="button" tabindex="0" aria-label="前往花石楼"><circle cx="119" cy="20" r="5" fill="#f7f6ed" stroke="#6d8975" stroke-width="1.5"/><circle cx="119" cy="20" r="1.5" fill="#6d8975"/></g><g class="map-point" data-map-view="lane" role="button" tabindex="0" aria-label="前往梧桐树下"><circle cx="70" cy="90" r="4" fill="#6d8975"/></g><g id="map-player" transform="translate(76 105)"><circle r="10" fill="#497764" opacity=".14"/><circle r="4" fill="#426d58" stroke="#fff" stroke-width="1.5"/><path d="m0-10-3 5h6Z" fill="#426d58"/></g></svg><div class="map-footer"><span class="live-dot"></span>你在风景里<span>景点示意</span></div></div>
        <div class="roam-status" id="roam-status"><span class="live-dot"></span><span id="roam-status-text">自由视角</span></div>
        <div class="controls-hint"><span>${icon('mouse')}拖动环顾</span><span class="hint-divider"></span><span><kbd>W</kbd><span class="key-group"><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>自由移动</span><span class="hint-divider"></span><span>${icon('move')}滚轮前行</span><button id="more-controls" aria-label="查看完整操作指南">${icon('info')}</button></div>
        <div class="touch-controls" aria-label="触控移动"><button data-key="KeyW" aria-label="向前">↑</button><div><button data-key="KeyA" aria-label="向左">←</button><button data-key="KeyS" aria-label="向后">↓</button><button data-key="KeyD" aria-label="向右">→</button></div></div>
        <div class="photo-flash" id="photo-flash"></div><div class="toast" id="toast" role="status"></div>
      </div>
      <footer class="scene-footer"><div><span class="footer-star">✳</span><span>此刻，不必赶路。</span><span class="footer-subtitle">Take your time. You're somewhere beautiful.</span></div><button id="about-button">关于这片风景${icon('arrow-up-right')}</button></footer>
    </section>
  </main>
  <dialog id="guide-dialog" aria-labelledby="guide-title"><button class="dialog-close" aria-label="关闭">${icon('x')}</button><span class="dialog-eyebrow">A GENTLE GUIDE</span><h2 id="guide-title">随心走进，眼前的风景。</h2><p class="dialog-intro">不需要路线，也不必赶时间。用你喜欢的方式，探索八大关。</p><div class="guide-grid"><div>${icon('mouse')}<h3>环顾四周</h3><p>按住鼠标左键拖动<br>手机上用手指滑动</p></div><div>${icon('keyboard')}<h3>自由移动</h3><p>W A S D 或方向键移动<br>滚动鼠标滚轮前进、后退</p></div><div>${icon('expand')}<h3>换个高度</h3><p>Q 下降 · E 上升<br>按住 Shift 加速移动</p></div><div>${icon('compass')}<h3>轻松漫游</h3><p>点选风景卡片直接抵达<br>自动导览带你缓缓看遍</p></div></div><button class="dialog-primary" id="guide-close">开始看风景${icon('arrow-right')}</button></dialog>
  <dialog id="notes-dialog" aria-labelledby="notes-title"><button class="dialog-close" aria-label="关闭">${icon('x')}</button><span class="dialog-eyebrow">POSTCARDS FROM BADAGUAN</span><h2 id="notes-title">红瓦绿树，碧海蓝天。</h2><p class="dialog-intro">八大关的美，藏在每一条不急着走完的路上。</p><article class="journal-entry"><span>01</span><div><h3>在林荫道，把脚步放轻</h3><p>以关隘命名的道路，将庭院与各式老别墅串在一起。武胜关路的法桐，初秋仍有绿意，也开始把阳光染成金色。</p></div></article><article class="journal-entry"><span>02</span><div><h3>树丛间，住着一个童话</h3><p>公主楼的绿墙、尖塔与错落的斜屋顶，是八大关令人难忘的建筑轮廓。沿着居庸关路，慢慢遇见它。</p></div></article><article class="journal-entry"><span>03</span><div><h3>走到石墙外，便是海</h3><p>花石楼面向第二海水浴场，以花岗岩墙面和城堡式塔楼著称。树影的尽头，海风穿过石头，也穿过时光。</p></div></article><div class="source-note">本场景依据真实建筑与地方景观特征进行艺术化重构，道路距离与建筑细节并非测绘复原。<br>风景参考：<a href="https://www.dailyqd.com/channelzt/2015-08/25/content_270183.htm" target="_blank" rel="noreferrer">青岛日报 · 八大关</a>、<a href="https://www.dailyqd.com/channelzt/2020-09/14/content_522114.htm" target="_blank" rel="noreferrer">青岛日报 · 花石楼</a>、<a href="https://www.dailyqd.com/channelzt/2020-09/02/content_521220.htm" target="_blank" rel="noreferrer">八大关的道路与树种</a></div></dialog>
`;

// Keep the icon set explicit so Vite can remove unused icons.
const icons = { ArrowUpRight, ArrowRight, ArrowLeft, MapPin, Compass, Sun, Sunrise, Sunset, Volume2, VolumeX, Maximize, Minimize, Camera, RotateCcw, Map, X, Mouse, Move, Info, Play, Pause, Check, ChevronRight, Leaf, Headphones, Navigation, Wind, BookOpen, Footprints, ChevronDown, Expand, Keyboard, HelpCircle, SlidersHorizontal };
const renderIcons = () => createIcons({ icons, attrs: { 'stroke-width': 1.6 } });
renderIcons();
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const audio = new AmbientAudio();
let world, mode = 'free', started = false, currentView = 'lane', season = 'autumn';
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3200); }
const poems = { lane: '一条路，一整个秋天。', princess: '转过街角，走进童话。', coast: '风的来处，是海。' };
const locations = { lane: '武胜关路', princess: '公主楼', coast: '花石楼' };
function selectView(id, move = true) {
  currentView = id;
  $$('.place-card').forEach(b => { b.classList.toggle('active', b.dataset.view === id); b.setAttribute('aria-pressed', b.dataset.view === id); });
  $('#scene-location').textContent = locations[id]; $('#scene-poem').textContent = id === 'lane' && season !== 'autumn' ? (season === 'summer' ? '绿荫深处，自有清凉。' : '春风经过，万物温柔。') : poems[id];
  if (move) world?.goTo(id);
}
function updateMode(next) {
  mode = next; started = false;
  $('#free-mode').classList.toggle('active', mode === 'free'); $('#guide-mode').classList.toggle('active', mode === 'guide');
  $('#free-mode').setAttribute('aria-selected', mode === 'free'); $('#guide-mode').setAttribute('aria-selected', mode === 'guide');
  world?.setGuided(false); world?.setRoam(false); updateStart();
}
function updateStart() {
  $('#start-label').textContent = started ? (mode === 'guide' ? '暂停导览' : '结束漫游') : (mode === 'guide' ? '出发，看遍八大关' : '开始漫游');
  $('#start-button').classList.toggle('is-running', started);
  $('#start-caption').textContent = started ? (mode === 'guide' ? '让风景，缓缓经过。' : '拖动环顾 · WASD 移动 · Esc 退出') : (mode === 'guide' ? '三处风景，一段悠闲时光。' : '无需目的地，随心走走。');
  $('#roam-status-text').textContent = started ? (mode === 'guide' ? '自动导览中' : '自由漫游中') : '自由视角';
  $('#roam-status').classList.toggle('is-active', started);
}
$('#start-button').addEventListener('click', () => { if(!world)return; started = !started; if(mode==='guide')world.setGuided(started);else world.setRoam(started);updateStart();if(started&&mode==='free')toast('拖动环顾四周，使用 W A S D 自由移动'); });
$('#free-mode').addEventListener('click', () => updateMode('free'));
$('#guide-mode').addEventListener('click', () => updateMode('guide'));
$$('.place-card').forEach(b => b.addEventListener('click', () => { world?.setGuided(false);started=false;updateStart();selectView(b.dataset.view); }));
$$('.map-point').forEach(b => { const go=()=>{world?.setGuided(false);started=false;updateStart();selectView(b.dataset.mapView);}; b.addEventListener('click',go); b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}}); });
$('#time-slider').addEventListener('input', e => { const v=Number(e.target.value);const h=Math.floor(v),m=Math.round((v-h)*60);$('#time-number').innerHTML=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')} <small>${h>=12?'PM':'AM'}</small>`;$('#time-description').textContent=v<10?'晨光初醒':v<15?'晴光正好':v<18?'日光渐暖':'日暮温柔';world?.setTime(v);e.target.style.setProperty('--range',`${(v-6)/13*100}%`); });
$$('[data-season]').forEach(b=>b.addEventListener('click',()=>{season=b.dataset.season;$$('[data-season]').forEach(c=>{c.classList.toggle('active',c===b);c.setAttribute('aria-pressed',c===b);});world?.setSeason(season);$('#weather-text').textContent={spring:'春光明媚',summer:'夏日晴时',autumn:'秋日晴时'}[season];selectView(currentView,false);toast({spring:'春光正好，新绿悄然生长',summer:'蝉鸣夏长，树荫正清凉',autumn:'秋意渐浓，等一阵温柔的风'}[season]);}));
$('#sound-switch').addEventListener('click',async()=>{try{const enabled=await audio.toggle();$('#sound-switch').setAttribute('aria-checked',enabled);$('#sound-switch').setAttribute('aria-label',enabled?'关闭自然声音':'开启自然声音');toast(enabled?'声音已开启 · 听见海风与鸟鸣':'自然声音已关闭');}catch(error){toast(error.message||'当前浏览器暂不支持环境声音');}});
$('#reset-button').addEventListener('click',()=>{world?.setGuided(false);started=false;updateStart();selectView(currentView);toast('回到这片风景的起点');});
$('#map-button').addEventListener('click',()=>{const hidden=$('#map-card').classList.toggle('hidden');$('#map-button').setAttribute('aria-pressed',!hidden);$('#map-card').inert=hidden;$('#map-card').setAttribute('aria-hidden',hidden);});
$('#photo-button').addEventListener('click',()=>{if(!world)return;const link=document.createElement('a');link.href=world.capture();link.download=`八大关-${locations[currentView]}-${Date.now()}.png`;link.click();$('#photo-flash').classList.add('flash');setTimeout(()=>$('#photo-flash').classList.remove('flash'),450);toast('已为你留住这一刻 · 风景照片已保存');});
$('#fullscreen-button').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('#scene-wrap').requestFullscreen();}catch{toast('当前浏览器不支持全屏，可使用浏览器全屏功能');}});
document.addEventListener('fullscreenchange',()=>{$('#fullscreen-button').innerHTML=icon(document.fullscreenElement?'minimize':'maximize');$('#fullscreen-button').setAttribute('aria-label',document.fullscreenElement?'退出全屏':'进入全屏');renderIcons();});
const openDialog = (id) => { world?.setGuided(false);started=false;updateStart();$(id).showModal(); };
$('#help-button').addEventListener('click',()=>openDialog('#guide-dialog'));$('#more-controls').addEventListener('click',()=>openDialog('#guide-dialog'));
$('#nav-notes').addEventListener('click',()=>openDialog('#notes-dialog'));$('#about-button').addEventListener('click',()=>openDialog('#notes-dialog'));
$('#nav-wander').addEventListener('click',()=>{world?.setGuided(false);selectView('lane');started=false;updateStart();});
$$('.dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));$('#guide-close').addEventListener('click',()=>$('#guide-dialog').close());
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$$('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);world?.press(b.dataset.key);});const release=()=>world?.release(b.dataset.key);b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);});

requestAnimationFrame(()=>setTimeout(()=>{
  try {
    world=createWorld($('#scene'),{
      onView:(id)=>selectView(id,false),
      onGuideStop:()=>{started=false;updateStart();},
      onRoamStop:()=>{started=false;updateStart();},
      onMove:({x,z,yaw})=>{const px=Math.max(8,Math.min(196,70+x*1.35)),py=Math.max(8,Math.min(122,104-(42-z)*.62));$('#map-player').setAttribute('transform',`translate(${px} ${py}) rotate(${-yaw*180/Math.PI})`);$('#compass-needle').setAttribute('transform',`rotate(${-yaw*180/Math.PI} 30 30)`);}
    });
    window.__BADAGUAN__=world;
    const thumbs=world.screenshots();Object.entries(thumbs).forEach(([id,url])=>{$(`#thumb-${id}`).src=url;});
    $('#loading-screen').classList.add('loaded');
    document.body.classList.add('scene-ready');
  } catch(error) {
    console.error('Scene initialization failed:',error);
    $('#loading-screen').innerHTML=`${brand}<p>这片风景暂时未能展开</p><span>请确认浏览器已开启 WebGL 硬件加速。</span><button class="dialog-primary" onclick="location.reload()">重新加载</button>`;
  }
},60));
window.addEventListener('pagehide',()=>audio.dispose());
