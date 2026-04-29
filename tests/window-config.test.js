import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const capabilities = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf8"));

describe("main window dimensions", () => {
  it("starts compact and can shrink further at runtime", () => {
    const mainWindow = tauriConfig.app.windows.find((window) => window.label === "main");

    assert.equal(mainWindow.width, 520);
    assert.equal(mainWindow.minWidth, 480);
    assert.equal(mainWindow.height, 60);
    assert.equal(mainWindow.minHeight, 60);
  });

  it("does not rely on native transparency or shadow for the compact strip", () => {
    const mainWindow = tauriConfig.app.windows.find((window) => window.label === "main");

    assert.equal(mainWindow.transparent, false);
    assert.equal(mainWindow.shadow, false);
    assert.equal(mainWindow.backgroundColor, "#102522");
    assert.equal(capabilities.permissions.includes("core:window:allow-set-shadow"), true);
  });
});
