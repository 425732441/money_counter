# Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a lightweight first-run setup wizard that lets new users configure income, work schedule, privacy, local stats, and reminders before entering the compact money counter.

**Architecture:** Reuse the existing settings model and DOM runtime in `src/main.js`. Add an overlay-style wizard inside the main window, controlled by `settings.onboardingCompleted`, with minimal helper functions for step state, form sync, completion, and default skip.

**Tech Stack:** Vanilla HTML/CSS/JS, Tauri Store plugin, Node test runner, Vite.

---

## File Structure

- Modify `index.html`: add a hidden onboarding shell with three panels and input IDs prefixed with `onboarding-`.
- Modify `src/main.js`: add `onboardingCompleted`, wizard state, form sync, completion, skip, and first-run display logic.
- Modify `src/styles.css`: add modal-style onboarding layout for transparent main window.
- Modify `tests/index.test.js`: static tests for wizard DOM and runtime anchors.
- Modify `tests/styles.test.js`: CSS tests for overlay visibility and step styling.

---

### Task 1: Static Wizard Contract

- [x] **Step 1: Write failing tests**

Add tests that require `index.html` to contain:

```js
for (const id of [
  "onboarding-view",
  "onboarding-step-income",
  "onboarding-step-schedule",
  "onboarding-step-preferences",
  "onboarding-income-mode",
  "onboarding-income-amount",
  "onboarding-workday-mode",
  "onboarding-start-time",
  "onboarding-end-time",
  "onboarding-privacy-mode",
  "onboarding-local-stats-enabled",
  "onboarding-reminder-mode",
  "complete-onboarding",
  "skip-onboarding",
]) {
  assert.match(html, new RegExp(`id="${id}"`));
}
```

- [x] **Step 2: Verify red**

Run `node --test tests/index.test.js`.

Expected: fails because onboarding DOM does not exist.

- [x] **Step 3: Add wizard DOM**

Add hidden `#onboarding-view` after the widget view and before settings view. Include three panels, previous/next controls, complete button, and default-skip button.

- [x] **Step 4: Verify green**

Run `node --test tests/index.test.js`.

Expected: passes static DOM checks.

---

### Task 2: Runtime Wiring Contract

- [x] **Step 1: Write failing tests**

Add static runtime tests requiring:

```js
for (const pattern of [
  /onboardingCompleted:\s*false/,
  /function syncOnboardingForm/,
  /function readOnboardingForm/,
  /function renderOnboarding/,
  /async function completeOnboarding/,
  /async function skipOnboarding/,
]) {
  assert.match(main, pattern);
}
```

- [x] **Step 2: Verify red**

Run `node --test tests/index.test.js`.

Expected: fails because runtime functions do not exist.

- [x] **Step 3: Add runtime wiring**

Add `onboardingCompleted: false` to default settings. Hide `#status-widget` content when onboarding is active. Sync onboarding fields from settings, read them back into settings, complete by saving settings and setting `onboardingCompleted: true`, and skip by saving current defaults with the same flag.

- [x] **Step 4: Verify green**

Run `node --test tests/index.test.js`.

Expected: passes runtime anchor checks.

---

### Task 3: Wizard Styling

- [x] **Step 1: Write failing style tests**

Add CSS tests requiring:

```js
assert.match(styles, /\.onboarding-shell\s*\{/);
assert.match(styles, /\.onboarding-step\[hidden\]\s*\{[^}]*display:\s*none/);
assert.match(styles, /\.widget-shell\.is-onboarding\s+\.status-widget/);
```

- [x] **Step 2: Verify red**

Run `node --test tests/styles.test.js`.

Expected: fails because styles do not exist.

- [x] **Step 3: Add CSS**

Style the wizard as a compact overlay card in the transparent window. Use existing colors, keep the main window draggable only outside interactive controls, and hide the status strip while onboarding is visible.

- [x] **Step 4: Verify green**

Run `node --test tests/styles.test.js`.

Expected: passes.

---

### Task 4: Verification

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Run `cargo test` from `src-tauri`.

Expected: all pass before integration.

---

## Self-Review

- Scope covers first-run onboarding only; it does not replace the full settings window.
- Skip behavior sets `onboardingCompleted: true`, preventing repeat prompts.
- The wizard uses existing settings fields and avoids new persistence keys beyond `settings.onboardingCompleted`.
