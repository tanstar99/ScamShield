# ScamShield

ScamShield is an AI-assisted phishing and scam detection platform for checking suspicious URLs before a user interacts with them. It combines a web dashboard, a Chrome extension, a Node.js API, MongoDB-backed scan history, and a Python inference service into one end-to-end security workflow.

The system turns a URL into an explainable risk report instead of a simple safe/unsafe label. It extracts structured URL features, enriches them with domain and infrastructure intelligence, runs machine-learning and heuristic checks, and stores the resulting signals for review and future analysis.

## What It Does

- Scans URLs from the web dashboard or Chrome extension.
- Extracts 14 model-aligned URL features, including URL length, hostname structure, subdomain depth, HTTPS usage, IP-based URLs, urgency terms, and government-service keywords.
- Runs an ONNX/XGBoost phishing model for structural URL risk.
- Detects typosquatting, brand impersonation, combosquatting, subdomain spoofing, and common homoglyph substitutions.
- Analyzes suspicious page or message text with a TF-IDF plus Logistic Regression classifier and returns interpretable urgency, fear, reward-bait, and deception flags.
- Collects SSL certificate, WHOIS, DNS, IP geolocation, proxy, VPN, Tor, and datacenter signals.
- Combines component scores into a normalized hybrid risk score with human-readable reasons.
- Presents scan results through a responsive React dashboard and in-browser warning overlays.
- Persists scan metadata and component-level signals in MongoDB, creating a foundation for threat reporting, trend analysis, and operational dashboards.

## Architecture

```text
Chrome Extension / React Dashboard
                |
                v
        Node.js + Express API
                |
       +--------+---------+----------------+
       |                  |                |
   MongoDB       SSL / WHOIS / DNS     Python AI API
                                     Flask + ONNX + NLP
                |
                v
       Explainable hybrid risk report
```

### Frontend

The React and Vite frontend provides authentication, URL submission, scan results, component score visualizations, and detailed SSL, WHOIS, IP, AI, and feature views.

### Node.js API

The Express backend is the orchestration layer. It validates requests, extracts model features, runs external enrichment checks in parallel, calls the Python AI service, computes the final risk score, and stores scan records.

### Python AI service

The Flask service exposes focused inference endpoints:

- `POST /api/analyze-url-ai` - ONNX model inference over 14 numeric features.
- `POST /api/analyze-text` - contextual phishing-text classification and warning flags.
- `POST /api/analyze-typo` - domain impersonation and typosquatting analysis.

This separation keeps model inference independently deployable and makes it possible to iterate on AI components without coupling them to the Node.js request layer.

## Data and AI Engineering Highlights

ScamShield is designed as a small, production-minded data product rather than a one-off classifier:

- **Reliable ingestion:** URL submissions are validated and normalized before enrichment.
- **Parallel data collection:** SSL, WHOIS, DNS/IP, and AI calls are coordinated through the scan pipeline to reduce response latency.
- **Feature engineering:** The backend maintains the exact 14-feature order expected by the exported model.
- **Data quality safeguards:** External lookup failures use explicit fallbacks, scores are normalized and clamped, and detection reasons are retained with the result.
- **Explainable analytics:** Component scores and reason codes make results suitable for reporting, debugging, and downstream dashboards.
- **AI product delivery:** The models are exposed through APIs and connected to user-facing workflows, including real-time browser warnings.

These patterns map naturally to analytics and data-product work: dependable pipelines, clear metrics, documented transformations, and AI features that reach end users.

## Project Structure

```text
AI_Backend_Server/   Flask inference service, models, NLP, and typosquatting logic
backend/             Express API, orchestration, scoring, enrichment, and MongoDB models
frontend/            React + Vite dashboard
phish-extension/     Chrome Manifest V3 extension and warning overlays
```

## Local Setup

### Prerequisites

- Node.js 18 or newer
- Python 3.10 or newer
- MongoDB connection string
- Chrome or Chromium-based browser for the extension

### 1. Start the Python AI service

```bash
cd AI_Backend_Server
python -m venv .venv
source .venv/bin/activate
pip install flask flask-cors numpy onnxruntime tldextract scikit-learn joblib
python ai_server.py
```

The AI service runs on `http://localhost:5000`.

### 2. Configure and start the Node.js API

Create `backend/.env` with at least:

```env
MONGODB_URL=your_mongodb_connection_string
PORT=8901
AI_SERVER_URL=http://localhost:5000
```

Then run:

```bash
cd backend
npm install
npm run dev
```

The port `8901` matches the current Chrome extension configuration. If you use another port, update the extension request URL in `phish-extension/background.js` and the frontend API configuration accordingly.

### 3. Start the React dashboard

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, normally `http://localhost:5173`.

### 4. Load the Chrome extension

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose the `phish-extension` folder.
5. Keep the Node.js API running so the extension can submit page data.

## Example Risk Signals

A scan can combine signals such as:

- A URL that uses a lookalike domain such as `paypa1-secure.example`.
- A brand name hidden inside a suspicious subdomain.
- A recently registered domain or newly issued certificate.
- An IP address, proxy, VPN, Tor, or datacenter hosting signal.
- Text containing account threats, urgent verification requests, or unrealistic rewards.

The result includes a final risk score, severity level, component scores, raw intelligence, and reasons for the assessment.

## Development Commands

```bash
# Frontend
cd frontend
npm run lint
npm run build

# Backend
cd backend
npm run dev
```

## Notes

- The model files and serialized NLP assets are required for full AI inference.
- External WHOIS, IP geolocation, DNS, and SSL lookups may fail or return partial data depending on network access and provider limits.
- ScamShield is a decision-support tool. Users should still avoid entering credentials or payment information on suspicious sites, even when a scan appears safe.
