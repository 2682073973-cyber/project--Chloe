/* Sequence controller: one linear run through three scenes.
   wand (01 Slime Wand) → blow (02 Bubble Release) → fragile (03 Fragile Bubble) → end card.
   Each scene registers itself and calls Seq.done(name) when its last step succeeds. */
window.Seq = (() => {
  const $ = id => document.getElementById(id);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const STEPS = ['Hold', 'Shake', 'Blow', 'Lift', 'Crack', 'Release'];
  const rail = $('rail'), cueBox = $('cueBox'), capEl = $('caption'), labEl = $('label'), subEl = $('sub');
  const fit = $('fit'), endcard = $('endcard'), again = $('again');

  const items = STEPS.map(name => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="bar"><i></i></span>' + name;
    rail.appendChild(li);
    return li;
  });

  const scenes = {};
  const text = { caption: '', label: '', sub: '' };
  let cur = -1, scale = 1, swapping = false;

  function paint() {
    capEl.textContent = text.caption;
    labEl.textContent = text.label;
    subEl.textContent = text.sub;
  }

  // i = active step (0–5, 6 = all done). fill = 0..1 progress of the active step; omit it for a "waiting" pulse.
  function step(i, fill) {
    items.forEach((li, k) => {
      li.className = k < i ? 'done' : k === i ? (fill == null ? 'on wait' : 'on') : '';
      const f = k < i ? 1 : k === i && fill != null ? Math.max(0, Math.min(1, fill)) : 0;
      li.firstChild.firstChild.style.transform = k === i && fill == null ? '' : `scaleX(${f})`;
    });
    if (i !== cur) {
      cur = i;
      text.caption = i < STEPS.length ? `Step ${i + 1} of ${STEPS.length} · ${STEPS[i]}` : '';
      if (!swapping) {
        swapping = true;
        cueBox.classList.add('swap');
        setTimeout(() => { paint(); cueBox.classList.remove('swap'); swapping = false; }, reduce ? 0 : 180);
      }
    }
  }

  // label/sub: pass null to keep the current text.
  function cue(label, sub) {
    if (label != null) text.label = label;
    if (sub != null) text.sub = sub;
    if (!swapping) paint();
  }

  function fitFrame() {
    const small = innerWidth < 500;
    document.body.classList.toggle('full', small);
    const m = small ? 0 : 32;
    scale = Math.min((innerWidth - m) / 390, (innerHeight - m) / 844, small ? 1.25 : 1);
    fit.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  const next = {
    wand: () => { scenes.blow.start(); scenes.wand.stop(); },
    blow: () => { scenes.fragile.start(); scenes.blow.stop(); },
    fragile: () => showEnd()
  };

  function showEnd() {
    step(STEPS.length);
    cue('', '');
    endcard.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => endcard.classList.add('show')));
    setTimeout(() => again.focus({ preventScroll: true }), reduce ? 0 : 500);
  }

  again.addEventListener('click', () => {
    endcard.classList.remove('show');
    setTimeout(() => {
      endcard.hidden = true;
      scenes.fragile.stop();
      scenes.blow.reset();
      scenes.wand.reset();
      scenes.wand.start();
    }, reduce ? 0 : 400);
  });

  return {
    reduce, step, cue,
    scale: () => scale,
    register: (name, scene) => { scenes[name] = scene; },
    done: name => next[name](),
    boot() {
      addEventListener('resize', fitFrame);
      fitFrame();
      scenes.wand.start();
    }
  };
})();
