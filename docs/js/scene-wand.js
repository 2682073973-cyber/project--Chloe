/* Scene 1 — Slime Wand (from study 01). Steps: Hold → Shake.
   Physics, cues and timings are the study's. Changes for the sequence:
   - fixed 390×844 frame coordinates (pointer positions are converted from the scaled frame)
   - completion: GOAL direction changes while gripping (the study had no end state)
   - after completion the wand eases down and shrinks into the blowing position used by scene 2 */
(() => {
  const cv = document.getElementById('wandCanvas'), cx = cv.getContext('2d');
  const reduce = Seq.reduce;
  const W = 390, H = 844, GOAL = 6, N = 28;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const col = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  let active = false, raf = 0, last = 0, handed = false;
  const S = { x: W / 2, tx: W / 2, vx: 0, _pv: 0, prevX: 0, phase: 'idle', hold: 0, holding: false, dragging: false, kb: false, lit: 0,
    ox: 0, oy: 0, ovx: 0, ovy: 0, r: new Float32Array(N), rv: new Float32Array(N), drip: 0, dripV: 0, wobble: 0, shakes: 0, lastDir: 0,
    t: 0, px: 0, grab: 0, hand: 0, handT0: 0 };

  function size() { const dpr = Math.min(devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }

  // Study geometry (R 68) blended toward scene 2's wand (loop r 27 at y 560, handle to y 730) by S.hand.
  function geom() {
    const h = ease(S.hand), R = lerp(68, 27, h), ry = lerp(H * .36, 560, h);
    return { R, ry, hy: ry + R, he: lerp(H * .36 + 68 + 190, 730, h), h };
  }
  function hit(px, py) { const g = geom(), dx = px - S.x; return (Math.hypot(dx, py - g.ry) < g.R + 22) || (Math.abs(dx) < 26 && py > g.hy - 10 && py < g.he + 16); }
  function local(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }

  const MSG = { idle: 'Press and hold the wand', holding: 'Keep holding…', armed: 'Now drag left and right', shaking: 'Shake it — keep holding', loaded: 'The film is loaded.' };
  const count = () => `${S.shakes} of ${GOAL} shakes`;
  function sub(p) {
    if (p === 'idle') return S.shakes ? count() + ' — grip it again to keep going.' : 'The ring is coated in slime.';
    if (p === 'holding') return 'Get a grip on the handle.';
    if (p === 'armed') return `Shake it ${GOAL} times to load the film.`;
    if (p === 'shaking') return count();
    return 'Get ready to blow.';
  }
  function progress() {
    const p = S.phase;
    if (p === 'idle' || p === 'holding') Seq.step(0, S.hold || undefined);
    else if (p === 'loaded') Seq.step(1, 1);
    else Seq.step(1, S.shakes / GOAL);
  }
  function setPhase(p) { S.phase = p; progress(); Seq.cue(MSG[p], sub(p)); }

  /* ---------- input ---------- */
  function grab(px) { S.holding = true; S.hold = 0; S.px = px; S.grab = px - S.x; S.prevX = S.x; setPhase('holding'); }
  cv.addEventListener('pointerdown', e => {
    if (!active || S.phase === 'loaded') return;
    const [px, py] = local(e);
    if (!hit(px, py)) return;
    cv.setPointerCapture(e.pointerId); grab(px);
  });
  cv.addEventListener('pointermove', e => {
    if (!S.holding || S.kb) return;
    S.px = local(e)[0];
    if (S.phase === 'armed' || S.phase === 'shaking') { S.dragging = true; cv.classList.add('drag'); }
  });
  function up() { if (!S.holding) return; S.holding = false; S.dragging = false; S.kb = false; S.hold = 0; cv.classList.remove('drag'); S.tx = W / 2; setPhase('idle'); }
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up); cv.addEventListener('lostpointercapture', up);

  // Keyboard: hold Space/Enter to grip, Left/Right arrows to shake.
  cv.addEventListener('keydown', e => {
    if (!active || S.phase === 'loaded') return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat && !S.holding) { S.kb = true; grab(S.x); } return; }
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && S.kb && (S.phase === 'armed' || S.phase === 'shaking')) {
      e.preventDefault(); S.dragging = true; S.grab = 0; S.px = W / 2 + (e.key === 'ArrowLeft' ? -80 : 80);
    }
  });
  cv.addEventListener('keyup', e => { if ((e.key === ' ' || e.key === 'Enter') && S.kb) { e.preventDefault(); up(); } });

  function complete() {
    S.holding = false; S.dragging = false; S.kb = false; cv.classList.remove('drag'); S.tx = W / 2;
    setPhase('loaded');
    S.handT0 = performance.now() + (reduce ? 100 : 700);
  }

  /* ---------- loop ---------- */
  function step(now) {
    const dt = Math.min((now - last) / 1000, 1 / 30); last = now; S.t += dt;
    // hold → arm
    if (S.phase === 'holding') { S.hold = Math.min(1, S.hold + dt / 0.6); Seq.step(0, S.hold); if (S.hold >= 1) setPhase('armed'); }
    const litT = (S.phase === 'armed' || S.phase === 'shaking' || S.phase === 'loaded') ? 1 : S.phase === 'holding' ? S.hold * .4 : 0;
    S.lit += (litT - S.lit) * Math.min(1, dt * 12);
    // hand-off to the blowing position
    if (S.phase === 'loaded' && S.handT0 && now >= S.handT0) {
      S.hand = Math.min(1, (now - S.handT0) / (reduce ? 250 : 1100));
      if (S.hand >= 1 && !handed) { handed = true; Seq.done('wand'); }
    }
    // wand position
    const g = geom();
    if (S.dragging) S.tx = Math.max(g.R + 18, Math.min(W - g.R - 18, S.px - S.grab));
    const prev = S.x;
    S.x += (S.tx - S.x) * Math.min(1, dt * (S.dragging ? 22 : 6));
    S.vx = (S.x - prev) / dt;
    const acc = (S.vx - S._pv) / dt; S._pv = S.vx;
    // shake detection
    if (S.dragging && Math.abs(S.vx) > 120) {
      const d = Math.sign(S.vx);
      if (d !== S.lastDir) {
        S.lastDir = d; S.shakes++;
        if (S.phase === 'armed') setPhase('shaking'); else { progress(); Seq.cue(null, sub('shaking')); }
        if (S.shakes >= GOAL) complete();
      }
    }
    // film offset spring (lags behind motion)
    const k = 90, damp = 4.2;
    S.ovx += (-k * S.ox - damp * S.ovx - acc * 0.018) * dt; S.ox += S.ovx * dt;
    S.ovy += (-k * S.oy - damp * S.ovy + Math.abs(acc) * 0.004) * dt; S.oy += S.ovy * dt;
    S.ox = Math.max(-g.R * .6, Math.min(g.R * .6, S.ox)); S.oy = Math.max(-g.R * .4, Math.min(g.R * .5, S.oy));
    // rim ripples
    const kick = Math.min(Math.abs(acc) * 0.00025, 3);
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2;
      S.rv[i] += (-160 * S.r[i] - 3 * S.rv[i] + (S.r[(i + 1) % N] + S.r[(i + N - 1) % N] - 2 * S.r[i]) * 120 + Math.cos(a) * -Math.sign(acc) * kick * 40) * dt;
    }
    for (let i = 0; i < N; i++) { S.r[i] += S.rv[i] * dt; S.r[i] = Math.max(-.35, Math.min(.35, S.r[i])); }
    // drip
    S.dripV += (-50 * S.drip - 2.5 * S.dripV + Math.abs(S.vx) * 0.03) * dt; S.drip += S.dripV * dt; S.drip = Math.max(0, Math.min(1.6, S.drip));
    const energy = Math.hypot(S.ox, S.oy) / g.R * 2 + S.r.reduce((m, v) => m + Math.abs(v), 0) / N * 4;
    S.wobble += (energy - S.wobble) * Math.min(1, dt * 6);
    draw(g);
  }
  function loop(now) { if (!raf) return; step(now); raf = requestAnimationFrame(loop); }

  function draw(g) {
    const ink = col('--ink'), muted = col('--muted'), line = col('--line'), film = col('--film'), surf = col('--surface');
    cx.clearRect(0, 0, W, H);
    const { R, ry, hy, he, h } = g, x = S.x, sc = R / 68;
    // floor shadow
    cx.fillStyle = line; cx.globalAlpha = .6 * (1 - h); cx.beginPath(); cx.ellipse(x, he + 34, 30 + S.lit * 6, 5, 0, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;

    // ===== CUES =====
    const pulse = reduce ? .5 : (Math.sin(S.t * 3.2) + 1) / 2;
    if (S.phase === 'idle') { // press-and-hold cue on the handle
      const cy = (hy + he) / 2 + 20;
      cx.strokeStyle = muted; cx.lineWidth = 1.5; cx.setLineDash([3, 5]);
      cx.beginPath(); cx.arc(x, cy, 30 + pulse * 10, 0, Math.PI * 2); cx.stroke(); cx.setLineDash([]);
      cx.fillStyle = muted; cx.globalAlpha = .25 + pulse * .25; cx.beginPath(); cx.arc(x, cy, 12, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;
      label('PRESS & HOLD', x, he + 66, muted);
    }
    if (S.phase === 'holding') { // filling hold ring
      const cy = (hy + he) / 2 + 20;
      cx.strokeStyle = line; cx.lineWidth = 3; cx.beginPath(); cx.arc(x, cy, 34, 0, Math.PI * 2); cx.stroke();
      cx.strokeStyle = ink; cx.beginPath(); cx.arc(x, cy, 34, -Math.PI / 2, -Math.PI / 2 + S.hold * Math.PI * 2); cx.stroke();
      label('HOLDING', x, he + 66, ink);
    }
    if (S.phase === 'armed') { // drag cue: chevrons both sides
      const off = R + 34 + pulse * 8;
      cx.strokeStyle = muted; cx.lineWidth = 2; cx.lineCap = 'round';
      for (const d of [-1, 1]) for (let j = 0; j < 2; j++) { const ax = x + d * (off + j * 12); cx.globalAlpha = j ? .4 : .9; cx.beginPath(); cx.moveTo(ax - d * 5, ry - 8); cx.lineTo(ax + d * 2, ry); cx.lineTo(ax - d * 5, ry + 8); cx.stroke(); }
      cx.globalAlpha = 1; label('DRAG ← →', x, he + 66, muted);
    }
    if (S.phase === 'shaking') { // speed trails + counter
      const n = Math.min(5, Math.abs(S.vx) / 180 | 0); cx.strokeStyle = muted; cx.lineWidth = 1.5; cx.lineCap = 'round';
      for (let i = 0; i < n; i++) { const yy = ry - R * .6 + i * R * .3, dir = -Math.sign(S.vx); cx.globalAlpha = .5 - i * .07; cx.beginPath(); cx.moveTo(x + dir * (R + 12), yy); cx.lineTo(x + dir * (R + 12 + Math.abs(S.vx) * .05), yy); cx.stroke(); }
      cx.globalAlpha = 1; label('SHAKE ' + String(S.shakes).padStart(2, '0') + ' / ' + String(GOAL).padStart(2, '0'), x, he + 66, ink);
    }
    if (S.phase === 'armed' || S.phase === 'shaking') label('WOBBLE ' + String(Math.min(99, Math.round(S.wobble * 60))).padStart(2, '0'), x, he + 86, muted);

    // ===== WAND =====
    if (S.lit > .01 && h < 1) { // highlight halo
      cx.strokeStyle = ink; cx.globalAlpha = S.lit * .18 * (1 - h); cx.lineWidth = 18 * sc; cx.lineCap = 'round';
      cx.beginPath(); cx.arc(x, ry, R, 0, Math.PI * 2); cx.moveTo(x, hy); cx.lineTo(x, he); cx.stroke(); cx.globalAlpha = 1;
    }
    const tilt = Math.max(-.12, Math.min(.12, -S.vx * 0.00012));
    cx.save(); cx.translate(x, he); cx.rotate(tilt); cx.translate(-x, -he);
    const strokeC = S.lit > .5 ? ink : muted;
    // handle
    cx.strokeStyle = strokeC; cx.lineWidth = lerp(7, 2, h); cx.lineCap = 'round';
    cx.beginPath(); cx.moveTo(x, hy + 4 * (1 - h)); cx.lineTo(x, he); cx.stroke();
    // grip
    if (h < 1) { cx.fillStyle = strokeC; cx.globalAlpha = 1 - h; roundRect(x - 7, he - 46, 14, 46, 7); cx.fill(); cx.globalAlpha = 1; }

    // film (slime membrane)
    const fx = x + S.ox * .6, fy = ry + S.oy * .5;
    cx.beginPath();
    for (let i = 0; i <= N; i++) {
      const k = i % N, a = k / N * Math.PI * 2;
      const sag = Math.max(0, Math.sin(a)) * S.oy * .04;
      const rr = R * (0.96 + S.r[k] + sag);
      const px = x + Math.cos(a) * rr + S.ox * (1 - Math.abs(Math.cos(a))) * .35, py = ry + Math.sin(a) * rr * (1 + S.oy * .004);
      i ? cx.lineTo(px, py) : cx.moveTo(px, py);
    }
    cx.closePath();
    const gr = cx.createRadialGradient(fx - R * .3, fy - R * .35, R * .05, fx, fy, R * 1.1);
    gr.addColorStop(0, surf); gr.addColorStop(.55, film); gr.addColorStop(1, film);
    cx.globalAlpha = .32 + S.lit * .12; cx.fillStyle = gr; cx.fill(); cx.globalAlpha = .55; cx.strokeStyle = film; cx.lineWidth = 1; cx.stroke(); cx.globalAlpha = 1;
    // glossy highlight
    cx.fillStyle = surf; cx.globalAlpha = .75; cx.beginPath(); cx.ellipse(fx - R * .32, fy - R * .36, R * .18, R * .08, -.6, 0, Math.PI * 2); cx.fill(); cx.globalAlpha = 1;

    // drip at bottom of ring
    const ds = 1 - h * .7, dl = (6 + S.drip * 26) * ds, dxo = -S.vx * 0.012;
    cx.fillStyle = film; cx.globalAlpha = .6; cx.beginPath();
    cx.moveTo(x - 7 * ds, ry + R - 1); cx.quadraticCurveTo(x + dxo * .5 - 4 * ds, ry + R + dl * .6, x + dxo - 5 * ds, ry + R + dl);
    cx.arc(x + dxo, ry + R + dl, (5 + S.drip * 1.5) * ds, Math.PI, 0, true);
    cx.quadraticCurveTo(x + dxo * .5 + 4 * ds, ry + R + dl * .6, x + 7 * ds, ry + R - 1); cx.fill(); cx.globalAlpha = 1;

    // ring
    cx.strokeStyle = strokeC; cx.lineWidth = lerp(6, 2, h); cx.beginPath(); cx.arc(x, ry, R, 0, Math.PI * 2); cx.stroke();
    cx.restore();
  }
  function label(t, x, y, c) { cx.font = '11px "Fragment Mono",ui-monospace,monospace'; cx.textAlign = 'center'; cx.fillStyle = c; cx.fillText(t.split('').join(String.fromCharCode(8202)), x, y); }
  function roundRect(x, y, w, h, r) { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); }

  size();
  Seq.register('wand', {
    start() {
      active = true; cv.classList.remove('gone'); cv.style.pointerEvents = 'auto';
      setPhase('idle');
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
    },
    stop() {
      active = false; cv.classList.add('gone');
      if (document.activeElement === cv) cv.blur();
      setTimeout(() => { if (!active) { cancelAnimationFrame(raf); raf = 0; } }, 500);
    },
    reset() {
      Object.assign(S, { x: W / 2, tx: W / 2, vx: 0, _pv: 0, ox: 0, oy: 0, ovx: 0, ovy: 0, drip: 0, dripV: 0, wobble: 0, shakes: 0,
        hold: 0, lit: 0, lastDir: 0, holding: false, dragging: false, kb: false, hand: 0, handT0: 0, phase: 'idle' });
      S.r.fill(0); S.rv.fill(0); handed = false; cv.classList.remove('drag');
    }
  });
})();
