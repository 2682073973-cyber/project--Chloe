# project- Chloe
Sequential interaction bubble blowing project

## A Bubble's Life — sequence prototype

Live site: https://2682073973-cyber.github.io/project--chloe/

One continuous, linear interaction that follows a single soap bubble through its whole life. Each action unlocks only after the previous one succeeds:

| # | Action | Gesture | Feedback | From study |
|---|--------|---------|----------|------------|
| 1 | Hold | Press and hold the wand | Hold ring fills (0.6 s), wand lights up | 01 Slime Wand |
| 2 | Shake | Keep holding, drag left/right 6 times | Slime film lags, ripples and drips; speed trails; shake counter + wobble readout | 01 Slime Wand |
| 3 | Blow | Hold the wand, then let go | Wand tilts, bubble grows from the loop, springs up and breathes | 02 Bubble Release |
| 4 | Lift | Swipe the bubble up past the dashed line | Bubble stretches; camera follows it up into open air | 02 Bubble Release |
| 5 | Crack | Tap the bubble | Ripple, cracks race out from the touch, bubble splits into trembling shards | 03 Fragile Bubble |
| 6 | Release | Tap a fragment | Shards fall and dissolve outward from the touch, with dust | 03 Fragile Bubble |

- **Start:** the wand resting in slime.
- **End:** a quiet end card ("Nothing left.") with a "Blow another bubble" button, which is the only reset and returns to the start.
- Keyboard: hold Space + Left/Right arrows on the wand; Space/Enter (hold) to blow; Arrow Up to lift; Enter/Space to crack and release.
- Light/dark mode and `prefers-reduced-motion` are supported.

### Files

```
docs/                  the published static site (GitHub Pages source)
  index.html
  .nojekyll
  css/style.css        shared tokens + styles for all three scenes
  js/sequence.js       linear sequence controller: progress rail, cue text, hand-offs, end card, reset
  js/scene-wand.js     scene 1 (study 01 Slime Wand)
  js/scene-blow.js     scene 2 (study 02 Bubble Release) + camera move
  js/scene-fragile.js  scene 3 (study 03 Fragile Bubble)
bubble.zip             the original interaction studies
```

Plain HTML/CSS/JS, so there is no build step: the files in `docs/` are both the source and the published site.

### Publishing

In this repo's **Settings → Pages**, set **Source: Deploy from a branch**, branch `main`, folder `/docs`.

To preview locally: `cd docs && python3 -m http.server 5173`, then open http://localhost:5173.
