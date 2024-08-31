// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use once_cell::sync::Lazy;
use std::borrow::Borrow;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Manager, Runtime};
use winapi::shared::windef::HWND;
use winapi::um::winuser::*;

mod mpv;
mod winapi_abstraction;
use mpv::{MpvError, MpvPlayer};
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

    // thread::sleep(Duration::from_millis(1000));

    // player.seek(60.0).expect("Failed to seek");

    // thread::sleep(Duration::from_millis(1000));

    // let pos = player.get_position().expect("Failed to get position");

    // println!("Position: {}", pos);
}

#[tauri::command]
fn mpv_get_duration() -> Result<f64, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_duration()
}

#[tauri::command]
fn mpv_get_position() -> Result<f64, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_position()
}

#[tauri::command]
fn mpv_seek(position: f64) -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.seek(position)
}

#[tauri::command]
fn mpv_get_volume() -> Result<f64, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_volume()
}

#[tauri::command]
fn mpv_set_volume(volume: f64) -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.set_volume(volume)
}

#[tauri::command]
fn mpv_is_paused() -> Result<bool, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.is_paused()
}

#[tauri::command]
fn mpv_play() -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.play()
}

#[tauri::command]
fn mpv_pause() -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.pause()
}

#[tauri::command]
fn mpv_load_file(path: &str) -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.load_file(path)
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

            // TODO: add proper webview controlled background (to get thumbnail/album art acrylic backdrop)
            // let bg_win =
            //     tauri::WindowBuilder::new(app, "bg", tauri::WindowUrl::App("about:blank".into()))
            //         .title("MPV Webview")
            //         .parent_window(container_win.hwnd().unwrap())
            //         .build()
            //         .unwrap();

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

            // Set all other windows to be child of the container window
            attach_child_to_parent_area(
                container_win.hwnd().unwrap().0 as HWND,
                mpv_win.hwnd().unwrap().0 as HWND,
                0,
                0,
                0, // don't care
                0, // don't care
            );
            // attach_child_to_parent_area(
            //     container_win.hwnd().unwrap().0 as HWND,
            //     bg_win.hwnd().unwrap().0 as HWND,
            //     0,
            //     0,
            //     0, // don't care
            //     0, // don't care
            // );
            attach_child_to_parent_area(
                container_win.hwnd().unwrap().0 as HWND,
                app_win.hwnd().unwrap().0 as HWND,
                0,
                0,
                0, // don't care
                0, // don't care
            );

            let container_win_ref = container_win.clone();
            let mpv_win_ref: tauri::Window = mpv_win.clone();

            // Set up a handler for the container window's resize event
            container_win.on_window_event(move |event| {
                if let tauri::WindowEvent::Resized(_) = event {
                    // bg_win
                    //     .set_size(container_win_ref.inner_size().unwrap())
                    //     .unwrap();

                    resize_child_to_parent(&container_win_ref, &app_win);

                    // app_win
                    //     .set_size(container_win_ref.inner_size().unwrap())
                    //     .unwrap();
                }
            });

            init_mpv(mpv_win.hwnd().unwrap().0 as HWND);

            container_win.show().unwrap(); // Init complete, show window

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            mpv_get_duration,
            mpv_get_position,
            mpv_seek,
            mpv_get_volume,
            mpv_set_volume,
            mpv_is_paused,
            mpv_play,
            mpv_pause,
            mpv_load_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
