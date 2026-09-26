# Start learning with Catalyst

Community Edition 0.10.2 runs on your computer in a web browser. It includes 159 introductory math videos, practice, worked explanations, and interactive applications. The built-in learning tools need no paid account or AI service.

## Get your copy

Download one of the ZIPs provided with this release. A prepared installation may also offer them under **More → Free & open source**.

| File | Choose it for |
| --- | --- |
| `catalyst-offline.zip` | The complete app with all 159 lesson videos and the guided setup tour. About 570 MB. |
| `catalyst-source.zip` | A smaller copy with source code, transcripts, images, exercises, and live models. Rendered MP4 videos are omitted. |

Extract the ZIP completely into a folder you can write to, such as Documents. Open the extracted **catalyst** folder containing `start.py`. Keep this folder: it will hold your learning records too. Do not run from inside the ZIP or open `index.html` directly.

Get the clean community app from [GitHub](https://github.com/jrlacey28/catalyst-math) and choose the provided ZIPs on the [release page](https://github.com/jrlacey28/catalyst-math/releases/latest). The GitHub Code → Download ZIP option contains source only; the full offline release includes rendered videos. Retain the clean download when sharing with someone else.

## Install Python and start

You need **Python 3.10 or newer** and a modern browser. For a new installation, choose a current stable Python 3 release from [python.org](https://www.python.org/downloads/). Catalyst's core runtime uses Python's standard library: no `pip install`, Node.js, video renderer, or voice model is needed to learn.

**Windows**

1. Follow the [official Windows setup instructions](https://docs.python.org/3/using/windows.html). In a new terminal, `python --version` should report 3.10 or newer.
2. Double-click **Start Catalyst.cmd** inside the extracted folder. Keep its window open.
3. Open [Catalyst on this computer](http://127.0.0.1:8766) in your browser. The launcher prints the address; it does not open the browser automatically.

If `py --version` works but `python` does not, open a terminal in the folder containing `start.py` and run `py start.py` instead.

**macOS or Linux**

Use the [official macOS installer guidance](https://docs.python.org/3/using/mac.html), or your Linux distribution's Python package; see [Python on Unix](https://docs.python.org/3/using/unix.html). Open Terminal in the extracted folder containing `start.py`, then run:

```sh
python3 --version
python3 start.py
```

Keep Terminal open and visit [Catalyst on this computer](http://127.0.0.1:8766). Run only one Catalyst server for a given folder at a time.

## Choose your learning space

Your first portable launch creates **My learning space** with empty progress. Use your learner name at the top, or **More → Learners & settings**, to add a separate profile for each person. Placement, homework, and review dates belong to that profile.

Choose **More → Find my level** for an adaptive placement and a provisional starting recommendation. You can also choose a course or starting path yourself. Choosing a path sets your direction; it does not mark topics as mastered.

Check the learner name before working. Tabs in the same browser share the selection. After switching learners, reload older tabs; if a conflict appears, copy unsaved text before reloading. Profiles are local learning spaces on a trusted computer, not password-protected online accounts.

## Learn one idea at a time

The four main links are **Home**, **Courses**, **Apply the math**, and **Skill tree**. **More** contains saved homework, review, placement, and other tools.

1. **Watch and understand.** Open a lesson in Courses. Pause the video, use captions where provided, or expand **Transcript**. Ask why each mathematical step is allowed, including any restrictions on the variables.
2. **Try three problems.** Work directly below the video. Choose a simpler difficulty when needed. **See an example** opens worked reasoning; **← Back to my problems** returns to your existing answers. Use hints to find the first step you cannot explain.
3. **Apply the idea.** Expand **Apply this idea** after practice. Predict what will happen, change one control, then explain the result. Where **What would your answer do?** is available, enter your calculation and compare its outcome with the model. Treat the displayed assumptions as part of the problem.
4. **Check independently.** Use **Try an independent check** when ready. Relevant hints or explanations make an attempt supported; a fresh variation is needed afterward. Watching a video or copying a solution does not earn an independent pass.
5. **Explain and revisit.** Save your reasoning in **Written work** or **My homework**. Use **More → Review my reasoning** for feedback and revisions. Return to **Keep what I learn** on Home or **More → Mixed review** when a topic is due, before rereading its solution.

Practice stays available at any time. A new learner may have no due reviews yet. Review dates follow qualifying successful work; later recall is recorded separately from an initial check. Fresh question banks are finite, and the app reports exhaustion rather than counting repeated answers as new independent evidence.

**Skill tree** shows earned check stars. Written explanations and proofs still need tutor review. These short videos introduce concepts; they are not complete university courses.

## Useful tools, when you need them

- **Calculator** beside your practice opens arithmetic and graphs. Try `(14-2)/3` or graph `x^2-2`. It is a numerical calculator, not a symbolic algebra solver. **Math symbols** opens a small notation palette and preview.
- **Math tools → Check a confusing step** lets you compare supported algebraic rewrites and inspect domain restrictions. **More → Why this step?** offers guided transformations. A step check does not certify a proof.
- **Need a hand?** opens authored lesson guidance without AI. An optional conversation mode can use an independently installed local Ollama model. Models are not bundled or downloaded automatically. You choose whether to attach your visible problem and draft. AI replies can contain mistakes and never grade your work; return to practice before using assistance during a check.
- A **Tailor to my interests** link in the deeper investigations can produce a tutor brief to review and copy into a tutor conversation, without installing any model.

**Apply the math** offers six fields: Physics, Mechanical engineering, Electrical engineering, Architecture & civil engineering, Finance, and AI & machine learning. Follow a stage, move its controls, and open the math details as needed. The AI path trains a tiny model on invented samples; it explains the mathematics without claiming real-world recognition accuracy. Longer connected projects carry design decisions across stages. Controls and notes save per learner, and saved applications appear in My homework. These simplified models support learning; exploration is not an automatic grade.

**More → Getting started** opens the narrated tour. It was recorded with earlier lesson tabs; the current layout keeps video, practice, and expandable help together.

## Save, stop, and return

Drafts save as you type. A one-minute safety check also flushes pending work; the app attempts another save when you leave or hide the page. The status beside your learner name shows **Saving**, **Saved**, or **Not saved**; hover for the last confirmed save time. Temporary connection failures are retried while the app remains open. These saves preserve drafts, not automatic submissions or grades.

Keep the server running and wait for **Saved** before closing after new work. To stop Catalyst, press **Ctrl+C** in its terminal. Closing the browser alone leaves the server running. Next time, launch from the **same extracted folder** and reopen its address. Progress does not automatically sync between computers.

## Back up and restore

The simplest backup is a copy of the entire extracted folder made **after stopping Catalyst**. For a smaller progress backup, keep both `students/` and `student/`, including their contents and folder structure. The default learner's dashboard work is in `students/learner/student/dashboard_progress.json`; other profiles have their own folders under `students/`.

To restore into a fresh extracted copy, keep both servers stopped, preserve a copy of any existing records, then restore the backed-up `students/` and `student/` folders before launching. Select the intended learner after starting. Use this same approach when moving to a new computer or release.

**More → Download my progress** provides a readable JSON snapshot. **There is no JSON import button.** Keep a folder backup for restoration. Your working folder and backups contain personal learning records; share a clean release ZIP instead.

## Troubleshooting

| What happened? | What to try |
| --- | --- |
| Python is not found, or Windows opens the Store. | Follow the official Python setup above, reopen the terminal, and check the version. If `py` works, use `py start.py`. |
| The browser cannot connect. | Start Catalyst, leave the terminal open, and use the address it prints. Open `http://127.0.0.1:8766`, not a local HTML file. |
| Port 8766 is already in use. | If Catalyst is already running, use that instance. If another program owns the port, run `python start.py --port 8770` on Windows or `python3 start.py --port 8770` on macOS/Linux, then visit `http://127.0.0.1:8770`. |
| A lesson has no video. | This is expected in the source ZIP. Read its transcript and use the exercises, or obtain the offline ZIP. You can add its `videos/` directory to the same-version source installation. |
| Work says Not saved. | Keep the page open, check the server and selected learner, and confirm the extracted folder is writable. Copy your draft before reloading if the error persists. |
| Progress appears empty. | Check the learner and the folder you launched. A newly extracted copy starts fresh until you restore its learner folders. |

## Share and contribute

The release's code and original shared materials use the included **MIT license**. Retain the license notice when redistributing. Third-party materials retain their own licenses; see [THIRD_PARTY.md](THIRD_PARTY.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

Catalyst's localhost address is only for your computer. This portable server is not a hosted multiuser service. A voluntary learner pilot is available from About; its notes stay local unless deliberately shared, and the included protocol explains participation.
