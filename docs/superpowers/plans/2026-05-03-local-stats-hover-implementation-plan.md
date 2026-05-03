# Local Stats Hover Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add opt-in local daily statistics, a compact hover/focus summary panel, and tests for storage-safe aggregation.

**Architecture:** Keep stats math in a new pure module so storage and DOM code stay thin. Wire `src/main.js` to periodically persist summaries only when `settings.localStatsEnabled === true`, and update `index.html`/`src/styles.css` with an accessible hover/focus panel.

**Tech Stack:** Vite, vanilla JavaScript modules, Node test runner, Tauri Store plugin.

---

## File Structure

- Create `src/local-stats-core.js`: pure helpers for date-safe records, 30-day retention, 7-day summary, and share-count increments.
- Create `tests/local-stats-core.test.js`: TDD coverage for merge, retention, malformed values, empty states, and share counts.
- Modify `index.html`: add the local stats settings toggle, toolbar trigger, and panel markup.
- Modify `src/styles.css`: add hidden/visible panel styling with hover/focus behavior.
- Modify `tests/index.test.js` and `tests/styles.test.js`: static tests for the new UI and styles.
- Modify `src/main.js`: persist/read `localStats`, update records every minute, hide/show panel, and increment share count after copy/save success.

---

### Task 1: Pure Local Stats Core

**Files:**
- Create: `src/local-stats-core.js`
- Create: `tests/local-stats-core.test.js`

- [x] **Step 1: Write failing tests**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildTodayStatsRecord,
  getLocalStatsSummary,
  incrementShareCount,
  mergeLocalStatsRecord,
} from "../src/local-stats-core.js";

describe("local stats records", () => {
  it("merges the current day and keeps only the latest 30 dates", () => {
    const existing = Array.from({ length: 31 }, (_, index) => ({
      date: `2026-04-${String(index + 1).padStart(2, "0")}`,
      used: true,
      paidSeconds: index,
      fishingSeconds: 0,
      earned: index,
      shareCount: 0,
      updatedAt: `2026-04-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
    }));

    const next = mergeLocalStatsRecord(existing, {
      date: "2026-04-30",
      used: true,
      paidSeconds: 999,
      fishingSeconds: 120,
      earned: 88.5,
      shareCount: 2,
      updatedAt: "2026-04-30T12:00:00.000Z",
    });

    assert.equal(next.length, 30);
    assert.equal(next[0].date, "2026-04-02");
    assert.equal(next.at(-1).date, "2026-05-01");
    assert.deepEqual(
      next.find((record) => record.date === "2026-04-30"),
      {
        date: "2026-04-30",
        used: true,
        paidSeconds: 999,
        fishingSeconds: 120,
        earned: 88.5,
        shareCount: 2,
        updatedAt: "2026-04-30T12:00:00.000Z",
      },
    );
  });

  it("builds a safe today record from metrics", () => {
    const record = buildTodayStatsRecord({
      dateKey: "2026-05-03",
      metrics: { paidSeconds: 3600, fishingSeconds: 600, earned: 123.45 },
      existingRecord: { shareCount: 3 },
      now: new Date("2026-05-03T09:30:00.000Z"),
    });

    assert.deepEqual(record, {
      date: "2026-05-03",
      used: true,
      paidSeconds: 3600,
      fishingSeconds: 600,
      earned: 123.45,
      shareCount: 3,
      updatedAt: "2026-05-03T09:30:00.000Z",
    });
  });

  it("increments share count for the target date", () => {
    const next = incrementShareCount(
      [{ date: "2026-05-03", used: true, paidSeconds: 1, fishingSeconds: 0, earned: 1, shareCount: 1 }],
      "2026-05-03",
      new Date("2026-05-03T10:00:00.000Z"),
    );

    assert.equal(next[0].shareCount, 2);
    assert.equal(next[0].updatedAt, "2026-05-03T10:00:00.000Z");
  });
});

describe("local stats summary", () => {
  it("summarizes the latest 7 days and tolerates malformed fields", () => {
    const summary = getLocalStatsSummary([
      { date: "bad", used: true, paidSeconds: "x", fishingSeconds: "x", earned: "x", shareCount: "x" },
      { date: "2026-04-27", used: true, paidSeconds: 1, fishingSeconds: 1, earned: 1 },
      { date: "2026-04-28", used: true, paidSeconds: 1, fishingSeconds: 10, earned: 2 },
      { date: "2026-04-29", used: false, paidSeconds: 1, fishingSeconds: 20, earned: 3 },
      { date: "2026-04-30", used: true, paidSeconds: 1, fishingSeconds: 30, earned: 4 },
      { date: "2026-05-01", used: true, paidSeconds: 1, fishingSeconds: 40, earned: 5 },
      { date: "2026-05-02", used: true, paidSeconds: 1, fishingSeconds: 50, earned: 6 },
      { date: "2026-05-03", used: true, paidSeconds: 1, fishingSeconds: 60, earned: 7 },
    ]);

    assert.equal(summary.hasRecords, true);
    assert.equal(summary.todayRecorded, true);
    assert.equal(summary.usedDays, 5);
    assert.equal(summary.earned, 27);
    assert.equal(summary.fishingSeconds, 210);
    assert.equal(summary.retentionDays, 30);
  });

  it("returns an empty summary for no valid records", () => {
    assert.deepEqual(getLocalStatsSummary([]), {
      hasRecords: false,
      todayRecorded: false,
      usedDays: 0,
      earned: 0,
      fishingSeconds: 0,
      retentionDays: 30,
    });
  });
});
```

- [x] **Step 2: Verify tests fail**

Run: `node --test tests/local-stats-core.test.js`

Expected: FAIL with module-not-found for `src/local-stats-core.js`.

- [x] **Step 3: Implement pure helpers**

Create exports named `mergeLocalStatsRecord`, `buildTodayStatsRecord`, `incrementShareCount`, and `getLocalStatsSummary`. Normalize invalid numbers to `0`, preserve the previous `shareCount` when updating today, deduplicate by `date`, sort ascending by date, and keep the latest 30 valid dates.

- [x] **Step 4: Verify tests pass**

Run: `node --test tests/local-stats-core.test.js`

Expected: PASS.

---

### Task 2: Static UI and CSS

**Files:**
- Modify: `index.html`
- Modify: `src/styles.css`
- Modify: `tests/index.test.js`
- Modify: `tests/styles.test.js`

- [x] **Step 1: Write failing static tests**

Add tests requiring:
- `id="local-stats-enabled"` in the settings form.
- `id="local-stats-button"` with `aria-label="查看本地统计"`.
- `id="local-stats-panel"` containing “近 7 天使用”, “近 7 天回血”, “近 7 天摸鱼”, and “最近 30 天”.
- CSS rule hiding `[data-local-stats-hidden="true"]`.
- CSS hover/focus selectors showing `.local-stats-panel`.

- [x] **Step 2: Verify tests fail**

Run: `node --test tests/index.test.js tests/styles.test.js`

Expected: FAIL because the UI and style selectors do not exist.

- [x] **Step 3: Add markup and styles**

Insert the stats button beside the existing toolbar buttons. Add the summary panel as a child of the stats button wrapper so hover and focus-within can reveal it. Add a settings toggle near reminder/privacy settings. Use existing dark green, cyan, and muted text colors.

- [x] **Step 4: Verify static tests pass**

Run: `node --test tests/index.test.js tests/styles.test.js`

Expected: PASS.

---

### Task 3: Runtime Store Integration

**Files:**
- Modify: `src/main.js`
- Modify: `tests/index.test.js`

- [x] **Step 1: Write failing tests for integration anchors**

Add static tests that require `src/main.js` to contain:
- `LOCAL_STATS_STORE_KEY = "localStats"`.
- `persistLocalStats`.
- `renderLocalStats`.
- `recordShareAction`.
- `localStatsEnabled`.

- [x] **Step 2: Verify tests fail**

Run: `node --test tests/index.test.js`

Expected: FAIL because these runtime anchors do not exist.

- [x] **Step 3: Wire runtime behavior**

Import pure helpers. Add `localStatsEnabled: false` to default settings. Load `localStats` from store during boot. Persist only when enabled. Render the toolbar entry hidden when disabled. Update summary text after each `render()`. Increment share count after successful copy/save.

- [x] **Step 4: Verify integration tests pass**

Run: `node --test tests/index.test.js`

Expected: PASS.

---

### Task 4: Full Verification

**Files:**
- No new files.

- [x] **Step 1: Run targeted tests**

Run: `node --test tests/local-stats-core.test.js tests/index.test.js tests/styles.test.js`

Expected: PASS.

- [x] **Step 2: Run full frontend tests**

Run: `npm test`

Expected: PASS.

- [x] **Step 3: Run production build**

Run: `npm run build`

Expected: PASS.

- [x] **Step 4: Run Tauri tests**

Run: `cargo test` from `src-tauri`

Expected: PASS.

---

## Self-Review

- Spec coverage: opt-in storage, 30-day retention, 7-day summary, hover/focus UI, clear-setting reset, share count increment, and error-tolerant calculations are covered.
- Scope intentionally excludes charts, statistics page, export, achievements, and cloud sync.
- Function names are consistent across tests, implementation, and runtime integration.
