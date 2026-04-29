import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");

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
