# Light Character Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a default-on, settings-controlled pixel worker character to the compact main widget.

**Architecture:** Reuse the existing settings object and render loop in `src/main.js`. Add a decorative character DOM block beside the existing coin mark, then toggle visibility and state classes from the current work status. Keep all visuals CSS-only.

**Tech Stack:** Tauri 2, Vite, vanilla JavaScript, CSS, Node test runner.

---

## Files

- Modify `index.html`: add the character DOM block and the `轻角色` settings select.
- Modify `src/main.js`: add `characterEnabled`, query new controls, sync settings, and render state classes.
- Modify `src/styles.css`: add pixel character styles, state variants, and reduced-motion-safe animation.
- Modify `tests/index.test.js`: add DOM and runtime contract checks.
- Modify `tests/styles.test.js`: add CSS contract checks.

## Task 1: Add Character DOM Contracts

- [ ] **Step 1: Write failing DOM tests**

Add assertions to `tests/index.test.js` that require:

```js
"character-mark"
"pixel-character"
"character-enabled"
/characterEnabled:\s*true/
/characterMark/
/pixelCharacter/
```

- [ ] **Step 2: Verify test fails**

Run: `npm test -- tests/index.test.js`

Expected: failure because the DOM and runtime keys do not exist yet.

- [ ] **Step 3: Add minimal DOM and runtime wiring**

In `index.html`, add a decorative character block next to the coin mark and a `轻角色` select in the settings grid. In `src/main.js`, add `characterEnabled: true`, query the new elements, sync the setting, and toggle the two visual marks.

- [ ] **Step 4: Verify test passes**

Run: `npm test -- tests/index.test.js`

Expected: `tests/index.test.js` passes.

## Task 2: Add Character Visual States

- [ ] **Step 1: Write failing CSS tests**

Add assertions to `tests/styles.test.js` that require:

```js
/\.character-mark\s*\{/
/\.pixel-character\.is-working/
/\.pixel-character\.is-fishing/
/\.pixel-character\.is-lunch/
/\.pixel-character\.is-off-work/
/@keyframes\s+character-breathe/
/@media\s+\(prefers-reduced-motion:\s*reduce\)/
```

- [ ] **Step 2: Verify test fails**

Run: `npm test -- tests/styles.test.js`

Expected: failure because the CSS classes and keyframes do not exist yet.

- [ ] **Step 3: Add minimal CSS**

Create a compact 34px character slot, pixel body parts, state color changes, and a subtle breathing animation disabled by reduced-motion.

- [ ] **Step 4: Verify test passes**

Run: `npm test -- tests/styles.test.js`

Expected: `tests/styles.test.js` passes.

## Task 3: Render Runtime State

- [ ] **Step 1: Write failing runtime contract test**

Add assertions to `tests/index.test.js` that require:

```js
/renderCharacter/
/characterState/
/is-off-work/
/is-overtime/
```

- [ ] **Step 2: Verify test fails**

Run: `npm test -- tests/index.test.js`

Expected: failure because runtime character state rendering does not exist yet.

- [ ] **Step 3: Implement state mapping**

Add `renderCharacter(status, metrics)` and call it from `render()`. Map `working`, `fishing`, `lunch`, `pause`, and `offWork` into CSS classes. Add `is-overtime` when the current status is still active after scheduled end.

- [ ] **Step 4: Verify targeted tests pass**

Run: `npm test -- tests/index.test.js tests/styles.test.js`

Expected: targeted tests pass.

## Task 4: Full Verification

- [ ] **Step 1: Run JavaScript tests**

Run: `npm test`

Expected: all Node tests pass.

- [ ] **Step 2: Run frontend build**

Run: `npm run build`

Expected: Vite build succeeds.

- [ ] **Step 3: Run Tauri Rust tests**

Run: `cargo test` from `src-tauri`

Expected: Rust tests pass.

## Self-Review

- Spec coverage: default-on character, settings switch, fallback coin, CSS-only rendering, status mapping, accessibility, and tests are covered.
- Scope check: separate floating character window and share-image character rendering are intentionally excluded.
- Commit note: do not create a git commit unless the user explicitly asks.

