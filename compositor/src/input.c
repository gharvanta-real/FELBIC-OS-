// aios-comp input.c — Physical input seat management, cursor updates, and keyboard shortcuts
#include <stdlib.h>
#include <linux/input-event-codes.h>
#include <wayland-server-core.h>
#include <wlr/backend.h>
#include <wlr/types/wlr_cursor.h>
#include <wlr/types/wlr_keyboard.h>
#include <wlr/types/wlr_seat.h>
#include <wlr/types/wlr_xcursor_manager.h>
#include <wlr/types/wlr_scene.h>
#include <wlr/util/log.h>
#include <xkbcommon/xkbcommon.h>

#include "server.h"

// standard wlroots modifier masks
#ifndef WLR_KEYBOARD_MODIFIER_ALT
#define WLR_KEYBOARD_MODIFIER_ALT 8
#endif
#ifndef WLR_KEYBOARD_MODIFIER_LOGO
#define WLR_KEYBOARD_MODIFIER_LOGO 64
#endif

static struct aios_server *g_server = NULL;

// Update the focused surface beneath the mouse pointer coordinates
static void update_pointer_focus(struct aios_server *server, uint32_t time) {
    double sx, sy;
    struct wlr_scene_node *node = wlr_scene_node_at(
        &server->scene->tree.node, server->cursor->x, server->cursor->y, &sx, &sy);
        
    if (node && node->type == WLR_SCENE_NODE_BUFFER) {
        struct wlr_scene_buffer *scene_buffer = wlr_scene_buffer_from_node(node);
        struct wlr_scene_surface *scene_surface = wlr_scene_surface_try_from_buffer(scene_buffer);
        if (scene_surface) {
            wlr_seat_pointer_notify_enter(
                server->seat, scene_surface->surface, sx, sy);
            wlr_seat_pointer_notify_motion(
                server->seat, time, sx, sy);
            return;
        }
    }
    
    // Clear pointer focus if cursor is over empty background layout
    wlr_seat_pointer_clear_focus(server->seat);
}

static void handle_cursor_motion(struct wl_listener *listener, void *data) {
    struct aios_server *server = wl_container_of(listener, server, cursor_motion);
    struct wlr_pointer_motion_event *event = data;

    // Update coordinates in the relative cursor space
    wlr_cursor_move(server->cursor, &event->pointer->base, event->delta_x, event->delta_y);
    update_pointer_focus(server, event->time_msec);
}

static void handle_cursor_motion_absolute(struct wl_listener *listener, void *data) {
    struct aios_server *server = wl_container_of(listener, server, cursor_motion_absolute);
    struct wlr_pointer_motion_absolute_event *event = data;

    // Update coordinates in the absolute output layout boundaries
    wlr_cursor_warp_absolute(server->cursor, &event->pointer->base, event->x, event->y);
    update_pointer_focus(server, event->time_msec);
}

static void handle_cursor_button(struct wl_listener *listener, void *data) {
    struct aios_server *server = wl_container_of(listener, server, cursor_button);
    struct wlr_pointer_button_event *event = data;

    // Send button event to target client focused beneath pointer
    wlr_seat_pointer_notify_button(server->seat, event->time_msec, event->button, event->state);

    // Left-click focus change logic
    if (event->state == WL_POINTER_BUTTON_STATE_PRESSED && event->button == BTN_LEFT) {
        double sx, sy;
        struct wlr_scene_node *node = wlr_scene_node_at(
            &server->scene->tree.node, server->cursor->x, server->cursor->y, &sx, &sy);
        if (node) {
            // Traverse up to find the root window scene tree node
            struct wlr_scene_tree *tree = node->parent;
            while (tree && tree->node.data == NULL) {
                tree = tree->node.parent;
            }
            if (tree && tree->node.data) {
                struct aios_toplevel *toplevel = tree->node.data;
                // Move window node to top of renderer pile
                wlr_scene_node_raise_to_top(&toplevel->scene_tree->node);
                // Notify keyboard focus
                struct wlr_seat *seat = server->seat;
                struct wlr_keyboard *kbd = wlr_seat_get_keyboard(seat);
                if (kbd) {
                    wlr_seat_keyboard_notify_enter(
                        seat, toplevel->xdg_toplevel->base->surface, 
                        kbd->keycodes, kbd->num_keycodes, &kbd->modifiers);
                }
            }
        }
    }
}

static void handle_cursor_frame(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_server *server = wl_container_of(listener, server, cursor_frame);
    wlr_seat_pointer_notify_frame(server->seat);
}

// ── Keyboard Event Processing ──────────────────────────────────────────────────

static void handle_keyboard_key(struct wl_listener *listener, void *data) {
    struct aios_keyboard *keyboard = wl_container_of(listener, keyboard, key);
    struct wlr_keyboard_key_event *event = data;
    struct aios_server *server = keyboard->server;

    struct wlr_keyboard *wlr_keyboard = wlr_keyboard_from_input_device(keyboard->device);

    // Map system scancode to xkb keysyms
    uint32_t keycode = event->keycode + 8;
    const xkb_keysym_t *syms;
    int nsyms = xkb_state_key_get_syms(wlr_keyboard->xkb_state, keycode, &syms);

    bool handled = false;
    uint32_t modifiers = wlr_keyboard_get_modifiers(wlr_keyboard);

    // Handle global compositor hotkeys (e.g. ALT+ESCAPE or SUPER+A)
    if (event->state == WL_KEYBOARD_KEY_STATE_PRESSED) {
        for (int i = 0; i < nsyms; i++) {
            xkb_keysym_t sym = syms[i];
            if (sym == XKB_KEY_Escape && (modifiers & WLR_KEYBOARD_MODIFIER_ALT)) {
                wlr_log(WLR_INFO, "%s", "aios-comp: ALT+ESC shortcut pressed, exiting event loop.");
                wl_display_terminate(server->display);
                handled = true;
                break;
            }
            if (sym == XKB_KEY_a && (modifiers & WLR_KEYBOARD_MODIFIER_LOGO)) {
                wlr_log(WLR_INFO, "%s", "aios-comp: SUPER+A pressed (toggle AI desktop visibility).");
                if (server->ai_session) {
                    server->ai_session->visible = !server->ai_session->visible;
                    wlr_log(WLR_INFO, "aios-comp: AI Desktop visibility toggled to %d", server->ai_session->visible);
                }
                handled = true;
                break;
            }
        }
    }

    // Fallback: pass normal keyboard events to focused target client
    if (!handled) {
        wlr_seat_set_keyboard(server->seat, wlr_keyboard_from_input_device(keyboard->device));
        wlr_seat_keyboard_notify_key(server->seat, event->time_msec, event->keycode, event->state);
    }
}

static void handle_keyboard_modifiers(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_keyboard *keyboard = wl_container_of(listener, keyboard, modifiers);
    struct wlr_keyboard *wlr_keyboard = wlr_keyboard_from_input_device(keyboard->device);
    
    // Dispatch keyboard modifiers (shift/ctrl/alt) state change to focused clients
    wlr_seat_keyboard_notify_modifiers(keyboard->server->seat, &wlr_keyboard->modifiers);
}

// Setup input device configurations detected by the backend
static void handle_new_input(struct wl_listener *listener, void *data) {
    struct aios_server *server = wl_container_of(listener, server, new_input);
    struct wlr_input_device *device = data;

    wlr_log(WLR_INFO, "aios-comp: New input device detected: %s (type %d)", device->name, device->type);

    if (device->type == WLR_INPUT_DEVICE_POINTER) {
        // Attach physical mice/trackpads to cursor tracking
        wlr_cursor_attach_input_device(server->cursor, device);
    } else if (device->type == WLR_INPUT_DEVICE_KEYBOARD) {
        struct aios_keyboard *keyboard = calloc(1, sizeof(struct aios_keyboard));
        keyboard->server = server;
        keyboard->device = device;

        // Configure standard keyboard keymap settings (US layout default)
        struct xkb_context *context = xkb_context_new(XKB_CONTEXT_NO_FLAGS);
        struct xkb_keymap *keymap = xkb_keymap_new_from_names(
            context, NULL, XKB_KEYMAP_COMPILE_NO_FLAGS);
            
        struct wlr_keyboard *wlr_keyboard = wlr_keyboard_from_input_device(device);
        wlr_keyboard_set_keymap(wlr_keyboard, keymap);
        xkb_keymap_unref(keymap);
        xkb_context_unref(context);

        wlr_keyboard_set_repeat_info(wlr_keyboard, 25, 600);

        // Bind modifier and keypress event signals
        keyboard->key.notify = handle_keyboard_key;
        wl_signal_add(&wlr_keyboard->events.key, &keyboard->key);

        keyboard->modifiers.notify = handle_keyboard_modifiers;
        wl_signal_add(&wlr_keyboard->events.modifiers, &keyboard->modifiers);

        wl_list_insert(&server->keyboards, &keyboard->link);
    }
}

// Main input subsystem initialization entry point
void aios_input_init(struct aios_server *server) {
    g_server = server;
    wl_list_init(&server->keyboards);

    // Initialize cursor tracker
    server->cursor = wlr_cursor_create();
    wlr_cursor_attach_output_layout(server->cursor, server->output_layout);

    server->cursor_mgr = wlr_xcursor_manager_create(NULL, 24);
    wlr_xcursor_manager_load(server->cursor_mgr, 1.0);

    // Bind cursor motion and button hooks
    server->cursor_motion.notify = handle_cursor_motion;
    wl_signal_add(&server->cursor->events.motion, &server->cursor_motion);

    server->cursor_motion_absolute.notify = handle_cursor_motion_absolute;
    wl_signal_add(&server->cursor->events.motion_absolute, &server->cursor_motion_absolute);

    server->cursor_button.notify = handle_cursor_button;
    wl_signal_add(&server->cursor->events.button, &server->cursor_button);

    server->cursor_frame.notify = handle_cursor_frame;
    wl_signal_add(&server->cursor->events.frame, &server->cursor_frame);

    // Initialize standard human seat (seat0)
    server->seat = wlr_seat_create(server->display, "seat0");
    
    // Bind physical input devices detection hook
    server->new_input.notify = handle_new_input;
    wl_signal_add(&server->backend->events.new_input, &server->new_input);
}
