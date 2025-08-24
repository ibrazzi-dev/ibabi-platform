# IBABI Agri Platform (Hackathon)

Live: https://ibabi-platform-ibrazzis-projects.vercel.app

- One-page dashboard (Plotly) with **demo-first** data for reliability.
- "Load live summary" button fetches `/api/summary` (proxy for IBABI).
- Prediction panel calls `/api/predict` (demo model now; can swap to real FastAPI later).

Backend (local demo for judges): FastAPI `http://127.0.0.1:8000/docs`
- /api/ml/predict
- /api/ai/leaf-detect
- /api/ai/translate
- /api/ai/advice
- /ibabi/summary (proxy)
