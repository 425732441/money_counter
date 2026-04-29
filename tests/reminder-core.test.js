import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_REMINDER_SETTINGS,
  createInitialReminderState,
  getDueReminder,
} from "../src/reminder-core.js";
import { DEFAULT_WORK_SETTINGS, createInitialDayState } from "../src/work-core.js";

function at(value) {
  return new Date(`2026-04-29T${value}`);
}

describe("reminder scheduling", () => {
  it("does not schedule reminders when reminders are disabled", () => {
    const result = getDueReminder({
      now: at("09:05:00"),
      settings: { ...DEFAULT_REMINDER_SETTINGS, remindersEnabled: false },
      workSettings: DEFAULT_WORK_SETTINGS,
      dayState: createInitialDayState(at("09:05:00")),
      reminderState: createInitialReminderState(at("09:05:00")),
    });

    assert.equal(result.reminder, null);
  });

  it("suppresses reminders during quiet time", () => {
    const result = getDueReminder({
      now: at("12:20:00"),
      settings: {
        ...DEFAULT_REMINDER_SETTINGS,
        remindersEnabled: true,
        quietStart: "12:00",
        quietEnd: "13:30",
      },
      workSettings: DEFAULT_WORK_SETTINGS,
      dayState: createInitialDayState(at("12:20:00")),
      reminderState: createInitialReminderState(at("12:20:00")),
    });

    assert.equal(result.reminder, null);
  });

  it("schedules each workday checkpoint once", () => {
    const settings = { ...DEFAULT_REMINDER_SETTINGS, remindersEnabled: true };
    const reminderState = createInitialReminderState(at("09:05:00"));

    const first = getDueReminder({
      now: at("09:05:00"),
      settings,
      workSettings: DEFAULT_WORK_SETTINGS,
      dayState: createInitialDayState(at("09:05:00")),
      reminderState,
    });
    const second = getDueReminder({
      now: at("09:06:00"),
      settings,
      workSettings: DEFAULT_WORK_SETTINGS,
      dayState: createInitialDayState(at("09:06:00")),
      reminderState: first.nextState,
    });

    assert.equal(first.reminder.id, "workStart");
    assert.equal(second.reminder, null);
  });

  it("schedules a low-frequency break reminder only after the interval", () => {
    const settings = {
      ...DEFAULT_REMINDER_SETTINGS,
      remindersEnabled: true,
      scheduleRemindersEnabled: false,
      breakRemindersEnabled: true,
      reminderIntervalMinutes: 90,
    };
    const dayState = {
      ...createInitialDayState(at("10:30:00")),
      effectiveStatus: { id: "working" },
    };
    const reminderState = {
      ...createInitialReminderState(at("09:00:00")),
      lastBreakReminderAt: at("09:00:00").toISOString(),
    };

    assert.equal(
      getDueReminder({
        now: at("10:20:00"),
        settings,
        workSettings: DEFAULT_WORK_SETTINGS,
        dayState,
        reminderState,
      }).reminder,
      null,
    );

    const due = getDueReminder({
      now: at("10:31:00"),
      settings,
      workSettings: DEFAULT_WORK_SETTINGS,
      dayState,
      reminderState,
    });

    assert.equal(due.reminder.id, "break");
  });

  it("schedules lunch and off-work checkpoints", () => {
    const settings = {
      ...DEFAULT_REMINDER_SETTINGS,
      remindersEnabled: true,
      breakRemindersEnabled: false,
      quietStart: "00:00",
      quietEnd: "00:00",
    };

    assert.equal(
      getDueReminder({
        now: at("12:00:00"),
        settings,
        workSettings: DEFAULT_WORK_SETTINGS,
        dayState: createInitialDayState(at("12:00:00")),
        reminderState: createInitialReminderState(at("12:00:00")),
      }).reminder.id,
      "lunch",
    );

    assert.equal(
      getDueReminder({
        now: at("17:50:00"),
        settings,
        workSettings: DEFAULT_WORK_SETTINGS,
        dayState: createInitialDayState(at("17:50:00")),
        reminderState: createInitialReminderState(at("17:50:00")),
      }).reminder.id,
      "offWorkSoon",
    );
  });
});
