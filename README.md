# Breakout BD

An offline, bilingual (English / বাংলা) brick-breaker arcade game for the
browser. Move the paddle, smash every brick, and do not drop the ball.

## Features

- **Real arcade gameplay** — canvas Breakout with paddle/ball physics: wall
  bounces, angle-based paddle rebounds (hit near an edge for a sharper angle),
  and side-vs-top brick collision handling.
- **3 levels** — Level 1: 40 bricks. Level 2: 48 bricks with tough 2-hit
  bricks on the top two rows. Level 3: 6 rows with holes in the wall and
  tough bricks on even rows. Ball speed rises slightly each level.
- **Lives, score, best score** — 3 lives, +10 per brick hit (+10 bonus on
  destroy), best score kept in `localStorage`.
- **Controls** — mouse move, touch drag, or Left / Right arrow keys
  (A / D also work). Space / Enter serves, pauses, and resumes.
- **Pause, restart, level-clear and win overlays** — plus a game-over
  screen with your final score.
- **Bilingual UI** — EN / বাংলা toggle, persisted, with Bengali digits
  in the Bengali mode.
- **Tiny sound effects** — WebAudio beeps for paddle, brick, and lost ball
  (no audio files); mutable, persisted.
- **100% offline** — no network requests, no account, no data leaves
  your device. Only best score, language, and sound settings persist,
  in `localStorage` under `breakout-bd-v1`.

## Stack

Vanilla HTML, CSS, and JavaScript. No framework, no build step, no
dependencies at runtime. Game rules live in `js/logic.js` (DOM-free, so
the node tests exercise exactly the code the browser runs); rendering
and input live in `js/app.js`.

## Run locally

Open `index.html` in any modern browser, or serve the folder:

```sh
python3 -m http.server 8000
# then open http://localhost:8000/
```

## Testing

```sh
# Unit tests for the game logic (35 checks)
node tests/tests.js

# Headless-Chrome smoke tests (15 checks; needs puppeteer-core + Chromium)
npm install --no-save --no-package-lock puppeteer-core
node tests/smoke.js
```

Results are recorded in `TEST_RESULTS.md` (35/35 unit + 15/15 smoke,
0 console errors, 0 network requests).

## Limitations

- This is a casual game, not a physics simulation: one brick is resolved
  per frame, so at very high speeds the ball can occasionally clip a
  brick corner.
- Sound uses the WebAudio API; some browsers require a first user
  gesture before audio plays, so the first beep may be silent.
- Best score is per-browser (localStorage); there is no leaderboard
  or cross-device sync, by design.

## Status

MVP complete. See `TEST_RESULTS.md` for the verified test run.
