import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  EDGE_STRIP_SIZE,
  WIDGET_HEIGHT,
  getCompactWidgetWidth,
  getDetachedEdgeState,
  getEdgeRestoreSize,
  getEdgeSnapState,
  getHiddenEdgeFrame,
  getHiddenEdgeLogicalSize,
  getHiddenEdgePosition,
  shouldAutoHideOnMouseLeave,
} from "../src/window-behavior.js";

describe("compact widget sizing", () => {
  it("uses a narrow default width on regular desktop screens", () => {
    assert.equal(getCompactWidgetWidth({ width: 1920 }), 560);
    assert.equal(getCompactWidgetWidth({ width: 1366 }), 540);
  });

  it("shrinks further on smaller screens without becoming unusably narrow", () => {
    assert.equal(getCompactWidgetWidth({ width: 1024 }), 520);
    assert.equal(getCompactWidgetWidth({ width: 800 }), 520);
  });
});

describe("edge snap behavior", () => {
  const monitor = {
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1080 },
  };
  const windowSize = { width: 560, height: 66 };
  const monitorWithRightTaskbar = {
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1080 },
    workArea: {
      position: { x: 0, y: 0 },
      size: { width: 1840, height: 1040 },
    },
  };

  it("detects top, left, and right edge snaps", () => {
    assert.equal(getEdgeSnapState({ x: 400, y: 4 }, windowSize, monitor), "top");
    assert.equal(getEdgeSnapState({ x: 3, y: 320 }, windowSize, monitor), "left");
    assert.equal(getEdgeSnapState({ x: 1358, y: 320 }, windowSize, monitor), "right");
  });

  it("prefers side edges over the top edge near screen corners", () => {
    assert.equal(getEdgeSnapState({ x: 3, y: 4 }, windowSize, monitor), "left");
    assert.equal(getEdgeSnapState({ x: 1358, y: 4 }, windowSize, monitor), "right");
  });

  it("still detects an edge after the dragged window crosses the screen boundary", () => {
    assert.equal(getEdgeSnapState({ x: -20, y: 320 }, windowSize, monitor), "left");
    assert.equal(getEdgeSnapState({ x: 1384, y: 320 }, windowSize, monitor), "right");
    assert.equal(getEdgeSnapState({ x: 400, y: -20 }, windowSize, monitor), "top");
  });

  it("uses the monitor work area for right-edge snapping", () => {
    assert.equal(getEdgeSnapState({ x: 1280, y: 320 }, windowSize, monitorWithRightTaskbar), "right");
  });

  it("does not snap to a monitor that the window does not overlap", () => {
    const rightMonitor = {
      position: { x: 1920, y: 0 },
      size: { width: 1920, height: 1080 },
    };

    assert.equal(getEdgeSnapState({ x: 1358, y: 320 }, windowSize, rightMonitor), null);
  });

  it("uses fixed logical sizes for edge hide and restore transitions", () => {
    assert.deepEqual(getHiddenEdgeLogicalSize("top", 560), {
      width: 560,
      height: EDGE_STRIP_SIZE,
    });
    assert.deepEqual(getHiddenEdgeLogicalSize("left", 560), {
      width: EDGE_STRIP_SIZE,
      height: WIDGET_HEIGHT,
    });
    assert.deepEqual(getHiddenEdgeLogicalSize("right", 560), {
      width: EDGE_STRIP_SIZE,
      height: WIDGET_HEIGHT,
    });
    assert.deepEqual(getEdgeRestoreSize(540), {
      width: 540,
      height: WIDGET_HEIGHT,
    });
  });

  it("leaves the progress strip visible when hidden at an edge", () => {
    assert.deepEqual(getHiddenEdgePosition("top", { x: 400, y: 0 }, windowSize, monitor), {
      x: 400,
      y: EDGE_STRIP_SIZE - windowSize.height,
    });
    assert.deepEqual(getHiddenEdgePosition("left", { x: 0, y: 320 }, windowSize, monitor), {
      x: EDGE_STRIP_SIZE - windowSize.width,
      y: 320,
    });
    assert.deepEqual(getHiddenEdgePosition("right", { x: 1400, y: 320 }, windowSize, monitor), {
      x: monitor.position.x + monitor.size.width - EDGE_STRIP_SIZE,
      y: 320,
    });
  });

  it("can hide as a real edge strip inside the screen bounds", () => {
    assert.deepEqual(getHiddenEdgeFrame("top", { x: 400, y: 0 }, windowSize, monitor), {
      position: { x: 400, y: 0 },
      size: { width: 560, height: EDGE_STRIP_SIZE },
    });
    assert.deepEqual(getHiddenEdgeFrame("left", { x: 0, y: 320 }, windowSize, monitor), {
      position: { x: 0, y: 320 },
      size: { width: EDGE_STRIP_SIZE, height: 66 },
    });
    assert.deepEqual(getHiddenEdgeFrame("right", { x: 1400, y: 320 }, windowSize, monitor), {
      position: { x: 1920 - EDGE_STRIP_SIZE, y: 320 },
      size: { width: EDGE_STRIP_SIZE, height: 66 },
    });
  });

  it("uses the work area when positioning a hidden right edge strip", () => {
    assert.deepEqual(
      getHiddenEdgeFrame("right", { x: 1280, y: 320 }, windowSize, monitorWithRightTaskbar),
      {
        position: { x: 1840 - EDGE_STRIP_SIZE, y: 320 },
        size: { width: EDGE_STRIP_SIZE, height: 66 },
      },
    );
  });

  it("detaches edge binding when the user manually drags an expanded strip", () => {
    assert.deepEqual(
      getDetachedEdgeState({
        edge: "right",
        hidden: false,
        visiblePosition: { x: 1400, y: 320 },
        expandedFromEdge: true,
      }),
      {
        edge: null,
        hidden: false,
        visiblePosition: null,
        expandedFromEdge: false,
      },
    );
  });

  it("does not auto-hide while a manual drag is active or recently ended", () => {
    assert.equal(shouldAutoHideOnMouseLeave({ edge: "left", hidden: false }, 1000), true);
    assert.equal(
      shouldAutoHideOnMouseLeave({ edge: "left", hidden: false, manualDragActive: true }, 1000),
      false,
    );
    assert.equal(
      shouldAutoHideOnMouseLeave({ edge: "left", hidden: false, suppressAutoHideUntil: 1200 }, 1000),
      false,
    );
  });
});
