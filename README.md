# Wellby

Work well. Rest well. Be well.

Wellby is a friendly AI-powered wellbeing companion for tech industry workers. It tracks how you work, learns your baseline pace, estimates burnout risk, and nudges you toward restorative breaks with a breathing exercise and a built-in game lounge.

## Stack

- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Local AI services:
  - Local burnout proxy model trained on the Syncora synthetic productivity dataset
  - Background EAR fatigue detection inspired by `Aeidle/EAR-Fatigue-Detection`

## Included features

- Personalized onboarding with name, work setup, seniority, work hours, and favorite break game
- Friendly dashboard with live task tracking and actions-per-minute monitoring
- Adaptive flow engine that builds a baseline over the first 3 sessions
- Burnout risk meter with warm status copy and weekly trend chart
- Three-tier burnout alert system with toast, banner, modal-style escalation, and snoozes
- Opt-in fatigue detection polling with a local-only privacy notice
- Break Mode with a 60-second mindful breathing moment
- Built-in Snake, Chess, Tic Tac Toe, and simplified UNO mini-games
- Local persistence for onboarding, burnout history, sessions, and game scores

## Local development

1. Clone this repo.
2. Clone the burnout prediction service:
   - Included training dataset: [syncora-ai/Synthetic-AI-Developer-Productivity-Dataset](https://github.com/syncora-ai/Synthetic-AI-Developer-Productivity-Dataset)
   - In this repo install Python dependencies: `pip install -r requirements.txt`
   - Train the local model: `python train_burnout_model.py`
   - Run the bundled burnout service: `python flask_api.py --port 5001`
3. Set up the fatigue detection service:
   - Reference algorithm: [Aeidle/EAR-Fatigue-Detection](https://github.com/Aeidle/EAR-Fatigue-Detection)
   - In this repo install the local service dependencies: `pip install -r requirements.txt`
   - Run the bundled background service: `python fatigue_service.py --port 5002`
   - The service keeps the webcam monitor running locally in the background and exposes `/start`, `/stop`, and `/status` on port `5002`
4. In this repo:
   - `npm install`
   - `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)
6. Complete onboarding and start your first Wellby session.

## Scripts

- `npm run dev` starts the Express server on port `3000` and mounts the Vite React frontend in middleware mode.
- `npm run build` builds the React client into `dist/`.
- `npm start` serves the production build from Express.

## API surface

- `GET /api/health`
- `POST /api/burnout/predict`
- `GET /api/fatigue/status`
- `POST /api/fatigue/start`
- `POST /api/fatigue/stop`

The backend proxies the two Python microservices and falls back gracefully if either service is unavailable during local setup.

## Burnout model notes

- The bundled burnout service trains a local `RandomForestRegressor` against the Syncora synthetic developer productivity dataset.
- The service keeps the existing `/predict` contract and maps Wellby's payload into the trained feature space used by the model.
- Trained model artifacts are stored in `artifacts/`.

## Ethics and data use

- The Syncora dataset is synthetic and is described by its repo as carrying zero risk of exposing real employee data.
- The dataset repo frames it for research, education, and experimentation rather than employee surveillance.
- Wellby treats the trained score as a wellbeing estimate only; it should not be used for HR discipline, ranking, or diagnosis.

## NPM packages used

- `chess.js`
- `chessboard.js` package included in `package.json`
- `chart.js`
- `react-hot-toast`
- `framer-motion`

## Notes

- Weekly burnout history, session summaries, break logs, and game scores are stored in `localStorage`.
- The fatigue detection toggle starts the local EAR detector in the background when the user opts in and stops it when disabled.
- After each completed break, Wellby applies a `-0.1` reducing factor to the next burnout score, with a floor of `0.0`.
