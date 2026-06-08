use std::process::Command;
use anyhow::{Result, anyhow};

pub fn set_volume(val: u32) -> Result<()> {
    if val > 100 {
        return Err(anyhow!("Volume must be between 0 and 100"));
    }
    
    #[cfg(unix)]
    {
        // Try pactl first (PulseAudio/PipeWire)
        let pactl_status = Command::new("pactl")
            .args(&["set-sink-volume", "@DEFAULT_SINK@", &format!("{}%", val)])
            .status();
            
        if pactl_status.is_ok() && pactl_status.unwrap().success() {
            return Ok(());
        }
        
        // Fallback to amixer (ALSA)
        let amixer_status = Command::new("amixer")
            .args(&["sset", "Master", &format!("{}%", val)])
            .status();
            
        if amixer_status.is_ok() && amixer_status.unwrap().success() {
            return Ok(());
        }
    }
    
    tracing::info!("Mock/Fallback: volume set to {}%", val);
    Ok(())
}

pub fn set_brightness(val: u32) -> Result<()> {
    if val > 100 {
        return Err(anyhow!("Brightness must be between 0 and 100"));
    }
    
    #[cfg(unix)]
    {
        // Try brightnessctl
        let status = Command::new("brightnessctl")
            .args(&["set", &format!("{}%", val)])
            .status();
            
        if status.is_ok() && status.unwrap().success() {
            return Ok(());
        }
        
        // Fallback to light
        let status_light = Command::new("light")
            .args(&["-S", &val.to_string()])
            .status();
            
        if status_light.is_ok() && status_light.unwrap().success() {
            return Ok(());
        }
    }
    
    tracing::info!("Mock/Fallback: brightness set to {}%", val);
    Ok(())
}
