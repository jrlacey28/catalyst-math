# Sources and third-party boundaries

- Catalyst logo: exact owner-provided SVG from jrlacey28/catalyst-web-app, client/public/catalyst-logo.svg, SHA 4f164542886cc0d143206ab97e56b39527c1bc1f. Reused at the owner's explicit request. The earlier application's package.json declares MIT.
- Dashboard learning UI: native browser HTML, CSS, JavaScript, and SVG; Python standard library. The separate editable walkthrough source includes the third-party animation components described below; playing its finished video requires no animation library installation.
- Existing lesson videos: original authored explanations and Manim scenes, rendered locally with local Kokoro narration. Finished MP4s are included only in the full offline archive. Models, voice weights, Python environments, and third-party packages are not redistributed in these archives.
- Video source tools list their dependencies in tools/requirements.txt. Installing those tools is optional for playing or studying the released lessons; consult each upstream package/model's license before redistributing it. System fonts are not bundled.
- OpenStax, Active Calculus, MIT OpenCourseWare, and the PreTeXt catalog are external reading links. Their texts and videos are not copied into this release and retain their own licenses.
- The interface uses broad patterns of visual exploration, guided questions, and feedback. It does not copy Brilliant lessons, visual assets, branding, or assessments, and does not claim affiliation or validated equivalence.
- Application source and original shared Catalyst learning materials in the community release are offered under the included MIT license. Personal learner work, histories, preferences, and private diagnostic records are excluded.

## Guided walkthrough source

- The walkthrough's narration, story, screen captures and original composition code are Catalyst materials. Screens show an isolated demo learner; no original learner history, private account data or generated AI reply was copied. The finished walkthrough is an extra demo alongside the 159 lesson videos.
- `videos/catalyst-tour/assets/gsap.min.js` is **GSAP 3.14.2**, obtained from the npm package. Its original header retains Copyright 2025, GreenSock, author Jack Doyle, and the [GSAP Standard License](https://gsap.com/standard-license/). GSAP is not covered by Catalyst's MIT license. The bundled file is used by the editable tour composition, not by the learning dashboard or native MP4 player.
- `videos/catalyst-tour/compositions/components/simulated-cursor.html` comes from the [HyperFrames registry](https://github.com/heygen-com/hyperframes/tree/main/registry). The walkthrough adapts its pointer geometry and click-pulse idea to annotations over captured screens; these annotations do not represent live pointer input. HyperFrames is Copyright 2026 HeyGen, Inc., under [Apache License 2.0](https://github.com/heygen-com/hyperframes/blob/main/LICENSE). A copy is included at `videos/catalyst-tour/licenses/Apache-2.0-HyperFrames.txt`; upstream components keep that license and attribution.
- HyperFrames CLI 0.8.59 is an optional rendering tool referenced by the tour's `package.json`. The CLI, Node.js installation, model weights and render caches are not bundled. The tour includes its finished compressed narration for editing; source WAV files and intermediate audio parts are excluded from releases.

## One-minute launch video

The launch film uses original Catalyst narration and actual isolated-demo screen captures. It bundles the same GSAP 3.14.2 file, under its Standard License. The optional editable source adapts the HyperFrames registry soft-blur-in primitive, under Apache-2.0 (copy in videos/catalyst-launch/licenses/Apache-2.0-HyperFrames.txt). HyperFrames CLI 0.8.78 is pinned for rendering. No proprietary system fonts, voice models, learner evidence, browser identities, or rendering caches are bundled.
