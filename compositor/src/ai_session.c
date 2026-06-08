// aios-comp ai_session.c — AI Virtual seat and /dev/uinput input emulation
#define _POSIX_C_SOURCE 199309L
#define _GNU_SOURCE

#include <fcntl.h>
#include <string.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <linux/uinput.h>
#include <stdlib.h>
#include <time.h>
#include <wayland-server-core.h>
#include <wlr/types/wlr_seat.h>
#include <wlr/types/wlr_scene.h>
#include <wlr/util/log.h>

#include "server.h"

// Set up virtual mouse/keyboard emulation using the Linux uinput subsystem
static int init_uinput_device(void) {
    int fd = open("/dev/uinput", O_WRONLY | O_NONBLOCK);
    if (fd < 0) {
        wlr_log(WLR_ERROR, "%s", "aios-comp: Failed to open /dev/uinput. Running with direct seat notify fallback.");
        return -1;
    }

    // Enable keyboard events and setup keybits
    ioctl(fd, UI_SET_EVBIT, EV_KEY);
    ioctl(fd, UI_SET_KEYBIT, BTN_LEFT);
    ioctl(fd, UI_SET_KEYBIT, BTN_RIGHT);
    ioctl(fd, UI_SET_KEYBIT, BTN_MIDDLE);
    for (int i = 1; i < 255; i++) {
        ioctl(fd, UI_SET_KEYBIT, i);
    }

    // Enable relative movement mouse events
    ioctl(fd, UI_SET_EVBIT, EV_REL);
    ioctl(fd, UI_SET_RELBIT, REL_X);
    ioctl(fd, UI_SET_RELBIT, REL_Y);

    struct uinput_user_dev usetup;
    memset(&usetup, 0, sizeof(usetup));
    usetup.id.bustype = BUS_USB;
    usetup.id.vendor = 0xA105;
    usetup.id.product = 0x0001;
    strcpy(usetup.name, "AIOS Virtual Seat HID Device");

    if (write(fd, &usetup, sizeof(usetup)) < 0) {
        wlr_log(WLR_ERROR, "%s", "aios-comp: Failed to write uinput configuration.");
        close(fd);
        return -1;
    }

    if (ioctl(fd, UI_DEV_CREATE) < 0) {
        wlr_log(WLR_ERROR, "%s", "aios-comp: Failed to create uinput device node.");
        close(fd);
        return -1;
    }

    wlr_log(WLR_INFO, "%s", "aios-comp: Successfully created physical /dev/uinput virtual device mapping.");
    return fd;
}

// Helper to write raw events to uinput driver
static void emit_uinput_event(int fd, uint16_t type, uint16_t code, int32_t val) {
    struct input_event ie;
    memset(&ie, 0, sizeof(ie));
    ie.type = type;
    ie.code = code;
    ie.value = val;
    if (write(fd, &ie, sizeof(ie)) < 0) {
        wlr_log(WLR_ERROR, "aios-comp: Failed to write event type %d to uinput.", type);
    }

    // Send synchronization delimiter
    memset(&ie, 0, sizeof(ie));
    ie.type = EV_SYN;
    ie.code = SYN_REPORT;
    ie.value = 0;
    if (write(fd, &ie, sizeof(ie)) < 0) {
        wlr_log(WLR_ERROR, "%s", "aios-comp: Failed to write synchronization report to uinput.");
    }
}

// Injects keyboard keys simulated by the daemon
void aios_ai_session_inject_key(struct aios_server *server, uint32_t key, uint32_t state) {
    struct aios_ai_session *session = server->ai_session;
    if (!session) return;

    if (session->uinput_fd >= 0) {
        // Map standard key codes to linux input codes
        emit_uinput_event(session->uinput_fd, EV_KEY, (uint16_t)key, (int32_t)state);
    } else {
        // Fallback: Notify the virtual seat directly in theWayland namespace
        struct timespec now;
        clock_gettime(CLOCK_MONOTONIC, &now);
        uint32_t msec = now.tv_sec * 1000 + now.tv_nsec / 1000000;
        
        wlr_seat_keyboard_notify_key(session->virtual_seat, msec, key, state);
    }
}

// Injects mouse movements simulated by the daemon
void aios_ai_session_inject_motion(struct aios_server *server, int dx, int dy) {
    struct aios_ai_session *session = server->ai_session;
    if (!session) return;

    if (session->uinput_fd >= 0) {
        emit_uinput_event(session->uinput_fd, EV_REL, REL_X, dx);
        emit_uinput_event(session->uinput_fd, EV_REL, REL_Y, dy);
    } else {
        // Fallback: direct programmatic notify without uinput support
        struct timespec now;
        clock_gettime(CLOCK_MONOTONIC, &now);
        uint32_t msec = now.tv_sec * 1000 + now.tv_nsec / 1000000;
        wlr_seat_pointer_notify_motion(session->virtual_seat, msec, dx, dy);
    }
}

// Injects mouse button clicks simulated by the daemon
void aios_ai_session_inject_button(struct aios_server *server, uint32_t button, uint32_t state) {
    struct aios_ai_session *session = server->ai_session;
    if (!session) return;

    if (session->uinput_fd >= 0) {
        emit_uinput_event(session->uinput_fd, EV_KEY, (uint16_t)button, (int32_t)state);
    } else {
        struct timespec now;
        clock_gettime(CLOCK_MONOTONIC, &now);
        uint32_t msec = now.tv_sec * 1000 + now.tv_nsec / 1000000;
        wlr_seat_pointer_notify_button(session->virtual_seat, msec, button, state);
    }
}

// Initializes the AI seat and virtual sandbox scene tree
void aios_ai_session_init(struct aios_server *server) {
    struct aios_ai_session *session = calloc(1, sizeof(struct aios_ai_session));
    if (!session) return;

    // Create the dedicated virtual seat (ai-seat0)
    session->virtual_seat = wlr_seat_create(server->display, "ai-seat0");
    if (!session->virtual_seat) {
        free(session);
        return;
    }

    // Try binding uinput driver
    session->uinput_fd = init_uinput_device();
    session->visible = false; // Isolated/hidden by default

    // Create scene tree group strictly isolated for AI sessions
    session->ai_scene_tree = wlr_scene_tree_create(&server->scene->tree);

    server->ai_session = session;
    wlr_log(WLR_INFO, "%s", "aios-comp: AI Desktop Session initialized (Virtual seat: ai-seat0)");
}

// Cleans up the AI session resources
void aios_ai_session_destroy(struct aios_server *server) {
    struct aios_ai_session *session = server->ai_session;
    if (!session) return;

    if (session->uinput_fd >= 0) {
        ioctl(session->uinput_fd, UI_DEV_DESTROY);
        close(session->uinput_fd);
    }

    wlr_seat_destroy(session->virtual_seat);
    free(session);
    server->ai_session = NULL;
}
