import json
import os
from datetime import datetime, timezone
from pathlib import Path

from flask import Flask, abort, jsonify, redirect, render_template, request, url_for

APP_DIR = Path(__file__).parent
DATA_DIR = APP_DIR / "data"
STORAGE_DIR = APP_DIR / "storage"
STORAGE_FILE = STORAGE_DIR / "user_data.json"

app = Flask(__name__)


def load_json(name):
    with open(DATA_DIR / name, "r") as f:
        return json.load(f)


LESSONS = load_json("lessons.json")
QUIZ = load_json("quiz.json")


def _fresh_session():
    return {
        "started_at": None,
        "mode": None,
        "lesson_events": [],
        "quiz_answers": [None] * len(QUIZ),
    }


def _load_session():
    STORAGE_DIR.mkdir(exist_ok=True)
    if not STORAGE_FILE.exists():
        return _fresh_session()
    try:
        with open(STORAGE_FILE, "r") as f:
            data = json.load(f)
        if len(data.get("quiz_answers", [])) != len(QUIZ):
            data["quiz_answers"] = [None] * len(QUIZ)
        return data
    except json.JSONDecodeError:
        return _fresh_session()


def _save_session(data):
    STORAGE_DIR.mkdir(exist_ok=True)
    with open(STORAGE_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _log_event(payload):
    session = _load_session()
    session["lesson_events"].append(
        {"at": datetime.now(timezone.utc).isoformat(), **payload}
    )
    _save_session(session)


@app.route("/")
def home():
    return render_template("home.html")


@app.route("/start", methods=["POST"])
def start():
    mode = request.form.get("mode", "learning")
    session = _fresh_session()
    session["started_at"] = datetime.now(timezone.utc).isoformat()
    session["mode"] = mode
    _save_session(session)
    if mode == "quiz":
        return redirect(url_for("quiz", n=1))
    return redirect(url_for("learning_menu"))


@app.route("/learn")
def learning_menu():
    return render_template("learning_menu.html", lessons=LESSONS)


@app.route("/learn/<int:n>")
def learn(n):
    if n < 1 or n > len(LESSONS):
        abort(404)
    lesson = LESSONS[n - 1]
    _log_event({"type": "lesson_view", "lesson": n, "slug": lesson["slug"]})
    next_n = n + 1 if n < len(LESSONS) else None
    prev_n = n - 1 if n > 1 else None
    return render_template(
        "learn.html",
        lesson=lesson,
        n=n,
        total=len(LESSONS),
        next_n=next_n,
        prev_n=prev_n,
    )


@app.route("/learn/<int:n>/interact", methods=["POST"])
def learn_interact(n):
    if n < 1 or n > len(LESSONS):
        abort(404)
    payload = request.get_json(silent=True) or {}
    _log_event(
        {
            "type": "lesson_interact",
            "lesson": n,
            "slug": LESSONS[n - 1]["slug"],
            "data": payload,
        }
    )
    return jsonify({"ok": True})


@app.route("/quiz/<int:n>", methods=["GET", "POST"])
def quiz(n):
    if n < 1 or n > len(QUIZ):
        abort(404)
    q = QUIZ[n - 1]
    session = _load_session()

    if request.method == "POST":
        try:
            choice = int(request.form.get("choice", "-1"))
        except ValueError:
            choice = -1
        correct = choice == q["correct"]
        session["quiz_answers"][n - 1] = {
            "choice": choice,
            "correct": correct,
            "at": datetime.now(timezone.utc).isoformat(),
        }
        _save_session(session)
        if n < len(QUIZ):
            return redirect(url_for("quiz", n=n + 1))
        return redirect(url_for("results"))

    prior = session["quiz_answers"][n - 1]
    return render_template(
        "quiz.html",
        q=q,
        n=n,
        total=len(QUIZ),
        prior=prior,
    )


@app.route("/results")
def results():
    session = _load_session()
    answers = session["quiz_answers"]
    score = sum(1 for a in answers if a and a.get("correct"))
    total = len(QUIZ)
    topic_score = {}
    topic_total = {}
    for q, a in zip(QUIZ, answers):
        topic_total[q["topic"]] = topic_total.get(q["topic"], 0) + 1
        if a and a.get("correct"):
            topic_score[q["topic"]] = topic_score.get(q["topic"], 0) + 1
    titles = [
        "Keep Studying!",
        "Getting There",
        "Strategist in Training",
        "Race Engineer Material",
        "F1 Mastermind",
    ]
    title = titles[min(score, len(titles) - 1)]
    return render_template(
        "results.html",
        score=score,
        total=total,
        title=title,
        questions=QUIZ,
        answers=answers,
        topic_score=topic_score,
        topic_total=topic_total,
    )


@app.route("/reset", methods=["POST"])
def reset():
    _save_session(_fresh_session())
    return redirect(url_for("home"))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
