"""Public walkthrough metadata and media boundaries, using temporary files only.

Run: python math-tutor/dashboard/qa/test_tour.py
The MP4 fixture tests HTTP transport, not media decoding or the rendered tour.
"""
from copy import deepcopy
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from unittest.mock import patch, Mock
import json
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server as app


class TourFrontendTests(unittest.TestCase):
    """Exercise fallback and media events without opening or sharing a browser.

    The small DOM fixture checks state changes, not browser layout or decoding.
    """

    def test_disconnected_media_client_does_not_receive_a_second_response(self):
        for error in (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            with self.subTest(error=error.__name__):
                handler = app.Handler.__new__(app.Handler)
                handler.path = '/videos/catalyst-tour/final.mp4'
                handler.local_request = Mock(return_value=True)
                handler.serve = Mock(side_effect=error('Client stopped playback'))
                handler.json = Mock()
                handler.do_GET()
                handler.serve.assert_called_once_with(handler.path)
                handler.json.assert_not_called()

    def node(self):
        executable = shutil.which('node')
        if not executable:
            self.skipTest('Node is required for the optional tour UI regression checks')
        return executable

    def test_module_syntax(self):
        result = subprocess.run([self.node(), '--check', str(app.APP / 'tour.js')],
                                capture_output=True, text=True, encoding='utf-8')
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_fallbacks_media_events_and_cancelled_requests(self):
        script = r"""
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const source = await readFile(process.argv[1], 'utf8');
const {createTourUI} = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
globalThis.location = {origin: 'http://127.0.0.1:8766'};
const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
let state;
class Element {
  constructor() {
    this.listeners = new Map(); this.attributes = new Map(); this.dataset = {};
    this.hidden = false; this.isConnected = true; this.textContent = '';
    this.classes = new Set(); this.children = [];
    this.classList = {toggle: (name, yes) => yes ? this.classes.add(name) : this.classes.delete(name)};
  }
  addEventListener(name, listener) {
    if (!this.listeners.has(name)) this.listeners.set(name, new Set());
    this.listeners.get(name).add(listener);
  }
  removeEventListener(name, listener) { this.listeners.get(name)?.delete(listener); }
  emit(name) { for (const fn of [...(this.listeners.get(name) || [])]) fn({target:this}); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  focus() { state.document.activeElement = this; }
  scrollIntoView() { this.scrolled = true; }
  contains(node) { return this.children.includes(node); }
  remove() { this.removed = true; }
  querySelector() { return null; }
  querySelectorAll() { return []; }
}
function harness(options = {}) {
  const h = {nodes:new Map(), calls:[], options}; state = h;
  h.document = {
    body:new Element(),
    querySelector: selector => h.nodes.get(selector) || null,
    getElementById: id => h.nodes.get('#' + id) || null,
  };
  h.document.activeElement = h.document.body; globalThis.document = h.document;
  h.main = new Element(); h.nodes.set('#main',h.main); h.nodes.set('#breadcrumb',new Element());
  let html = '';
  Object.defineProperty(h.main, 'innerHTML', {
    get: () => html,
    set: value => {
      html = value;
      if (h.root) h.root.isConnected = false;
      for (const key of [...h.nodes.keys()]) if (!['#main','#breadcrumb'].includes(key)) h.nodes.delete(key);
      if (!value.includes('class="tour-page"')) return;
      h.root = new Element(); h.nodes.set('.tour-page',h.root);
      h.buttons = [...value.matchAll(/data-tour-chapter="(\d+)"/g)].map(match => {
        const node = new Element(); node.dataset.tourChapter = match[1]; return node;
      });
      h.read = value.includes('data-tour-read') ? new Element() : null;
      h.retry = value.includes('data-tour-retry') ? new Element() : null;
      h.root.querySelectorAll = selector => ({
        '[data-tour-chapter]':h.buttons, '[data-tour-read]':h.read ? [h.read] : [],
        '[data-tour-retry]':h.retry ? [h.retry] : [],
      }[selector] || []);
      h.status = new Element(); h.nodes.set('#tour-play-status',h.status);
      h.badge = new Element(); h.nodes.set('.tour-duration',h.badge);
      h.fallback = new Element(); h.title = new Element(); h.copy = new Element(); h.guide = new Element();
      h.fallback.hidden = /id="tour-media-fallback" hidden/.test(value);
      h.fallback.querySelector = selector => ({h2:h.title,p:h.copy,'button, a':h.read || h.guide}[selector] || null);
      h.nodes.set('#tour-media-fallback',h.fallback);
      if (value.includes('id="tour-transcript"')) {
        h.details = new Element(); h.nodes.set('#tour-transcript',h.details);
        for (let i=0;i<h.buttons.length;i++) h.nodes.set('#tour-transcript-' + i,new Element());
        h.hint = new Element(); h.nodes.set('.tour-chapters-heading span',h.hint);
      }
      h.video = null;
      if (value.includes('id="tour-video"')) {
        const v = h.video = new Element();
        Object.assign(v,{readyState:0,duration:90,currentTime:0,error:options.cachedError || null,
          pauseCount:0,playCount:0,loadCount:0,playbackRate:1});
        v.setAttribute('src','fixture-local-media');
        v.play = () => { v.playCount++; return options.rejectPlay ? Promise.reject(new Error('Playback refused')) : Promise.resolve(); };
        v.pause = () => {v.pauseCount++;};
        v.load = () => {v.loadCount++;};
        h.track = new Element(); v.querySelectorAll = () => [h.track];
        h.nodes.set('#tour-video',v);
        h.speed = new Element(); h.nodes.set('#tour-speed',h.speed);
        h.controls = new Element(); h.controls.children.push(h.speed); h.nodes.set('.tour-player-tools',h.controls);
      }
    }
  });
  return h;
}
const chapters = [
  {title:'Get your copy',text:'Extract the supplied ZIP.',start:0,duration:10},
  {title:'Try an idea',text:'Predict, then test the result.',start:10,duration:20},
];
const videoData = {video_available:true,video_url:'/videos/catalyst-tour/final.mp4',
  poster_url:'/videos/catalyst-tour/poster.jpg',captions_url:'/videos/catalyst-tour/captions.vtt',
  duration:30,chapters,downloads:{source:false,offline:false}};
async function mount(data, options = {}) {
  const h = harness(options);
  h.ui = createTourUI({esc,api:path => {
    h.calls.push(path);
    return options.rejectAPI ? Promise.reject(new Error('Unavailable')) : Promise.resolve(data);
  }});
  await h.ui.mount();
  assert.deepEqual(h.calls,['tour'], 'The tour reads only public metadata');
  return h;
}
let h = await mount({video_available:false,chapters:[]});
assert.match(h.main.innerHTML,/Start with the setup guide/);
assert.match(h.main.innerHTML,/tour-watch-solo/);
assert.match(h.main.innerHTML,/>Setup guide<\/span>/);
assert.doesNotMatch(h.main.innerHTML,/written walkthrough is ready|data-tour-read|tour-transcript"/);
assert.match(h.main.innerHTML,/GETTING_STARTED\.md/);
assert.match(h.main.innerHTML,/Start Catalyst\.cmd/);
assert.match(h.main.innerHTML,/python3 start\.py/);
assert.match(h.main.innerHTML,/Keep the launch terminal open/);
h.ui.cancel();

h = await mount({...videoData,video_available:false,downloads:{source:true,offline:'true'}});
assert.match(h.main.innerHTML,/written walkthrough is ready/);
assert.match(h.main.innerHTML,/catalyst-source\.zip/);
assert.doesNotMatch(h.main.innerHTML,/catalyst-offline\.zip|<video/);
h.buttons[1].emit('click');
assert.equal(h.details.open,true);
assert.equal(h.document.activeElement,h.nodes.get('#tour-transcript-1'));
assert.equal(h.buttons[1].attributes.get('aria-current'),'true');
h.ui.cancel();

h = await mount({chapters:[null,5,{}, {text:' '}, {text:'Bad time',start:'invalid',duration:5}]});
assert.match(h.main.innerHTML,/Start with the setup guide/);
assert.doesNotMatch(h.main.innerHTML,/data-tour-chapter/);
h.ui.cancel();

h = await mount(null,{rejectAPI:true});
assert.match(h.main.innerHTML,/walkthrough details could not load/);
assert.match(h.main.innerHTML,/data-tour-retry/);
assert.doesNotMatch(h.main.innerHTML,/written walkthrough is ready|data-tour-read/);
for (const route of ['#profiles','#placement','#videos','#lab']) assert.ok(h.main.innerHTML.includes('href="' + route + '"'));
h.ui.cancel();

h = await mount([]);
assert.match(h.main.innerHTML,/walkthrough details could not load/);
assert.match(h.main.innerHTML,/data-tour-retry/);
h.ui.cancel();

h = await mount({...videoData,video_url:'//example.invalid/tour.mp4',
  chapters:[{title:'<img src=x onerror=alert(1)>',text:'<script>bad()</script>',start:0,duration:10}]});
assert.equal(h.video,null);
assert.doesNotMatch(h.main.innerHTML,/<script>|<img src=x/);
assert.match(h.main.innerHTML,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);
h.ui.cancel();

h = await mount(videoData);
assert.equal(h.video.playCount,0,'Mount never starts playback');
assert.match(h.main.innerHTML,/<track kind="captions"/);
assert.doesNotMatch(h.main.innerHTML,/autoplay/);
h.buttons[1].emit('click');
assert.equal(h.video.playCount,1);
assert.equal(h.video.currentTime,0,'Chapter seek waits for metadata');
h.video.readyState = 1; h.video.emit('loadedmetadata');
assert.equal(h.video.currentTime,10);
h.speed.value='1.5'; h.speed.emit('change'); assert.equal(h.video.playbackRate,1.5);
h.speed.value='bad'; h.speed.emit('change'); assert.equal(h.video.playbackRate,1.5);
h.video.currentTime=1; h.video.emit('timeupdate');
assert.equal(h.buttons[0].attributes.get('aria-current'),'true');
h.document.activeElement = h.video; h.video.error={code:4}; h.video.emit('error');
assert.equal(h.video.hidden,true);
assert.equal(h.fallback.hidden,false);
assert.equal(h.controls.hidden,true);
assert.equal(h.badge.textContent,'Written tour');
assert.equal(h.document.activeElement,h.read,'Focus leaves the hidden media');
assert.equal(h.buttons[0].attributes.has('aria-current'),false);
h.buttons[1].emit('click');
assert.equal(h.details.open,true);
assert.equal(h.video.playCount,1,'Failed media uses text instead of retrying autoplay');
const removedVideo = h.video;
h.ui.cancel();
assert.equal(removedVideo.pauseCount,1);
assert.equal(removedVideo.loadCount,1);
assert.equal(removedVideo.attributes.has('src'),false);
assert.equal(h.track.removed,true);
assert.ok([...removedVideo.listeners.values()].every(set => set.size===0));

h = await mount({...videoData,chapters:[]},{cachedError:{code:4}});
assert.match(h.copy.textContent,/setup steps below or open the full setup guide/);
assert.doesNotMatch(h.copy.textContent,/written walkthrough/);
assert.equal(h.badge.textContent,'Setup guide');
assert.match(h.status.textContent,/setup guide and learning links/);
h.ui.cancel();

h = await mount(videoData,{rejectPlay:true});
h.buttons[0].emit('click'); await Promise.resolve();
assert.match(h.status.textContent,/Press Play in the video controls/);
h.ui.cancel();

h = harness();
let resolveOld, resolveNew;
const oldResponse = new Promise(resolve => {resolveOld=resolve;});
const newResponse = new Promise(resolve => {resolveNew=resolve;});
let request = 0;
const ui = createTourUI({esc,api:() => ++request===1 ? oldResponse : newResponse});
const oldMount=ui.mount(); const newMount=ui.mount();
resolveNew({video_available:false,chapters:[{title:'Current response',text:'Current text.',start:0,duration:5}]});
await newMount;
resolveOld({...videoData,chapters:[{title:'Stale response',text:'Stale text.',start:0,duration:5}]});
await oldMount;
assert.match(h.main.innerHTML,/Current response/);
assert.doesNotMatch(h.main.innerHTML,/Stale response/);
ui.cancel();

h = harness();
let resolveCancelled;
const pending = new Promise(resolve => {resolveCancelled=resolve;});
const cancelledUI = createTourUI({esc,api:() => pending});
const mounting=cancelledUI.mount();
cancelledUI.cancel(); h.main.innerHTML='<p>Another page</p>';
resolveCancelled(videoData); await mounting;
assert.equal(h.main.innerHTML,'<p>Another page</p>');
console.log('11 tour UI scenarios passed without a browser or learner files.');
"""
        result = subprocess.run([self.node(), '--input-type=module', '-e', script,
                                 str(app.APP / 'tour.js')],
                                capture_output=True, text=True, encoding='utf-8', timeout=30)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('11 tour UI scenarios passed', result.stdout)

    def test_small_text_contrast_on_its_background(self):
        css = (app.APP / 'tour.css').read_text(encoding='utf-8')

        def color(selector, property_name='color'):
            block = re.search(re.escape(selector) + r'\{([^}]+)\}', css).group(1)
            return re.search(r'(?:^|;)' + property_name + r':#([0-9a-f]{6})\b', block).group(1)

        def luminance(value):
            channels = [int(value[i:i + 2], 16) / 255 for i in (0, 2, 4)]
            linear = [x / 12.92 if x <= .04045 else ((x + .055) / 1.055) ** 2.4 for x in channels]
            return sum(x * weight for x, weight in zip(linear, (.2126, .7152, .0722)))

        backgrounds = {
            '.tour-chapters-heading span': color('.tour-chapters-heading', 'background'),
            '.tour-chapter-number': 'ffffff',
            '.tour-chapter-time': 'ffffff',
            '.tour-transcript-content h3 span': 'ffffff',
            '.tour-next p': color('.tour-next', 'background'),
            '.tour-start-links span': 'ffffff',
            '.tour-setup-steps p.tour-small': 'ffffff',
            '.tour-help-note p': color('.tour-help-note', 'background'),
        }
        for selector, background in backgrounds.items():
            with self.subTest(selector=selector):
                low, high = sorted((luminance(color(selector)), luminance(background)))
                self.assertGreaterEqual((high + .05) / (low + .05), 4.5)


class TourTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='catalyst-tour-test-')
        self.addCleanup(self.temp.cleanup)
        self.previous = {key: getattr(app, key) for key in ('ROOT', 'STATE', 'STATE_DIR', 'STORE')}
        self.addCleanup(self.restore_globals)
        base = Path(self.temp.name)
        self.state_dir = base / 'isolated-original'
        # Configure against the real code's new_student helper, but never its learner files.
        app.configure(state_dir=self.state_dir)
        app.STATE['homework'] = {'fixture-lesson': {'written': 'Private fixture explanation'}}
        app.STATE['sessions'] = {'fixture-check': {'mode': 'check', 'submitted': False}}
        app.save()
        self.root = base / 'math-tutor'
        app.ROOT = self.root
        self.folder = self.root / 'videos/catalyst-tour'
        self.folder.mkdir(parents=True)
        self.releases = base / 'releases'
        self.releases.mkdir()
        self.parts = [
            {'title': 'Get your copy', 'text': 'Extract the provided ZIP.', 'start': 0, 'duration': 12.5, 'audio': 'PRIVATE/audio_parts/01.wav', 'render_source': 'PRIVATE/index.html'},
            {'title': 'Understand a step', 'text': 'Predict, then try three problems.', 'start': 12.5, 'duration': 8.25, 'audio': 'PRIVATE/audio_parts/02.wav'},
        ]
        (self.folder / 'timings.json').write_text(json.dumps(self.parts), encoding='utf-8')
        self.media = {
            'final.mp4': b'\x00\x00\x00\x18ftypisom' + bytes(range(256)) * 4,
            'narration.txt': b'Extract the provided ZIP. Predict, then try three problems.\n',
            'captions.vtt': b'WEBVTT\n\n00:00.000 --> 00:12.500\nExtract the provided ZIP.\n',
            'poster.jpg': b'\xff\xd8fixture poster\xff\xd9',
        }
        for name, body in self.media.items():
            (self.folder / name).write_bytes(body)
        self.http = ThreadingHTTPServer(('127.0.0.1', 0), app.Handler)
        self.worker = threading.Thread(target=self.http.serve_forever, daemon=True)
        self.worker.start()
        self.addCleanup(self.stop_server)
        self.base = f'http://127.0.0.1:{self.http.server_address[1]}'

    def stop_server(self):
        self.http.shutdown()
        self.http.server_close()
        self.worker.join(timeout=5)

    def restore_globals(self):
        for key, value in self.previous.items():
            setattr(app, key, value)

    def request(self, path, *, expected=200, method='GET', headers=None):
        request = Request(self.base + path, method=method, headers=headers or {})
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            body = response.read()
            self.assertEqual(response.status, expected, (path, body[:300]))
            return body, response.headers

    def metadata(self, **kwargs):
        body, headers = self.request('/api/tour', **kwargs)
        self.assertIn('application/json', headers['Content-Type'])
        return json.loads(body), headers

    def state_files(self):
        return {path.relative_to(self.state_dir).as_posix(): path.read_bytes()
                for path in self.state_dir.rglob('*') if path.is_file()}

    def test_public_metadata_has_chapters_and_no_production_internals(self):
        expected_chapters = [{key: part[key] for key in ('title', 'text', 'start', 'duration')} for part in self.parts]
        data, headers = self.metadata()
        self.assertEqual(data, app.public_tour())
        self.assertTrue(data['video_available'])
        self.assertEqual(data['duration'], 20.75)
        self.assertEqual(data['chapters'], expected_chapters)
        self.assertEqual(data['video_url'], '/videos/catalyst-tour/final.mp4')
        self.assertEqual(data['poster_url'], '/videos/catalyst-tour/poster.jpg')
        self.assertEqual(data['captions_url'], '/videos/catalyst-tour/captions.vtt')
        self.assertEqual(data['downloads'], {'source': False, 'offline': False})
        self.assertNotIn('PRIVATE', json.dumps(data))
        self.assertNotIn('Private fixture explanation', json.dumps(data))
        self.assertNotIn('profile_id', data)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')

    def test_source_only_copy_retains_written_chapters_and_truthful_downloads(self):
        (self.folder / 'final.mp4').unlink()
        (self.releases / 'catalyst-source.zip').write_bytes(b'fixture source archive')
        data, _ = self.metadata()
        self.assertFalse(data['video_available'])
        self.assertEqual(len(data['chapters']), 2)
        self.assertEqual(data['chapters'][0]['text'], self.parts[0]['text'])
        self.assertEqual(data['duration'], 20.75)
        self.assertEqual(data['downloads'], {'source': True, 'offline': False})
        self.request(data['video_url'], expected=404)
        transcript, _ = self.request('/videos/catalyst-tour/narration.txt')
        self.assertEqual(transcript, self.media['narration.txt'])
        (self.releases / 'catalyst-offline.zip').write_bytes(b'fixture offline archive')
        self.assertEqual(self.metadata()[0]['downloads'], {'source': True, 'offline': True})

    def test_missing_tour_assets_returns_empty_public_fallback(self):
        (self.folder / 'timings.json').unlink()
        (self.folder / 'final.mp4').unlink()
        data, _ = self.metadata()
        self.assertFalse(data['video_available'])
        self.assertEqual(data['duration'], 0)
        self.assertEqual(data['chapters'], [])

    def test_only_exact_public_media_names_are_served(self):
        for name, expected in self.media.items():
            with self.subTest(public=name):
                body, headers = self.request('/videos/catalyst-tour/' + name)
                self.assertEqual(body, expected)
                self.assertEqual(int(headers['Content-Length']), len(expected))
                self.assertEqual(headers['Accept-Ranges'], 'bytes')
                self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        for name in ('scene.py', 'index.html', 'narration.json', 'narration.wav', 'meta.json', 'AGENTS.md', 'alternate.mp4', 'preview.jpg'):
            (self.folder / name).write_bytes(b'PRIVATE TOUR PRODUCTION FILE')
            with self.subTest(private=name):
                body, _ = self.request('/videos/catalyst-tour/' + name, expected=404)
                self.assertNotIn(b'PRIVATE TOUR PRODUCTION FILE', body)
        self.request('/videos/catalyst-tour/timings.json', expected=404)
        nested = self.folder / 'nested'
        nested.mkdir()
        (nested / 'final.mp4').write_bytes(b'PRIVATE NESTED VIDEO')
        self.request('/videos/catalyst-tour/nested/final.mp4', expected=404)
        self.request('/videos/catalyst-tour/', expected=404)

    def test_tour_frontend_and_setup_guide_are_public_but_qa_is_not(self):
        for path in ('/tour.js', '/tour.css', '/GETTING_STARTED.md'):
            with self.subTest(public=path):
                body, headers = self.request(path)
                self.assertEqual(body, (app.APP / path.lstrip('/')).read_bytes())
                self.assertEqual(headers['X-Content-Type-Options'], 'nosniff')
        self.request('/qa/test_tour.py', expected=404)

    def test_private_sources_and_encoded_directory_escapes_are_denied(self):
        # These targets exist, so a 404 checks the boundary instead of a missing file.
        (self.root / 'student').mkdir()
        (self.root / 'student/dashboard_progress.json').write_bytes(b'PRIVATE OUTSIDE TOUR')
        (self.root / 'videos/final.mp4').write_bytes(b'PRIVATE OUTSIDE TOUR')
        paths = (
            '/server.py', '/profile_store.py', '/qa/test_tour.py',
            '/videos/catalyst-tour/../final.mp4',
            '/videos/catalyst-tour/%2e%2e/final.mp4',
            '/videos/catalyst-tour/%2e%2e%2ffinal.mp4',
            '/videos/catalyst-tour/../../student/dashboard_progress.json',
            '/videos/catalyst-tour/%2e%2e/%2e%2e/student/dashboard_progress.json',
            '/student/dashboard_progress.json',
        )
        for path in paths:
            with self.subTest(path=path):
                body, _ = self.request(path, expected=404)
                self.assertNotIn(b'PRIVATE OUTSIDE TOUR', body)

    def test_mp4_ranges_and_head_support_browser_seeking(self):
        video = self.media['final.mp4']
        path = '/videos/catalyst-tour/final.mp4'
        cases = [('bytes=5-23', 5, 23), ('bytes=100-', 100, len(video) - 1),
                 ('bytes=-17', len(video) - 17, len(video) - 1),
                 ('bytes=100-99999', 100, len(video) - 1)]
        for value, start, end in cases:
            with self.subTest(range=value):
                body, headers = self.request(path, expected=206, headers={'Range': value})
                self.assertEqual(body, video[start:end + 1])
                self.assertEqual(headers['Content-Range'], f'bytes {start}-{end}/{len(video)}')
                self.assertEqual(int(headers['Content-Length']), len(body))
                self.assertEqual(headers['Content-Type'], 'video/mp4')
                self.assertEqual(headers['Accept-Ranges'], 'bytes')
        body, headers = self.request(path, method='HEAD')
        self.assertEqual(body, b'')
        self.assertEqual(int(headers['Content-Length']), len(video))
        body, headers = self.request(path, method='HEAD', expected=206, headers={'Range': 'bytes=5-23'})
        self.assertEqual(body, b'')
        self.assertEqual(headers['Content-Range'], f'bytes 5-23/{len(video)}')
        self.assertEqual(headers['Content-Length'], '19')
        for value in ('bytes=99999-', 'bytes=9-3', 'bytes=0-1,4-5', 'not-a-range'):
            with self.subTest(invalid_range=value):
                self.request(path, expected=416, headers={'Range': value})

    def test_tour_is_read_only_even_with_a_selected_browser_profile(self):
        # The only original learner here is the isolated fixture created in setUp.
        _, profile_headers = self.request('/api/profiles')
        cookie = profile_headers['Set-Cookie'].split(';', 1)[0]
        before_files = self.state_files()
        before_state = deepcopy(app.STATE)
        before_sessions = deepcopy(app.STORE.sessions)
        with patch.object(app.STORE, 'resolve', wraps=app.STORE.resolve) as resolve, \
             patch.object(app.STORE, 'load', wraps=app.STORE.load) as load, \
             patch.object(app, 'save', wraps=app.save) as save:
            for headers in ({}, {'Cookie': cookie}, {'Cookie': 'catalyst_learner_invalid=unknown'}):
                with self.subTest(cookie=bool(headers)):
                    _, result_headers = self.metadata(headers=headers)
                    self.assertIsNone(result_headers.get('Set-Cookie'))
                    self.request('/videos/catalyst-tour/final.mp4', headers=headers)
            resolve.assert_not_called()
            load.assert_not_called()
            save.assert_not_called()
        self.assertEqual(app.STATE, before_state)
        self.assertEqual(app.STORE.sessions, before_sessions)
        self.assertEqual(self.state_files(), before_files)


if __name__ == '__main__':
    unittest.main(verbosity=2)
