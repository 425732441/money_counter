# About Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a compact settings-page About and Feedback link that opens GitHub links, H5 placeholder, privacy note, and copyable feedback information in a dialog.

**Architecture:** Keep release links as constants in `src/main.js`, render a settings link plus in-page dialog in `index.html`, and use a small Tauri command for opening external URLs. Use the existing clipboard plugin for copying text with explicit text-write capability.

**Tech Stack:** Tauri 2, Vite, vanilla JavaScript, CSS, Node test runner, Rust unit tests.

---

## Files

- Modify `index.html`: add `关于与反馈` link, dialog, and controls.
- Modify `src/main.js`: add release link constants, feedback info builder, text clipboard copy, and external link actions.
- Modify `src/styles.css`: style the dialog overlay and keep settings compact.
- Modify `src-tauri/capabilities/default.json`: allow text clipboard writes.
- Modify `src-tauri/src/lib.rs`: add validated external URL opener command.
- Modify `tests/index.test.js`: add DOM/runtime contracts.
- Modify `tests/styles.test.js`: add CSS contracts.
- Modify `tests/window-config.test.js`: add capability and settings window height contracts.

## Tasks

- [x] Add failing DOM/runtime tests for the about-feedback dialog.
- [x] Implement the settings-page link, dialog, and JavaScript wiring.
- [x] Add failing CSS tests for dialog layout and compact settings spacing.
- [x] Implement dialog styles and compact settings spacing.
- [x] Add failing capability and window-height tests.
- [x] Add text clipboard permission and reduce settings initial height.
- [x] Add failing Rust tests for external URL validation.
- [x] Implement the external URL command.
- [ ] Run `npm test`, `npm run build`, and `cargo test`.
