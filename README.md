# gpx-calc

Leanline is a browser-local GPX telemetry viewer with two aligned CSV exports for motorcycle video overlays.

## Run locally

Open `index.html` in a modern browser, or serve the repository root:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build step or dependencies are required. Deploy the repository root to any static host.

## Exports

- **Lean angle CSV:** `frame,value`. Degrees, positive for left and negative for right; straight or missing data is `0`.
- **Speed CSV:** `frame,value`. Speed in the selected mph or km/h unit; missing data is `0`. The filename identifies the unit.

Each file has exactly two columns and a header row. Data indexes start at 0 and increase by 1. Both files use the same selected samples so row counts and indexes match. Numeric values retain up to four decimal places, with no text labels or degree symbols. Optional peak calibration applies to lean before export.

Choose a fixed frame rate for one row per video frame; original sampling uses one row per GPS sample. At fixed fps, duration is row count divided by fps. These files omit timestamps: apply video alignment manually using your trim and video offset. Offset does not change indexes. Keep settings unchanged between the two downloads.

The previous multi-column CSV and Motion TXT exports have been replaced. CSV does not directly create Apple Motion keyframes; use a suitable conversion or importer for your video workflow.

## Features and interpretation

Files are parsed locally and never uploaded. The interface provides GPS-estimated lean, explicit recorded lean extensions when available, independent left/right full-ride peak calibration, GPS-estimated speed with optional five-second median filtering, charts, a shared scrubber, trimming, video offsets, and top estimated speed.

GPS-derived lean and speed are estimates, not recovered IMU or speedometer data. Peak calibration adjusts magnitude, not timing. Enter peak magnitudes for the same complete ride; a new file clears them. Filtering can suppress short speed peaks.

Charts keep gaps for missing data and use negative left/positive right. Lean CSV reverses that sign to positive left/negative right. Recorded lean signs are preserved internally; verify the device's convention before using recorded mode. Both CSV files replace missing values with 0, so missing samples cannot be distinguished from true zero values in the exports.

No personal GPX files are included in this repository.
