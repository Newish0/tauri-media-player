// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod mpv;
mod mpv_tauri_commands;
mod winapi_abstraction;

use tauri::{Manager, Runtime};
use winapi::shared::windef::HWND;

use winapi_abstraction::*;

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
                tauri::WindowBuilder::new(app, "bg", tauri::WindowUrl::App("about:blank".into()))
                    .title("MPV Webview")
                    .parent_window(container_win.hwnd().unwrap())
                    .build()
                    .unwrap();
            // TODO: bg_win: add basic JS to listen for messages for setting the background image

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
            mpv_tauri_commands::mpv_load_file,
            mpv_tauri_commands::mpv_get_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
