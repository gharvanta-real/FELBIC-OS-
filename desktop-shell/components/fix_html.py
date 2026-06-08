import re

file_path = 'desktop-shell/components/windows.html'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('class="files-action-buttons" class="files-action-buttons-group"', 'class="files-action-buttons files-action-buttons-group"')
content = content.replace('class="finder-sidebar"', 'class="finder-sidebar app-sidebar"')
content = content.replace('class="finder-sidebar-section"', 'class="app-sidebar-section"')
content = content.replace('class="finder-sidebar-item"', 'class="app-sidebar-item"')
content = content.replace('class="finder-sidebar-item ', 'class="app-sidebar-item ')
content = content.replace('class="finder-tab-icon"', 'class="app-sidebar-icon"')
content = content.replace('class="chat-user-avatar" class="chat-user-avatar bot-avatar"', 'class="chat-user-avatar bot-avatar"')
content = content.replace('class="paint-preset-color" class="', 'class="paint-preset-color ')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Done")