// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod metadata;
mod mpv;
mod mpv_tauri_commands;
mod winapi_abstraction;

use std::path::Path;

use tauri::{Manager, Runtime};
use winapi::shared::windef::HWND;

use winapi_abstraction::*;

use sqlx::{Column, Connection, Row, SqliteConnection, TypeInfo, ValueRef};

#[tauri::command]
async fn get_media_info(path: String) -> Result<metadata::SimplifiedMetadata, String> {
    match metadata::parse_metadata(&path).await {
        Ok(metadata) => Ok(metadata),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn get_pictures(path: String) -> Result<Vec<metadata::Picture>, String> {
    match metadata::get_pictures(&path).await {
        Ok(pictures) => Ok(pictures),
        Err(e) => Err(e.to_string()),
    }
}


#[tauri::command]
fn set_background(window: tauri::Window, color: String) {
  // Emit the 'set-background' event with the color value
  window.emit("set-background", color).unwrap();
}


#[tauri::command]
async fn db_execute(
    db_path: String,
    sql: String,
    params: Vec<String>,
) -> Result<Vec<Vec<String>>, String> {

    // Create the file if it doesn't exist
    let db_path_str = db_path.clone();
    let db_path = Path::new(&db_path);
    if !db_path.exists() {
        std::fs::File::create(db_path).map_err(|e| e.to_string())?;
    }

    // Establish a connection to the SQLite database
    let mut conn = SqliteConnection::connect(&format!("sqlite:{}", db_path_str))
        .await
        .map_err(|e| e.to_string())?;

    // Create a query builder
    let mut query = sqlx::query(&sql);

    // Bind parameters to the query
    for param in params {
        query = query.bind(param);
    }

    // Execute the query
    let rows = match query.fetch_all(&mut conn).await {
        Ok(rows) => rows,
        Err(e) => {
            return Err(e.to_string());
        }
    };

    // Convert the result to Vec<Vec<String>>
    let result: Vec<Vec<String>> = rows
        .iter()
        .map(|row| {
            (0..row.len())
                .map(|i| {
                    let value = row.try_get_raw(i).unwrap();
                    match value.type_info().name() {
                        "TEXT" => row.try_get::<String, _>(i).unwrap_or_default(),
                        "INTEGER" => row
                            .try_get::<i64, _>(i)
                            .map(|v| v.to_string())
                            .unwrap_or_default(),
                        "REAL" => row
                            .try_get::<f64, _>(i)
                            .map(|v| v.to_string())
                            .unwrap_or_default(),
                        "BLOB" => "<BLOB>".to_string(), // TODO: might want to handle this differently
                        _ => "".to_string(),
                    }
                })
                .collect()
        })
        .collect();

    Ok(result)
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let container_win = tauri::WindowBuilder::new(
                app,
                "container",
                tauri::WindowUrl::App("about:blank".into()),
            )
            .title("Tauri Media Player")
            .visible(false) // hide until all other init are complete
            .build()
            .unwrap();

            container_win
                .eval("document.title = 'Tauri Media Player'")
                .unwrap();

            let mpv_win =
                tauri::WindowBuilder::new(app, "mpv", tauri::WindowUrl::App("about:blank".into()))
                    .title("MPV Webview")
                    .parent_window(container_win.hwnd().unwrap())
                    .transparent(true)
                    .build()
                    .unwrap();

            // Webview for controlled background (to get thumbnail/album art acrylic backdrop)
            let bg_win =
                tauri::WindowBuilder::new(app, "bg", tauri::WindowUrl::App("bg.html".into()))
                    .title("MPV Webview")
                    .parent_window(container_win.hwnd().unwrap())
                    .build()
                    .unwrap();
        
        
            #[cfg(dev)]
            bg_win.open_devtools();

            let app_win = tauri::WindowBuilder::new(
                app,
                "overlay",
                tauri::WindowUrl::App("index.html".into()),
            )
            .title("Overlay Webview")
            .parent_window(container_win.hwnd().unwrap())
            .transparent(true)
            .build()
            .unwrap();

            #[cfg(dev)]
            app_win.open_devtools();
            

            // Set all other windows to be child of the container window; ORDER MATTERS!
            attach_child_to_parent_area(
                container_win.hwnd().unwrap().0 as HWND,
                bg_win.hwnd().unwrap().0 as HWND,
                0,
                0,
                container_win.inner_size().unwrap().width as i32,
                container_win.inner_size().unwrap().height as i32,
            );

            attach_child_to_parent_area(
                container_win.hwnd().unwrap().0 as HWND,
                mpv_win.hwnd().unwrap().0 as HWND,
                0,
                0,
                0, // don't care; handled by JS MpvWindowProxy
                0, // don't care; handled by JS MpvWindowProxy
            );

            attach_child_to_parent_area(
                container_win.hwnd().unwrap().0 as HWND,
                app_win.hwnd().unwrap().0 as HWND,
                0,
                0,
                container_win.inner_size().unwrap().width as i32,
                container_win.inner_size().unwrap().height as i32,
            );

            let container_win_ref = container_win.clone();


            // Set up a handler for the container window's resize event
            container_win.on_window_event(move |event| {
                if let tauri::WindowEvent::Resized(_) = event {
                    bg_win
                        .set_size(container_win_ref.inner_size().unwrap())
                        .unwrap();

                    /* NOTE: Skip resize of mpv_win since mpv window size is handled by MpvWindowProxy.tsx */

                    app_win
                        .set_size(container_win_ref.inner_size().unwrap())
                        .unwrap();
                }
            });

            mpv_tauri_commands::init_mpv(mpv_win.hwnd().unwrap().0 as HWND);

            container_win.show().unwrap(); // Init complete, show window

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            mpv_tauri_commands::mpv_get_duration,
            mpv_tauri_commands::mpv_get_position,
            mpv_tauri_commands::mpv_seek,
            mpv_tauri_commands::mpv_get_volume,
            mpv_tauri_commands::mpv_set_volume,
            mpv_tauri_commands::mpv_is_paused,
            mpv_tauri_commands::mpv_play,
            mpv_tauri_commands::mpv_pause,
            mpv_tauri_commands::mpv_stop,
            mpv_tauri_commands::mpv_load_file,
            mpv_tauri_commands::mpv_get_path,
            mpv_tauri_commands::mpv_get_filename,
            mpv_tauri_commands::mpv_register_events_callback,
            mpv_tauri_commands::mpv_get_tracks,
            mpv_tauri_commands::mpv_get_current_tracks,
            mpv_tauri_commands::mpv_set_tracks,
            mpv_tauri_commands::mpv_playlist_next,
            mpv_tauri_commands::mpv_playlist_prev,
            mpv_tauri_commands::mpv_get_playlist,
            mpv_tauri_commands::mpv_set_playlist_pos,
            mpv_tauri_commands::mpv_get_playlist_pos,
            mpv_tauri_commands::mpv_set_playlist_from_paths,
            mpv_tauri_commands::mpv_clear_playlist,
            get_media_info,
            get_pictures,
            set_background,
            db_execute
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
