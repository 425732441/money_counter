import "./styles.css";

import { shouldStartWindowDrag } from "./drag.js";
import {
  DEFAULT_WORK_SETTINGS,
  WORK_STATUSES,
  advanceDayState,
  createInitialDayState,
  getWorkMetrics as getCoreWorkMetrics,
} from "./work-core.js";
import {
  DEFAULT_WIDGET_WIDTH,
  EDGE_STRIP_SIZE,
  MIN_WIDGET_WIDTH,
  WIDGET_HEIGHT,
  getCompactWidgetWidth,
  getDetachedEdgeState,
  getEdgeRestoreSize,
  getEdgeSnapState,
  getHiddenEdgeFrame,
  getHiddenEdgeLogicalSize,
  getVisibleEdgePosition,
  shouldAutoHideOnMouseLeave,
} from "./window-behavior.js";
import { Image } from "@tauri-apps/api/image";
import { invoke } from "@tauri-apps/api/core";
import {
  LogicalSize,
  PhysicalPosition,
  currentMonitor,
  getCurrentWindow,
} from "@tauri-apps/api/window";
import { emitTo, listen } from "@tauri-apps/api/event";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { save } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";

const DEFAULT_SETTINGS = {
  ...DEFAULT_WORK_SETTINGS,
  workDaysPerMonth: 21.75,
  privacyMode: "blurred",
};

const PIN_STORE_KEY = "pinOnTop";
const DAY_STATE_STORE_KEY = "dayState";

const el = {
  widgetView: document.querySelector("#widget-view"),
  settingsView: document.querySelector("#settings-view"),
  statusWidget: document.querySelector("#status-widget"),
  earned: document.querySelector("#earned"),
  rate: document.querySelector("#rate"),
  progress: document.querySelector("#progress"),
  progressBar: document.querySelector("#progress-bar"),
  incomeMode: document.querySelector("#income-mode"),
  incomeAmount: document.querySelector("#income-amount"),
  workDays: document.querySelector("#work-days"),
  dailyHours: document.querySelector("#daily-hours"),
  workMode: document.querySelector("#work-mode"),
  workdayMode: document.querySelector("#workday-mode"),
  startTime: document.querySelector("#start-time"),
  endTime: document.querySelector("#end-time"),
  lunchStart: document.querySelector("#lunch-start"),
  lunchEnd: document.querySelector("#lunch-end"),
  privacyMode: document.querySelector("#privacy-mode"),
  statusOverride: document.querySelector("#status-override"),
  saveSettings: document.querySelector("#save-settings"),
  clearSettings: document.querySelector("#clear-settings"),
  openSettings: document.querySelector("#open-settings"),
  closeSettings: document.querySelector("#close-settings"),
  sendNotification: document.querySelector("#send-notification"),
  cycleStatus: document.querySelector("#cycle-status"),
  statusMenu: document.querySelector("#status-menu"),
  statusMenuButtons: Array.from(document.querySelectorAll("#status-menu [data-status]")),
  togglePin: document.querySelector("#toggle-pin"),
  toggleAutostart: document.querySelector("#toggle-autostart"),
  copyCard: document.querySelector("#copy-card"),
  saveCard: document.querySelector("#save-card"),
  hideWindow: document.querySelector("#hide-window"),
  desktopStatus: document.querySelector("#desktop-status"),
  settingsStatus: document.querySelector("#settings-status"),
  shareCard: document.querySelector("#share-card"),
};

let store;
let settings = { ...DEFAULT_SETTINGS };
let dayState = createInitialDayState();
let lastDayStatePersistAt = 0;
let autostartEnabled = false;
let currentWindowLabel = "main";
let currentWindow;
let pinOnTop = true;
let currentWidgetWidth = DEFAULT_WIDGET_WIDTH;
let statusMenuOpen = false;
let edgeState = {
  edge: null,
  hidden: false,
  visiblePosition: null,
  expandedFromEdge: false,
  manualDragActive: false,
  manualDragTimer: 0,
  suppressAutoHideUntil: 0,
  hideTimer: 0,
  moveTimer: 0,
  ignoreMovedUntil: 0,
};

function setStatus(message, target = "desktop") {
  const node = target === "settings" ? el.settingsStatus : el.desktopStatus;
  if (node) node.textContent = message;
}

function setEdgeVisual(edge, hidden) {
  if (!el.statusWidget) return;

  el.statusWidget.dataset.edge = edge || "";
  el.statusWidget.classList.toggle("is-edge-hidden", Boolean(hidden));
  el.widgetView.classList.toggle("is-edge-hidden", Boolean(hidden));
  if (hidden && statusMenuOpen) closeStatusMenu();
}

function setEdgeProgress(progress) {
  if (!el.statusWidget) return;

  el.statusWidget.style.setProperty(
    "--edge-progress",
    `${Math.max(2, Math.min(100, Math.round(progress * 100)))}%`,
  );
}

function clearEdgeTimers() {
  clearTimeout(edgeState.hideTimer);
  clearTimeout(edgeState.moveTimer);
  clearTimeout(edgeState.manualDragTimer);
}

async function getActiveMonitor() {
  return (
    (await currentMonitor()) || {
      position: { x: 0, y: 0 },
      size: {
        width: window.screen.width,
        height: window.screen.height,
      },
      workArea: {
        position: {
          x: window.screen.availLeft || 0,
          y: window.screen.availTop || 0,
        },
        size: {
          width: window.screen.availWidth,
          height: window.screen.availHeight,
        },
      },
    }
  );
}

async function applyWindowChrome() {
  if (currentWindowLabel !== "main") return;

  await currentWindow.setShadow(false).catch((error) => {
    console.warn("disable window shadow failed", error);
  });
}

async function applyResponsiveWindowSize() {
  if (currentWindowLabel !== "main") return;

  const monitor = await getActiveMonitor();
  const scaleFactor = await currentWindow.scaleFactor().catch(() => 1);
  const width = getCompactWidgetWidth({
    width: Math.round(monitor.size.width / Math.max(1, scaleFactor)),
  });
  currentWidgetWidth = width;
  const size = getEdgeRestoreSize(currentWidgetWidth);

  await currentWindow.setSize(new LogicalSize(size.width, size.height));
  await currentWindow.setSizeConstraints({
    minWidth: MIN_WIDGET_WIDTH,
    minHeight: WIDGET_HEIGHT,
  });
}

async function fitSettingsWindow() {
  if (currentWindowLabel !== "settings") return;

  const monitor = await getActiveMonitor();
  const scaleFactor = await currentWindow.scaleFactor().catch(() => 1);
  const workArea = monitor.workArea || monitor;
  const workAreaWidth = Math.round(workArea.size.width / Math.max(1, scaleFactor));
  const workAreaHeight = Math.round(workArea.size.height / Math.max(1, scaleFactor));
  const contentHeight = Math.ceil(el.settingsView.scrollHeight || 720);
  const width = Math.min(720, Math.max(560, workAreaWidth - 80));
  const maxHeight = Math.max(520, workAreaHeight - 80);
  const height = Math.min(maxHeight, Math.max(620, contentHeight));

  await currentWindow.setSizeConstraints({
    minWidth: 560,
    minHeight: 520,
  });
  await currentWindow.setSize(new LogicalSize(width, height));
}

async function getWindowGeometry() {
  const [position, size, monitor, scaleFactor] = await Promise.all([
    currentWindow.outerPosition(),
    currentWindow.outerSize(),
    getActiveMonitor(),
    currentWindow.scaleFactor().catch(() => 1),
  ]);

  return { position, size, monitor, scaleFactor };
}

function scheduleEdgeHide(delay = 700) {
  clearTimeout(edgeState.hideTimer);
  edgeState.hideTimer = window.setTimeout(() => {
    hideAtCurrentEdge();
  }, delay);
}

function scheduleEdgeSnap() {
  if (
    currentWindowLabel !== "main" ||
    edgeState.hidden ||
    edgeState.manualDragActive ||
    Date.now() < edgeState.ignoreMovedUntil
  ) {
    return;
  }

  clearTimeout(edgeState.moveTimer);
  edgeState.moveTimer = window.setTimeout(() => {
    snapToNearbyEdge();
  }, 500);
}

async function hideAtCurrentEdge() {
  if (!edgeState.edge || edgeState.hidden) return;

  try {
    const { position, size, monitor, scaleFactor } = await getWindowGeometry();
    const visiblePosition =
      edgeState.visiblePosition || getVisibleEdgePosition(edgeState.edge, position, size, monitor);
    const hiddenSize = getHiddenEdgeLogicalSize(edgeState.edge, currentWidgetWidth);
    const physicalHiddenSize = {
      width: Math.round(hiddenSize.width * Math.max(1, scaleFactor)),
      height: Math.round(hiddenSize.height * Math.max(1, scaleFactor)),
    };
    const hiddenFrame = getHiddenEdgeFrame(
      edgeState.edge,
      visiblePosition,
      physicalHiddenSize,
      monitor,
    );

    edgeState.visiblePosition = visiblePosition;
    edgeState.hidden = true;
    edgeState.expandedFromEdge = false;
    edgeState.ignoreMovedUntil = Date.now() + 600;
    setEdgeVisual(edgeState.edge, true);
    await currentWindow.setSizeConstraints({
      minWidth: EDGE_STRIP_SIZE,
      minHeight: EDGE_STRIP_SIZE,
    });
    await currentWindow.setSize(new LogicalSize(hiddenSize.width, hiddenSize.height));
    await currentWindow.setPosition(
      new PhysicalPosition(hiddenFrame.position.x, hiddenFrame.position.y),
    );
  } catch (error) {
    console.warn("edge hide failed", error);
  }
}

async function expandFromEdge() {
  if (!edgeState.edge || !edgeState.hidden) return;

  try {
    const { position, size, monitor } = await getWindowGeometry();
    const visiblePosition =
      edgeState.visiblePosition || getVisibleEdgePosition(edgeState.edge, position, size, monitor);
    const visibleSize = getEdgeRestoreSize(currentWidgetWidth);

    clearEdgeTimers();
    edgeState.hidden = false;
    edgeState.expandedFromEdge = true;
    edgeState.ignoreMovedUntil = Date.now() + 900;
    setEdgeVisual(edgeState.edge, false);
    await currentWindow.setPosition(new PhysicalPosition(visiblePosition.x, visiblePosition.y));
    await currentWindow.setSize(new LogicalSize(visibleSize.width, visibleSize.height));
    await currentWindow.setSizeConstraints({
      minWidth: MIN_WIDGET_WIDTH,
      minHeight: WIDGET_HEIGHT,
    });
  } catch (error) {
    console.warn("edge expand failed", error);
  }
}

async function snapToNearbyEdge() {
  if (edgeState.hidden) return;

  try {
    const { position, size, monitor } = await getWindowGeometry();
    const edge = getEdgeSnapState(position, size, monitor);

    if (!edge) {
      edgeState.edge = null;
      edgeState.visiblePosition = null;
      edgeState.expandedFromEdge = false;
      setEdgeVisual(null, false);
      return;
    }

    const visiblePosition = getVisibleEdgePosition(edge, position, size, monitor);
    edgeState.edge = edge;
    edgeState.visiblePosition = visiblePosition;
    edgeState.expandedFromEdge = false;
    edgeState.ignoreMovedUntil = Date.now() + 600;
    setEdgeVisual(edge, false);
    await currentWindow.setPosition(new PhysicalPosition(visiblePosition.x, visiblePosition.y));
    scheduleEdgeHide();
  } catch (error) {
    console.warn("edge snap failed", error);
  }
}

function detachEdgeForManualDrag() {
  Object.assign(edgeState, getDetachedEdgeState(edgeState));
  edgeState.ignoreMovedUntil = 0;
  edgeState.suppressAutoHideUntil = Date.now() + 1400;
  setEdgeVisual(null, false);
}

function finishManualDragSoon(delay = 650) {
  clearTimeout(edgeState.manualDragTimer);
  edgeState.manualDragTimer = window.setTimeout(() => {
    edgeState.manualDragActive = false;
    edgeState.suppressAutoHideUntil = Date.now() + 900;
    scheduleEdgeSnap();
  }, delay);
}

function handleWindowMoved() {
  if (edgeState.manualDragActive) {
    finishManualDragSoon(500);
    return;
  }

  scheduleEdgeSnap();
}

async function setupEdgeHiding() {
  if (currentWindowLabel !== "main") return;

  await currentWindow.onMoved(handleWindowMoved);
  el.widgetView.addEventListener("mouseenter", expandFromEdge);
  el.widgetView.addEventListener("mouseleave", () => {
    if (shouldAutoHideOnMouseLeave(edgeState)) scheduleEdgeHide(900);
  });
}

function renderPinButton() {
  if (!el.togglePin) return;

  el.togglePin.classList.toggle("is-on", pinOnTop);
  el.togglePin.setAttribute("aria-pressed", String(pinOnTop));
  el.togglePin.setAttribute("aria-label", pinOnTop ? "取消置顶" : "置顶");
  el.togglePin.title = pinOnTop ? "取消置顶" : "置顶";
}

async function applyPinState(value, { persist = false, announce = false } = {}) {
  pinOnTop = Boolean(value);
  renderPinButton();

  if (currentWindowLabel === "main") {
    try {
      await currentWindow.setAlwaysOnTop(pinOnTop);
      if (pinOnTop) {
        await currentWindow.unminimize();
        await currentWindow.show();
      }
      if (announce) {
        setStatus(pinOnTop ? "主窗口已置顶。" : "主窗口已取消置顶。");
      }
    } catch (error) {
      setStatus(`置顶切换失败：${error}`);
    }
  }

  if (persist && store) {
    await store.set(PIN_STORE_KEY, pinOnTop);
    await store.save();
  }
}

async function togglePin() {
  await applyPinState(!pinOnTop, { persist: true, announce: true });
}

async function keepPinnedVisible() {
  if (currentWindowLabel !== "main" || !pinOnTop) return;

  try {
    if (await currentWindow.isMinimized()) {
      await currentWindow.unminimize();
      await currentWindow.show();
      await currentWindow.setAlwaysOnTop(true);
    }
  } catch (error) {
    console.warn("keep pinned visible failed", error);
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDuration(seconds) {
  const totalMinutes = Math.max(0, Math.floor(Number(seconds || 0) / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h${String(minutes).padStart(2, "0")}m`;
}

function displayAmount(value, metrics) {
  if (settings.privacyMode === "real") return formatMoney(value);
  if (settings.privacyMode === "progress") {
    return `进度 ${Math.round((metrics?.progress || 0) * 100)}%`;
  }
  if (settings.privacyMode === "alias") {
    return `咖啡 +${Math.max(1, Math.round(value / 35))} 杯`;
  }
  const rounded = Math.floor(value / 10) * 10;
  return `约 ${formatMoney(rounded)}+`;
}

function getStatusLabel(statusId) {
  return WORK_STATUSES[statusId]?.label || statusId || "自动";
}

function updateStatusMenuSelection(statusId = dayState.statusOverride || "auto") {
  for (const button of el.statusMenuButtons) {
    const active = button.dataset.status === statusId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-checked", String(active));
  }

  const label = getStatusLabel(statusId);
  el.cycleStatus.title = `状态：${label}`;
  el.cycleStatus.setAttribute("aria-label", `状态：${label}`);
  el.cycleStatus.setAttribute("aria-expanded", String(statusMenuOpen));
}

function syncForm() {
  if (!el.incomeMode) return;

  el.incomeMode.value = settings.incomeMode;
  el.incomeAmount.value = settings.incomeAmount;
  el.workDays.value = settings.workDaysPerMonth;
  el.dailyHours.value = settings.dailyHours;
  el.workMode.value = settings.workMode;
  el.workdayMode.value = settings.workdayMode;
  el.startTime.value = settings.startTime;
  el.endTime.value = settings.endTime;
  el.lunchStart.value = settings.lunchStart;
  el.lunchEnd.value = settings.lunchEnd;
  el.privacyMode.value = settings.privacyMode;
  el.statusOverride.value = dayState.statusOverride || "auto";
  updateStatusMenuSelection();
}

function readForm() {
  if (!el.incomeMode) return;

  settings = {
    ...settings,
    incomeMode: el.incomeMode.value,
    incomeAmount: Number(el.incomeAmount.value || DEFAULT_SETTINGS.incomeAmount),
    workDaysPerMonth: Number(el.workDays.value || DEFAULT_SETTINGS.workDaysPerMonth),
    dailyHours: Number(el.dailyHours.value || DEFAULT_SETTINGS.dailyHours),
    workMode: el.workMode.value,
    workdayMode: el.workdayMode.value,
    startTime: el.startTime.value || DEFAULT_SETTINGS.startTime,
    endTime: el.endTime.value || DEFAULT_SETTINGS.endTime,
    lunchStart: el.lunchStart.value || DEFAULT_SETTINGS.lunchStart,
    lunchEnd: el.lunchEnd.value || DEFAULT_SETTINGS.lunchEnd,
    privacyMode: el.privacyMode.value,
  };

  dayState = {
    ...dayState,
    statusOverride: el.statusOverride.value || "auto",
  };
}

async function persistDayState({ force = false } = {}) {
  if (!store) return;
  const now = Date.now();
  if (!force && now - lastDayStatePersistAt < 15000) return;

  lastDayStatePersistAt = now;
  await store.set(DAY_STATE_STORE_KEY, dayState);
  if (force) await store.save();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function renderCard(metrics) {
  const canvas = el.shareCard;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#f0fdfa";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#102522";
  roundRect(ctx, 40, 40, 820, 400, 18);
  ctx.fill();

  ctx.fillStyle = "#14b8a6";
  ctx.fillRect(40, 365, 820 * metrics.progress, 18);
  ctx.fillStyle = "#ffb020";
  ctx.beginPath();
  ctx.arc(760, 128, 48, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#6b4300";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(760, 128, 31, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(742, 132);
  ctx.quadraticCurveTo(760, 146, 778, 132);
  ctx.stroke();

  ctx.fillStyle = "#a7f3d0";
  ctx.font = "700 28px Segoe UI, sans-serif";
  ctx.fillText("今日打工回血战报", 84, 112);

  ctx.fillStyle = "#fff1b8";
  ctx.font = "800 76px Segoe UI, sans-serif";
  ctx.fillText(displayAmount(metrics.earned, metrics), 84, 222);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 28px Segoe UI, sans-serif";
  ctx.fillText(`每秒到账 ${formatMoney(metrics.rate)}/s`, 88, 292);
  ctx.fillText(`工作进度 ${Math.round(metrics.progress * 100)}%`, 88, 334);

  ctx.fillStyle = "#ffb020";
  ctx.font = "700 24px Segoe UI, sans-serif";
  ctx.fillText("老板不在，回款照来。", 88, 416);

  ctx.fillStyle = "#99f6e4";
  ctx.font = "20px Segoe UI, sans-serif";
  ctx.fillText("Money Counter Spike", 622, 416);
}

async function updateTrayStatus(metrics) {
  const text = `今日回血 ${displayAmount(metrics.earned, metrics)} | ${formatMoney(metrics.rate)}/s | ${Math.round(
    metrics.progress * 100,
  )}% | ${metrics.effectiveStatus.label}`;

  try {
    await invoke("update_tray_status", {
      text,
      progress: metrics.progress,
      intensity: Math.max(1, Math.min(9, Math.round(metrics.earned / 35))),
    });
  } catch (error) {
    console.warn("update tray status failed", error);
  }
}

function render() {
  dayState = advanceDayState(dayState, settings);
  const metrics = getCoreWorkMetrics(settings, dayState);
  el.earned.textContent = displayAmount(metrics.earned, metrics);
  el.rate.textContent = `${formatMoney(metrics.rate)}/s`;
  el.progress.textContent = `${Math.round(metrics.progress * 100)}%`;
  el.progressBar.style.width = `${Math.max(2, Math.round(metrics.progress * 100))}%`;
  setEdgeProgress(metrics.progress);
  setStatus(
    `状态 ${metrics.effectiveStatus.label} · 预计 ${formatMoney(metrics.estimatedToday)} · 已工作 ${formatDuration(
      metrics.paidSeconds,
    )}`,
  );
  renderCard(metrics);

  if (currentWindowLabel === "main") {
    updateTrayStatus(metrics);
    persistDayState();
    currentWindow.setTitle(
      `回血 ${displayAmount(metrics.earned, metrics)} | ${formatMoney(metrics.rate)}/s | ${Math.round(
        metrics.progress * 100,
      )}%`,
    );
  }
}

async function reloadSettings() {
  await store.reload();
  settings = {
    ...DEFAULT_SETTINGS,
    ...((await store.get("settings")) || {}),
  };
  dayState = {
    ...createInitialDayState(),
    ...((await store.get(DAY_STATE_STORE_KEY)) || {}),
  };
  syncForm();
  render();
}

async function persistSettings() {
  readForm();
  await store.set("settings", settings);
  await store.set(DAY_STATE_STORE_KEY, dayState);
  await store.save();
  await emitTo("main", "settings-changed");
  setStatus("设置已保存。主窗口会继续实时刷新。", "settings");
  render();
}

async function clearSettings() {
  settings = { ...DEFAULT_SETTINGS };
  dayState = createInitialDayState();
  await store.clear();
  await store.set(PIN_STORE_KEY, pinOnTop);
  await store.set(DAY_STATE_STORE_KEY, dayState);
  await store.save();
  await emitTo("main", "settings-changed");
  syncForm();
  setStatus("已清空本地设置并恢复默认值。", "settings");
  render();
}

async function refreshAutostart() {
  autostartEnabled = await isEnabled();
  el.toggleAutostart.textContent = `开机自启：${autostartEnabled ? "已开启" : "已关闭"}`;
}

async function toggleAutostart() {
  el.toggleAutostart.disabled = true;
  try {
    if (autostartEnabled) {
      await disable();
    } else {
      await enable();
    }
    await refreshAutostart();
    setStatus("开机自启状态已更新。", "settings");
  } finally {
    el.toggleAutostart.disabled = false;
  }
}

async function notify() {
  el.sendNotification.disabled = true;
  try {
    await invoke("send_native_notification", {
      title: "回了点血",
      body: `当前显示：${el.earned.textContent}`,
    });
    setStatus("已发送系统通知。");
  } catch (error) {
    setStatus(`通知发送失败：${error}`);
  } finally {
    el.sendNotification.disabled = false;
  }
}

async function canvasToPngBytes() {
  const blob = await new Promise((resolve, reject) => {
    el.shareCard.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error("生成分享图失败"));
    }, "image/png");
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function copyCard() {
  el.copyCard.disabled = true;
  try {
    const pngBytes = await canvasToPngBytes();
    const image = await Image.fromBytes(pngBytes);
    try {
      await writeImage(image);
    } finally {
      await image.close();
    }
    setStatus("分享图已复制到剪贴板。");
  } catch (error) {
    setStatus(`复制失败：${error}`);
  } finally {
    el.copyCard.disabled = false;
  }
}

async function saveCard() {
  el.saveCard.disabled = true;
  try {
    const path = await save({
      defaultPath: "money-counter-spike.png",
      filters: [{ name: "PNG 图片", extensions: ["png"] }],
    });

    if (!path) return;

    const bytes = Array.from(await canvasToPngBytes());
    await invoke("save_png", { path, bytes });
    setStatus(`分享图已保存：${path}`);
  } catch (error) {
    setStatus(`保存失败：${error}`);
  } finally {
    el.saveCard.disabled = false;
  }
}

async function openSettings() {
  await invoke("open_settings_window");
  setStatus("设置窗口已打开。");
}

async function closeSettings() {
  await currentWindow.close();
}

async function setStatusMenuWindowOpen(open) {
  if (currentWindowLabel !== "main" || edgeState.hidden) return;

  const width = currentWidgetWidth;
  const height = open ? WIDGET_HEIGHT + 176 : WIDGET_HEIGHT;

  try {
    await currentWindow.setSizeConstraints({
      minWidth: MIN_WIDGET_WIDTH,
      minHeight: WIDGET_HEIGHT,
    });

    if (open) {
      const { position, monitor, scaleFactor } = await getWindowGeometry();
      const workArea = monitor.workArea || monitor;
      const physicalHeight = Math.round(height * Math.max(1, scaleFactor));
      const workBottom = workArea.position.y + workArea.size.height;
      if (position.y + physicalHeight > workBottom) {
        const nextY = Math.max(workArea.position.y, workBottom - physicalHeight);
        await currentWindow.setPosition(new PhysicalPosition(position.x, nextY));
      }
    }

    await currentWindow.setSize(new LogicalSize(width, height));
  } catch (error) {
    console.warn("status menu resize failed", error);
  }
}

async function closeStatusMenu() {
  if (!statusMenuOpen) return;

  statusMenuOpen = false;
  el.statusMenu.hidden = true;
  el.widgetView.classList.remove("has-status-menu");
  updateStatusMenuSelection();
  await setStatusMenuWindowOpen(false);
}

async function openStatusMenu(event) {
  event?.stopPropagation();
  if (currentWindowLabel !== "main" || edgeState.hidden) return;

  clearEdgeTimers();
  statusMenuOpen = true;
  edgeState.suppressAutoHideUntil = Date.now() + 1400;
  el.statusMenu.hidden = false;
  el.widgetView.classList.add("has-status-menu");
  updateStatusMenuSelection();
  await setStatusMenuWindowOpen(true);
}

async function toggleStatusMenu(event) {
  event?.stopPropagation();
  if (statusMenuOpen) {
    await closeStatusMenu();
  } else {
    await openStatusMenu(event);
  }
}

async function setStatusOverride(value) {
  dayState = advanceDayState(dayState, settings);
  dayState = {
    ...dayState,
    statusOverride: value || "auto",
    lastUpdateAt: new Date().toISOString(),
  };
  syncForm();
  await persistDayState({ force: true });
  render();
}

async function cycleStatusOverride(event) {
  await toggleStatusMenu(event);
}

async function startDrag(event) {
  if (!shouldStartWindowDrag(event)) return;
  event.preventDefault();
  clearEdgeTimers();
  edgeState.manualDragActive = true;
  edgeState.suppressAutoHideUntil = Date.now() + 1400;
  if (edgeState.hidden) {
    await expandFromEdge();
  }
  if (edgeState.edge || edgeState.expandedFromEdge) {
    detachEdgeForManualDrag();
  }
  try {
    await currentWindow.startDragging();
  } finally {
    finishManualDragSoon(1200);
  }
}

async function boot() {
  currentWindow = getCurrentWindow();
  currentWindowLabel = currentWindow.label;
  const isSettingsWindow = currentWindowLabel === "settings";
  document.body.classList.toggle("is-settings-window", isSettingsWindow);
  el.widgetView.hidden = isSettingsWindow;
  el.settingsView.hidden = !isSettingsWindow;

  store = await load("settings.json", { autoSave: 100 });
  settings = {
    ...DEFAULT_SETTINGS,
    ...((await store.get("settings")) || {}),
  };
  dayState = {
    ...createInitialDayState(),
    ...((await store.get(DAY_STATE_STORE_KEY)) || {}),
  };
  pinOnTop = (await store.get(PIN_STORE_KEY)) ?? true;

  syncForm();
  render();
  await refreshAutostart();

  if (isSettingsWindow) {
    await fitSettingsWindow();
    setStatus("设置只保存在本机。", "settings");
  } else {
    await applyWindowChrome();
    await applyResponsiveWindowSize();
    await applyPinState(pinOnTop);
    await setupEdgeHiding();
    setStatus("实时状态条已就绪。");
    await listen("settings-changed", reloadSettings);
  }
}

el.openSettings.addEventListener("click", openSettings);
el.closeSettings.addEventListener("click", closeSettings);
el.saveSettings.addEventListener("click", persistSettings);
el.clearSettings.addEventListener("click", clearSettings);
el.sendNotification.addEventListener("click", notify);
el.cycleStatus.addEventListener("click", cycleStatusOverride);
el.togglePin.addEventListener("click", togglePin);
el.toggleAutostart.addEventListener("click", toggleAutostart);
el.copyCard.addEventListener("click", copyCard);
el.saveCard.addEventListener("click", saveCard);
el.hideWindow.addEventListener("click", () => invoke("hide_main_window"));
el.widgetView.addEventListener("pointerdown", startDrag);

for (const button of el.statusMenuButtons) {
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    await setStatusOverride(button.dataset.status);
    await closeStatusMenu();
  });
}

document.addEventListener("pointerdown", (event) => {
  if (!statusMenuOpen) return;
  if (el.statusMenu.contains(event.target) || el.cycleStatus.contains(event.target)) return;
  closeStatusMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeStatusMenu();
});

for (const input of [
  el.incomeMode,
  el.incomeAmount,
  el.workDays,
  el.dailyHours,
  el.workMode,
  el.workdayMode,
  el.startTime,
  el.endTime,
  el.lunchStart,
  el.lunchEnd,
  el.privacyMode,
]) {
  input.addEventListener("input", () => {
    readForm();
    render();
  });
}

el.statusOverride.addEventListener("change", () => {
  setStatusOverride(el.statusOverride.value);
});

setInterval(render, 1000);
setInterval(keepPinnedVisible, 1200);

boot().catch((error) => {
  console.error(error);
  setStatus(String(error));
  setStatus(String(error), "settings");
});
