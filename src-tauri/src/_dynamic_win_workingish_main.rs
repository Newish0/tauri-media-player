// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]


use tauri::{Manager, Runtime};
use std::sync::Arc;
use std::ffi::CString;
use libloading::{Library, Symbol};
use winapi::um::winuser::{CreateWindowExA, WS_CHILD, WS_VISIBLE, SetWindowPos, SWP_NOZORDER};
use winapi::shared::windef::HWND;
use winapi::shared::minwindef::LPVOID;

struct Mpv {
    handle: *mut std::ffi::c_void,
    library: Library,
}

#[tauri::command]
fn create_mpv_window<R: Runtime>(app: tauri::AppHandle<R>, label: String) -> Result<(), String> {
    let parent_window = app.get_window("main").unwrap();
    let parent_hwnd = parent_window.hwnd().expect("Failed to get main window HWND");

    // Get the dimensions of the parent window
    let size = parent_window.inner_size().unwrap();
    let width = size.width as i32;
    let height = size.height as i32;

    // Create a truly blank child window
    let blank_hwnd = unsafe {
        CreateWindowExA(
            0,
            "STATIC\0".as_ptr() as *const i8,
            "MPV Window\0".as_ptr() as *const i8,
            WS_CHILD | WS_VISIBLE,
            0, 0, width, height,
            parent_hwnd.0 as HWND,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut() as LPVOID,
        )
    };

    if blank_hwnd.is_null() {
        return Err("Failed to create blank window".to_string());
    }


    // Ensure the window is visible and positioned correctly
    unsafe {
        SetWindowPos(
            blank_hwnd,
            std::ptr::null_mut(),
            0, 0, width, height,
            SWP_NOZORDER
        );
    }

    // Load mpv-2.dll
    let mpv_lib = unsafe { Library::new("./lib/libmpv-2.dll").expect("Failed to load mpv-2.dll") };
    
    // Initialize MPV
    let create_fn: Symbol<unsafe extern "C" fn() -> *mut std::ffi::c_void> = 
        unsafe { mpv_lib.get(b"mpv_create").expect("Failed to load mpv_create") };
    let handle = unsafe { create_fn() };

    let mpv = Arc::new(Mpv {
        handle,
        library: mpv_lib,
    });

    // Attach MPV to the blank window
    let set_option_fn: Symbol<unsafe extern "C" fn(*mut std::ffi::c_void, *const i8, *const i8) -> i32> = 
        unsafe { mpv.library.get(b"mpv_set_option_string").expect("Failed to load mpv_set_option_string") };
    
    let wid_value = blank_hwnd as usize;
    let wid_str = format!("{}", wid_value);
    let wid_cstring = CString::new(wid_str).unwrap();
    unsafe {
        set_option_fn(mpv.handle, b"wid\0".as_ptr() as *const i8, wid_cstring.as_ptr());
    }

    // Initialize MPV
    let init_fn: Symbol<unsafe extern "C" fn(*mut std::ffi::c_void) -> i32> = 
        unsafe { mpv.library.get(b"mpv_initialize").expect("Failed to load mpv_initialize") };
    unsafe {
        init_fn(mpv.handle);
    }

    // Load and play a video file
    let command_fn: Symbol<unsafe extern "C" fn(*mut std::ffi::c_void, *const i8) -> i32> = 
        unsafe { mpv.library.get(b"mpv_command_string").expect("Failed to load mpv_command_string") };
    let load_command = CString::new("loadfile E:/Users/Administrator/Downloads/test.mkv").unwrap();
    unsafe {
        command_fn(mpv.handle, load_command.as_ptr());
    }

    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // We'll create the MPV window after the main window is ready
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_mpv_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

// // Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
// #[tauri::command]
// fn greet(name: &str) -> String {
//     format!("Hello, {}! You've been greeted from Rust!", name)
// }

// fn main() {
//     tauri::Builder::default()
//         .invoke_handler(tauri::generate_handler![greet])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }
