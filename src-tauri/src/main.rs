// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use once_cell::sync::Lazy;
use std::borrow::Borrow;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Manager, Runtime};
use winapi::shared::windef::HWND;

mod mpv;
mod winapi_abstraction;
use mpv::MpvPlayer;
use winapi_abstraction::*;

// Global instance of mpv
static MPV_PLAYER: Lazy<Mutex<Arc<MpvPlayer>>> =
    Lazy::new(|| Mutex::new(MpvPlayer::new("./lib/mpv/libmpv-2.dll").unwrap()));

fn init_mpv(win_to_attach_to: HWND) {
    let player = MPV_PLAYER.lock().unwrap();

    player
        .attach_to_window(win_to_attach_to as usize)
        .expect("Failed to attach to window");
    player.initialize().expect("Failed to initialize MPV");
    player
        .load_file("E:/Users/Administrator/Downloads/test.mkv")
        .expect("Failed to load file");

    thread::sleep(Duration::from_millis(1000));

    player.seek(60.0).expect("Failed to seek");

    thread::sleep(Duration::from_millis(1000));

    let pos = player.get_position().expect("Failed to get position");

    println!("Position: {}", pos);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let width = 800;
            let height = 600;

            let container_win = tauri::WindowBuilder::new(
                app,
                "container",
                tauri::WindowUrl::App("about:blank".into()),
            )
            // .inner_size(width as f64, height as f64)
            .title("Tauri Media Player")
            .visible(false) // hide until all other init are complete
            .build()
            .unwrap();

            container_win
                .eval("document.title = 'Tauri Media Player'")
                .unwrap();

            let mpv_win =
                tauri::WindowBuilder::new(app, "mpv", tauri::WindowUrl::App("about:blank".into()))
                    // .inner_size(width as f64, height as f64)
                    .title("MPV Webview")
                    .parent_window(container_win.hwnd().unwrap())
                    .transparent(true)
                    .build()
                    .unwrap();

            let overlay_win = tauri::WindowBuilder::new(
                app,
                "overlay",
                tauri::WindowUrl::App("index.html".into()),
            )
            // .inner_size(width as f64, height as f64)
            .title("Overlay Webview")
            .parent_window(container_win.hwnd().unwrap())
            .transparent(true)
            .build()
            .unwrap();

            // // Initial positioning and sizing
            // resize_child_to_parent(&container_window, &bg_window); // Must call BG first to maintain z-order
            // resize_child_to_parent(&container_window, &main_window);

            attach_child_to_parent_area(
                container_win.hwnd().unwrap().0 as HWND,
                mpv_win.hwnd().unwrap().0 as HWND,
                0,
                0,
                width,
                height,
            );

            attach_child_to_parent_area(
                container_win.hwnd().unwrap().0 as HWND,
                overlay_win.hwnd().unwrap().0 as HWND,
                0,
                0,
                width,
                height,
            );

            let container_win_ref = container_win.clone();
            let mpv_win_ref: tauri::Window = mpv_win.clone();

            // Set up a handler for the container window's resize event
            container_win.on_window_event(move |event| {
                if let tauri::WindowEvent::Resized(_) = event {
                    resize_child_to_parent(&container_win_ref, &mpv_win_ref); // Must call BG first to maintain z-order
                    resize_child_to_parent(&container_win_ref, &overlay_win);
                }
            });

            init_mpv(mpv_win.hwnd().unwrap().0 as HWND);

            container_win.show().unwrap(); // Init complete, show window

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
