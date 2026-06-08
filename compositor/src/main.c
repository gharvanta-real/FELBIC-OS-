// aios-comp main.c — Main initialization code
#define _GNU_SOURCE
#include <getopt.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/types.h>
#include <wayland-server-core.h>
#include <wlr/backend.h>
#include <wlr/render/allocator.h>
#include <wlr/render/wlr_renderer.h>
#include <wlr/types/wlr_compositor.h>
#include <wlr/types/wlr_subcompositor.h>
#include <wlr/types/wlr_data_device.h>
#include <wlr/types/wlr_output_layout.h>
#include <wlr/types/wlr_scene.h>
#include <wlr/types/wlr_xdg_shell.h>
#include <wlr/util/log.h>

#include "server.h"

static struct aios_server server = {0};

static void run_autostart(void) {
    pid_t pid = fork();
    if (pid < 0) {
        wlr_log(WLR_ERROR, "%s", "Failed to fork for autostart");
    } else if (pid == 0) {
        setsid();
        execl("/bin/sh", "sh", "-c", "/etc/aios/autostart.sh", (char *)NULL);
        _exit(1);
    }
}

static void handle_signal(int sig) {
    wlr_log(WLR_INFO, "Caught signal %d, stopping display loop...", sig);
    wl_display_terminate(server.display);
}

int main(int argc, char *argv[]) {
    (void)argc;
    (void)argv;

    wlr_log_init(WLR_DEBUG, NULL);
    wlr_log(WLR_INFO, "%s", "aios-comp: Starting custom AIOS Wayland Compositor...");

    // Setup signal handlers for graceful shutdown
    struct sigaction sa;
    sa.sa_handler = handle_signal;
    sigemptyset(&sa.sa_mask);
    sa.sa_flags = 0;
    sigaction(SIGINT, &sa, NULL);
    sigaction(SIGTERM, &sa, NULL);

    // 1. Create Wayland display and its event loop
    server.display = wl_display_create();
    if (!server.display) {
        wlr_log(WLR_ERROR, "%s", "Failed to create Wayland display");
        return EXIT_FAILURE;
    }

    struct wl_event_loop *event_loop = wl_display_get_event_loop(server.display);

    // 2. Create the backend (handles DRM/KMS, libinput, etc.)
    server.backend = wlr_backend_autocreate(event_loop, NULL);
    if (!server.backend) {
        wlr_log(WLR_ERROR, "%s", "Failed to create wlr backend");
        wl_display_destroy(server.display);
        return EXIT_FAILURE;
    }

    // 3. Create renderer and allocator
    server.renderer = wlr_renderer_autocreate(server.backend);
    if (!server.renderer) {
        wlr_log(WLR_ERROR, "%s", "Failed to create wlr renderer");
        wlr_backend_destroy(server.backend);
        wl_display_destroy(server.display);
        return EXIT_FAILURE;
    }
    wlr_renderer_init_wl_display(server.renderer, server.display);

    server.allocator = wlr_allocator_autocreate(server.backend, server.renderer);
    if (!server.allocator) {
        wlr_log(WLR_ERROR, "%s", "Failed to create wlr allocator");
        wlr_renderer_destroy(server.renderer);
        wlr_backend_destroy(server.backend);
        wl_display_destroy(server.display);
        return EXIT_FAILURE;
    }

    // 4. Initialize compositor, subcompositor and data device manager
    wlr_compositor_create(server.display, 5, server.renderer);
    wlr_subcompositor_create(server.display);
    wlr_data_device_manager_create(server.display);

    // 5. Initialize lists
    wl_list_init(&server.outputs);
    wl_list_init(&server.toplevels);
    wl_list_init(&server.sessions);

    // 6. Setup output layout and scene graph
    server.output_layout = wlr_output_layout_create(server.display);
    server.scene = wlr_scene_create();
    
    // 7. Bind server-side hooks (implemented in server.c)
    void aios_server_bind_hooks(struct aios_server *server);
    aios_server_bind_hooks(&server);

    // 8. Initialize standard shell extensions
    server.xdg_shell = wlr_xdg_shell_create(server.display, 3);
    void handle_new_xdg_surface(struct wl_listener *listener, void *data);
    server.new_xdg_surface.notify = handle_new_xdg_surface;
    wl_signal_add(&server.xdg_shell->events.new_surface, &server.new_xdg_surface);

    // 9. Initialize inputs, AI session, and custom protocols
    aios_input_init(&server);
    aios_ai_session_init(&server);
    aios_protocol_init(&server);

    // 10. Start backend and bind socket name
    const char *socket = wl_display_add_socket_auto(server.display);
    if (!socket) {
        wlr_log(WLR_ERROR, "%s", "Failed to bind Wayland socket");
        aios_ai_session_destroy(&server);
        wlr_backend_destroy(server.backend);
        wl_display_destroy(server.display);
        return EXIT_FAILURE;
    }

    if (!wlr_backend_start(server.backend)) {
        wlr_log(WLR_ERROR, "%s", "Failed to start wlr backend");
        aios_ai_session_destroy(&server);
        wlr_backend_destroy(server.backend);
        wl_display_destroy(server.display);
        return EXIT_FAILURE;
    }

    // Set WAYLAND_DISPLAY environment for child processes
    wlr_log(WLR_INFO, "aios-comp: Running on Wayland display socket: %s", socket);
    setenv("WAYLAND_DISPLAY", socket, 1);

    // Run autostart script
    run_autostart();

    // 11. Run display loop
    wl_display_run(server.display);

    // 12. Cleanup
    wlr_log(WLR_INFO, "%s", "aios-comp: Shutting down compositor...");
    aios_ai_session_destroy(&server);
    
    wl_display_destroy_clients(server.display);
    wl_display_destroy(server.display);

    return EXIT_SUCCESS;
}
