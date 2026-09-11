PhishGuard AI - Backend Microservice Architecture
Overview
This repository contains the Python-based AI Microservice for the PhishGuard project. It operates as a standalone Flask API (localhost:5000) dedicated entirely to real-time machine learning inference and advanced heuristic analysis.

By decoupling the AI processing from the primary Node.js backend, we ensure zero blocking on the main event loop and allow the machine learning models to utilize optimized Python libraries.

🚀 Phase 2 Upgrades: What Has Changed in the AI Engine
The detection engine has been completely overhauled from basic rule-based scripts to an enterprise-grade machine learning architecture. Note: These upgrades were designed as "drop-in replacements." The API contracts remain identical to the previous version, requiring no breaking changes to the Node.js routing logic.

1. Advanced Text Context Analysis (NLP)
Old Approach: Simple keyword counting (which caused false positives on safe messages containing words like "bank").

New Approach: Implemented a custom-trained Logistic Regression model powered by a TF-IDF Vectorizer (Term Frequency-Inverse Document Frequency).

How it works: The model analyzes bi-grams (two-word combinations) and semantic context to accurately differentiate between a legitimate corporate email and a socially engineered phishing attempt. It calculates a mathematical probability of malicious intent and only flags the text if the confidence threshold is met.

2. Bulletproof Typosquatting & Permutation Engine
Old Approach: Basic Levenshtein distance on the raw URL string (vulnerable to subdomain spoofing).

New Approach: Integrated the tldextract library alongside a custom Homoglyph De-obfuscator.

How it works: * Subdomain Spoofing Protection: The engine perfectly separates subdomains from registered root domains. It instantly flags attacks where a brand is hidden in the subdomain (e.g., https://amazon.secure-login-portal.com).

Homoglyph Translation: It physically translates attacker character swaps (e.g., converting arnazon back to amazon) before running the mathematical distance checks, preventing visual bypasses.

3. Structural URL Analysis
Architecture: The 14-feature XGBoost model has been exported to the .onnx format.

Advantage: Using onnxruntime allows the Flask server to execute the decision trees in milliseconds, providing instant real-time detection without the overhead of the full XGBoost library.

📡 API Contracts (For Node.js Integration)
All endpoints accept POST requests with application/json payloads and return standardized JSON responses.

1. URL AI Model Endpoint
Route: POST http://localhost:5000/api/analyze-url-ai

Payload: Requires the array of 14 extracted numerical features.

JSON
{
  "features": [25, 16, 2, 0, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0] 
}
Response:

JSON
{
  "status": "success",
  "xgb_risk_score": 0.0
}
2. NLP Text Endpoint
Route: POST http://localhost:5000/api/analyze-text

Payload: The raw text extracted from the webpage DOM or SMS.

JSON
{
  "text": "Your account has been suspended due to an unauthorized login attempt. Verify your identity."
}
Response: Returns the ML risk score and specific UI flags for the frontend.

JSON
{
  "status": "success",
  "data": {
    "final_text_risk": 55.13,
    "fear_score": 0.5,
    "urgency_score": 0.0,
    "reward_score": 0.0,
    "flags": ["Threatening/Fearful Language"]
  }
}
### 3. Domain Typosquatting Endpoint
* **Route:** `POST http://localhost:5000/api/analyze-typo`
* **Payload:** The raw domain or hostname extracted from the webpage (no protocol needed).
json
{
  "domain": "sbi.secure-login.com"
}
Response:

JSON
{
  "status": "success",
  "data": {
    "typo_risk_score": 95.0,
    "closest_brand": "sbi",
    "min_edit_distance": 0,
    "similarity_ratio": 1.0,
    "brand_keyword_flag": 1,
    "char_substitution_flag": 0
  }
}
🛠️ Integration Guide for the Node.js Backend
To finalize the pipeline between the Chrome Extension and the AI Microservice, the following logic must be implemented on the Node.js server (localhost:3000):

Establish the Ingestion Route:
Ensure the POST /api/scan endpoint is active. The Chrome Extension (background.js) is currently configured to send the raw DOM payload (full_url, text_content, form_count, etc.) directly to this route.

Feature Extraction & Orchestration:
Within the /api/scan controller:

Parse the incoming Chrome extension payload.

Calculate the 14 URL numerical features required by the ONNX model.

Make three asynchronous HTTP requests (via axios or fetch) to the respective Python endpoints (localhost:5000) passing the required data.

Risk Score Aggregation:
Await the responses from all three Python endpoints and calculate a final weighted total_risk_score. Example distribution:
Total Risk = (URL Risk * 0.4) + (Text Risk * 0.4) + (Typo Risk * 0.2)

Return Payload to Frontend:
Return the final total_risk_score and the array of text flags back to the Chrome Extension. The extension's content.js and popup.js files are already configured to display Red/Warning UI overlays if the returned score exceeds 70.

⚙️ Environment Setup
To run the AI Microservice locally, install the required dependencies:

Bash
pip install flask flask-cors numpy onnxruntime tldextract scikit-learn joblib
Start the server:

Bash
python ai_server.py
