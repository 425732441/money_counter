import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getNotificationBlockMessage,
  getNotificationSentMessage,
  getNotificationStatusTarget,
  shouldShowNotificationSettingsLink,
} from "../src/notification-core.js";

describe("notification feedback helpers", () => {
  it("writes feedback to the active window status area", () => {
    assert.equal(getNotificationStatusTarget("settings"), "settings");
    assert.equal(getNotificationStatusTarget("main"), "desktop");
  });

  it("reports disabled Windows notifications before claiming delivery", () => {
    assert.equal(
      getNotificationBlockMessage({ toastEnabled: false }),
      "系统通知已关闭。",
    );
  });

  it("reports disabled app notifications before claiming delivery", () => {
    assert.equal(
      getNotificationBlockMessage({ toastEnabled: true, appEnabled: false }),
      "本应用通知已关闭。",
    );
  });

  it("uses a short sent message with a development mode hint", () => {
    assert.equal(
      getNotificationSentMessage({ appIdSource: "development" }),
      "已发送通知请求。开发模式可能显示为 PowerShell。",
    );
    assert.equal(getNotificationSentMessage({ appIdSource: "application" }), "已发送通知请求。");
  });

  it("shows the notification settings link only when Windows can block delivery", () => {
    assert.equal(shouldShowNotificationSettingsLink({ toastEnabled: false }), true);
    assert.equal(shouldShowNotificationSettingsLink({ appEnabled: false }), true);
    assert.equal(shouldShowNotificationSettingsLink({ toastEnabled: true, appEnabled: true }), false);
  });
});
