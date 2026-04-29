import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { shouldStartWindowDrag } from "../src/drag.js";

function makeTarget(selector) {
  return {
    closest(query) {
      return query
        .split(",")
        .map((part) => part.trim())
        .includes(selector)
        ? {}
        : null;
    },
  };
}

describe("shouldStartWindowDrag", () => {
  it("starts dragging from regular widget content with the primary pointer button", () => {
    assert.equal(shouldStartWindowDrag({ button: 0, target: makeTarget(".metric") }), true);
  });

  it("keeps interactive controls clickable instead of starting a window drag", () => {
    assert.equal(shouldStartWindowDrag({ button: 0, target: makeTarget("button") }), false);
    assert.equal(shouldStartWindowDrag({ button: 0, target: makeTarget("input") }), false);
  });

  it("ignores secondary pointer buttons", () => {
    assert.equal(shouldStartWindowDrag({ button: 2, target: makeTarget(".metric") }), false);
  });
});
