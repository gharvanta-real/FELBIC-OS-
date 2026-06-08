project('aios-comp', 'c',
  version : '0.1.0',
  default_options : ['c_std=c11', 'warning_level=3', 'werror=true'],
  license : 'MIT',
)

add_project_arguments('-DWLR_USE_UNSTABLE', language: 'c')

# ── Dependencies ──────────────────────────────────────────────────────────────
wlroots_dep   = dependency('wlroots-0.18', required : false)
if not wlroots_dep.found()
  wlroots_dep = dependency('wlroots', version : '>=0.17')
endif
wayland_dep   = dependency('wayland-server', version : '>=1.22')
wayland_proto = dependency('wayland-protocols', version : '>=1.32')
xkbcommon_dep = dependency('xkbcommon')
pixman_dep    = dependency('pixman-1')

# ── Source files ──────────────────────────────────────────────────────────────
sources = files(
  'src/main.c',
  'src/server.c',
  'src/ai_session.c',
  'src/input.c',
  'src/protocol.c',
)

# ── Wayland protocol generation ───────────────────────────────────────────────
wayland_scanner = find_program('wayland-scanner')

# Generate server headers
proto_server_header = custom_target(
  'aios-compositor-v1-server-protocol-h',
  input: 'protocols/aios-compositor-v1.xml',
  output: 'aios-compositor-v1-server-protocol.h',
  command: [wayland_scanner, 'server-header', '@INPUT@', '@OUTPUT@'],
)

# Generate glue code
proto_code = custom_target(
  'aios-compositor-v1-protocol-c',
  input: 'protocols/aios-compositor-v1.xml',
  output: 'aios-compositor-v1-protocol.c',
  command: [wayland_scanner, 'private-code', '@INPUT@', '@OUTPUT@'],
)

# Query wayland-protocols directory and scan xdg-shell
wl_protocol_dir = wayland_proto.get_variable(pkgconfig: 'pkgdatadir')
xdg_shell_xml = wl_protocol_dir + '/stable/xdg-shell/xdg-shell.xml'

xdg_shell_server_header = custom_target(
  'xdg-shell-server-protocol-h',
  input: xdg_shell_xml,
  output: 'xdg-shell-protocol.h',
  command: [wayland_scanner, 'server-header', '@INPUT@', '@OUTPUT@'],
)

xdg_shell_code = custom_target(
  'xdg-shell-protocol-c',
  input: xdg_shell_xml,
  output: 'xdg-shell-protocol.c',
  command: [wayland_scanner, 'private-code', '@INPUT@', '@OUTPUT@'],
)

# ── Executable ───────────────────────────────────────────────────────────────
executable('aios-comp',
  [sources, proto_server_header, proto_code, xdg_shell_server_header, xdg_shell_code],
  dependencies : [
    wlroots_dep,
    wayland_dep,
    wayland_proto,
    xkbcommon_dep,
    pixman_dep,
  ],
  install : true,
)
