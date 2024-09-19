use libloading::{Library, Symbol};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::ffi::{c_char, CStr, CString};
use std::os::raw::{c_double, c_int, c_void};
use std::path::Path;
use std::sync::Arc;
use std::sync::Mutex;
use std::thread;
use thiserror::Error;

// Thread-safe wrapper for the raw pointer
struct MpvHandle(*mut c_void);
unsafe impl Send for MpvHandle {}
unsafe impl Sync for MpvHandle {}

#[derive(Error, Debug)]
pub enum MpvError {
    #[error("Library error: {0}")]
    LibraryError(#[from] libloading::Error),

    #[error("Failed to set option: {name} = {value}")]
    SetOptionError { name: String, value: String },

    #[error("Failed to initialize MPV")]
    InitializationError,

    #[error("Failed to execute command: {0}")]
    CommandError(String),

    #[error("String conversion error: {0}")]
    StringConversionError(#[from] std::ffi::NulError),

    #[error("Failed to get property: {0}")]
    GetPropertyError(String),

    #[error("Failed to set property: {0}")]
    SetPropertyError(String),

    #[error("Failed to process events")]
    EventProcessingError, // TODO: actual use the error
}

// Custom serializer for MpvError
impl serde::Serialize for MpvError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        serializer.serialize_str(self.to_string().as_ref())
    }
}

/// Mpv formats enum copied straight from mpv's client.h file.
/// See original client.h file for details and usage.
#[repr(C)]
enum MpvFormat {
    None = 0,
    String = 1,
    OsdString = 2,
    Flag = 3,
    Int64 = 4,
    Double = 5,
    Node = 6,
    NodeArray = 7,
    NodeMap = 8,
    ByteArray = 9,
}

/// These constants are from [client.h](https://github.com/mpv-player/mpv/blob/master/libmpv/client.h)
/// and are used to identify the type of event that occurred.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[repr(C)]
pub enum MpvEventId {
    None = 0,
    Shutdown = 1,
    LogMessage = 2,
    GetPropertyReply = 3,
    SetPropertyReply = 4,
    CommandReply = 5,
    StartFile = 6,
    EndFile = 7,
    FileLoaded = 8,
    ClientMessage = 16,
    VideoReconfig = 17,
    AudioReconfig = 18,
    Seek = 20,
    PlaybackRestart = 21,
    PropertyChange = 22,
    QueueOverflow = 24,
    Hook = 25,
}

#[repr(C)]
pub struct MpvEvent {
    event_id: c_int,
    error: c_int,
    reply_userdata: u64,
    data: *mut c_void,
}

pub type EventCallback = Box<dyn Fn(&MpvEvent) + Send + 'static>;

struct Mpv {
    handle: MpvHandle,
    library: Arc<Library>,
    event_callbacks: Mutex<HashMap<c_int, Vec<EventCallback>>>,
}

impl Mpv {
    const EVENT_TIMEOUT: f64 = 1.0; // timeout for `mpv_wait_event()`

    fn new(lib_path: &str) -> Result<Self, MpvError> {
        let library = Arc::new(unsafe { Library::new(lib_path)? });
        let create_fn: Symbol<unsafe extern "C" fn() -> *mut c_void> =
            unsafe { library.get(b"mpv_create")? };
        let handle = unsafe { create_fn() };

        Ok(Self {
            handle: MpvHandle(handle),
            library,
            event_callbacks: Mutex::new(HashMap::new()),
        })
    }

    fn destroy(&self) -> Result<(), MpvError> {
        let destroy_fn: Symbol<unsafe extern "C" fn(*mut c_void)> =
            unsafe { self.library.get(b"mpv_destroy")? };

        unsafe { destroy_fn(self.handle.0) };
        Ok(())
    }

    fn set_option(&self, name: &str, value: &str) -> Result<(), MpvError> {
        let set_option_fn: Symbol<
            unsafe extern "C" fn(*mut c_void, *const c_char, *const c_char) -> i32,
        > = unsafe { self.library.get(b"mpv_set_option_string")? };

        let name_cstring = CString::new(name)?;
        let value_cstring = CString::new(value)?;

        let result =
            unsafe { set_option_fn(self.handle.0, name_cstring.as_ptr(), value_cstring.as_ptr()) };

        if result == 0 {
            Ok(())
        } else {
            Err(MpvError::SetOptionError {
                name: name.to_string(),
                value: value.to_string(),
            })
        }
    }

    fn initialize(&self) -> Result<(), MpvError> {
        let init_fn: Symbol<unsafe extern "C" fn(*mut c_void) -> i32> =
            unsafe { self.library.get(b"mpv_initialize")? };

        let result = unsafe { init_fn(self.handle.0) };

        if result == 0 {
            Ok(())
        } else {
            Err(MpvError::InitializationError)
        }
    }

    fn command_string(&self, command: &str) -> Result<(), MpvError> {
        let command_fn: Symbol<unsafe extern "C" fn(*mut c_void, *const c_char) -> i32> =
            unsafe { self.library.get(b"mpv_command_string")? };

        let command_cstring = CString::new(command)?;

        let result = unsafe { command_fn(self.handle.0, command_cstring.as_ptr()) };

        if result == 0 {
            Ok(())
        } else {
            Err(MpvError::CommandError(command.to_string()))
        }
    }

    fn get_property_string(&self, name: &str) -> Result<String, MpvError> {
        let get_property_string_fn: Symbol<
            unsafe extern "C" fn(*mut c_void, *const c_char) -> *mut c_char,
        > = unsafe { self.library.get(b"mpv_get_property_string")? };

        let name_cstring = CString::new(name)?;

        let result = unsafe { get_property_string_fn(self.handle.0, name_cstring.as_ptr()) };

        if result.is_null() {
            return Err(MpvError::GetPropertyError(name.to_string()));
        }

        let c_str = unsafe { CStr::from_ptr(result) };
        let string = c_str.to_str().unwrap_or("").to_string();

        self.free(result as *mut c_void)?; // free string

        Ok(string)
    }

    fn get_property_double(&self, name: &str) -> Result<f64, MpvError> {
        let get_property_double_fn: Symbol<
            unsafe extern "C" fn(*mut c_void, *const c_char, c_int, *mut c_double) -> c_int,
        > = unsafe { self.library.get(b"mpv_get_property")? };

        let name_cstring = CString::new(name)?;
        let mut value: c_double = 0.0;

        let result = unsafe {
            get_property_double_fn(
                self.handle.0,
                name_cstring.as_ptr(),
                MpvFormat::Double as c_int,
                &mut value as *mut c_double,
            )
        };

        if result == 0 {
            Ok(value)
        } else {
            Err(MpvError::GetPropertyError(name.to_string()))
        }
    }

    fn get_property_int(&self, name: &str) -> Result<i64, MpvError> {
        let get_property_int_fn: Symbol<
            unsafe extern "C" fn(*mut c_void, *const c_char, c_int, *mut i64) -> c_int,
        > = unsafe { self.library.get(b"mpv_get_property")? };

        let name_cstring = CString::new(name)?;
        let mut value: i64 = 0;

        let result = unsafe {
            get_property_int_fn(
                self.handle.0,
                name_cstring.as_ptr(),
                MpvFormat::Int64 as c_int,
                &mut value as *mut i64,
            )
        };

        if result == 0 {
            Ok(value)
        } else {
            Err(MpvError::GetPropertyError(name.to_string()))
        }
    }

    fn get_property_bool(&self, name: &str) -> Result<bool, MpvError> {
        let get_property_bool_fn: Symbol<
            unsafe extern "C" fn(*mut c_void, *const c_char, c_int, *mut c_int) -> c_int,
        > = unsafe { self.library.get(b"mpv_get_property")? };

        let name_cstring = CString::new(name)?;

        let mut value: c_int = 0;
        let result = unsafe {
            get_property_bool_fn(
                self.handle.0,
                name_cstring.as_ptr(),
                MpvFormat::Flag as c_int,
                &mut value as *mut c_int,
            )
        };

        if result < 0 {
            return Err(MpvError::GetPropertyError(name.to_string()));
        }

        Ok(value != 0)
    }

    fn set_property_int(&self, name: &str, value: i64) -> Result<(), MpvError> {
        let set_property_int_fn: Symbol<
            unsafe extern "C" fn(*mut c_void, *const c_char, c_int, *const i64) -> c_int,
        > = unsafe { self.library.get(b"mpv_set_property")? };

        let name_cstring = CString::new(name)?;

        let result = unsafe {
            set_property_int_fn(
                self.handle.0,
                name_cstring.as_ptr(),
                MpvFormat::Int64 as c_int,
                &value as *const i64,
            )
        };

        if result == 0 {
            Ok(())
        } else {
            Err(MpvError::SetPropertyError(name.to_string()))
        }
    }

    /// Free data allocated by MPV. This should be used to free the result of
    /// `get_property_string` and other functions that return dynamic memory data by MPV.
    fn free(&self, ptr: *mut c_void) -> Result<(), MpvError> {
        let free_fn: Symbol<unsafe extern "C" fn(*mut c_void)> =
            unsafe { self.library.get(b"mpv_free")? };
        unsafe { free_fn(ptr) };
        Ok(())
    }

    fn register_event_callback(
        &self,
        event_id: MpvEventId,
        callback: EventCallback,
    ) -> Result<(), MpvError> {
        let event_id = event_id as c_int;
        let mut callbacks = self.event_callbacks.lock().unwrap();
        callbacks
            .entry(event_id)
            .or_insert_with(Vec::new)
            .push(callback);
        Ok(())
    }

    fn process_events(&self) -> Result<(), MpvError> {
        let wait_event_fn: Symbol<unsafe extern "C" fn(*mut c_void, c_double) -> *mut MpvEvent> =
            unsafe { self.library.get(b"mpv_wait_event")? };

        loop {
            let event = unsafe { wait_event_fn(self.handle.0, Mpv::EVENT_TIMEOUT) };

            if event.is_null() {
                break;
            }

            let event = unsafe { &*event };
            if event.event_id == MpvEventId::None as c_int {
                continue;
            }

            let callbacks = self.event_callbacks.lock().unwrap();
            if let Some(event_callbacks) = callbacks.get(&event.event_id) {
                for callback in event_callbacks {
                    callback(event);
                }
            }
        }

        Ok(())
    }
}

impl Drop for Mpv {
    fn drop(&mut self) {
        if let Ok(destroy_fn) = unsafe {
            self.library
                .get::<unsafe extern "C" fn(*mut c_void)>(b"mpv_destroy")
        } {
            unsafe { destroy_fn(self.handle.0) };
        }
    }
}

/// Track struct according to documentation at
/// https://mpv.io/manual/stable/#command-interface-track-list
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: i64,
    #[serde(rename = "type")]
    pub type_: String, // need to use `type_` instead of `type` since `type` is a reserved keyword
    #[serde(rename = "src-id")]
    pub src_id: i64,
    pub title: Option<String>,
    pub lang: Option<String>,
    #[serde(default)]
    pub image: bool,
    #[serde(default)]
    pub albumart: bool,
    #[serde(default)]
    pub default: bool,
    #[serde(default)]
    pub forced: bool,
    pub selected: bool,
    #[serde(rename = "main-selection")]
    pub main_selection: Option<i64>,
    #[serde(default)]
    pub external: bool,
    #[serde(rename = "external-filename")]
    pub external_filename: Option<String>,
    pub codec: String,
    #[serde(rename = "codec-desc")]
    pub codec_desc: Option<String>,
    #[serde(rename = "codec-profile")]
    pub codec_profile: Option<String>,
    #[serde(rename = "ff-index")]
    pub ff_index: Option<i64>,
    #[serde(rename = "decoder-desc")]
    pub decoder_desc: Option<String>,
    #[serde(rename = "demux-w")]
    pub demux_w: Option<i64>,
    #[serde(rename = "demux-h")]
    pub demux_h: Option<i64>,
    #[serde(rename = "demux-crop-x")]
    pub demux_crop_x: Option<i64>,
    #[serde(rename = "demux-crop-y")]
    pub demux_crop_y: Option<i64>,
    #[serde(rename = "demux-crop-w")]
    pub demux_crop_w: Option<i64>,
    #[serde(rename = "demux-crop-h")]
    pub demux_crop_h: Option<i64>,
    #[serde(rename = "demux-channel-count")]
    pub demux_channel_count: Option<i64>,
    #[serde(rename = "demux-channels")]
    pub demux_channels: Option<String>,
    #[serde(rename = "demux-samplerate")]
    pub demux_samplerate: Option<i64>,
    #[serde(rename = "demux-fps")]
    pub demux_fps: Option<f64>,
    #[serde(rename = "demux-bitrate")]
    pub demux_bitrate: Option<i64>,
    #[serde(rename = "demux-rotation")]
    pub demux_rotation: Option<i64>,
    #[serde(rename = "demux-par")]
    pub demux_par: Option<f64>,
    #[serde(rename = "audio-channels")]
    pub audio_channels: Option<i64>,
    #[serde(rename = "replaygain-track-peak")]
    pub replaygain_track_peak: Option<f64>,
    #[serde(rename = "replaygain-track-gain")]
    pub replaygain_track_gain: Option<f64>,
    #[serde(rename = "replaygain-album-peak")]
    pub replaygain_album_peak: Option<f64>,
    #[serde(rename = "replaygain-album-gain")]
    pub replaygain_album_gain: Option<f64>,
}

/// The current tracks of the media being played.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentTracks {
    pub video: Option<Track>,
    pub audio: Option<Track>,
    pub subtitle: Option<Track>,
}

/// An entry in the playlist.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistEntry {
    pub filename: String,
    #[serde(default)]
    pub current: bool,
    #[serde(default)]
    pub playing: bool,
    pub title: Option<String>,
    pub id: Option<i64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum LoadMode {
    Replace,
    Append,
    AppendPlay,
    InsertNext,
    InsertNextPlay,
    InsertAt(usize),
    InsertAtPlay(usize),
}

impl Default for LoadMode {
    fn default() -> Self {
        LoadMode::Replace
    }
}

pub struct MpvPlayer {
    mpv: Arc<Mpv>,
}

impl MpvPlayer {
    pub fn new(lib_path: &str) -> Result<Arc<Self>, MpvError> {
        let mpv = Arc::new(Mpv::new(lib_path)?);
        let player = Arc::new(Self { mpv });

        player.start_event_processing();

        Ok(player)
    }

    fn escape_path(path: &str) -> String {
        path.replace('\\', "\\\\")
            .replace('\'', "\\\'")
            .replace('\"', "\\\"")
    }

    pub fn destroy(&self) -> Result<(), MpvError> {
        self.mpv.destroy()
    }

    pub fn attach_to_window(&self, wid: usize) -> Result<(), MpvError> {
        self.mpv.set_option("wid", &wid.to_string())
    }

    pub fn initialize(&self) -> Result<(), MpvError> {
        self.mpv.initialize()
    }

    pub fn load_file(&self, path: &str, mode: Option<LoadMode>) -> Result<(), MpvError> {
        let escaped_path = Self::escape_path(path);
        println!("Loading file: {}", path);
        println!("Loading file(escaped): {}", escaped_path);

        let command = match mode.unwrap_or_default() {
            LoadMode::Replace => format!("loadfile \"{}\"", escaped_path),
            LoadMode::Append => format!("loadfile \"{}\" append", escaped_path),
            LoadMode::AppendPlay => format!("loadfile \"{}\" append-play", escaped_path),
            LoadMode::InsertNext => format!("loadfile \"{}\" insert-next", escaped_path),
            LoadMode::InsertNextPlay => format!("loadfile \"{}\" insert-next-play", escaped_path),
            LoadMode::InsertAt(index) => {
                println!("Inserting at index: {}", index);
                format!("loadfile \"{}\" insert-at {}", escaped_path, index)
            }
            LoadMode::InsertAtPlay(index) => {
                format!("loadfile \"{}\" insert-at-play {}", escaped_path, index)
            }
        };

        self.mpv.command_string(&command)
    }

    pub fn play(&self) -> Result<(), MpvError> {
        self.mpv.command_string("set pause no")
    }

    pub fn pause(&self) -> Result<(), MpvError> {
        self.mpv.command_string("set pause yes")
    }

    pub fn seek(&self, position: f64) -> Result<(), MpvError> {
        self.mpv
            .command_string(&format!("seek {} absolute", position))
    }

    pub fn stop(&self) -> Result<(), MpvError> {
        self.mpv.command_string("stop")
    }

    // BEYOND THIS IS UNTESTED

    pub fn get_position(&self) -> Result<f64, MpvError> {
        self.mpv.get_property_double("time-pos")
    }

    pub fn get_duration(&self) -> Result<f64, MpvError> {
        self.mpv.get_property_double("duration")
    }

    pub fn get_volume(&self) -> Result<f64, MpvError> {
        self.mpv.get_property_double("volume")
    }

    pub fn set_volume(&self, volume: f64) -> Result<(), MpvError> {
        self.mpv.command_string(&format!("set volume {}", volume))
    }

    pub fn get_filename(&self) -> Result<String, MpvError> {
        self.mpv.get_property_string("filename")
    }

    pub fn get_path(&self) -> Result<String, MpvError> {
        self.mpv.get_property_string("path")
    }

    pub fn is_paused(&self) -> Result<bool, MpvError> {
        self.mpv.get_property_bool("pause")
    }

    pub fn get_chapter(&self) -> Result<i64, MpvError> {
        self.mpv.get_property_double("chapter").map(|ch| ch as i64)
    }

    pub fn get_chapter_count(&self) -> Result<i64, MpvError> {
        self.mpv.get_property_double("chapters").map(|ch| ch as i64)
    }

    pub fn disable_osd(&self) -> Result<(), MpvError> {
        self.mpv.command_string("set osd-level 0")
    }

    pub fn get_tracks(&self) -> Result<Vec<Track>, MpvError> {
        let tracks_json = self.mpv.get_property_string("track-list")?;
        let tracks: Vec<Track> = serde_json::from_str(&tracks_json).map_err(|e| {
            MpvError::GetPropertyError(format!(
                "Failed to parse track-list: {}. JSON: {}",
                e, tracks_json
            ))
        })?;
        Ok(tracks)
    }

    pub fn get_audio_tracks(&self) -> Result<Vec<Track>, MpvError> {
        self.get_tracks()
            .map(|tracks| tracks.into_iter().filter(|t| t.type_ == "audio").collect())
    }

    pub fn get_video_tracks(&self) -> Result<Vec<Track>, MpvError> {
        self.get_tracks()
            .map(|tracks| tracks.into_iter().filter(|t| t.type_ == "video").collect())
    }

    pub fn get_subtitle_tracks(&self) -> Result<Vec<Track>, MpvError> {
        self.get_tracks()
            .map(|tracks| tracks.into_iter().filter(|t| t.type_ == "sub").collect())
    }

    pub fn get_current_video_track(&self) -> Result<Option<Track>, MpvError> {
        let current_vid = self.mpv.get_property_int("vid")?;
        Ok(self
            .get_tracks()?
            .into_iter()
            .find(|t| t.type_ == "video" && t.id == current_vid))
    }

    pub fn get_current_audio_track(&self) -> Result<Option<Track>, MpvError> {
        let current_aid = self.mpv.get_property_int("aid")?;
        Ok(self
            .get_tracks()?
            .into_iter()
            .find(|t| t.type_ == "audio" && t.id == current_aid))
    }

    pub fn get_current_subtitle_track(&self) -> Result<Option<Track>, MpvError> {
        let current_sid = self.mpv.get_property_int("sid")?;
        Ok(self
            .get_tracks()?
            .into_iter()
            .find(|t| t.type_ == "sub" && t.id == current_sid))
    }

    pub fn get_current_tracks(&self) -> Result<CurrentTracks, MpvError> {
        Ok(CurrentTracks {
            video: self.get_current_video_track()?,
            audio: self.get_current_audio_track()?,
            subtitle: self.get_current_subtitle_track()?,
        })
    }

    pub fn set_video_track(&self, track_id: i64) -> Result<(), MpvError> {
        self.mpv.set_property_int("vid", track_id)
    }

    pub fn set_audio_track(&self, track_id: i64) -> Result<(), MpvError> {
        self.mpv.set_property_int("aid", track_id)
    }

    pub fn set_subtitle_track(&self, track_id: i64) -> Result<(), MpvError> {
        self.mpv.set_property_int("sid", track_id)
    }

    pub fn playlist_next(&self) -> Result<(), MpvError> {
        self.mpv.command_string("playlist-next")
    }

    pub fn playlist_prev(&self) -> Result<(), MpvError> {
        self.mpv.command_string("playlist-prev")
    }

    pub fn get_playlist(&self) -> Result<Vec<PlaylistEntry>, MpvError> {
        let playlist_json = self.mpv.get_property_string("playlist")?;
        let playlist: Vec<PlaylistEntry> = serde_json::from_str(&playlist_json).map_err(|e| {
            MpvError::GetPropertyError(format!(
                "Failed to parse playlist: {}. JSON: {}",
                e, playlist_json
            ))
        })?;
        Ok(playlist)
    }

    pub fn get_playlist_pos(&self) -> Result<i64, MpvError> {
        self.mpv.get_property_int("playlist-pos")
    }

    pub fn set_playlist_pos(&self, pos: i64) -> Result<(), MpvError> {
        self.mpv.set_property_int("playlist-pos", pos)
    }

    pub fn set_playlist_from_paths<P: AsRef<Path>>(&self, paths: &[P]) -> Result<(), MpvError> {
        self.clear_playlist()?;

        for path in paths {
            let path_str = path.as_ref().to_str().ok_or_else(|| {
                MpvError::CommandError("Failed to convert path to string".to_string())
            })?;
            let escaped_path = Self::escape_path(path_str);
            self.mpv
                .command_string(&format!("loadfile \"{}\" append", escaped_path))?;
        }

        Ok(())
    }

    /// Loads a playlist from a file. (Don't confuse with `set_playlist_from_paths`)
    ///
    /// The path should be a file path to a playlist file, such as an M3U or a PLS file.
    ///
    /// # Errors
    ///
    /// * `MpvError::CommandError` if the command failed.
    pub fn load_playlist(&self, path: &str) -> Result<(), MpvError> {
        let escaped_path = Self::escape_path(path);
        self.mpv
            .command_string(&format!("loadlist \"{}\"", escaped_path))
    }

    pub fn clear_playlist(&self) -> Result<(), MpvError> {
        self.mpv.command_string("playlist-clear")
    }

    pub fn set_tracks(
        &self,
        video: Option<i64>,
        audio: Option<i64>,
        subtitle: Option<i64>,
    ) -> Result<(), MpvError> {
        if let Some(vid) = video {
            self.set_video_track(vid)?;
        }
        if let Some(aid) = audio {
            self.set_audio_track(aid)?;
        }
        if let Some(sid) = subtitle {
            self.set_subtitle_track(sid)?;
        }
        Ok(())
    }

    pub fn register_event_callback(
        &self,
        event_id: MpvEventId,
        callback: impl Fn(&MpvEvent) + Send + 'static,
    ) -> Result<(), MpvError> {
        self.mpv
            .register_event_callback(event_id, Box::new(callback))
    }

    /// Starts an event processing thread. This is necessary to receive events
    /// from libmpv without blocking the current thread.
    fn start_event_processing(&self) {
        let mpv = self.mpv.clone();
        thread::spawn(move || {
            let _ = mpv.process_events();
        });
    }
}
