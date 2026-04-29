const DRAG_BLOCKERS = [
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "[role='button']",
  "[contenteditable='true']",
  "[data-no-window-drag]",
].join(", ");

export function shouldStartWindowDrag(event) {
  if (event.button !== 0) return false;

  const target = event.target;
  return !target?.closest?.(DRAG_BLOCKERS);
}
