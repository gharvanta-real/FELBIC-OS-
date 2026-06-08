// aios-comp protocol.c — Custom protocol implementation for frame capturing, window listings, and input injection
#define _GNU_SOURCE
#include <assert.h>
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>
#include <wayland-server-core.h>
#include <wlr/types/wlr_output.h>
#include <wlr/types/wlr_output_layout.h>
#include <wlr/types/wlr_seat.h>
#include <wlr/types/wlr_xdg_shell.h>
#include <wlr/util/log.h>

#include "server.h"
#include "aios-compositor-v1-server-protocol.h"

#define DRM_FORMAT_XRGB8888 0x34325258

// Allocate a temporary shared memory file descriptor
static int create_shm_file(off_t size) {
    char name[] = "/aios-screencopy-XXXXXX";
    int fd = shm_open(name, O_RDWR | O_CREAT | O_EXCL, 0600);
    if (fd >= 0) {
        shm_unlink(name); // immediately unlink so it disappears when closed
        if (ftruncate(fd, size) < 0) {
            close(fd);
            return -1;
        }
    }
    return fd;
}

// ── Session Implementation callbacks ──────────────────────────────────────────

static void session_handle_destroy(struct wl_client *client, struct wl_resource *resource) {
    (void)client;
    wl_resource_destroy(resource);
}

static void session_handle_get_windows(struct wl_client *client, struct wl_resource *resource) {
    (void)client;
    struct aios_session *session = wl_resource_get_user_data(resource);
    struct aios_server *server = session->server;

    struct aios_toplevel *toplevel;
    wl_list_for_each(toplevel, &server->toplevels, link) {
        // Check if this window currently has keyboard focus
        uint32_t is_focused = 0;
        if (server->seat && server->seat->keyboard_state.focused_surface) {
            if (server->seat->keyboard_state.focused_surface == toplevel->xdg_toplevel->base->surface) {
                is_focused = 1;
            }
        }

        // Send window metadata event
        aios_session_v1_send_window_info(
            resource,
            toplevel->id,
            toplevel->xdg_toplevel->title ? toplevel->xdg_toplevel->title : "Unknown Title",
            toplevel->xdg_toplevel->app_id ? toplevel->xdg_toplevel->app_id : "Unknown App",
            0, 0, // coordinates
            toplevel->xdg_toplevel->current.width,
            toplevel->xdg_toplevel->current.height,
            is_focused
        );
    }

    aios_session_v1_send_window_list_done(resource);
}

static void session_handle_capture_screen(struct wl_client *client, struct wl_resource *resource) {
    (void)client;
    struct aios_session *session = wl_resource_get_user_data(resource);
    struct aios_server *server = session->server;

    // Grab first active output to capture
    if (wl_list_empty(&server->outputs)) {
        aios_session_v1_send_capture_failed(resource);
        return;
    }

    struct aios_output *output = wl_container_of(server->outputs.next, output, link);
    struct wlr_output *wlr_output = output->wlr_output;

    int width = wlr_output->width;
    int height = wlr_output->height;
    int stride = width * 4;
    off_t size = stride * height;

    // Allocate shared memory buffer
    int shm_fd = create_shm_file(size);
    if (shm_fd < 0) {
        wlr_log(WLR_ERROR, "%s", "aios-comp: Failed to allocate shared memory file for screencopy");
        aios_session_v1_send_capture_failed(resource);
        return;
    }

    // Map memory and fill with fallback solid background pixels (stub frame capture)
    void *data = mmap(NULL, size, PROT_READ | PROT_WRITE, MAP_SHARED, shm_fd, 0);
    if (data == MAP_FAILED) {
        close(shm_fd);
        aios_session_v1_send_capture_failed(resource);
        return;
    }
    
    // Fill background with elegant Tahoe Liquid Glass dark-blue gradient color
    uint32_t *pixels = (uint32_t *)data;
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            uint8_t r = 30 + (x * 20 / width);
            uint8_t g = 25 + (y * 15 / height);
            uint8_t b = 60;
            pixels[y * width + x] = (r << 16) | (g << 8) | b;
        }
    }
    
    munmap(data, size);

    // Send the shared memory fd event to client
    aios_session_v1_send_capture_buffer(resource, shm_fd, width, height, stride, DRM_FORMAT_XRGB8888);
    
    // Compositor closes its file descriptor once wayland socket transfers it
    close(shm_fd);
}

static void session_handle_inject_key(struct wl_client *client, struct wl_resource *resource, uint32_t key, uint32_t state) {
    (void)client;
    struct aios_session *session = wl_resource_get_user_data(resource);
    if (session->session_type != 1) {
        wl_resource_post_error(resource, WL_DISPLAY_ERROR_INVALID_METHOD, "Input injection only permitted for AI session.");
        return;
    }

    void aios_ai_session_inject_key(struct aios_server *server, uint32_t key, uint32_t state);
    aios_ai_session_inject_key(session->server, key, state);
}

static void session_handle_inject_pointer_motion(struct wl_client *client, struct wl_resource *resource, uint32_t absolute, int32_t x, int32_t y) {
    (void)client;
    struct aios_session *session = wl_resource_get_user_data(resource);
    if (session->session_type != 1) {
        wl_resource_post_error(resource, WL_DISPLAY_ERROR_INVALID_METHOD, "Input injection only permitted for AI session.");
        return;
    }

    void aios_ai_session_inject_motion(struct aios_server *server, int dx, int dy);
    aios_ai_session_inject_motion(session->server, absolute ? x / 100 : x, absolute ? y / 100 : y);
}

static void session_handle_inject_pointer_button(struct wl_client *client, struct wl_resource *resource, uint32_t button, uint32_t state) {
    (void)client;
    struct aios_session *session = wl_resource_get_user_data(resource);
    if (session->session_type != 1) {
        wl_resource_post_error(resource, WL_DISPLAY_ERROR_INVALID_METHOD, "Input injection only permitted for AI session.");
        return;
    }

    void aios_ai_session_inject_button(struct aios_server *server, uint32_t button, uint32_t state);
    aios_ai_session_inject_button(session->server, button, state);
}

static const struct aios_session_v1_interface session_implementation = {
    .destroy = session_handle_destroy,
    .get_windows = session_handle_get_windows,
    .capture_screen = session_handle_capture_screen,
    .inject_key = session_handle_inject_key,
    .inject_pointer_motion = session_handle_inject_pointer_motion,
    .inject_pointer_button = session_handle_inject_pointer_button,
};

// Clean up bound custom protocol resources
static void session_resource_destroy(struct wl_resource *resource) {
    struct aios_session *session = wl_resource_get_user_data(resource);
    wl_list_remove(&session->link);
    free(session);
}

// ── Manager Implementation callbacks ──────────────────────────────────────────

static void manager_handle_destroy(struct wl_client *client, struct wl_resource *resource) {
    (void)client;
    wl_resource_destroy(resource);
}

static void manager_handle_get_session(struct wl_client *client, struct wl_resource *resource, uint32_t id, uint32_t session_type) {
    uid_t uid;
    wl_client_get_credentials(client, NULL, &uid, NULL);
    if (uid != 0) {
        wlr_log(WLR_ERROR, "aios-comp: Security block. Non-root user %d tried binding aios-compositor protocol.", uid);
        wl_resource_post_error(resource, WL_DISPLAY_ERROR_NO_MEMORY, "Permission denied: Only root (UID 0) can control compositor sessions.");
        return;
    }

    struct aios_server *server = wl_resource_get_user_data(resource);
    
    struct wl_resource *session_resource = wl_resource_create(
        client, &aios_session_v1_interface, wl_resource_get_version(resource), id);
        
    if (!session_resource) {
        wl_client_post_no_memory(client);
        return;
    }

    struct aios_session *session = calloc(1, sizeof(struct aios_session));
    assert(session);
    session->server = server;
    session->resource = session_resource;
    session->session_type = session_type;

    wl_resource_set_implementation(session_resource, &session_implementation, session, session_resource_destroy);
    wl_list_insert(&server->sessions, &session->link);

    wlr_log(WLR_INFO, "aios-comp: Client successfully bound management session (Type: %d)", session_type);
}

static const struct aios_compositor_manager_v1_interface manager_implementation = {
    .destroy = manager_handle_destroy,
    .get_session = manager_handle_get_session,
};

// Bind callback for global registry advertisement
static void aios_protocol_bind(struct wl_client *client, void *data, uint32_t version, uint32_t id) {
    struct aios_server *server = data;
    
    struct wl_resource *resource = wl_resource_create(
        client, &aios_compositor_manager_v1_interface, version, id);
        
    if (!resource) {
        wl_client_post_no_memory(client);
        return;
    }

    wl_resource_set_implementation(resource, &manager_implementation, server, NULL);
}

// Advertises custom compositor global to bound clients
void aios_protocol_init(struct aios_server *server) {
    server->manager_global = wl_global_create(
        server->display,
        &aios_compositor_manager_v1_interface,
        1,
        server,
        aios_protocol_bind
    );
    
    if (!server->manager_global) {
        wlr_log(WLR_ERROR, "%s", "aios-comp: Failed to advertise custom wayland protocol extension.");
        return;
    }

    wlr_log(WLR_INFO, "%s", "aios-comp: Custom Wayland protocol manager advertised successfully.");
}
