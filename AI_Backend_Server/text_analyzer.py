import joblib

class TextAnalyzer:
    def __init__(self):
        # --- 1. LOAD THE MACHINE LEARNING MODELS ---
        try:
            self.vectorizer = joblib.load("tfidf_vectorizer.pkl")
            self.model = joblib.load("nlp_phishing_model.pkl")
            self.ml_active = True
            print("✅ NLP Text Model loaded successfully!")
        except Exception as e:
            print(f"⚠️ Warning: NLP Model not found. Error: {e}")
            self.ml_active = False

        # --- 2. KEEP KEYWORDS ONLY FOR UI FLAGS ---
        # We don't use these for the score anymore, just to tell the React frontend what warning chips to show
        self.urgency_words = [
            "immediately", "urgent", "act now", "24 hours", "today only", 
            "instant", "limited time", "expire", "deadline", "now", "verify now", "action required",
            "jaldi", "aaj raat", "turant", "band ho jayega", "cut ho jayega"
        ]
        self.fear_words = [
            "blocked", "suspended", "deactivate", "penalty", "illegal", 
            "case", "police", "arrest", "kyc pending", "document missing",
            "income tax", "raid", "fine", "fraud alert", "legal action",
            "jail", "fine lag", "block ho", "fir"
        ]
        self.reward_words = [
            "lottery", "winner", "congratulations", "cash prize", "iphone", 
            "free gift", "claim", "won", "crore", "lakh", "bonus", "prize",
            "lottery lag", "jeeto", "muft", "free paisa", "crorepati"
        ]

    def analyze(self, text):
        text = text.lower()
        if not text.strip(): 
            return self._build_response(0.0, 0, 0, 0)

        # ==========================================
        # CORE AI LOGIC (The Accuracy Upgrade)
        # ==========================================
        final_text_risk = 0.0
        if self.ml_active:
            text_features = self.vectorizer.transform([text])
            probability = self.model.predict_proba(text_features)[0][1] * 100
            
            # --- THE FIX: Print the raw score so you can debug! ---
            print(f"🔍 [DEBUG] Raw AI Probability for text: {probability:.2f}%")
            
            # Lowered the threshold to 40% because short SMS messages 
            # naturally generate lower confidence scores than full emails.
            final_text_risk = round(probability, 2) if probability >= 40.0 else 0.0

        # ==========================================
        # UI FLAG GENERATION 
        # ==========================================
        u_score = min(sum(1 for w in self.urgency_words if w in text) / 2, 1.0)
        f_score = min(sum(1 for w in self.fear_words if w in text) / 2, 1.0)
        r_score = min(sum(1 for w in self.reward_words if w in text) / 2, 1.0)

        return self._build_response(final_text_risk, u_score, f_score, r_score)

    def _build_response(self, final_risk, u_score, f_score, r_score):
        """Constructs the exact JSON format the MERN backend expects"""
        flags = []
        if f_score > 0: flags.append("Threatening/Fearful Language")
        if u_score > 0: flags.append("High Urgency Detected")
        if r_score > 0: flags.append("Too Good To Be True (Reward Bait)")
        
        # Smart fail-safe: If the AI caught a scam that didn't use our hardcoded words
        if final_risk > 70.0 and not flags:
            flags.append("Suspicious Deceptive Context Detected")

        return {
            "urgency_score": round(u_score, 2),
            "fear_score": round(f_score, 2),
            "reward_score": round(r_score, 2),
            "final_text_risk": final_risk,
            "flags": flags
        }

# --- Testing Block ---
if __name__ == "__main__":
    analyzer = TextAnalyzer()
    
    # Test 1: Highly contextual corporate scam
    print("\nTest 1 (Corporate Scam):")
    print(analyzer.analyze("Your account has been suspended due to an unauthorized login attempt. Verify your identity."))
    
    # Test 2: Safe text with a 'scary' word
    print("\nTest 2 (Safe text but uses the word 'bank'):")
    print(analyzer.analyze("I am going to the HDFC bank branch tomorrow to update my passbook."))
