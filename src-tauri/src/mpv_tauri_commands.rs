use crate::mpv::{self};
use crate::utils::is_dev_mode;

use mpv::*;
use once_cell::sync::Lazy;
use std::sync::{Arc, Mutex};
use winapi::shared::windef::HWND;

#[derive(Clone, serde::Serialize)]
struct MpvEventPayload {
    event_id: u32,
}

// Global instance of mpv
static MPV_PLAYER: Lazy<Mutex<Arc<MpvPlayer>>> =
    Lazy::new(|| Mutex::new(MpvPlayer::new("./lib/mpv/libmpv-2.dll").unwrap()));

pub fn init_mpv(win_to_attach_to: HWND) {
    let player = MPV_PLAYER.lock().unwrap();

    player
        .attach_to_window(win_to_attach_to as usize)
        .expect("Failed to attach to window");
    player.initialize().expect("Failed to initialize MPV");

    // player.load_file("E:/Users/Administrator/Downloads/test.mkv").expect("Failed to load file");

    // thread::sleep(std::time::Duration::from_millis(1000));

    // match player.get_current_tracks() {
    //     Ok(tracks) => {
    //         println!("Tracks: {:?}", tracks);
    //     }
    //     Err(e) => {
    //         println!("Failed to get tracks: {:?}", e);
    //     }
    // }

    // player
    //     .register_event_callback(MpvEventId::FileLoaded, |event| {
    //         println!("Received event: FileLoaded");
    //     })
    //     .expect("Failed to register event callback");

    if !is_dev_mode() {
        player.disable_osd().expect("Failed to disable OSD");
    }
}

#[tauri::command]
pub fn mpv_register_events_callback(window: tauri::Window) {
    let player = MPV_PLAYER.lock().unwrap();

    let events = [
        MpvEventId::None,
        MpvEventId::Shutdown,
        MpvEventId::LogMessage,
        MpvEventId::GetPropertyReply,
        MpvEventId::SetPropertyReply,
        MpvEventId::CommandReply,
        MpvEventId::StartFile,
        MpvEventId::EndFile,
        MpvEventId::FileLoaded,
        MpvEventId::ClientMessage,
        MpvEventId::VideoReconfig,
        MpvEventId::AudioReconfig,
        MpvEventId::Seek,
        MpvEventId::PlaybackRestart,
        MpvEventId::PropertyChange,
        MpvEventId::QueueOverflow,
        MpvEventId::Hook,
    ]; // register all the events we want

    // HACK: this is kinda a mess and should be refactored but i don't have time right now
    for event in events.iter() {
        let event_window = window.clone();
        let event_id = event.clone(); // Clone the event_id here
        match player.register_event_callback(event_id.clone(), move |_| {
            emit_event(event_window.clone(), event_id.clone()); // Clone again here if necessary
        }) {
            Ok(_) => (),
            Err(e) => eprintln!("Failed to register event callback: {}", e), // TODO: Handle error properly
        };
    }
}

fn emit_event(window: tauri::Window, event_id: MpvEventId) {
    window
        .emit(
            "mpv-event",
            MpvEventPayload {
                event_id: event_id as u32,
            },
        )
        .unwrap_or_else(|e| eprintln!("Failed to emit event: {}", e));
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

#[tauri::command]
pub fn mpv_get_tracks() -> Result<Vec<Track>, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_tracks()
}

#[tauri::command]
pub fn mpv_get_current_tracks() -> Result<CurrentTracks, MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.get_current_tracks()
}

#[tauri::command]
pub fn mpv_set_tracks(
    video: Option<i64>,
    audio: Option<i64>,
    subtitle: Option<i64>,
) -> Result<(), MpvError> {
    let player = MPV_PLAYER.lock().unwrap();
    player.set_tracks(video, audio, subtitle)
}
