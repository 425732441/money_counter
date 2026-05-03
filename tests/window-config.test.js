import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tauriConfig = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const capabilities = JSON.parse(readFileSync("src-tauri/capabilities/default.json", "utf8"));

describe("main window dimensions", () => {
  it("starts compact and can shrink further at runtime", () => {
    const mainWindow = tauriConfig.app.windows.find((window) => window.label === "main");

    assert.equal(mainWindow.width, 560);
    assert.equal(mainWindow.minWidth, 520);
    assert.equal(mainWindow.height, 66);
    assert.equal(mainWindow.minHeight, 66);
  });

  it("uses transparent native window space for expanded overlay panels", () => {
    const mainWindow = tauriConfig.app.windows.find((window) => window.label === "main");

    assert.equal(mainWindow.transparent, true);
    assert.equal(mainWindow.shadow, false);
    assert.equal(mainWindow.backgroundColor, "#00000000");
    assert.equal(capabilities.permissions.includes("core:window:allow-set-shadow"), true);
  });
});
