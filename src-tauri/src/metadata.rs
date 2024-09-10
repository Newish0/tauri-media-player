use lofty::file::{AudioFile, TaggedFileExt};
use lofty::tag::Accessor;
use serde::{Deserialize, Serialize};
use std::path::Path;

use lofty::probe::Probe;

#[derive(Serialize, Deserialize, Debug)]
pub struct SimplifiedMetadata {
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album: Option<String>,
    pub year: Option<u32>,
    pub track: Option<u32>,
    pub total_tracks: Option<u32>,
    pub disc: Option<u32>,
    pub total_discs: Option<u32>,
    pub genre: Option<String>,
    // pub pictures: Option<Vec<Vec<u8>>>,
    pub duration: f64,
    pub bitrate: Option<u32>,
    pub sample_rate: Option<u32>,
    pub channels: Option<u8>,
    pub bit_depth: Option<u8>,
}

pub async fn parse_metadata(path: &str) -> Result<SimplifiedMetadata, Box<dyn std::error::Error>> {
    let path = Path::new(path);
    let tagged_file = Probe::open(path)?.guess_file_type()?.read()?;

    let properties = tagged_file.properties();
    let tag = tagged_file
        .primary_tag()
        .or_else(|| tagged_file.first_tag());

    let mut metadata = SimplifiedMetadata {
        title: None,
        artist: None,
        album: None,
        year: None,
        track: None,
        total_tracks: None,
        disc: None,
        total_discs: None,
        genre: None,
        // pictures: None,
        duration: properties.duration().as_secs_f64(),
        bitrate: properties.audio_bitrate(),
        sample_rate: properties.sample_rate(),
        channels: properties.channels(),
        bit_depth: properties.bit_depth(),
    };

    if let Some(tag) = tag {
        metadata.title = tag.title().map(|cow| cow.into_owned());
        metadata.artist = tag.artist().map(|cow| cow.into_owned());
        metadata.album = tag.album().map(|cow| cow.into_owned());
        metadata.year = tag.year();
        metadata.track = tag.track();
        metadata.genre = tag.genre().map(|cow| cow.into_owned());
        metadata.disc = tag.disk();
        metadata.total_discs = tag.disk_total();
        metadata.total_tracks = tag.track_total();

        // let pictures = tag.pictures().iter().map(|p| p.data().to_vec()).collect();
        // metadata.pictures = Some(pictures);
    }

    Ok(metadata)
}
