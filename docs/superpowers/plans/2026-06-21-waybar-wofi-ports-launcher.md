# Waybar-Wofi Ports Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a status-aware Waybar custom module and Wofi launcher script that displays hardcoded local port programs (Tree Architect, ZZZlides) as Online or Offline, checks active ports via `localports once`, lists other active TCP ports dynamically, and runs appropriate browser-open or server-launch commands.

**Architecture:** A lightweight bash wrapper script (`launch-menu.sh`) queries port lists, matches against static declarations, displays statuses in a Catppuccin-styled Wofi list, and executes background launch processes (`cosmic-term` commands) or browser-opens (`xdg-open`). A custom module binds this to the Waybar panel.

**Tech Stack:** Bash, Wofi, Waybar, System76 COSMIC Desktop Environment (on Fedora).

## Global Constraints
- Avoid bright retro neon green CRT text and glowing styling. Use a sleek, modern, Nord/Catppuccin-style dark theme.
- Run terminal commands via `cosmic-term` for visual console programs.
- Do not perform destructive deletions.

---

### Task 1: Clean, Modern Dark Wofi Style

**Files:**
- Modify: `/home/hayron/MyProjects/treeLover/wofi-style.css`

- [ ] **Step 1: Replace wofi-style.css contents**
  Write the modern dark theme CSS styling to `/home/hayron/MyProjects/treeLover/wofi-style.css`.
  
  ```css
  /* Sleek, Modern Dark Theme for Wofi */
  window {
      margin: 0px;
      border: 1px solid #313244; /* Subtle dark border */
      background-color: #1e1e2e; /* Catppuccin dark gray/blue */
      font-family: "Courier New", monospace;
      font-size: 13px;
      border-radius: 8px;
  }

  #input {
      margin: 8px;
      border: 1px solid #45475a;
      color: #cdd6f4;
      background-color: #11111b;
      border-radius: 4px;
      padding: 6px;
  }

  #inner-box {
      margin: 5px;
      background-color: #1e1e2e;
      color: #cdd6f4;
  }

  #outer-box {
      margin: 5px;
      background-color: #1e1e2e;
  }

  #scroll {
      margin: 5px;
  }

  #text {
      margin: 5px;
      color: #cdd6f4;
  }

  #entry:selected {
      background-color: #89b4fa; /* Clean blue highlight */
      color: #11111b;
      border-radius: 4px;
  }

  #text:selected {
      color: #11111b;
  }
  ```

- [ ] **Step 2: Commit styling change**
  ```bash
  git add wofi-style.css
  git commit -m "style: update wofi theme to modern dark layout"
  ```

---

### Task 2: Live Status Wofi Launcher Script

**Files:**
- Modify: `/home/hayron/launch-menu.sh`

- [ ] **Step 1: Replace launch-menu.sh contents**
  Write the status-checking launcher logic to `/home/hayron/launch-menu.sh`.
  
  ```bash
  #!/usr/bin/env bash
  # Wofi live port status and project launcher

  # Modern clean wofi style location
  STYLE_PATH="/home/hayron/MyProjects/treeLover/wofi-style.css"

  # Hardcoded projects: "Name | Port | StartCommand"
  # Note: StartCommand launches the server if the port is offline.
  PROJECTS=(
      "Tree Architect|3000|cosmic-term -- /home/hayron/MyProjects/treeLover/launch.sh"
      "ZZZlides|2828|cosmic-term -- bash -c 'cd /home/hayron/MyProjects/ZZZlides && bash launch.sh'"
  )

  # Check active ports using localports utility (disables color because of non-TTY subshell)
  ACTIVE_PORTS_RAW=$(/home/hayron/localports once 2>/dev/null)

  # Function to check if a port is active
  is_port_active() {
      local target_port="$1"
      # Look for lines like "● 3000" or similar active port rows
      if echo "$ACTIVE_PORTS_RAW" | grep -qE "●[[:space:]]+$target_port"; then
          return 0
      else
          return 1
      fi
  }

  MENU_OPTIONS=""
  declare -A ACTION_MAP

  # 1. Process hardcoded programs
  for entry in "${PROJECTS[@]}"; do
      IFS="|" read -r name port cmd <<< "$entry"
      if is_port_active "$port"; then
          option="🟢 $name (Online - Port $port)"
          ACTION_MAP["$option"]="open|$port"
      else
          option="🔴 $name (Offline)"
          ACTION_MAP["$option"]="start|$cmd"
      fi
      MENU_OPTIONS+="$option\n"
  done

  # 2. Extract and append any other active TCP ports not in our hardcoded list
  while read -r line; do
      if [[ -n "$line" ]]; then
          read -r bullet port process pid proto addr <<< "$line"
          # Check if port is numeric and not already in our hardcoded list
          if [[ "$port" =~ ^[0-9]+$ ]] && [[ "$proto" == "TCP" ]]; then
              # Skip ports 3000 and 2828 as they are already handled
              if [[ "$port" != "3000" && "$port" != "2828" ]]; then
                  option="🌐 Open http://localhost:$port ($process)"
                  ACTION_MAP["$option"]="open|$port"
                  MENU_OPTIONS+="$option\n"
              fi
          fi
      fi
  done < <(echo "$ACTIVE_PORTS_RAW" | grep '●')

  # 3. Add global stop utility
  stop_option="🛑 Stop All Dev Servers (killall bun)"
  ACTION_MAP["$stop_option"]="stop"
  MENU_OPTIONS+="$stop_option"

  # Show menu using wofi
  CHOICE=$(echo -e "$MENU_OPTIONS" | wofi --dmenu --prompt "Ports & Servers:" --style "$STYLE_PATH" --width 400 --height 250)

  # Execute action based on selection
  ACTION="${ACTION_MAP["$CHOICE"]}"
  if [[ -n "$ACTION" ]]; then
      IFS="|" read -r act_type act_val <<< "$ACTION"
      case "$act_type" in
          "open")
              xdg-open "http://localhost:$act_val" 2>/dev/null &
              ;;
          "start")
              eval "$act_val" &
              ;;
          "stop")
              killall bun
              notify-send "Servers Stopped" "All running bun servers have been terminated."
              ;;
      esac
  fi
  ```

- [ ] **Step 2: Make launcher executable**
  Run: `chmod +x /home/hayron/launch-menu.sh`

---

### Task 3: Waybar Configuration Integration

**Files:**
- Modify: `/home/hayron/.config/waybar/config.jsonc`
- Modify: `/home/hayron/.config/waybar/config`

- [ ] **Step 1: Update config.jsonc**
  Edit `/home/hayron/.config/waybar/config.jsonc` to register `"custom/localports"` under `modules-right` and add its configuration.
  
  Expected lines to change/add:
  ```json
    "modules-right": [
      "custom/localports",
      "custom/hyprwhspr",
      "clock",
      "tray"
    ],
  ```
  And add the configuration block:
  ```json
    "custom/localports": {
      "format": "🔌 Ports",
      "on-click": "/home/hayron/launch-menu.sh",
      "tooltip": false
    },
  ```

- [ ] **Step 2: Update config**
  Edit `/home/hayron/.config/waybar/config` to register `"custom/localports"` under `modules-left` (next to custom/launcher) and add its configuration.
  
  Expected lines to change/add:
  ```json
      "modules-left": [
        "custom/launcher",
        "custom/localports",
        "hyprland/window",
        ...
      ],
  ```
  And add the configuration block inside the first configuration object:
  ```json
      "custom/localports": {
        "format": "🔌 Ports",
        "on-click": "/home/hayron/launch-menu.sh",
        "tooltip": false
      },
  ```
