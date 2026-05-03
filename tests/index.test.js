import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const main = readFileSync("src/main.js", "utf8");

describe("phase 1 setup fields", () => {
  it("exposes income, schedule, and status controls", () => {
    for (const id of [
      "income-mode",
      "income-amount",
      "work-mode",
      "workday-mode",
      "start-time",
      "end-time",
      "lunch-start",
      "lunch-end",
      "status-override",
      "cycle-status",
      "status-menu",
    ]) {
      assert.match(html, new RegExp(`id="${id}"`));
    }
  });

  it("uses short labels for the compact status menu", () => {
    for (const label of ["自动", "开工", "摸鱼", "午休", "暂停", "收工"]) {
      assert.match(html, new RegExp(`data-status="[^"]+"[^>]*>\\s*${label}\\s*</button>`));
    }
  });
});

describe("phase 2 reminder settings", () => {
  it("exposes low-frequency reminder controls", () => {
    for (const id of [
      "reminder-mode",
      "schedule-reminders",
      "break-reminders",
      "reminder-interval",
      "quiet-start",
      "quiet-end",
    ]) {
      assert.match(html, new RegExp(`id="${id}"`));
    }
  });
});

describe("local stats controls", () => {
  it("exposes the opt-in setting and compact summary trigger", () => {
    assert.match(html, /id="local-stats-enabled"/);
    assert.match(html, /id="local-stats-button"[^>]*aria-label="查看本地统计"/);
    assert.match(html, /id="local-stats-panel"/);
  });

  it("shows the required local stats summary labels", () => {
    for (const label of ["近 7 天使用", "近 7 天回血", "近 7 天摸鱼", "最近 30 天"]) {
      assert.match(html, new RegExp(label));
    }
  });

  it("keeps the local stats panel outside the clipped status widget", () => {
    const statusWidgetEnd = html.indexOf("</section>");
    const panelPosition = html.indexOf('id="local-stats-panel"');

    assert.ok(statusWidgetEnd > 0);
    assert.ok(panelPosition > statusWidgetEnd);
  });

  it("wires local stats storage and rendering in the runtime", () => {
    for (const pattern of [
      /LOCAL_STATS_STORE_KEY\s*=\s*"localStats"/,
      /localStatsEnabled/,
      /function persistLocalStats/,
      /function renderLocalStats/,
      /function recordShareAction/,
      /function setOverlayWindowOpen/,
      /function openLocalStatsPanel/,
      /function closeLocalStatsPanel/,
    ]) {
      assert.match(main, pattern);
    }
  });
});

describe("notification settings shortcut", () => {
  it("exposes a hidden link-style action in the settings status area", () => {
    assert.match(html, /id="open-notification-settings"/);
    assert.match(html, /id="open-notification-settings"[^>]*hidden/);
    assert.match(html, />\s*打开通知设置\s*</);
  });
});

describe("compact widget metric roles", () => {
  it("marks the progress metric so it can keep 100 percent readable", () => {
    assert.match(html, /class="metric progress-metric"/);
    assert.match(html, /id="progress"/);
  });
});
