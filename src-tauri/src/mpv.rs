use libloading::{Library, Symbol};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::ffi::{c_void, CString};
use std::sync::{Arc, Mutex};
use uuid::Uuid;

static PLAYER_MAP: Lazy<Mutex<HashMap<Uuid, Arc<MpvPlayer>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// Thread-safe wrapper for the raw pointer
struct MpvHandle(*mut c_void);
unsafe impl Send for MpvHandle {}
unsafe impl Sync for MpvHandle {}

struct Mpv {
    handle: MpvHandle,
    library: Arc<Library>,
}

impl Mpv {
    fn new(lib_path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let library = Arc::new(unsafe { Library::new(lib_path)? });
        let create_fn: Symbol<unsafe extern "C" fn() -> *mut c_void> =
            unsafe { library.get(b"mpv_create")? };
        let handle = unsafe { create_fn() };

        Ok(Self {
            handle: MpvHandle(handle),
            library,
        })
    }

    fn destroy(&self) -> Result<(), Box<dyn std::error::Error>> {
        let destroy_fn: Symbol<unsafe extern "C" fn(*mut c_void) -> i32> = unsafe {
            self.library
                .get(b"mpv_destroy")
                .expect("mpv_destroy not found")
        };

        unsafe { destroy_fn(self.handle.0) };
        Ok(())
    }

    fn set_option(&self, name: &str, value: &str) -> Result<(), Box<dyn std::error::Error>> {
        let set_option_fn: Symbol<unsafe extern "C" fn(*mut c_void, *const i8, *const i8) -> i32> =
            unsafe { self.library.get(b"mpv_set_option_string")? };

        let name_cstring = CString::new(name)?;
        let value_cstring = CString::new(value)?;

        let result =
            unsafe { set_option_fn(self.handle.0, name_cstring.as_ptr(), value_cstring.as_ptr()) };

        if result == 0 {
            Ok(())
        } else {
            Err(format!("Failed to set option: {} = {}", name, value).into())
        }
    }

    fn initialize(&self) -> Result<(), Box<dyn std::error::Error>> {
        let init_fn: Symbol<unsafe extern "C" fn(*mut c_void) -> i32> =
            unsafe { self.library.get(b"mpv_initialize")? };

        let result = unsafe { init_fn(self.handle.0) };

        if result == 0 {
            Ok(())
        } else {
            Err("Failed to initialize MPV".into())
        }
    }

    fn command(&self, command: &str) -> Result<(), Box<dyn std::error::Error>> {
        let command_fn: Symbol<unsafe extern "C" fn(*mut c_void, *const i8) -> i32> =
            unsafe { self.library.get(b"mpv_command_string")? };

        let command_cstring = CString::new(command)?;

        let result = unsafe { command_fn(self.handle.0, command_cstring.as_ptr()) };

        if result == 0 {
            Ok(())
        } else {
            Err(format!("Failed to execute command: {}", command).into())
        }
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

#[derive(Clone, Serialize, Deserialize)]
pub struct SerializableMpvPlayer {
    id: Uuid,
    // Add any other fields you want to serialize
    // For example, last_position: f64,
}

#[derive(Clone)]
pub struct MpvPlayer {
    mpv: Arc<Mpv>,
    id: Uuid,
}

impl MpvPlayer {
    pub fn new(lib_path: &str) -> Result<Arc<Self>, Box<dyn std::error::Error>> {
        let mpv = Arc::new(Mpv::new(lib_path)?);
        let id = Uuid::new_v4();
        let player = Arc::new(Self { mpv, id });

        PLAYER_MAP.lock().unwrap().insert(id, Arc::clone(&player));

        Ok(player)
    }

    pub fn destroy(&self) -> Result<(), Box<dyn std::error::Error>> {
        PLAYER_MAP.lock().unwrap().remove(&self.id);
        self.mpv.destroy()
    }

    pub fn attach_to_window(&self, wid: usize) -> Result<(), Box<dyn std::error::Error>> {
        self.mpv.set_option("wid", &wid.to_string())
    }

    pub fn initialize(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.mpv.initialize()
    }

    pub fn load_file(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        self.mpv.command(&format!("loadfile \'{}\'", path))
    }

    pub fn play(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.mpv.command("set pause no")
    }

    pub fn pause(&self) -> Result<(), Box<dyn std::error::Error>> {
        self.mpv.command("set pause yes")
    }

    pub fn seek(&self, position: f64) -> Result<(), Box<dyn std::error::Error>> {
        self.mpv.command(&format!("seek {} absolute", position))
    }

    pub fn get_id(&self) -> Uuid {
        self.id
    }

    pub fn to_serializable(&self) -> SerializableMpvPlayer {
        SerializableMpvPlayer {
            id: self.id,
            // Add any other fields you want to serialize
            // For example, last_position: self.get_current_position(),
        }
    }

    pub fn from_id(id: Uuid) -> Option<Arc<Self>> {
        PLAYER_MAP.lock().unwrap().get(&id).cloned()
    }
}

// Implement Serialize and Deserialize for MpvPlayer
impl Serialize for MpvPlayer {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.to_serializable().serialize(serializer)
    }
}

impl<'de> Deserialize<'de> for MpvPlayer {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let serializable = SerializableMpvPlayer::deserialize(deserializer)?;
        MpvPlayer::from_id(serializable.id)
            .ok_or_else(|| serde::de::Error::custom("MpvPlayer not found"))
            .map(|arc| (*arc).clone())
    }
}

// Helper functions for serialization and deserialization
pub fn serialize_player(player: &Arc<MpvPlayer>) -> Result<String, serde_json::Error> {
    serde_json::to_string(&player.to_serializable())
}

pub fn deserialize_player(json: &str) -> Result<Arc<MpvPlayer>, Box<dyn std::error::Error>> {
    let serializable: SerializableMpvPlayer = serde_json::from_str(json)?;
    MpvPlayer::from_id(serializable.id).ok_or_else(|| "MpvPlayer not found".into())
}

// Function to clean up players that are no longer needed
pub fn cleanup_players() {
    PLAYER_MAP
        .lock()
        .unwrap()
        .retain(|_, player| Arc::strong_count(player) > 1);
}
