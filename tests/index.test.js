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
    ]) {
      assert.match(html, new RegExp(`id="${id}"`));
    }
  });
});
