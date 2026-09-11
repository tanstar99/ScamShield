import tldextract

class TyposquattingDetector:
    def __init__(self):
        # 1. Target brands to protect against
        self.target_brands = [
            "paypal", "amazon", "google", "facebook", "netflix", "microsoft",
            "sbi", "hdfcbank", "icicibank", "paytm", "phonepe", "axisbank",
            "mseb", "incometax", "uidai", "epfo", "linkedin"
        ]
        
        # 2. Known malicious combosquatting suffixes/prefixes
        self.scam_keywords = [
            "login", "kyc", "update", "verify", "support", "security", 
            "account", "auth", "secure", "service", "help", "reward", "portal"
        ]
        
        # 3. Common visual homoglyphs (Attacker character swaps)
        self.homoglyphs = {
            '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '7': 't',
            'rn': 'm', 'vv': 'w', 'cl': 'd'
        }

    def _levenshtein_distance(self, s1, s2):
        if len(s1) < len(s2): return self._levenshtein_distance(s2, s1)
        if len(s2) == 0: return len(s1)
            
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        return previous_row[-1]

    def _deobfuscate_homoglyphs(self, text):
        clean_text = text
        for fake, real in self.homoglyphs.items():
            clean_text = clean_text.replace(fake, real)
        return clean_text, clean_text != text

    def analyze(self, url):
        url = url.lower()
        
        # --- THE FOOLPROOF FIX: Proper URL Parsing ---
        # tldextract perfectly isolates the real domain from subdomains and suffixes
        # To avoid errors with raw strings, ensure http is prepended
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url
            
        extracted = tldextract.extract(url)
        subdomain = extracted.subdomain
        real_domain = extracted.domain
        
        best_match = None
        min_distance = float('inf')
        risk_score = 0.0
        brand_keyword_flag = 0
        has_char_sub = 0

        # --- STEP 1: SUBDOMAIN SPOOFING CHECK ---
        # Highly dangerous attack: https://sbi.secure-login-update.com
        for brand in self.target_brands:
            if brand in subdomain and brand != real_domain:
                return self._build_response(0, brand, 1.0, 0, 1, 0.95)

        # --- STEP 2: HOMOGLYPH CHECK ON MAIN DOMAIN ---
        deobfuscated_domain, has_char_sub_flag = self._deobfuscate_homoglyphs(real_domain)
        has_char_sub = 1 if has_char_sub_flag else 0
        
        if deobfuscated_domain in self.target_brands and real_domain not in self.target_brands:
            return self._build_response(1, deobfuscated_domain, 0.95, 1, 0, 1.0)

        # --- STEP 3: COMBOSQUATTING & BRAND STUFFING CHECK ---
        for brand in self.target_brands:
            if brand in real_domain:
                brand_keyword_flag = 1
                best_match = brand
                
                has_malicious_intent = any(scam_word in real_domain for scam_word in self.scam_keywords)
                
                if brand == real_domain:
                    risk_score = 0.0  # Safe: Exact authentic domain (e.g., sbi.co.in)
                elif has_malicious_intent:
                    risk_score = 0.9  # High Risk: sbi-kyc-update.com
                else:
                    risk_score = 0.0  # Safe: Genuine external initiative (e.g., sbiashascholarship)
                
                return self._build_response(self._levenshtein_distance(real_domain, brand), best_match, 1.0, has_char_sub, 1, risk_score)

        # --- STEP 4: STANDARD TYPOSQUATTING (MATH CHECK) ---
        for brand in self.target_brands:
            dist = self._levenshtein_distance(real_domain, brand)
            if dist < min_distance:
                min_distance = dist
                best_match = brand

        # Only punish if the math distance is extremely close (1 or 2 edits)
        if min_distance == 1:
            risk_score = 0.85 # High Risk (e.g., paypel)
        elif min_distance == 2 and len(best_match) > 5:
            risk_score = 0.60 # Medium Risk (e.g., facebokk)
        else:
            risk_score = 0.0  # Safe, unrelated domain

        max_len = max(len(real_domain), len(best_match)) if best_match else 1
        similarity_ratio = 1 - (min_distance / max_len)

        return self._build_response(min_distance, best_match, similarity_ratio, has_char_sub, brand_keyword_flag, risk_score)

    def _build_response(self, min_distance, closest_brand, similarity, char_sub, brand_flag, risk_score):
        return {
            "min_edit_distance": min_distance,
            "closest_brand": closest_brand or "None",
            "similarity_ratio": round(similarity, 2),
            "char_substitution_flag": char_sub,
            "brand_keyword_flag": brand_flag,
            "typo_risk_score": round(risk_score * 100, 2) 
        }

# --- Testing Block ---
if __name__ == "__main__":
    detector = TyposquattingDetector()
    
    print("\nTest 1 (Subdomain Spoofing): 'https://sbi.secure-login-portal.com'")
    print(detector.analyze("https://sbi.secure-login-portal.com"))
    
    print("\nTest 2 (Homoglyph Attack): 'arnazon.com'")
    print(detector.analyze("arnazon.com"))
    
    print("\nTest 3 (Malicious Combosquatting): 'sbi-kyc-update.in'")
    print(detector.analyze("sbi-kyc-update.in"))
    
    print("\nTest 4 (Safe Brand Inclusion): 'sbiashascholarship.co.in'")
    print(detector.analyze("sbiashascholarship.co.in"))
