# Intro to Formula 1 — UI/UX Design Project

An interactive web app for learning Formula 1 race strategy. Built for our UI Design class.

## What it covers

- **Car Components** — clickable hotspots on a photo of the Ferrari SF-24
- **Tire Compounds** — soft, medium, hard, intermediate, wet with explanations
- **Tire Degradation** — slider showing how lap times change as tires wear
- **Performance Degradation** — animated car on a track showing grip vs lap time
- **Aerodynamics** — clean air vs dirty air and why it matters strategically
- **Finding the Gap** — interactive pit window selector
- **Quiz** — 5 questions on tires, aero, and pit strategy with instant feedback

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
| `GET /` | Home with start button |
| `POST /start` | Record start, redirect into learning or quiz |
| `GET /learn` | Learning module menu |
| `GET /learn/<n>` | Lesson n (1–6), logs a view event |
| `POST /learn/<n>/interact` | Log an interaction (hotspot, tire, slider, gap) as JSON |
| `GET /quiz/<n>` | Quiz question n (1–5) |
| `POST /quiz/<n>` | Record answer and advance |
| `GET /results` | Final score + topic breakdown |
| `POST /reset` | Clear the stored session |

### Data

Lesson and quiz content live in `data/lessons.json` and `data/quiz.json`. Editing either one updates the rendered pages on refresh — no template changes needed.

### Storage

Selections and quiz answers are persisted to `storage/user_data.json` (single-user, as allowed by the assignment). This file is git-ignored.

### Project layout

```
app.py                 # Flask app, routes, persistence
requirements.txt       # Flask
data/
  lessons.json         # 6 lessons of content
  quiz.json            # 5 quiz questions
templates/
  base.html            # shared layout (Bootstrap 5 + jQuery CDN)
  home.html            # / — start button + mode toggle
  learning_menu.html   # /learn — module list
  learn.html           # /learn/<n> — one lesson
  quiz.html            # /quiz/<n> — one question
  results.html         # /results — final score
static/
  css/app.css          # F1 dark theme on top of Bootstrap
  js/app.js            # lesson interactivity + ajax logging
  img/
    ferrari_home.jpg   # hero image on home screen
    ferrari_sf24.jpg   # car with hotspots on /learn/1
storage/
  user_data.json       # single-user session state (git-ignored)
```

## HW9 — Static prototype

The original single-page prototype is still at `index.html`. Open it in any browser, no backend required.

## Team

- Reya Vir
- Dev Bahl
- Nitish Ramaraj

TA: Riya

## Repo

https://github.com/devbahl12/UI-Design-F1-Project
