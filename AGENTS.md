# tuiangfenlei - Codex Project Instructions

## Project overview

Browser-based AI image classification lab with guide, experiment selection, training, testing, analysis, report, and gallery flows.

Current phase: polishing

## Tech stack

- Frontend: Vue 3, Vite, Vue Router, Pinia, Element Plus, ECharts, TensorFlow.js
- Backend: Flask, Flask-Cors, Flask-SQLAlchemy
- Database: SQLite
- Build tools: npm, Vite
- Deployment: local dev servers, deployment target TBD

## Directory structure

- `frontend/`: Vue frontend app
- `backend/`: Flask backend app
- `docs/`: project documents
- `scripts/`: utility scripts
- `test-assets/`: test assets

## Task routing

- Frontend/UI tasks: inspect only `frontend/src` files related to the target route or component first.
- Backend/API tasks: inspect only related route, service, model, and config files first.
- Debugging tasks: start from the failing command, logs, and the smallest relevant code path.
- Documentation tasks: update docs without changing code unless requested.
- Deployment tasks: inspect startup commands, env usage, and runtime config only as needed.

## Skill usage

Use the global skill governance from `~/.codex/AGENTS.md`.

- Use a skill only when it clearly matches the task.
- Prefer the narrowest matching trusted skill.
- Do not use lab or explicit-only skills unless the user names them.
- Do not load multiple skills just to be safe.

Explicit-only skills remain explicit-only:

```txt
plugin-creator
skill-installer
theme-factory
ui-ux-pro-max
github
yeet
```

## Context discipline

- Start from files explicitly mentioned by the user.
- If no files are mentioned, inspect only high-signal project files.
- Do not scan the whole repository by default.
- Do not read all documents in `docs/`.
- Do not read all source files.
- Ignore generated and dependency directories unless specifically needed.

Ignore by default:

```txt
node_modules/
dist/
build/
target/
.git/
coverage/
*.log
*.tmp
```

## Modification scope

- Make the smallest useful change.
- Do not modify unrelated files.
- Do not refactor unless requested.
- Do not add dependencies unless necessary and explained.
- Do not change frontend and backend together unless explicitly requested.
- Do not modify approved deliverables unless requested.

## Frontend rules

- Identify the target route or component first.
- Prefer modifying existing components and route-specific utilities.
- Keep UI changes localized.
- Do not change API contracts unless requested.
- Provide preview routes after changes.

## Backend rules

- Identify route, service, model, and config files before editing.
- Keep API changes backward-compatible unless requested.
- Do not change database schema casually.
- Do not expose secrets or hardcode credentials.
- Provide verification commands when backend files are changed.

## Documentation rules

- Write documents that can be directly shared.
- Use clear headings.
- Avoid filler.
- Mark unknowns as `TBD`.
- Do not fabricate implementation status.

## Testing and verification

After changes, report:

- Commands run
- Whether they passed or failed
- If not run, why not
- Manual verification steps
- Preview route or API endpoint if applicable
- Remaining risks

Known commands:

```bash
cd frontend && npm run build
cd frontend && npm run dev -- --host 127.0.0.1 --port 5173
cd backend && python -m pip install -r requirements.txt
cd backend && python app.py
```

## Forbidden actions

Do not do these unless explicitly requested:

- Delete files
- Move large directories
- Rewrite the whole project
- Reformat unrelated files
- Add dependencies
- Change package manager
- Change deployment target
- Modify secrets or credentials
- Touch Codex global config
- Touch Codex skill directories
- Touch plugin cache

Forbidden commands unless explicitly requested:

```bash
rm -rf
del /s /q
git reset --hard
git clean -fd
drop database
truncate table
npm audit fix --force
```

## Output format

Before changes, state briefly:

```txt
Task type:
Files to inspect:
Skill decision:
Modification scope:
```

After changes, state:

```txt
Changed files:
Verification:
Risks:
Next step:
```
