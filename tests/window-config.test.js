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

describe("settings window release controls", () => {
  it("allows text feedback copying through clipboard permissions", () => {
    assert.equal(capabilities.permissions.includes("clipboard-manager:allow-write-text"), true);
  });

  it("starts settings below typical small laptop viewport height", () => {
    const lib = readFileSync("src-tauri/src/lib.rs", "utf8");

    assert.match(lib, /\.inner_size\(720\.0,\s*680\.0\)/);
  });
});
