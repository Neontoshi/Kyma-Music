use std::ffi::CString;

#[test]
fn test_mpv_playback() {
    unsafe {
        let c_str = CString::new("C").unwrap();
        libc::setlocale(libc::LC_NUMERIC, c_str.as_ptr());
    }
    
    let mut builder = mpv::MpvHandlerBuilder::new().expect("Builder failed");
    builder.set_option("video", "no").expect("set_option failed");
    let mut mpv = builder.build().expect("Build failed");
    
    let path = "/home/dicey/Music/100   Shallipopi.mp3";
    mpv.command(&["loadfile", path, "replace"]).expect("Play command failed");
    println!("Playing for 3 seconds...");
    std::thread::sleep(std::time::Duration::from_secs(3));
}
