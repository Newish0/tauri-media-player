// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]




use tauri::Manager;
use std::sync::Arc;
use std::ffi::CString;
use libloading::{Library, Symbol};
use winapi::um::winuser::{SetParent, SetWindowLongPtrA, GWL_STYLE, WS_CHILD};
use winapi::shared::windef::HWND;

struct Mpv {
    handle: *mut std::ffi::c_void,
    library: Library,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();
            
            // Create a blank window
            let blank_window = tauri::WindowBuilder::new(
                app,
                "blank",
                tauri::WindowUrl::App("about:blank".into())
            )
            .title("MPV Window")
            .build()?;

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
            
            let wid = blank_window.hwnd().expect("Failed to get HWND");
            let wid_value = wid.0 as usize;
            let wid_str = format!("{}", wid_value);
            let wid_cstring = CString::new(wid_str).unwrap();
            unsafe {
                set_option_fn(mpv.handle, b"wid\0".as_ptr() as *const i8, wid_cstring.as_ptr());
            }

            // Attach blank window to main window
            let main_hwnd = main_window.hwnd().expect("Failed to get main window HWND");
            let blank_hwnd = blank_window.hwnd().expect("Failed to get blank window HWND");
            
            unsafe {
                SetParent(blank_hwnd.0 as HWND, main_hwnd.0 as HWND);
                SetWindowLongPtrA(blank_hwnd.0 as HWND, GWL_STYLE, WS_CHILD as _);
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
        })
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
