use std::{
    f32::consts::PI,
    fs,
    path::{Path, PathBuf},
    process::Command,
};

use serde::Serialize;
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_notification::NotificationExt;

const POWERSHELL_APP_ID: &str =
    r"{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe";

#[derive(Debug, Clone, PartialEq, Eq)]
struct NotificationAppIdentity {
    app_id: String,
    source: &'static str,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NotificationDiagnostics {
    toast_enabled: Option<bool>,
    app_enabled: Option<bool>,
    app_id: String,
    app_id_source: String,
}

fn tray_icon_rgba(progress: f64, intensity: u32) -> Vec<u8> {
    let width = 32;
    let height = 32;
    let mut rgba = vec![0; width * height * 4];
    let progress = progress.clamp(0.0, 1.0) as f32;
    let intensity = intensity.clamp(1, 9);
    let progress_color = if progress < 0.45 {
        [20, 184, 166, 255]
    } else if progress < 0.78 {
        [255, 176, 32, 255]
    } else {
        [255, 107, 95, 255]
    };

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - 16.0;
            let dy = y as f32 - 16.0;
            let distance = (dx * dx + dy * dy).sqrt();
            let offset = (y * width + x) * 4;

            if distance <= 15.0 {
                rgba[offset] = 16;
                rgba[offset + 1] = 37;
                rgba[offset + 2] = 34;
                rgba[offset + 3] = 255;
            }

            if (12.0..=15.0).contains(&distance) {
                rgba[offset] = 55;
                rgba[offset + 1] = 82;
                rgba[offset + 2] = 77;
                rgba[offset + 3] = 255;
            }

            let mut angle = dy.atan2(dx) + (PI / 2.0);
            if angle < 0.0 {
                angle += PI * 2.0;
            }
            let angle_progress = angle / (PI * 2.0);
            if (12.0..=15.0).contains(&distance) && angle_progress <= progress {
                rgba[offset] = progress_color[0];
                rgba[offset + 1] = progress_color[1];
                rgba[offset + 2] = progress_color[2];
                rgba[offset + 3] = progress_color[3];
            }

            if distance <= 9.0 {
                rgba[offset] = 255;
                rgba[offset + 1] = 246;
                rgba[offset + 2] = 213;
                rgba[offset + 3] = 255;
            }
        }
    }

    let bars = ((intensity + 2) / 3).min(3);
    for bar in 0..bars {
        let x_start = 10 + (bar as usize * 4);
        let bar_height = 5 + (bar as usize * 2);
        for y in (19 - bar_height)..19 {
            for x in x_start..(x_start + 3) {
                let offset = (y * width + x) * 4;
                rgba[offset] = 15;
                rgba[offset + 1] = 118;
                rgba[offset + 2] = 110;
                rgba[offset + 3] = 255;
            }
        }
    }

    rgba
}

fn tray_icon() -> Image<'static> {
    let width = 32;
    let height = 32;
    let rgba = tray_icon_rgba(0.0, 1);

    Image::new_owned(rgba, width as u32, height as u32)
}

fn dynamic_tray_icon(progress: f64, intensity: u32) -> Image<'static> {
    let width = 32;
    let height = 32;
    let rgba = tray_icon_rgba(progress, intensity);

    Image::new_owned(rgba, width as u32, height as u32)
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn hide_main_window_impl(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn toggle_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        match window.is_visible() {
            Ok(true) => {
                let _ = window.hide();
            }
            _ => show_main_window(app),
        }
    }
}

fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主面板", true, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "设置", true, None::<&str>)?;
    let hide_item = MenuItem::with_id(app, "hide", "隐藏主面板", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &settings_item, &hide_item, &quit_item])?;

    TrayIconBuilder::with_id("main")
        .icon(tray_icon())
        .tooltip("回血计数器正在运行")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "settings" => {
                let app = app.clone();
                std::thread::spawn(move || {
                    let _ = open_settings_window_impl(&app);
                });
            }
            "hide" => hide_main_window_impl(app),
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                toggle_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

fn open_settings_window_impl(app: &tauri::AppHandle) -> tauri::Result<()> {
    if let Some(window) = app.get_webview_window("settings") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        return Ok(());
    }

    WebviewWindowBuilder::new(app, "settings", WebviewUrl::App("index.html".into()))
        .title("回血计数器设置")
        .inner_size(720.0, 680.0)
        .min_inner_size(560.0, 480.0)
        .resizable(true)
        .center()
        .build()?;

    Ok(())
}

#[tauri::command]
fn hide_main_window(app: tauri::AppHandle) {
    hide_main_window_impl(&app);
}

#[tauri::command]
async fn open_settings_window(app: tauri::AppHandle) -> Result<(), String> {
    open_settings_window_impl(&app).map_err(|error| error.to_string())
}

#[tauri::command]
fn update_tray_status(
    app: tauri::AppHandle,
    text: String,
    progress: f64,
    intensity: u32,
) -> Result<(), String> {
    if let Some(tray) = app.tray_by_id("main") {
        tray.set_tooltip(Some(text))
            .map_err(|error| error.to_string())?;
        tray.set_icon(Some(dynamic_tray_icon(progress, intensity)))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn notification_app_identity_for_exe(identifier: &str, exe: &Path) -> NotificationAppIdentity {
    let exe_dir = exe
        .parent()
        .and_then(|path| path.to_str())
        .unwrap_or_default()
        .replace('/', "\\");
    let is_dev_build =
        exe_dir.ends_with(r"\target\debug") || exe_dir.ends_with(r"\target\release");

    if is_dev_build {
        NotificationAppIdentity {
            app_id: POWERSHELL_APP_ID.to_string(),
            source: "development",
        }
    } else {
        NotificationAppIdentity {
            app_id: identifier.to_string(),
            source: "application",
        }
    }
}

fn notification_app_identity(app: &tauri::AppHandle) -> NotificationAppIdentity {
    match tauri::utils::platform::current_exe() {
        Ok(exe) => notification_app_identity_for_exe(&app.config().identifier, &exe),
        Err(_) => NotificationAppIdentity {
            app_id: app.config().identifier.clone(),
            source: "application",
        },
    }
}

#[cfg(windows)]
fn read_hkcu_dword(path: &str, value: &str) -> Option<u32> {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    hkcu.open_subkey(path).ok()?.get_value(value).ok()
}

#[cfg(not(windows))]
fn read_hkcu_dword(_path: &str, _value: &str) -> Option<u32> {
    None
}

fn dword_enabled(value: Option<u32>) -> Option<bool> {
    value.map(|raw| raw != 0)
}

fn notification_diagnostics(app: &tauri::AppHandle) -> NotificationDiagnostics {
    let identity = notification_app_identity(app);
    let app_settings_path = format!(
        r"Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\{}",
        identity.app_id
    );

    NotificationDiagnostics {
        toast_enabled: dword_enabled(read_hkcu_dword(
            r"Software\Microsoft\Windows\CurrentVersion\PushNotifications",
            "ToastEnabled",
        )),
        app_enabled: dword_enabled(read_hkcu_dword(&app_settings_path, "Enabled")),
        app_id: identity.app_id,
        app_id_source: identity.source.to_string(),
    }
}

fn notification_block_message(diagnostics: &NotificationDiagnostics) -> Option<&'static str> {
    if diagnostics.toast_enabled == Some(false) {
        Some("系统通知已关闭，请在 Windows 通知设置中开启。")
    } else if diagnostics.app_enabled == Some(false) {
        Some("本应用通知已关闭，请在 Windows 通知设置中开启。")
    } else {
        None
    }
}

fn notification_settings_uri() -> &'static str {
    "ms-settings:notifications"
}

#[cfg(windows)]
fn open_notification_settings_impl() -> Result<(), String> {
    Command::new("explorer.exe")
        .arg(notification_settings_uri())
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(not(windows))]
fn open_notification_settings_impl() -> Result<(), String> {
    Err("当前系统不支持打开 Windows 通知设置。".to_string())
}

#[tauri::command]
fn get_notification_diagnostics(app: tauri::AppHandle) -> NotificationDiagnostics {
    notification_diagnostics(&app)
}

#[tauri::command]
fn open_notification_settings() -> Result<(), String> {
    open_notification_settings_impl()
}

fn is_external_url_allowed(url: &str) -> bool {
    let trimmed = url.trim();
    trimmed == url
        && !trimmed.is_empty()
        && !trimmed.chars().any(char::is_control)
        && (trimmed.starts_with("https://") || trimmed.starts_with("http://"))
}

#[cfg(windows)]
fn open_external_url_impl(url: &str) -> Result<(), String> {
    if !is_external_url_allowed(url) {
        return Err("只允许打开 http 或 https 链接。".to_string());
    }

    Command::new("explorer.exe")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(target_os = "macos")]
fn open_external_url_impl(url: &str) -> Result<(), String> {
    if !is_external_url_allowed(url) {
        return Err("只允许打开 http 或 https 链接。".to_string());
    }

    Command::new("open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[cfg(all(not(windows), not(target_os = "macos")))]
fn open_external_url_impl(url: &str) -> Result<(), String> {
    if !is_external_url_allowed(url) {
        return Err("只允许打开 http 或 https 链接。".to_string());
    }

    Command::new("xdg-open")
        .arg(url)
        .spawn()
        .map(|_| ())
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    open_external_url_impl(&url)
}

#[tauri::command]
fn send_native_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<NotificationDiagnostics, String> {
    let diagnostics = notification_diagnostics(&app);
    if let Some(message) = notification_block_message(&diagnostics) {
        return Err(message.to_string());
    }

    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|error| error.to_string())?;

    Ok(diagnostics)
}

#[tauri::command]
fn save_png(path: PathBuf, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(path, bytes).map_err(|error| error.to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--hidden"]),
        ))
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            hide_main_window,
            open_settings_window,
            update_tray_status,
            get_notification_diagnostics,
            open_notification_settings,
            open_external_url,
            send_native_notification,
            save_png
        ])
        .setup(|app| {
            build_tray(app)?;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_resizable(false);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "main" {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn dynamic_tray_icon_has_expected_rgba_size() {
        assert_eq!(tray_icon_rgba(0.5, 3).len(), 32 * 32 * 4);
    }

    #[test]
    fn dynamic_tray_icon_changes_with_progress() {
        assert_ne!(tray_icon_rgba(0.1, 3), tray_icon_rgba(0.9, 3));
    }

    #[test]
    fn uses_powershell_app_id_for_dev_target_builds() {
        let identity = notification_app_identity_for_exe(
            "com.moneycounter.spike",
            Path::new(r"C:\work\money_counter\src-tauri\target\debug\app.exe"),
        );

        assert_eq!(identity.app_id, POWERSHELL_APP_ID);
        assert_eq!(identity.source, "development");
    }

    #[test]
    fn uses_config_identifier_for_installed_builds() {
        let identity = notification_app_identity_for_exe(
            "com.moneycounter.spike",
            Path::new(r"C:\Users\me\AppData\Local\Money Counter Spike\money-counter-spike.exe"),
        );

        assert_eq!(identity.app_id, "com.moneycounter.spike");
        assert_eq!(identity.source, "application");
    }

    #[test]
    fn notification_settings_uri_targets_windows_notifications() {
        assert_eq!(notification_settings_uri(), "ms-settings:notifications");
    }

    #[test]
    fn external_url_validation_allows_only_web_urls() {
        assert!(is_external_url_allowed(
            "https://github.com/425732441/money_counter"
        ));
        assert!(is_external_url_allowed("http://localhost:1420"));
        assert!(!is_external_url_allowed("ms-settings:notifications"));
        assert!(!is_external_url_allowed("file:///C:/Windows/System32/cmd.exe"));
        assert!(!is_external_url_allowed("https://github.com/\ncalc"));
    }
}
