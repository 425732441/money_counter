export function getNotificationStatusTarget(windowLabel) {
  return windowLabel === "settings" ? "settings" : "desktop";
}

export function getNotificationBlockMessage(diagnostics) {
  if (diagnostics?.toastEnabled === false) {
    return "系统通知已关闭。";
  }
  if (diagnostics?.appEnabled === false) {
    return "本应用通知已关闭。";
  }
  return "";
}

export function shouldShowNotificationSettingsLink(diagnostics) {
  return diagnostics?.toastEnabled === false || diagnostics?.appEnabled === false;
}

export function getNotificationSentMessage(diagnostics) {
  if (diagnostics?.appIdSource === "development") {
    return "已发送通知请求。开发模式可能显示为 PowerShell。";
  }
  return "已发送通知请求。";
}
