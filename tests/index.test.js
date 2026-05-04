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

describe("first-run onboarding wizard", () => {
  it("exposes the three-step onboarding flow and core controls", () => {
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
      "onboarding-prev",
      "onboarding-next",
      "complete-onboarding",
      "skip-onboarding",
    ]) {
      assert.match(html, new RegExp(`id="${id}"`));
    }
  });

  it("mirrors settings field tips in the onboarding flow", () => {
    for (const tip of [
      "决定收入按月、按天还是按小时换算。",
      "用于计算每秒到账速度，按所选收入模式填写。",
      "用于判断哪些日期自动计入工作日。",
      "用于自动识别开工和计算当天进度。",
      "用于自动识别收工和计算当天进度。",
      "从这个时间开始暂停计入工作时长。",
      "到这个时间恢复计入工作时长。",
      "控制桌面小窗如何显示金额，保护隐私。",
      "开启后只在本机记录近 30 天汇总。",
      "开启后按工作节奏发送低频系统提醒。",
    ]) {
      const matches = html.match(new RegExp(`data-tip="${tip}"`, "g")) || [];
      assert.equal(matches.length, 2);
    }

    assert.doesNotMatch(html, /<small class="field-tip">/);
    assert.match(html, /class="field-label"[^>]*>\s*收入模式\s*<span class="field-help"/);
    assert.match(html, /class="field-help"[^>]*tabindex="0"/);
  });

  it("wires first-run onboarding state and persistence helpers", () => {
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
  });
});
