# Catalyst — quick start

Community Edition 0.10.2 is a free local math learning app: 159 introductory videos, three problems at a time, worked examples, and hands-on applications from basic arithmetic through advanced college topics.

## 1. Get and extract your copy

Use a ZIP provided with this release:

- **`catalyst-offline.zip`** — about 570 MB; includes all lesson videos and the narrated setup tour and one-minute introduction.
- **`catalyst-source.zip`** — includes the app, source, transcripts, images, exercises, and live models; omits rendered MP4 videos.

Extract it fully into a writable folder, such as Documents. Open the **catalyst** folder containing `start.py`. Keep the ZIP for sharing and the extracted folder for your own learning.

Get the clean community app from [GitHub](https://github.com/jrlacey28/catalyst-math) and choose the provided ZIPs on the [release page](https://github.com/jrlacey28/catalyst-math/releases/latest). The GitHub Code → Download ZIP option contains source only; the full offline release includes rendered videos. Retain the clean download when sharing with someone else.

## 2. Start the app

Install **Python 3.10 or newer** from [python.org](https://www.python.org/downloads/) if needed. Choose a current stable Python 3 release. No paid account, AI model, or additional Python package is required.

- **Windows:** double-click **Start Catalyst.cmd**. If `python` is unavailable but `py` works, open a terminal in this folder and run `py start.py`.
- **macOS/Linux:** open Terminal in this folder and run `python3 start.py`.

Keep the terminal open and visit [Catalyst on this computer](http://127.0.0.1:8766). The launcher prints the address without opening your browser. Do not open `index.html` or run from inside the ZIP. Press **Ctrl+C** in the terminal to stop; launch from the same folder next time.

## 3. Make it your learning space

Use your learner name at the top or **More → Learners & settings** to create a separate profile for each person. **More → Find my level** offers placement; choosing a course yourself is also fine and does not award mastery.

Follow this loop:

1. Open a lesson in **Courses**. Watch, pause, and ask why each step works.
2. Try the three problems below it. Use **See an example**, a hint, or **Need a hand?** when stuck.
3. Open **Apply this idea**: predict, change a control, and explain what happened.
4. Try a fresh **independent check** when ready, then revisit due work through **Keep what I learn** or **More → Mixed review**.

**Apply the math** also offers Physics, Mechanical engineering, Electrical engineering, Architecture & civil engineering, Finance, and AI & machine learning. Written explanations and proofs need tutor review; watching or experimenting does not automatically earn a check pass.

## 4. Keep your work

Drafts save as you type, with a one-minute safety check for pending work. Wait for **Saved** before closing after new work. Autosave never submits a test for you. Tabs share the selected learner, so reload older tabs after switching profiles.

For a backup, stop Catalyst and copy the entire extracted folder. A smaller backup must include both `students/` and `student/`. Restore those folders into a stopped installation, keeping a copy of any existing records first. **Download my progress** produces readable JSON, but there is no JSON import; folder backups are how you restore. Progress does not sync automatically between computers.

If the browser cannot connect, check the terminal. Missing videos are expected in the source ZIP. For Python setup, another port, save errors, optional local AI, and detailed restore steps, read [Getting started](dashboard/GETTING_STARTED.md).

The code and original shared materials use the included MIT license; see [third-party notices](dashboard/THIRD_PARTY.md) for other licenses. Share a clean release ZIP, not your personal working folder. Local profiles are not password-protected accounts, and the localhost app is not a public hosting service.
