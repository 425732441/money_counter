# About And Feedback Design

## Goal

Add the smallest release-feedback loop needed for an internal test build: users can see where the project lives, where to report issues, what version they are using, and how privacy is handled.

## Scope

- Add an `关于与反馈` link to the existing settings page.
- Open the release information in an in-page dialog so the settings page stays compact.
- Show the current app version as `v0.0.1`.
- Show the open-source repository URL: `https://github.com/425732441/money_counter`.
- Show the feedback URL: `https://github.com/425732441/money_counter/issues`.
- Reserve an H5 URL row with `准备中`.
- Show the privacy statement: settings and local statistics stay on this computer.
- Add dialog buttons to open the repository, open feedback, and copy feedback information.

## Feedback Information

The copied text includes:

- App name and version.
- Repository URL.
- Feedback URL.
- H5 URL status.
- Current privacy mode, reminder switch, local statistics switch, and character switch.
- It must not include the income amount.

## External Links

Opening links uses a Tauri command instead of adding a new plugin. The command only accepts `http://` and `https://` URLs and delegates to the OS.

Copying feedback text uses the clipboard plugin with the required `clipboard-manager:allow-write-text` capability.

## Settings Height

The settings window starts at a smaller desktop height and uses internal scrolling for overflow. The about/feedback details live behind a link so release metadata does not make the main settings view taller.

## Out Of Scope

- No standalone feedback form.
- No network submission from the desktop client.
- No full diagnostic export file.
- No production H5 page implementation in this task.

## Testing

- Static DOM tests check the link, dialog, URLs, and buttons.
- Runtime contract tests check constants, feedback copy builder, link opener, and `writeText` usage.
- CSS tests check that the dialog overlays the settings layout and that the settings view remains scrollable.
- Capability tests check text clipboard permission.
- Rust tests check URL validation for the external link opener.
