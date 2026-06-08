// aios-comp server.h — Custom Production Compositor Definitions
#ifndef AIOS_COMP_SERVER_H
#define AIOS_COMP_SERVER_H

#include <wayland-server-core.h>
#include <wlr/backend.h>
#include <wlr/render/allocator.h>
#include <wlr/render/wlr_renderer.h>
#include <wlr/types/wlr_compositor.h>
#include <wlr/types/wlr_output_layout.h>
#include <wlr/types/wlr_scene.h>
#include <wlr/types/wlr_seat.h>
#include <wlr/types/wlr_cursor.h>
#include <wlr/types/wlr_xcursor_manager.h>
#include <wlr/types/wlr_xdg_shell.h>
#include <wlr/types/wlr_subcompositor.h>
#include <wlr/types/wlr_data_device.h>

struct aios_server {
    struct wl_display        *display;
    struct wlr_backend       *backend;
    struct wlr_renderer      *renderer;
    struct wlr_allocator     *allocator;
    struct wlr_scene         *scene;
    struct wlr_output_layout *output_layout;
    
    // Outputs
    struct wl_list            outputs; // aios_output::link
    struct wl_listener        new_output;

    // Shells
    struct wlr_xdg_shell     *xdg_shell;
    struct wl_listener        new_xdg_surface;

    // Human Seat (seat0)
    struct wlr_seat          *seat;
    struct wl_listener        new_input;
    struct wl_list            keyboards; // aios_keyboard::link
    struct wlr_cursor        *cursor;
    struct wlr_xcursor_manager *cursor_mgr;
    struct wl_listener        cursor_motion;
    struct wl_listener        cursor_motion_absolute;
    struct wl_listener        cursor_button;
    struct wl_listener        cursor_axis;
    struct wl_listener        cursor_frame;

    // Custom Protocol manager global
    struct wl_global         *manager_global;
    struct wl_list            sessions; // aios_session::link
    
    // AI Session Context
    struct aios_ai_session   *ai_session;

    // Window list
    struct wl_list            toplevels; // aios_toplevel::link
};

struct aios_output {
    struct wl_list            link;
    struct aios_server       *server;
    struct wlr_output        *wlr_output;
    struct wl_listener        frame;
    struct wl_listener        destroy;
};

struct aios_keyboard {
    struct wl_list            link;
    struct aios_server       *server;
    struct wlr_input_device  *device;
    struct wl_listener        modifiers;
    struct wl_listener        key;
    struct wl_listener        destroy;
};

struct aios_toplevel {
    struct wl_list            link;
    struct aios_server       *server;
    struct wlr_xdg_toplevel  *xdg_toplevel;
    struct wlr_scene_tree    *scene_tree;
    struct wl_listener        map;
    struct wl_listener        unmap;
    struct wl_listener        destroy;
    struct wl_listener        request_move;
    struct wl_listener        request_resize;
    struct wl_listener        request_maximize;
    struct wl_listener        request_fullscreen;
    uint32_t                  id;
};

struct aios_ai_session {
    struct wlr_seat          *virtual_seat;
    int                       uinput_fd; // -1 if not initialized
    struct wlr_scene_tree    *ai_scene_tree; // Scene node isolated for AI session windows
    bool                      visible; // Render PiP or keep hidden
};

// Custom protocol resource wrapper
struct aios_session {
    struct wl_list            link;
    struct aios_server       *server;
    struct wl_resource       *resource;
    uint32_t                  session_type; // 0 = Human, 1 = AI
};

void aios_input_init(struct aios_server *server);
void aios_ai_session_init(struct aios_server *server);
void aios_ai_session_destroy(struct aios_server *server);
void aios_protocol_init(struct aios_server *server);

#endif /* AIOS_COMP_SERVER_H */
