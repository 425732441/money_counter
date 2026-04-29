export const WIDGET_HEIGHT = 60;
export const EDGE_STRIP_SIZE = 6;
export const EDGE_SNAP_DISTANCE = 12;
export const MIN_WIDGET_WIDTH = 480;
export const DEFAULT_WIDGET_WIDTH = 520;
export const MAX_WIDGET_WIDTH = 520;

export function getCompactWidgetWidth(screenSize) {
  const screenWidth = Number(screenSize?.width || DEFAULT_WIDGET_WIDTH);
  if (screenWidth >= 1600) return DEFAULT_WIDGET_WIDTH;
  if (screenWidth >= 1200) return 500;
  return MIN_WIDGET_WIDTH;
}

export function getMonitorBounds(monitor) {
  const position = monitor.workArea?.position || monitor.position;
  const size = monitor.workArea?.size || monitor.size;

  return {
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
  };
}

export function getEdgeSnapState(position, windowSize, monitor) {
  const bounds = getMonitorBounds(monitor);
  const windowLeft = position.x;
  const windowRight = position.x + windowSize.width;
  const windowTop = position.y;
  const windowBottom = position.y + windowSize.height;
  const boundsRight = bounds.x + bounds.width;
  const boundsBottom = bounds.y + bounds.height;
  const overlapsHorizontally = windowRight >= bounds.x && windowLeft <= boundsRight;
  const overlapsVertically = windowBottom >= bounds.y && windowTop <= boundsBottom;
  const leftDistance = windowLeft - bounds.x;
  const rightDistance = boundsRight - windowRight;
  const topDistance = windowTop - bounds.y;

  if (overlapsVertically && windowRight >= bounds.x && leftDistance <= EDGE_SNAP_DISTANCE) {
    return "left";
  }
  if (overlapsVertically && windowLeft <= boundsRight && rightDistance <= EDGE_SNAP_DISTANCE) {
    return "right";
  }
  if (overlapsHorizontally && windowBottom >= bounds.y && topDistance <= EDGE_SNAP_DISTANCE) {
    return "top";
  }
  return null;
}

export function getDetachedEdgeState(state) {
  return {
    edge: null,
    hidden: false,
    visiblePosition: null,
    expandedFromEdge: false,
    ...(state?.manualDragActive !== undefined ? { manualDragActive: state.manualDragActive } : {}),
    ...(state?.suppressAutoHideUntil !== undefined
      ? { suppressAutoHideUntil: state.suppressAutoHideUntil }
      : {}),
  };
}

export function shouldAutoHideOnMouseLeave(state, now = Date.now()) {
  return Boolean(
    state?.edge &&
      !state.hidden &&
      !state.manualDragActive &&
      now >= Number(state.suppressAutoHideUntil || 0),
  );
}

export function getHiddenEdgeLogicalSize(edge, visibleWidth) {
  const width = Math.max(EDGE_STRIP_SIZE, Number(visibleWidth || DEFAULT_WIDGET_WIDTH));

  if (edge === "top") {
    return {
      width,
      height: EDGE_STRIP_SIZE,
    };
  }

  if (edge === "left" || edge === "right") {
    return {
      width: EDGE_STRIP_SIZE,
      height: WIDGET_HEIGHT,
    };
  }

  return {
    width,
    height: WIDGET_HEIGHT,
  };
}

export function getEdgeRestoreSize(width = DEFAULT_WIDGET_WIDTH) {
  return {
    width: Math.max(MIN_WIDGET_WIDTH, Number(width || DEFAULT_WIDGET_WIDTH)),
    height: WIDGET_HEIGHT,
  };
}

export function getVisibleEdgePosition(edge, hiddenPosition, windowSize, monitor) {
  const bounds = getMonitorBounds(monitor);

  if (edge === "top") return { x: hiddenPosition.x, y: bounds.y };
  if (edge === "left") return { x: bounds.x, y: hiddenPosition.y };
  if (edge === "right") {
    return {
      x: bounds.x + bounds.width - windowSize.width,
      y: hiddenPosition.y,
    };
  }
  return hiddenPosition;
}

export function getHiddenEdgePosition(edge, visiblePosition, windowSize, monitor) {
  const bounds = getMonitorBounds(monitor);

  if (edge === "top") {
    return {
      x: visiblePosition.x,
      y: bounds.y + EDGE_STRIP_SIZE - windowSize.height,
    };
  }

  if (edge === "left") {
    return {
      x: bounds.x + EDGE_STRIP_SIZE - windowSize.width,
      y: visiblePosition.y,
    };
  }

  if (edge === "right") {
    return {
      x: bounds.x + bounds.width - EDGE_STRIP_SIZE,
      y: visiblePosition.y,
    };
  }

  return visiblePosition;
}

export function getHiddenEdgeFrame(edge, visiblePosition, windowSize, monitor) {
  const bounds = getMonitorBounds(monitor);

  if (edge === "top") {
    return {
      position: {
        x: visiblePosition.x,
        y: bounds.y,
      },
      size: {
        width: windowSize.width,
        height: EDGE_STRIP_SIZE,
      },
    };
  }

  if (edge === "left") {
    return {
      position: {
        x: bounds.x,
        y: visiblePosition.y,
      },
      size: {
        width: EDGE_STRIP_SIZE,
        height: windowSize.height,
      },
    };
  }

  if (edge === "right") {
    return {
      position: {
        x: bounds.x + bounds.width - EDGE_STRIP_SIZE,
        y: visiblePosition.y,
      },
      size: {
        width: EDGE_STRIP_SIZE,
        height: windowSize.height,
      },
    };
  }

  return {
    position: visiblePosition,
    size: windowSize,
  };
}
