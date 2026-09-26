# Catalyst in one minute

[Watch or download the MP4](https://github.com/jrlacey28/catalyst-math/releases/download/v0.10.2/catalyst-intro.mp4).

A 61-second narrated introduction to installing and using Catalyst. English captions are embedded in the picture; [captions.vtt](captions.vtt) and [narration.txt](narration.txt) are also supplied.

The full offline release contains **final.mp4** in this folder. The source release contains the editable composition and screen captures, without rendered MP4s. The launch video is an introduction, separate from the 159 math lessons and the longer setup walkthrough.

The video shows installation, choosing a starting point, lessons and three-problem practice, worked explanations, actual orbit/gear/AI model changes, the skill tree, and automatic saving. Screens were captured from an isolated demo learner. A fresh tree is shown honestly, without fabricated achievements.

To learn: follow the [quick start](../../PUBLIC_QUICKSTART.md). To edit the video: install Node.js, then use the pinned scripts in package.json (`npm run check`, `npm run render`). Local narration uses the optional tools/narrate.py Kokoro pipeline; voice weights and system fonts are not bundled. Existing compressed narration is included for editing.

Original story, narration, demo captures and composition code: Catalyst MIT. GSAP keeps its Standard License. HyperFrames's soft-blur-in component keeps Apache-2.0; see [third-party notices](../../dashboard/THIRD_PARTY.md). System-font fallback can slightly alter layout on another operating system; inspect before rerendering.
