from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import onnxruntime as rt

# Import your modules
from text_analyzer import TextAnalyzer
from typosquatter import TyposquattingDetector

app = Flask(__name__)
CORS(app) # Allows your Node.js backend to call this Python API

# --- 1. Initialize Text & Typo Modules ---
text_analyzer = TextAnalyzer()
typo_detector = TyposquattingDetector()

# --- 2. Load ONNX Model (Updated for V2) ---
onnx_session = None
input_name = None
try:
    # UPDATED: Using the name of the new model you just trained
    onnx_session = rt.InferenceSession("phishing_model_v2.onnx") 
    input_name = onnx_session.get_inputs()[0].name
    print("✅ Phishing Model V2 (Optimized) Loaded Successfully!")
except Exception as e:
    print(f"⚠️ Warning: ONNX model failed to load. Error: {e}")

# ==========================================
# API ENDPOINTS FOR YOUR MERN TEAMMATE
# ==========================================

@app.route('/api/analyze-url-ai', methods=['POST'])
def analyze_url_ai():
    """
    Endpoint 1: ONNX Model (XGBoost)
    MERN sends the 14 exact numerical features here.
    """
    data = request.json
    features = data.get('features', [])
    
    if len(features) != 14:
        return jsonify({"error": f"Expected 14 features, got {len(features)}"}), 400

    if onnx_session:
        try:
            # ONNX requires data to be in float32 format
            feature_array = np.array([features], dtype=np.float32)
            
            # Run inference
            prediction = onnx_session.run(None, {input_name: feature_array})
            
            # Extract the probability of Class 1 (Phishing)
            # Index 1 is Phishing probability because of our label inversion
            raw_probability = float(prediction[1][0][1]) * 100
            
            # --- 🛡️ THE CONFIDENCE THRESHOLD FIX 🛡️ ---
            # If the AI is not at least 75% sure it's a scam, we force it to 0.
            # This eliminates false positives for sites like LinkedIn or Google.
            if raw_probability < 75.0:
                final_score = 0.0
            else:
                final_score = raw_probability
            
        except Exception as e:
            return jsonify({"error": f"Inference failed: {str(e)}"}), 500
    else:
        final_score = 0.0 
        
    return jsonify({
        "status": "success",
        "xgb_risk_score": round(final_score, 2)
    })

@app.route('/api/analyze-text', methods=['POST'])
def analyze_text():
    data = request.json
    text = data.get('text', '')
    result = text_analyzer.analyze(text)
    return jsonify({"status": "success", "data": result})

@app.route('/api/analyze-typo', methods=['POST'])
def analyze_typo():
    data = request.json
    domain = data.get('domain', '')
    result = typo_detector.analyze(domain)
    return jsonify({"status": "success", "data": result})

if __name__ == '__main__':
    print("🚀 PhishGuard AI Microservice is running on http://localhost:5000")
    app.run(port=5000, debug=True)
