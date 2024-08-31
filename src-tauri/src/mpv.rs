use libloading::{Library, Symbol};
use serde::{Deserialize, Serialize};
use std::ffi::{c_char, CStr, CString};
use std::os::raw::{c_double, c_int, c_void};
use std::sync::Arc;
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

/**
 * Mpv formats enum copied straight from mpv's client.h file.
 * See original client.h file for details and usage.
 */
#[repr(C)]
enum MpvFormat {
    MpvFormatNone = 0,
    MpvFormatString = 1,
    MpvFormatOsdString = 2,
    MpvFormatFlag = 3,
    MpvFormatInt64 = 4,
    MpvFormatDouble = 5,
    MpvFormatNode = 6,
    MpvFormatNodeArray = 7,
    MpvFormatNodeMap = 8,
    MpvFormatByteArray = 9,
}

struct Mpv {
    handle: MpvHandle,
    library: Arc<Library>,
}

impl Mpv {
    fn new(lib_path: &str) -> Result<Self, MpvError> {
        let library = Arc::new(unsafe { Library::new(lib_path)? });
        let create_fn: Symbol<unsafe extern "C" fn() -> *mut c_void> =
            unsafe { library.get(b"mpv_create")? };
        let handle = unsafe { create_fn() };

        Ok(Self {
            handle: MpvHandle(handle),
            library,
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
            unsafe extern "C" fn(*mut c_void, *const c_char, c_int) -> *mut c_char,
        > = unsafe { self.library.get(b"mpv_get_property_string")? };

        let name_cstring = CString::new(name)?;

        let result = unsafe { get_property_string_fn(self.handle.0, name_cstring.as_ptr(), 0) };

        if result.is_null() {
            return Err(MpvError::GetPropertyError(name.to_string()));
        }

        let c_str = unsafe { CStr::from_ptr(result) };
        let string = c_str.to_str().unwrap_or("").to_string();

        // Free the string allocated by mpv
        let free_fn: Symbol<unsafe extern "C" fn(*mut c_void, *mut c_char)> =
            unsafe { self.library.get(b"mpv_free")? };
        unsafe { free_fn(self.handle.0, result) };

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
                MpvFormat::MpvFormatDouble as c_int,
                &mut value as *mut c_double,
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
                MpvFormat::MpvFormatFlag as c_int,
                &mut value as *mut c_int,
            )
        };

        if result < 0 {
            return Err(MpvError::GetPropertyError(name.to_string()));
        }

        Ok(value != 0)
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

pub struct MpvPlayer {
    mpv: Arc<Mpv>,
}

impl MpvPlayer {
    pub fn new(lib_path: &str) -> Result<Arc<Self>, MpvError> {
        let mpv = Arc::new(Mpv::new(lib_path)?);
        let player = Arc::new(Self { mpv });

        Ok(player)
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

    pub fn load_file(&self, path: &str) -> Result<(), MpvError> {
        self.mpv.command_string(&format!("loadfile '{}'", path))
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
}
