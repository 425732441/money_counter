import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const styles = readFileSync("src/styles.css", "utf8");

describe("compact widget layout CSS", () => {
  it("does not switch the desktop widget into a wrapped mobile layout at compact widths", () => {
    assert.equal(styles.includes("grid-column: 1 / -1"), false);
    assert.equal(styles.includes(".metric:nth-of-type(4)"), false);
  });

  it("turns the hidden edge state into an opaque strip without padded content", () => {
    const hiddenRule = styles.match(/\.status-widget\.is-edge-hidden\s*\{(?<body>[^}]+)\}/)
      ?.groups.body;

    assert.ok(hiddenRule);
    assert.match(hiddenRule, /display:\s*block;/);
    assert.match(hiddenRule, /padding:\s*0;/);
    assert.match(hiddenRule, /background:\s*#102522;/);
    assert.match(styles, /\.status-widget\.is-edge-hidden > \*\s*\{[^}]*visibility:\s*hidden;/);
    assert.match(styles, /\.status-widget\.is-edge-hidden::before\s*\{[^}]*display:\s*none;/);
  });

  it("hides desktop status text when the widget becomes an edge strip", () => {
    assert.match(styles, /\.widget-shell\.is-edge-hidden\s+\.status-line\s*\{[^}]*display:\s*none;/);
  });

  it("keeps 100 percent progress readable after the proportional scale-up", () => {
    assert.match(
      styles,
      /\.status-widget\s*\{[^}]*grid-template-columns:\s*34px minmax\(96px,\s*1fr\) 64px 46px 48px 226px;/,
    );
    assert.match(styles, /\.metric\.progress-metric strong\s*\{[^}]*overflow:\s*visible;/);
    assert.match(styles, /\.status-line\s*\{[^}]*font-size:\s*0\.64rem;/);
  });
});

describe("settings window layout CSS", () => {
  it("keeps the settings view fully visible when possible and scrollable as fallback", () => {
    assert.match(styles, /body\.is-settings-window\s*\{[^}]*overflow:\s*hidden;/);
    assert.match(styles, /\.settings-shell\s*\{[^}]*height:\s*100vh;[^}]*overflow-y:\s*auto;/);
    assert.match(styles, /\.settings-shell\s*\{[^}]*align-items:\s*start;/);
  });

  it("keeps the main status menu narrow", () => {
    assert.match(styles, /\.status-menu\s*\{[^}]*width:\s*132px;/);
  });

  it("styles field tips as icon-triggered hover overlays", () => {
    assert.match(styles, /\.field-label\s*\{/);
    assert.match(styles, /\.field-help\s*\{/);
    assert.match(styles, /\.field-help::after\s*\{[^}]*content:\s*attr\(data-tip\);/);
    assert.match(styles, /\.field-help:hover::after,\s*\.field-help:focus-visible::after\s*\{[^}]*opacity:\s*1;/);
  });

  it("keeps share template previews compact until hover or focus", () => {
    assert.match(styles, /\.share-template-grid\s*\{/);
    assert.match(styles, /\.share-template-preview\s*\{[^}]*opacity:\s*0;/);
    assert.match(
      styles,
      /\.share-template-option:hover\s+\.share-template-preview,\s*\.share-template-option:focus-visible\s+\.share-template-preview\s*\{[^}]*opacity:\s*1;/,
    );
    assert.match(styles, /\.share-template-option\[aria-pressed="true"\]/);
  });
});

describe("local stats hover panel CSS", () => {
  it("can hide the toolbar entry when local stats are disabled", () => {
    assert.match(styles, /\[data-local-stats-hidden="true"\]\s*\{[^}]*display:\s*none;/);
  });

  it("reveals the panel with an overlay state class", () => {
    assert.match(styles, /\.widget-shell\.has-local-stats-panel\s+\.local-stats-panel/);
    assert.match(styles, /\.widget-shell\.has-status-menu\s+\.status-menu/);
  });

  it("keeps expanded window space transparent outside painted panels", () => {
    const shellRule = styles.match(/\.widget-shell\s*\{(?<body>[^}]+)\}/)?.groups.body;

    assert.ok(shellRule);
    assert.match(shellRule, /background:\s*transparent;/);
    assert.match(styles, /\.status-widget\s*\{[^}]*background:/);
  });
});

describe("onboarding wizard CSS", () => {
  it("styles the first-run wizard as a transparent-window overlay", () => {
    assert.match(styles, /\.onboarding-shell\s*\{/);
    assert.match(styles, /\.onboarding-step\[hidden\]\s*\{[^}]*display:\s*none/);
    assert.match(styles, /\.widget-shell\.is-onboarding\s+\.status-widget/);
  });
});
