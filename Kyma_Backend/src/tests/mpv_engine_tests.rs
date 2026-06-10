// Kyma_Backend/src/tests/mpv_engine_tests.rs

#[test]
fn test_get_audio_output_linux() {
    // On Linux CI, this should return "pipewire"
    let ao = crate::audio::mpv_engine::get_audio_output();
    #[cfg(target_os = "linux")]
    assert_eq!(ao, "pipewire");
    #[cfg(target_os = "macos")]
    assert_eq!(ao, "coreaudio");
    #[cfg(target_os = "windows")]
    assert_eq!(ao, "wasapi");
}

#[test]
fn test_make_load_arg_youtube() {
    let result = crate::audio::mpv_engine::make_load_arg("dQw4w9WgXcQ");
    assert_eq!(result, "ytdl://https://www.youtube.com/watch?v=dQw4w9WgXcQ");
}

#[test]
fn test_make_load_arg_url() {
    let result = crate::audio::mpv_engine::make_load_arg("https://soundcloud.com/artist/track");
    assert_eq!(result, "https://soundcloud.com/artist/track");
}
