// Node unit tests for js/logic.js — run from project root: node tests/tests.js
var L = require('../js/logic.js');
var pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS ' + name); }
  else { fail++; console.log('FAIL ' + name); }
}
function approx(a, b, eps) { return Math.abs(a - b) <= (eps || 0.001); }
function brickAt(x, y, w, h) { return { x: x, y: y, w: w, h: h, hp: 1, maxHp: 1, alive: true }; }

// --- layouts ---
var l1 = L.createBricks(1), l2 = L.createBricks(2), l3 = L.createBricks(3);
check('level 1 has 5 rows x 8 cols = 40 bricks', l1.length === 40);
check('level 2 has 6 rows x 8 cols = 48 bricks', l2.length === 48);
check('level 1 all bricks 1-HP', l1.every(function (b) { return b.hp === 1; }));
check('level 2 top two rows are 2-HP', l2.filter(function (b) { return b.row < 2; }).every(function (b) { return b.hp === 2; }));
check('level 2 lower rows are 1-HP', l2.filter(function (b) { return b.row >= 2; }).every(function (b) { return b.hp === 1; }));
check('level 3 has holes (fewer than 48)', l3.length < 48 && l3.length > 0);
check('level 3 even rows are 2-HP', l3.filter(function (b) { return b.row % 2 === 0; }).every(function (b) { return b.hp === 2; }));
check('level rows: 1->5, 2->6, 3->6', L.levelRows(1) === 5 && L.levelRows(2) === 6 && L.levelRows(3) === 6);
check('remaining counts alive only', L.remainingBricks(l1) === 40);
var dead = l1.slice(); dead[0].alive = false;
check('remaining drops after a brick dies', L.remainingBricks(dead) === 39);
check('level clear when none alive', L.isLevelClear(l1.map(function (b) { return Object.assign({}, b, { alive: false }); })));
check('level not clear while bricks remain', !L.isLevelClear(l1));

// --- speeds ---
check('speed rises per level', L.ballSpeedForLevel(1) === 300 && L.ballSpeedForLevel(2) === 340 && L.ballSpeedForLevel(3) === 380);

// --- paddle ---
check('paddle clamps left', L.movePaddle(-50) === 0);
check('paddle clamps right', L.movePaddle(9999) === L.W - L.PADDLE_W);
check('paddle passes middle through', L.movePaddle(200) === 200);
var ball = { x: 240, y: 550, vx: 0, vy: 100, r: 8, speed: 300 };
L.paddleBounce(ball, 195); // centre hit -> straight up
check('centre paddle hit goes straight up', approx(ball.vx, 0, 0.01) && ball.vy < 0);
var ballL = { x: 195, y: 550, vx: 0, vy: 300, r: 8, speed: 300 };
L.paddleBounce(ballL, 195);
check('left-edge hit angles left', ballL.vx < -100 && ballL.vy < 0);
var ballR = { x: 285, y: 550, vx: 0, vy: 300, r: 8, speed: 300 };
L.paddleBounce(ballR, 195);
check('right-edge hit angles right', ballR.vx > 100 && ballR.vy < 0);
check('paddle bounce preserves speed', approx(Math.sqrt(ballR.vx * ballR.vx + ballR.vy * ballR.vy), 300, 0.01));

// --- circle-rect ---
check('circle inside rect hits', L.circleHitsRect({ x: 50, y: 50, r: 8 }, 40, 40, 30, 20));
check('circle far from rect misses', !L.circleHitsRect({ x: 200, y: 200, r: 8 }, 40, 40, 30, 20));
check('circle overlapping rect edge hits', L.circleHitsRect({ x: 38, y: 50, r: 8 }, 40, 40, 30, 20));

// --- stepBall: walls ---
var wb = { x: 9, y: 300, vx: -100, vy: 0, r: 8, speed: 100 };
var res = L.stepBall(wb, 0.1, 195, []);
check('left wall bounces vx positive', wb.vx > 0 && res.events.indexOf('wall') !== -1);
var tb = { x: 240, y: 9, vx: 0, vy: -100, r: 8, speed: 100 };
res = L.stepBall(tb, 0.1, 195, []);
check('top wall bounces vy positive', tb.vy > 0 && res.events.indexOf('wall') !== -1);
var lb = { x: 240, y: 610, vx: 0, vy: 100, r: 8, speed: 100 };
res = L.stepBall(lb, 0.01, 195, []);
check('ball below bottom is lost', res.lost && res.events.indexOf('lost') !== -1);

// --- stepBall: paddle ---
var pb = { x: 240, y: L.PADDLE_Y - 9, vx: 0, vy: 200, r: 8, speed: 200 };
res = L.stepBall(pb, 0.05, 195, []);
check('paddle hit sends ball up', pb.vy < 0 && res.events.indexOf('paddle') !== -1);
var pbMiss = { x: 50, y: L.PADDLE_Y - 9, vx: 0, vy: 200, r: 8, speed: 200 };
res = L.stepBall(pbMiss, 0.05, 195, []);
check('ball missing paddle does not bounce', res.events.indexOf('paddle') === -1);

// --- stepBall: bricks ---
var br = [brickAt(200, 100, 50, 24)];
var bb = { x: 225, y: 95, vx: 0, vy: 200, r: 8, speed: 200 };
res = L.stepBall(bb, 0.05, 195, br);
check('brick hit destroys 1-HP brick, +20 score', br[0].alive === false && res.score === 20 && res.events.indexOf('brick-destroyed') !== -1);
check('brick hit flips vertical velocity', bb.vy < 0);
var tough = [{ x: 200, y: 100, w: 50, h: 24, hp: 2, maxHp: 2, alive: true }];
var tb2 = { x: 225, y: 95, vx: 0, vy: 200, r: 8, speed: 200 };
res = L.stepBall(tb2, 0.05, 195, tough);
check('tough brick survives first hit at 1 HP, +10 score', tough[0].alive === true && tough[0].hp === 1 && res.score === 10 && res.events.indexOf('brick-hit') !== -1);
var side = [brickAt(200, 100, 50, 24)];
var sb = { x: 195, y: 112, vx: 200, vy: 0, r: 8, speed: 200 };
res = L.stepBall(sb, 0.05, 195, side);
check('side brick hit flips horizontal velocity', sb.vx < 0 && side[0].alive === false);

// --- spawn ---
var sp = L.spawnBall(2, 195);
check('spawn sits above paddle and moves up', sp.y < L.PADDLE_Y && sp.vy < 0);
check('spawn speed field matches level 2, vy = -speed', sp.speed === 340 && sp.vy === -340 && approx(sp.vx, 119, 0.01));

// --- digits ---
check('Bengali digits convert', L.toBengaliDigits('123') === '১২৩' && L.toBengaliDigits('0') === '০');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
