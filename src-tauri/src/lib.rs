use arboard::Clipboard;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, Wry};
use tauri::menu::MenuBuilder;
use tauri::tray::{MouseButton, TrayIconBuilder, TrayIconEvent};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
struct LinkItem {
    id: String,
    name: String,
    url: String,
}

struct AppState {
    links: Mutex<Vec<LinkItem>>,
}

fn get_links_file_path(app_handle: &AppHandle) -> PathBuf {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .expect("failed to resolve app data directory");
    fs::create_dir_all(&app_data_dir).ok();
    app_data_dir.join("links.json")
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

fn build_tray_menu(app: &AppHandle, links: &[LinkItem]) -> Result<tauri::menu::Menu<Wry>, tauri::Error> {
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

    builder = builder.separator().text("quit", "Quit EasyCopy");

    builder.build()
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
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    
    if let Some(tray) = app_handle.tray_by_id("main") {
        if let Ok(menu) = build_tray_menu(&app_handle, &links) {
            tray.set_menu(Some(menu)).ok();
        }
    }
    
    Ok(links.clone())
}

#[tauri::command]
fn update_link(id: String, name: String, url: String, state: State<AppState>, app_handle: AppHandle) -> Result<Vec<LinkItem>, String> {
    let mut links = state.links.lock().unwrap();
    *links = update_link_item(links.clone(), &id, name, url);
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    
    if let Some(tray) = app_handle.tray_by_id("main") {
        if let Ok(menu) = build_tray_menu(&app_handle, &links) {
            tray.set_menu(Some(menu)).ok();
        }
    }
    
    Ok(links.clone())
}

#[tauri::command]
fn delete_link(id: String, state: State<AppState>, app_handle: AppHandle) -> Result<Vec<LinkItem>, String> {
    let mut links = state.links.lock().unwrap();
    *links = delete_link_item(links.clone(), &id);
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    
    if let Some(tray) = app_handle.tray_by_id("main") {
        if let Ok(menu) = build_tray_menu(&app_handle, &links) {
            tray.set_menu(Some(menu)).ok();
        }
    }
    
    Ok(links.clone())
}

#[tauri::command]
fn reorder_links(ordered_ids: Vec<String>, state: State<AppState>, app_handle: AppHandle) -> Result<Vec<LinkItem>, String> {
    let mut links = state.links.lock().unwrap();
    *links = reorder_link_items(links.clone(), ordered_ids);
    
    let file_path = get_links_file_path(&app_handle);
    save_links_to_file(&file_path, &links)?;
    
    if let Some(tray) = app_handle.tray_by_id("main") {
        if let Ok(menu) = build_tray_menu(&app_handle, &links) {
            tray.set_menu(Some(menu)).ok();
        }
    }
    
    Ok(links.clone())
}

#[tauri::command]
fn copy_to_clipboard(text: String, app_handle: AppHandle) -> Result<bool, String> {
    let _ = app_handle;
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    clipboard.set_text(text).map_err(|e| e.to_string())?;
    Ok(true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
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
            };
            
            app.manage(state);
            
            // Build tray menu
            let menu = build_tray_menu(&app_handle, &links)?;
            
            // Create tray icon
            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .icon_as_template(false)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "open" => {
                            let tray_rect = app
                                .tray_by_id("main")
                                .and_then(|tray| tray.rect().ok().flatten());
                            open_window_attached_to_tray(app, tray_rect);
                        }
                        "quit" => {
                            app.exit(0);
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
                        ..
                    } = event
                    {
                        if button == MouseButton::Left {
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
