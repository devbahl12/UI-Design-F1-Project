# Intro to Formula 1 — UI/UX Design Project

An interactive web app for learning Formula 1 race strategy. Built for our UI Design class.

## What it covers

- **Car Components** — clickable hotspots on a photo of the Ferrari SF-24
- **Tire Compounds** — soft, medium, hard, intermediate, wet with explanations
- **Tire Degradation** — slider showing how lap times change as tires wear
- **Performance Degradation** — animated car on a track showing grip vs lap time
- **Aerodynamics** — clean air vs dirty air and why it matters strategically
- **Finding the Gap** — interactive pit window selector
- **Interactive Quiz** — configure tyre compound and rear wing for different weather scenarios, then compare modeled pace to rivals on a track visualization

## HW10 — Flask backend

The `flask-backend` branch adds a Flask backend with routes, a Jinja + Bootstrap 5 + jQuery frontend, and JSON-driven content. User selections are stored on the backend.

### Run it

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then open http://127.0.0.1:5000.

### Routes

| Route | Purpose |
|---|---|
| `GET /` | Home — start learning and link to Interactive Quiz |
| `POST /start` | Record start, redirect to learning menu |
| `GET /learn` | Learning module menu |
| `GET /learn/<n>` | Lesson n (1–6), logs a view event |
| `POST /learn/<n>/interact` | Log an interaction (hotspot, tire, slider, gap) as JSON |
| `GET /interactive-quiz` | Interactive Quiz — setup lab + pace preview |
| `POST /reset` | Clear the stored session |

### Data

Lesson content lives in `data/lessons.json`. Interactive Quiz scenarios (conditions, rival presets) live in `data/interactive_quiz.json`. Editing either file updates the app on refresh — template changes are only needed for new UI fields.

### Storage

Lesson-related activity is persisted to `storage/user_data.json` (single-user, as allowed by the assignment). This file is git-ignored.

### Project layout

```
app.py                 # Flask app, routes, persistence
requirements.txt       # Flask
data/
  lessons.json         # 6 lessons of content
  interactive_quiz.json # Interactive Quiz scenarios + metadata
templates/
  base.html            # shared layout (Bootstrap 5 + jQuery CDN)
  home.html            # / — start learning + Interactive Quiz
  learning_menu.html   # /learn — module list
  learn.html           # /learn/<n> — one lesson
  interactive_quiz.html # /interactive-quiz — setup + track preview
static/
  css/app.css          # F1 dark theme on top of Bootstrap
  js/app.js            # lesson interactivity + ajax logging
  js/interactive_quiz.js # Interactive Quiz simulation UI
  img/
    ferrari_home.jpg   # hero image on home screen
    ferrari_sf24.jpg   # car with hotspots on /learn/1
storage/
  user_data.json       # single-user session state (git-ignored)
```

## HW9 — Static prototype

The original single-page prototype is still at `index.html`. Open it in any browser, no backend required. It may still contain older quiz flows that are not wired to the Flask app.

## Team

- Reya Vir
- Dev Bahl
- Nitish Ramaraj

TA: Riya

## Repo

https://github.com/devbahl12/UI-Design-F1-Project
