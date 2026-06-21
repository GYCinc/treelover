# Design Spec: Waybar-Integrated Live Port & Service Launcher

## Overview
This specification details the design of a custom Waybar module integrated with a Wofi-based launcher menu. The menu acts as a dashboard for local web development servers and services running on local ports. It displays a status-aware list of hardcoded projects (Tree Architect, ZZZlides) showing whether they are Online or Offline, lists other active TCP ports dynamically, and provides actions to open active services in the browser or launch inactive ones in `cosmic-term`.

## Architecture & Components

### 1. Wofi Launcher Script (`/home/hayron/launch-menu.sh`)
The script is responsible for:
- Declaring a list of hardcoded local programs, their ports, and their start commands:
  ```bash
  PROGRAMS=(
    "Tree Architect|3000|cosmic-term -- /home/hayron/MyProjects/treeLover/launch.sh"
    "ZZZlides|2828|cosmic-term -- bash -c 'cd /home/hayron/MyProjects/ZZZlides && bash launch.sh'"
  )
  ```
- Reading active TCP listening ports from `/home/hayron/localports once`.
- Determining the status of each hardcoded program (Online if its port is active, Offline otherwise).
- Generating a Wofi menu with:
  - `🟢 <Name> (Online - Port <port>)` for online hardcoded programs.
  - `🔴 <Name> (Offline)` for offline hardcoded programs.
  - `🌐 Open http://localhost:<port> (<process>)` for other active TCP ports.
  - `🛑 Stop All Dev Servers (killall bun)` utility.
- Executing the user's selection:
  - Online programs & dynamic ports: Launch in the default web browser via `xdg-open "http://localhost:<port>"` or `gio open "http://localhost:<port>"`.
  - Offline programs: Launch their associated command in the background.
  - Stop option: Run `killall bun`.

### 2. Styling (`/home/hayron/MyProjects/treeLover/wofi-style.css`)
To keep the UI clean, modern, and avoid over-the-top/cheesy retro CRT effects:
- Background: Sleek modern dark tone (`#1e1e2e`).
- Border: Subtle dark-gray boundary (`#2e3440`).
- Text color: Polished off-white (`#cdd6f4`).
- Highlight color: Smooth modern blue accent (`#89b4fa`) with dark text (`#11111b`) when selected.
- Font family: Clean monospace (`JetBrains Mono`, `Courier New`, or monospace).

### 3. Waybar Integration
We define a static custom module `"custom/localports"` that runs the Wofi launcher script when clicked.

**Module configuration:**
```jsonc
"custom/localports": {
  "format": "🔌 Ports",
  "on-click": "/home/hayron/launch-menu.sh",
  "tooltip": false
}
```

**Locations:**
- `/home/hayron/.config/waybar/config.jsonc` (appended to `modules-right` next to `"custom/hyprwhspr"`)
- `/home/hayron/.config/waybar/config` (appended to `modules-left` next to `"custom/launcher"`)

## Success Criteria & Testing
1. **Status Checking:** Verify `/home/hayron/localports once` successfully detects port statuses.
2. **Offline Launching:** Selecting `🔴 Tree Architect` or `🔴 ZZZlides` correctly triggers their start commands in a `cosmic-term` terminal window.
3. **Online Browser Launch:** Selecting an active port opens `http://localhost:<port>` in the default browser.
4. **Waybar Clickability:** Verify clicking "🔌 Ports" in Waybar pops up the Wofi window successfully.
