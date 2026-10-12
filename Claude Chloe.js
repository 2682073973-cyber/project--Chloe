(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const C = 150, R = 78;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const svg = $('s'), whole = $('whole'), cracks = $('cracks'), frags = $('frags'), fx = $('fx'), defs = $('defs');
  const cueG = $('cue'), shaker = $('shaker'), stage = $('stage');
  const cueBox = $('cue-box'), cueMain = $('cue-main'), cueText = $('cue-text'), cueSub = $('cue-sub');
  const t1 = $('t1'), t2 = $('t2'), resetBtn = $('reset');

  let state = 'intact', busy = false, shards = [], pressedFrag = null, wholePress = null, timers = [], anims = [];

  const el = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const later = (fn, ms) => { const t = setTimeout(fn, reduce ? Math.min(ms, 120) : ms); timers.push(t); return t; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dur = ms => reduce ? Math.min(ms, 160) : ms;
  const T = (dx, dy, rot, cx, cy) => `translate(${dx}px,${dy}px) translate(${cx}px,${cy}px) rotate(${rot}deg) translate(${-cx}px,${-cy}px)`;

  function bubbleParts(parent) {
    el('circle', { class: 'body', cx: C, cy: C, r: R }, parent);
    const a0 = 3.55, a1 = 4.35, r = R - 13;
    el('path', { class: 'hl', d: `M${C + r * Math.cos(a0)} ${C + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${C + r * Math.cos(a1)} ${C + r * Math.sin(a1)}` }, parent);
    el('circle', { class: 'spec', cx: C - 30, cy: C - 50, r: 2.4 }, parent);
  }

  function setCue(main, sub, live) {
    cueBox.classList.add('swap');
    later(() => {
      cueText.textContent = main; cueSub.textContent = sub;
      cueMain.classList.toggle('live', !!live);
      cueBox.classList.remove('swap');
    }, 180);
  }

  function setTrack(s) {
    t1.className = s === 'intact' ? 'on' : 'done';
    t2.className = s === 'cracked' ? 'on' : (s === 'gone' || s === 'releasing') ? 'done' : '';
  }

  function toLocal(ev) {
    const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
    const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: C, y: C };
  }

  function ripple(x, y, big) {
    const to = big ? 46 : 24;
    const c = el('circle', { class: 'ripple', cx: x, cy: y, r: to, 'vector-effect': 'non-scaling-stroke' }, fx);
    c.style.transformBox = 'fill-box'; c.style.transformOrigin = 'center';
    const a = c.animate([{ transform: 'scale(.08)', opacity: .6 }, { transform: 'scale(1)', opacity: 0 }], { duration: dur(620), easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
    a.onfinish = () => c.remove();
  }

  /* ---------- geometry ---------- */
  function makeShards(px, py) {
    const p = { x: px - C, y: py - C };
    const n = 7, step = Math.PI * 2 / n, base = Math.random() * Math.PI * 2;
    const rays = [];
    for (let i = 0; i < n; i++) {
      const a = base + i * step + rnd(-.32, .32) * step;
      const d = { x: Math.cos(a), y: Math.sin(a) }, perp = { x: -d.y, y: d.x };
      const pd = p.x * d.x + p.y * d.y, pp = p.x * p.x + p.y * p.y;
      const t = -pd + Math.sqrt(pd * pd - (pp - R * R));
      const pts = [{ x: p.x, y: p.y }];
      [.3, .62].forEach(f => { const j = rnd(-5, 5); pts.push({ x: p.x + d.x * t * f + perp.x * j, y: p.y + d.y * t * f + perp.y * j }); });
      const hit = { x: p.x + d.x * t, y: p.y + d.y * t };
      pts.push(hit);
      rays.push({ pts, hit, ang: Math.atan2(hit.y, hit.x), d, t });
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const A = rays[i], B = rays[(i + 1) % n];
      let a0 = A.ang, a1 = B.ang; while (a1 <= a0) a1 += Math.PI * 2;
      const poly = [...A.pts];
      const steps = Math.max(2, Math.ceil((a1 - a0) / .1));
      for (let k = 1; k < steps; k++) { const a = a0 + (a1 - a0) * k / steps; poly.push({ x: R * Math.cos(a), y: R * Math.sin(a) }); }
      poly.push(...[...B.pts].reverse().slice(0, -1));
      let cx = 0, cy = 0; poly.forEach(q => { cx += q.x; cy += q.y; }); cx /= poly.length; cy /= poly.length;
      let dx = cx - p.x, dy = cy - p.y; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const push = rnd(3, 7);
      out.push({ poly: poly.map(q => ({ x: q.x + C, y: q.y + C })), cx: cx + C, cy: cy + C, dx, dy, bx: dx * push, by: dy * push, rot: rnd(-4, 4) });
    }
    return { rays, out, p };
  }

  /* ---------- states ---------- */
  function reset() {
    timers.forEach(clearTimeout); timers = [];
    anims.forEach(a => { try { a.cancel(); } catch (e) {} }); anims = [];
    whole.innerHTML = ''; cracks.innerHTML = ''; frags.innerHTML = ''; fx.innerHTML = '';
    defs.querySelectorAll('.fc').forEach(n => n.remove());
    bubbleParts(whole);
    whole.removeAttribute('hidden'); whole.classList.remove('pressed');
    shards = []; pressedFrag = null; wholePress = null; busy = false; state = 'intact';
    cueG.classList.add('cue1'); svg.classList.remove('cue2');
    resetBtn.classList.remove('call');
    whole.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: dur(520), easing: 'cubic-bezier(.2,1.4,.4,1)' });
    setTrack('intact');
    setCue('Tap the bubble.', 'One touch and it breaks. Go gently.', true);
  }

  function crack(x, y) {
    if (state !== 'intact' || busy) return;
    busy = true; state = 'cracking';
    cueG.classList.remove('cue1');
    setCue('Cracking…', 'The surface gives way from where you touched.', false);
    ripple(x, y, false);

    // keep the impact point inside the bubble
    let px = x - C, py = y - C; const L = Math.hypot(px, py), max = R * .55;
    if (L > max) { px = px / L * max; py = py / L * max; }
    const g = makeShards(px + C, py + C);

    // draw cracks over the intact bubble
    const ip = { x: g.p.x + C, y: g.p.y + C };
    const ring = []; for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, r = rnd(4, 8); ring.push(`${ip.x + r * Math.cos(a)} ${ip.y + r * Math.sin(a)}`); }
    const ringPath = el('path', { class: 'crack', d: 'M' + ring.join(' L') + ' Z', pathLength: 1 }, cracks);
    anims.push(ringPath.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur(140), fill: 'forwards' }));
    g.rays.forEach((ray, i) => {
      const d = 'M' + ray.pts.map(q => `${q.x + C} ${q.y + C}`).join(' L');
      const path = el('path', { class: 'crack', d, pathLength: 1 }, cracks);
      anims.push(path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur(240), delay: reduce ? 0 : 60 + i * 34, fill: 'forwards', easing: 'cubic-bezier(.5,0,.2,1)' }));
      if (i % 2 === 0) { // small branch off the middle
        const m = ray.pts[1], b = Math.atan2(ray.d.y, ray.d.x) + (Math.random() < .5 ? -1 : 1) * rnd(.5, .9), bl = rnd(9, 16);
        const bp = el('path', { class: 'crack', d: `M${m.x + C} ${m.y + C} L${m.x + C + Math.cos(b) * bl} ${m.y + C + Math.sin(b) * bl}`, pathLength: 1 }, cracks);
        anims.push(bp.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: dur(160), delay: reduce ? 0 : 220 + i * 34, fill: 'forwards' }));
      }
    });
    if (!reduce) shaker.animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-2px,1px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(-1px,0)' }, { transform: 'translate(0,0)' }], { duration: 260, delay: 120 });

    later(() => split(g), 520);
  }

  function split(g) {
    whole.setAttribute('hidden', '');
    cracks.innerHTML = '';
    shards = g.out.map((s, i) => {
      const cp = el('clipPath', { id: 'fc' + i, class: 'fc' }, defs);
      const pts = s.poly.map(q => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ');
      el('polygon', { points: pts }, cp);
      const fg = el('g', { class: 'frag', 'clip-path': `url(#fc${i})`, tabindex: 0, role: 'button', 'aria-label': `Fragment ${i + 1}. Tap to let the pieces go.` }, frags);
      bubbleParts(fg);
      el('polygon', { class: 'edge', points: pts }, fg);
      s.node = fg; s.i = i;
      const a = fg.animate([{ transform: T(0, 0, 0, s.cx, s.cy) }, { transform: T(s.bx, s.by, s.rot, s.cx, s.cy) }], { duration: dur(560), easing: 'cubic-bezier(.2,1.5,.4,1)', fill: 'forwards' });
      anims.push(a);
      return s;
    });
    later(() => {
      state = 'cracked'; busy = false;
      svg.classList.add('cue2');
      setTrack('cracked');
      setCue('Tap a fragment.', 'Every broken piece will go with it.', true);
      shards.forEach(tremble);
    }, 560);
  }

  function tremble(s) {
    if (reduce) return;
    const k = [];
    for (let i = 0; i < 6; i++) { const j = i % 3 === 0 ? 0 : .7; k.push({ transform: T(s.bx + rnd(-j, j), s.by + rnd(-j, j), s.rot + rnd(-.6, .6), s.cx, s.cy) }); }
    k.push(k[0]);
    s.tr = s.node.animate(k, { duration: rnd(1400, 2200), iterations: Infinity, easing: 'ease-in-out' });
    anims.push(s.tr);
  }

  function release(origin, x, y) {
    if (state !== 'cracked' || busy) return;
    busy = true; state = 'releasing';
    svg.classList.remove('cue2');
    setTrack('releasing');
    setCue('Letting go…', 'The pieces dissolve outward from your touch.', false);
    ripple(x, y, true);
    shards.forEach(s => {
      if (s.tr) s.tr.cancel();
      const dist = Math.hypot(s.cx - origin.cx, s.cy - origin.cy);
      const delay = reduce ? 0 : (s === origin ? 0 : 90 + dist * 3.2);
      const base = T(s.bx, s.by, s.rot, s.cx, s.cy);
      const mid = T(s.bx + s.dx * 10, s.by + s.dy * 10 - 4, s.rot * 2, s.cx, s.cy);
      const end = T(s.bx + s.dx * 30, s.by + s.dy * 22 + 70, s.rot * 9 + rnd(-20, 20), s.cx, s.cy);
      if (s === origin && !reduce) {
        anims.push(s.node.querySelector('.edge').animate([{ strokeWidth: 1.2 }, { strokeWidth: 3 }, { strokeWidth: 1.2 }], { duration: 260 }));
      }
      const a = s.node.animate([
        { transform: base, opacity: 1, filter: 'blur(0px)' },
        { transform: mid, opacity: .85, filter: 'blur(0px)', offset: .25 },
        { transform: end, opacity: 0, filter: 'blur(2.5px)' }
      ], { duration: dur(980), delay, easing: 'cubic-bezier(.4,0,.7,.6)', fill: 'forwards' });
      anims.push(a);
      if (!reduce) for (let d = 0; d < 3; d++) dust(s, delay);
    });
    const longest = reduce ? 200 : 90 + 160 * 3.2 + 980;
    later(done, longest);
  }

  function dust(s, delay) {
    const q = s.poly[Math.floor(Math.random() * s.poly.length)];
    const c = el('circle', { class: 'dust', cx: q.x, cy: q.y, r: rnd(.6, 1.4) }, fx);
    const a = c.animate([
      { transform: 'translate(0,0)', opacity: .7 },
      { transform: `translate(${s.dx * rnd(10, 30)}px, ${rnd(40, 90)}px)`, opacity: 0 }
    ], { duration: rnd(700, 1200), delay: delay + rnd(0, 200), easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'both' });
    a.onfinish = () => c.remove();
    anims.push(a);
  }

  function done() {
    state = 'gone'; busy = false;
    frags.innerHTML = ''; defs.querySelectorAll('.fc').forEach(n => n.remove());
    setTrack('gone');
    setCue('Nothing left.', 'Reset to blow a new bubble.', false);
    resetBtn.classList.add('call');
  }

  function nudge(x, y) {
    ripple(x, y, false);
    if (state === 'cracked') {
      cueSub.textContent = 'Tap one of the broken pieces, not the space around them.';
      if (!reduce) shards.forEach(s => s.node.animate([{ opacity: 1 }, { opacity: .55 }, { opacity: 1 }], { duration: 360 }));
    } else if (state === 'intact') {
      cueSub.textContent = 'Tap the bubble itself.';
    }
  }

  /* ---------- input ---------- */
  stage.addEventListener('pointerdown', ev => {
    if (busy) return;
    const p = toLocal(ev);
    const fragNode = ev.target.closest && ev.target.closest('.frag');
    if (state === 'intact' && ev.target.closest && ev.target.closest('#whole')) {
      wholePress = p; whole.classList.add('pressed');
    } else if (state === 'cracked' && fragNode) {
      pressedFrag = { s: shards.find(s => s.node === fragNode), p }; fragNode.classList.add('pressed');
    } else if (state === 'intact' || state === 'cracked') {
      nudge(p.x, p.y);
    }
  });
  const endPress = ev => {
    if (wholePress) {
      const p = wholePress; wholePress = null; whole.classList.remove('pressed');
      if (ev.type === 'pointerup') crack(p.x, p.y);
    }
    if (pressedFrag) {
      const { s, p } = pressedFrag; pressedFrag = null; s.node.classList.remove('pressed');
      if (ev.type === 'pointerup') release(s, p.x, p.y);
    }
  };
  window.addEventListener('pointerup', endPress);
  window.addEventListener('pointercancel', endPress);

  // keyboard
  svg.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    if (ev.target === whole) crack(C + rnd(-20, 20), C + rnd(-20, 20));
    const f = ev.target.closest && ev.target.closest('.frag');
    if (f) { const s = shards.find(s => s.node === f); if (s) release(s, s.cx, s.cy); }
  });

  resetBtn.addEventListener('click', reset);
  document.addEventListener('gesturestart', e => e.preventDefault());
  reset();
})();
