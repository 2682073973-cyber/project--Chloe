/* Scene 2 — Bubble Release (from study 02). Steps: Blow (hold the wand, let go) → Lift (swipe the bubble up).
   The Component class is the study's state machine and values, with these changes for the sequence:
   - copy and progress go to the shared rail/footer (Seq) instead of the artboard's own
   - lifting no longer drifts off the top: the bubble stays put and lift() runs the camera move —
     the world (wand) pans down out of view while the bubble rises, settles at the centre and grows
     to the size of scene 3's bubble, which then takes over. */
(() => {
  const $ = id => document.getElementById(id);
  const reduce = Seq.reduce;
  const el = {
    world: $('world'), sky: $('sky'), layer: $('bubbleLayer'), threshold: $('threshold'), swipeCue: $('swipeCue'),
    pressCue: $('pressCue'), wand: $('wand'), film: $('film'), bubble: $('bubble'), skin: $('bubbleSkin'), canvas: $('wandCanvas')
  };
  const REST = 400, THRESH = 70;
  const FRAG_D = 340 * 156 / 300; // scene 3 bubble diameter on screen (r 78 in a 300 viewBox drawn 340px wide)
  let active = false, anims = [];

  class Component {
    constructor(onRender) { this.state = { phase: 'idle', p: 0, dy: 0 }; this._onRender = onRender; }
    setState(patch) { this.state = Object.assign({}, this.state, patch); this._onRender(this.renderVals()); }
    ph() { return (this.state && this.state.phase) || 'idle'; }
    startPress(e) {
      if (this.ph() !== 'idle') return;
      try { if (e && e.currentTarget && e.pointerId != null) e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
      this._t0 = performance.now();
      this.setState({ phase: 'pressing', p: 0 });
      const loop = () => {
        if (this.ph() !== 'pressing') return;
        const p = Math.min(1, (performance.now() - this._t0) / 1400);
        this.setState({ p: p });
        if (p < 1) this._raf = requestAnimationFrame(loop);
      };
      this._raf = requestAnimationFrame(loop);
    }
    endPress() {
      if (this.ph() !== 'pressing') return;
      if (this._raf) cancelAnimationFrame(this._raf);
      const p = Math.max((this.state && this.state.p) || 0, 0.45);
      this.setState({ phase: 'released', p: p, dy: 0 });
    }
    floatUp() {
      this.setState({ phase: 'floating' }); // keeps dy: the bubble lifts from where it was let go
      lift(this.state.dy || 0, this.state.p);
    }
    reset() {
      if (this._raf) cancelAnimationFrame(this._raf);
      this.setState({ phase: 'idle', p: 0, dy: 0 });
    }
    renderVals() {
      const s = this.state || {};
      const phase = this.ph();
      const p = s.p || 0;
      const dy = s.dy || 0;

      let d = 36 + 84 * p;
      let cx = 195, cy = 560, op = 1, sx = 1, sy = 1, trans = 'none';
      if (phase === 'idle') { d = 30; op = 0; }
      if (phase === 'pressing') { cy = 560 - Math.max(0, d / 2 - 18); trans = 'width 90ms linear, height 90ms linear, top 90ms linear, left 90ms linear'; }
      if (phase === 'released') { cy = REST; trans = 'top 1100ms cubic-bezier(.34,1.45,.64,1), left 1100ms ease, transform 500ms ease'; }
      if (phase === 'dragging') {
        cy = REST + dy;
        sy = 1 + Math.min(0.1, Math.max(0, -dy) / 1500);
        sx = 1 - (sy - 1) * 0.6;
        trans = 'transform 120ms ease';
      }
      if (phase === 'floating') { cy = REST + dy; trans = 'transform 600ms ease'; }

      const past = phase === 'dragging' && dy <= -THRESH;
      const dRel = 36 + 84 * p;
      return {
        bLeft: (cx - d / 2).toFixed(1),
        bTop: (cy - d / 2).toFixed(1),
        d: d.toFixed(1),
        bOpacity: op,
        sx: sx.toFixed(3),
        sy: sy.toFixed(3),
        bTrans: trans,
        bPE: (phase === 'released' || phase === 'dragging') ? 'auto' : 'none',
        bCursor: phase === 'dragging' ? 'grabbing' : 'grab',
        bubbleDisabled: !(phase === 'released' || phase === 'dragging'),
        breatheClass: phase === 'released' ? 'breathe' : '',

        wandDisabled: !(phase === 'idle' || phase === 'pressing'),
        wandCursor: (phase === 'idle' || phase === 'pressing') ? 'pointer' : 'default',
        wandRot: phase === 'pressing' ? -5 : 0,
        wandTrans: phase === 'pressing' ? 'transform 300ms ease' : 'transform 800ms cubic-bezier(.34,1.9,.64,1)',
        filmOpacity: phase === 'idle' ? 0.9 : 0,

        showPressCue: phase === 'idle',
        showSwipeCue: phase === 'released',
        chevTop: (REST - dRel / 2 - 52).toFixed(1),
        showThreshold: phase === 'dragging',
        threshTop: (REST - dRel / 2 - THRESH).toFixed(1),
        threshColor: past ? 'var(--ink)' : 'var(--line)',

        wandDown: (e) => this.startPress(e),
        wandUp: () => this.endPress(),
        wandKeyDown: (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); this.startPress(null); } },
        wandKeyUp: (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.endPress(); } },
        bubbleDown: (e) => {
          if (this.ph() !== 'released') return;
          try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
          this._y0 = e.clientY;
          this.setState({ phase: 'dragging', dy: 0 });
        },
        bubbleMove: (e) => {
          if (this.ph() !== 'dragging') return;
          const raw = (e.clientY - this._y0) / Seq.scale(); // screen px → frame px
          const v = raw < 0 ? -Math.min(200, Math.pow(-raw, 0.92)) : Math.min(20, raw * 0.25);
          this.setState({ dy: v });
        },
        bubbleUp: () => {
          if (this.ph() !== 'dragging') return;
          if (((this.state && this.state.dy) || 0) <= -THRESH) this.floatUp();
          else this.setState({ phase: 'released', dy: 0 });
        },
        bubbleKey: (e) => {
          if (this.ph() !== 'released') return;
          if (e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.floatUp(); }
        }
      };
    }
  }

  /* ---------- binding ---------- */
  let v = null, lastPhase = null;
  function render(vals) {
    v = vals;
    const ph = c.ph();
    el.wand.hidden = !active; el.bubble.hidden = !active;
    el.threshold.hidden = !(active && v.showThreshold);
    el.threshold.style.top = v.threshTop + 'px';
    el.threshold.style.borderTopColor = v.threshColor;
    el.swipeCue.hidden = !(active && v.showSwipeCue);
    el.swipeCue.style.top = v.chevTop + 'px';
    el.pressCue.hidden = !(active && v.showPressCue);

    el.wand.disabled = v.wandDisabled;
    el.wand.style.cursor = v.wandCursor;
    el.wand.style.transition = v.wandTrans;
    el.wand.style.transform = `rotate(${v.wandRot}deg)`;
    el.film.setAttribute('fill-opacity', v.filmOpacity);

    const b = el.bubble.style;
    b.transition = v.bTrans;
    b.left = v.bLeft + 'px'; b.top = v.bTop + 'px';
    b.width = v.d + 'px'; b.height = v.d + 'px';
    b.opacity = v.bOpacity;
    b.transform = `scale(${v.sx}, ${v.sy})`;
    b.pointerEvents = v.bPE; b.cursor = v.bCursor;
    el.bubble.disabled = v.bubbleDisabled;
    el.skin.className = v.breatheClass;

    if (!active) return;
    // keyboard focus follows the action
    if (ph === 'released' && lastPhase === 'pressing' && document.activeElement === el.wand) el.bubble.focus({ preventScroll: true });
    lastPhase = ph;

    const p = c.state.p, dy = c.state.dy;
    if (ph === 'idle') { Seq.step(2); Seq.cue('Hold the wand, then let go', 'Breathe the film into a bubble.'); }
    else if (ph === 'pressing') { Seq.step(2, p); Seq.cue(p < 0.35 ? 'Filling the bubble…' : 'Let go to release', 'The longer you hold, the bigger it grows.'); }
    else if (ph === 'released') { Seq.step(3); Seq.cue('Swipe up on the bubble', 'Push it past the dashed line.'); }
    else if (ph === 'dragging') { Seq.step(3, Math.min(1, -dy / THRESH)); Seq.cue(dy <= -THRESH ? 'Let go to lift' : 'A little higher', 'Push it past the dashed line.'); }
    else if (ph === 'floating') { Seq.step(3, 1); Seq.cue('Floating up…', 'Follow it.'); }
  }

  // Camera follows the bubble up. On finish, scene 3 takes over at the same place and size.
  function lift(dy0, p) {
    const d = 36 + 84 * p, k = FRAG_D / d, cy0 = REST + dy0, toCentre = REST - cy0;
    const T = reduce ? 700 : 3800, ez = 'cubic-bezier(.45,0,.25,1)';
    el.layer.style.transformOrigin = `195px ${cy0}px`;
    anims.push(el.world.animate([
      { transform: 'translateY(0)' }, { transform: 'translateY(0)', offset: .1 }, { transform: 'translateY(820px)' }
    ], { duration: T, easing: ez, fill: 'forwards' }));
    anims.push(el.sky.animate([
      { transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: .25 }, { opacity: 1, offset: .8 }, { transform: 'translateY(420px)', opacity: 0 }
    ], { duration: T, easing: ez, fill: 'forwards' }));
    const a = el.layer.animate([
      { transform: 'translate(0px,0px) scale(1)' },
      { transform: `translate(8px,-90px) scale(${1 + (k - 1) * .15})`, offset: .3 },
      { transform: `translate(10px,${toCentre * .4 - 60}px) scale(${1 + (k - 1) * .55})`, offset: .62 },
      { transform: `translate(0px,${toCentre}px) scale(${k})` }
    ], { duration: T, easing: 'ease-in-out', fill: 'forwards' });
    anims.push(a);
    a.onfinish = () => { if (active) Seq.done('blow'); };
  }

  // Sky specks for parallax during the camera move.
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('i'), r = 1.5 + Math.random() * 2;
    Object.assign(s.style, { left: (12 + Math.random() * 366) + 'px', top: (-520 + Math.random() * 1300) + 'px', width: r + 'px', height: r + 'px' });
    el.sky.appendChild(s);
  }

  const c = new Component(render);
  render(c.renderVals());

  el.wand.addEventListener('pointerdown', e => v.wandDown(e));
  el.wand.addEventListener('pointerup', e => v.wandUp(e));
  el.wand.addEventListener('pointercancel', e => v.wandUp(e));
  el.wand.addEventListener('keydown', e => v.wandKeyDown(e));
  el.wand.addEventListener('keyup', e => v.wandKeyUp(e));
  el.bubble.addEventListener('pointerdown', e => v.bubbleDown(e));
  el.bubble.addEventListener('pointermove', e => v.bubbleMove(e));
  el.bubble.addEventListener('pointerup', e => v.bubbleUp(e));
  el.bubble.addEventListener('pointercancel', e => v.bubbleUp(e));
  el.bubble.addEventListener('keydown', e => v.bubbleKey(e));

  Seq.register('blow', {
    start() {
      const hadFocus = document.activeElement === el.canvas;
      active = true; lastPhase = null;
      c.reset();
      el.wand.animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduce ? 0 : 450, easing: 'ease' });
      if (hadFocus) el.wand.focus({ preventScroll: true });
    },
    // Called once scene 3 has taken over: fade the bubble out under the fragile one.
    stop() {
      const a = el.layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 0 : 350, fill: 'forwards' });
      anims.push(a);
      a.onfinish = () => { active = false; render(c.renderVals()); };
    },
    reset() {
      anims.forEach(a => { try { a.cancel(); } catch (e) {} }); anims = [];
      active = false; c.reset();
    }
  });
})();
