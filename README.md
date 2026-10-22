# motion-pill-jump

Fix the sliding tab pill that jumps, drifts or flies in from the wrong place. For Motion (`motion/react`) and Framer Motion `layoutId` indicators.

## Install

```bash
npx skills add kleenpulse/motion-pill-jump
```

Works with Claude Code, Codex, Cursor, Copilot, and anything else that reads `SKILL.md`.

## Why this one

A `layoutId` pill measures itself in viewport coordinates and only corrects for window scroll. So when an inner scroller snaps, content above grows, or a group re-renders after it moved, the pill animates from a spot it never really left. The usual "fixes" (removing `layoutId`, zeroing the transition) kill the slide too. This skill matches the symptom to one of four causes, applies the one-line fix, and proves it with a drift probe that samples every frame.

## What it does

- Maps the symptom to a cause: unsynced inner scroll, re-render after a layout shift, a shared `layoutId` across groups, or a fixed ancestor
- Applies the fix: `layoutScroll`, `layoutDependency`, a per-group `useId()` / `LayoutGroup`, or `layoutRoot`
- Measures drift before and after with `references/drift-probe.js` (console or puppeteer)
- Sweeps every other `layoutId` indicator in the app for the same bug

## What it refuses to do

- Remove `layoutId`, set `layout={false}`, or zero the transition to hide the jump
- Call it fixed without a 0px measurement on the action that jumped
- Break the tab-switch slide: it checks that the slide still animates

## Usage

- "The active pill jumps around when I switch tabs"
- "Fix the jumpy tab while tests are running, it causes layout shifts"
- "The tab highlight flies in from above when the page gets shorter"
- "My underline animates between two different tab bars"

## License

MIT
