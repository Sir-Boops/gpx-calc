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
- Plain-text lean overlays for Apple Motion's File text generator.

## Interpretation

GPS-derived lean and speed are estimates, not recovered IMU or speedometer data. Matching known lean peaks scales each side's magnitude; it does not validate intermediate angles or their timing. Missing intervals and track-segment boundaries remain blank. Speed filtering reduces brief spikes but can suppress short peaks.

Enter peak-left and peak-right values as positive degree magnitudes for the same complete ride. Calibration uses the entire GPX before trimming. Loading another ride clears those values.

CSV is not a direct Apple Motion rotation-keyframe format. For numeric overlays, choose fixed-frame-rate sampling and use the text export with Motion's File text generator. Verify timing in your composition.

No personal GPX files are included in this repository.
