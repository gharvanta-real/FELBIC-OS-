// aios-comp server.c — Output handling, rendering, and XDG Shell surface mapping
#define _POSIX_C_SOURCE 199309L
#define _GNU_SOURCE

#include <assert.h>
#include <stdlib.h>
#include <time.h>
#include <wayland-server-core.h>
#include <wlr/backend.h>
#include <wlr/types/wlr_compositor.h>
#include <wlr/types/wlr_output.h>
#include <wlr/types/wlr_output_layout.h>
#include <wlr/types/wlr_scene.h>
#include <wlr/types/wlr_xdg_shell.h>
#include <wlr/util/log.h>

#include "server.h"

// Output frame event (request to render a new frame)
static void handle_output_frame(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_output *output = wl_container_of(listener, output, frame);
    struct wlr_scene *scene = output->server->scene;

    // Get the scene output matching this hardware output
    struct wlr_scene_output *scene_output = wlr_scene_get_scene_output(
        scene, output->wlr_output);

    if (!scene_output) {
        return;
    }

    // Commit the scene output rendering pipeline
    wlr_scene_output_commit(scene_output, NULL);

    // Send frame done event to clients (for high FPS sync)
    struct timespec now;
    clock_gettime(CLOCK_MONOTONIC, &now);
    wlr_scene_output_send_frame_done(scene_output, &now);
}

// Output destroy handler
static void handle_output_destroy(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_output *output = wl_container_of(listener, output, destroy);
    wlr_log(WLR_INFO, "aios-comp: Output %s disconnected", output->wlr_output->name);

    wl_list_remove(&output->link);
    wl_list_remove(&output->frame.link);
    wl_list_remove(&output->destroy.link);
    
    free(output);
}

// Triggered when a new display device is detected by the backend
static void handle_new_output(struct wl_listener *listener, void *data) {
    struct aios_server *server = wl_container_of(listener, server, new_output);
    struct wlr_output *wlr_output = data;

    wlr_log(WLR_INFO, "aios-comp: Output %s detected", wlr_output->name);

    // Initialize allocator/renderer formats for this output
    wlr_output_init_render(wlr_output, server->allocator, server->renderer);

    // Modern wlroots 0.18 unified state setup
    struct wlr_output_state state;
    wlr_output_state_init(&state);
    wlr_output_state_set_enabled(&state, true);
    
    struct wlr_output_mode *mode = wlr_output_preferred_mode(wlr_output);
    if (mode) {
        wlr_output_state_set_mode(&state, mode);
    }
    wlr_output_commit_state(wlr_output, &state);
    wlr_output_state_finish(&state);

    // Allocate tracking structure
    struct aios_output *output = calloc(1, sizeof(struct aios_output));
    assert(output);
    output->server = server;
    output->wlr_output = wlr_output;
    wl_list_insert(&server->outputs, &output->link);

    // Add output layout
    wlr_output_layout_add_auto(server->output_layout, wlr_output);

    // Register frame render listener
    output->frame.notify = handle_output_frame;
    wl_signal_add(&wlr_output->events.frame, &output->frame);

    // Register destroy listener
    output->destroy.notify = handle_output_destroy;
    wl_signal_add(&wlr_output->events.destroy, &output->destroy);

    // Notify scene-graph of the new output
    wlr_scene_attach_output_layout(server->scene, server->output_layout);
}

// ── Window Surface Management ───────────────────────────────────────────────────

static void handle_xdg_surface_map(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_toplevel *toplevel = wl_container_of(listener, toplevel, map);
    wlr_log(WLR_DEBUG, "aios-comp: Window title '%s' mapped", toplevel->xdg_toplevel->title);
    
    // Add to mapping list
    wl_list_insert(&toplevel->server->toplevels, &toplevel->link);
}

static void handle_xdg_surface_unmap(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_toplevel *toplevel = wl_container_of(listener, toplevel, unmap);
    wlr_log(WLR_DEBUG, "aios-comp: Window title '%s' unmapped", toplevel->xdg_toplevel->title);
    
    wl_list_remove(&toplevel->link);
}

static void handle_xdg_surface_destroy(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_toplevel *toplevel = wl_container_of(listener, toplevel, destroy);

    wl_list_remove(&toplevel->map.link);
    wl_list_remove(&toplevel->unmap.link);
    wl_list_remove(&toplevel->destroy.link);
    wl_list_remove(&toplevel->request_move.link);
    wl_list_remove(&toplevel->request_resize.link);

    free(toplevel);
}

static void handle_request_move(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_toplevel *toplevel = wl_container_of(listener, toplevel, request_move);
    wlr_log(WLR_DEBUG, "aios-comp: Request move for window: %s", toplevel->xdg_toplevel->title);
}

static void handle_request_resize(struct wl_listener *listener, void *data) {
    (void)data;
    struct aios_toplevel *toplevel = wl_container_of(listener, toplevel, request_resize);
    wlr_log(WLR_DEBUG, "aios-comp: Request resize for window: %s", toplevel->xdg_toplevel->title);
}

// Triggered when a client initializes a new XDG desktop surface
void handle_new_xdg_surface(struct wl_listener *listener, void *data) {
    struct wlr_xdg_surface *xdg_surface = data;

    // We only manage application toplevels (main windows), not popups
    if (xdg_surface->role != WLR_XDG_SURFACE_ROLE_TOPLEVEL) {
        return;
    }

    struct aios_server *server = wl_container_of(listener, server, new_xdg_surface);

    struct aios_toplevel *toplevel = calloc(1, sizeof(struct aios_toplevel));
    assert(toplevel);
    toplevel->server = server;
    toplevel->xdg_toplevel = xdg_surface->toplevel;
    toplevel->id = rand(); // Allocate simple random window ID

    // Create scene graph node for this window surface
    toplevel->scene_tree = wlr_scene_xdg_surface_create(
        &server->scene->tree, xdg_surface);
    toplevel->scene_tree->node.data = toplevel;
    xdg_surface->data = toplevel->scene_tree;

    // Listeners for surface state transitions (modern surface mapped locations)
    toplevel->map.notify = handle_xdg_surface_map;
    wl_signal_add(&xdg_surface->surface->events.map, &toplevel->map);

    toplevel->unmap.notify = handle_xdg_surface_unmap;
    wl_signal_add(&xdg_surface->surface->events.unmap, &toplevel->unmap);

    toplevel->destroy.notify = handle_xdg_surface_destroy;
    wl_signal_add(&xdg_surface->events.destroy, &toplevel->destroy);

    toplevel->request_move.notify = handle_request_move;
    wl_signal_add(&xdg_surface->toplevel->events.request_move, &toplevel->request_move);

    toplevel->request_resize.notify = handle_request_resize;
    wl_signal_add(&xdg_surface->toplevel->events.request_resize, &toplevel->request_resize);
}

// Setup the output detection listener
void aios_server_bind_hooks(struct aios_server *srv) {
    srv->new_output.notify = handle_new_output;
    wl_signal_add(&srv->backend->events.new_output, &srv->new_output);
}
