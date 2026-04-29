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
});
