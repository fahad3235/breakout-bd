# Breakout BD — Test Results

Run date: 2026-10-26 (Asia/Dhaka). All results from real runs, not estimates.

## Unit tests — 35/35 passed, 0 failed

Command: `node tests/tests.js` (from the project root).

Coverage: level layouts (L1 40 bricks, L2 48, L3 holes + tough rows),
brick HP rules (1-HP destroy +20, 2-HP first hit +10 and survives),
paddle clamping, paddle bounce angles (centre straight up, left/right
angled, speed preserved), circle-rect overlap, wall bounces, bottom =
lost, paddle hit/miss, brick side-hit horizontal flip, spawn position
and level-2 speed field, Bengali digit conversion.

Repairs: 4 test-side fixes, 0 app-logic bugs. The first run had 31/35:
the paddle-angle tests used balls with velocity magnitude 100 while
asserting angles that need magnitude 300, and the spawn test asserted
the velocity magnitude equals the speed field (spawn sets vx = 0.35 x
speed, vy = -speed, so the magnitude is ~1.06 x speed). Both tests now
assert the intended behaviour: paddleBounce preserves the ball's
actual velocity magnitude, and spawnBall sets speed field / vy exactly.

## Headless-Chrome smoke tests — 15/15 passed, 0 failed

Command: `node tests/smoke.js` (puppeteer-core + /opt/meta-chromium/chrome,
`file://` load).

Checks: page title, h1, 480x600 canvas, initial state
(ready / score 0 / lives 3 / level 1 / 40 bricks), ready overlay
visible, Start serves the ball (phase playing), ArrowRight moves the
paddle (195 -> ~370), pause/resume round-trip, language toggle to
ব্রেকআউট বিডি and back, restart resets state, 0 console/page errors,
0 network requests, 390px viewport with no horizontal overflow.

Repairs: 0.

## Totals

35/35 unit + 15/15 smoke = 50/50 checks green, 0 console errors,
0 network requests.
