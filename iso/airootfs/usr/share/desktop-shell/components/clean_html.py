import re
import os

file_path = 'desktop-shell/components/windows.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Clean window display/width/height (keep display: none)
content = re.sub(r'style="display: none; width: \d+px; height: \d+px;"', 'style="display: none;"', content)
content = re.sub(r'style="display: none; width: \d+px; height: \d+px"', 'style="display: none;"', content)

# 2. Files action buttons
content = re.sub(r'style="display: flex; gap: 6px; margin-right: 12px; align-items: center;"', 'class="files-action-buttons-group"', content)
content = re.sub(r'style="font-size: 14px;"', '', content)
content = re.sub(r'style="width: 1px; height: 16px; background-color: rgba\(255,255,255,0\.1\); margin: 0 4px;"', 'class="files-toolbar-divider"', content)

# 3. Store icons
content = re.sub(r'style="font-size: 12px; margin-right: 6px;"', '', content)

# 4. Browser icons
content = re.sub(r'style="font-size: 13px;"', '', content)

# 5. Editor save button
content = re.sub(r'style="font-size: 11px; margin-right: 6px;"', '', content)

# 6. Installer icons
content = re.sub(r'style="font-size: 48px; color: var\(--color-accent\);"', '', content)
content = re.sub(r'style="font-size: 64px; color: var\(--color-success\);"', '', content)
content = re.sub(r'style="margin-top: 10px; font-weight: 500;"', '', content)
content = re.sub(r'style="margin-top: 16px; font-weight: 500;"', '', content)
content = re.sub(r'style="margin-top: 20px; padding: 10px 24px;"', '', content)

# 7. Paint colors
# we will let python remove them, but we need dynamic JS or specific classes. 
# "no hardcode" - we will add classes .paint-color-white, etc.
color_map = {
    '#ffffff': 'white',
    '#ef4444': 'red',
    '#10b981': 'green',
    '#3b82f6': 'blue',
    '#f59e0b': 'orange',
    '#000000': 'black'
}
for hex_c, name in color_map.items():
    content = content.replace(f'style="background: {hex_c};"', f'class="paint-preset-color color-{name}"')

# 8. Media player
content = re.sub(r'style="font-size: 20px;"', '', content)
content = re.sub(r'style="font-size: 16px;"', '', content)

# 9. Discord Bot Avatar
content = re.sub(r'style="background: #5865f2;"', 'class="chat-user-avatar bot-avatar"', content)

# 10. Settings about row
content = content.replace('style="flex-direction: column; align-items: flex-start; gap: 4px;"', 'class="about-row-col"')
content = content.replace('style="word-break: break-all; font-size: 10px; text-align: left; opacity: 0.8; user-select: text;"', 'class="about-val-ua"')

# 11. Drive segment
content = content.replace('style="width: 100%; background: linear-gradient(135deg, #3b82f6, #1d4ed8);"', 'class="drive-segment root-seg"')

# 12. Mic meter
content = content.replace('style="width: 25%"', 'class="meter-bar-25"')

# 13. Progress fill
content = content.replace('style="width: 0%"', '')

# Remove redundant style=""
content = content.replace(' style=""', '')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleaned inline styles from windows.html")
