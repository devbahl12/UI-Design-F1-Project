# Intro to Formula 1 — UI/UX Design Project

An interactive web app for learning Formula 1 race strategy. Built for our UI Design class (HW12).

## What it covers

- **Car Components** — interactive 3D Ferrari SF-25 model with orbitable camera and clickable hotspots
- **Tire Compounds** — soft, medium, hard, intermediate, wet with explanations
- **Tire Degradation** — slider showing how lap times change as tires wear
- **Performance Degradation** — animated car on a track showing grip vs lap time
- **Aerodynamics** — clean air vs dirty air slipstream simulator
- **Finding the Gap** — interactive pit window selector
- **Interactive Quiz** — configure tyre compound and rear wing for different weather scenarios, then compare modeled pace to rivals on a live track visualization

## Run locally

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:5000** (or 5001 if AirPlay is using 5000).

## Routes

| Route | Purpose |
|---|---|
| `GET /` | Home — 3D hero car, start learning |
| `POST /start` | Record start, redirect to learning menu |
| `GET /learn` | Learning module menu |
| `GET /learn/<n>` | Lesson n (1–6), logs a view event |
| `POST /learn/<n>/interact` | Log an interaction as JSON |
| `GET /interactive-quiz` | Interactive Quiz — setup lab + pace preview |
| `POST /reset` | Clear the stored session |

## Data

Lesson content lives in `data/lessons.json`. Interactive Quiz scenarios live in `data/interactive_quiz.json`. Editing either file updates the app on refresh.

## Project layout

```
app.py                    # Flask app, routes, persistence
requirements.txt          # Flask
data/
  lessons.json            # 6 lessons of content
  interactive_quiz.json   # Interactive Quiz scenarios + metadata
templates/
  base.html               # shared layout (Bootstrap 5 + jQuery CDN)
  home.html               # / — hero + start
  learning_menu.html      # /learn — module list
  learn.html              # /learn/<n> — one lesson
  interactive_quiz.html   # /interactive-quiz — setup + track preview
static/
  css/app.css             # F1 dark theme on top of Bootstrap, fully responsive
  js/car3d.js             # Three.js 3D car scenes (hero, lesson, victory lap)
  js/app.js               # lesson interactivity + ajax logging
  js/interactive_quiz.js  # Interactive Quiz simulation UI
  models/
    f1car.glb             # Ferrari SF-25 3D model (CC Attribution — Abu Saif)
  img/
    ferrari_home.jpg      # hero image fallback
    ferrari_sf24.jpg      # car components reference
storage/
  user_data.json          # single-user session state (git-ignored)
```

## Team

- Reya Vir
- Dev Bahl
- Nitish Ramaraj

TA: Riya

## Repo

https://github.com/devbahl12/UI-Design-F1-Project
