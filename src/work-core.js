export const DEFAULT_WORK_SETTINGS = {
  incomeMode: "monthly",
  incomeAmount: 12000,
  workDaysPerMonth: 21.75,
  workMode: "standard",
  workdayMode: "weekdays",
  dailyHours: 8,
  startTime: "09:00",
  endTime: "18:00",
  lunchStart: "12:00",
  lunchEnd: "13:30",
};

export const WORK_STATUSES = {
  auto: { id: "auto", label: "自动", countsPaid: null },
  beforeWork: { id: "beforeWork", label: "未开工", countsPaid: false },
  working: { id: "working", label: "开工", countsPaid: true },
  fishing: { id: "fishing", label: "摸鱼", countsPaid: true },
  lunch: { id: "lunch", label: "午休", countsPaid: false },
  pause: { id: "pause", label: "暂停", countsPaid: false },
  offWork: { id: "offWork", label: "收工", countsPaid: false },
};

function numberOrDefault(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function normalizeSettings(settings = {}) {
  return {
    ...DEFAULT_WORK_SETTINGS,
    ...settings,
    incomeAmount: numberOrDefault(settings.incomeAmount ?? settings.monthlySalary, 12000),
    workDaysPerMonth: numberOrDefault(settings.workDaysPerMonth ?? settings.workDays, 21.75),
    dailyHours: numberOrDefault(settings.dailyHours, 8),
  };
}

export function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseTimeToMinutes(value) {
  const [hours = "0", minutes = "0"] = String(value || "00:00").split(":");
  const parsedHours = Math.max(0, Math.min(23, Number(hours) || 0));
  const parsedMinutes = Math.max(0, Math.min(59, Number(minutes) || 0));
  return parsedHours * 60 + parsedMinutes;
}

function dateAtMinutes(date, minutes) {
  const result = new Date(date);
  result.setHours(0, minutes, 0, 0);
  return result;
}

function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function secondsBetween(start, end) {
  return Math.max(0, (end.getTime() - start.getTime()) / 1000);
}

function overlapsInSeconds(start, end, intervalStart, intervalEnd) {
  const overlapStart = new Date(Math.max(start.getTime(), intervalStart.getTime()));
  const overlapEnd = new Date(Math.min(end.getTime(), intervalEnd.getTime()));
  return secondsBetween(overlapStart, overlapEnd);
}

export function isWorkingDay(date, settings = {}) {
  const { workdayMode } = normalizeSettings(settings);
  const day = date.getDay();

  if (workdayMode === "all") return true;
  if (workdayMode === "singleRest") return day >= 1 && day <= 6;
  return day >= 1 && day <= 5;
}

function getStandardWorkIntervals(settings, date) {
  const normalized = normalizeSettings(settings);
  if (!isWorkingDay(date, normalized)) return [];

  const start = parseTimeToMinutes(normalized.startTime);
  const end = parseTimeToMinutes(normalized.endTime);
  const lunchStart = parseTimeToMinutes(normalized.lunchStart);
  const lunchEnd = parseTimeToMinutes(normalized.lunchEnd);

  if (end <= start) return [];

  const intervals = [];
  if (lunchStart > start) {
    intervals.push([dateAtMinutes(date, start), dateAtMinutes(date, Math.min(lunchStart, end))]);
  }
  if (lunchEnd < end) {
    intervals.push([dateAtMinutes(date, Math.max(lunchEnd, start)), dateAtMinutes(date, end)]);
  }

  return intervals.filter(([from, to]) => to > from);
}

export function getPlannedWorkSeconds(settings = {}, date = new Date()) {
  const normalized = normalizeSettings(settings);
  if (!isWorkingDay(date, normalized)) return 0;
  if (normalized.workMode === "flexible") return normalized.dailyHours * 3600;

  return getStandardWorkIntervals(normalized, date).reduce(
    (total, [start, end]) => total + secondsBetween(start, end),
    0,
  );
}

export function calculateIncomeRate(settings = {}) {
  const normalized = normalizeSettings(settings);
  const dailySeconds = Math.max(1, normalized.dailyHours * 3600);

  if (normalized.incomeMode === "hourly") {
    return normalized.incomeAmount / 3600;
  }
  if (normalized.incomeMode === "daily") {
    return normalized.incomeAmount / dailySeconds;
  }
  return normalized.incomeAmount / Math.max(1, normalized.workDaysPerMonth) / dailySeconds;
}

export function getPaidSecondsBetween(startDate, endDate, settings = {}) {
  const normalized = normalizeSettings(settings);
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) return 0;

  let total = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    for (const [intervalStart, intervalEnd] of getStandardWorkIntervals(normalized, cursor)) {
      total += overlapsInSeconds(start, end, intervalStart, intervalEnd);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
}

function getAutoPaidSecondsUntil(nowDate = new Date(), settings = {}) {
  const normalized = normalizeSettings(settings);
  const now = new Date(nowDate);
  if (!isWorkingDay(now, normalized)) return 0;

  if (normalized.workMode === "flexible") {
    const start = dateAtMinutes(now, parseTimeToMinutes(normalized.startTime));
    return Math.min(normalized.dailyHours * 3600, secondsBetween(start, now));
  }

  return getPaidSecondsBetween(startOfDay(now), now, normalized);
}

export function getAutoStatus(nowDate = new Date(), settings = {}, dayState = {}) {
  const normalized = normalizeSettings(settings);
  const now = new Date(nowDate);

  if (!isWorkingDay(now, normalized)) return WORK_STATUSES.offWork;

  const start = parseTimeToMinutes(normalized.startTime);
  const end = parseTimeToMinutes(normalized.endTime);
  const current = now.getHours() * 60 + now.getMinutes();

  if (current < start) return WORK_STATUSES.beforeWork;

  if (normalized.workMode === "flexible") {
    return Number(dayState.paidSeconds || 0) >= normalized.dailyHours * 3600
      ? WORK_STATUSES.offWork
      : WORK_STATUSES.working;
  }

  const lunchStart = parseTimeToMinutes(normalized.lunchStart);
  const lunchEnd = parseTimeToMinutes(normalized.lunchEnd);

  if (current >= end) return WORK_STATUSES.offWork;
  if (current >= lunchStart && current < lunchEnd) return WORK_STATUSES.lunch;
  return WORK_STATUSES.working;
}

export function createInitialDayState(nowDate = new Date(), statusOverride = "auto") {
  return {
    dateKey: getDateKey(nowDate),
    paidSeconds: 0,
    fishingSeconds: 0,
    lastUpdateAt: nowDate.toISOString(),
    statusOverride,
  };
}

function getManualPaidSecondsBetween(start, end, statusOverride) {
  if (statusOverride === "working" || statusOverride === "fishing") {
    return secondsBetween(start, end);
  }
  return 0;
}

export function advanceDayState(previousState, settings = {}, nowDate = new Date()) {
  const now = new Date(nowDate);
  const dateKey = getDateKey(now);
  const previous =
    previousState && previousState.dateKey === dateKey
      ? previousState
      : createInitialDayState(now, "auto");

  const statusOverride = previous.statusOverride || "auto";
  const lastUpdate = new Date(previous.lastUpdateAt || now);
  const intervalStart = getDateKey(lastUpdate) === dateKey ? lastUpdate : now;
  const elapsedSeconds = getManualPaidSecondsBetween(intervalStart, now, statusOverride);
  const fishingSeconds = statusOverride === "fishing" ? secondsBetween(intervalStart, now) : 0;
  const paidSeconds =
    statusOverride === "auto"
      ? getAutoPaidSecondsUntil(now, settings)
      : Math.max(0, Number(previous.paidSeconds || 0) + elapsedSeconds);
  const next = {
    ...previous,
    dateKey,
    paidSeconds,
    fishingSeconds: Math.max(0, Number(previous.fishingSeconds || 0) + fishingSeconds),
    lastUpdateAt: now.toISOString(),
    statusOverride,
  };

  return {
    ...next,
    effectiveStatus:
      statusOverride === "auto"
        ? getAutoStatus(now, settings, next)
        : WORK_STATUSES[statusOverride] || WORK_STATUSES.auto,
  };
}

export function getWorkMetrics(settings = {}, dayState = createInitialDayState()) {
  const normalized = normalizeSettings(settings);
  const rate = calculateIncomeRate(normalized);
  const plannedSeconds = getPlannedWorkSeconds(normalized, new Date(`${dayState.dateKey}T12:00:00`));
  const paidSeconds = Math.max(0, Number(dayState.paidSeconds || 0));

  return {
    rate,
    earned: paidSeconds * rate,
    estimatedToday: plannedSeconds * rate,
    paidSeconds,
    fishingSeconds: Math.max(0, Number(dayState.fishingSeconds || 0)),
    plannedSeconds,
    progress: plannedSeconds > 0 ? Math.min(1, paidSeconds / plannedSeconds) : 0,
    effectiveStatus: dayState.effectiveStatus || WORK_STATUSES.auto,
  };
}
