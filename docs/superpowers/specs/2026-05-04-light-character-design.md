# Light Character Design

## Goal

Add an MVP light character to the main widget so the product has a small amount of visible personality without becoming a desktop pet.

## Scope

- Use an embedded minimalist pixel worker in the existing main status widget.
- Show the character by default.
- Add a settings switch so users can turn the character off.
- Reuse existing work status data for character states.
- Keep the current coin mark as the fallback when the character is disabled.
- Do not add a separate floating character window.
- Do not add the character to share images in this iteration.

## States

The character maps to the existing runtime status:

- `working`: focused worker, breathing / typing feel.
- `fishing`: relaxed worker, subtle grin.
- `lunch`: resting worker, sleepy face.
- `pause`: paused worker, idle.
- `offWork`: waving / leaving.
- overtime or post-work active time: low-energy styling when available from metrics.

If the app cannot determine a specific state, it falls back to `working`.

Each state must have a distinct motion pattern, not just a color change. The MVP uses CSS keyframes on body parts: working types with alternating hands, fishing sways, lunch nods off, pause breathes slowly, off-work waves, and overtime adds a low-battery pulse.

## UI Behavior

The main widget keeps its current compact layout. The left visual slot becomes a character slot when `settings.characterEnabled` is true. When false, it renders the current coin icon unchanged.

The character is CSS-only HTML/SVG-like markup using small rectangular shapes. This avoids adding image assets and keeps the bundle small.

## Settings

Add a `轻角色` setting in the existing settings grid:

- Options: `开启`, `关闭`.
- Default: `开启`.
- Tip text: `只影响主面板装饰和轻微动效，不会上传任何数据。`

The setting is persisted with the existing settings object as `characterEnabled`.

## Accessibility

The character is decorative and uses `aria-hidden="true"`. The setting remains accessible through a normal select control and reuses the existing field help tooltip style.

## Testing

Use the current static and unit test style:

- DOM test confirms the character slot and setting exist.
- Runtime test confirms `characterEnabled` has a default and render logic toggles character visibility.
- CSS test confirms pixel character states and animations exist.
