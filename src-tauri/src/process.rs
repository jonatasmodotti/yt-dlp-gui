//! Platform details of spawning and stopping child processes.

use tokio::process::Command;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

/// Don't flash a console window for each child on Windows.
pub fn no_window(cmd: &mut Command) {
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    #[cfg(not(windows))]
    let _ = cmd;
}

/// Put the child in its own process group so cancelling also stops the
/// ffmpeg processes yt-dlp spawns.
pub fn own_process_group(cmd: &mut Command) {
    #[cfg(unix)]
    cmd.process_group(0);
    #[cfg(not(unix))]
    let _ = cmd;
}

/// Ask the process tree rooted at `pid` to stop.
pub fn terminate_tree(pid: u32) {
    #[cfg(unix)]
    signal_group(pid, libc::SIGTERM);
    #[cfg(windows)]
    taskkill(pid);
}

/// Stop the process tree rooted at `pid` immediately.
pub fn kill_tree(pid: u32) {
    #[cfg(unix)]
    signal_group(pid, libc::SIGKILL);
    #[cfg(windows)]
    taskkill(pid);
}

#[cfg(unix)]
fn signal_group(pid: u32, signal: libc::c_int) {
    let Ok(pgid) = libc::pid_t::try_from(pid) else { return };
    // SAFETY: plain syscall; a negative pid targets the process group we
    // created in `own_process_group`. Errors (already exited) are harmless.
    unsafe {
        libc::kill(-pgid, signal);
    }
}

#[cfg(windows)]
fn taskkill(pid: u32) {
    use std::os::windows::process::CommandExt;
    // yt-dlp.exe is a PyInstaller bootloader with a child process; /T kills both.
    // Absolute path so a planted taskkill.exe next to the app is never used;
    // spawn (not wait) so cancelling never blocks an async worker.
    let root = std::env::var_os("SystemRoot").unwrap_or_else(|| r"C:\Windows".into());
    let exe = std::path::Path::new(&root).join("System32").join("taskkill.exe");
    let _ = std::process::Command::new(exe)
        .args(["/PID", &pid.to_string(), "/T", "/F"])
        .creation_flags(CREATE_NO_WINDOW)
        .spawn();
}
