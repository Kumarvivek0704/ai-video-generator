# AI Video Generator MVP

A lightweight browser-based prototype for planning, previewing, and exporting simple animated videos.

## What it does

- Create multiple scenes with a title, subtitle, background color, duration, and animation preset.
- Preview each scene in the browser with visible motion and timeline playback.
- Export the project as JSON.
- Export the whole timeline as a real downloadable **WebM video** using an in-browser canvas renderer and `MediaRecorder`.

## Project structure

- `index.html` – application shell and export controls.
- `styles.css` – layout, preview styling, and animation styling.
- `app.js` – scene editing, preview playback, canvas rendering, JSON export, and WebM export.

## Run locally

You can open `index.html` directly, but video export works best from a local server:

```bash
python3 -m http.server 8000
```

Then open: <http://127.0.0.1:8000/index.html>

## How to export a video

1. Add or edit your scenes.
2. Click a scene in the timeline if you want to preview from that point.
3. Click **Play timeline** to preview the current animation sequence.
4. Click **Export Video** to render the full timeline to `animated-video.webm`.
5. Click **Export JSON** if you also want the project data file.

## Notes

- The current implementation exports **WebM** in-browser.
- MP4 export is not included because browser-side MP4 support through `MediaRecorder` is inconsistent across environments.
- The rendered video uses the same scene title, subtitle, duration, background color, and animation preset that drive the live preview.
