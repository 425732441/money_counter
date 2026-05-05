import "./styles.css";

import { shouldStartWindowDrag } from "./drag.js";
import {
  DEFAULT_REMINDER_SETTINGS,
  createInitialReminderState,
  getDueReminder,
} from "./reminder-core.js";
import {
  getNotificationBlockMessage,
  getNotificationSentMessage,
  getNotificationStatusTarget,
  shouldShowNotificationSettingsLink,
} from "./notification-core.js";
import {
  DEFAULT_WORK_SETTINGS,
  WORK_STATUSES,
  advanceDayState,
  createInitialDayState,
  getWorkMetrics as getCoreWorkMetrics,
} from "./work-core.js";
import {
  buildTodayStatsRecord,
  getLocalStatsSummary,
  incrementShareCount,
  mergeLocalStatsRecord,
} from "./local-stats-core.js";
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
  ...DEFAULT_REMINDER_SETTINGS,
  workDaysPerMonth: 21.75,
  privacyMode: "blurred",
  localStatsEnabled: false,
  characterEnabled: true,
  onboardingCompleted: false,
  shareTemplate: "dailyReport",
};

const SHARE_TEMPLATES = {
  dailyReport: {
    label: "今日打工战报",
    accent: "#ffb020",
    secondary: "#14b8a6",
    surface: "#102522",
    background: "#f0fdfa",
  },
  fishingBill: {
    label: "摸鱼回血账单",
    accent: "#22d3ee",
    secondary: "#8b5cf6",
    surface: "#17133f",
    background: "#eef2ff",
  },
  offworkCard: {
    label: "下班生存卡",
    accent: "#f97316",
    secondary: "#facc15",
    surface: "#431407",
    background: "#fff7ed",
  },
};

const PIN_STORE_KEY = "pinOnTop";
const DAY_STATE_STORE_KEY = "dayState";
const REMINDER_STATE_STORE_KEY = "reminderState";
const LOCAL_STATS_STORE_KEY = "localStats";

const CHARACTER_STATE_CLASS = {
  beforeWork: "is-pause",
  working: "is-working",
  fishing: "is-fishing",
  lunch: "is-lunch",
  pause: "is-pause",
  offWork: "is-off-work",
};

const el = {
  widgetView: document.querySelector("#widget-view"),
  settingsView: document.querySelector("#settings-view"),
  statusWidget: document.querySelector("#status-widget"),
  coinMark: document.querySelector("#coin-mark"),
  characterMark: document.querySelector("#character-mark"),
  pixelCharacter: document.querySelector("#pixel-character"),
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
  localStatsEnabled: document.querySelector("#local-stats-enabled"),
  characterEnabled: document.querySelector("#character-enabled"),
  statusOverride: document.querySelector("#status-override"),
  reminderMode: document.querySelector("#reminder-mode"),
  scheduleReminders: document.querySelector("#schedule-reminders"),
  breakReminders: document.querySelector("#break-reminders"),
  reminderInterval: document.querySelector("#reminder-interval"),
  quietStart: document.querySelector("#quiet-start"),
  quietEnd: document.querySelector("#quiet-end"),
  saveSettings: document.querySelector("#save-settings"),
  clearSettings: document.querySelector("#clear-settings"),
  openSettings: document.querySelector("#open-settings"),
  closeSettings: document.querySelector("#close-settings"),
  sendNotification: document.querySelector("#send-notification"),
  openNotificationSettings: document.querySelector("#open-notification-settings"),
  cycleStatus: document.querySelector("#cycle-status"),
  statusMenu: document.querySelector("#status-menu"),
  statusMenuButtons: Array.from(document.querySelectorAll("#status-menu [data-status]")),
  shareTemplateButtons: Array.from(document.querySelectorAll("[data-share-template]")),
  togglePin: document.querySelector("#toggle-pin"),
  toggleAutostart: document.querySelector("#toggle-autostart"),
  copyCard: document.querySelector("#copy-card"),
  saveCard: document.querySelector("#save-card"),
  hideWindow: document.querySelector("#hide-window"),
  localStatsTrigger: document.querySelector("#local-stats-trigger"),
  localStatsButton: document.querySelector("#local-stats-button"),
  localStatsPanel: document.querySelector("#local-stats-panel"),
  localStatsEmpty: document.querySelector("#local-stats-empty"),
  localStatsToday: document.querySelector("#local-stats-today"),
  localStatsUsedDays: document.querySelector("#local-stats-used-days"),
  localStatsEarned: document.querySelector("#local-stats-earned"),
  localStatsFishing: document.querySelector("#local-stats-fishing"),
  localStatsRetention: document.querySelector("#local-stats-retention"),
  onboardingView: document.querySelector("#onboarding-view"),
  onboardingSteps: Array.from(document.querySelectorAll("[data-onboarding-step]")),
  onboardingIncomeMode: document.querySelector("#onboarding-income-mode"),
  onboardingIncomeAmount: document.querySelector("#onboarding-income-amount"),
  onboardingWorkdayMode: document.querySelector("#onboarding-workday-mode"),
  onboardingStartTime: document.querySelector("#onboarding-start-time"),
  onboardingEndTime: document.querySelector("#onboarding-end-time"),
  onboardingLunchStart: document.querySelector("#onboarding-lunch-start"),
  onboardingLunchEnd: document.querySelector("#onboarding-lunch-end"),
  onboardingPrivacyMode: document.querySelector("#onboarding-privacy-mode"),
  onboardingLocalStatsEnabled: document.querySelector("#onboarding-local-stats-enabled"),
  onboardingReminderMode: document.querySelector("#onboarding-reminder-mode"),
  onboardingPrev: document.querySelector("#onboarding-prev"),
  onboardingNext: document.querySelector("#onboarding-next"),
  completeOnboarding: document.querySelector("#complete-onboarding"),
  skipOnboarding: document.querySelector("#skip-onboarding"),
  desktopStatus: document.querySelector("#desktop-status"),
  settingsStatus: document.querySelector("#settings-status"),
  shareCard: document.querySelector("#share-card"),
};

let store;
let settings = { ...DEFAULT_SETTINGS };
let dayState = createInitialDayState();
let reminderState = createInitialReminderState();
let localStats = [];
let lastDayStatePersistAt = 0;
let lastReminderStatePersistAt = 0;
let lastLocalStatsPersistAt = 0;
let autostartEnabled = false;
let currentWindowLabel = "main";
let currentWindow;
let pinOnTop = true;
let currentWidgetWidth = DEFAULT_WIDGET_WIDTH;
let statusMenuOpen = false;
let localStatsPanelOpen = false;
let localStatsCloseTimer = 0;
let onboardingStep = 0;
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

function setStatus(message, target = "desktop", options = {}) {
  const node = target === "settings" ? el.settingsStatus : el.desktopStatus;
  if (node) node.textContent = message;
  if (target === "settings" && el.openNotificationSettings) {
    el.openNotificationSettings.hidden = !options.showNotificationSettingsLink;
  }
}

function setEdgeVisual(edge, hidden) {
  if (!el.statusWidget) return;

  el.statusWidget.dataset.edge = edge || "";
  el.statusWidget.classList.toggle("is-edge-hidden", Boolean(hidden));
  el.widgetView.classList.toggle("is-edge-hidden", Boolean(hidden));
  if (hidden && statusMenuOpen) closeStatusMenu();
  if (hidden && localStatsPanelOpen) closeLocalStatsPanel();
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

function clearLocalStatsCloseTimer() {
  clearTimeout(localStatsCloseTimer);
  localStatsCloseTimer = 0;
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
  if (hours <= 0) return `${minutes}分钟`;
  return `${hours}h${String(minutes).padStart(2, "0")}分钟`;
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

function displayLocalStatsAmount(summary) {
  if (settings.privacyMode === "progress") return `${summary.usedDays} 天记录`;
  return displayAmount(summary.earned, { progress: 0 });
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

function renderShareTemplateSelection() {
  const templateId = SHARE_TEMPLATES[settings.shareTemplate]
    ? settings.shareTemplate
    : DEFAULT_SETTINGS.shareTemplate;

  for (const button of el.shareTemplateButtons) {
    const active = button.dataset.shareTemplate === templateId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function updateCharacterVisibility() {
  if (!el.coinMark || !el.characterMark) return;

  el.coinMark.hidden = settings.characterEnabled;
  el.characterMark.hidden = !settings.characterEnabled;
}

function renderCharacter(status = WORK_STATUSES.working, metrics = {}) {
  updateCharacterVisibility();
  if (!el.pixelCharacter) return;

  const statusId = status?.id || "working";
  const characterState = CHARACTER_STATE_CLASS[statusId] || "is-working";
  const isOvertime =
    (statusId === "working" || statusId === "fishing") && Number(metrics.progress || 0) >= 1;

  el.pixelCharacter.className = [
    "pixel-character",
    characterState,
    isOvertime ? "is-overtime" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function selectShareTemplate(templateId) {
  if (!SHARE_TEMPLATES[templateId]) return;

  settings = {
    ...settings,
    shareTemplate: templateId,
  };
  renderShareTemplateSelection();
  render();
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
  el.localStatsEnabled.value = settings.localStatsEnabled ? "on" : "off";
  el.characterEnabled.value = settings.characterEnabled ? "on" : "off";
  el.statusOverride.value = dayState.statusOverride || "auto";
  el.reminderMode.value = settings.remindersEnabled ? "on" : "off";
  el.scheduleReminders.value = settings.scheduleRemindersEnabled ? "on" : "off";
  el.breakReminders.value = settings.breakRemindersEnabled ? "on" : "off";
  el.reminderInterval.value = settings.reminderIntervalMinutes;
  el.quietStart.value = settings.quietStart;
  el.quietEnd.value = settings.quietEnd;
  updateStatusMenuSelection();
  renderShareTemplateSelection();
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
    localStatsEnabled: el.localStatsEnabled.value === "on",
    characterEnabled: el.characterEnabled.value === "on",
    remindersEnabled: el.reminderMode.value === "on",
    scheduleRemindersEnabled: el.scheduleReminders.value === "on",
    breakRemindersEnabled: el.breakReminders.value === "on",
    reminderIntervalMinutes: Number(el.reminderInterval.value || DEFAULT_SETTINGS.reminderIntervalMinutes),
    quietStart: el.quietStart.value || DEFAULT_SETTINGS.quietStart,
    quietEnd: el.quietEnd.value || DEFAULT_SETTINGS.quietEnd,
    shareTemplate: SHARE_TEMPLATES[settings.shareTemplate]
      ? settings.shareTemplate
      : DEFAULT_SETTINGS.shareTemplate,
  };

  dayState = {
    ...dayState,
    statusOverride: el.statusOverride.value || "auto",
  };
}

function syncOnboardingForm() {
  if (!el.onboardingIncomeMode) return;

  el.onboardingIncomeMode.value = settings.incomeMode;
  el.onboardingIncomeAmount.value = settings.incomeAmount;
  el.onboardingWorkdayMode.value = settings.workdayMode;
  el.onboardingStartTime.value = settings.startTime;
  el.onboardingEndTime.value = settings.endTime;
  el.onboardingLunchStart.value = settings.lunchStart;
  el.onboardingLunchEnd.value = settings.lunchEnd;
  el.onboardingPrivacyMode.value = settings.privacyMode;
  el.onboardingLocalStatsEnabled.value = settings.localStatsEnabled ? "on" : "off";
  el.onboardingReminderMode.value = settings.remindersEnabled ? "on" : "off";
}

function readOnboardingForm() {
  if (!el.onboardingIncomeMode) return;

  settings = {
    ...settings,
    incomeMode: el.onboardingIncomeMode.value,
    incomeAmount: Number(el.onboardingIncomeAmount.value || DEFAULT_SETTINGS.incomeAmount),
    workdayMode: el.onboardingWorkdayMode.value,
    startTime: el.onboardingStartTime.value || DEFAULT_SETTINGS.startTime,
    endTime: el.onboardingEndTime.value || DEFAULT_SETTINGS.endTime,
    lunchStart: el.onboardingLunchStart.value || DEFAULT_SETTINGS.lunchStart,
    lunchEnd: el.onboardingLunchEnd.value || DEFAULT_SETTINGS.lunchEnd,
    privacyMode: el.onboardingPrivacyMode.value,
    localStatsEnabled: el.onboardingLocalStatsEnabled.value === "on",
    remindersEnabled: el.onboardingReminderMode.value === "on",
  };
}

function renderOnboarding() {
  if (!el.onboardingView) return;

  const active = currentWindowLabel === "main" && !settings.onboardingCompleted;
  el.onboardingView.hidden = !active;
  el.widgetView.classList.toggle("is-onboarding", active);
  el.statusWidget.setAttribute("aria-hidden", String(active));

  const safeStep = Math.max(0, Math.min(el.onboardingSteps.length - 1, onboardingStep));
  onboardingStep = safeStep;
  for (const step of el.onboardingSteps) {
    step.hidden = Number(step.dataset.onboardingStep) !== safeStep;
  }

  const isLastStep = safeStep === el.onboardingSteps.length - 1;
  el.onboardingPrev.disabled = safeStep === 0;
  el.onboardingNext.hidden = isLastStep;
  el.completeOnboarding.hidden = !isLastStep;
}

async function completeOnboarding() {
  readOnboardingForm();
  settings = {
    ...settings,
    onboardingCompleted: true,
  };
  await store.set("settings", settings);
  await store.save();
  await emitTo("main", "settings-changed");
  syncForm();
  renderOnboarding();
  render();
  await setOverlayWindowOpen(null);
  setStatus("首次设置已完成。");
}

async function skipOnboarding() {
  settings = {
    ...settings,
    onboardingCompleted: true,
  };
  await store.set("settings", settings);
  await store.save();
  await emitTo("main", "settings-changed");
  syncForm();
  renderOnboarding();
  render();
  await setOverlayWindowOpen(null);
  setStatus("已跳过首次设置，使用当前默认配置。");
}

async function persistDayState({ force = false } = {}) {
  if (!store) return;
  const now = Date.now();
  if (!force && now - lastDayStatePersistAt < 15000) return;

  lastDayStatePersistAt = now;
  await store.set(DAY_STATE_STORE_KEY, dayState);
  if (force) await store.save();
}

async function persistReminderState({ force = false } = {}) {
  if (!store) return;
  const now = Date.now();
  if (!force && now - lastReminderStatePersistAt < 15000) return;

  lastReminderStatePersistAt = now;
  await store.set(REMINDER_STATE_STORE_KEY, reminderState);
  if (force) await store.save();
}

function renderLocalStats() {
  if (!el.localStatsTrigger) return;

  el.localStatsTrigger.dataset.localStatsHidden = settings.localStatsEnabled ? "false" : "true";
  if (!settings.localStatsEnabled && localStatsPanelOpen) closeLocalStatsPanel();
  const summary = getLocalStatsSummary(localStats, dayState.dateKey);
  el.localStatsToday.textContent = summary.todayRecorded ? "已记录" : "暂无记录";
  el.localStatsUsedDays.textContent = `${summary.usedDays} 天`;
  el.localStatsEarned.textContent = displayLocalStatsAmount(summary);
  el.localStatsFishing.textContent = formatDuration(summary.fishingSeconds);
  el.localStatsRetention.textContent = `最近 ${summary.retentionDays} 天`;
  el.localStatsEmpty.hidden = summary.hasRecords;
}

async function persistLocalStats(metrics, { force = false } = {}) {
  if (!store || !settings.localStatsEnabled) return;

  const now = Date.now();
  if (!force && now - lastLocalStatsPersistAt < 60000) return;

  const existingRecord = localStats.find((record) => record.date === dayState.dateKey) || {};
  const record = buildTodayStatsRecord({
    dateKey: dayState.dateKey,
    metrics,
    existingRecord,
    now: new Date(now),
  });

  localStats = mergeLocalStatsRecord(localStats, record);
  lastLocalStatsPersistAt = now;
  await store.set(LOCAL_STATS_STORE_KEY, localStats);
  if (force) await store.save();
  renderLocalStats();
}

async function recordShareAction() {
  if (!store || !settings.localStatsEnabled) return;

  localStats = incrementShareCount(localStats, dayState.dateKey);
  await store.set(LOCAL_STATS_STORE_KEY, localStats);
  await store.save();
  renderLocalStats();
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

function fillRoundedRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle;
  roundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

function renderCardShell(ctx, template) {
  ctx.fillStyle = template.background;
  ctx.fillRect(0, 0, 900, 480);
  fillRoundedRect(ctx, 40, 40, 820, 400, 22, template.surface);

  ctx.fillStyle = template.secondary;
  ctx.globalAlpha = 0.16;
  ctx.beginPath();
  ctx.arc(760, 110, 180, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function renderDailyReportCard(ctx, metrics) {
  const template = SHARE_TEMPLATES.dailyReport;
  renderCardShell(ctx, template);

  ctx.fillStyle = template.secondary;
  ctx.fillRect(40, 365, 820 * metrics.progress, 18);
  ctx.fillStyle = template.accent;
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

  ctx.fillStyle = template.accent;
  ctx.font = "700 24px Segoe UI, sans-serif";
  ctx.fillText("老板不在，回款照来。", 88, 416);
}

function renderFishingBillCard(ctx, metrics) {
  const template = SHARE_TEMPLATES.fishingBill;
  const fishingEarned = metrics.fishingSeconds * metrics.rate;
  renderCardShell(ctx, template);

  fillRoundedRect(ctx, 84, 148, 324, 118, 18, "rgba(34, 211, 238, 0.16)");
  fillRoundedRect(ctx, 440, 148, 300, 118, 18, "rgba(139, 92, 246, 0.22)");
  ctx.fillStyle = template.accent;
  ctx.fillRect(84, 350, Math.max(18, 650 * Math.min(1, metrics.fishingSeconds / Math.max(1, metrics.paidSeconds))), 18);

  ctx.fillStyle = "#c4b5fd";
  ctx.font = "800 28px Segoe UI, sans-serif";
  ctx.fillText("摸鱼回血账单", 84, 112);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 54px Segoe UI, sans-serif";
  ctx.fillText(formatDuration(metrics.fishingSeconds), 108, 220);
  ctx.fillText(displayAmount(fishingEarned, metrics), 464, 220);

  ctx.fillStyle = "#a5f3fc";
  ctx.font = "700 22px Segoe UI, sans-serif";
  ctx.fillText("摸鱼时长", 108, 250);
  ctx.fillText("摸鱼回血", 464, 250);

  ctx.fillStyle = template.accent;
  ctx.font = "700 26px Segoe UI, sans-serif";
  ctx.fillText("这不是走神，是现金流管理。", 88, 416);
}

function renderOffworkCard(ctx, metrics) {
  const template = SHARE_TEMPLATES.offworkCard;
  const remainingSeconds = Math.max(0, metrics.plannedSeconds - metrics.paidSeconds);
  renderCardShell(ctx, template);

  const gradient = ctx.createLinearGradient(72, 84, 808, 396);
  gradient.addColorStop(0, "#f97316");
  gradient.addColorStop(1, "#facc15");
  fillRoundedRect(ctx, 84, 305, 680, 20, 10, "rgba(255, 255, 255, 0.22)");
  fillRoundedRect(ctx, 84, 305, 680 * metrics.progress, 20, 10, gradient);

  ctx.fillStyle = "#fed7aa";
  ctx.font = "800 28px Segoe UI, sans-serif";
  ctx.fillText("下班生存卡", 84, 112);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 72px Segoe UI, sans-serif";
  ctx.fillText(remainingSeconds > 0 ? formatDuration(remainingSeconds) : "已收工", 84, 222);

  ctx.fillStyle = "#ffedd5";
  ctx.font = "700 28px Segoe UI, sans-serif";
  ctx.fillText(`今日回血 ${displayAmount(metrics.earned, metrics)}`, 88, 274);
  ctx.fillText(`生存进度 ${Math.round(metrics.progress * 100)}%`, 88, 360);

  ctx.fillStyle = template.secondary;
  ctx.font = "700 26px Segoe UI, sans-serif";
  ctx.fillText("今日份工位生存，接近通关。", 88, 416);
}

function renderCardBrand(ctx, template) {
  ctx.fillStyle = template.secondary;
  ctx.font = "20px Segoe UI, sans-serif";
  ctx.fillText("Money Counter Spike", 622, 416);
}

function renderCard(metrics) {
  const canvas = el.shareCard;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const templateId = SHARE_TEMPLATES[settings.shareTemplate]
    ? settings.shareTemplate
    : DEFAULT_SETTINGS.shareTemplate;
  if (templateId === "fishingBill") {
    renderFishingBillCard(ctx, metrics);
  } else if (templateId === "offworkCard") {
    renderOffworkCard(ctx, metrics);
  } else {
    renderDailyReportCard(ctx, metrics);
  }
  renderCardBrand(ctx, SHARE_TEMPLATES[templateId]);
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

async function maybeSendReminder() {
  if (currentWindowLabel !== "main") return;

  const result = getDueReminder({
    now: new Date(),
    settings,
    workSettings: settings,
    dayState,
    reminderState,
  });

  reminderState = result.nextState;
  if (!result.reminder) {
    persistReminderState();
    return;
  }

  persistReminderState({ force: true });
  try {
    const notificationResult = await sendCheckedNativeNotification({
      title: result.reminder.title,
      body: result.reminder.body,
    });
    setStatus(
      notificationResult.sent ? `提醒：${result.reminder.title}` : notificationResult.message,
    );
  } catch (error) {
    console.warn("send reminder failed", error);
    setStatus(`提醒发送失败：${error}`);
  }
}

function render() {
  dayState = advanceDayState(dayState, settings);
  const metrics = getCoreWorkMetrics(settings, dayState);
  const onboardingActive = currentWindowLabel === "main" && !settings.onboardingCompleted;
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
  renderLocalStats();
  renderCharacter(metrics.effectiveStatus, metrics);
  renderOnboarding();

  if (onboardingActive) return;

  if (currentWindowLabel === "main") {
    updateTrayStatus(metrics);
    persistDayState();
    persistLocalStats(metrics);
    maybeSendReminder();
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
  reminderState = {
    ...createInitialReminderState(),
    ...((await store.get(REMINDER_STATE_STORE_KEY)) || {}),
  };
  localStats = (await store.get(LOCAL_STATS_STORE_KEY)) || [];
  syncForm();
  syncOnboardingForm();
  render();
  if (currentWindowLabel === "main") {
    await setOverlayWindowOpen(settings.onboardingCompleted ? null : "onboarding");
  }
}

async function persistSettings() {
  readForm();
  await store.set("settings", settings);
  await store.set(DAY_STATE_STORE_KEY, dayState);
  await store.set(REMINDER_STATE_STORE_KEY, reminderState);
  await store.set(LOCAL_STATS_STORE_KEY, localStats);
  await store.save();
  await emitTo("main", "settings-changed");
  setStatus("设置已保存。主窗口会继续实时刷新。", "settings");
  render();
}

async function clearSettings() {
  settings = { ...DEFAULT_SETTINGS };
  dayState = createInitialDayState();
  reminderState = createInitialReminderState();
  localStats = [];
  await store.clear();
  await store.set(PIN_STORE_KEY, pinOnTop);
  await store.set(DAY_STATE_STORE_KEY, dayState);
  await store.set(REMINDER_STATE_STORE_KEY, reminderState);
  await store.set(LOCAL_STATS_STORE_KEY, localStats);
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

async function sendCheckedNativeNotification({ title, body }) {
  const diagnostics = await invoke("get_notification_diagnostics");
  const blockMessage = getNotificationBlockMessage(diagnostics);
  if (blockMessage) {
    return {
      sent: false,
      message: blockMessage,
      diagnostics,
      showSettingsLink: shouldShowNotificationSettingsLink(diagnostics),
    };
  }

  const sentDiagnostics = await invoke("send_native_notification", { title, body });
  return {
    sent: true,
    message: getNotificationSentMessage(sentDiagnostics || diagnostics),
    diagnostics: sentDiagnostics || diagnostics,
    showSettingsLink: false,
  };
}

async function openNotificationSettings() {
  el.openNotificationSettings.disabled = true;
  try {
    await invoke("open_notification_settings");
    setStatus("已打开 Windows 通知设置。", "settings", {
      showNotificationSettingsLink: true,
    });
  } catch (error) {
    setStatus(`无法打开通知设置：${error}`, "settings", {
      showNotificationSettingsLink: true,
    });
  } finally {
    el.openNotificationSettings.disabled = false;
  }
}

async function notify() {
  const target = getNotificationStatusTarget(currentWindowLabel);
  el.sendNotification.disabled = true;
  setStatus("正在检查系统通知。", target);
  try {
    const result = await sendCheckedNativeNotification({
      title: "回了点血",
      body: `当前显示：${el.earned.textContent}`,
    });
    setStatus(result.message, target, {
      showNotificationSettingsLink: result.showSettingsLink,
    });
  } catch (error) {
    setStatus(`通知发送失败：${error}`, target);
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
    await recordShareAction();
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
    await recordShareAction();
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

async function setOverlayWindowOpen(type) {
  if (currentWindowLabel !== "main" || edgeState.hidden) return;

  const width = currentWidgetWidth;
  const overlayHeights = {
    statusMenu: 176,
    localStats: 190,
    onboarding: 334,
  };
  const height = type ? WIDGET_HEIGHT + overlayHeights[type] : WIDGET_HEIGHT;

  try {
    await currentWindow.setSizeConstraints({
      minWidth: MIN_WIDGET_WIDTH,
      minHeight: WIDGET_HEIGHT,
    });

    if (type) {
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
    console.warn("overlay resize failed", error);
  }
}

async function closeStatusMenu({ resize = true } = {}) {
  if (!statusMenuOpen) return;

  statusMenuOpen = false;
  el.statusMenu.hidden = true;
  el.widgetView.classList.remove("has-status-menu");
  updateStatusMenuSelection();
  if (resize) await setOverlayWindowOpen(localStatsPanelOpen ? "localStats" : null);
}

async function openStatusMenu(event) {
  event?.stopPropagation();
  if (currentWindowLabel !== "main" || edgeState.hidden || !settings.onboardingCompleted) return;

  clearEdgeTimers();
  await closeLocalStatsPanel({ resize: false });
  statusMenuOpen = true;
  edgeState.suppressAutoHideUntil = Date.now() + 1400;
  el.statusMenu.hidden = false;
  el.widgetView.classList.add("has-status-menu");
  updateStatusMenuSelection();
  await setOverlayWindowOpen("statusMenu");
}

async function toggleStatusMenu(event) {
  event?.stopPropagation();
  if (statusMenuOpen) {
    await closeStatusMenu();
  } else {
    await openStatusMenu(event);
  }
}

async function closeLocalStatsPanel({ resize = true } = {}) {
  clearLocalStatsCloseTimer();
  if (!localStatsPanelOpen) return;

  localStatsPanelOpen = false;
  el.localStatsPanel.hidden = true;
  el.widgetView.classList.remove("has-local-stats-panel");
  if (resize) await setOverlayWindowOpen(statusMenuOpen ? "statusMenu" : null);
}

async function openLocalStatsPanel(event) {
  event?.stopPropagation();
  if (
    currentWindowLabel !== "main" ||
    edgeState.hidden ||
    !settings.onboardingCompleted ||
    !settings.localStatsEnabled
  ) {
    return;
  }

  clearLocalStatsCloseTimer();
  clearEdgeTimers();
  await closeStatusMenu({ resize: false });
  localStatsPanelOpen = true;
  edgeState.suppressAutoHideUntil = Date.now() + 1400;
  el.localStatsPanel.hidden = false;
  el.widgetView.classList.add("has-local-stats-panel");
  renderLocalStats();
  await setOverlayWindowOpen("localStats");
}

function scheduleCloseLocalStatsPanel() {
  clearLocalStatsCloseTimer();
  localStatsCloseTimer = window.setTimeout(() => {
    const activeElement = document.activeElement;
    const stillInteractive =
      el.localStatsTrigger.matches(":hover") ||
      el.localStatsPanel.matches(":hover") ||
      el.localStatsTrigger.contains(activeElement) ||
      el.localStatsPanel.contains(activeElement);

    if (!stillInteractive) closeLocalStatsPanel();
  }, 120);
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
  reminderState = {
    ...createInitialReminderState(),
    ...((await store.get(REMINDER_STATE_STORE_KEY)) || {}),
  };
  localStats = (await store.get(LOCAL_STATS_STORE_KEY)) || [];
  pinOnTop = (await store.get(PIN_STORE_KEY)) ?? true;

  syncForm();
  syncOnboardingForm();
  render();
  await refreshAutostart();

  if (isSettingsWindow) {
    await fitSettingsWindow();
    setStatus("设置只保存在本机。", "settings");
  } else {
    await applyWindowChrome();
    await applyResponsiveWindowSize();
    await setOverlayWindowOpen(settings.onboardingCompleted ? null : "onboarding");
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
el.openNotificationSettings.addEventListener("click", openNotificationSettings);
el.cycleStatus.addEventListener("click", cycleStatusOverride);
el.togglePin.addEventListener("click", togglePin);
el.toggleAutostart.addEventListener("click", toggleAutostart);
el.copyCard.addEventListener("click", copyCard);
el.saveCard.addEventListener("click", saveCard);
el.hideWindow.addEventListener("click", () => invoke("hide_main_window"));
el.widgetView.addEventListener("pointerdown", startDrag);
el.onboardingPrev.addEventListener("click", () => {
  onboardingStep -= 1;
  renderOnboarding();
});
el.onboardingNext.addEventListener("click", () => {
  readOnboardingForm();
  onboardingStep += 1;
  renderOnboarding();
});
el.completeOnboarding.addEventListener("click", completeOnboarding);
el.skipOnboarding.addEventListener("click", skipOnboarding);

for (const button of el.statusMenuButtons) {
  button.addEventListener("click", async (event) => {
    event.stopPropagation();
    await setStatusOverride(button.dataset.status);
    await closeStatusMenu();
  });
}

for (const button of el.shareTemplateButtons) {
  button.addEventListener("click", () => {
    selectShareTemplate(button.dataset.shareTemplate);
  });
}

document.addEventListener("pointerdown", (event) => {
  if (
    statusMenuOpen &&
    !el.statusMenu.contains(event.target) &&
    !el.cycleStatus.contains(event.target)
  ) {
    closeStatusMenu();
  }
  if (
    localStatsPanelOpen &&
    !el.localStatsPanel.contains(event.target) &&
    !el.localStatsTrigger.contains(event.target)
  ) {
    closeLocalStatsPanel();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeStatusMenu();
    closeLocalStatsPanel();
  }
});

for (const node of [el.localStatsTrigger, el.localStatsPanel]) {
  node.addEventListener("mouseenter", openLocalStatsPanel);
  node.addEventListener("mouseleave", scheduleCloseLocalStatsPanel);
  node.addEventListener("focusin", openLocalStatsPanel);
  node.addEventListener("focusout", scheduleCloseLocalStatsPanel);
}

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
  el.localStatsEnabled,
  el.characterEnabled,
  el.reminderMode,
  el.scheduleReminders,
  el.breakReminders,
  el.reminderInterval,
  el.quietStart,
  el.quietEnd,
]) {
  input.addEventListener("input", () => {
    readForm();
    render();
  });
}

for (const input of [
  el.onboardingIncomeMode,
  el.onboardingIncomeAmount,
  el.onboardingWorkdayMode,
  el.onboardingStartTime,
  el.onboardingEndTime,
  el.onboardingLunchStart,
  el.onboardingLunchEnd,
  el.onboardingPrivacyMode,
  el.onboardingLocalStatsEnabled,
  el.onboardingReminderMode,
]) {
  input.addEventListener("input", () => {
    readOnboardingForm();
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
