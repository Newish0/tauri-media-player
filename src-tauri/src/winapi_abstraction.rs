use winapi::shared::windef::HWND;
use winapi::um::winuser::*;

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

pub fn resize_child_to_parent(parent: &tauri::Window, child: &tauri::Window) {
    let size = parent.inner_size().unwrap();
    let width = size.width as i32;
    let height = size.height as i32;

    let child_hwnd = child.hwnd().expect("Failed to get child window HWND");

    unsafe {
        SetWindowPos(
            child_hwnd.0 as _,
            std::ptr::null_mut(),
            0,
            0,
            width,
            height,
            SWP_NOZORDER,
        );
    }
}
