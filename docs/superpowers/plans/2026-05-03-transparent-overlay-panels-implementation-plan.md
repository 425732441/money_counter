# Transparent Overlay Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the status menu and local stats hover panel render outside the compact 66px widget strip without opaque expanded-window background.

**Architecture:** Make the Tauri main window transparent, keep only the visible widget strip and overlay panels painted, and use one runtime overlay-window sizing path for both the status menu and local stats panel. Move local stats panel out of the clipped status widget subtree.

**Tech Stack:** Tauri 2 config, vanilla JavaScript window sizing, CSS overlays, Node static tests.

---

## Tasks

### Task 1: Transparent Window Contract
- [ ] Update static tests to require transparent main window config.
- [ ] Update Tauri config to `transparent: true` and transparent background color.

### Task 2: Overlay DOM Contract
- [ ] Update static tests so local stats panel is outside `status-widget`.
- [ ] Move `local-stats-panel` under `widget-shell` beside `status-menu`.

### Task 3: Shared Overlay Sizing
- [ ] Add tests for shared overlay sizing function names and classes.
- [ ] Replace status-menu-only sizing with shared overlay open/close logic.
- [ ] Add pointer/focus handlers for local stats panel.

### Task 4: Transparent CSS
- [ ] Update CSS tests for transparent shell and overlay classes.
- [ ] Make `.widget-shell` transparent, keep `.status-widget` painted, and style both panels as overlay cards.

### Task 5: Verification
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `cargo test` in `src-tauri`.
