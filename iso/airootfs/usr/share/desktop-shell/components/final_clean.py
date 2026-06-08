import re

file_path = 'desktop-shell/components/windows.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace settings row margin-top
content = content.replace('<div class="settings-row" style="margin-top: 10px;">', '<div class="settings-row settings-row-margin">')

# Replace nightlight disabled state
content = content.replace('<div class="settings-column-row" id="nightlight-temp-row" style="opacity: 0.5; pointer-events: none;">', '<div class="settings-column-row nightlight-disabled" id="nightlight-temp-row">')

# Replace wallpaper backgrounds
content = content.replace('style="background: linear-gradient(135deg, #0f172a, #1e293b);"', 'class="wallpaper-thumb-preview wallpaper-preview-slate"')
content = content.replace('style="background: linear-gradient(135deg, #1e1b4b, #311042, #180026);"', 'class="wallpaper-thumb-preview wallpaper-preview-aurora"')
content = content.replace('style="background: linear-gradient(135deg, #fdba74, #f472b6, #3b82f6);"', 'class="wallpaper-thumb-preview wallpaper-preview-sunset"')
content = content.replace('style="background: linear-gradient(135deg, #09090b, #27272a, #09090b);"', 'class="wallpaper-thumb-preview wallpaper-preview-monochrome"')

# App sidebar sections margin-top
content = content.replace('class="app-sidebar-section" style="margin-top: 12px;"', 'class="app-sidebar-section sidebar-section-mt"')

# Empty flex div
content = content.replace('<div style="flex: 1;"></div>', '<div class="flex-spacer"></div>')

# Media playlist
content = content.replace('id="media-playlist" style="display: flex; flex-direction: column; gap: 4px;"', 'id="media-playlist" class="media-playlist-container"')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Cleaned windows HTML")