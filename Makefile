# AIOS Makefile
# Build system for the AIOS ISO
# Requires: archiso, mkarchiso, qemu-system-x86_64 (for testing)
# Run on: Dedicated Linux build machine (Arch Linux)

PROFILE_DIR := iso
OUT_DIR     := build
ISO_NAME    := felbicos-0.1.0-x86_64.iso
WORK_DIR    := $(OUT_DIR)/work
ISO_OUT     := $(OUT_DIR)/iso

# QEMU settings for smoke testing
QEMU        := qemu-system-x86_64
QEMU_MEM    := 4G
QEMU_CPUS   := 4
QEMU_FLAGS  := -enable-kvm -machine q35 -cpu host \
               -m $(QEMU_MEM) -smp $(QEMU_CPUS) \
               -vga virtio -display sdl,gl=on \
               -device virtio-net-pci,netdev=net0 \
               -netdev user,id=net0 \
               -cdrom $(ISO_OUT)/$(ISO_NAME) \
               -boot d

# UEFI firmware for QEMU
OVMF        := /usr/share/ovmf/x64/OVMF.fd

.PHONY: all iso stage-aisd clean qemu qemu-uefi help

all: iso

## stage-aisd: Build and stage the AI daemon into the archiso profile
stage-aisd:
	@echo "[felbicos] Building aisd release binary..."
	cargo build --release --manifest-path aisd/Cargo.toml
	install -Dm755 aisd/target/release/aisd iso/airootfs/usr/bin/aisd
	install -Dm755 aisd/target/release/felbicos-ai iso/airootfs/usr/bin/felbicos-ai
	install -Dm644 aisd/systemd/aisd.service iso/airootfs/etc/systemd/system/aisd.service
	install -Dm644 aisd/systemd/aios-firstboot.service iso/airootfs/etc/systemd/system/aios-firstboot.service
	install -Dm755 aisd/systemd/firstboot-download.sh iso/airootfs/usr/lib/aios/firstboot-download.sh
	# Build and stage Wayland compositor (aios-comp)
	rm -rf compositor/build-meson
	meson setup compositor/build-meson compositor
	meson compile -C compositor/build-meson
	install -Dm755 compositor/build-meson/aios-comp iso/airootfs/usr/bin/aios-comp
	rm -rf iso/airootfs/usr/share/desktop-shell
	rm -rf iso/airootfs/usr/share/desktop
	mkdir -p iso/airootfs/usr/share
	cp -r desktop-shell iso/airootfs/usr/share/desktop-shell
	cp -r desktop iso/airootfs/usr/share/desktop
	@if [ -f iso/airootfs/usr/share/plymouth/themes/felbicos/felbicos-logo.png ]; then \
		cp iso/airootfs/usr/share/plymouth/themes/felbicos/felbicos-logo.png \
		   iso/airootfs/usr/share/plymouth/themes/aios/aios-logo.png; \
	fi
	# Stage custom Calamares configurations
	mkdir -p iso/airootfs/etc/calamares/modules
	cp installer/settings.conf iso/airootfs/etc/calamares/settings.conf
	cp installer/modules/felbicos-ai-setup/felbicos-ai-setup.conf iso/airootfs/etc/calamares/modules/felbicos-ai-setup.conf
	cp installer/modules/felbicos-disk/felbicos-disk.conf iso/airootfs/etc/calamares/modules/felbicos-disk.conf
	cp installer/modules/services-systemd.conf iso/airootfs/etc/calamares/modules/services-systemd.conf
	# Stage custom Calamares branding
	mkdir -p iso/airootfs/usr/share/calamares/branding/felbicos
	cp -r installer/branding/felbicos/* iso/airootfs/usr/share/calamares/branding/felbicos/
	# Stage custom Calamares python modules
	mkdir -p iso/airootfs/usr/lib/calamares/modules/felbicos-ai-setup
	cp installer/modules/felbicos-ai-setup/main.py iso/airootfs/usr/lib/calamares/modules/felbicos-ai-setup/
	cp installer/modules/felbicos-ai-setup/module.desc iso/airootfs/usr/lib/calamares/modules/felbicos-ai-setup/
	mkdir -p iso/airootfs/usr/lib/calamares/modules/felbicos-disk
	cp installer/modules/felbicos-disk/main.py iso/airootfs/usr/lib/calamares/modules/felbicos-disk/
	cp installer/modules/felbicos-disk/module.desc iso/airootfs/usr/lib/calamares/modules/felbicos-disk/


## iso: Build the AIOS live ISO
iso: stage-aisd
	@echo "[felbicos] Building ISO..."
	@mkdir -p $(WORK_DIR) $(ISO_OUT)
	sudo mkarchiso \
		-v \
		-w $(WORK_DIR) \
		-o $(ISO_OUT) \
		$(PROFILE_DIR)
	@echo "[felbicos] ISO built: $(ISO_OUT)/$(ISO_NAME)"

## qemu: Boot the ISO in QEMU (BIOS mode)
qemu: $(ISO_OUT)/$(ISO_NAME)
	$(QEMU) $(QEMU_FLAGS)

## qemu-uefi: Boot the ISO in QEMU (UEFI mode)
qemu-uefi: $(ISO_OUT)/$(ISO_NAME)
	$(QEMU) $(QEMU_FLAGS) \
		-bios $(OVMF)

## clean: Remove build artifacts
clean:
	@echo "[aios] Cleaning build artifacts..."
	sudo rm -rf $(WORK_DIR)
	@echo "[aios] Done."

## distclean: Remove all build output including ISO
distclean: clean
	rm -rf $(ISO_OUT)

## help: Show this help
help:
	@grep -E '^## ' Makefile | sed 's/## /  make /g'
