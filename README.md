# gpx-calc

Leanline is a browser-local GPX telemetry viewer and CSV exporter for motorcycle video overlays.

## Run locally

Open `index.html` in a modern browser, or serve the repository root with a static web server:

```sh
python3 -m http.server 8000
```

Open http://localhost:8000. No build step or dependencies are required. Deploy the repository root to any static host.

## Features

- Local GPX parsing; ride files never leave the browser.
- GPS-estimated lean, or explicit recorded lean extensions when available.
- Independent left/right peak calibration using known full-ride maxima.
- GPS-estimated speed with optional five-second median filtering.
- Lean and speed charts, shared scrubber, trimming, video offsets and top estimated speed.
- CSV exports with optional frame-rate interpolation and calibration metadata.
- Separate plain-text lean-angle magnitude/direction and speed overlays for Apple Motion's File text generators.

## Interpretation

GPS-derived lean and speed are estimates, not recovered IMU or speedometer data. Matching known lean peaks scales each side's magnitude; it does not validate intermediate angles or their timing. Missing intervals and track-segment boundaries remain gaps on the charts. Missing lean and speed samples export as `0` in CSV and Motion TXT files; CSV `source` and `speed_source` retain `missing` labels so those zeros are distinguishable from valid zeros. Optional calibration metadata remains blank when unset. Speed filtering reduces brief spikes but can suppress short peaks.

Enter peak-left and peak-right values as positive degree magnitudes for the same complete ride. Calibration uses the entire GPX before trimming. Loading another ride clears those values.

CSV is not a direct Apple Motion rotation-keyframe format. For two independent overlays, choose fixed-frame-rate sampling and export both Motion lean text and Motion speed text. Each file has one line per frame (including `0` for missing data). Lean displays the absolute angle and LEFT/RIGHT (STRAIGHT when zero); GPS estimates retain EST or CAL EST prefixes. Speed displays one decimal in the selected mph or km/h units; add the unit as a static label in Motion. Use a separate File text generator for each TXT file, select Constant speed, disable Random, use identical start points and durations (`row count / fps`), and account for your video offset. Verify synchronization in your composition.

No personal GPX files are included in this repository.
