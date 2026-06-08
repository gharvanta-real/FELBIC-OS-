#!/usr/bin/env pwsh
# FELBIC OS - QEMU Test Launcher (Windows)
# Usage: .\test-qemu.ps1 [-Mode bios|uefi] [-Memory 4G] [-Cpus 4]

param(
    [ValidateSet("bios","uefi")]
    [string]$Mode = "bios",
    [string]$Memory = "4G",
    [int]$Cpus = 4,
    [string]$IsoPath = "$PSScriptRoot\build\iso\felbicos-0.1.0-x86_64.iso"
)

$QEMU       = "C:\Program Files\QEMU\qemu-system-x86_64.exe"
$OVMF_CODE  = "C:\Program Files\QEMU\share\edk2-x86_64-code.fd"
$OVMF_VARS  = "$PSScriptRoot\build\ovmf-vars-felbicos.fd"
$OVMF_VARS_TEMPLATE = "C:\Program Files\QEMU\share\edk2-i386-vars.fd"

if (-not (Test-Path $QEMU))    { Write-Error "QEMU not found: $QEMU"; exit 1 }
if (-not (Test-Path $IsoPath)) { Write-Error "ISO not found: $IsoPath. Run the build first."; exit 1 }

Write-Host ""
Write-Host "  FELBIC OS - QEMU Launcher" -ForegroundColor Magenta
Write-Host "  Mode   : $Mode" -ForegroundColor Cyan
Write-Host "  Memory : $Memory  CPUs: $Cpus" -ForegroundColor Cyan
Write-Host "  ISO    : $IsoPath" -ForegroundColor White
Write-Host ""

# BIOS mode
if ($Mode -eq "bios") {
    Write-Host "  [BIOS] SeaBIOS + IDE CD-ROM" -ForegroundColor Green

    & $QEMU `
        -machine pc `
        -cpu qemu64 `
        -smp $Cpus `
        -m $Memory `
        -drive "file=$IsoPath,media=cdrom,if=ide,readonly=on" `
        -boot order=d `
        -vga std `
        -display sdl `
        -device e1000,netdev=net0 `
        -netdev "user,id=net0" `
        -audiodev "dsound,id=audio0" `
        -device "intel-hda" `
        -device "hda-duplex,audiodev=audio0"
}
# UEFI mode
elseif ($Mode -eq "uefi") {
    Write-Host "  [UEFI] systemd-boot with OVMF firmware" -ForegroundColor Green

    if (-not (Test-Path $OVMF_VARS)) {
        New-Item -ItemType Directory -Path (Split-Path $OVMF_VARS) -Force | Out-Null
        Copy-Item $OVMF_VARS_TEMPLATE $OVMF_VARS
        Write-Host "  Copied OVMF VARS to: $OVMF_VARS" -ForegroundColor DarkGray
    }

    # Clean old log
    if (Test-Path "$PSScriptRoot\qemu-boot.log") { Remove-Item "$PSScriptRoot\qemu-boot.log" -Force }

    & $QEMU `
        -machine q35 `
        -cpu qemu64 `
        -smp $Cpus `
        -m $Memory `
        -drive "if=pflash,format=raw,readonly=on,file=$OVMF_CODE" `
        -drive "if=pflash,format=raw,file=$OVMF_VARS" `
        -drive "file=$IsoPath,media=cdrom,if=none,id=cd0,readonly=on" `
        -device "ide-cd,drive=cd0,bus=ide.1" `
        -boot order=d `
        -vga virtio `
        -display sdl `
        -device "e1000,netdev=net0" `
        -netdev "user,id=net0" `
        -serial "file:$PSScriptRoot\qemu-boot.log"
}
