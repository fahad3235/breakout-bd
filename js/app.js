/* Breakout BD — browser app: rendering, input, game state, i18n, persistence.
 * Depends on js/logic.js (window.BreakoutLogic). No network requests.
 */
(function () {
  'use strict';
  var L = window.BreakoutLogic;
  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');
  canvas.width = L.W; canvas.height = L.H;

  var I18N = {
    en: {
      title: 'Breakout BD', tagline: 'Smash every brick. Do not drop the ball.',
      score: 'Score', best: 'Best', lives: 'Lives', level: 'Level',
      start: 'Start Game', pause: 'Pause', resume: 'Resume', restart: 'Restart',
      nextLevel: 'Next Level', playAgain: 'Play Again',
      readyTitle: 'Ready?', readyText: 'Move the paddle with mouse, touch, or arrow keys. Press Start to serve the ball.',
      pausedTitle: 'Paused', pausedText: 'Take a breath. Press Resume to keep playing.',
      levelClearTitle: 'Level Clear!', levelClearText: 'Nice smashing. Ready for the next wall?',
      gameOverTitle: 'Game Over', gameOverText: 'The ball got away. Your final score is below.',
      winTitle: 'You Beat All 3 Levels!', winText: 'Champion of the wall. Play again to chase a higher score.',
      finalScore: 'Final score', howTo: 'How to play',
      how1: 'Move the paddle: mouse, touch drag, or Left / Right arrow keys (A / D also work).',
      how2: 'Break every brick. Tough bricks (darker edge) need 2 hits.',
      how3: 'Lose the ball below the paddle and you lose a life. You start with 3 lives.',
      how4: 'Level 3 has holes in the wall — use them to aim, not as an excuse.',
      soundOn: 'Sound: On', soundOff: 'Sound: Off',
      langBtn: 'বাংলা'
    },
    bn: {
      title: 'ব্রেকআউট বিডি', tagline: 'সব ইট ভাঙুন। বল পড়তে দেবেন না।',
      score: 'স্কোর', best: 'সেরা', lives: 'জীবন', level: 'লেভেল',
      start: 'খেলা শুরু', pause: 'বিরতি', resume: 'আবার শুরু', restart: 'নতুন করে',
      nextLevel: 'পরের লেভেল', playAgain: 'আবার খেলুন',
      readyTitle: 'প্রস্তুত?', readyText: 'মাউস, টাচ বা অ্যারো কি দিয়ে প্যাডেল নাড়ান। বল ছাড়তে Start চাপুন।',
      pausedTitle: 'বিরতি', pausedText: 'একটু জিরিয়ে নিন। চালিয়ে যেতে Resume চাপুন।',
      levelClearTitle: 'লেভেল শেষ!', levelClearText: 'দারুণ! পরের দেয়ালের জন্য প্রস্তুত?',
      gameOverTitle: 'খেলা শেষ', gameOverText: 'বল হাতছাড়া হয়েছে। চূড়ান্ত স্কোর নিচে।',
      winTitle: '৩টি লেভেলই জয়!', winText: 'দেয়ালের চ্যাম্পিয়ন। বেশি স্কোরের জন্য আবার খেলুন।',
      finalScore: 'চূড়ান্ত স্কোর', howTo: 'কীভাবে খেলবেন',
      how1: 'প্যাডেল নাড়ান: মাউস, টাচ ড্র্যাগ, বা Left / Right অ্যারো কি (A / D-ও চলে)।',
      how2: 'সব ইট ভাঙুন। শক্ত ইটে (গাঢ় কিনারা) ২ বার লাগাতে হয়।',
      how3: 'বল নিচে পড়লে ১টি জীবন কমে। শুরুতে ৩টি জীবন থাকে।',
      how4: 'লেভেল ৩-এর দেয়ালে ফাঁক আছে — কাজে লাগান।',
      soundOn: 'শব্দ: চালু', soundOff: 'শব্দ: বন্ধ',
      langBtn: 'English'
    }
  };

  var STORE_KEY = 'breakout-bd-v1';
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveStore() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* private mode */ }
  }
  var store = loadStore();
  var lang = store.lang === 'bn' ? 'bn' : 'en';
  var soundOn = store.sound !== false;

  var state = {
    phase: 'ready', // ready | playing | paused | levelclear | gameover | win
    level: 1, score: 0, best: store.best || 0, lives: 3,
    paddleX: (L.W - L.PADDLE_W) / 2, bricks: L.createBricks(1),
    ball: null, served: false, keys: {}
  };
  state.ball = L.spawnBall(1, state.paddleX);

  var $ = function (id) { return document.getElementById(id); };
  var overlay = $('overlay'), overlayTitle = $('overlay-title'),
      overlayText = $('overlay-text'), overlayScore = $('overlay-score'),
      btnStart = $('btn-start'), btnPause = $('btn-pause'),
      btnRestart = $('btn-restart'), btnNext = $('btn-next'),
      btnLang = $('btn-lang'), btnSound = $('btn-sound');

  // ---- sound (tiny WebAudio beeps, no files) ----
  var audioCtx = null;
  function beep(freq, ms) {
    if (!soundOn) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      var o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.08, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + ms / 1000);
    } catch (e) { /* audio unavailable */ }
  }

  // ---- i18n ----
  function t(key) { return I18N[lang][key] || I18N.en[key] || key; }
  function fmtNum(n) { return lang === 'bn' ? L.toBengaliDigits(n) : String(n); }
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    btnLang.textContent = t('langBtn');
    btnSound.textContent = soundOn ? t('soundOn') : t('soundOff');
    btnPause.textContent = state.phase === 'paused' ? t('resume') : t('pause');
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    renderHud();
  }

  function renderHud() {
    $('hud-score').textContent = fmtNum(state.score);
    $('hud-best').textContent = fmtNum(state.best);
    $('hud-lives').textContent = fmtNum(state.lives);
    $('hud-level').textContent = fmtNum(state.level);
    $('hud-bricks').textContent = fmtNum(L.remainingBricks(state.bricks));
  }

  // ---- overlays / phases ----
  function showOverlay(titleKey, textKey, showNext, finalScore) {
    overlayTitle.textContent = t(titleKey);
    overlayText.textContent = t(textKey);
    overlayScore.textContent = (finalScore !== null && finalScore !== undefined)
      ? t('finalScore') + ': ' + fmtNum(finalScore) : '';
    overlay.classList.remove('hidden');
    btnNext.classList.toggle('hidden', !showNext);
    btnStart.classList.toggle('hidden', showNext);
  }
  function hideOverlay() { overlay.classList.add('hidden'); }

  function setPhase(p) {
    state.phase = p;
    btnPause.textContent = p === 'paused' ? t('resume') : t('pause');
    btnPause.disabled = !(p === 'playing' || p === 'paused');
    if (p === 'ready') showOverlay('readyTitle', 'readyText', false, null);
    else if (p === 'paused') showOverlay('pausedTitle', 'pausedText', false, null);
    else if (p === 'levelclear') showOverlay('levelClearTitle', 'levelClearText', true, null);
    else if (p === 'gameover') showOverlay('gameOverTitle', 'gameOverText', false, state.score);
    else if (p === 'win') showOverlay('winTitle', 'winText', false, state.score);
    else hideOverlay();
    renderHud();
  }

  function resetGame() {
    state.level = 1; state.score = 0; state.lives = 3;
    state.paddleX = (L.W - L.PADDLE_W) / 2;
    state.bricks = L.createBricks(1);
    state.ball = L.spawnBall(1, state.paddleX);
    state.served = false;
    setPhase('ready');
  }

  function serve() {
    if (state.phase !== 'playing' && state.phase !== 'ready') return;
    state.served = true;
    setPhase('playing');
  }

  function nextLevel() {
    state.level += 1;
    state.paddleX = (L.W - L.PADDLE_W) / 2;
    state.bricks = L.createBricks(state.level);
    state.ball = L.spawnBall(state.level, state.paddleX);
    state.served = false;
    setPhase('ready');
  }

  // ---- rendering ----
  function draw() {
    ctx.fillStyle = '#0f1e2e'; ctx.fillRect(0, 0, L.W, L.H);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    for (var x = 0; x <= L.W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, L.H); ctx.stroke(); }
    state.bricks.forEach(function (b) {
      if (!b.alive) return;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      if (b.maxHp === 2) { ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 3; ctx.strokeRect(b.x + 1.5, b.y + 1.5, b.w - 3, b.h - 3); }
      if (b.hp === 1 && b.maxHp === 2) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(b.x, b.y, b.w, b.h); }
    });
    // paddle
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(state.paddleX, L.PADDLE_Y, L.PADDLE_W, L.PADDLE_H);
    // ball
    ctx.beginPath(); ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    renderHud();
  }

  // ---- game loop ----
  var lastTs = null;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (lastTs === null) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    if (state.phase === 'playing' && state.served) {
      // keyboard paddle: 420 px/s
      var speed = 420;
      if (state.keys.ArrowLeft || state.keys.a || state.keys.A) state.paddleX = L.movePaddle(state.paddleX - speed * dt);
      if (state.keys.ArrowRight || state.keys.d || state.keys.D) state.paddleX = L.movePaddle(state.paddleX + speed * dt);
      var res = L.stepBall(state.ball, dt, state.paddleX, state.bricks);
      state.score += res.score;
      if (res.events.indexOf('paddle') !== -1) beep(220, 60);
      if (res.events.indexOf('brick-destroyed') !== -1) beep(660, 80);
      else if (res.events.indexOf('brick-hit') !== -1) beep(440, 60);
      if (res.lost) {
        beep(140, 200);
        state.lives -= 1;
        if (state.lives <= 0) {
          if (state.score > state.best) { state.best = state.score; store.best = state.best; saveStore(); }
          setPhase('gameover');
        } else {
          state.paddleX = (L.W - L.PADDLE_W) / 2;
          state.ball = L.spawnBall(state.level, state.paddleX);
          state.served = false;
          setPhase('ready');
        }
      } else if (L.isLevelClear(state.bricks)) {
        if (state.score > state.best) { state.best = state.score; store.best = state.best; saveStore(); }
        if (state.level >= 3) setPhase('win');
        else setPhase('levelclear');
      }
    } else if (!state.served) {
      // ball rides the paddle until served
      state.ball.x = state.paddleX + L.PADDLE_W / 2;
      state.ball.y = L.PADDLE_Y - L.BALL_R - 1;
    }
    draw();
  }

  // ---- input ----
  function canvasX(clientX) {
    var rect = canvas.getBoundingClientRect();
    return (clientX - rect.left) * (L.W / rect.width);
  }
  canvas.addEventListener('mousemove', function (e) {
    state.paddleX = L.movePaddle(canvasX(e.clientX) - L.PADDLE_W / 2);
  });
  canvas.addEventListener('touchmove', function (e) {
    e.preventDefault();
    state.paddleX = L.movePaddle(canvasX(e.touches[0].clientX) - L.PADDLE_W / 2);
  }, { passive: false });
  canvas.addEventListener('click', function () {
    if (state.phase === 'ready') serve();
  });
  document.addEventListener('keydown', function (e) {
    state.keys[e.key] = true;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (state.phase === 'ready') serve();
      else if (state.phase === 'playing') setPhase('paused');
      else if (state.phase === 'paused') setPhase('playing');
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') e.preventDefault();
  });
  document.addEventListener('keyup', function (e) { state.keys[e.key] = false; });

  btnStart.addEventListener('click', function () {
    if (state.phase === 'gameover' || state.phase === 'win') resetGame();
    serve();
  });
  btnPause.addEventListener('click', function () {
    if (state.phase === 'playing') setPhase('paused');
    else if (state.phase === 'paused') setPhase('playing');
  });
  btnRestart.addEventListener('click', resetGame);
  btnNext.addEventListener('click', nextLevel);
  btnLang.addEventListener('click', function () {
    lang = lang === 'en' ? 'bn' : 'en';
    store.lang = lang; saveStore(); applyLang();
    if (state.phase === 'ready') showOverlay('readyTitle', 'readyText', false, null);
    else if (state.phase === 'paused') showOverlay('pausedTitle', 'pausedText', false, null);
    else if (state.phase === 'levelclear') showOverlay('levelClearTitle', 'levelClearText', true, null);
    else if (state.phase === 'gameover') showOverlay('gameOverTitle', 'gameOverText', false, state.score);
    else if (state.phase === 'win') showOverlay('winTitle', 'winText', false, state.score);
  });
  btnSound.addEventListener('click', function () {
    soundOn = !soundOn; store.sound = soundOn; saveStore(); applyLang();
  });

  // Test hook for headless smoke tests (not part of gameplay).
  window.__breakout = {
    getState: function () {
      return { phase: state.phase, score: state.score, best: state.best,
        lives: state.lives, level: state.level, served: state.served,
        paddleX: state.paddleX, bricksLeft: L.remainingBricks(state.bricks) };
    }
  };

  applyLang();
  setPhase('ready');
  requestAnimationFrame(loop);
})();
