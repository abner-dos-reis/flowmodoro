# Flowmodoro

Flowmodoro is a simple React + Bootstrap single-page app to track open-ended "flow" sessions, with break windows and a calendar. This scaffold implements the UI, timer, localStorage session persistence and a Docker Compose configuration.

Features implemented in scaffold:
- Count-up timer (start/pause/reset). When running the numeric time is hidden (design choice from request).
- Stop/Skip store a session (flows) in localStorage.
- Config modal and calendar placeholders.
- Dockerfile + docker-compose that serves the built app via nginx on host 127.0.0.1:5174 (avoids ports you already use).

How to run

1. Build and run with Docker Compose:

```sh
docker compose up --build -d
```

This composes two services:
- `flowmodoro-frontend` — the React app served by nginx (host: 127.0.0.1:5174)
- `flowmodoro-backend` — a small Express API using SQLite to persist sessions (internal port 3001)

The backend stores its SQLite database in a Docker volume `flowmodoro-data` so your recorded sessions and totals are persistent across container restarts and host reboots.

To inspect or remove stored data, you can remove the named volume (careful: this deletes all saved sessions):

```sh
docker compose down
docker volume rm flowmodoro_flowmodoro-data
```

Publish to GitHub (quick)
-------------------------

If you want to publish this project to GitHub from this machine, the recommended way is to use the GitHub CLI (`gh`). Below are quick steps you can follow.

1) Install GitHub CLI

- On Linux (Debian/Ubuntu):
	```sh
	sudo apt install gh
	# or follow https://cli.github.com/manual/installation for other distros
	```

2) Authenticate (choose HTTPS)

	```sh
	gh auth login
	# choose GitHub.com, HTTPS, then follow the interactive prompts to authenticate
	```

3) Create repository and push (helper script)

	I added a small helper script `scripts/create_repo_push.sh` which will initialize git (if needed), create a repository under your account, and push the code. Run it from the project root:

	```sh
	sh scripts/create_repo_push.sh
	```

	The script will ask for a repository name and description and will call `gh repo create ... --source=. --push` to create and push in one step.

Notes
- This script uses the `gh` CLI and requires you to be authenticated. It creates a public repository by default — edit the script if you want a private repo.
- If you prefer to create the repo on GitHub first, you can use the web UI and then add the origin remote and push manually.

2. Open http://127.0.0.1:5174 in your browser.

Development

Install dependencies and run dev server:

```sh
npm install
npm run dev
```

Notes

- The scaffold focuses on the core UI and timer logic. I'll continue implementing break windows, automatic break timers, long-break after 4 flows, full settings persistence, and calendar session details next if you want.
