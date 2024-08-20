// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{ptr::null_mut, string};
use tauri::{Manager, Runtime};

use winapi::shared::windef::HWND;

use winapi::shared::minwindef::HINSTANCE;
use winapi::um::libloaderapi::GetModuleHandleW;
use winapi::um::winuser::*;

mod mpv;

mod winapi_window_abstraction;
use winapi_window_abstraction::{create_window, destroy_window, WindowId};

#[tauri::command]
fn create_native_window<R: Runtime>(app: tauri::AppHandle<R>) -> Result<WindowId, String> {
    let parent_window = app.get_window("main").unwrap();
    let parent_hwnd = parent_window
        .hwnd()
        .expect("Failed to get main window HWND");

    // Get the HINSTANCE of the current module
    let h_instance = unsafe { GetModuleHandleW(null_mut()) as HINSTANCE };

    // Create a window
    let window_id = create_window(
        WS_EX_LAYERED | WS_EX_TRANSPARENT | WS_EX_TOPMOST, // dwExStyle
        "STATIC",              // lpClassName (using a predefined class for simplicity)
        "Example Window",      // lpWindowName
        WS_POPUP,              // dwStyle
        CW_USEDEFAULT,         // X
        CW_USEDEFAULT,         // Y
        300,                   // nWidth
        200,                   // nHeight
        parent_hwnd.0 as HWND, // hWndParent
        null_mut(),            // hMenu
        h_instance,            // hInstance
        null_mut(),            // lpParam
    )?;

    println!("Created window with ID: {:?}", window_id);

    Ok(window_id)
}

#[tauri::command]
fn destroy_native_window(window_id: WindowId) -> Result<(), String> {
    println!("Destroying window with ID: {:?}", window_id);

    destroy_window(window_id)?;

    Ok(())
}

#[tauri::command]
fn set_native_window_position(
    window_id: WindowId,
    x: i32,
    y: i32,
    w: i32,
    h: i32,
) -> Result<(), String> {
    println!("Setting window position: {:?}", (x, y, w, h));

    winapi_window_abstraction::set_window_position(window_id, x, y, w, h)
        .expect("Failed to set window position");

    Ok(())
}

#[tauri::command]
fn mpv_create() -> Result<String, String> {
    let player = mpv::MpvPlayer::new("./lib/libmpv-2.dll").unwrap();

    player.initialize().expect("Failed to initialize MPV");

    let serialized = mpv::serialize_player(&player).unwrap();
    println!("Serialized player: {}", serialized);

    Ok(serialized)
}

#[tauri::command]
fn mpv_attach_to_window(serialized_mpv: String, window_id: WindowId) -> Result<(), String> {
    let player = mpv::deserialize_player(&serialized_mpv).unwrap();
    let hwnd = winapi_window_abstraction::get_hwnd(window_id).unwrap();
    player
        .attach_to_window(hwnd as usize)
        .expect("Failed to attach player to window");
    println!("Attached player to window: {:?}", window_id);
    Ok(())
}

#[tauri::command]
fn mpv_load_file(serialized_mpv: String, path: String) -> Result<(), String> {
    let player = mpv::deserialize_player(&serialized_mpv).unwrap();

    println!("Loading file: {}", path);

    player.load_file(&path).expect("Path should be valid");
    Ok(())
}

#[tauri::command]
fn mpv_destroy(serialized_mpv: String) -> Result<(), String> {
    let player = mpv::deserialize_player(&serialized_mpv).unwrap();
    println!("Destroying player");
    player.destroy().expect("Failed to destroy player");
    mpv::cleanup_players();
    println!("Player destroyed");
    Ok(())
}

#[tauri::command]
fn mpv_play(serialized_mpv: String) -> Result<(), String> {
    let player = mpv::deserialize_player(&serialized_mpv).unwrap();
    player.play().expect("Failed to play");
    Ok(())
}

#[tauri::command]
fn mpv_pause(serialized_mpv: String) -> Result<(), String> {
    let player = mpv::deserialize_player(&serialized_mpv).unwrap();
    player.pause().expect("Failed to pause");
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            create_native_window,
            destroy_native_window,
            set_native_window_position,
            mpv_create,
            mpv_attach_to_window,
            mpv_load_file,
            mpv_destroy,
            mpv_play,
            mpv_pause
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
