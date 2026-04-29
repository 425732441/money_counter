use std::{f32::consts::PI, fs, path::PathBuf};

use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WebviewUrl, WebviewWindowBuilder,
};
use tauri_plugin_notification::NotificationExt;

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
        .inner_size(720.0, 620.0)
        .min_inner_size(560.0, 520.0)
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

#[tauri::command]
fn send_native_notification(
    app: tauri::AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    app.notification()
        .builder()
        .title(title)
        .body(body)
        .show()
        .map_err(|error| error.to_string())
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
    use super::tray_icon_rgba;

    #[test]
    fn dynamic_tray_icon_has_expected_rgba_size() {
        assert_eq!(tray_icon_rgba(0.5, 3).len(), 32 * 32 * 4);
    }

    #[test]
    fn dynamic_tray_icon_changes_with_progress() {
        assert_ne!(tray_icon_rgba(0.1, 3), tray_icon_rgba(0.9, 3));
    }
}
