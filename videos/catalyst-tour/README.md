# Catalyst guided walkthrough

A narrated introduction to setting up Catalyst and completing a useful learning session: understand an idea, predict and explore, try three problems, check independently, save an explanation and return for review.

The walkthrough has 14 chapters and lasts approximately **5 minutes 19 seconds**. Its composition is 1920 × 1080 at 30 frames per second. It is a separate app demo; the lesson catalog still contains 159 concept videos.

## Watch or read

Open **Getting started** in Catalyst. The full offline release includes `final.mp4`, with `captions.vtt`, `poster.jpg`, chapter timings and the narration transcript. A source-only copy uses the written walkthrough when the MP4 is absent. Installation and backup instructions are in [GETTING_STARTED.md](../../dashboard/GETTING_STARTED.md).

All screenshots were captured from Catalyst using a separate demo learner. Cursor movement and short annotations are authored tutorial overlays on those captures. They do not depict a live screen recording. The demo contains no original learner history or fabricated AI response. Opening the in-app tour does not grade work, change a profile or save learning evidence.

## Editable source

- `index.html` assembles the chapters under `compositions/`.
- `assets/` contains the captured app screens, logo, GSAP library and compressed `narration.mp3` used by the composition.
- `capture_metadata.json` records each screen capture's dimensions, actual image format and SHA-256 hash. `tools/build_tour.py` uses these dimensions for layout. The CUA captures retain their exact original bytes: they contain JPEG image data despite their `.png` filenames, so use the metadata or decode the image instead of inferring its format from the extension.
- `narration.json` and `narration.txt` hold the original spoken script. `timings.json` maps the 14 chapters; `captions.vtt` provides subtitles.
- `narration_metadata.json` records the local Kokoro voice configuration. `verified.json`, when present, records checks on the finished render.
- `STORYBOARD.md` describes the captured screens and chapter sequence. `package.json`, `hyperframes.json` and `hyperframes.lock.json` describe the optional authoring tools and registry component.

Viewing the app or finished MP4 needs no Node.js, voice model or animation tool. To edit or render the composition, install the dependencies required by HyperFrames, then use the scripts in this folder: `npm run dev`, `npm run check` and `npm run render`. These invoke HyperFrames CLI 0.8.59 through `npx`; a first run may download the tool. Replacing or regenerating narration is a separate production step using the local voice tooling.

The source release deliberately excludes uncompressed WAV files, intermediate `audio_parts/`, render caches, QA snapshots and the finished MP4. It retains compressed narration so the editable composition can use the existing voice track. The full offline release adds the finished MP4.

## Credits and licenses

Original Catalyst narration, captures and composition code use the project's MIT license. The captured Catalyst logo is the owner's supplied original design.

The bundled GSAP 3.14.2 file retains its original copyright header and [GSAP Standard License](https://gsap.com/standard-license/); it is not MIT-licensed. The simulated-cursor component comes from the HyperFrames registry, Copyright 2026 HeyGen, Inc., under Apache License 2.0. Catalyst adapts its pointer geometry and click-pulse idea for screen annotations; the registry component and its license are retained with the source. See [the included Apache license](licenses/Apache-2.0-HyperFrames.txt) and [THIRD_PARTY.md](../../dashboard/THIRD_PARTY.md).
