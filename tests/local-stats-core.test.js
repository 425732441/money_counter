import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildTodayStatsRecord,
  getLocalStatsSummary,
  incrementShareCount,
  mergeLocalStatsRecord,
} from "../src/local-stats-core.js";

describe("local stats records", () => {
  it("merges the current day and keeps only the latest 30 dates", () => {
    const existing = Array.from({ length: 31 }, (_, index) => {
      const date = new Date("2026-04-01T10:00:00.000Z");
      date.setUTCDate(date.getUTCDate() + index);
      const dateKey = date.toISOString().slice(0, 10);

      return {
        date: dateKey,
        used: true,
        paidSeconds: index,
        fishingSeconds: 0,
        earned: index,
        shareCount: 0,
        updatedAt: `${dateKey}T10:00:00.000Z`,
      };
    });

    const next = mergeLocalStatsRecord(existing, {
      date: "2026-04-30",
      used: true,
      paidSeconds: 999,
      fishingSeconds: 120,
      earned: 88.5,
      shareCount: 2,
      updatedAt: "2026-04-30T12:00:00.000Z",
    });

    assert.equal(next.length, 30);
    assert.equal(next[0].date, "2026-04-02");
    assert.equal(next.at(-1).date, "2026-05-01");
    assert.deepEqual(
      next.find((record) => record.date === "2026-04-30"),
      {
        date: "2026-04-30",
        used: true,
        paidSeconds: 999,
        fishingSeconds: 120,
        earned: 88.5,
        shareCount: 2,
        updatedAt: "2026-04-30T12:00:00.000Z",
      },
    );
  });

  it("builds a safe today record from metrics", () => {
    const record = buildTodayStatsRecord({
      dateKey: "2026-05-03",
      metrics: { paidSeconds: 3600, fishingSeconds: 600, earned: 123.45 },
      existingRecord: { shareCount: 3 },
      now: new Date("2026-05-03T09:30:00.000Z"),
    });

    assert.deepEqual(record, {
      date: "2026-05-03",
      used: true,
      paidSeconds: 3600,
      fishingSeconds: 600,
      earned: 123.45,
      shareCount: 3,
      updatedAt: "2026-05-03T09:30:00.000Z",
    });
  });

  it("increments share count for the target date", () => {
    const next = incrementShareCount(
      [
        {
          date: "2026-05-03",
          used: true,
          paidSeconds: 1,
          fishingSeconds: 0,
          earned: 1,
          shareCount: 1,
          updatedAt: "2026-05-03T09:00:00.000Z",
        },
      ],
      "2026-05-03",
      new Date("2026-05-03T10:00:00.000Z"),
    );

    assert.equal(next[0].shareCount, 2);
    assert.equal(next[0].updatedAt, "2026-05-03T10:00:00.000Z");
  });
});

describe("local stats summary", () => {
  it("summarizes the latest 7 days and tolerates malformed fields", () => {
    const summary = getLocalStatsSummary([
      { date: "bad", used: true, paidSeconds: "x", fishingSeconds: "x", earned: "x", shareCount: "x" },
      { date: "2026-04-26", used: true, paidSeconds: 1, fishingSeconds: 1, earned: 1 },
      { date: "2026-04-27", used: true, paidSeconds: 1, fishingSeconds: 5, earned: 1 },
      { date: "2026-04-28", used: true, paidSeconds: 1, fishingSeconds: 10, earned: 2 },
      { date: "2026-04-29", used: false, paidSeconds: 1, fishingSeconds: 20, earned: 3 },
      { date: "2026-04-30", used: true, paidSeconds: 1, fishingSeconds: 30, earned: 4 },
      { date: "2026-05-01", used: true, paidSeconds: 1, fishingSeconds: 40, earned: 5 },
      { date: "2026-05-02", used: true, paidSeconds: 1, fishingSeconds: 50, earned: 6 },
      { date: "2026-05-03", used: true, paidSeconds: 1, fishingSeconds: 60, earned: 7 },
    ], "2026-05-03");

    assert.equal(summary.hasRecords, true);
    assert.equal(summary.todayRecorded, true);
    assert.equal(summary.usedDays, 6);
    assert.equal(summary.earned, 25);
    assert.equal(summary.fishingSeconds, 195);
    assert.equal(summary.retentionDays, 30);
  });

  it("returns an empty summary for no valid records", () => {
    assert.deepEqual(getLocalStatsSummary([]), {
      hasRecords: false,
      todayRecorded: false,
      usedDays: 0,
      earned: 0,
      fishingSeconds: 0,
      retentionDays: 30,
    });
  });
});
