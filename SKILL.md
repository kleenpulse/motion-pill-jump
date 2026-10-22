---
name: motion-pill-jump
description: Fix shared-layout indicators (Motion / Framer Motion `layoutId` pills, tab underlines, active highlights) that jump, fly in from the wrong place, or drift up and down instead of sliding straight to the selected item. Use when the user says "the active pill jumps around", "the tab highlight flies in from above", "the indicator jumps when the page gets shorter", "the tab jumps while data is loading / tests are running / the list updates", "layout shift moves my tab pill", "layoutId animation is janky when I scroll", or "the underline animates between two different tab bars". Covers motion/react and framer-motion.
license: MIT
---

# Motion Pill Jump: Make Shared-Layout Indicators Slide Straight

A `layoutId` indicator (the sliding pill behind the active tab) should move only when the selection changes, and only sideways between items. When it springs in from somewhere else, the cause is almost always one of four things. This skill finds which one, applies the fix, and proves it with a measurement, not a guess.

## When to Use

- An active tab pill, segmented-control highlight, nav indicator or underline built on `layoutId` jumps, drifts vertically, or flies in from a stale spot
- The jump happens when the page gets shorter, after a scroll, while content above it loads or streams, during a live progress panel, or when switching filters that change the list height
- The indicator animates between two separate tab bars that should be independent

**Do not use for:** indicators positioned by hand with measured `left`/`width` (no `layoutId`), CSS-only transitions, or enter/exit animations of whole panels. Those have different causes.

## Core Principle

Motion measures a `layoutId` element in **viewport coordinates** and animates from the last measured box to the new one. It only corrects for **window** scroll. Anything else that moves the element between two measurements (an inner scroller snapping, content above growing, a re-render while the container moved) is read as "the pill moved", so it animates that move. Every fix below either tells Motion about the movement or stops it from measuring when nothing was selected.

## Diagnose: Symptom → Cause → Fix

| Symptom | Cause | Fix |
|---|---|---|
| Pill flies in vertically when switching makes the page shorter, or after you scrolled an inner panel | The pill lives inside an `overflow-y: auto` element. Its scroll snaps in the same render, and Motion doesn't track that scroll. | Add `layoutScroll` to the scroller (it must be a `motion.*` element). |
| Pill jumps while something above it grows or shrinks: a live run panel, streaming rows, a loading banner, a toast pushing content | Every re-render re-measures the pill. If the whole group moved since the last render, Motion animates the move. | Add `layoutDependency={selectedValue}` to the pill so it only measures when the selection changes. |
| Pill animates from one tab bar to a different tab bar | Two groups share the same `layoutId` string. | Give each group its own id: `React.useId()` per group, or wrap each group in `<LayoutGroup id="...">`. |
| Pill inside a `position: fixed` / sticky header jumps when the page scrolls | The fixed ancestor moves relative to the page but Motion measures page offsets. | Make the fixed container a `motion.*` element with `layoutRoot`. |

Several causes can stack. Fix one, measure again, and keep going until the drift is zero.

## Rules

1. **Measure before and after.** Use the drift probe in `references/drift-probe.js`. A fix is done only when the probe shows 0px drift on the jumping action and the tab switch still slides.
2. **Fix it in the shared component**, not per page. If the app has one tab or toggle-group component that draws the pill, `layoutDependency` goes there, so every group gets it.
3. **`layoutScroll` goes on every scroller that can hold an indicator.** In an app with many page bodies, make one small wrapper (for example `LayoutScroll = (props) => <motion.div layoutScroll {...props} />`) and use it for page scrollers. Add it to any existing auto-hide-scrollbar component too.
4. **`layoutDependency` must change when the selection changes.** Use the selected value itself (join arrays: `value.join("\u0000")`). If the pill also has to follow a real size change of its item (a label that changes width), include that in the dependency.
5. **Never fix it by removing `layoutId`**, adding `layout={false}`, or setting `transition={{ duration: 0 }}`. That kills the slide the user wants.
6. **Don't wrap the whole group in `layout`.** That makes the group itself animate its own shift, which is a new jump.

## Fixes in Code

**Scroller (`layoutScroll`):**

```tsx
import { motion } from "motion/react";

export function LayoutScroll(props: React.ComponentProps<typeof motion.div>) {
  return <motion.div layoutScroll {...props} />;
}

// page body
<LayoutScroll className="h-full overflow-y-auto">…</LayoutScroll>
```

**Re-render while the group moved (`layoutDependency`):**

```tsx
{pressed && (
  <motion.span
    layoutId={groupLayoutId}
    // Animate only when the selection changes; otherwise a re-render after a
    // layout shift above springs the pill over from its old spot.
    layoutDependency={value.join("\u0000")}
    transition={TAB_SPRING}
    className="absolute inset-0 -z-10 rounded-full bg-inverse"
  />
)}
```

The tab switch still slides. The old pill unmounts and the new one mounts with the same `layoutId`, and that shared-element handoff doesn't depend on `layoutDependency`.

**Separate groups:**

```tsx
const layoutId = React.useId(); // one per group instance, never a hard-coded string
```

## Method

1. **Reproduce and name the trigger.** What action makes it jump: switching to a shorter view, scrolling an inner panel, a live update, a sticky header? Match it to a row in the table.
2. **Measure the baseline.** Run the drift probe during that action. Write down the max drift in px (a jump is usually 50 to 350px).
3. **Find the indicator code.** Search for `layoutId=`. Note which component draws the pill and which scroll container and fixed ancestors sit above it.
4. **Apply the fix for the matched cause** in the shared component or scroller wrapper.
5. **Measure again.** The drift on the trigger action must be 0px. Then switch tabs and confirm the probe shows non-zero drift *during* the switch: that is the slide, and it must still be there.
6. **Sweep the app.** Every other `layoutId` indicator gets the same check: is it inside a scroller without `layoutScroll`? Does it re-render while its container moves? Fix the ones that do. Leave stationary ones (fixed nav rails whose position never changes) alone.
7. **Report** the cause, the fix location, and the before/after numbers.

## Worked Example

A test dashboard has a "Constellation / List" pill group. Clicking **Run tests** opens a live panel above it, and every progress update makes the pill spring down from its old position.

- Probe during the run, before: `{"drift": 102.25, "moved": 11}`: the group moved 11 times and the pill lagged up to 102px behind.
- Cause: re-render while the container moved (row 2).
- Fix: `layoutDependency={context.value?.join("\u0000")}` on the pill inside the shared `ToggleGroupItem`.
- Probe during the run, after: `{"drift": 0, "moved": 13}`. Switching to List: `{"drift": 116.8}` mid-animation, so the slide still works.

Earlier in the same app, a paginated table's short last page made the page shrink and the scroller snap, and the filter pill drifted 344px. Cause: row 1. Fix: page bodies became `<LayoutScroll>`. After: 0px.

## Self-Check Before You Deliver

1. The probe showed non-zero drift on the trigger action before the fix. If it didn't, you haven't reproduced the bug yet.
2. The probe shows 0px drift on the same action after the fix.
3. The probe shows non-zero drift *during* a tab switch, so the slide still works.
4. `grep layoutId=` was swept, and each indicator was either fixed or ruled out with a reason.
5. No `layoutId` was removed and no transition was zeroed to "fix" it.
6. Typecheck, lint and tests still pass.
