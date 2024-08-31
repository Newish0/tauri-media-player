use crate::mpv;
use crate::utils::is_dev_mode;

use mpv::{MpvError, MpvPlayer};
use once_cell::sync::Lazy;
use std::sync::{Arc, Mutex};
use winapi::shared::windef::HWND;

// Global instance of mpv
static MPV_PLAYER: Lazy<Mutex<Arc<MpvPlayer>>> =
    Lazy::new(|| Mutex::new(MpvPlayer::new("./lib/mpv/libmpv-2.dll").unwrap()));

pub fn init_mpv(win_to_attach_to: HWND) {
    let player = MPV_PLAYER.lock().unwrap();

    player
        .attach_to_window(win_to_attach_to as usize)
        .expect("Failed to attach to window");
    player.initialize().expect("Failed to initialize MPV");

    if !is_dev_mode() {
        player.disable_osd().expect("Failed to disable OSD");
    }
}

#[tauri::command]
pub fn mpv_get_duration() -> Result<f64, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_duration()
}

#[tauri::command]
pub fn mpv_get_position() -> Result<f64, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_position()
}

#[tauri::command]
pub fn mpv_seek(position: f64) -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.seek(position)
}

#[tauri::command]
pub fn mpv_get_volume() -> Result<f64, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_volume()
}

#[tauri::command]
pub fn mpv_set_volume(volume: f64) -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.set_volume(volume)
}

#[tauri::command]
pub fn mpv_is_paused() -> Result<bool, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.is_paused()
}

#[tauri::command]
pub fn mpv_play() -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.play()
}

#[tauri::command]
pub fn mpv_pause() -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.pause()
}

#[tauri::command]
pub fn mpv_load_file(path: &str) -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.load_file(path)
}

#[tauri::command]
pub fn mpv_get_path() -> Result<String, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_path()
}
