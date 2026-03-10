use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State, Wry};
use tauri::path::BaseDirectory;
use tauri::menu::MenuBuilder;
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_dialog::{DialogExt, MessageDialogButtons, MessageDialogKind};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_updater::UpdaterExt;
use uuid::Uuid;

const UPDATE_CHECK_INTERVAL: Duration = Duration::from_secs(3 * 60 * 60);
const DEVELOPER_SHORTCUT: &str = "CommandOrControl+Alt+Shift+D";
const LOG_FILE_NAME: &str = "easycopy.log";
const LOG_SNIPPET_MAX_CHARS: usize = 3500;

#[derive(Debug, Clone)]
struct DevMenuState {
    visible: bool,
}

impl DevMenuState {
    fn new() -> Self {
        Self {
            visible: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct LinkItem {
    id: String,
    name: String,
    url: String,
}

struct AppState {
    links: Mutex<Vec<LinkItem>>,
    dev_menu: Mutex<DevMenuState>,
}

fn get_links_file_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to resolve app data directory");
    fs::create_dir_all(&app_data_dir).ok();
    app_data_dir.join("links.json")
}

fn get_log_file_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to resolve app data directory");
    fs::create_dir_all(&app_data_dir).ok();
    app_data_dir.join(LOG_FILE_NAME)
}

fn log_event(app_handle: &AppHandle, message: &str) {
    let path = get_log_file_path(app_handle);
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);

    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(file, "[{}] {}", timestamp, message);
    }
}

fn read_log_tail(app_handle: &AppHandle) -> String {
    let path = get_log_file_path(app_handle);
    let content = match fs::read_to_string(path) {
        Ok(c) => c,
        Err(_) => return "(no log entries yet)".to_string(),
    };

    if content.len() <= LOG_SNIPPET_MAX_CHARS {
        return content;
    }

    let start = content.len() - LOG_SNIPPET_MAX_CHARS;
    let slice = &content[start..];
    match slice.find('\n') {
        Some(pos) => slice[pos + 1..].to_string(),
        None => slice.to_string(),
    }
}

fn load_links_from_file(file_path: &PathBuf) -> Vec<LinkItem> {
    match fs::read_to_string(file_path) {
        Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
        Err(_) => Vec::new(),
    }
}

fn save_links_to_file(file_path: &PathBuf, links: &Vec<LinkItem>) -> Result<(), String> {
    let json = serde_json::to_string_pretty(links).map_err(|e| e.to_string())?;
    fs::write(file_path, json).map_err(|e| e.to_string())?;
    Ok(())
}

fn add_link_item(mut links: Vec<LinkItem>, name: String, url: String) -> Vec<LinkItem> {
    let next = LinkItem {
        id: Uuid::new_v4().to_string(),
        name,
        url,
    };
    links.insert(0, next);
    links
}

fn update_link_item(mut links: Vec<LinkItem>, id: &str, name: String, url: String) -> Vec<LinkItem> {
    if let Some(link) = links.iter_mut().find(|item| item.id == id) {
        link.name = name;
        link.url = url;
    }
    links
}

fn delete_link_item(links: Vec<LinkItem>, id: &str) -> Vec<LinkItem> {
    links.into_iter().filter(|item| item.id != id).collect()
}

fn reorder_link_items(links: Vec<LinkItem>, ordered_ids: Vec<String>) -> Vec<LinkItem> {
    let mut remaining = links;
    let mut reordered: Vec<LinkItem> = Vec::new();

    for id in ordered_ids {
        if let Some(pos) = remaining.iter().position(|item| item.id == id) {
            reordered.push(remaining.remove(pos));
        }
    }

    reordered.extend(remaining);
    reordered
}

fn build_tray_menu(app: &AppHandle, links: &[LinkItem], show_developer_info: bool) -> Result<tauri::menu::Menu<Wry>, tauri::Error> {
    let mut builder = MenuBuilder::new(app)
        .text("open", "Add/Edit Links")
        .separator();

    if links.is_empty() {
        builder = builder.text("empty", "No links yet");
    } else {
        for (idx, link) in links.iter().take(8).enumerate() {
            builder = builder.text(format!("link_{}", idx), &link.name);
        }
    }

    if show_developer_info {
        builder = builder.separator().text("developer_info", "Developer Info");
    }

    builder = builder.separator().text("quit", "Quit EasyCopy");

    builder.build()
}

fn refresh_tray_menu(app: &AppHandle, links: &[LinkItem], show_developer_info: bool) {
    if let Some(tray) = app.tray_by_id("main") {
        if let Ok(menu) = build_tray_menu(app, links, show_developer_info) {
            tray.set_menu(Some(menu)).ok();
        }
    }
}

fn show_developer_info_dialog(app: &AppHandle) {
    let version = app.package_info().version.to_string();
    let issues_url = "https://github.com/colinfran/easy-copy/issues";
    let issue_title = format!("Bug report: EasyCopy {}", version);
    let log_path = get_log_file_path(app);
    let log_excerpt = read_log_tail(app);
    let diagnostics = format!(
        "- App version: {}\n- App identifier: {}\n- Platform: {}\n- Architecture: {}\n- Log file: {}",
        version,
        app.config().identifier,
        std::env::consts::OS,
        std::env::consts::ARCH,
        log_path.display(),
    );
    let issue_body = format!(
        "## Describe the issue\n\nPlease describe what happened.\n\n## Diagnostics\n\n{}\n\n## Recent log excerpt\n\n```\n{}\n```\n\n## Steps to reproduce\n\n1. \n2. \n3. \n\n## Expected behavior\n\n\n## Actual behavior\n\n",
        diagnostics,
        log_excerpt,
    );
    let prefilled_issue_url = format!(
        "{}/new?title={}&body={}",
        issues_url,
        urlencoding::encode(&issue_title),
        urlencoding::encode(&issue_body),
    );
    let details = format!(
        "EasyCopy\nVersion: {}\n\nIf you have an issue, click 'File an Issue'. Diagnostics will be prefilled automatically.",
        version,
    );

    let open_issues = app
        .dialog()
        .message(details)
        .title("Developer Info")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "File an Issue".to_string(),
            "Done".to_string(),
        ))
        .blocking_show();

    if open_issues {
        log_event(app, "Developer Info: opening prefilled issue URL");
        let _ = app.opener().open_url(prefilled_issue_url, None::<String>);
    }
}

fn open_window_attached_to_tray(app: &AppHandle, tray_rect: Option<tauri::Rect>) {
    if let Some(window) = app.get_webview_window("main") {
        if let Some(rect) = tray_rect {
            let window_width = window
                .outer_size()
                .map(|size| size.width as i32)
                .unwrap_or(420);

            let (tray_x, tray_y, tray_width, tray_height) = match (rect.position, rect.size) {
                (tauri::Position::Physical(pos), tauri::Size::Physical(size)) => {
                    (pos.x, pos.y, size.width as i32, size.height as i32)
                }
                (tauri::Position::Physical(pos), tauri::Size::Logical(size)) => {
                    (pos.x, pos.y, size.width as i32, size.height as i32)
                }
                (tauri::Position::Logical(pos), tauri::Size::Physical(size)) => {
                    (pos.x as i32, pos.y as i32, size.width as i32, size.height as i32)
                }
                (tauri::Position::Logical(pos), tauri::Size::Logical(size)) => {
                    (pos.x as i32, pos.y as i32, size.width as i32, size.height as i32)
                }
            };

            let x = tray_x + (tray_width / 2) - (window_width / 2);
            let y = tray_y + tray_height + 6;

            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x, y)));
        }

        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[tauri::command]
fn list_links(state: State<AppState>) -> Vec<LinkItem> {
    let links = state.links.lock().unwrap();
    links.clone()
}

#[tauri::command]
fn add_link(name: String, url: String, state: State<AppState>, app_handle: AppHandle) -> Result<Vec<LinkItem>, String> {
    let mut links = state.links.lock().unwrap();
    *links = add_link_item(links.clone(), name, url);
    let links_snapshot = links.clone();
    let show_developer_info = state.dev_menu.lock().unwrap().visible;
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    log_event(&app_handle, "Added link item");
    
    refresh_tray_menu(&app_handle, &links_snapshot, show_developer_info);
    
    Ok(links.clone())
}

#[tauri::command]
fn update_link(id: String, name: String, url: String, state: State<AppState>, app_handle: AppHandle) -> Result<Vec<LinkItem>, String> {
    let mut links = state.links.lock().unwrap();
    *links = update_link_item(links.clone(), &id, name, url);
    let links_snapshot = links.clone();
    let show_developer_info = state.dev_menu.lock().unwrap().visible;
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    log_event(&app_handle, &format!("Updated link item id={}", id));
    
    refresh_tray_menu(&app_handle, &links_snapshot, show_developer_info);
    
    Ok(links.clone())
}

#[tauri::command]
fn delete_link(id: String, state: State<AppState>, app_handle: AppHandle) -> Result<Vec<LinkItem>, String> {
    let mut links = state.links.lock().unwrap();
    *links = delete_link_item(links.clone(), &id);
    let links_snapshot = links.clone();
    let show_developer_info = state.dev_menu.lock().unwrap().visible;
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    log_event(&app_handle, &format!("Deleted link item id={}", id));
    
    refresh_tray_menu(&app_handle, &links_snapshot, show_developer_info);
    
    Ok(links.clone())
}

#[tauri::command]
fn reorder_links(ordered_ids: Vec<String>, state: State<AppState>, app_handle: AppHandle) -> Result<Vec<LinkItem>, String> {
    let mut links = state.links.lock().unwrap();
    let reordered_count = ordered_ids.len();
    *links = reorder_link_items(links.clone(), ordered_ids);
    let links_snapshot = links.clone();
    let show_developer_info = state.dev_menu.lock().unwrap().visible;
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    log_event(&app_handle, &format!("Reordered links count={}", reordered_count));
    
    refresh_tray_menu(&app_handle, &links_snapshot, show_developer_info);
    
    Ok(links.clone())
}

#[tauri::command]
fn copy_to_clipboard(text: String, app_handle: AppHandle) -> Result<bool, String> {
    let _ = app_handle;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(true)
}

async fn check_for_updates_once(app: AppHandle) {
    log_event(&app, "Updater check started");
    let update = match app.updater_builder().build() {
        Ok(builder) => match builder.check().await {
            Ok(update) => update,
            Err(err) => {
                eprintln!("Updater check failed: {err}");
                log_event(&app, &format!("Updater check failed: {}", err));
                return;
            }
        },
        Err(err) => {
            eprintln!("Updater initialization failed: {err}");
            log_event(&app, &format!("Updater init failed: {}", err));
            return;
        }
    };

    let Some(update) = update else {
        log_event(&app, "Updater check: no update available");
        return;
    };

    log_event(&app, &format!("Updater check: update found version={}", update.version));

    let should_install = app
        .dialog()
        .message(format!(
            "EasyCopy {} is available. Install now?",
            update.version
        ))
        .title("EasyCopy Update Available")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::OkCancelCustom(
            "Install now".to_string(),
            "Later".to_string(),
        ))
        .blocking_show();

    if !should_install {
        log_event(&app, "Updater prompt dismissed by user");
        return;
    }

    if let Err(err) = update.download_and_install(|_, _| {}, || {}).await {
        eprintln!("Updater installation failed: {err}");
        log_event(&app, &format!("Updater install failed: {}", err));
        return;
    }

    log_event(&app, "Updater installed successfully; restarting app");

    let _ = app
        .dialog()
        .message("Update installed. EasyCopy will restart now to finish applying it.")
        .title("EasyCopy Updated")
        .kind(MessageDialogKind::Info)
        .buttons(MessageDialogButtons::Ok)
        .blocking_show();

    app.restart();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let _ = app.set_dock_visibility(false);
            }

            if let Some(main_window) = app.get_webview_window("main") {
                let window_handle = main_window.clone();
                main_window.on_window_event(move |event| {
                    if matches!(event, tauri::WindowEvent::Focused(false)) {
                        let _ = window_handle.hide();
                    }
                });
            }

            let app_handle = app.handle();
            let file_path = get_links_file_path(&app_handle);
            let links = load_links_from_file(&file_path);
            
            let state = AppState {
                links: Mutex::new(links.clone()),
                dev_menu: Mutex::new(DevMenuState::new()),
            };
            
            app.manage(state);
            log_event(&app_handle, &format!("App started version={}", app.package_info().version));

            if let Err(err) = app_handle.global_shortcut().on_shortcut(
                DEVELOPER_SHORTCUT,
                |app, _shortcut, event| {
                    if event.state != ShortcutState::Pressed {
                        return;
                    }

                    let state = app.state::<AppState>();

                    let is_visible = {
                        let mut dev_menu = state.dev_menu.lock().unwrap();
                        dev_menu.visible = !dev_menu.visible;
                        dev_menu.visible
                    };

                    let links = state.links.lock().unwrap().clone();
                    refresh_tray_menu(app, &links, is_visible);
                    log_event(app, &format!("Developer Info menu visibility changed: {}", is_visible));
                },
            ) {
                eprintln!("Failed to register developer shortcut: {err}");
                log_event(&app_handle, &format!("Failed to register developer shortcut: {}", err));
            }
            
            // Build tray menu
            let menu = build_tray_menu(&app_handle, &links, false)?;
            
            let tray_icon = app.path().resolve("icons/icon.png", BaseDirectory::Resource)
                .ok()
                .and_then(|path| tauri::image::Image::from_path(path).ok())
                .or_else(|| app.default_window_icon().cloned())
                .expect("failed to load tray icon");

            // Create tray icon
            let _tray = TrayIconBuilder::with_id("main")
                .icon(tray_icon)
                .icon_as_template(false)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            log_event(app, "Tray action: open window");
                            let tray_rect = app
                                .tray_by_id("main")
                                .and_then(|tray| tray.rect().ok().flatten());
                            open_window_attached_to_tray(app, tray_rect);
                        }
                        "quit" => {
                            log_event(app, "Tray action: quit");
                            app.exit(0);
                        }
                        "developer_info" => {
                            log_event(app, "Tray action: developer info dialog");
                            show_developer_info_dialog(app);
                        }
                        id if id.starts_with("link_") => {
                            let state = app.state::<AppState>();
                            let links = state.links.lock().unwrap();
                            
                            if let Some(idx_str) = id.strip_prefix("link_") {
                                if let Ok(idx) = idx_str.parse::<usize>() {
                                    if let Some(link) = links.get(idx) {
                                        if let Ok(mut clipboard) = Clipboard::new() {
                                            let _ = clipboard.set_text(link.url.clone());
                                        }
                                    }
                                }
                            }
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button,
                        button_state,
                        ..
                    } = event
                    {
                        if button == MouseButton::Left && button_state == MouseButtonState::Up {
                            let app = tray.app_handle();
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap_or(false) {
                                    let _ = window.hide();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            let updater_app = app_handle.clone();
            tauri::async_runtime::spawn_blocking(move || loop {
                tauri::async_runtime::block_on(check_for_updates_once(updater_app.clone()));
                std::thread::sleep(UPDATE_CHECK_INTERVAL);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_links,
            add_link,
            update_link,
            delete_link,
            reorder_links,
            copy_to_clipboard
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_links() -> Vec<LinkItem> {
        vec![
            LinkItem {
                id: "a".to_string(),
                name: "One".to_string(),
                url: "https://one.test".to_string(),
            },
            LinkItem {
                id: "b".to_string(),
                name: "Two".to_string(),
                url: "https://two.test".to_string(),
            },
        ]
    }

    #[test]
    fn adds_link_at_beginning() {
        let next = add_link_item(
            sample_links(),
            "Three".to_string(),
            "https://three.test".to_string(),
        );

        assert_eq!(next.len(), 3);
        assert_eq!(next[0].name, "Three");
        assert_eq!(next[0].url, "https://three.test");
        assert_eq!(next[1].id, "a");
        assert_eq!(next[2].id, "b");
    }

    #[test]
    fn generates_valid_uuid_when_adding() {
        let next = add_link_item(vec![], "One".to_string(), "https://one.test".to_string());
        assert_eq!(next.len(), 1);
        assert!(Uuid::parse_str(&next[0].id).is_ok());
    }

    #[test]
    fn updates_only_matching_link() {
        let next = update_link_item(
            sample_links(),
            "b",
            "Updated Two".to_string(),
            "https://updated-two.test".to_string(),
        );

        assert_eq!(next[0].name, "One");
        assert_eq!(next[1].name, "Updated Two");
        assert_eq!(next[1].url, "https://updated-two.test");
    }

    #[test]
    fn returns_unchanged_when_update_id_missing() {
        let sample = sample_links();
        let next = update_link_item(
            sample.clone(),
            "z",
            "Nope".to_string(),
            "https://nope.test".to_string(),
        );
        assert_eq!(next, sample);
    }

    #[test]
    fn deletes_matching_link() {
        let next = delete_link_item(sample_links(), "a");
        assert_eq!(next.len(), 1);
        assert_eq!(next[0].id, "b");
    }

    #[test]
    fn returns_unchanged_when_delete_id_missing() {
        let sample = sample_links();
        let next = delete_link_item(sample.clone(), "z");
        assert_eq!(next, sample);
    }
}
