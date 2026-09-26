// A public walkthrough: no learner history, grading, or progress mutations.
export function createTourUI({api, esc}) {
  let version = 0;
  let disposeMedia = null;
  const $ = selector => document.querySelector(selector);

  function cancel() {
    version += 1;
    disposeMedia?.();
    disposeMedia = null;
  }

  function timeLabel(value) {
    const seconds = Math.max(0, Math.floor(Number(value) || 0));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function localURL(value) {
    // The tour endpoint supplies local media paths. Keep media on this server.
    if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return '';
    try {
      const url = new URL(value, location.origin);
      return url.origin === location.origin ? url.pathname + url.search : '';
    } catch {
      return '';
    }
  }

  function downloadLinks(downloads) {
    const offline = downloads.offline === true
      ? '<a class="button small" href="/downloads/catalyst-offline.zip" download="catalyst-offline.zip">Full offline ZIP ↓</a>' : '';
    const source = downloads.source === true
      ? '<a class="button secondary small" href="/downloads/catalyst-source.zip" download="catalyst-source.zip">Source ZIP ↓</a>' : '';
    return offline || source ? `<div class="tour-downloads">${offline}${source}</div>` : '';
  }

  function setup(downloads) {
    return `<section class="tour-setup" aria-labelledby="tour-setup-title">
      <div class="tour-section-heading"><div><span class="eyebrow">FROM ZIP TO YOUR FIRST SESSION</span><h2 id="tour-setup-title">Set up your own copy.</h2></div><a class="tour-text-link" href="/GETTING_STARTED.md" target="_blank" rel="noopener">Full setup & backup guide ↗</a></div>
      <ol class="tour-setup-steps">
        <li><span class="tour-step-number" aria-hidden="true">1</span><div><h3>Get the ZIP. Extract it.</h3><p>Download the <a href="https://github.com/jrlacey28/catalyst-math/releases/latest" target="_blank" rel="noopener noreferrer">latest Catalyst ZIP ↗</a> and extract it completely. Open the <strong>catalyst</strong> folder containing <code>start.py</code>.</p><p class="tour-small">The offline ZIP includes the videos. The <a href="https://github.com/jrlacey28/catalyst-math" target="_blank" rel="noopener noreferrer">public source code ↗</a> includes the app, transcripts and exercises.</p>${downloadLinks(downloads)}</div></li>
        <li><span class="tour-step-number" aria-hidden="true">2</span><div><h3>Install Python 3.10 or newer.</h3><p>Use the <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer">official Python download ↗</a>. The learning app needs no paid account or AI model.</p><p class="tour-small">Already installed? Check <code>python --version</code> on Windows or <code>python3 --version</code> on macOS/Linux.</p></div></li>
        <li><span class="tour-step-number" aria-hidden="true">3</span><div><h3>Start Catalyst.</h3><p><strong>Windows:</strong> double-click <code>Start Catalyst.cmd</code> in the extracted folder.</p><p><strong>macOS / Linux:</strong> open Terminal in that folder and run <code>python3 start.py</code>.</p></div></li>
        <li><span class="tour-step-number" aria-hidden="true">4</span><div><h3>Open your browser.</h3><p>Visit <a href="http://127.0.0.1:8766" target="_blank" rel="noopener"><code>http://127.0.0.1:8766</code> ↗</a>. Keep the launch terminal open while you learn.</p><p class="tour-small">Stop with <kbd>Ctrl</kbd> + <kbd>C</kbd> in that terminal. Next time, launch from the same folder to keep your saved work.</p></div></li>
      </ol>
      <details class="tour-setup-help"><summary>Python not found, or the page will not open?</summary><p>Finish Python setup, open a new terminal and check its version. If <code>py</code> works on Windows, run <code>py start.py</code> from the extracted folder. Run the launcher before opening the browser; opening <code>index.html</code> directly will not start Catalyst.</p><p>If port 8766 is busy, use <code>python3 start.py --port 8770</code> on macOS/Linux, or <code>python start.py --port 8770</code> on Windows, then open <code>http://127.0.0.1:8770</code>. If this copy is already running, use its existing address.</p><p>In the original Math workspace, the launcher is <code>Open Catalyst.cmd</code>. The steps above describe the portable ZIP. The <a href="/GETTING_STARTED.md" target="_blank" rel="noopener">written guide</a> also covers backups and moving to another computer.</p></details>
    </section>`;
  }

  function render(data, downloads, failed) {
    const videoURL = localURL(data.video_url);
    const posterURL = localURL(data.poster_url);
    const captionsURL = localURL(data.captions_url);
    const available = data.video_available === true && Boolean(videoURL);
    const chapters = (Array.isArray(data.chapters) ? data.chapters : [])
      .filter(chapter => chapter && typeof chapter === 'object' && typeof chapter.text === 'string' && chapter.text.trim())
      .map((chapter, i) => ({
      title: String(chapter.title || `Chapter ${i + 1}`),
      text: chapter.text.trim(),
      start: Number(chapter.start),
      duration: Number(chapter.duration),
    })).filter(chapter => Number.isFinite(chapter.start) && chapter.start >= 0 && Number.isFinite(chapter.duration) && chapter.duration >= 0)
      .sort((a, b) => a.start - b.start);
    const duration = Number.isFinite(Number(data.duration)) ? Math.max(0, Number(data.duration)) : 0;
    const readButton = chapters.length ? '<button class="button secondary small" type="button" data-tour-read>Read the walkthrough →</button>' : '';
    const fallbackTitle = failed ? 'The walkthrough details could not load.'
      : chapters.length ? 'The written walkthrough is ready.' : 'Start with the setup guide.';
    const fallbackText = failed ? 'The setup steps and learning links below are still available. Try the walkthrough again when this local server is responding.'
      : chapters.length ? 'The tour video is not available in this copy. Read the chapters below, or use the full offline ZIP for video playback.'
        : 'This copy has no tour video or written chapters available. Follow the setup steps below, or open the full setup guide.';
    const fallback = `<div class="tour-media-fallback" id="tour-media-fallback" ${available ? 'hidden' : ''}>
      <div class="tour-fallback-art" aria-hidden="true"><span>x</span><b>↦</b><span>f(x)</span></div>
      <h2>${fallbackTitle}</h2>
      <p>${fallbackText}</p>
      <div class="tour-fallback-actions">${readButton}<a class="tour-text-link" href="/GETTING_STARTED.md" target="_blank" rel="noopener">Open the setup guide ↗</a>${failed ? '<button class="button secondary small" type="button" data-tour-retry>Try again</button>' : ''}</div>
    </div>`;

    $('#main').innerHTML = `<div class="tour-page">
      <header class="tour-intro"><div><span class="eyebrow">WELCOME TO CATALYST</span><h1>Make your first idea click.</h1><p>See how to get started, explore the math and build an explanation of your own.</p></div><a class="button secondary" href="#profiles">Choose my learning space →</a></header>
      <p class="tour-small">The lesson layout has been simplified since this recording: the three problems now sit below the video, with a calculator and corner coach. <a href="/GETTING_STARTED.md" target="_blank" rel="noopener">Read the current learning guide →</a></p>
      <section class="tour-player-section" aria-labelledby="tour-video-title">
        <div class="tour-section-heading"><h2 id="tour-video-title">A walkthrough from setup to learning</h2><span class="tour-duration">${available && duration ? `${timeLabel(duration)} · ` : ''}${available ? 'Narrated tour' : chapters.length ? 'Written tour' : 'Setup guide'}</span></div>
        <div class="tour-watch-grid${chapters.length ? '' : ' tour-watch-solo'}">
          <div class="tour-screen-column">
            <div class="tour-screen">${available ? `<video id="tour-video" controls playsinline preload="metadata" aria-label="Catalyst getting-started walkthrough" ${posterURL ? `poster="${esc(posterURL)}"` : ''} src="${esc(videoURL)}">${captionsURL ? `<track kind="captions" src="${esc(captionsURL)}" srclang="en" label="English" default>` : ''}Your browser cannot play this video. ${chapters.length ? 'Use the written walkthrough below.' : 'Follow the setup steps below or open the setup guide.'}</video>` : ''}${fallback}</div>
            ${available ? `<div class="tour-player-tools"><p>Pause and replay any step.${captionsURL ? ' Use CC for captions.' : ''}</p><label for="tour-speed">Speed <select id="tour-speed"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div>` : ''}
            <p class="tour-play-status" id="tour-play-status" role="status" aria-live="polite"></p>
          </div>
          ${chapters.length ? `<nav class="tour-chapters" aria-label="Walkthrough chapters"><div class="tour-chapters-heading"><h3>Jump to a step</h3><span>${available ? 'Select to play' : 'Select to read'}</span></div><ol>${chapters.map((chapter, i) => `<li><button type="button" data-tour-chapter="${i}" aria-label="${available ? 'Play' : 'Read'} chapter ${i + 1}: ${esc(chapter.title)}${available ? ', at ' + timeLabel(chapter.start) : ''}"><span class="tour-chapter-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><span class="tour-chapter-title">${esc(chapter.title)}</span>${available ? `<span class="tour-chapter-time" aria-hidden="true">${timeLabel(chapter.start)}</span>` : ''}</button></li>`).join('')}</ol></nav>` : ''}
        </div>
        ${chapters.length ? `<details class="tour-transcript" id="tour-transcript"><summary>Read the full walkthrough</summary><div class="tour-transcript-content">${chapters.map((chapter, i) => `<section id="tour-transcript-${i}" tabindex="-1"><h3><span aria-hidden="true">${String(i + 1).padStart(2, '0')} · </span>${esc(chapter.title)}</h3><p>${esc(chapter.text)}</p></section>`).join('')}</div></details>` : ''}
      </section>

      <section class="tour-next" aria-labelledby="tour-next-title"><div><span class="eyebrow">YOUR FIRST FEW MINUTES</span><h2 id="tour-next-title">Choose a place to begin.</h2><p>Create your own learning space, then find a starting point or follow your curiosity.</p></div><div class="tour-start-links"><a href="#profiles"><strong>My learning space</strong><span>Keep each person's work separate. →</span></a><a href="#placement"><strong>Find my level</strong><span>Get a starting recommendation. →</span></a><a href="#videos"><strong>Browse courses</strong><span>Choose an idea you want to understand. →</span></a><a href="#lab"><strong>Open the playground</strong><span>Predict, move a control and compare. →</span></a></div></section>

      <section class="tour-tool-section" aria-labelledby="tour-tools-title"><div class="tour-section-heading"><h2 id="tour-tools-title">Which tool should I use?</h2><span class="tour-small">One question, a useful next step.</span></div><div class="tour-tool-grid">
        <a class="tour-tool-card tour-mint" href="#videos"><span aria-hidden="true">▦</span><div><h3>“Teach me the idea.”</h3><p><strong>Courses</strong> pairs a short video with guides and practice where available.</p></div></a>
        <a class="tour-tool-card tour-blue" href="#lab"><span aria-hidden="true">↗</span><div><h3>“What changes if…?”</h3><p><strong>Math playground</strong> puts movable graphs, diagrams and models together.</p></div></a>
        <a class="tour-tool-card tour-gold" href="#reasoning"><span aria-hidden="true">⇄</span><div><h3>“Why is that step allowed?”</h3><p><strong>Why this step?</strong> unpacks transformations and the restrictions that matter.</p></div></a>
        <a class="tour-tool-card tour-lilac" href="#studio"><span aria-hidden="true">∫</span><div><h3>“When would I use this?”</h3><p><strong>Apply the math</strong> connects several ideas in a model and a decision.</p></div></a>
        <article class="tour-tool-card tour-peach"><span aria-hidden="true">✎</span><div><h3>“Help me improve my work.”</h3><p><a href="#homework"><strong>My homework</strong></a> keeps your writing. <a href="#feedback"><strong>Review my reasoning</strong></a> helps you inspect and revise it.</p></div></article>
        <a class="tour-tool-card tour-mint" href="#review"><span aria-hidden="true">↻</span><div><h3>“Can I still do it?”</h3><p><strong>Mixed review</strong> offers fresh practice and later recall across supported skills.</p></div></a>
      </div></section>

      <section class="tour-rhythm" aria-labelledby="tour-rhythm-title"><div><span class="eyebrow">A RHYTHM YOU CONTROL</span><h2 id="tour-rhythm-title">Understand. Try. Explain. Return.</h2></div><ol><li><strong>Watch & predict</strong><span>Pause at a step. Say what you expect before moving a control.</span></li><li><strong>Try three problems</strong><span>Show your method. Ask for a hint when a step feels unclear.</span></li><li><strong>Check & revisit</strong><span>Try a fresh check, save your explanation and return later.</span></li></ol><p>Videos introduce an idea; practice, reasoning and later recall show what you can use. Written proofs still need a tutor's review.</p></section>

      ${setup(downloads)}
      <aside class="tour-help-note"><div><h3>Make it personal, with or without AI.</h3><p><a href="#tailor">Tailor to my interests</a> creates a copyable tutor brief. An optional local model can offer unverified help; it does not grade your work.</p></div><a class="tour-text-link" href="#videos">Find my first idea →</a></aside>
    </div>`;
    return {available, chapters};
  }

  function wire({available, chapters}, mountedVersion) {
    const video = $('#tour-video');
    const root = $('.tour-page');
    const status = $('#tour-play-status');
    const listeners = [];
    let pendingSeek = null;
    let activeChapter = -1;
    const fresh = () => version === mountedVersion && root?.isConnected;
    const listen = (element, event, handler) => {
      element?.addEventListener(event, handler);
      if (element) listeners.push(() => element.removeEventListener(event, handler));
    };

    function openTranscript(index = 0) {
      const details = $('#tour-transcript');
      if (!details || !fresh()) return;
      details.open = true;
      markChapter(index);
      const section = document.getElementById(`tour-transcript-${index}`);
      section?.focus({preventScroll: true});
      (section || details).scrollIntoView({behavior: 'auto', block: 'start'});
    }

    function markChapter(index) {
      if (index === activeChapter) return;
      activeChapter = index;
      root.querySelectorAll('[data-tour-chapter]').forEach(button => {
        const current = Number(button.dataset.tourChapter) === index;
        button.classList.toggle('is-current', current);
        if (current) button.setAttribute('aria-current', 'true');
        else button.removeAttribute('aria-current');
      });
    }

    function applySeek() {
      if (!fresh() || !video || pendingSeek === null || video.readyState < 1) return;
      const upper = Number.isFinite(video.duration) ? Math.max(0, video.duration - 0.05) : pendingSeek;
      try {
        video.currentTime = Math.max(0, Math.min(pendingSeek, upper));
        pendingSeek = null;
      } catch {
        // Keep the target until metadata or a seekable duration becomes available.
      }
    }

    function playChapter(index) {
      if (!fresh()) return;
      const chapter = chapters[index];
      if (!chapter) return;
      if (!available || !video || video.error) { openTranscript(index); return; }
      pendingSeek = chapter.start;
      applySeek();
      markChapter(index);
      status.textContent = `Chapter ${index + 1}: ${chapter.title}`;
      // Called synchronously from the user's chapter click, preserving playback consent.
      const playing = video.play();
      playing?.catch(error => {
        if (fresh() && !video.error && error?.name !== 'AbortError') status.textContent = 'Press Play in the video controls to start this chapter, or read the walkthrough below.';
      });
    }

    root.querySelectorAll('[data-tour-chapter]').forEach(button => listen(button, 'click', () => playChapter(Number(button.dataset.tourChapter))));
    root.querySelectorAll('[data-tour-read]').forEach(button => listen(button, 'click', () => openTranscript()));
    root.querySelectorAll('[data-tour-retry]').forEach(button => listen(button, 'click', () => { void mount(); }));
    listen($('#tour-speed'), 'change', event => {
      const rate = Number(event.target.value);
      if (video && fresh() && [0.75, 1, 1.25, 1.5, 2].includes(rate)) video.playbackRate = rate;
    });
    listen(video, 'loadedmetadata', applySeek);
    listen(video, 'durationchange', applySeek);
    listen(video, 'timeupdate', () => {
      if (!fresh()) return;
      let index = -1;
      chapters.forEach((chapter, i) => { if (chapter.start <= video.currentTime + 0.1) index = i; });
      markChapter(index);
    });
    function mediaFailed() {
      if (!fresh()) return;
      pendingSeek = null;
      markChapter(-1);
      video.hidden = true;
      const fallback = $('#tour-media-fallback');
      fallback.hidden = false;
      fallback.querySelector('h2').textContent = 'The video could not load.';
      fallback.querySelector('p').textContent = chapters.length
        ? 'Use the written walkthrough below. If you expected video in this copy, check the extracted files and reload this page.'
        : 'Follow the setup steps below or open the full setup guide. If you expected video in this copy, check the extracted files and reload this page.';
      const controls = $('.tour-player-tools');
      if (controls) controls.hidden = true;
      const badge = $('.tour-duration');
      if (badge) badge.textContent = chapters.length ? 'Written tour' : 'Setup guide';
      status.textContent = chapters.length ? 'Video unavailable. The chapter buttons now open the written walkthrough.'
        : 'Video unavailable. The setup guide and learning links are still available.';
      root.querySelectorAll('[data-tour-chapter]').forEach((button, i) => {
        button.setAttribute('aria-label', `Read chapter ${i + 1}: ${chapters[i].title}`);
      });
      const chapterHint = $('.tour-chapters-heading span');
      if (chapterHint) chapterHint.textContent = 'Select to read';
      if (document.activeElement === video || controls?.contains(document.activeElement)) {
        fallback.querySelector('button, a')?.focus();
      }
    }
    listen(video, 'error', mediaFailed);
    // A cached failure can be visible before the event listeners are attached.
    if (video?.error) mediaFailed();

    disposeMedia = () => {
      for (const remove of listeners) remove();
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.querySelectorAll('source, track').forEach(node => node.remove());
        video.load();
      }
    };
  }

  async function mount() {
    cancel();
    const mountedVersion = version;
    const main = $('#main');
    if (!main) return;
    if ($('#breadcrumb')) $('#breadcrumb').textContent = 'Getting started';
    main.innerHTML = '<div class="loading" role="status">Opening the Catalyst walkthrough…</div>';
    let data = {};
    let failed = false;
    try {
      const response = await api('tour');
      if (!response || typeof response !== 'object' || Array.isArray(response)) throw new Error('Invalid walkthrough response');
      data = response;
    } catch {
      failed = true;
    }
    if (mountedVersion !== version) return;
    const state = render(data, data.downloads || {}, failed);
    wire(state, mountedVersion);
  }

  return {mount, cancel};
}
