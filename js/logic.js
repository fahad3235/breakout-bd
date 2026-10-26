/* Breakout BD — DOM-free game logic (shared by the browser app and node tests).
 * Board: 480 x 600 logical pixels. All functions are pure except where they
 * mutate the ball/brick objects passed in (documented per function).
 * Run node tests: node tests/tests.js  (from the project root)
 */
(function (root) {
  'use strict';
  var W = 480, H = 600;
  var PADDLE_W = 90, PADDLE_H = 12, PADDLE_Y = H - 40;
  var BALL_R = 8;
  var BRICK_COLS = 8, BRICK_GAP = 6, BRICK_TOP = 70, BRICK_H = 24;
  var BRICK_W = (W - 20 - (BRICK_COLS - 1) * BRICK_GAP) / BRICK_COLS;
  var COLORS = ['#ef476f', '#f78c6b', '#ffd166', '#06d6a0', '#118ab2', '#7b5ea7'];

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  function levelRows(level) {
    if (level === 1) return 5;
    if (level === 2) return 6;
    return 6;
  }

  // Build the brick layout for a level. Level 1: all 1-HP. Level 2: top two
  // rows are tough (2-HP). Level 3: checker holes + tough bricks on even rows.
  function createBricks(level) {
    var rows = levelRows(level), bricks = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < BRICK_COLS; c++) {
        if (level === 3 && (r + c) % 4 === 0) continue; // hole in the wall
        var hp = 1;
        if (level === 2 && r < 2) hp = 2;
        if (level === 3 && r % 2 === 0) hp = 2;
        bricks.push({
          x: 10 + c * (BRICK_W + BRICK_GAP),
          y: BRICK_TOP + r * (BRICK_H + BRICK_GAP),
          w: BRICK_W, h: BRICK_H,
          hp: hp, maxHp: hp, row: r, col: c,
          color: COLORS[r % COLORS.length], alive: true
        });
      }
    }
    return bricks;
  }

  function remainingBricks(bricks) {
    var n = 0;
    for (var i = 0; i < bricks.length; i++) if (bricks[i].alive) n++;
    return n;
  }

  function isLevelClear(bricks) { return remainingBricks(bricks) === 0; }

  // Ball speed in px/second. Slightly faster each level.
  function ballSpeedForLevel(level) { return 300 + (level - 1) * 40; }

  function spawnBall(level, paddleX) {
    var speed = ballSpeedForLevel(level);
    return {
      x: paddleX + PADDLE_W / 2, y: PADDLE_Y - BALL_R - 1,
      vx: speed * 0.35, vy: -speed, r: BALL_R, speed: speed
    };
  }

  function movePaddle(x) { return clamp(x, 0, W - PADDLE_W); }

  // Paddle bounce: hit position across the paddle maps to -60..+60 degrees.
  // Preserves the ball's speed; always sends it upwards.
  function paddleBounce(ball, paddleX) {
    var rel = clamp((ball.x - paddleX) / PADDLE_W, 0, 1); // 0 = left edge
    var angle = (rel - 0.5) * (Math.PI * 2 / 3); // -60deg..+60deg
    var speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) || ball.speed;
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.abs(Math.cos(angle) * speed);
    // Keep the ball just above the paddle so it cannot tunnel through.
    ball.y = PADDLE_Y - ball.r - 0.5;
    return ball;
  }

  // Circle-vs-rect overlap test. Returns true when the ball touches the rect.
  function circleHitsRect(ball, rx, ry, rw, rh) {
    var cx = clamp(ball.x, rx, rx + rw);
    var cy = clamp(ball.y, ry, ry + rh);
    var dx = ball.x - cx, dy = ball.y - cy;
    return dx * dx + dy * dy <= ball.r * ball.r;
  }

  // Advance the ball one frame. Mutates ball and bricks.
  // Returns { events: [...], score: n, lost: bool }.
  // events entries: 'wall' | 'paddle' | 'brick-hit' | 'brick-destroyed' | 'lost'
  function stepBall(ball, dt, paddleX, bricks) {
    var events = [], score = 0, lost = false;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    // Side walls.
    if (ball.x - ball.r < 0) { ball.x = ball.r; ball.vx = Math.abs(ball.vx); events.push('wall'); }
    if (ball.x + ball.r > W) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx); events.push('wall'); }
    // Top wall.
    if (ball.y - ball.r < 0) { ball.y = ball.r; ball.vy = Math.abs(ball.vy); events.push('wall'); }
    // Paddle (only while moving down).
    if (ball.vy > 0 && circleHitsRect(ball, paddleX, PADDLE_Y, PADDLE_W, PADDLE_H)) {
      paddleBounce(ball, paddleX);
      events.push('paddle');
    }
    // Bricks: first overlap wins per frame (one brick per frame, no tunnelling
    // through two bricks at once). Bounce axis = smaller penetration axis.
    for (var i = 0; i < bricks.length; i++) {
      var b = bricks[i];
      if (!b.alive) continue;
      if (!circleHitsRect(ball, b.x, b.y, b.w, b.h)) continue;
      var overlapX = Math.min(ball.x + ball.r - b.x, b.x + b.w - (ball.x - ball.r));
      var overlapY = Math.min(ball.y + ball.r - b.y, b.y + b.h - (ball.y - ball.r));
      if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy;
      b.hp -= 1;
      score += 10;
      if (b.hp <= 0) { b.alive = false; score += 10; events.push('brick-destroyed'); }
      else { events.push('brick-hit'); }
      break;
    }
    // Bottom = lost ball.
    if (ball.y - ball.r > H) { lost = true; events.push('lost'); }
    return { events: events, score: score, lost: lost };
  }

  function toBengaliDigits(s) {
    var map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(s).replace(/[0-9]/g, function (d) { return map[+d]; });
  }

  var api = {
    W: W, H: H, PADDLE_W: PADDLE_W, PADDLE_H: PADDLE_H, PADDLE_Y: PADDLE_Y,
    BALL_R: BALL_R, BRICK_COLS: BRICK_COLS,
    clamp: clamp, levelRows: levelRows, createBricks: createBricks,
    remainingBricks: remainingBricks, isLevelClear: isLevelClear,
    ballSpeedForLevel: ballSpeedForLevel, spawnBall: spawnBall,
    movePaddle: movePaddle, paddleBounce: paddleBounce,
    circleHitsRect: circleHitsRect, stepBall: stepBall,
    toBengaliDigits: toBengaliDigits
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BreakoutLogic = api;
})(typeof window !== 'undefined' ? window : globalThis);
