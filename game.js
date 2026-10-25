// Web port of Joseph Priatel's Processing platformer.
// Fisica (Box2D) doesn't run in browsers, so physics here is a small AABB engine
// (everything in the game is an axis-aligned box). Game logic mirrors the .pde files.
const GRID = 32, DT = 1 / 60, ZOOM = 1.65;
const C = { dirt:0xB25A00, grass:0x2E6115, leaf:0x6ABB4A, trunk:0x964D00, water:0x056DB1, ice:0x31A2EE,
  stone:0x9B9B9B, spike:0x777777, lava:0xB90000, tramp:0xFF00D9, goomba:0xFFE500, thwomp:0x7800FF,
  coin:0xFFC830, hammer:0x00FF9C, flag:0xFF0000, hit:0xDA00FF, bridge:0xD87C19, fence:0xF6B233,
  black:0x000000, white:0xFFFFFF };
const T = {}, A = {};
let mapImg, pixelFont;
let W, S, terrain, enemies, player, score, G, spawnX, spawnY, swimming, playerRefresh, fc, acc = 0;
const keys = {};

function preload() {
  const L = n => loadImage('data/textures/' + n + '.png');
  const seq = (p, n) => Array.from({ length: n }, (_, i) => L(p + i));
  for (const n of ['bridgeM','dirt','grassT','grassTL','grassTR','ice','lava6','leafL','leafM','leafR','stone',
    'trunk','trunkLeaf','water4','spike','trampoline','thwomp0','thwomp1','hammer','marioRs','coin0_scaled'])
    T[n] = L(n);
  A.lava = seq('lava', 6); A.water = seq('water', 4); A.flag = seq('flag', 3); A.hit = seq('hitblock', 4);
  A.coin = seq('coin', 4); A.goomba = seq('goomba', 2); A.hbro = seq('hammerbro', 2); A.run = seq('PRun', 3);
  const i0 = L('PIdle0');
  A.idle = Array(30).fill(i0).concat([L('PIdle1')]); A.jump = [L('PJump0')];
  mapImg = loadImage('data/maps/map.png');
  pixelFont = loadFont('data/fonts/pixelFont.ttf');
}

function setup() {
  createCanvas(640, 640).parent('game');
  pixelDensity(1); noSmooth();
  T.ice.resize(32, 32);
  textFont(pixelFont);
  init();
}

// ---------- world building ----------
function init() {
  W = []; terrain = []; enemies = []; score = 0; G = 900; spawnX = 250; spawnY = 959;
  swimming = false; playerRefresh = 5; fc = 0;
  const box = (x, y, o = {}) => { const b = Object.assign({ x, y, w:GRID, h:GRID, vx:0, vy:0, st:true,
    sensor:false, name:'', img:null, fr:0.2, rest:0, ang:0, av:0, flip:false, dead:false, frame:0,
    onGround:null, act:null }, o); W.push(b); return b; };
  box(-32, 900, { w:32, h:640, fr:0 });
  box(2752, 600, { w:32, h:640, fr:0 });

  mapImg.loadPixels();
  const mw = mapImg.width, mh = mapImg.height;
  const get = (x, y) => { if (x < 0 || y < 0 || x >= mw || y >= mh) return -1;
    const i = 4 * (y * mw + x); const p = mapImg.pixels;
    return p[i + 3] < 128 ? -1 : (p[i] << 16) | (p[i + 1] << 8) | p[i + 2]; };
  const anim = (seq, period, start = 0) => b => { if (b.frame >= seq.length) b.frame = 0;
    if (fc % period === 0) { b.img = seq[b.frame]; b.frame++; } };
  const rnd = n => Math.floor(Math.random() * n);

  for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
    const c = get(x, y), n = get(x, y - 1), e = get(x + 1, y), s = get(x, y + 1), w = get(x - 1, y);
    const px = x * GRID, py = y * GRID;
    if (c === C.dirt) box(px, py, { img:T.dirt, name:'dirtTile' });
    else if (c === C.grass) { let im = T.grassT; if (e === C.white) im = T.grassTR; if (w === C.white) im = T.grassTL;
      box(px, py, { img:im, fr:3, name:'grassTile' }); }
    else if (c === C.leaf) { let im = T.leafM;
      if (s === C.trunk) im = T.trunkLeaf; if (w === C.white) im = T.leafL; if (e === C.white) im = T.leafR;
      box(px, py, { img:im, name:'leafTile' }); }
    else if (c === C.trunk) box(px, py, { img:T.trunk, sensor:true, name:'trunkTile' });
    else if (c === C.water && (n === C.white || n === C.ice)) {
      const b = box(px, py, { sensor:true, name:'waterTile', frame:rnd(4) }); b.act = anim(A.water, 15); terrain.push(b); }
    else if (c === C.water && n === C.water) box(px, py, { img:T.water4, sensor:true, name:'waterTile' });
    else if (c === C.stone) box(px, py, { img:T.stone, fr:3, name:'stoneTile' });
    else if (c === C.lava && (n === C.white || n === C.coin)) {
      const b = box(px, py, { sensor:true, name:'lavaTile', frame:rnd(6) }); b.act = anim(A.lava, 15); terrain.push(b); }
    else if (c === C.lava && n === C.lava) box(px, py, { img:T.lava6, sensor:true, name:'lavaTile' });
    else if (c === C.bridge) {
      const b = box(px, py, { img:T.bridgeM, name:'bridgeTile' });
      b.act = () => { if (touching(b, 'player')) { b.st = false; b.sensor = true; } if (b.y > 3200) b.dead = true; };
      terrain.push(b); }
    else if (c === C.ice) box(px, py, { img:T.ice, fr:0.05, name:'iceTile' });
    else if (c === C.spike) box(px, py, { img:T.spike, name:'spikeTile' });
    else if (c === C.tramp) box(px, py, { img:T.trampoline, rest:2 });
    else if (c === C.goomba) enemies.push(makeGoomba(box(px, py, { st:false, name:'goomba' })));
    else if (c === C.black) { let im = null; if (e === C.white) im = T.grassTR; if (w === C.white) im = T.grassTL;
      box(px, py, { img:im, name:'wallTile' }); }
    else if (c === C.thwomp) enemies.push(makeThwomp(box(px + 16, py + 16, { w:64, h:64, name:'thwomp' })));
    else if (c === C.coin) { const b = box(px, py, { sensor:true, name:'coinTile', frame:0 }); const a = anim(A.coin, 15);
      b.act = () => { if (b.dead) return; a(b); if (touching(b, 'player')) { score++; b.dead = true; } }; terrain.push(b); }
    else if (c === C.hammer) enemies.push(makeHammerbro(box(px, py, { st:false, name:'hammerbro' })));
    else if (c === C.flag) { const b = box(px, py, { sensor:true, name:'flagTile' }); const a = anim(A.flag, 15); let armed = true;
      b.act = () => { a(b); if (armed && touching(b, 'player')) { armed = false; spawnX = px; spawnY = py; } }; terrain.push(b); }
    else if (c === C.hit) { const b = box(px, py, { name:'hitblockTile' }); b.act = anim(A.hit, 15); terrain.push(b); }
  }
  player = box(spawnX, spawnY, { st:false, name:'player', img:A.idle[0] });
  Object.assign(player, { lives:3, direction:1, action:A.idle });
}

// ---------- physics ----------
const overlap = (a, b, m = 0) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 + m && Math.abs(a.y - b.y) < (a.h + b.h) / 2 + m;
function touching(b, name) {
  for (const o of W) if (o !== b && !o.dead && o.name === name && overlap(b, o, (o.sensor || b.sensor) ? 0 : 1)) return true;
  return false;
}
function stepWorld() {
  S = W.filter(b => b.st && !b.sensor && !b.dead);
  for (const b of W) {
    if (b.dead || b.st) continue;
    b.vy += G * DT;
    if (b.sensor) { b.x += b.vx * DT; b.y += b.vy * DT; b.ang += b.av * DT; continue; }
    b.x += b.vx * DT;
    if (b.vx) for (const s of S) if (overlap(b, s)) { b.x = b.vx > 0 ? s.x - (s.w + b.w) / 2 : s.x + (s.w + b.w) / 2; b.vx = 0; }
    b.y += b.vy * DT; b.onGround = null;
    if (b.vy) for (const s of S) if (overlap(b, s)) {
      if (b.vy > 0) { b.y = s.y - (s.h + b.h) / 2; b.onGround = s; const r = Math.max(b.rest, s.rest);
        b.vy = (r > 0 && b.vy > 40) ? -Math.min(b.vy * r, 950) : 0; }
      else { b.y = s.y + (s.h + b.h) / 2; b.vy = 0; }
    }
    if (b.onGround && b.vx) { const d = Math.sqrt(b.fr * b.onGround.fr) * G * DT;
      b.vx = Math.abs(b.vx) <= d ? 0 : b.vx - Math.sign(b.vx) * d; }
  }
  W = W.filter(b => !b.dead);
}

// ---------- game objects ----------
function hurtPlayer() { player.lives--; player.x = spawnX; player.y = spawnY; }
function stompOrHurt(b) {
  if (!touching(b, 'player')) return;
  if (player.y < b.y - GRID / 1.25) { b.dead = true; player.vy = -300; } else hurtPlayer();
}
function animateWalker(b, seq) {
  if (b.frame >= seq.length) b.frame = 0;
  if (fc % playerRefresh === 0) { b.img = seq[b.frame]; b.flip = b.direction === -1; b.frame++; }
}
function makeGoomba(b) {
  b.direction = -1;
  b.act = () => { animateWalker(b, A.goomba);
    if (touching(b, 'wallTile')) { b.direction *= -1; b.x += b.direction; }
    stompOrHurt(b); b.vx = 75 * b.direction; };
  return b;
}
function makeHammerbro(b) {
  Object.assign(b, { direction:1, k:75, l:0 });
  b.act = () => { animateWalker(b, A.hbro);
    if (++b.k === 150) { b.direction = -b.direction; b.k = 0; }
    b.l++; stompOrHurt(b); b.vx = 75 * b.direction;
    if (++b.l === 220) { const h = { x:b.x, y:b.y, w:GRID, h:GRID, vx:(Math.random() * 500 - 250), vy:-300, st:false,
        sensor:true, name:'hammer', img:T.hammer, fr:0, rest:0, ang:0, av:75, flip:false, dead:false, act:() => { if (h.y > 3200) h.dead = true; } };
      W.push(h); terrain.push(h); b.l = 0; } };
  return b;
}
function makeThwomp(b) {
  Object.assign(b, { xSet:b.x, ySet:b.y, k:0, triggered:false });
  b.act = () => {
    const rx = b.xSet + Math.random() * 4 - 2, ry = b.ySet + Math.random() * 4 - 2;
    b.img = T.thwomp0;
    if (Math.abs(b.x - player.x) < GRID && player.y > b.y && b.y < b.ySet) b.triggered = true;
    if (!b.triggered) { b.st = true; b.vx = b.vy = 0; b.k = 0; if (b.y >= b.ySet) b.y -= 1; }
    else { b.img = T.thwomp1; b.k++;
      if (b.k < 25) { b.x = rx; b.y = ry; }
      if (b.k === 25) { b.x = b.xSet; b.y = b.ySet; }
      if (b.k > 25) { b.st = false; b.vx = 0; b.vy = 500; } }
    if (b.y > 1519) b.triggered = false;
    if (touching(b, 'player')) hurtPlayer();
  };
  return b;
}
function playerAct() {
  const p = player, vx = p.vx, vy = p.vy;
  const left = keys.a || keys.left, right = keys.d || keys.right, up = keys.w || keys.up || keys.space;
  if (vy < 0.1) p.action = A.idle;
  if (left) { p.action = A.run; p.vx = swimming ? -50 : -150; }
  if (right) { p.vx = swimming ? 50 : 150; p.action = A.run; }
  if (up && ['grassTile','bridgeTile','stoneTile','iceTile','leafTile'].some(n => touching(p, n))) { p.action = A.jump; p.vx = vx; p.vy = -375; }
  if (up && touching(p, 'waterTile')) { p.vx = vx; p.vy = -75; }
  if (Math.abs(vy) > 0.1) p.action = A.jump;
  if (p.vx > 1) p.direction = 1; else if (p.vx < -1) p.direction = -1;
  if (touching(p, 'spikeTile') || touching(p, 'lavaTile') || touching(p, 'hammer')) hurtPlayer();
  swimming = touching(p, 'waterTile');
  if (p.y > 2900) { p.x = spawnX; p.y = spawnY; p.vy = 0; }   // safety net for falling out of the world
  if (p.frame >= p.action.length) p.frame = 0;
  if (fc % playerRefresh === 0) { p.img = p.action[p.frame]; p.flip = p.direction === -1; p.frame++; }
}
function actWorld() {
  playerAct();
  for (const t of [...terrain]) if (t.act && !t.dead) t.act(t);
  for (const e of [...enemies]) if (!e.dead) e.act(); else enemies.splice(enemies.indexOf(e), 1);
  G = swimming ? 90 : 900; playerRefresh = swimming ? 12 : 5;
}

// ---------- rendering ----------
function draw() {
  acc = Math.min(acc + deltaTime / 1000, 0.1);
  while (acc >= DT) { stepWorld(); actWorld(); fc++; acc -= DT; }
  background('#8FCFFF');
  push();
  const cx = constrain(player.x, 180, 2540);
  translate(-cx * ZOOM + width / 2, -player.y * ZOOM + height / 2);
  scale(ZOOM); imageMode(CENTER);
  for (const b of W) {
    if (!b.img) continue;
    push(); translate(b.x, b.y); rotate(b.ang); if (b.flip) scale(-1, 1); image(b.img, 0, 0); pop();
  }
  pop();
  drawInterface();
  if (player.lives <= 0) overlay('GAMEOVER', 60, 0xFF0000);
  else if (score === 5) overlay('WINNER', 75, 0x6ABB4A);
}
function bordered(str, col, x, y) {
  fill(0); text(str, x - 1, y); text(str, x + 1, y); text(str, x, y - 1); text(str, x, y + 1);
  fill(col); text(str, x, y);
}
function drawInterface() {
  textFont(pixelFont); textAlign(CENTER, CENTER); textSize(50); imageMode(CORNER);
  image(T.coin0_scaled, width - 64, 0);
  image(T.marioRs, width - 54, 70, 44, 44);
  bordered(String(player.lives), '#FFE500', width - 80, 85);
  bordered(String(score), '#FFE500', width - 80, 25);
}
function overlay(msg, size, col) {
  rectMode(CENTER); noStroke(); fill(255); rect(width / 2, height / 2, width + 25, height + 25);
  textAlign(CENTER, CENTER); textSize(size); bordered(msg, color((col >> 16) & 255, (col >> 8) & 255, col & 255), width / 2, height / 2);
  textSize(20); fill(60); text('press R to restart', width / 2, height / 2 + 70);
}

// ---------- input ----------
const KEYMAP = { 87:'w', 65:'a', 83:'s', 68:'d', 32:'space', 38:'up', 37:'left', 39:'right', 40:'down' };
function keyPressed() {
  if (KEYMAP[keyCode]) keys[KEYMAP[keyCode]] = true;
  if (keyCode === 82 && (player.lives <= 0 || score === 5)) init();
  return !(keyCode in KEYMAP);   // stop arrows/space from scrolling the page
}
function keyReleased() { if (KEYMAP[keyCode]) keys[KEYMAP[keyCode]] = false; return false; }
