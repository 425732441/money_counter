const RETENTION_DAYS = 30;
const SUMMARY_DAYS = 7;
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function safeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function isDateKey(value) {
  return DATE_KEY_PATTERN.test(String(value || ""));
}

function normalizeRecord(record = {}) {
  if (!isDateKey(record.date)) return null;

  return {
    date: record.date,
    used: record.used === true,
    paidSeconds: safeNumber(record.paidSeconds),
    fishingSeconds: safeNumber(record.fishingSeconds),
    earned: safeNumber(record.earned),
    shareCount: safeNumber(record.shareCount),
    updatedAt: record.updatedAt || new Date(0).toISOString(),
  };
}

function getSortedRecords(records = []) {
  const byDate = new Map();

  for (const record of Array.isArray(records) ? records : []) {
    const normalized = normalizeRecord(record);
    if (normalized) byDate.set(normalized.date, normalized);
  }

  return Array.from(byDate.values()).sort((left, right) => left.date.localeCompare(right.date));
}

export function mergeLocalStatsRecord(records = [], record = {}) {
  const normalized = normalizeRecord(record);
  if (!normalized) return getSortedRecords(records).slice(-RETENTION_DAYS);

  return getSortedRecords([...records, normalized]).slice(-RETENTION_DAYS);
}

export function buildTodayStatsRecord({ dateKey, metrics = {}, existingRecord = {}, now = new Date() }) {
  return {
    date: dateKey,
    used: true,
    paidSeconds: safeNumber(metrics.paidSeconds),
    fishingSeconds: safeNumber(metrics.fishingSeconds),
    earned: safeNumber(metrics.earned),
    shareCount: safeNumber(existingRecord.shareCount),
    updatedAt: now.toISOString(),
  };
}

export function incrementShareCount(records = [], dateKey, now = new Date()) {
  const existing = getSortedRecords(records).find((record) => record.date === dateKey);
  const record = {
    ...(existing || {
      date: dateKey,
      used: true,
      paidSeconds: 0,
      fishingSeconds: 0,
      earned: 0,
      shareCount: 0,
    }),
    used: true,
    shareCount: safeNumber(existing?.shareCount) + 1,
    updatedAt: now.toISOString(),
  };

  return mergeLocalStatsRecord(records, record);
}

export function getLocalStatsSummary(records = [], todayKey = null) {
  const latest = getSortedRecords(records).slice(-SUMMARY_DAYS);
  const usedRecords = latest.filter((record) => record.used);
  const fallbackToday = latest.at(-1)?.date || "";
  const currentTodayKey = todayKey || fallbackToday;

  return {
    hasRecords: usedRecords.length > 0,
    todayRecorded: usedRecords.some((record) => record.date === currentTodayKey),
    usedDays: usedRecords.length,
    earned: usedRecords.reduce((total, record) => total + safeNumber(record.earned), 0),
    fishingSeconds: usedRecords.reduce((total, record) => total + safeNumber(record.fishingSeconds), 0),
    retentionDays: RETENTION_DAYS,
  };
}
