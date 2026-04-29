import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_WORK_SETTINGS,
  advanceDayState,
  calculateIncomeRate,
  getAutoStatus,
  getDateKey,
  getPaidSecondsBetween,
  getPlannedWorkSeconds,
} from "../src/work-core.js";

function at(value) {
  return new Date(`2026-04-29T${value}`);
}

describe("income calculation", () => {
  it("supports monthly, daily, and hourly income modes", () => {
    assert.equal(
      calculateIncomeRate({
        incomeMode: "monthly",
        incomeAmount: 12000,
        workDaysPerMonth: 20,
        dailyHours: 8,
      }),
      12000 / 20 / 8 / 3600,
    );
    assert.equal(
      calculateIncomeRate({
        incomeMode: "daily",
        incomeAmount: 800,
        dailyHours: 8,
      }),
      800 / 8 / 3600,
    );
    assert.equal(
      calculateIncomeRate({
        incomeMode: "hourly",
        incomeAmount: 100,
      }),
      100 / 3600,
    );
  });
});

describe("standard work schedule", () => {
  const settings = {
    ...DEFAULT_WORK_SETTINGS,
    workMode: "standard",
    workdayMode: "weekdays",
    startTime: "09:00",
    endTime: "18:00",
    lunchStart: "12:00",
    lunchEnd: "13:30",
  };

  it("plans payable work seconds excluding lunch", () => {
    assert.equal(getPlannedWorkSeconds(settings, at("09:00:00")), 7.5 * 3600);
  });

  it("counts only payable overlap when an interval crosses lunch", () => {
    assert.equal(getPaidSecondsBetween(at("11:50:00"), at("12:10:00"), settings), 10 * 60);
    assert.equal(getPaidSecondsBetween(at("09:00:00"), at("14:00:00"), settings), 3.5 * 3600);
  });

  it("detects automatic workday status", () => {
    assert.equal(getAutoStatus(at("08:50:00"), settings).id, "beforeWork");
    assert.equal(getAutoStatus(at("10:30:00"), settings).id, "working");
    assert.equal(getAutoStatus(at("12:30:00"), settings).id, "lunch");
    assert.equal(getAutoStatus(at("18:10:00"), settings).id, "offWork");
  });
});

describe("day state progression", () => {
  it("manual fishing counts as paid time and fishing time", () => {
    const previous = {
      dateKey: getDateKey(at("09:00:00")),
      paidSeconds: 0,
      fishingSeconds: 0,
      lastUpdateAt: at("09:00:00").toISOString(),
      statusOverride: "fishing",
    };

    const next = advanceDayState(previous, DEFAULT_WORK_SETTINGS, at("09:10:00"));

    assert.equal(next.paidSeconds, 600);
    assert.equal(next.fishingSeconds, 600);
    assert.equal(next.effectiveStatus.id, "fishing");
  });

  it("auto mode resets cleanly when the date changes", () => {
    const previous = {
      dateKey: "2026-04-28",
      paidSeconds: 3600,
      fishingSeconds: 600,
      lastUpdateAt: new Date("2026-04-28T18:00:00").toISOString(),
      statusOverride: "auto",
    };

    const next = advanceDayState(previous, DEFAULT_WORK_SETTINGS, at("09:01:00"));

    assert.equal(next.dateKey, "2026-04-29");
    assert.equal(next.paidSeconds, 0);
    assert.equal(next.fishingSeconds, 0);
  });

  it("flexible work mode stops auto counting after the daily target", () => {
    const settings = {
      ...DEFAULT_WORK_SETTINGS,
      workMode: "flexible",
      dailyHours: 8,
    };
    const dayState = {
      dateKey: getDateKey(at("16:00:00")),
      paidSeconds: 8 * 3600,
      fishingSeconds: 0,
      lastUpdateAt: at("15:59:00").toISOString(),
      statusOverride: "auto",
    };

    assert.equal(getAutoStatus(at("16:00:00"), settings, dayState).id, "offWork");
  });
});
