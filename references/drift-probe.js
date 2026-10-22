// Drift probe for layoutId indicators.
//
// Paste into the browser console (or run through puppeteer's page.evaluate),
// start it, then do the action that makes the pill jump. It samples every
// animation frame and reports how far each indicator sits from the item it
// belongs to. A pill that only slides sideways on a tab switch is fine; any
// drift during an action that doesn't change the selection is the bug.
//
//   await probeDrift({ ms: 3000 })                       // defaults below
//   await probeDrift({ item: '[role="tab"][aria-selected="true"]', pill: "[data-pill]" })
//
// Result: { drift, vertical, frames, moved }
//   drift     max distance between pill and item edges (px), any direction
//   vertical  max vertical distance only (px); 0 means no up/down jump
//   frames    frames sampled
//   moved     frames where the item itself moved (proves the layout shifted)

async function probeDrift({
	ms = 3000,
	// The selected item. Defaults fit shadcn/Base UI toggle groups.
	item = '[data-slot="toggle-group-item"][aria-pressed="true"], [aria-current="page"], [role="tab"][aria-selected="true"]',
	// The indicator, looked up inside the selected item.
	pill = "span[aria-hidden]",
} = {}) {
	return new Promise((done) => {
		let drift = 0;
		let vertical = 0;
		let frames = 0;
		let moved = 0;
		const last = new Map();
		const t0 = performance.now();
		const tick = () => {
			for (const el of document.querySelectorAll(item)) {
				const p = el.querySelector(pill);
				if (!p) continue;
				const a = p.getBoundingClientRect();
				const b = el.getBoundingClientRect();
				drift = Math.max(drift, Math.abs(a.top - b.top), Math.abs(a.left - b.left));
				vertical = Math.max(vertical, Math.abs(a.top - b.top));
				const prev = last.get(el);
				if (prev !== undefined && Math.abs(b.top - prev) > 0.5) moved++;
				last.set(el, b.top);
			}
			frames++;
			if (performance.now() - t0 < ms) requestAnimationFrame(tick);
			else done({ drift, vertical, frames, moved });
		};
		requestAnimationFrame(tick);
	});
}

// Puppeteer usage:
//   const probe = fs.readFileSync("drift-probe.js", "utf8");
//   const result = page.evaluate(`${probe}; probeDrift({ ms: 3000 })`);
//   await triggerTheJump();
//   console.log(await result);
