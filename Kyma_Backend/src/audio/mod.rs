// audio/mod.rs

mod decoder;
pub mod engine;
mod http_reader;
mod output;
use crate::user_action;

use std::sync::mpsc::Sender;

#[derive(Debug)]
pub enum Command {
    PlayFile(String, Sender<u64>),
    PlayYoutube(String, String, Sender<u64>),
    PlayNext(String, bool),
    Pause,
    Resume,
    Stop,
    Seek(f64),
    SetVolume(f32),
    GetState(Sender<AudioState>),
    Shutdown,
}

#[derive(Debug, Clone)]
pub struct AudioState {
    pub is_playing: bool,
    pub position: f64,
    pub duration: f64,
    pub volume: f32,
    pub is_buffering: bool,
}

pub struct EngineHandle {
    sender: Sender<Command>,
}

impl EngineHandle {
    pub fn new(app_handle: tauri::AppHandle) -> Self {
        user_action!("ENGINE", "Initializing audio engine");
        let (tx, rx) = std::sync::mpsc::channel::<Command>();
        let tx2 = tx.clone();
        std::thread::spawn(move || {
            engine::run(rx, tx2, app_handle);
        });
        Self { sender: tx }
    }

    pub fn play_file(&self, path: &str) -> u64 {
        let (tx, rx) = std::sync::mpsc::channel();
        let _ = self.sender.send(Command::PlayFile(path.to_string(), tx));
        rx.recv().unwrap_or(0)
    }

    pub fn play_youtube(&self, url: &str, video_id: &str) -> u64 {
        let (tx, rx) = std::sync::mpsc::channel();
        let _ = self.sender.send(Command::PlayYoutube(
            url.to_string(),
            video_id.to_string(),
            tx,
        ));
        rx.recv().unwrap_or(0)
    }

    pub fn play(&self, path_or_url: &str, is_youtube: bool) -> u64 {
        if is_youtube {
            self.play_youtube(path_or_url, "")
        } else {
            self.play_file(path_or_url)
        }
    }

    pub fn play_next(&self, path_or_url: &str, is_youtube: bool) {
        let _ = self
            .sender
            .send(Command::PlayNext(path_or_url.to_string(), is_youtube));
    }

    pub fn pause(&self) {
        let _ = self.sender.send(Command::Pause);
    }

    pub fn resume(&self) {
        let _ = self.sender.send(Command::Resume);
    }

    pub fn stop(&self) {
        let _ = self.sender.send(Command::Stop);
    }

    pub fn seek(&self, pos: f64) {
        let _ = self.sender.send(Command::Seek(pos));
    }

    pub fn set_volume(&self, v: f32) {
        let _ = self.sender.send(Command::SetVolume(v));
    }

    pub fn get_state(&self) -> AudioState {
        let (tx, rx) = std::sync::mpsc::channel();
        let _ = self.sender.send(Command::GetState(tx));
        rx.recv().unwrap_or(AudioState {
            is_playing: false,
            position: 0.0,
            duration: 0.0,
            volume: 0.7,
            is_buffering: false,
        })
    }
}

impl Drop for EngineHandle {
    fn drop(&mut self) {
        user_action!("ENGINE", "Shutting down audio engine");
        let _ = self.sender.send(Command::Shutdown);
        std::thread::sleep(std::time::Duration::from_millis(300));
    }
}
