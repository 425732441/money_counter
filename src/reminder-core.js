import { getDateKey, parseTimeToMinutes } from "./work-core.js";

export const DEFAULT_REMINDER_SETTINGS = {
  remindersEnabled: false,
  scheduleRemindersEnabled: true,
  breakRemindersEnabled: true,
  reminderIntervalMinutes: 90,
  quietStart: "22:00",
  quietEnd: "08:00",
};

const REMINDERS = {
  workStart: {
    id: "workStart",
    title: "开工",
    body: "回血计时开始，先稳住节奏。",
  },
  lunch: {
    id: "lunch",
    title: "午休",
    body: "到点歇一会，回血不是硬扛。",
  },
  offWorkSoon: {
    id: "offWorkSoon",
    title: "快下班",
    body: "最后十分钟，准备收尾。",
  },
  break: {
    id: "break",
    title: "休息",
    body: "起来动一下，顺手喝口水。",
  },
};

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeReminderSettings(settings = {}) {
  return {
    ...DEFAULT_REMINDER_SETTINGS,
    ...settings,
    remindersEnabled: Boolean(settings.remindersEnabled),
    scheduleRemindersEnabled: settings.scheduleRemindersEnabled !== false,
    breakRemindersEnabled: settings.breakRemindersEnabled !== false,
    reminderIntervalMinutes: numberOrDefault(settings.reminderIntervalMinutes, 90),
  };
}

function minutesNow(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function isSameMinuteWindow(current, target, duration = 15) {
  return current >= target && current < target + duration;
}

function isQuietTime(date, settings) {
  const start = parseTimeToMinutes(settings.quietStart);
  const end = parseTimeToMinutes(settings.quietEnd);
  if (start === end) return false;

  const current = minutesNow(date);
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

function normalizeState(reminderState, now) {
  const dateKey = getDateKey(now);
  if (reminderState?.dateKey === dateKey) {
    return {
      dateKey,
      sentKeys: Array.isArray(reminderState.sentKeys) ? reminderState.sentKeys : [],
      lastBreakReminderAt: reminderState.lastBreakReminderAt || now.toISOString(),
    };
  }

  return createInitialReminderState(now);
}

function wasSent(state, id) {
  return state.sentKeys.includes(`${state.dateKey}:${id}`);
}

function markSent(state, reminder, now) {
  const sentKey = `${state.dateKey}:${reminder.id}`;
  const sentKeys = wasSent(state, reminder.id) ? state.sentKeys : [...state.sentKeys, sentKey];
  return {
    ...state,
    sentKeys,
    lastBreakReminderAt: reminder.id === "break" ? now.toISOString() : state.lastBreakReminderAt,
  };
}

function getScheduleReminder(now, settings, workSettings, state) {
  if (!settings.scheduleRemindersEnabled) return null;

  const current = minutesNow(now);
  const start = parseTimeToMinutes(workSettings.startTime);
  const lunchStart = parseTimeToMinutes(workSettings.lunchStart);
  const end = parseTimeToMinutes(workSettings.endTime);

  if (!wasSent(state, "workStart") && isSameMinuteWindow(current, start)) {
    return REMINDERS.workStart;
  }
  if (!wasSent(state, "lunch") && isSameMinuteWindow(current, lunchStart, 10)) {
    return REMINDERS.lunch;
  }
  if (!wasSent(state, "offWorkSoon") && isSameMinuteWindow(current, Math.max(0, end - 10), 10)) {
    return REMINDERS.offWorkSoon;
  }

  return null;
}

function getBreakReminder(now, settings, state, dayState) {
  if (!settings.breakRemindersEnabled) return null;

  const statusId = dayState?.effectiveStatus?.id || dayState?.statusOverride;
  if (statusId !== "working" && statusId !== "fishing") return null;

  const last = new Date(state.lastBreakReminderAt || now);
  const elapsedMinutes = (now.getTime() - last.getTime()) / 60000;
  return elapsedMinutes >= settings.reminderIntervalMinutes ? REMINDERS.break : null;
}

export function createInitialReminderState(nowDate = new Date()) {
  return {
    dateKey: getDateKey(nowDate),
    sentKeys: [],
    lastBreakReminderAt: nowDate.toISOString(),
  };
}

export function getDueReminder({
  now = new Date(),
  settings = {},
  workSettings = {},
  dayState = {},
  reminderState = createInitialReminderState(now),
} = {}) {
  const normalizedSettings = normalizeReminderSettings(settings);
  const state = normalizeState(reminderState, now);
  if (!normalizedSettings.remindersEnabled || isQuietTime(now, normalizedSettings)) {
    return { reminder: null, nextState: state };
  }

  const reminder =
    getScheduleReminder(now, normalizedSettings, workSettings, state) ||
    getBreakReminder(now, normalizedSettings, state, dayState);

  return {
    reminder,
    nextState: reminder ? markSent(state, reminder, now) : state,
  };
}
