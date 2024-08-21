use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::OsStr;
use std::os::windows::ffi::OsStrExt;
use std::ptr::null_mut;
use std::sync::Mutex;
use uuid::Uuid;
use winapi::ctypes::c_void;
use winapi::shared::minwindef::HINSTANCE;
use winapi::shared::windef::{HMENU, HWND};
use winapi::um::winuser::*;

#[derive(Debug, Serialize, Deserialize, Clone, Copy, PartialEq, Eq, Hash)]
pub struct WindowId(Uuid);

// Wrapper for HWND that implements Send and Sync
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
struct SafeHWND(HWND);

// Implement Send and Sync for SafeHWND
unsafe impl Send for SafeHWND {}
unsafe impl Sync for SafeHWND {}

lazy_static! {
    static ref WINDOW_MAP: Mutex<HashMap<WindowId, SafeHWND>> = Mutex::new(HashMap::new());
}

pub fn create_window(
    ex_style: u32,
    class_name: &str,
    window_name: &str,
    style: u32,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    parent: HWND,
    menu: HMENU,
    instance: HINSTANCE,
    param: *mut c_void,
) -> Result<WindowId, String> {
    let class_name: Vec<u16> = OsStr::new(class_name)
        .encode_wide()
        .chain(Some(0))
        .collect();
    let window_name: Vec<u16> = OsStr::new(window_name)
        .encode_wide()
        .chain(Some(0))
        .collect();

    let hwnd = unsafe {
        CreateWindowExW(
            ex_style,
            class_name.as_ptr(),
            window_name.as_ptr(),
            style,
            x,
            y,
            width,
            height,
            parent,
            menu,
            instance,
            param,
        )
    };

    if hwnd.is_null() {
        return Err("Failed to create window".to_string());
    }

    attach_child_to_parent_area(parent, hwnd, x, y, width, height);

    let window_id = WindowId(Uuid::new_v4());
    WINDOW_MAP.lock().unwrap().insert(window_id, SafeHWND(hwnd));

    Ok(window_id)
}

pub fn destroy_window(window_id: WindowId) -> Result<(), String> {
    let mut window_map = WINDOW_MAP.lock().unwrap();
    if let Some(safe_hwnd) = window_map.remove(&window_id) {
        let result = unsafe { DestroyWindow(safe_hwnd.0) };
        if result == 0 {
            return Err("Failed to destroy window".to_string());
        }
        Ok(())
    } else {
        Err("Window not found".to_string())
    }
}

pub fn set_window_position(
    window_id: WindowId,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
) -> Result<(), String> {
    let mut window_map = WINDOW_MAP.lock().unwrap();
    if let Some(safe_hwnd) = window_map.get_mut(&window_id) {
        let result = unsafe { SetWindowPos(safe_hwnd.0, null_mut(), x, y, width, height, 0) };
        if result == 0 {
            return Err("Failed to set window position".to_string());
        }
        Ok(())
    } else {
        Err("Window with window ID not found".to_string())
    }
}

pub fn get_hwnd(window_id: WindowId) -> Option<HWND> {
    WINDOW_MAP
        .lock()
        .unwrap()
        .get(&window_id)
        .map(|safe_hwnd| safe_hwnd.0)
}

/// Attaches a child window to a portion of a parent window and overlays it on top.
///
/// # Arguments
///
/// * `parent_hwnd` - The handle to the parent window.
/// * `child_hwnd` - The handle to the child window.
/// * `left` - The x-coordinate of the upper-left corner of the area in the parent window.
/// * `top` - The y-coordinate of the upper-left corner of the area in the parent window.
/// * `width` - The width of the area in the parent window.
/// * `height` - The height of the area in the parent window.
pub fn attach_child_to_parent_area(
    parent_hwnd: HWND,
    child_hwnd: HWND,
    left: i32,
    top: i32,
    width: i32,
    height: i32,
) {
    unsafe {
        // Set the parent of the child window
        SetParent(child_hwnd, parent_hwnd);

        // SetWindowLongW(parent_hwnd, GWL_STYLE, (WS_POPUPWINDOW | WS_VISIBLE) as i32);
        SetWindowLongW(child_hwnd, GWL_STYLE, WS_POPUP as i32 | WS_VISIBLE as i32);

        // Force the window to update its style
        SetWindowPos(
            child_hwnd,
            HWND_TOP,
            left,
            top,
            width,
            height,
            SWP_SHOWWINDOW,
        );
    }
}
